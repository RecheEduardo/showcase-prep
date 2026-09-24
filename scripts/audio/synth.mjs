/**
 * GoTicket showcase — procedural music bed (pure Node, deterministic, no samples).
 *
 * Usage (from `video/`, no package.json needed):
 *   node scripts/audio/synth.mjs
 * Output:
 *   public/audio/music.wav                  48 kHz, stereo, 24-bit PCM, exactly 3,072,000 frames (64.0 s)
 *   audio/analysis/music-sections.json      per-section loudness / band-energy report
 *
 * Musical plan (source of truth for the arrangement; timing comes from src/data/cues.json):
 *   - 120 BPM, 4/4, A minor. Beat = 24,000 samples, bar = 96,000. Every event starts at round(t * 48000).
 *   - Harmony: the suggested Am–F–C–G cycle (1 chord/bar) RESTARTS at each section, so every drop
 *     (6.0 / 28.0 / 44.0 / 48.0 / 56.0) lands on Am (tonic). Deviations, on purpose:
 *       breakdown  Fmaj7(#11) | Gsus4 | Am(add9) | Esus4→E   (E major = harmonic-minor V, pulls into the drop)
 *       intro      Am | F | G              groove_lift  Am | F | C        groove_rise  F | C | G
 *       microdrop  Am | G                  finale       Am | F→G | Am(add9) held from 60.0
 *   - Silences: every event is killed (1.5 ms ramp) at the next silence_gap cue (5.9 and 27.5) and all
 *     reverbs/delays are reset when the gap ends, so nothing leaks across. In 27.5–28.0 only the riser's
 *     own reverb tail is let through.
 *   - PRNG: mulberry32 with fixed per-instrument seeds. Math.random is never used.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SR, TOTAL, s, mtof, dbToGain, gainToDb, clamp, lerp, smoothstep, expInterp, mulberry32, makeNoise,
  stereo, peakOf, Saw, Pulse, SVF, Biquad, freeverb, pingPong, softClip, writeWav, loadCues, PATHS, rollPattern,
} from './dsp.mjs';
import { measureLoudness, kEnergyCumsum, rangeLoudness } from './loudness.mjs';

const t0Run = Date.now();
const cues = loadCues();
const SECTIONS = cues.music_sections;
const sec = (id) => {
  const x = SECTIONS.find((q) => q.id === id);
  if (!x) throw new Error(`music section "${id}" missing in cues.json`);
  return x;
};
const cuesOf = (kind) => cues.cues.filter((c) => c.kind === kind);
const GAPS = cuesOf('silence_gap')
  .map((c) => ({ t0: c.t, t1: +(c.t + c.dur).toFixed(6), s0: s(c.t), s1: s(c.t + c.dur) }))
  .sort((a, b) => a.s0 - b.s0);
const RAMP = 72; // 1.5 ms

/** Sample where a voice starting at n0 must be silenced (start of the next gap). */
function killAt(n0) {
  for (const g of GAPS) {
    if (n0 < g.s0) return g.s0;
    if (n0 < g.s1) return n0;
  }
  return Infinity;
}
const killGain = (n, k) => (n >= k ? 0 : n > k - RAMP ? (k - n) / RAMP : 1);

// ------------------------------------------------------------------ harmony
const CH = {
  Am: { root: 45, pad: [57, 60, 64, 69] },
  F: { root: 41, pad: [53, 57, 60, 64] }, // Fmaj7 (E common tone)
  C: { root: 48, pad: [55, 60, 64, 67] },
  G: { root: 43, pad: [55, 59, 62, 67] },
  E: { root: 40, pad: [52, 56, 59, 64] },
  Fs11: { root: 41, pad: [53, 57, 60, 64, 71] },
  Gsus: { root: 43, pad: [55, 60, 62, 67] },
  Am9: { root: 45, pad: [57, 59, 60, 64] },
  Esus: { root: 40, pad: [52, 57, 59, 64] },
  AmAdd9: { root: 45, pad: [57, 60, 64, 71, 76] },
};
const PROGRESSION = {
  intro: ['Am', 'F', 'G'],
  drop1: ['Am', 'F', 'C', 'G'],
  groove_lift: ['Am', 'F', 'C'],
  breakdown: ['Fs11', 'Gsus', 'Am9', 'Esus|E'],
  drop2: ['Am', 'F', 'C', 'G', 'Am'],
  groove_rise: ['F', 'C', 'G'],
  microdrop: ['Am', 'G'],
  swap: ['Am', 'F', 'C', 'G'],
  finale: ['Am', 'F|G', 'AmAdd9'],
  tail: ['AmAdd9'],
};
const SEGS = [];
for (const sc of SECTIONS) {
  const prog = PROGRESSION[sc.id];
  if (!prog) throw new Error(`no progression for section ${sc.id}`);
  const nb = Math.round((sc.end - sc.start) / 2);
  if (prog.length !== nb) throw new Error(`section ${sc.id}: ${nb} bars but ${prog.length} chords`);
  prog.forEach((bar, b) => {
    const parts = bar.split('|');
    const d = 2 / parts.length;
    parts.forEach((p, i) => SEGS.push({ t0: sc.start + b * 2 + i * d, t1: sc.start + b * 2 + (i + 1) * d, name: p, chord: CH[p], sec: sc.id }));
  });
}
const segsOf = (id) => SEGS.filter((g) => g.sec === id);
const chordAt = (t) => (SEGS.find((g) => t >= g.t0 - 1e-9 && t < g.t1 - 1e-9) || SEGS[SEGS.length - 1]).chord;
const grid = (a, b, step) => {
  const out = [];
  for (let k = 0; ; k++) {
    const t = +(a + k * step).toFixed(6);
    if (t >= b - 1e-9) break;
    out.push(t);
  }
  return out;
};

// ------------------------------------------------------------------ buses
const mono = () => new Float32Array(TOTAL);
const BUS = {
  kick: mono(), bass: mono(), sub: mono(), pad: stereo(TOTAL), lead: stereo(TOTAL), arp: stereo(TOTAL),
  clap: stereo(TOTAL), hat: stereo(TOTAL), crash: stereo(TOTAL), roll: stereo(TOTAL), tick: mono(),
  riser: stereo(TOTAL), tailSend: stereo(TOTAL),
};
const KICK_TIMES = [];

