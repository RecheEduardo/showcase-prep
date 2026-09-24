/**
 * GoTicket showcase — sound effects (synthesized, deterministic) + CC0 transient layers from @remotion/sfx.
 *
 * Usage (from `video/`, no package.json needed):
 *   node scripts/audio/sfx.mjs
 * Output:
 *   public/audio/sfx/<name>.wav          48 kHz, stereo, 24-bit PCM, sample-peak normalized to -1 dBFS
 *   public/audio/sfx/remotion-whoosh.wav https://remotion.media/whoosh.wav converted to 48 kHz stereo (CC0, 1bob)
 *   public/audio/sfx/remotion-whip.wav   https://remotion.media/whip.wav   converted to 48 kHz stereo (CC0, JW_Audio)
 *   public/audio/sfx/manifest.json       cue id -> file + extra per-cue gain (consumed by mix.mjs)
 *
 * Rules implemented here:
 *   - Every transient starts at sample 0 of its file (the attack lands exactly on the cue frame).
 *   - Risers / swells / reverse cymbal start at t and peak at t + dur (end of the dry part of the file).
 *   - chime_success is "você entrou": short bright bell E5–A5–C6 (A minor pentatonic). No cash register,
 *     no "cha-ching", no purchase fanfare. check_ding is a single neutral bell.
 *   - Repeated/melodic cues (blip_pop, pluck_note) use the MIDI note in each cue (A minor pentatonic).
 *   - key_tick: 12 pitch variants + per-character gain offset in ±1.5 dB (seeded), applied by the mixer
 *     (files are peak-normalized, so the gain offset lives in the manifest, not in the audio).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SR, s, mtof, dbToGain, clamp, lerp, expInterp, mulberry32, hashSeed, makeNoise, stereo, peakOf, normalizePeak,
  Saw, SVF, Biquad, freeverb, softClip, writeWav, readWav, loadCues, PATHS, remotionTool, rollPattern, noteName,
} from './dsp.mjs';

const t0Run = Date.now();
const cues = loadCues();
fs.mkdirSync(PATHS.sfxDir, { recursive: true });
fs.mkdirSync(PATHS.sources, { recursive: true });

// ------------------------------------------------------------------ helpers
const buf = (sec) => stereo(s(sec));
function addMono(out, t0, fn, len, pan = 0) {
  const n0 = s(t0), n = s(len);
  const gl = Math.min(1, 1 - pan), gr = Math.min(1, 1 + pan);
  for (let i = 0; i < n && n0 + i < out[0].length; i++) {
    const v = fn(i / SR, i);
    out[0][n0 + i] += v * gl;
    out[1][n0 + i] += v * gr;
  }
}
/** Additive bell: partials = [[ratio, amp, decaySeconds], ...]. */
function bell(out, t0, freq, amp, partials, { pan = 0, attack = 0.0012, len = 2, strike = 0, seed = 1 } = {}) {
  const nz = makeNoise(4000 + seed), hp = new Biquad('highpass', 2500, 0.7);
  addMono(out, t0, (t) => {
    let v = 0;
    for (const [r, a, d] of partials) v += a * Math.sin(2 * Math.PI * freq * r * t) * Math.exp(-t / d);
    const st = strike ? strike * (hp.run(nz()) * 1.6 * Math.exp(-t / 0.0015) + Math.sin(2 * Math.PI * freq * 7.13 * t) * Math.exp(-t / 0.004)) : 0;
    return (v * Math.min(1, t / attack) + st) * amp;
  }, len, pan);
}
function filterStereo(out, type, f, q = Math.SQRT1_2, g = 0) {
  for (const c of out) {
    const bq = new Biquad(type, f, q, g);
    for (let i = 0; i < c.length; i++) c[i] = bq.run(c[i]);
  }
  return out;
}
/** Freeverb send with 250 Hz high-pass on the input (no sub in the tail) and L/R-balanced wet (pure tones
 *  excite different comb resonances per channel; unbalanced wet would pull the image to one side). */
