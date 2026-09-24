/**
 * GoTicket showcase — audio verification (must PASS before delivery).
 *
 * Usage (from `video/`, no package.json needed; run synth/sfx/mix first):
 *   node scripts/audio/analyze.mjs
 * Output:
 *   audio/analysis/report.json            all metrics + PASS/FAIL per criterion (exit code 1 on any FAIL)
 *   audio/analysis/*.png                  waveform / spectrogram (master + music), RMS envelope, SFX contact sheet
 *
 * Measurement sources:
 *   - PRIMARY (decides PASS/FAIL): own ITU-R BS.1770-4 implementation in Node (scripts/audio/loudness.mjs):
 *     K-weighting (pre-filter + RLB biquads @ 48 kHz), 400 ms blocks / 75 % overlap, gates -70 LUFS / -10 LU,
 *     LRA per EBU Tech 3342, true peak via 4x polyphase oversampling. Self-tested below on synthetic sines.
 *   - CROSS-CHECKS: `npx remotion ffmpeg` loudnorm (print_format=json) and silencedetect. The ffmpeg bundled
 *     with Remotion has no ebur128/showwavespic/showspectrumpic, so all PNGs are drawn here in Node (zlib).
 *     If a full ffmpeg happens to be on PATH, its ebur128=peak=true is recorded as an extra, optional check.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SR, TOTAL, s, gainToDb, dbToGain, readWav, loadCues, PATHS, remotionTool, findSystemFfmpeg, systemFfmpeg, Biquad,
} from './dsp.mjs';
import { measureLoudness, kWeight } from './loudness.mjs';
import { Canvas, inferno } from './png.mjs';

const t0Run = Date.now();
const cues = loadCues();
// Drops = section starts where the energy jumps (hard cut, drop 2, final impact), from the current cut.
const secStart = (id) => cues.music_sections.find((x) => x.id === id).start;
const DROPS = ['drop1', 'drop2', 'finale'].map(secStart);
const END_S = TOTAL / SR;
const GAPS = cues.cues.filter((c) => c.kind === 'silence_gap').map((c) => ({ t0: c.t, t1: +(c.t + c.dur).toFixed(6) }));
const SECTIONS = cues.music_sections;
fs.mkdirSync(PATHS.analysis, { recursive: true });
const rel = (p) => path.relative(PATHS.audioDocs, p).replace(/\\/g, '/');
const results = {};
const pass = (id, ok, detail) => { results[id] = { pass: !!ok, ...detail }; };

// ------------------------------------------------------------------ meter self-test
function sine(freq, ampDb, chans) {
  const n = SR * 10, a = dbToGain(ampDb);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = a * Math.sin(2 * Math.PI * freq * i / SR); if (chans.includes(0)) L[i] = v; if (chans.includes(1)) R[i] = v; }
  return [L, R];
}
const st1 = measureLoudness(sine(997, -20, [0, 1]));
const st2 = measureLoudness(sine(997, -20, [0]));
const st3 = measureLoudness(sine(997, 0, [0]));
const selftest = {
  sine_997hz_minus20dbfs_both_channels: { lufs: +st1.integrated.toFixed(2), expected: -20.0 },
  sine_997hz_minus20dbfs_one_channel: { lufs: +st2.integrated.toFixed(2), expected: -23.01 },
  sine_997hz_0dbfs_one_channel: { lufs: +st3.integrated.toFixed(2), expected: -3.01, true_peak_dbtp: +st3.truePeakDb.toFixed(2) },
};
const selfOk = Math.abs(st1.integrated + 20) < 0.1 && Math.abs(st2.integrated + 23.01) < 0.1 && Math.abs(st3.integrated + 3.01) < 0.1;
pass('meter_selftest', selfOk, selftest);

// ------------------------------------------------------------------ load
const master = readWav(PATHS.master);
const music = readWav(PATHS.music);
const stemsPath = path.join(PATHS.stemsDir, 'sfx_bus.wav');
const sfxStem = fs.existsSync(stemsPath) ? readWav(stemsPath) : null;
const probe = remotionTool('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels,bits_per_sample,duration_ts,duration', '-of', 'json', PATHS.master]);
let probeJson = null;
try { probeJson = JSON.parse(probe.stdout).streams[0]; } catch { /* reported below */ }
pass('format', master.sr === SR && master.channels.length === 2 && master.bits === 24 && master.frames === TOTAL
  && (!probeJson || (+probeJson.sample_rate === SR && probeJson.channels === 2)), {
  node: { sample_rate: master.sr, channels: master.channels.length, bits: master.bits, frames: master.frames, expected_frames: TOTAL },
  remotion_ffprobe: probeJson,
});