function place(bus, src, t, gain = 1, pan = 0) {
  const n0 = s(t);
  const k = killAt(n0);
  if (k <= n0) return;
  const isSt = Array.isArray(src);
  const len = isSt ? src[0].length : src.length;
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  const monoBus = !Array.isArray(bus);
  for (let i = 0; i < len; i++) {
    const n = n0 + i;
    if (n >= TOTAL || n >= k) break;
    const kg = killGain(n, k);
    const l = isSt ? src[0][i] : src[i];
    const r = isSt ? src[1][i] : src[i];
    if (monoBus) bus[n] += 0.5 * (l + r) * gain * kg;
    else { bus[0][n] += l * gl * kg; bus[1][n] += r * gr * kg; }
  }
}

// ------------------------------------------------------------------ one-shot drum synthesis
function fadeTail(buf, ms) {
  const chans = Array.isArray(buf) ? buf : [buf];
  const nf = s(ms / 1000);
  for (const c of chans) for (let i = 0; i < nf; i++) c[c.length - 1 - i] *= i / nf;
  return buf;
}
function makeKick({ f0 = 150, f1 = 45, pitchTau = 0.032, ampTau = 0.14, len = 0.5, click = 1, drive = 1.6, seed = 11 } = {}) {
  const n = s(len);
  const out = new Float32Array(n);
  const nz = makeNoise(seed);
  const hp = new Biquad('highpass', 2500, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / pitchTau);
    ph += f / SR;
    const body = Math.sin(2 * Math.PI * ph) * Math.exp(-t / ampTau);
    const clk = (hp.run(nz()) * Math.exp(-t / 0.0022) * 0.45 + Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t / 0.005) * 0.2) * click;
    out[i] = softClip(body, drive) + clk;
  }
  return fadeTail(out, 60);
}
function makeClap(seed) {
  const n = s(0.45);
  const out = stereo(n);
  const nzC = makeNoise(seed), nzL = makeNoise(seed + 1), nzR = makeNoise(seed + 2);
  const bursts = [0, 0.0105, 0.0205, 0.031];
  const f = [0, 1].map(() => [new Biquad('bandpass', 1350, 1.0), new Biquad('highpass', 550, 0.7), new Biquad('lowpass', 9000, 0.7)]);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = 0;
    for (let b = 0; b < bursts.length; b++) {
      if (t < bursts[b]) continue;
      const dt = t - bursts[b];
      env = Math.max(env, b < bursts.length - 1 ? Math.exp(-dt / 0.0045) : Math.exp(-dt / 0.13));
    }
    const c = nzC();
    const l = (0.7 * c + 0.3 * nzL()) * env, r = (0.7 * c + 0.3 * nzR()) * env;
    out[0][i] = f[0][2].run(f[0][1].run(f[0][0].run(l))) * 2.2;
    out[1][i] = f[1][2].run(f[1][1].run(f[1][0].run(r))) * 2.2;
  }
  return fadeTail(out, 40);
}
const HAT_FREQS = [205.3, 304.4, 369.6, 522.7, 540, 800];
function makeHat(open, seed) {
  const n = s(open ? 0.55 : 0.11);
  const out = new Float32Array(n);
  const nz = makeNoise(seed);
  const oscs = HAT_FREQS.map((_, i) => new Pulse(((seed * 7 + i * 13) % 17) / 17));
  const hp1 = new Biquad('highpass', 7200, 0.8), hp2 = new Biquad('highpass', 7200, 0.8), lp = new Biquad('lowpass', 13500, 0.7);
  const tau = open ? 0.15 : 0.026;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let m = 0;
    for (let k = 0; k < oscs.length; k++) m += oscs[k].next(HAT_FREQS[k] * 1.9);
    const x = 0.55 * nz() + 0.45 * (m / 6);
    const env = Math.exp(-t / tau) * Math.min(1, t / 0.0004 + 0.05);
    out[i] = lp.run(hp2.run(hp1.run(x))) * env * 2.4;
  }
  return fadeTail(out, open ? 40 : 10);
}
function makeSnare(seed, bright = 0) {
  const n = s(0.32);
  const out = new Float32Array(n);
  const nz = makeNoise(seed);
  const hp = new Biquad('highpass', 1400 + bright * 800, 0.7), lp = new Biquad('lowpass', 9000, 0.7);
  let ph1 = 0, ph2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph1 += (175 + 40 * Math.exp(-t / 0.02)) / SR;
    ph2 += 330 / SR;
    const body = (Math.sin(2 * Math.PI * ph1) * Math.exp(-t / 0.07) + 0.4 * Math.sin(2 * Math.PI * ph2) * Math.exp(-t / 0.045));
    const noise = lp.run(hp.run(nz())) * Math.exp(-t / 0.12);
    out[i] = body * 0.55 + noise * 1.1;
  }
  return fadeTail(out, 30);
}
function makeCrash(seed, len = 2.6, tau = 1.0) {
  const n = s(len);
  const out = stereo(n);
  const nzL = makeNoise(seed), nzR = makeNoise(seed + 5);
  const oscs = HAT_FREQS.map((_, i) => new Pulse(i / 7));
  const fl = [new Biquad('highpass', 3800, 0.7), new Biquad('lowpass', 12000, 0.7)];
  const fr = [new Biquad('highpass', 3800, 0.7), new Biquad('lowpass', 12000, 0.7)];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let m = 0;
    for (let k = 0; k < oscs.length; k++) m += oscs[k].next(HAT_FREQS[k] * 3.1);
    const env = Math.exp(-t / tau) * Math.min(1, t / 0.001);
    out[0][i] = fl[1].run(fl[0].run(0.75 * nzL() + 0.25 * m / 6)) * env;
    out[1][i] = fr[1].run(fr[0].run(0.75 * nzR() + 0.25 * m / 6)) * env;
  }
  return fadeTail(out, 200);
}
function makeTick() {
  const n = s(0.05);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = (Math.sin(2 * Math.PI * 3136 * t) + 0.35 * Math.sin(2 * Math.PI * 4699 * t)) * Math.exp(-t / 0.006);
  }
  return fadeTail(out, 5);
}