function addVerb(out, wet, opts) {
  const inp = out.map((c) => { const hp = new Biquad('highpass', 250, 0.7), h2 = new Biquad('highpass', 250, 0.7); return c.map((v) => h2.run(hp.run(v))); });
  const [l, r] = freeverb(inp[0], inp[1], opts);
  let el = 0, er = 0;
  for (let i = 0; i < l.length; i++) { el += l[i] * l[i]; er += r[i] * r[i]; }
  const m = Math.sqrt((el + er) / 2);
  const gl = el > 0 ? m / Math.sqrt(el) : 1, gr = er > 0 ? m / Math.sqrt(er) : 1;
  for (let i = 0; i < out[0].length; i++) { out[0][i] += l[i] * wet * gl; out[1][i] += r[i] * wet * gr; }
  return out;
}
function fadeOut(out, ms) {
  const n = s(ms / 1000);
  for (const c of out) for (let i = 0; i < n; i++) c[c.length - 1 - i] *= i / n;
  return out;
}
function fadeIn(out, ms) {
  const n = s(ms / 1000);
  for (const c of out) for (let i = 0; i < n && i < c.length; i++) c[i] *= i / n;
  return out;
}
function mixAt(dst, src, t0, g = 1) {
  const n0 = s(t0);
  for (let c = 0; c < 2; c++) for (let i = 0; i < src[c].length && n0 + i < dst[c].length; i++) dst[c][n0 + i] += src[c][i] * g;
}
/** Band-passed noise sweep, stereo-decorrelated. env(x) and fc(x) take x in [0,1]. */
function noiseSweep(out, t0, len, { fc, q = 1.2, env, pan = () => 0, seed = 1, amp = 1, lp = 0 }) {
  const nl = makeNoise(seed), nr = makeNoise(seed + 99);
  const fl = new SVF(), fr = new SVF();
  const lpl = lp ? new Biquad('lowpass', lp) : null, lpr = lp ? new Biquad('lowpass', lp) : null;
  const n0 = s(t0), n = s(len);
  for (let i = 0; i < n && n0 + i < out[0].length; i++) {
    const x = i / n;
    const f = fc(x), qq = typeof q === 'function' ? q(x) : q;
    fl.run(nl(), f, qq); fr.run((0.6 * nl() + 0.4 * nr()) / 0.7211, f, qq);
    let l = fl.bp, r = fr.bp;
    if (lpl) { l = lpl.run(l); r = lpr.run(r); }
    const e = env(x) * amp;
    const p = pan(x);
    out[0][n0 + i] += l * e * Math.min(1, 1 - p);
    out[1][n0 + i] += r * e * Math.min(1, 1 + p);
  }
}
const bellEnv = (x, peak = 0.3, pw = 1.5) => (x < peak ? Math.pow(x / peak, pw) : Math.pow(1 - (x - peak) / (1 - peak), 2));
const PENT = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103];

