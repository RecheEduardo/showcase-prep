/**
 * GoTicket showcase — mix + master.
 *
 * Usage (from `video/`, no package.json needed; run synth.mjs and sfx.mjs first):
 *   node scripts/audio/mix.mjs
 * Output:
 *   public/audio/master.wav              48 kHz, stereo, 24-bit PCM, exactly as long as the cut
 *   public/audio/stems/music_ducked.wav  float32, limiter-input scale (reference only)
 *   public/audio/stems/sfx_bus.wav       float32, limiter-input scale (reference only)
 *   audio/analysis/mix-report.json       levels, per-cue SFX-over-music deltas, limiter stats
 *
 * Chain:
 *   music.wav × M (median short-term over 6–62 s = -18 LUFS) × duck (-3 dB under every cue, 5 ms attack
 *   with lookahead, 150 ms release)  +  Σ SFX (each peak-normalized to 0 dBFS, × cue gain_db [+ key_tick
 *   offset] × global TRIM so the median K-weighted 100 ms level of the "hit" cues sits +4.5 dB over the
 *   ducked music)  →  hard silences  →  tilt EQ (low-shelf -1.5 dB @120 Hz, high-shelf +1.5 dB @5 kHz)
 *   →  gain G  →  true-peak lookahead limiter  →  24-bit.
 *   G is iterated until the integrated loudness is -14.0 LUFS; the limiter ceiling is lowered until the
 *   4x-oversampled true peak is ≤ -1.5 dBTP on our meter (ffmpeg meters read ~0.2 dB higher; margin to -1.0).
 *
 * Silences:
 *   5.9–6.0  : everything muted (music + all SFX). Cues that started before are cut with a 1.5 ms ramp
 *              ending at 5.9 and never resume; the 6.0 impact enters dry at sample 288,000.
 *   27.5–28.0: music (already silent in music.wav) and the snare roll muted; cues that started earlier are
 *              cut at 27.5, except that the riser gets a generated reverb tail; the countdown tick that
 *              starts exactly at 27.5 is allowed (60 ms, short decay).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SR, TOTAL, s, dbToGain, gainToDb, clamp, stereo, peakOf, readWav, writeWav, loadCues, PATHS, Biquad,
  freeverb, interSamplePeaks, truePeakDb,
} from './dsp.mjs';
import { measureLoudness, kWeight } from './loudness.mjs';

const t0Run = Date.now();
const TARGET_LUFS = -14.0;
const TP_TARGET = -1.5; // own 4x meter; ffmpeg ebur128/loudnorm read ~0.2 dB higher, keeps them ≤ -1.2
const MUSIC_ST_TARGET = -18;
const SFX_OVER_MUSIC_TARGET = 4.5;
const DUCK_DB = -3;
const DUCK_ACTIVE_DB = 12; // a cue "is sounding" while its 10 ms RMS is within 12 dB of its own loudest frame
const EQ = [['lowshelf', 120, 0.7, -1.5], ['highshelf', 5000, 0.7, 1.5]]; // gentle master tilt before the limiter
const RAMP = 72;

const cues = loadCues();
const manifest = JSON.parse(fs.readFileSync(path.join(PATHS.sfxDir, 'manifest.json'), 'utf8'));
const GAPS = cues.cues.filter((c) => c.kind === 'silence_gap')
  .map((c, i) => ({ id: c.id, t0: c.t, t1: +(c.t + c.dur).toFixed(6), s0: c.frame * 800, s1: s(c.t + c.dur), total: i === 0 }))
  .sort((a, b) => a.s0 - b.s0);
GAPS.forEach((g, i) => { g.total = i === 0; });

// ------------------------------------------------------------------ music
const mw = readWav(PATHS.music);
if (mw.sr !== SR || mw.channels.length !== 2 || mw.frames !== TOTAL) throw new Error(`music.wav must be 48k stereo ${TOTAL} frames (got ${mw.sr}/${mw.channels.length}/${mw.frames})`);
const music = mw.channels;
const mL = measureLoudness(music, { withTruePeak: false });
// median short-term loudness of the music from the hard cut (end of the intro) to 2 s before the end
const introEnd = cues.music_sections[0].end;
const stWin = mL.shortTerm.filter((v) => v.t >= introEnd + 1 && v.t + 3 <= TOTAL / SR - 2).map((v) => v.lufs).sort((a, b) => a - b);
const musicMedianST = stWin[Math.floor(stWin.length / 2)];
const M_DB = MUSIC_ST_TARGET - musicMedianST;
const M = dbToGain(M_DB);

// ------------------------------------------------------------------ SFX placement
const fileCache = new Map();
function loadSfx(rel) {
  if (!fileCache.has(rel)) {
    const w = readWav(path.join(PATHS.publicAudio, rel));
    if (w.sr !== SR) throw new Error(`${rel}: ${w.sr} Hz`);
    const ch = w.channels.length === 1 ? [w.channels[0], w.channels[0]] : w.channels;
    const pk = peakOf(ch);
    const norm = ch.map((c) => c.map((v) => v / pk));
    // 10 ms RMS envelope -> active region (within DUCK_ACTIVE_DB of the loudest frame), used for ducking
    const hop = s(0.01), env = [];
    for (let a = 0; a < norm[0].length; a += hop) {
      let e = 0, n = 0;
      for (let i = a; i < Math.min(a + hop, norm[0].length); i++) { e += norm[0][i] ** 2 + norm[1][i] ** 2; n++; }
      env.push(10 * Math.log10(e / (2 * n) + 1e-20));
    }
    const top = Math.max(...env);
    const act = env.map((v, i) => (v >= top - DUCK_ACTIVE_DB ? i : -1)).filter((i) => i >= 0);
    fileCache.set(rel, { ch: norm, frames: norm[0].length, activeStart: act[0] * hop, activeEnd: (act[act.length - 1] + 1) * hop });
  }
  return fileCache.get(rel);
}
function gapFor(n0) {
  // next gap that a cue starting at n0 runs into (or the gap it starts inside)
  for (const g of GAPS) {
    if (n0 < g.s0) return { g, inside: false };
    if (n0 < g.s1) return { g, inside: true };
  }
  return null;
}
const placed = [];
for (const c of manifest.cues) {
  const f = loadSfx(c.file);
  const n0 = c.sample;
  if (n0 !== c.frame * 800) throw new Error(`${c.id}: sample != frame*800`);
  const gg = gapFor(n0);
  let end = Math.min(TOTAL, n0 + f.frames);
  let cut = null, tail = false, skipped = false;
  if (gg && gg.inside) {
    const allowedTick = !gg.g.total && c.kind === 'tick' && n0 === gg.g.s0;
    if (!allowedTick) skipped = true;
  } else if (gg && end > gg.g.s0) {
    cut = gg.g.s0;
    end = cut;
    tail = !gg.g.total && c.kind === 'riser';
  }
  placed.push({ c, f, n0, end, cut, tail, skipped, gain: dbToGain(c.gain_db + (c.extra_gain_db || 0)) });
}
function renderCue(p, dst, g = 1) {
  if (p.skipped) return;
  const { ch } = p.f;
  const gg = p.gain * g;
  for (let n = p.n0; n < p.end; n++) {
    const i = n - p.n0;
    const r = p.cut !== null && n >= p.cut - RAMP ? (p.cut - n) / RAMP : 1;
    dst[0][n] += ch[0][i] * gg * r;
    dst[1][n] += ch[1][i] * gg * r;
  }
}
// riser tail through the stop-time: reverb of the (cut) riser, faded in over the cut ramp
function renderRiserTail(p, dst, g = 1) {
  const pre = p.cut - p.n0;
  const len = pre + s(1.2);
  const src = stereo(len);
  for (let i = 0; i < pre; i++) {
    const n = p.n0 + i;
    const r = n >= p.cut - RAMP ? (p.cut - n) / RAMP : 1;
    src[0][i] = p.f.ch[0][i] * p.gain * g * r;
    src[1][i] = p.f.ch[1][i] * p.gain * g * r;
  }
  const [wl, wr] = freeverb(src[0], src[1], { room: 0.62, damp: 0.45, width: 1, predelayMs: 0 });
  const TAIL_GAIN = 0.12;
  for (let i = pre - RAMP; i < len && p.n0 + i < TOTAL; i++) {
    const fi = Math.min(1, (i - (pre - RAMP)) / RAMP);
    dst[0][p.n0 + i] += wl[i] * TAIL_GAIN * fi;
    dst[1][p.n0 + i] += wr[i] * TAIL_GAIN * fi;
  }
}
const sfxBus = stereo(TOTAL);
for (const p of placed) {
  renderCue(p, sfxBus);
  if (p.tail) renderRiserTail(p, sfxBus);
}

// ------------------------------------------------------------------ ducking (-3 dB under each cue)
const want = new Float32Array(TOTAL).fill(1);
const duckG = dbToGain(DUCK_DB);
for (const p of placed) {
  if (p.skipped) continue;
  const a = p.n0 + p.f.activeStart, b = Math.min(p.end, p.n0 + p.f.activeEnd);
  for (let n = Math.max(0, a); n < b; n++) want[n] = duckG;
}
const duck = new Float32Array(TOTAL);
const kRel = 1 - Math.exp(-1 / (0.15 * SR));
let y = 1;
for (let n = 0; n < TOTAL; n++) { y = want[n] < y ? want[n] : y + (want[n] - y) * kRel; duck[n] = y; }
const kAtt = 1 - Math.exp(-1 / (0.0017 * SR)); // ~5 ms to settle, applied as lookahead (backward pass)
y = duck[TOTAL - 1];
for (let n = TOTAL - 1; n >= 0; n--) { y = Math.min(duck[n], y + (1 - y) * kAtt); duck[n] = y; }

// hard gate: total mute only in the first gap (5.9–6.0). The stop-time gap is handled by cue truncation
// (SFX) and by music.wav itself (silent except the riser's reverb tail).
const gateAt = (n) => {
  for (const g of GAPS) {
    if (!g.total) continue;
    if (n >= g.s0 && n < g.s1) return 0;
    if (n >= g.s0 - RAMP && n < g.s0) return (g.s0 - n) / RAMP;
  }
  return 1;
};
const musicBus = stereo(TOTAL);
for (let n = 0; n < TOTAL; n++) {
  const g = M * duck[n] * gateAt(n);
  musicBus[0][n] = music[0][n] * g;
  musicBus[1][n] = music[1][n] * g;
}

// ------------------------------------------------------------------ SFX-over-music delta per cue (K-weighted, 100 ms at the cue's energy peak)
const kmL = kWeight(musicBus[0]), kmR = kWeight(musicBus[1]);
function cueDelta(p) {
  if (p.skipped) return null;
  const len = p.end - p.n0;
  const one = stereo(len);
  for (let i = 0; i < len; i++) {
    const n = p.n0 + i;
    const r = p.cut !== null && n >= p.cut - RAMP ? (p.cut - n) / RAMP : 1;
    one[0][i] = p.f.ch[0][i] * p.gain * r;
    one[1][i] = p.f.ch[1][i] * p.gain * r;
  }
  const kl = kWeight(one[0]), kr = kWeight(one[1]);
  const W = s(0.1), hop = s(0.005);
  let best = -1, bestE = -1;
  for (let a = 0; a + Math.min(W, len) <= len; a += hop) {
    let e = 0;
    for (let i = a; i < a + Math.min(W, len); i++) e += kl[i] * kl[i] + kr[i] * kr[i];
    if (e > bestE) { bestE = e; best = a; }
    if (len < W) break;
  }
  const a = p.n0 + best, b = Math.min(TOTAL, a + W);
  let em = 0;
  for (let n = a; n < b; n++) em += kmL[n] * kmL[n] + kmR[n] * kmR[n];
  const sfxDb = -0.691 + 10 * Math.log10(bestE / W + 1e-20);
  const musDb = -0.691 + 10 * Math.log10(em / W + 1e-20);
  return { sfxDb, musDb, delta: sfxDb - musDb, at: +(a / SR).toFixed(3) };
}
const deltas = placed.map((p) => ({ p, d: cueDelta(p) })).filter((x) => x.d);
const isHit = (p) => p.c.gain_db >= -14;
const hitRaw = deltas.filter((x) => isHit(x.p)).map((x) => x.d.delta).sort((a, b) => a - b);
const TRIM_DB = SFX_OVER_MUSIC_TARGET - hitRaw[Math.floor(hitRaw.length / 2)];
const TRIM = dbToGain(TRIM_DB);

// ------------------------------------------------------------------ premaster + master loop
const pre = stereo(TOTAL);
for (let n = 0; n < TOTAL; n++) {
  const g = gateAt(n);
  pre[0][n] = musicBus[0][n] + sfxBus[0][n] * TRIM * g;
  pre[1][n] = musicBus[1][n] + sfxBus[1][n] * TRIM * g;
}
// master tilt EQ, then the total-silence gate again so the 5.9–6.0 gap stays digital zero
for (const [type, fq, q, g] of EQ) {
  for (const c of pre) { const bq = new Biquad(type, fq, q, g); for (let n = 0; n < TOTAL; n++) c[n] = bq.run(c[n]); }
}
for (let n = 0; n < TOTAL; n++) { const g = gateAt(n); if (g < 1) { pre[0][n] *= g; pre[1][n] *= g; } }
const isp = interSamplePeaks(pre); // scale-invariant: reused for every gain step
const ispD = new Float32Array(TOTAL);
for (let n = 0; n < TOTAL; n++) {
  let m = 0;
  for (let k = -2; k <= 2; k++) { const j = n + k; if (j >= 0 && j < TOTAL && isp[j] > m) m = isp[j]; }
  ispD[n] = m;
}
function limiterGain(G, ceilDb, { lookMs = 5, relMs = 120 } = {}) {
  const c = dbToGain(ceilDb);
  const L = s(lookMs / 1000);
  const req = new Float32Array(TOTAL);
  for (let n = 0; n < TOTAL; n++) { const p = ispD[n] * G; req[n] = p > c ? c / p : 1; }
  const h = new Float32Array(TOTAL);
  const dq = new Int32Array(TOTAL);
  let head = 0, tail = 0;
  for (let j = TOTAL - 1; j >= 0; j--) {
    while (tail > head && req[dq[tail - 1]] >= req[j]) tail--;
    dq[tail++] = j;
    while (dq[head] > j + L) head++;
    h[j] = req[dq[head]];
  }
  const cs = new Float64Array(TOTAL + 1);
  for (let n = 0; n < TOTAL; n++) cs[n + 1] = cs[n] + h[n];
  const g = new Float32Array(TOTAL);
  const kr = 1 - Math.exp(-1 / (relMs / 1000 * SR));
  let r = 1;
  for (let n = 0; n < TOTAL; n++) {
    const a = Math.max(0, n - L);
    const sm = (cs[n + 1] - cs[a]) / (n + 1 - a);
    r = Math.min(sm, r + (1 - r) * kr);
    g[n] = r;
  }
  return g;
}
function render(G, gain) {
  const out = stereo(TOTAL);
  for (let n = 0; n < TOTAL; n++) { out[0][n] = pre[0][n] * G * gain[n]; out[1][n] = pre[1][n] * G * gain[n]; }
  const mf = s(0.04);
  for (let i = 0; i < mf; i++) {
    const w = 0.5 - 0.5 * Math.cos(Math.PI * i / mf);
    out[0][TOTAL - 1 - i] *= w; out[1][TOTAL - 1 - i] *= w;
  }
  return out;
}
const preL = measureLoudness(pre, { withTruePeak: false });
let Gdb = TARGET_LUFS - preL.integrated;
let ceil = TP_TARGET - 0.1;
let out, lufs, tp, gain, iters = [];
for (let pass = 0; pass < 6; pass++) {
  let prev = null;
  for (let it = 0; it < 12; it++) {
    gain = limiterGain(dbToGain(Gdb), ceil);
    out = render(dbToGain(Gdb), gain);
    lufs = measureLoudness(out, { withTruePeak: false }).integrated;
    iters.push({ pass, ceil: +ceil.toFixed(2), G_db: +Gdb.toFixed(3), lufs: +lufs.toFixed(3) });
    const err = TARGET_LUFS - lufs;
    if (Math.abs(err) < 0.03) break;
    let step = err;
    if (prev && Math.abs(lufs - prev.lufs) > 1e-3) step = err * (Gdb - prev.Gdb) / (lufs - prev.lufs);
    prev = { Gdb, lufs };
    Gdb += clamp(step, -6, 6);
  }
  tp = truePeakDb(out);
  iters[iters.length - 1].tp = +tp.toFixed(3);
  if (tp <= TP_TARGET) break;
  ceil -= tp - TP_TARGET + 0.05;
}
const w = writeWav(PATHS.master, out, { bits: 24 });

// stems (limiter-input scale; music + sfx = limiter input)
const Gl = dbToGain(Gdb);
const stemM = [musicBus[0].map((v) => v * Gl), musicBus[1].map((v) => v * Gl)];
const stemS = stereo(TOTAL);
for (let n = 0; n < TOTAL; n++) { const g = gateAt(n) * TRIM * Gl; stemS[0][n] = sfxBus[0][n] * g; stemS[1][n] = sfxBus[1][n] * g; }
writeWav(path.join(PATHS.stemsDir, 'music_ducked.wav'), stemM, { float: true });
writeWav(path.join(PATHS.stemsDir, 'sfx_bus.wav'), stemS, { float: true });

// ------------------------------------------------------------------ report
let grMax = 0, over1 = 0, over3 = 0, over6 = 0;
for (let n = 0; n < TOTAL; n++) {
  const gr = -gainToDb(gain[n]);
  if (gr > grMax) grMax = gr;
  if (gr > 1) over1++;
  if (gr > 3) over3++;
  if (gr > 6) over6++;
}
const final = measureLoudness(out, { withTruePeak: false });
const hitDeltas = deltas.filter((x) => isHit(x.p)).map((x) => x.d.delta + TRIM_DB).sort((a, b) => a - b);
const med = (arr) => arr[Math.floor(arr.length / 2)];
const report = {
  master: { file: 'public/audio/master.wav', frames: w.frames, clipped_samples: w.clipped, bits: 24 },
  targets: { integrated_lufs: TARGET_LUFS, true_peak_dbtp_max: -1.0, internal_tp_target: TP_TARGET, music_short_term_median: MUSIC_ST_TARGET, sfx_over_music_median_db: SFX_OVER_MUSIC_TARGET, duck_db: DUCK_DB },
  music: { median_short_term_lufs_6_62_before: +musicMedianST.toFixed(2), gain_db: +M_DB.toFixed(2), median_short_term_after: MUSIC_ST_TARGET },
  duck: (() => {
    let mn = 1, ducked = 0;
    for (let n = 0; n < TOTAL; n++) { if (duck[n] < mn) mn = duck[n]; if (duck[n] < dbToGain(-2.5)) ducked++; }
    return { min_gain_db: +gainToDb(mn).toFixed(2), pct_time_below_minus2p5db: +(100 * ducked / TOTAL).toFixed(1), attack: '~5 ms lookahead (backward one-pole, tau 1.7 ms)', release_tau_ms: 150 };
  })(),
  sfx: {
    trim_db: +TRIM_DB.toFixed(2),
    hit_cues_definition: 'cues with gain_db >= -14 (impacts, whooshes, clicks, chimes, pops, blips, plucks, risers, rolls, shine, swells)',
    hit_cues_median_delta_db: +med(hitDeltas).toFixed(2),
    hit_cues_within_3_6_db: `${hitDeltas.filter((d) => d >= 3 && d <= 6).length}/${hitDeltas.length}`,
    hit_cues_p25_p75: [+hitDeltas[Math.floor(hitDeltas.length * 0.25)].toFixed(2), +hitDeltas[Math.floor(hitDeltas.length * 0.75)].toFixed(2)],
    hit_cues_within_0_10_db: `${hitDeltas.filter((d) => d >= 0 && d <= 10).length}/${hitDeltas.length}`,
    hit_cues_min_max: [+hitDeltas[0].toFixed(2), +hitDeltas[hitDeltas.length - 1].toFixed(2)],
    method: 'K-weighted level over the 100 ms window at the SFX peak (SFX alone, after gain) minus ducked music in the same window',
  },
  master_chain: {
    eq: EQ.map(([type, fq, q, g]) => ({ type, hz: fq, q, gain_db: g })),
    gain_db: +Gdb.toFixed(3), limiter_ceiling_dbtp_estimate: +ceil.toFixed(3), lookahead_ms: 5, release_ms: 120, oversampling: '4x polyphase Kaiser windowed-sinc, 32 taps/phase',
    gain_reduction: { max_db: +grMax.toFixed(2), pct_time_over_1db: +(100 * over1 / TOTAL).toFixed(2), pct_time_over_3db: +(100 * over3 / TOTAL).toFixed(2), pct_time_over_6db: +(100 * over6 / TOTAL).toFixed(2) },
    iterations: iters,
  },
  node_meter: { integrated_lufs: +final.integrated.toFixed(2), lra: +final.lra.toFixed(2), true_peak_dbtp: +tp.toFixed(2), sample_peak_dbfs: +final.samplePeakDb.toFixed(2) },
  cues: deltas.map(({ p, d }) => ({
    id: p.c.id, kind: p.c.kind, t: p.c.t, sample: p.n0, file: p.c.file, gain_db: p.c.gain_db, extra_gain_db: p.c.extra_gain_db,
    cut_at_s: p.cut !== null ? p.cut / SR : null, riser_tail: p.tail, hit: isHit(p),
    sfx_lufs_100ms: +(d.sfxDb + TRIM_DB).toFixed(1), music_lufs_100ms: +d.musDb.toFixed(1), delta_db: +(d.delta + TRIM_DB).toFixed(1), window_start_s: d.at,
  })),
  skipped_cues: placed.filter((p) => p.skipped).map((p) => p.c.id),
};
fs.mkdirSync(PATHS.analysis, { recursive: true });
fs.writeFileSync(path.join(PATHS.analysis, 'mix-report.json'), JSON.stringify(report, null, 2));
console.log(`[mix] music gain ${M_DB.toFixed(2)} dB (median ST ${musicMedianST.toFixed(2)} -> ${MUSIC_ST_TARGET}), SFX trim ${TRIM_DB.toFixed(2)} dB, hit-cue median delta ${med(hitDeltas).toFixed(2)} dB (${report.sfx.hit_cues_within_3_6_db} in [3,6])`);
console.log(`[mix] master gain ${Gdb.toFixed(2)} dB, ceiling ${ceil.toFixed(2)}, integrated ${final.integrated.toFixed(2)} LUFS, LRA ${final.lra.toFixed(2)}, TP ${tp.toFixed(2)} dBTP, GR max ${grMax.toFixed(2)} dB, >3dB ${(100 * over3 / TOTAL).toFixed(1)}% of time`);
console.log(`[mix] skipped cues: ${report.skipped_cues.join(', ') || 'none'}; wrote ${w.frames} frames (clipped ${w.clipped}) in ${((Date.now() - t0Run) / 1000).toFixed(1)} s`);