const KICK = makeKick();
const KICK_HEART = makeKick({ f0: 115, f1: 42, pitchTau: 0.04, ampTau: 0.22, len: 0.7, click: 0.25, drive: 1.3, seed: 12 });
const CLAPS = [makeClap(100), makeClap(200), makeClap(300)];
const HAT_C = [makeHat(false, 21), makeHat(false, 22), makeHat(false, 23), makeHat(false, 24)];
const HAT_O = [makeHat(true, 31), makeHat(true, 32)];
const SNARES = [makeSnare(41), makeSnare(42), makeSnare(43)];
const CRASH = makeCrash(51);
const TICK = makeTick();
/** Music-side impact (finale 56.0): short sub boom + noise burst with a reverb tail (via the crash bus send).
 *  Deliberately lighter than the SFX impact_huge that lands on the same sample. */
function makeImpact() {
  const n = s(0.7);
  const boom = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (42 + 60 * Math.exp(-t / 0.04)) / SR;
    boom[i] = softClip(Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.22), 1.5);
  }
  const burst = stereo(s(0.5));
  const nl = makeNoise(71), nr = makeNoise(72), ll = new Biquad('lowpass', 6000), lr = new Biquad('lowpass', 6000);
  const hl = new Biquad('highpass', 200), hr = new Biquad('highpass', 200);
  for (let i = 0; i < burst[0].length; i++) {
    const e = Math.exp(-i / SR / 0.06);
    burst[0][i] = hl.run(ll.run(nl())) * e;
    burst[1][i] = hr.run(lr.run(nr())) * e;
  }
  return { boom: fadeTail(boom, 60), burst: fadeTail(burst, 40) };
}
const IMPACT = makeImpact();

let hatIdx = 0, clapIdx = 0, snIdx = 0;
const kick = (t, vel = 1, heart = false) => { place(BUS.kick, heart ? KICK_HEART : KICK, t, vel); KICK_TIMES.push(t); };
const clap = (t, vel = 1) => place(BUS.clap, CLAPS[clapIdx++ % CLAPS.length], t, vel * 0.5);
const hat = (t, vel = 1, open = false) => {
  const i = hatIdx++;
  place(BUS.hat, open ? HAT_O[i % HAT_O.length] : HAT_C[i % HAT_C.length], t, vel * (open ? 0.1 : 0.13), i % 2 ? 0.18 : -0.18);
};
const crash = (t, vel = 1) => place(BUS.crash, CRASH, t, vel * 0.2);
const snare = (t, vel = 1) => place(BUS.roll, SNARES[snIdx++ % SNARES.length], t, vel * 0.42, (snIdx % 2 ? 0.08 : -0.08));
const tick = (t, vel = 1) => place(BUS.tick, TICK, t, vel * 0.09);