// ------------------------------------------------------------------ remotion CC0 transient layers
const REMOTE = {
  whoosh: { url: 'https://remotion.media/whoosh.wav', orig: path.join(PATHS.sources, 'remotion-whoosh.orig.wav'), out: path.join(PATHS.sfxDir, 'remotion-whoosh.wav') },
  whip: { url: 'https://remotion.media/whip.wav', orig: path.join(PATHS.sources, 'remotion-whip.orig.wav'), out: path.join(PATHS.sfxDir, 'remotion-whip.wav') },
};
const remoteStatus = {};
for (const [k, r] of Object.entries(REMOTE)) {
  try {
    if (!fs.existsSync(r.orig)) {
      const res = await fetch(r.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(r.orig, Buffer.from(await res.arrayBuffer()));
    }
    const conv = remotionTool('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', r.orig, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', r.out]);
    if (conv.status !== 0 || !fs.existsSync(r.out)) throw new Error(`ffmpeg conversion failed: ${conv.stderr.slice(-300)}`);
    const w = readWav(r.out);
    if (w.sr !== SR || w.channels.length !== 2) throw new Error(`unexpected format ${w.sr} Hz / ${w.channels.length} ch`);
    // trim leading near-silence so the layer's onset lands on sample 0
    const pk = peakOf(w.channels);
    let on = 0;
    while (on < w.frames && Math.max(Math.abs(w.channels[0][on]), Math.abs(w.channels[1][on])) < pk * dbToGain(-40)) on++;
    const start = Math.max(0, on - s(0.0005));
    const layer = w.channels.map((c) => c.slice(start));
    fadeIn(layer, 0.5);
    remoteStatus[k] = { ok: true, url: r.url, frames_48k: w.frames, trimmed_leading_ms: +(start / SR * 1000).toFixed(2), layer };
  } catch (e) {
    remoteStatus[k] = { ok: false, url: r.url, error: String(e.message || e) };
    console.warn(`[sfx] remotion ${k} unavailable -> synthesized-only fallback (${remoteStatus[k].error})`);
  }
}

// ------------------------------------------------------------------ generators (each returns stereo [L,R])
function clickCore(out, t0, amp, bpHz, seed) {
  const nz = makeNoise(seed);
  const bp = new Biquad('bandpass', bpHz, 1.8);
  addMono(out, t0, (t) => softClip((bp.run(nz()) * 2.2 * Math.exp(-t / 0.002)
    + 0.55 * Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t / 0.012)
    + 0.45 * Math.sin(2 * Math.PI * 1150 * t) * Math.exp(-t / 0.018)
    + 0.35 * Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t / 0.01)) * 1.6, 1.8) * amp, 0.06);
}
const G = {
  click: () => {
    const o = buf(0.12);
    clickCore(o, 0, 1, 4200, 501);
    clickCore(o, 0.045, 0.35, 5200, 502);
    return o;
  },
  click_confirm: () => {
    const o = buf(0.45);
    clickCore(o, 0, 1, 4200, 511);
    const part = [[1, 1, 0.12], [2, 0.3, 0.06], [3, 0.12, 0.03]];
    bell(o, 0.0, mtof(81), 0.3, part, { pan: -0.1, len: 0.4 });
    bell(o, 0.06, mtof(88), 0.26, part, { pan: 0.1, len: 0.38 });
    return addVerb(o, 0.12, { room: 0.5, damp: 0.5 });
  },
  tick: (v) => {
    const f = [1760, 2093, 2349, 2637, 3136, 3520][v];
    const o = buf(0.06);
    const nz = makeNoise(520 + v), hp = new Biquad('highpass', 6000, 0.7);
    addMono(o, 0, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.007) + 0.3 * Math.sin(2 * Math.PI * f * 2.7 * t) * Math.exp(-t / 0.003)
      + 0.3 * hp.run(nz()) * Math.exp(-t / 0.0015), 0.06);
    return fadeOut(o, 5);
  },
  tick_soft: () => {
    const o = buf(0.12);
    addMono(o, 0, (t) => (Math.sin(2 * Math.PI * 1318.5 * t) * Math.exp(-t / 0.018) + 0.2 * Math.sin(2 * Math.PI * 2637 * t) * Math.exp(-t / 0.008)) * Math.min(1, t / 0.0005), 0.12);
    return fadeOut(filterStereo(o, 'lowpass', 6000), 10);
  },
  key_tick: (i) => {
    const r = mulberry32(hashSeed(`key_tick_${i}`));
    const body = 280 * Math.pow(2, r() * 0.4 - 0.2), bpHz = 3200 * Math.pow(2, r() * 0.6 - 0.3);
    const o = buf(0.07);
    const nz = makeNoise(530 + i), bp = new Biquad('bandpass', bpHz, 1.5);
    addMono(o, 0, (t) => {
      const click = bp.run(nz()) * (Math.exp(-t / 0.0018) + (t > 0.012 ? 0.25 * Math.exp(-(t - 0.012) / 0.0015) : 0));
      return softClip(click * 2 + 0.45 * Math.sin(2 * Math.PI * body * t) * Math.exp(-t / 0.014), 1.8);
    }, 0.07, (r() - 0.5) * 0.3);
    return fadeOut(o, 5);
  },
  pop: () => {
    const o = buf(0.25);
    let ph = 0;
    const nz = makeNoise(540), bp = new Biquad('bandpass', 2000, 1.2);
    addMono(o, 0, (t) => {
      ph += expInterp(280, 950, t / 0.018) / SR;
      return Math.sin(2 * Math.PI * ph) * Math.min(1, t / 0.001) * Math.exp(-t / 0.05) + 0.3 * bp.run(nz()) * Math.exp(-t / 0.003);
    }, 0.25);
    return fadeOut(o, 20);
  },
  blip_pop: (midi) => {
    const f = mtof(midi);
    const o = buf(0.5);
    let ph = 0;
    addMono(o, 0, (t) => {
      ph += f * expInterp(0.75, 1, t / 0.01) / SR;
      const w = Math.sin(2 * Math.PI * ph) + 0.25 * Math.sin(4 * Math.PI * ph) * Math.exp(-t / 0.05) + 0.1 * Math.sin(6 * Math.PI * ph) * Math.exp(-t / 0.03);
      return w * Math.min(1, t / 0.001) * Math.exp(-t / 0.1);
    }, 0.5);
    addMono(o, 0, (t) => Math.sin(2 * Math.PI * f * 5.1 * t) * Math.exp(-t / 0.003) * 0.6, 0.02);
    return fadeOut(addVerb(o, 0.07, { room: 0.55, damp: 0.4 }), 40);
  },
  pluck_note: (midi) => {
    const o = buf(1.4);
    for (const [c, cents, seed] of [[0, -2, 1], [1, 2, 2]]) {
      const f = mtof(midi) * Math.pow(2, cents / 1200);
      const D = SR / f - 0.5;
      const N = o[c].length, line = new Float32Array(N + 4);
      const nz = makeNoise(560 + midi * 3), lp = new Biquad('lowpass', Math.min(12000, f * 14), 0.7);
      const exc = Math.round(SR / f);
      for (let n = 0; n < N; n++) {
        const x = n < exc ? lp.run(nz()) : 0;
        const pos = n - D;
        let fbv = 0;
        if (pos >= 1) {
          const i0 = Math.floor(pos), fr = pos - i0;
          const a = line[i0] * (1 - fr) + line[i0 + 1] * fr;
          const b = line[i0 - 1] * (1 - fr) + line[i0] * fr;
          fbv = 0.9975 * 0.5 * (a + b);
        }
        line[n] = x + fbv;
        o[c][n] = line[n];
      }
    }
    filterStereo(o, 'highpass', 70);
    // gentle saturation tames the excitation spike (lower crest factor -> the note carries over the swap bed)
    const pk = peakOf(o);
    for (const ch of o) for (let i = 0; i < ch.length; i++) ch[i] = softClip(ch[i] / pk, 2.2);
    return fadeOut(addVerb(o, 0.12, { room: 0.6, damp: 0.4 }), 150);
  },
  chime_ping: (long) => {
    const o = buf(long ? 2.0 : 1.4);
    bell(o, 0, 880, 1, [[1, 1, 0.5], [2.76, 0.35, 0.25], [5.4, 0.15, 0.12], [8.93, 0.06, 0.06]], { len: long ? 2.0 : 1.4, strike: 0.9, seed: long ? 2 : 1 });
    addVerb(o, 0.07, { room: 0.7, damp: 0.4, predelayMs: 10 });
    return fadeOut(o, 50);
  },
  chime_success: () => {
    const o = buf(1.8);
    const part = [[1, 1, 0.6], [2, 0.45, 0.3], [3, 0.2, 0.18], [4.2, 0.08, 0.1]];
    [[76, 0, -0.3], [81, 0.07, 0.3], [84, 0.14, 0]].forEach(([m, t, pan], i) => bell(o, t, mtof(m), 0.8, part, { pan, len: 1.6, strike: 0.8, seed: 10 + i }));
    addVerb(o, 0.08, { room: 0.72, damp: 0.35, predelayMs: 12 });
    return fadeOut(o, 80);
  },
  check_ding: () => {
    const o = buf(0.9);
    bell(o, 0, mtof(88), 1, [[1, 1, 0.4], [2, 0.3, 0.2], [3, 0.12, 0.1]], { len: 0.9, strike: 0.9, seed: 20 });
    addVerb(o, 0.06, { room: 0.6, damp: 0.4 });
    return fadeOut(o, 60);
  },
  shine: () => {
    const o = buf(1.0);
    [93, 96, 100, 103, 105].forEach((m, i) => bell(o, i * 0.03, mtof(m), 0.42, [[1, 1, 0.22], [2, 0.15, 0.08]], { pan: [-0.4, 0.4, -0.2, 0.2, 0][i], len: 0.9, strike: i === 0 ? 0.6 : 0, seed: 30 + i }));
    noiseSweep(o, 0, 0.45, { fc: (x) => expInterp(5000, 11000, x), q: 2, env: (x) => bellEnv(x, 0.4), amp: 0.5, seed: 580 });
    filterStereo(o, 'lowpass', 13000);
    addVerb(o, 0.12, { room: 0.7, damp: 0.3 });
    return fadeOut(o, 80);
  },
  riser: (dur) => {
    const tail = 0.5;
    const o = buf(dur + tail);
    const n = s(dur);
    noiseSweep(o, 0, dur, {
      fc: (x) => expInterp(400, 9000, x), q: (x) => 1 + 3 * x, seed: 600 + Math.round(dur * 10),
      env: (x) => dbToGain(lerp(-36, 0, x)) * Math.min(1, (1 - x) * dur / 0.02), amp: 1.4,
    });
    const sa = [new Saw(0.2), new Saw(0.6)], fl = new SVF(), fr = new SVF();
    for (let i = 0; i < n; i++) {
      const x = i / n;
      const f = expInterp(180, 1440, x);
      const e = dbToGain(lerp(-36, 0, x)) * Math.min(1, (n - i) / 960) * 0.35;
      const fc = expInterp(600, 9000, x);
      o[0][i] += fl.run(sa[0].next(f * 0.995), fc, 1.2) * e;
      o[1][i] += fr.run(sa[1].next(f * 1.005), fc, 1.2) * e;
    }
    return fadeOut(addVerb(o, 0.25, { room: 0.7, damp: 0.3 }), 100);
  },
  snare_roll: (dur) => {
    const o = buf(dur + 0.45);
    rollPattern(dur).forEach((h, k) => {
      const nz = makeNoise(640 + k), hp = new Biquad('highpass', 2200, 0.7), lp = new Biquad('lowpass', 11000, 0.7);
      let ph = 0;
      addMono(o, h.t, (t) => {
        ph += (230 + 50 * Math.exp(-t / 0.015)) / SR;
        return (0.45 * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.05) + lp.run(hp.run(nz())) * Math.exp(-t / 0.1)) * h.vel;
      }, 0.35, k % 2 ? 0.12 : -0.12);
    });
    return fadeOut(addVerb(o, 0.2, { room: 0.6, damp: 0.4 }), 60);
  },
  impact: (size) => {
    const P = {
      soft: { len: 0.8, f0: 110, f1: 55, pt: 0.03, at: 0.15, drv: 1.2, nz: 0.25, nzt: 0.03, crash: 0, verb: 0.15, room: 0.6 },
      small: { len: 1.2, f0: 95, f1: 46, pt: 0.04, at: 0.25, drv: 1.4, nz: 0.45, nzt: 0.05, crash: 0.08, verb: 0.2, room: 0.7 },
      big: { len: 2.2, f0: 120, f1: 42, pt: 0.05, at: 0.45, drv: 1.6, nz: 0.6, nzt: 0.08, crash: 0.16, verb: 0.3, room: 0.82 },
      huge: { len: 3.0, f0: 130, f1: 40, pt: 0.06, at: 0.6, drv: 1.8, nz: 0.75, nzt: 0.1, crash: 0.22, verb: 0.35, room: 0.88 },
    }[size];
    const o = buf(P.len);
    let ph = 0, ph2 = 0;
    const nzl = makeNoise(700 + P.len * 10), nzr = makeNoise(800 + P.len * 10);
    const lpl = new Biquad('lowpass', 5000), lpr = new Biquad('lowpass', 5000), hpl = new Biquad('highpass', 150), hpr = new Biquad('highpass', 150);
    const cl = new Biquad('highpass', 3500), cr = new Biquad('highpass', 3500);
    const n = o[0].length;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      ph += (P.f1 + (P.f0 - P.f1) * Math.exp(-t / P.pt)) / SR;
      ph2 += (70 + 110 * Math.exp(-t / 0.02)) / SR;
      const boom = softClip(Math.sin(2 * Math.PI * ph) * Math.exp(-t / P.at) * 1.1, P.drv);
      const punch = softClip(Math.sin(2 * Math.PI * ph2) * Math.exp(-t / 0.09), 2) * 0.45;
      const burstE = Math.exp(-t / P.nzt) * P.nz;
      const crashE = Math.exp(-t / (P.len * 0.4)) * P.crash;
      const a = nzl(), b = nzr();
      const l = boom + punch + hpl.run(lpl.run(a)) * burstE + cl.run(a) * crashE;
      const r = boom + punch + hpr.run(lpr.run(b)) * burstE + cr.run(b) * crashE;
      o[0][i] = l; o[1][i] = r;
    }
    addVerb(o, P.verb, { room: P.room, damp: 0.35, predelayMs: 15 });
    return fadeOut(o, P.len * 120);
  },
  whooshBody: ({ len = 0.42, f0 = 450, fPk = 2600, f1 = 800, q = 1.3, peak = 0.22, seed = 900, lp = 0, dir = 1 } = {}) => {
    const o = buf(len);
    noiseSweep(o, 0, len, {
      fc: (x) => (x < peak ? expInterp(f0, fPk, x / peak) : expInterp(fPk, f1, (x - peak) / (1 - peak))),
      q, seed, lp, amp: 2.2,
      env: (x) => Math.min(1, x * len / 0.02) * bellEnv(x, peak, 1.2),
      pan: (x) => dir * clamp((x - peak) * 1.4, -0.6, 0.6),
    });
    return o;
  },
  whoosh_layered: (layerKey, { lpLayer = 0, layerDb = 0, body } = {}) => {
    const o = body;
    normalizePeak(o, -3);
    const L = remoteStatus[layerKey];
    if (L && L.ok) {
      const lay = L.layer.map((c) => c.slice());
      if (lpLayer) filterStereo(lay, 'lowpass', lpLayer);
      normalizePeak(lay, layerDb);
      const out = stereo(Math.max(o[0].length, lay[0].length));
      mixAt(out, o, 0);
      mixAt(out, lay, 0);
      return fadeOut(out, 15);
    }
    return fadeOut(o, 15);
  },
  whoosh_slow: (dur) => {
    const o = buf(dur + 0.2);
    noiseSweep(o, 0, dur + 0.2, {
      fc: (x) => (x < 0.55 ? expInterp(200, 1400, x / 0.55) : expInterp(1400, 500, (x - 0.55) / 0.45)), q: 0.8, seed: 950, lp: 3000, amp: 2,
      env: (x) => Math.pow(Math.sin(Math.PI * Math.min(1, x)), 1.5), pan: (x) => lerp(-0.7, 0.7, x),
    });
    noiseSweep(o, 0, dur + 0.2, { fc: () => 180, q: 0.7, seed: 960, amp: 0.8, env: (x) => Math.pow(Math.sin(Math.PI * x), 2) });
    return fadeOut(o, 60);
  },
  whoosh_up: () => {
    const o = buf(0.6);
    noiseSweep(o, 0, 0.6, {
      fc: (x) => expInterp(400, 7000, Math.min(1, x / 0.75)), q: 1.6, seed: 970, amp: 2,
      env: (x) => Math.min(1, x * 0.6 / 0.015) * (x < 0.63 ? Math.pow(x / 0.63, 1.2) : Math.pow(1 - (x - 0.63) / 0.37, 2)),
      pan: (x) => lerp(-0.15, 0.15, x),
    });
    let ph = 0;
    addMono(o, 0, (t) => { ph += expInterp(500, 2000, t / 0.45) / SR; return 0.12 * Math.sin(2 * Math.PI * ph) * Math.min(1, t / 0.4) * (t < 0.45 ? 1 : Math.exp(-(t - 0.45) / 0.03)); }, 0.6);
    return fadeOut(o, 30);
  },
  swell_fill: (pitch, dur) => {
    const o = buf(dur + 0.45);
    const notes = [69 + pitch, 76 + pitch, 57 + pitch];
    const amps = [1, 0.8, 0.5];
    const n = o[0].length, nd = s(dur);
    notes.forEach((m, k) => {
      const f = mtof(m);
      const oscL = new Saw(0.1 + k * 0.2), oscR = new Saw(0.5 + k * 0.2), fl = new SVF(), fr = new SVF();
      for (let i = 0; i < n; i++) {
        const x = i / nd;
        const e = (x <= 1 ? Math.pow(x, 2.2) : Math.exp(-(i - nd) / SR / 0.12)) * amps[k] * 0.3;
        const fc = x <= 1 ? expInterp(600, 6000, x) : 6000;
        o[0][i] += fl.run(oscL.next(f * 0.997), fc, 0.9) * e;
        o[1][i] += fr.run(oscR.next(f * 1.003), fc, 0.9) * e;
      }
    });
    return fadeOut(addVerb(o, 0.2, { room: 0.65, damp: 0.35 }), 60);
  },
  counter_roll: (dur) => {
    const o = buf(dur + 0.08);
    const count = Math.round(dur / 0.03);
    for (let i = 0; i < count; i++) {
      const f = mtof(PENT[10 + Math.floor(i * 10 / count)]);
      const a = lerp(0.6, 1, i / count);
      addMono(o, i * 0.03, (t) => (Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.006) + 0.2 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t / 0.003)) * a, 0.03);
    }
    return fadeOut(o, 10);
  },
  sub_hit: () => {
    const o = buf(1.4);
    let ph = 0;
    const nz = makeNoise(990), lp = new Biquad('lowpass', 900);
    addMono(o, 0, (t) => {
      ph += (42 + 33 * Math.exp(-t / 0.05)) / SR;
      return softClip(Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.45), 1.4) + 0.2 * lp.run(nz()) * Math.exp(-t / 0.01);
    }, 1.4);
    return fadeOut(o, 150);
  },
  sub_swell: (dur) => {
    const o = buf(dur + 0.4);
    const nd = s(dur);
    let ph = 0;
    addMono(o, 0, (t, i) => {
      ph += 55 / SR;
      const x = i / nd;
      const e = x <= 1 ? Math.pow(x, 2) : Math.exp(-(t - dur) / 0.12);
      return (Math.sin(2 * Math.PI * ph) + 0.3 * Math.sin(4 * Math.PI * ph)) * e;
    }, dur + 0.4);
    return fadeOut(o, 30);
  },
  reverse_cymbal: (dur) => {
    const n = s(dur);
    const c = stereo(n);
    const nzl = makeNoise(1001), nzr = makeNoise(1002);
    const hl = new Biquad('highpass', 3500), hr = new Biquad('highpass', 3500), ll = new Biquad('lowpass', 12000), lr = new Biquad('lowpass', 12000);
    let p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      p1 += 1587 / SR; p2 += 2311 / SR;
      const met = 0.25 * (Math.sign(Math.sin(2 * Math.PI * p1)) + Math.sign(Math.sin(2 * Math.PI * p2))) * 0.5;
      const e = Math.exp(-t / (dur * 0.4));
      c[0][i] = ll.run(hl.run(nzl() + met)) * e;
      c[1][i] = lr.run(hr.run(nzr() + met)) * e;
    }
    const o = stereo(n);
    for (let i = 0; i < n; i++) { o[0][i] = c[0][n - 1 - i]; o[1][i] = c[1][n - 1 - i]; }
    return fadeOut(fadeIn(o, 20), 3);
  },
};