// ------------------------------------------------------------------ (a) loudness / true peak
const mNode = measureLoudness(master.channels);
const ln = remotionTool('ffmpeg', ['-hide_banner', '-nostats', '-i', PATHS.master, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-']);
let loudnorm = null;
try { loudnorm = JSON.parse(ln.stderr.slice(ln.stderr.lastIndexOf('{'), ln.stderr.lastIndexOf('}') + 1)); } catch { /* ignore */ }
let ebur = null;
const sysFf = findSystemFfmpeg();
if (sysFf) {
  const e = systemFfmpeg(['-hide_banner', '-nostats', '-i', PATHS.master, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const sum = e.stderr.slice(e.stderr.lastIndexOf('Summary:'));
  const num = (re) => { const m = sum.match(re); return m ? +m[1] : null; };
  ebur = { tool: 'system ffmpeg (optional, auto-detected on PATH)', integrated_lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra_lu: num(/LRA:\s+(-?[\d.]+) LU/), true_peak_dbtp: num(/Peak:\s+(-?[\d.]+) dBFS/) };
}
const inRange = (v) => v !== null && v !== undefined && v >= -15 && v <= -13;
const tpOk = (v) => v !== null && v !== undefined && v <= -1.0;
const aChecks = [
  inRange(mNode.integrated) && tpOk(mNode.truePeakDb),
  !loudnorm || (inRange(+loudnorm.input_i) && tpOk(+loudnorm.input_tp)),
  !ebur || (inRange(ebur.integrated_lufs) && tpOk(ebur.true_peak_dbtp)),
];
pass('a_loudness_truepeak', aChecks.every(Boolean), {
  criterion: 'integrated -14 LUFS ±1 LU and true peak <= -1.0 dBTP (every available meter must agree)',
  primary_node_bs1770: { integrated_lufs: +mNode.integrated.toFixed(2), lra_lu: +mNode.lra.toFixed(2), true_peak_dbtp: +mNode.truePeakDb.toFixed(2), sample_peak_dbfs: +mNode.samplePeakDb.toFixed(2), momentary_max_lufs: +mNode.momentaryMax.toFixed(2), short_term_max_lufs: +mNode.shortTermMax.toFixed(2) },
  crosscheck_remotion_loudnorm: loudnorm ? { integrated_lufs: +loudnorm.input_i, true_peak_dbtp: +loudnorm.input_tp, lra_lu: +loudnorm.input_lra } : { error: 'loudnorm output not parsed' },
  crosscheck_system_ebur128: ebur || 'not available (only the minimal Remotion ffmpeg is guaranteed)',
});

// ------------------------------------------------------------------ (b) silence 5.9–6.0
const sd = remotionTool('ffmpeg', ['-hide_banner', '-nostats', '-i', PATHS.master, '-af', 'silencedetect=noise=-60dB:d=0.05', '-f', 'null', '-']);
const silences = [];
for (const m of sd.stderr.matchAll(/silence_start: (-?[\d.]+)[\s\S]*?silence_end: (-?[\d.]+)/g)) silences.push({ start: +m[1], end: +m[2] });
const gapA = GAPS[0];
const covering = silences.find((x) => x.start <= gapA.t0 + 0.005 && x.end >= gapA.t1 - 0.005);
let maxAbsGap = 0;
for (let n = s(gapA.t0); n < s(gapA.t1); n++) maxAbsGap = Math.max(maxAbsGap, Math.abs(master.channels[0][n]), Math.abs(master.channels[1][n]));
pass('b_silence_5p9_6p0', !!covering && maxAbsGap < dbToGain(-60), {
  criterion: `silencedetect(noise=-60dB:d=0.05) reports an interval covering ${gapA.t0}–${gapA.t1} (±5 ms)`,
  remotion_silencedetect_intervals: silences,
  covering_interval: covering || null,
  node_max_abs_sample_in_gap_dbfs: maxAbsGap === 0 ? '-inf (digital zero)' : +gainToDb(maxAbsGap).toFixed(1),
  first_nonzero_after_gap_sample: (() => { for (let n = s(gapA.t0); n < TOTAL; n++) if (master.channels[0][n] !== 0 || master.channels[1][n] !== 0) return n; return null; })(),
});

// ------------------------------------------------------------------ RMS helpers
const cum = new Float64Array(TOTAL + 1);
for (let n = 0; n < TOTAL; n++) cum[n + 1] = cum[n] + (master.channels[0][n] ** 2 + master.channels[1][n] ** 2) / 2;
const rmsDb = (a, b) => 10 * Math.log10((cum[s(b)] - cum[s(a)]) / (s(b) - s(a)) + 1e-20);

// (c) stop-time drop
const gapB = GAPS[1];
const loud = rmsDb(gapB.t0 - 1, gapB.t0 - 0.1), quiet = rmsDb(gapB.t0, gapB.t1 - 0.05);
pass('c_stoptime_drop', loud - quiet >= 12, {
  criterion: 'RMS over the stop-time at least 12 dB below the second before it',
  rms_before_dbfs: +loud.toFixed(2), rms_stoptime_dbfs: +quiet.toFixed(2), drop_db: +(loud - quiet).toFixed(2),
});

// (d) drops: energy jump + onset position
const env1 = (() => {
  // 1 ms-hop energy envelope for onset detection
  const hop = s(0.001), n = Math.floor(TOTAL / hop), e = new Float64Array(n);
  for (let k = 0; k < n; k++) e[k] = (cum[(k + 1) * hop] - cum[k * hop]) / hop;
  return { hop, e };
})();
function onsetNear(t) {
  const { hop, e } = env1;
  const k0 = Math.round((t - 0.1) / 0.001), k1 = Math.round((t + 0.1) / 0.001);
  const mean = (a, b) => { let x = 0; for (let k = a; k < b; k++) x += e[k]; return x / (b - a); };
  let best = -Infinity, bk = k0;
  for (let k = k0; k <= k1; k++) {
    const r = 10 * Math.log10(mean(k, k + 5) + 1e-12) - 10 * Math.log10(mean(k - 50, k - 5) + 1e-12);
    if (r > best + 1e-9) { best = r; bk = k; }
  }
  return { t: +(bk * hop / SR).toFixed(4), rise_db: +best.toFixed(1) };
}
const dRes = DROPS.map((t) => {
  const need = 6;
  const post = rmsDb(t, t + 0.25), preW = rmsDb(t - 0.6, t - 0.1);
  const on = onsetNear(t);
  const errMs = +((on.t - t) * 1000).toFixed(1);
  return { t, required_db: need, rms_post_dbfs: +post.toFixed(2), rms_pre_dbfs: +preW.toFixed(2), jump_db: +(post - preW).toFixed(2), onset_s: on.t, onset_error_ms: errMs, onset_rise_db: on.rise_db, pass: post - preW >= need && Math.abs(errMs) <= 16.7 };
});
pass('d_drops', dRes.every((d) => d.pass), {
  criterion: 'RMS[t,t+0.25] - RMS[t-0.6,t-0.1] >= +6 dB at each drop; strongest onset within ±100 ms at <= 16.7 ms (1 frame) from t',
  onset_method: 'energy (L²+R²)/2 on 1 ms hops; onset = argmax over [t-0.1,t+0.1] of dB(mean next 5 ms) - dB(mean of [-50,-5] ms)',
  drops: dRes,
});

// (f, informational) click sync on the SFX stem at every click cue
const CLICK_TIMES = cues.cues.filter((c) => c.kind === 'click').map((c) => c.t);
const clickSync = sfxStem ? CLICK_TIMES.map((t) => {
  // sample-level onset on the SFX stem: argmax over ±20 ms of dB(energy next 0.5 ms) - dB(energy of previous 10 ms)
  const c = sfxStem.channels;
  const e = (a, b) => { let x = 0; for (let n = a; n < b; n++) x += c[0][n] ** 2 + c[1][n] ** 2; return x / (b - a); };
  let best = -Infinity, bn = 0;
  for (let n = s(t) - s(0.02); n <= s(t) + s(0.02); n++) {
    const r = 10 * Math.log10(e(n, n + 24) + 1e-20) - 10 * Math.log10(e(n - 480, n) + 1e-20);
    if (r > best) { best = r; bn = n; }
  }
  return { t, onset_sample: bn, expected_sample: s(t), offset_samples: bn - s(t), rise_db: +best.toFixed(1) };
}) : null;
if (clickSync) pass('f_click_sync_info', clickSync.every((x) => Math.abs(x.offset_samples) <= 96), { note: 'informational: sample-level onset of the click on the SFX stem vs cue frame*800 (tolerance ±96 samples = 2 ms; overlapping cues blur the onset detector)', clicks: clickSync });

// (g) section energy: drop2 must be the loudest section (K-weighted, ungated, whole section)
const kcum = (() => {
  const cs = new Float64Array(TOTAL + 1);
  const kl = kWeight(master.channels[0]), kr = kWeight(master.channels[1]);
  for (let n = 0; n < TOTAL; n++) cs[n + 1] = cs[n] + kl[n] * kl[n] + kr[n] * kr[n];
  return cs;
})();
const secL = SECTIONS.map((sc) => {
  const a = s(sc.start), b = s(Math.min(sc.end, END_S - 0.04));
  return { id: sc.id, start: sc.start, end: sc.end, intensity: sc.intensity, lufs: +(-0.691 + 10 * Math.log10((kcum[b] - kcum[a]) / (b - a) + 1e-20)).toFixed(2), rms_dbfs: +rmsDb(sc.start, Math.min(sc.end, END_S - 0.04)).toFixed(2) };
});
const d2 = secL.find((x) => x.id === 'drop2');
pass('g_section_energy', secL.every((x) => x.id === 'drop2' || x.lufs <= d2.lufs + 0.5), { criterion: 'drop2 (peak of the video) is the loudest section (others at most +0.5 LU, the short finale impact included)', sections: secL });

// (h, informational) discontinuity scan: largest sample-to-sample jumps, listed with the nearest cue/section
// boundary so a human can tell intended transients (impacts, kicks) from accidental clicks.
const jumps = [];
for (let n = 1; n < TOTAL; n++) {
  const d = Math.max(Math.abs(master.channels[0][n] - master.channels[0][n - 1]), Math.abs(master.channels[1][n] - master.channels[1][n - 1]));
  if (d > 0.2) jumps.push({ n, d });
}
jumps.sort((a, b) => b.d - a.d);
const picked = [];
for (const j of jumps) { if (picked.every((p) => Math.abs(p.n - j.n) > s(0.05))) picked.push(j); if (picked.length >= 10) break; }
const cueTimes = cues.cues.filter((c) => c.kind !== 'silence_gap').map((c) => ({ t: c.frame * 800 / SR, id: c.id }));
const kickGrid = (t) => Math.abs(t * 2 - Math.round(t * 2)) * 0.5; // distance to nearest beat (s)
const discont = picked.map((j) => {
  const t = j.n / SR;
  const near = cueTimes.reduce((a, c) => (Math.abs(c.t - t) < Math.abs(a.t - t) ? c : a), { t: Infinity, id: null });
  return { t: +t.toFixed(4), jump: +j.d.toFixed(3), nearest_cue: near.id, cue_dist_ms: +((t - near.t) * 1000).toFixed(1), beat_dist_ms: +(kickGrid(t) * 1000).toFixed(1) };
});
const gapEdges = [...GAPS.flatMap((g) => [g.t0, g.t1]), END_S - 0.04].map((t) => {
  const a = s(t) - s(0.003), b = s(t) + s(0.003);
  let m = 0;
  for (let n = Math.max(1, a); n < Math.min(TOTAL, b); n++) m = Math.max(m, Math.abs(master.channels[0][n] - master.channels[0][n - 1]), Math.abs(master.channels[1][n] - master.channels[1][n - 1]));
  return { t, max_jump_pm3ms: +m.toFixed(4) };
});
results.h_discontinuities_info = { pass: true, note: 'informational: jumps > 0.2 FS between consecutive samples (top 10, 50 ms apart). Jumps at cue onsets / on-beat kicks are intended transients.', top_jumps: discont, gap_edges: gapEdges, count_over_0p2: jumps.length };

// zoomed waveforms around the two silences
function zoom(t0, t1, file, title) {
  const Wz = 1920, H = 520, top = 40, bot = H - 50;
  const cv = new Canvas(Wz, H, [14, 16, 22]);
  cv.text(10, 10, title, COL.text, 2);
  const zx = (t) => 60 + (Wz - 80) * (t - t0) / (t1 - t0);
  for (const g of GAPS) if (g.t1 > t0 && g.t0 < t1) cv.fillRect(zx(Math.max(t0, g.t0)), top, zx(Math.min(t1, g.t1)) - zx(Math.max(t0, g.t0)), bot - top, COL.gap, 0.3);
  const mid = (top + bot) / 2, half = (bot - top) / 2;
  cv.hline(Math.round(mid), 60, Wz - 20, COL.grid);
  const c = master.channels;
  for (let x = 60; x < Wz - 20; x++) {
    const a = s(t0 + (x - 60) / (Wz - 80) * (t1 - t0)), b = s(t0 + (x - 59) / (Wz - 80) * (t1 - t0));
    let mn = 0, mx = 0;
    for (let n = a; n < b; n++) { const v = 0.5 * (c[0][n] + c[1][n]); if (v < mn) mn = v; if (v > mx) mx = v; }
    cv.vline(x, mid - mx * half, mid - mn * half, COL.master, 0.9);
  }
  for (let t = Math.ceil(t0 * 10) / 10; t <= t1 + 1e-9; t += 0.1) {
    const x = zx(t);
    cv.vline(x, bot, bot + 6, COL.axis);
    cv.text(x - 18, bot + 10, t.toFixed(1), COL.axis, 2);
  }
  for (const t of DROPS) if (t >= t0 && t <= t1) cv.vline(zx(t), top, bot, COL.drop, 0.9, 2);
  cv.save(file);
}

// (i, informational) spectral balance of the master per section: band RMS (dBFS) low <150 Hz, mid 150–2500 Hz,
// presence 2.5–6 kHz, air > 6 kHz (4th-order Butterworth-ish splits). Used to watch for boomy lows / harsh highs.
const bandCum = (lo, hi) => {
  const fl = hi ? [new Biquad('lowpass', hi), new Biquad('lowpass', hi)] : null;
  const fh = lo ? [new Biquad('highpass', lo), new Biquad('highpass', lo)] : null;
  const cs = new Float64Array(TOTAL + 1);
  for (let n = 0; n < TOTAL; n++) {
    let x = 0.5 * (master.channels[0][n] + master.channels[1][n]);
    if (fh) x = fh[1].run(fh[0].run(x));
    if (fl) x = fl[1].run(fl[0].run(x));
    cs[n + 1] = cs[n] + x * x;
  }
  return (a, b) => +(10 * Math.log10((cs[s(b)] - cs[s(a)]) / (s(b) - s(a)) + 1e-20)).toFixed(1);
};
const bLow = bandCum(0, 150), bMid = bandCum(150, 2500), bPres = bandCum(2500, 6000), bAir = bandCum(6000, 0);
results.i_spectral_balance_info = {
  pass: true, note: 'informational: band RMS in dBFS of (L+R)/2',
  sections: SECTIONS.map((sc) => { const e = Math.min(sc.end, END_S - 0.04); return { id: sc.id, low: bLow(sc.start, e), mid: bMid(sc.start, e), presence: bPres(sc.start, e), air: bAir(sc.start, e) }; }),
};

// tail level (informational)
const tailInfo = { rms_last_0p4s_dbfs: +rmsDb(END_S - 0.5, END_S - 0.1).toFixed(1), rms_2s_before_end_dbfs: +rmsDb(END_S - 2, END_S - 1.5).toFixed(1), last_sample_abs: Math.max(Math.abs(master.channels[0][TOTAL - 1]), Math.abs(master.channels[1][TOTAL - 1])) };

// ------------------------------------------------------------------ PNGs
const W = 3840;
const X0 = 70, X1 = W - 20;
const tx = (t) => X0 + (X1 - X0) * t / END_S;
const COL = { grid: [52, 58, 72], axis: [150, 160, 180], drop: [255, 90, 90], gap: [255, 200, 60], text: [200, 210, 230], master: [80, 190, 255], music: [140, 120, 255], sfx: [120, 230, 150] };
function timeAxis(cv, yTop, yBot) {
  for (let t = 0; t <= END_S + 1e-9; t += 2) {
    const x = tx(t);
    cv.vline(x, yTop, yBot, COL.grid, 0.6);
    cv.vline(x, yBot, yBot + 8, COL.axis);
    const lab = String(t);
    cv.text(x - cv.textWidth(lab, 2) / 2, yBot + 12, lab, COL.axis, 2);
  }
}
function annotate(cv, yTop, yBot, labels = true) {
  for (const g of GAPS) cv.fillRect(tx(g.t0), yTop, Math.max(2, tx(g.t1) - tx(g.t0)), yBot - yTop, COL.gap, 0.35);
  for (const t of DROPS) {
    cv.vline(tx(t), yTop, yBot, COL.drop, 0.9, 2);
    if (labels) cv.text(tx(t) + 5, yTop + 4, t.toFixed(1), COL.drop, 2);
  }
}
function waveform(chans, file, title) {
  const H = 640, top = 40, bot = H - 40;
  const cv = new Canvas(W, H, [14, 16, 22]);
  cv.text(10, 10, title, COL.text, 2);
  const half = (bot - top) / 2;
  chans.forEach((c, ci) => {
    const mid = top + half * ci + half / 2;
    cv.hline(Math.round(mid), X0, X1, COL.grid);
    for (let x = X0; x < X1; x++) {
      const a = Math.floor((x - X0) / (X1 - X0) * TOTAL), b = Math.floor((x + 1 - X0) / (X1 - X0) * TOTAL);
      let mn = 0, mx = 0, e = 0;
      for (let n = a; n < b; n++) { const v = c[n]; if (v < mn) mn = v; if (v > mx) mx = v; e += v * v; }
      const r = Math.sqrt(e / Math.max(1, b - a));
      cv.vline(x, mid - mx * half / 2, mid - mn * half / 2, COL.master, 0.8);
      cv.vline(x, mid - r * half / 2, mid + r * half / 2, [200, 235, 255], 0.9);
    }
    cv.text(10, mid - 7, ci ? 'R' : 'L', COL.text, 2);
  });
  annotate(cv, top, bot);
  timeAxis(cv, top, bot);
  cv.save(file);
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
function spectrogram(chans, file, title) {
  const H = 1080, top = 40, bot = H - 40, N = 4096, fmin = 30, fmax = 20000;
  const cv = new Canvas(W, H, [0, 0, 4]);
  cv.text(10, 10, title + '  (STFT 4096 HANN, LOG FREQ 30 HZ - 20 KHZ, 0 TO -100 DB)', COL.text, 2);
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  const cols = X1 - X0, rows = bot - top;
  const img = new Float32Array(cols * rows);
  let gmax = -Infinity;
  const re = new Float64Array(N), im = new Float64Array(N);
  const binOfRow = Array.from({ length: rows }, (_, r) => fmin * Math.pow(fmax / fmin, 1 - r / (rows - 1)) * N / SR);
  for (let x = 0; x < cols; x++) {
    const center = Math.floor((x + 0.5) / cols * TOTAL);
    for (let i = 0; i < N; i++) {
      const n = center - N / 2 + i;
      re[i] = n >= 0 && n < TOTAL ? 0.5 * (chans[0][n] + chans[1][n]) * win[i] : 0;
      im[i] = 0;
    }
    fft(re, im);
    for (let r = 0; r < rows; r++) {
      const b = binOfRow[r];
      const b0 = Math.floor(b), fr = b - b0;
      const m0 = re[b0] ** 2 + im[b0] ** 2, m1 = re[b0 + 1] ** 2 + im[b0 + 1] ** 2;
      const v = 10 * Math.log10(m0 * (1 - fr) + m1 * fr + 1e-20);
      img[r * cols + x] = v;
      if (v > gmax) gmax = v;
    }
  }
  for (let r = 0; r < rows; r++) for (let x = 0; x < cols; x++) cv.set(X0 + x, top + r, inferno((img[r * cols + x] - gmax + 100) / 100));
  for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
    const r = top + (rows - 1) * (1 - Math.log(f / fmin) / Math.log(fmax / fmin));
    cv.hline(Math.round(r), X0 - 8, X0, COL.axis);
    cv.hline(Math.round(r), X0, X1, [255, 255, 255], 0.12);
    const lab = f >= 1000 ? `${f / 1000}K` : String(f);
    cv.text(4, r - 7, lab, COL.axis, 2);
  }
  for (const t of DROPS) cv.vline(tx(t), top, top + 18, COL.drop, 1, 3);
  for (const g of GAPS) cv.fillRect(tx(g.t0), bot - 12, Math.max(3, tx(g.t1) - tx(g.t0)), 12, COL.gap, 1);
  timeAxis(cv, bot, bot);
  cv.save(file);
}
function envelopePlot(file) {
  const H = 900, top = 60, bot = H - 50, dbMin = -60, dbMax = 0;
  const cv = new Canvas(W, H, [14, 16, 22]);
  cv.text(10, 10, 'RMS ENVELOPE (50 MS WINDOW, 10 MS HOP, DBFS)   BLUE = MASTER   PURPLE = MUSIC.WAV (AS RENDERED)   GREEN = SFX BUS STEM (PRE-LIMITER)', COL.text, 2);
  cv.text(10, 34, `RED LINES = DROPS ${DROPS.join('/')} S    YELLOW = SILENCE GAPS ${GAPS.map((g) => `${g.t0}-${g.t1}`).join(' AND ')} S`, COL.text, 2);
  const ty = (db) => top + (bot - top) * (dbMax - Math.max(dbMin, Math.min(dbMax, db))) / (dbMax - dbMin);
  for (let db = dbMin; db <= dbMax; db += 6) {
    cv.hline(Math.round(ty(db)), X0, X1, COL.grid, 0.8);
    cv.text(4, ty(db) - 7, String(db), COL.axis, 2);
  }
  for (const sc of SECTIONS) cv.text(tx(sc.start) + 6, bot - 22, sc.id.toUpperCase(), [120, 130, 150], 2);
  annotate(cv, top, bot);
  timeAxis(cv, top, bot);
  const series = [[music.channels, COL.music], ...(sfxStem ? [[sfxStem.channels, COL.sfx]] : []), [master.channels, COL.master]];
  for (const [ch, col] of series) {
    const win = s(0.05), hop = s(0.01);
    let prev = null;
    for (let a = 0; a + win <= TOTAL; a += hop) {
      let e = 0;
      for (let n = a; n < a + win; n++) e += (ch[0][n] ** 2 + ch[1][n] ** 2) / 2;
      const db = 10 * Math.log10(e / win + 1e-20);
      const p = [tx((a + win / 2) / SR), ty(db)];
      if (prev) { cv.line(prev[0], prev[1], p[0], p[1], col); cv.line(prev[0], prev[1] + 1, p[0], p[1] + 1, col); }
      prev = p;
    }
  }
  cv.save(file);
}
function sfxContactSheet(file) {
  const man = JSON.parse(fs.readFileSync(path.join(PATHS.sfxDir, 'manifest.json'), 'utf8'));
  const keys = Object.keys(man.files).sort();
  const cols = 4, cw = 940, ch = 150, pad = 10;
  const rows = Math.ceil(keys.length / cols);
  const cv = new Canvas(cols * cw, rows * ch + 40, [14, 16, 22]);
  cv.text(10, 10, 'SFX CONTACT SHEET: WAVEFORM (BLUE) + 10 MS RMS (WHITE), X AXIS = FILE LENGTH, TICK EVERY 100 MS', COL.text, 2);
  keys.forEach((k, i) => {
    const w = readWav(path.join(PATHS.publicAudio, man.files[k].file));
    const x0 = (i % cols) * cw + pad, y0 = 40 + Math.floor(i / cols) * ch + pad, ww = cw - 2 * pad, hh = ch - 2 * pad - 18;
    cv.fillRect(x0, y0, ww, hh + 18, [22, 26, 36]);
    cv.text(x0 + 4, y0 + 2, `${k} ${man.files[k].seconds}S`, COL.text, 2);
    const mid = y0 + 18 + hh / 2, c = w.channels, n = w.frames;
    for (let t = 0; t < n / SR; t += 0.1) cv.vline(x0 + ww * t * SR / n, y0 + 18, y0 + 18 + hh, COL.grid, 0.7);
    for (let x = 0; x < ww; x++) {
      const a = Math.floor(x / ww * n), b = Math.max(a + 1, Math.floor((x + 1) / ww * n));
      let mn = 0, mx = 0, e = 0;
      for (let j = a; j < b; j++) { const v = 0.5 * (c[0][j] + c[1][j]); if (v < mn) mn = v; if (v > mx) mx = v; e += v * v; }
      cv.vline(x0 + x, mid - mx * hh / 2, mid - mn * hh / 2, COL.master, 0.85);
      const r = Math.sqrt(e / (b - a));
      cv.vline(x0 + x, mid - r * hh / 2, mid + r * hh / 2, [230, 240, 255], 0.9);
    }
  });
  cv.save(file);
}
const png = {
  master_waveform: path.join(PATHS.analysis, 'master_waveform.png'),
  music_waveform: path.join(PATHS.analysis, 'music_waveform.png'),
  master_spectrogram: path.join(PATHS.analysis, 'master_spectrogram.png'),
  music_spectrogram: path.join(PATHS.analysis, 'music_spectrogram.png'),
  envelope_rms: path.join(PATHS.analysis, 'envelope_rms.png'),
  sfx_contact_sheet: path.join(PATHS.analysis, 'sfx_contact_sheet.png'),
  zoom_gap_5p9: path.join(PATHS.analysis, 'zoom_hard_cut.png'),
  zoom_stoptime: path.join(PATHS.analysis, 'zoom_stoptime.png'),
};
zoom(gapA.t1 - 0.5, gapA.t1 + 0.5, png.zoom_gap_5p9, `MASTER ZOOM AROUND THE HARD CUT (L+R)/2  YELLOW = ${gapA.t0}-${gapA.t1} TOTAL SILENCE`);
zoom(gapB.t0 - 0.5, gapB.t1 + 0.5, png.zoom_stoptime, `MASTER ZOOM AROUND DROP 2 (L+R)/2  YELLOW = ${gapB.t0}-${gapB.t1} STOP-TIME (RISER TAIL ONLY)`);
waveform(master.channels, png.master_waveform, 'MASTER.WAV WAVEFORM (MIN/MAX BLUE, RMS WHITE)');
waveform(music.channels, png.music_waveform, 'MUSIC.WAV WAVEFORM (MIN/MAX BLUE, RMS WHITE)');
spectrogram(master.channels, png.master_spectrogram, 'MASTER.WAV SPECTROGRAM');
spectrogram(music.channels, png.music_spectrogram, 'MUSIC.WAV SPECTROGRAM');
envelopePlot(png.envelope_rms);
sfxContactSheet(png.sfx_contact_sheet);
pass('e_pngs', Object.values(png).every((p) => fs.existsSync(p)), { files: Object.fromEntries(Object.entries(png).map(([k, p]) => [k, rel(p)])), note: 'drawn in Node (zlib PNG); must be opened and inspected visually' });

// ------------------------------------------------------------------ report
const mixReport = (() => { try { return JSON.parse(fs.readFileSync(path.join(PATHS.analysis, 'mix-report.json'), 'utf8')); } catch { return null; } })();
const report = {
  generated_by: 'scripts/audio/analyze.mjs',
  measured_at: new Date().toISOString(),
  measurement_note: 'Loudness/true peak measured with our own ITU-R BS.1770-4 implementation (scripts/audio/loudness.mjs), not ffmpeg ebur128; the Remotion ffmpeg build lacks ebur128. Cross-checked with Remotion ffmpeg loudnorm (and system ffmpeg ebur128 when available).',
  all_pass: Object.values(results).every((r) => r.pass),
  results,
  tail: tailInfo,
  mix: mixReport ? { music: mixReport.music, sfx: mixReport.sfx, master_chain: { ...mixReport.master_chain, iterations: undefined } } : null,
};
fs.writeFileSync(path.join(PATHS.analysis, 'report.json'), JSON.stringify(report, null, 2));
for (const [k, v] of Object.entries(results)) console.log(`${v.pass ? 'PASS' : 'FAIL'}  ${k}`);
console.log(JSON.stringify({ a: results.a_loudness_truepeak, c: results.c_stoptime_drop, d: results.d_drops.drops.map((d) => `${d.t}: jump ${d.jump_db} dB, onset ${d.onset_error_ms} ms`) , b: results.b_silence_5p9_6p0.covering_interval, tail: tailInfo }, null, 1));
console.log(`[analyze] done in ${((Date.now() - t0Run) / 1000).toFixed(1)} s`);
process.exitCode = report.all_pass ? 0 : 1;