// ------------------------------------------------------------------ tonal voices
const rngPhase = mulberry32(777);
function envAR(t, dur, a, rel) {
  const on = t < a ? t / a : 1;
  return t < dur ? on : Math.min(1, dur / a) * Math.exp(-(t - dur) / rel);
}
function voiceLoop(t0, lenS, fn) {
  const n0 = s(t0);
  const k = killAt(n0);
  if (k <= n0) return;
  const n = s(lenS);
  for (let i = 0; i < n; i++) {
    const nn = n0 + i;
    if (nn >= TOTAL || nn >= k) break;
    fn(i, i / SR, nn, killGain(nn, k));
  }
}
function bassNote(t0, dur, midi, vel, cutFn, { envAmt = 1700, q = 1.15, drive = 1.7, gain = 0.3 } = {}) {
  const f = mtof(midi);
  const o1 = new Saw(rngPhase()), o2 = new Saw(rngPhase());
  const flt = new SVF();
  const rel = 0.03;
  voiceLoop(t0, dur + rel * 6, (i, t, n, kg) => {
    const x = (o1.next(f * 0.99654) + o2.next(f * 1.00347)) * 0.5;
    const fc = cutFn(n / SR) + envAmt * Math.exp(-t / 0.085);
    const y = softClip(flt.run(x, fc, q) * 0.9, drive);
    BUS.bass[n] += y * envAR(t, dur, 0.003, rel) * vel * gain * kg;
  });
}
function swapBassNote(t0, dur, midi, vel) {
  const f = mtof(midi);
  const o1 = new Pulse(rngPhase()), o2 = new Saw(rngPhase());
  const flt = new SVF();
  const rel = 0.025;
  voiceLoop(t0, dur + rel * 6, (i, t, n, kg) => {
    const x = o1.next(f, 0.32) * 0.7 + o2.next(f * 2.0035) * 0.3;
    const tb = n / SR - 48;
    const wob = 0.5 - 0.5 * Math.cos(2 * Math.PI * 4 * tb);
    const fc = 320 + 2100 * wob + 900 * Math.exp(-t / 0.05);
    const y = softClip(flt.run(x, fc, 3.2) * 0.8, 2.2);
    BUS.bass[n] += y * envAR(t, dur, 0.003, rel) * vel * 0.3 * kg;
  });
}
function subNote(t0, dur, midi, vel, { attack = 0.006, rel = 0.05 } = {}) {
  const f = mtof(midi);
  let ph = 0;
  voiceLoop(t0, dur + rel * 6, (i, t, n, kg) => {
    ph += f / SR;
    BUS.sub[n] += Math.sin(2 * Math.PI * ph) * envAR(t, dur, attack, rel) * vel * 0.42 * kg;
  });
}
function padChord(t0, t1, notes, vel, { attack = 0.05, rel = 0.35, tail = false } = {}) {
  const dur = t1 - t0;
  const det = [[-0.095, 0.04], [0.095, -0.04]]; // semitones per side (±9.5 / ±4 cents)
  for (const m of notes) {
    const f = mtof(m);
    const oL = [new Saw(rngPhase()), new Saw(rngPhase())], oR = [new Saw(rngPhase()), new Saw(rngPhase())];
    const rL = det[0].map((c) => Math.pow(2, c / 12)), rR = det[1].map((c) => Math.pow(2, c / 12));
    const amp = 0.05 * vel;
    voiceLoop(t0, dur + rel * 6, (i, t, n, kg) => {
      const e = envAR(t, dur, attack, rel) * amp * kg;
      const l = (oL[0].next(f * rL[0]) + oL[1].next(f * rL[1])) * e;
      const r = (oR[0].next(f * rR[0]) + oR[1].next(f * rR[1])) * e;
      BUS.pad[0][n] += l; BUS.pad[1][n] += r;
      if (tail) { BUS.tailSend[0][n] += l; BUS.tailSend[1][n] += r; }
    });
  }
}
function leadNote(t0, dur, midi, vel, { cutBase = 2000, cutEnv = 4200, rel = 0.12, lfo = 0, tail = false } = {}) {
  const f = mtof(midi);
  const cents = [-14, -7, 0, 7, 14];
  const pans = [-0.7, -0.35, 0, 0.35, 0.7];
  const oscs = cents.map(() => new Saw(rngPhase()));
  const ratio = cents.map((c) => Math.pow(2, c / 1200));
  const fl = new SVF(), fr = new SVF();
  voiceLoop(t0, dur + rel * 6, (i, t, n, kg) => {
    let l = 0, r = 0;
    for (let k = 0; k < 5; k++) {
      const v = oscs[k].next(f * ratio[k]);
      l += v * Math.min(1, 1 - pans[k]); r += v * Math.min(1, 1 + pans[k]);
    }
    const lf = lfo ? 1 + lfo * Math.sin(2 * Math.PI * 0.25 * (n / SR)) : 1;
    const fc = (cutBase + cutEnv * Math.exp(-t / 0.22)) * lf;
    const a = t < 0.006 ? t / 0.006 : 0.75 + 0.25 * Math.exp(-(t - 0.006) / 0.25);
    const e = (t < dur ? a : (0.75 + 0.25 * Math.exp(-(dur - 0.006) / 0.25)) * Math.exp(-(t - dur) / rel)) * vel * 0.055 * kg;
    const yl = fl.run(l, fc, 0.85) * e, yr = fr.run(r, fc, 0.85) * e;
    BUS.lead[0][n] += yl; BUS.lead[1][n] += yr;
    if (tail) { BUS.tailSend[0][n] += yl; BUS.tailSend[1][n] += yr; }
  });
}
function pluckNote(t0, midi, vel, pan, { decay = 0.15, cut0 = 450, cutEnv = 5200, cutTau = 0.055, gain = 0.12 } = {}) {
  const f = mtof(midi);
  const o1 = new Saw(rngPhase()), o2 = new Pulse(rngPhase());
  const flt = new SVF();
  const gl = Math.min(1, 1 - pan), gr = Math.min(1, 1 + pan);
  voiceLoop(t0, decay * 6, (i, t, n, kg) => {
    const x = o1.next(f) * 0.65 + o2.next(f * 1.002, 0.3) * 0.35;
    const y = flt.run(x, cut0 + cutEnv * Math.exp(-t / cutTau), 1.4);
    const e = Math.min(1, t / 0.0015) * Math.exp(-t / decay) * vel * gain * kg;
    BUS.arp[0][n] += y * e * gl; BUS.arp[1][n] += y * e * gr;
  });
}
function riser(t0, dur, gain, seed) {
  const nzL = makeNoise(seed), nzR = makeNoise(seed + 1);
  const bl = new SVF(), br = new SVF(), tl = new SVF(), tr = new SVF();
  const saws = [new Saw(0.1), new Saw(0.4), new Saw(0.7), new Saw(0.9)];
  const det = [0.994, 1.006, 0.997, 1.003];
  const n = s(dur);
  voiceLoop(t0, dur, (i, t, nn, kg) => {
    const x = i / n;
    const fc = expInterp(260, 9000, x);
    const q = 1.1 + 2.5 * x;
    bl.run(nzL(), fc, q); br.run(nzR(), fc, q);
    const f = expInterp(220, 880, Math.pow(x, 1.15));
    const sl = (saws[0].next(f * det[0]) + saws[2].next(f * det[2])) * 0.5;
    const sr = (saws[1].next(f * det[1]) + saws[3].next(f * det[3])) * 0.5;
    const tc = Math.min(fc * 1.3, 12000);
    const amp = dbToGain(lerp(-30, 0, Math.pow(x, 0.9))) * Math.min(1, (n - i) / 144) * gain * kg;
    BUS.riser[0][nn] += (bl.bp * 1.0 + tl.run(sl, tc, 0.8) * 0.4) * amp;
    BUS.riser[1][nn] += (br.bp * 1.0 + tr.run(sr, tc, 0.8) * 0.4) * amp;
  });
}
function reverseCymbal(t0, dur, gain) {
  const c = makeCrash(61, dur, dur * 0.33);
  const n = c[0].length;
  const rev = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    const fi = Math.min(1, i / s(0.02));
    rev[0][i] = c[0][n - 1 - i] * fi; rev[1][i] = c[1][n - 1 - i] * fi;
  }
  place(BUS.riser, rev, t0, gain);
}
function snareRoll(t0, dur) {
  const hits = rollPattern(dur).map((h) => ({ t: +(t0 + h.t).toFixed(6), vel: h.vel }));
  for (const h of hits) snare(h.t, h.vel);
  return hits.map((h) => h.t);
}

// ------------------------------------------------------------------ automation curves
const bedCut = (t) => {
  if (t >= 20 && t < 28) return 800;
  if (t >= 42 && t < 44) return expInterp(16000, 450, (t - 42) / 1.95);
  return 20000;
};
const padCut = (t) => {
  if (t < 6) return expInterp(220, 3200, t / 5.9);
  if (t < 14) return 1600;
  if (t < 20) return 4500;
  if (t < 28) return 2400;
  if (t < 38) return 3800;
  if (t < 44) return 3000;
  if (t < 48) return 5000;
  if (t < 56) return 2600;
  if (t < 60) return 4200;
  return 3200;
};
const bassCut = (t) => {
  if (t < 14) return 700;
  if (t < 20) return expInterp(250, 3000, (t - 14) / 6);
  if (t < 38) return 1100;
  if (t < 44) return 900;
  if (t < 48) return 1500;
  return 1100;
};