// ------------------------------------------------------------------ cue -> file resolution
const fmtDur = (d) => String(d).replace('.', 'p') + 's';
const hasLayer = (k) => remoteStatus[k] && remoteStatus[k].ok;
const keyGainRng = mulberry32(hashSeed('key_tick_gain'));
const keyGain = Array.from({ length: 64 }, () => +((keyGainRng() * 2 - 1) * 1.5).toFixed(2));
function resolve(c) {
  switch (c.kind) {
    case 'click': case 'click_confirm': case 'tick_soft': case 'pop': case 'chime_success': case 'check_ding':
    case 'shine': case 'whoosh_up': case 'sub_hit':
      return { key: c.kind, gen: () => G[c.kind]() };
    case 'tick': {
      const v = Math.min(5, Math.floor((c.index ?? 0) * 6 / (c.count ?? 6)));
      return { key: `tick_v${v}`, gen: () => G.tick(v) };
    }
    case 'key_tick': {
      const i = (c.index ?? 0) % 12;
      return { key: `key_tick_${String(i).padStart(2, '0')}`, gen: () => G.key_tick(i), extra: keyGain[c.index ?? 0] };
    }
    case 'blip_pop': case 'pluck_note': {
      if (typeof c.midi !== 'number') throw new Error(`${c.id}: missing midi`);
      return { key: `${c.kind}_${noteName(c.midi).replace('#', 's')}`, gen: () => G[c.kind](c.midi) };
    }
    case 'chime_ping': {
      const long = (c.dur ?? 0) >= 1.5;
      return { key: long ? `chime_ping_${fmtDur(c.dur)}` : 'chime_ping', gen: () => G.chime_ping(long) };
    }
    case 'riser': return { key: `riser_${fmtDur(c.dur)}`, gen: () => G.riser(c.dur), peakAt: c.dur };
    case 'snare_roll': return { key: `snare_roll_${fmtDur(c.dur)}`, gen: () => G.snare_roll(c.dur) };
    case 'impact_soft': case 'impact_small': case 'impact_big': case 'impact_huge':
      return { key: c.kind, gen: () => G.impact(c.kind.split('_')[1]) };
    case 'whoosh': {
      const layer = /remotion-sfx:whip/.test(c.source) ? 'whip' : /remotion-sfx:whoosh/.test(c.source) ? 'whoosh' : null;
      if (layer && hasLayer(layer)) {
        return { key: `whoosh_${layer === 'whip' ? 'whip' : 'rw'}`, layer, gen: () => G.whoosh_layered(layer, { body: G.whooshBody({ seed: layer === 'whip' ? 901 : 902 }) }) };
      }
      return { key: 'whoosh', gen: () => fadeOut(G.whooshBody({ seed: 903 }), 15) };
    }
    case 'whoosh_soft': {
      const body = () => G.whooshBody({ len: 0.5, f0: 300, fPk: 1600, f1: 600, q: 1.0, peak: 0.3, seed: 910, lp: 2500 });
      if (/remotion-sfx:whoosh/.test(c.source) && hasLayer('whoosh')) {
        return { key: 'whoosh_soft_rw', layer: 'whoosh', gen: () => G.whoosh_layered('whoosh', { body: body(), lpLayer: 4000, layerDb: -4 }) };
      }
      return { key: 'whoosh_soft', gen: () => fadeOut(body(), 20) };
    }
    case 'whoosh_slow': return { key: `whoosh_slow_${fmtDur(c.dur)}`, gen: () => G.whoosh_slow(c.dur) };
    case 'swell_fill': {
      const p = c.pitch_semitones ?? 0;
      return { key: `swell_fill_p${p}_${fmtDur(c.dur)}`, gen: () => G.swell_fill(p, c.dur), peakAt: c.dur };
    }
    case 'counter_roll': return { key: `counter_roll_${fmtDur(c.dur)}`, gen: () => G.counter_roll(c.dur) };
    case 'sub_swell': return { key: `sub_swell_${fmtDur(c.dur)}`, gen: () => G.sub_swell(c.dur), peakAt: c.dur };
    case 'reverse_cymbal': return { key: `reverse_cymbal_${fmtDur(c.dur)}`, gen: () => G.reverse_cymbal(c.dur), peakAt: c.dur };
    default: throw new Error(`no generator for kind "${c.kind}" (${c.id})`);
  }
}