// ------------------------------------------------------------------ arrangement
const pent = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
const HOOK = [
  [[0, 2, 69], [2, 2, 72], [4, 4, 76], [8, 2, 74], [10, 2, 72], [12, 4, 76]], // Am
  [[0, 3, 72], [3, 3, 69], [6, 2, 72], [8, 4, 77], [12, 4, 76]], // F
  [[0, 2, 67], [2, 2, 72], [4, 4, 76], [8, 2, 79], [10, 2, 76], [12, 4, 72]], // C
  [[0, 3, 74], [3, 3, 71], [6, 2, 74], [8, 4, 79], [12, 4, 74]], // G
  [[0, 4, 76], [4, 4, 72], [8, 8, 69]], // Am (resolve)
];
const HOOK_FINALE_2 = [[0, 2, 69], [2, 2, 72], [4, 4, 77], [8, 2, 74], [10, 2, 76], [12, 4, 79]]; // F→G
const playHookBar = (barT0, bar, vel = 1) => {
  for (const [st, ln, m] of bar) leadNote(barT0 + st * 0.125, ln * 0.125 * 0.92, m, vel);
};
const arp16 = (a, b) => {
  const pat = [0, 1, 2, 3, 2, 1];
  grid(a, b, 0.125).forEach((t, i) => {
    const ch = chordAt(t).pad;
    pluckNote(t, ch[pat[i % pat.length] % ch.length], i % 4 === 0 ? 0.85 : 0.6, i % 2 ? 0.35 : -0.35, { gain: 0.1, decay: 0.12 });
  });
};
const bassDrop2 = (a, b) => {
  for (const beat of grid(a, b, 0.5)) {
    const r = chordAt(beat).root;
    [[1, r, 0.85], [2, r + 12, 0.7], [3, r, 1]].forEach(([p, m, v]) => bassNote(beat + p * 0.125, 0.1, m, v, bassCut));
  }
};
const subBars = (id, vel, clipEnd = Infinity, opts = {}) => {
  for (const g of segsOf(id)) {
    const t1 = Math.min(g.t1, clipEnd);
    if (t1 > g.t0) subNote(g.t0, t1 - g.t0, g.chord.root - 12, vel, opts);
  }
};
const padBars = (id, vel, opts = {}, clipEnd = Infinity) => {
  for (const g of segsOf(id)) {
    const t1 = Math.min(g.t1, clipEnd);
    if (t1 > g.t0) padChord(g.t0, t1, g.chord.pad, vel, typeof opts === 'function' ? opts(g) : opts);
  }
};
const risers = cuesOf('riser');
const rolls = cuesOf('snare_roll');
const revs = cuesOf('reverse_cymbal');
const inSec = (t, id) => t >= sec(id).start && t < sec(id).end;

// intro — no drums: sub swell, filtered pad (LP rising), sparse ticks, riser, reverse cymbal
{
  const S = sec('intro');
  padBars('intro', 0.8, (g) => ({ attack: g.t0 === S.start ? 1.6 : 0.5, rel: 0.6 }));
  segsOf('intro').forEach((g) => subNote(g.t0, g.t1 - g.t0, g.chord.root - 12, 0.55, { attack: g.t0 === S.start ? 2.0 : 0.6, rel: 0.3 }));
  [0.25, 1.25, 2.25, 2.75, 3.25, 3.75, 4.25, 4.5, 4.75, 5.0, 5.25, 5.5, 5.625, 5.75, 5.875].forEach((t, i) => tick(t, 0.5 + 0.5 * i / 14));
}
// drop1 — four-on-the-floor, 1/8 + 1/16 hats, pumping bass, no lead
{
  const S = sec('drop1');
  crash(S.start, 1);
  grid(S.start, S.end, 0.5).forEach((t) => kick(t));
  grid(S.start + 0.25, S.end, 0.5).forEach((t) => hat(t, 0.8));
  grid(S.start + 0.125, S.end, 0.25).forEach((t) => hat(t, 0.32));
  grid(S.start, S.end, 0.25).forEach((t) => {
    const r = chordAt(t).root;
    const lastEighth = (t - S.start) % 2 >= 1.75 - 1e-9;
    bassNote(t, 0.2, lastEighth ? r + 12 : r, (t * 4) % 2 < 1e-9 ? 0.75 : 1, bassCut);
  });
  subBars('drop1', 0.6);
  padBars('drop1', 0.45, { attack: 0.03, rel: 0.3 });
}
// groove_lift — kick + hats, bass LP opening across the 3 bars, open pad, short plucks
{
  const S = sec('groove_lift');
  grid(S.start, S.end, 0.5).forEach((t) => kick(t));
  grid(S.start + 0.25, S.end, 0.5).forEach((t) => hat(t, 0.8));
  grid(S.start + 0.125, S.end, 0.25).forEach((t) => hat(t, 0.3));
  grid(S.start + 1.75, S.end, 2).forEach((t) => hat(t, 0.5, true));
  grid(S.start, S.end, 0.25).forEach((t) => {
    const r = chordAt(t).root;
    bassNote(t, 0.2, (t - S.start) % 2 >= 1.75 - 1e-9 ? r + 12 : r, (t * 4) % 2 < 1e-9 ? 0.75 : 1, bassCut);
  });
  subBars('groove_lift', 0.6);
  padBars('groove_lift', 0.7, { attack: 0.08, rel: 0.35 });
  const pat = [0, 2, 1, 3, 0, 2, 3, 2];
  grid(S.start, S.end, 0.25).forEach((t, i) => {
    const ch = chordAt(t).pad;
    pluckNote(t, ch[pat[i % 8] % ch.length] + 12, i % 2 ? 0.6 : 0.85, i % 2 ? 0.3 : -0.3, { decay: 0.1, gain: 0.11 });
  });
}
// breakdown — heartbeat kick on beats 1 & 3, 800 Hz LP bed, tense pad, riser 24→28, snare roll 26.0–27.5
{
  const S = sec('breakdown');
  grid(S.start, S.end, 1.0).forEach((t) => kick(t, 0.9, true));
  subBars('breakdown', 0.35, Infinity, { attack: 0.3, rel: 0.4 });
  padBars('breakdown', 0.6, { attack: 0.35, rel: 0.5 });
}
// drop2 — PEAK: kick, clap 2&4, hats, main bass, supersaw lead, arp
{
  const S = sec('drop2');
  crash(S.start, 1);
  grid(S.start, S.end, 0.5).forEach((t) => kick(t));
  grid(S.start + 0.5, S.end, 1.0).forEach((t) => clap(t));
  grid(S.start, S.end, 0.125).forEach((t, i) => {
    const p = i % 4;
    if (p === 2) hat(t, 0.55, true);
    else hat(t, p === 0 ? 0.4 : 0.3);
  });
  bassDrop2(S.start, S.end);
  subBars('drop2', 0.6);
  padBars('drop2', 0.55, { attack: 0.02, rel: 0.3 });
  HOOK.forEach((bar, b) => playHookBar(S.start + b * 2, bar));
  arp16(S.start, S.end);
}
// groove_rise — kick, hats, offbeat bass, sustained lead (no melody); bed LP sweeps down 42→44
{
  const S = sec('groove_rise');
  const stop = S.end - 0.5;
  grid(S.start, stop, 0.5).forEach((t) => kick(t));
  grid(S.start + 0.25, stop, 0.5).forEach((t) => hat(t, 0.8));
  grid(S.start + 0.125, stop, 0.25).forEach((t) => hat(t, 0.3));
  grid(S.start + 0.25, stop, 0.5).forEach((t) => bassNote(t, 0.2, chordAt(t).root, 1, bassCut));
  subBars('groove_rise', 0.55, stop);
  padBars('groove_rise', 0.5, { attack: 0.05, rel: 0.3 });
  leadNote(S.start, S.end - S.start - 0.1, 76, 0.6, { cutBase: 1500, cutEnv: 1500, lfo: 0.35, rel: 0.1 });
}
// microdrop — filter opens at 44.0, half-time (kick 1 & 3, clap on 3), pad
{
  const S = sec('microdrop');
  crash(S.start, 0.45);
  grid(S.start, S.end, 1.0).forEach((t) => kick(t));
  grid(S.start + 1.0, S.end, 2.0).forEach((t) => clap(t, 0.9));
  grid(S.start + 0.25, S.end - 0.5, 0.5).forEach((t) => hat(t, 0.35, true));
  grid(S.start, S.end, 1.0).forEach((t) => {
    const last = t >= S.end - 1 - 1e-9;
    bassNote(t, last ? 0.4 : 0.9, chordAt(t).root, 1, bassCut, { envAmt: 2200 });
  });
  subBars('microdrop', 0.6, S.end - 0.5);
  padBars('microdrop', 0.85, (g) => ({ attack: g.t0 === S.start ? 0.01 : 0.1, rel: 0.35 }));
}
// swap — bass swap at 48.0 (pulse+wobble, offbeat rolling pattern), pentatonic plucks, riser 54→56, roll 55.0–55.9
{
  const S = sec('swap');
  const buildStart = (rolls.find((c) => inSec(c.t, 'swap')) || { t: S.end - 1 }).t;
  crash(S.start, 0.7);
  grid(S.start, buildStart, 0.5).forEach((t) => kick(t));
  grid(S.start + 0.5, S.end - 2, 1.0).forEach((t) => clap(t, 0.75));
  grid(S.start, buildStart, 0.125).forEach((t, i) => hat(t, i % 4 === 2 ? 0.7 : 0.28));
  grid(S.start, buildStart, 0.5).forEach((beat) => {
    const r = chordAt(beat).root;
    swapBassNote(beat + 0.25, 0.18, r, 1);
    swapBassNote(beat + 0.375, 0.1, r + 12, 0.8);
  });
  subBars('swap', 0.55, buildStart);
  padBars('swap', 0.34, { attack: 0.03, rel: 0.3 });
  const pos = [0, 3, 6, 8, 11, 14];
  const polyTimes = cuesOf('pluck_note').map((c) => c.t);
  const polySpan = polyTimes.length ? [Math.min(...polyTimes), Math.max(...polyTimes) + 0.5] : [0, 0];
  grid(S.start, buildStart, 2).forEach((barT, b) => {
    pos.forEach((p, k) => {
      const t = barT + p * 0.125;
      // while the polygon sonification (pluck_note SFX cues) plays, the music plucks step back 9 dB
      const g = t >= polySpan[0] && t < polySpan[1] ? 0.08 * dbToGain(-9) : 0.08;
      pluckNote(t, pent[(b * 2 + k) % 6 + 5], k === 0 ? 0.9 : 0.65, k % 2 ? 0.4 : -0.4, { decay: 0.13, gain: g });
    });
  });
}
// finale — impact at 56.0, kick + clap + bass + lead, final Am(add9) held from 60.0 into the tail
{
  const S = sec('finale');
  const hold = S.end - 2; // 60.0
  crash(S.start, 1);
  place(BUS.kick, IMPACT.boom, S.start, 0.55);
  place(BUS.crash, IMPACT.burst, S.start, 0.35);
  grid(S.start, hold, 0.5).forEach((t) => kick(t));
  kick(hold, 1);
  crash(hold, 0.8);
  grid(S.start + 0.5, hold, 1.0).forEach((t) => clap(t));
  grid(S.start, hold, 0.125).forEach((t, i) => {
    const p = i % 4;
    if (p === 2) hat(t, 0.55, true);
    else hat(t, p === 0 ? 0.4 : 0.3);
  });
  bassDrop2(S.start, hold);
  segsOf('finale').filter((g) => g.t0 < hold).forEach((g) => subNote(g.t0, g.t1 - g.t0, g.chord.root - 12, 0.6));
  segsOf('finale').filter((g) => g.t0 < hold).forEach((g) => padChord(g.t0, g.t1, g.chord.pad, 0.6, { attack: 0.02, rel: 0.3 }));
  playHookBar(S.start, HOOK[0]);
  playHookBar(S.start + 2, HOOK_FINALE_2);
  arp16(S.start, hold);
  // final chord: sustained 60→62, released into the tail reverb (natural decay to 64.0)
  const release = sec('tail').start; // 62.0
  padChord(hold, release, CH.AmAdd9.pad, 1.0, { attack: 0.01, rel: 0.45, tail: true });
  subNote(hold, release - hold, 33, 0.6, { attack: 0.01, rel: 0.35 });
  bassNote(hold, 0.9, 45, 0.9, () => 500, { envAmt: 1200 });
  leadNote(hold, release - hold, 69, 0.7, { cutBase: 1800, cutEnv: 2500, rel: 0.4, tail: true });
  leadNote(hold, release - hold, 76, 0.55, { cutBase: 1800, cutEnv: 2500, rel: 0.4, tail: true });
}
// builds anchored to cues.json (single source of truth for their timing)
risers.forEach((c, i) => riser(c.t, c.dur, 0.33, 900 + i * 10));
revs.forEach((c) => reverseCymbal(c.t, c.dur, 0.28));
const rollHits = rolls.map((c) => ({ id: c.id, t: c.t, dur: c.dur, hits: snareRoll(c.t, c.dur) }));