// ------------------------------------------------------------------ render
const files = {};
const manifestCues = [];
for (const c of cues.cues) {
  if (c.kind === 'silence_gap') continue;
  const r = resolve(c);
  if (!files[r.key]) {
    const audio = r.gen();
    for (const ch of audio) {
      const hp = new Biquad('highpass', 25, Math.SQRT1_2);
      for (let i = 0; i < ch.length; i++) ch[i] = hp.run(ch[i]);
    }
    {
      // L/R energy balance trim (movement inside the file is kept; only the overall level per side is matched)
      let a = 0, b = 0;
      for (let i = 0; i < audio[0].length; i++) { a += audio[0][i] ** 2; b += audio[1][i] ** 2; }
      if (a > 0 && b > 0) {
        const m = Math.sqrt((a + b) / 2);
        const gl = m / Math.sqrt(a), gr = m / Math.sqrt(b);
        for (let i = 0; i < audio[0].length; i++) { audio[0][i] *= gl; audio[1][i] *= gr; }
      }
    }
    normalizePeak(audio, -1);
    const file = path.join(PATHS.sfxDir, `${r.key}.wav`);
    writeWav(file, audio, { bits: 24 });
    let onset = 0;
    while (onset < audio[0].length && Math.max(Math.abs(audio[0][onset]), Math.abs(audio[1][onset])) < dbToGain(-41)) onset++;
    files[r.key] = {
      file: `sfx/${r.key}.wav`, kind: c.kind, frames: audio[0].length, seconds: +(audio[0].length / SR).toFixed(4),
      onset_sample_minus40db: onset, layer: r.layer ? `remotion-sfx:${r.layer}` : null, peak_at_s: r.peakAt ?? null,
      lr_balance_db: (() => { let a = 0, b = 0; for (let i = 0; i < audio[0].length; i++) { a += audio[0][i] ** 2; b += audio[1][i] ** 2; } return +(10 * Math.log10((a + 1e-20) / (b + 1e-20))).toFixed(2); })(),
    };
  }
  manifestCues.push({
    id: c.id, kind: c.kind, t: c.t, frame: c.frame, sample: c.frame * 800, file: files[r.key].file, key: r.key,
    gain_db: c.gain_db, extra_gain_db: r.extra ?? 0, dur: c.dur ?? null, midi: c.midi ?? null,
  });
}
const manifest = {
  generated_by: 'scripts/audio/sfx.mjs', sample_rate: SR, normalization: 'sample peak -1 dBFS per file',
  remotion_sfx: Object.fromEntries(Object.entries(remoteStatus).map(([k, v]) => [k, { ok: v.ok, url: v.url, error: v.error ?? null, file: v.ok ? `sfx/remotion-${k}.wav` : null, trimmed_leading_ms: v.trimmed_leading_ms ?? null }])),
  files, cues: manifestCues,
};
fs.writeFileSync(path.join(PATHS.sfxDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[sfx] ${Object.keys(files).length} files for ${manifestCues.length} cues in ${((Date.now() - t0Run) / 1000).toFixed(1)} s`);
console.table(Object.entries(files).map(([k, v]) => ({ key: k, sec: v.seconds, onset: v.onset_sample_minus40db, lr_db: v.lr_balance_db, layer: v.layer || '' })));
const unbalanced = Object.entries(files).filter(([, v]) => Math.abs(v.lr_balance_db) > 1.5);
if (unbalanced.length) console.warn('[sfx] L/R imbalance > 1.5 dB:', unbalanced.map(([k, v]) => `${k} ${v.lr_balance_db}`).join(', '));