// ------------------------------------------------------------------ processing
console.log(`[synth] events rendered in ${((Date.now() - t0Run) / 1000).toFixed(1)} s`);
const RESETS = GAPS.map((g) => g.s1);
function hpInPlace(buf, f) {
  const bq = new Biquad('highpass', f, 0.7071);
  for (let i = 0; i < buf.length; i++) buf[i] = bq.run(buf[i]);
}
[BUS.kick, BUS.bass, BUS.sub].forEach((b) => hpInPlace(b, 25));

// sidechain pump from kick triggers (lookahead 2 ms, hold 15 ms, smooth 200 ms recovery)
const pumpD = new Float32Array(TOTAL);
for (const t of KICK_TIMES) {
  const n0 = s(t), pre = s(0.002), hold = s(0.015), rel = s(0.2);
  for (let i = -pre; i < hold + rel; i++) {
    const n = n0 + i;
    if (n < 0 || n >= TOTAL) continue;
    const v = i < 0 ? (i + pre) / pre : i < hold ? 1 : 1 - smoothstep((i - hold) / rel);
    if (v > pumpD[n]) pumpD[n] = v;
  }
}
const pump = (buf, depth) => {
  for (const c of Array.isArray(buf) ? buf : [buf]) for (let n = 0; n < TOTAL; n++) c[n] *= 1 - depth * pumpD[n];
};
pump(BUS.bass, 0.8);
pump(BUS.sub, 0.9);
pump(BUS.pad, 0.5);
pump(BUS.lead, 0.3);
pump(BUS.arp, 0.4);

// pad LP automation, then shared "bed" LP (breakdown 800 Hz, 42→44 sweep down, open at 44.0)
function autoLP(buf, fcFn, q = 0.7071) {
  for (const c of Array.isArray(buf) ? buf : [buf]) {
    const f = new SVF();
    let fc = fcFn(0);
    for (let n = 0; n < TOTAL; n++) {
      if ((n & 31) === 0) fc = fcFn(n / SR);
      c[n] = f.run(c[n], fc, q);
    }
  }
}
autoLP(BUS.pad, padCut, 0.8);
[BUS.kick, BUS.bass, BUS.sub, BUS.pad, BUS.lead, BUS.arp].forEach((b) => autoLP(b, bedCut, 0.75));

// per-bus mix levels (applied in place, before the effect sends)
const LVL = {
  kick: 1.0, bass: 1.12, sub: 0.75, pad: 1.8, lead: 2.4, arp: 3.0, clap: 2.2, hat: 5.0, crash: 1.5, roll: 1.3, tick: 1.5, riser: 1.0,
  verb: 0.28, dly: 0.35, riserVerb: 0.28, tailVerb: 0.12,
};
for (const [k, g] of Object.entries(LVL)) {
  if (!BUS[k]) continue;
  for (const c of Array.isArray(BUS[k]) ? BUS[k] : [BUS[k]]) for (let n = 0; n < TOTAL; n++) c[n] *= g;
}
for (const c of BUS.tailSend) for (let n = 0; n < TOTAL; n++) c[n] *= LVL.pad;

// sends
const verbIn = stereo(TOTAL), dlyIn = stereo(TOTAL);
const addSend = (dst, src, g) => {
  const st = Array.isArray(src);
  for (let n = 0; n < TOTAL; n++) {
    dst[0][n] += (st ? src[0][n] : src[n]) * g;
    dst[1][n] += (st ? src[1][n] : src[n]) * g;
  }
};
addSend(verbIn, BUS.clap, 0.3);
addSend(verbIn, BUS.roll, 0.35);
addSend(verbIn, BUS.pad, 0.3);
addSend(verbIn, BUS.lead, 0.22);
addSend(verbIn, BUS.arp, 0.3);
addSend(verbIn, BUS.tick, 0.5);
addSend(verbIn, BUS.crash, 0.15);
addSend(verbIn, BUS.hat, 0.05);
addSend(dlyIn, BUS.lead, 0.22);
addSend(dlyIn, BUS.arp, 0.12);
addSend(dlyIn, BUS.tick, 0.45);
const verb = freeverb(verbIn[0], verbIn[1], { room: 0.8, damp: 0.35, width: 1, predelayMs: 12, resets: RESETS });
const dly = pingPong(dlyIn[0], dlyIn[1], { delayS: 0.375, feedback: 0.35, lpHz: 4500, hpHz: 300, resets: RESETS });
const riserVerb = freeverb(BUS.riser[0], BUS.riser[1], { room: 0.72, damp: 0.25, width: 1, predelayMs: 8, resets: [GAPS[0].s1] });
const tailVerb = freeverb(BUS.tailSend[0], BUS.tailSend[1], { room: 0.86, damp: 0.3, width: 1, predelayMs: 20 });

// gates: all music muted in every gap; riser reverb tail allowed through the stop-time gap only
const gate = (n, exceptStop) => {
  for (let g = 0; g < GAPS.length; g++) {
    const G = GAPS[g];
    if (exceptStop && g > 0) continue;
    if (n >= G.s0 && n < G.s1) return 0;
    if (n >= G.s0 - RAMP && n < G.s0) return (G.s0 - n) / RAMP;
  }
  return 1;
};
const busRms = (buf, a, b) => {
  const chans = Array.isArray(buf) ? buf : [buf];
  let e = 0;
  for (const c of chans) for (let n = s(a); n < s(b); n++) e += c[n] * c[n];
  return +(10 * Math.log10(e / chans.length / (s(b) - s(a)) + 1e-20)).toFixed(1);
};
const BUS_REPORT = {};
for (const sc of SECTIONS) {
  BUS_REPORT[sc.id] = {};
  for (const [k, b] of Object.entries({ ...BUS, verb, dly, riserVerb, tailVerb })) {
    const g = ['verb', 'dly', 'riserVerb', 'tailVerb'].includes(k) ? LVL[k] : 1;
    const v = busRms(b, sc.start, sc.end) + 20 * Math.log10(g);
    if (v > -70) BUS_REPORT[sc.id][k] = +v.toFixed(1);
  }
}
if (process.env.SYNTH_DEBUG) console.log(JSON.stringify(BUS_REPORT, null, 0).replace(/},/g, '},\n'));
const music = stereo(TOTAL);
for (let n = 0; n < TOTAL; n++) {
  const gm = gate(n, false), gr = gate(n, true);
  const m = BUS.kick[n] + BUS.bass[n] + BUS.sub[n] + BUS.tick[n];
  for (let c = 0; c < 2; c++) {
    const v = m + BUS.pad[c][n] + BUS.lead[c][n] + BUS.arp[c][n] + BUS.clap[c][n] + BUS.hat[c][n] + BUS.crash[c][n] + BUS.roll[c][n]
      + BUS.riser[c][n] + verb[c][n] * LVL.verb + dly[c][n] * LVL.dly + tailVerb[c][n] * LVL.tailVerb;
    music[c][n] = v * gm + riserVerb[c][n] * LVL.riserVerb * gr;
  }
}
// section gain automation (dB): makes drop2 the clear energy peak; 20 ms linear ramps at the boundaries
const SECTION_GAIN_DB = { intro: 0, drop1: -1.0, groove_lift: -0.6, breakdown: 0, drop2: 1.2, groove_rise: -0.4, microdrop: 0, swap: -2.0, finale: 0.3, tail: 0.3 };
{
  const rampN = s(0.02);
  const gAt = (t) => dbToGain(SECTION_GAIN_DB[(SECTIONS.find((x) => t >= x.start && t < x.end) || SECTIONS[SECTIONS.length - 1]).id] ?? 0);
  for (const sc of SECTIONS) {
    const a = s(sc.start), b = s(sc.end);
    const g = gAt(sc.start), gPrev = sc.start > 0 ? gAt(sc.start - 1e-6) : g;
    for (let n = a; n < Math.min(b, TOTAL); n++) {
      const k = n - a < rampN ? gPrev + (g - gPrev) * (n - a) / rampN : g;
      music[0][n] *= k; music[1][n] *= k;
    }
  }
}
// micro-fade (40 ms raised cosine) on the very last instant only; the tail decays naturally before it
const mf = s(0.04);
for (let i = 0; i < mf; i++) {
  const g = 0.5 - 0.5 * Math.cos(Math.PI * i / mf);
  music[0][TOTAL - 1 - i] *= g; music[1][TOTAL - 1 - i] *= g;
}
const rawPeak = peakOf(music);
const norm = dbToGain(-1) / rawPeak;
for (const c of music) for (let n = 0; n < TOTAL; n++) c[n] *= norm;
const w = writeWav(PATHS.music, music, { bits: 24 });
console.log(`[synth] wrote ${path.relative(process.cwd(), PATHS.music)} frames=${w.frames} clipped=${w.clipped} rawPeak=${gainToDb(rawPeak).toFixed(2)} dBFS -> -1.00 dBFS`);

// ------------------------------------------------------------------ report
const L = measureLoudness(music, { withTruePeak: false });
const cs = kEnergyCumsum(music);
const band = (lo, hi) => {
  const lp = hi ? new Biquad('lowpass', hi, 0.7071) : null, lp2 = hi ? new Biquad('lowpass', hi, 0.7071) : null;
  const hp = lo ? new Biquad('highpass', lo, 0.7071) : null, hp2 = lo ? new Biquad('highpass', lo, 0.7071) : null;
  const cum = new Float64Array(TOTAL + 1);
  for (let n = 0; n < TOTAL; n++) {
    let x = 0.5 * (music[0][n] + music[1][n]);
    if (hp) x = hp2.run(hp.run(x));
    if (lp) x = lp2.run(lp.run(x));
    cum[n + 1] = cum[n] + x * x;
  }
  return (a, b) => 10 * Math.log10((cum[s(b)] - cum[s(a)]) / (s(b) - s(a)) + 1e-20);
};
const low = band(0, 150), mid = band(150, 2500), high = band(2500, 0);
const sections = SECTIONS.map((sc) => ({
  id: sc.id, start: sc.start, end: sc.end, intensity: sc.intensity,
  lufs: +rangeLoudness(cs, sc.start, Math.min(sc.end, 63.9)).toFixed(2),
  low_db: +low(sc.start, sc.end).toFixed(1), mid_db: +mid(sc.start, sc.end).toFixed(1), high_db: +high(sc.start, sc.end).toFixed(1),
}));
const report = {
  file: 'public/audio/music.wav', frames: TOTAL, sample_rate: SR, bpm: 120, key: 'A minor',
  progression: PROGRESSION, integrated_lufs: +L.integrated.toFixed(2), lra: +L.lra.toFixed(2),
  normalization_gain_db: +gainToDb(norm).toFixed(2), sections, snare_rolls: rollHits,
  risers: risers.map((c) => ({ t: c.t, dur: c.dur, dry_cut_at: Math.min(c.t + c.dur, killAt(s(c.t)) / SR) })),
  gaps: GAPS,
};
fs.mkdirSync(PATHS.analysis, { recursive: true });
fs.writeFileSync(path.join(PATHS.analysis, 'music-sections.json'), JSON.stringify(report, null, 2));
console.table(sections);
console.log(`[synth] integrated ${L.integrated.toFixed(2)} LUFS, LRA ${L.lra.toFixed(2)} LU, done in ${((Date.now() - t0Run) / 1000).toFixed(1)} s`);
