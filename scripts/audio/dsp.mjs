/**
 * Shared DSP toolkit for the GoTicket showcase audio pipeline (pure Node, zero deps).
 *
 * Not run directly. Imported by synth.mjs / sfx.mjs / mix.mjs / analyze.mjs.
 * Pipeline (run from `video/`, no package.json needed):
 *   node scripts/audio/synth.mjs && node scripts/audio/sfx.mjs && node scripts/audio/mix.mjs && node scripts/audio/analyze.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PATHS = {
  cues: path.join(VIDEO_DIR, 'src', 'data', 'cues.json'),
  publicAudio: path.join(VIDEO_DIR, 'public', 'audio'),
  music: path.join(VIDEO_DIR, 'public', 'audio', 'music.wav'),
  master: path.join(VIDEO_DIR, 'public', 'audio', 'master.wav'),
  sfxDir: path.join(VIDEO_DIR, 'public', 'audio', 'sfx'),
  stemsDir: path.join(VIDEO_DIR, 'public', 'audio', 'stems'),
  audioDocs: path.join(VIDEO_DIR, 'audio'),
  analysis: path.join(VIDEO_DIR, 'audio', 'analysis'),
  sources: path.join(VIDEO_DIR, 'audio', 'sources'),
};

export const SR = 48000;
// Video length comes from the cut (src/pacing.ts → scripts/audio/cues.mjs → src/data/cues.json).
export const TOTAL_SECONDS = JSON.parse(fs.readFileSync(PATHS.cues, 'utf8')).total_seconds;
export const TOTAL = Math.round(SR * TOTAL_SECONDS);
export const SAMPLES_PER_FRAME = 800;
export const BPM = 120;
export const BEAT_S = 60 / BPM; // 0.5 s
export const BAR_S = BEAT_S * 4; // 2.0 s

export const s = (t) => Math.round(t * SR);
export const dbToGain = (db) => Math.pow(10, db / 20);
export const gainToDb = (g) => 20 * Math.log10(Math.max(Math.abs(g), 1e-12));
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, x) => a + (b - a) * x;
export const smoothstep = (x) => {
  const c = clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
};
export const expInterp = (a, b, x) => a * Math.pow(b / a, clamp(x, 0, 1));
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteName = (m) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

export function loadCues() {
  return JSON.parse(fs.readFileSync(PATHS.cues, 'utf8'));
}

// ---------------------------------------------------------------- PRNG
/** mulberry32: deterministic 32-bit PRNG. Math.random is never used in this pipeline. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
export function makeNoise(seed) {
  const r = mulberry32(seed);
  return () => 2 * r() - 1;
}

// ---------------------------------------------------------------- buffers
export const stereo = (n) => [new Float32Array(n), new Float32Array(n)];
export function peakOf(chans) {
  let p = 0;
  for (const c of chans) for (let i = 0; i < c.length; i++) {
    const v = Math.abs(c[i]);
    if (v > p) p = v;
  }
  return p;
}
export function scale(chans, g) {
  for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= g;
  return chans;
}
export function normalizePeak(chans, targetDb) {
  const p = peakOf(chans);
  if (p > 0) scale(chans, dbToGain(targetDb) / p);
  return chans;
}
/** Adds `src` (mono Float32Array or [L,R]) into stereo `dst` at sample offset with gain and linear-balance pan. */
export function mixInto(dst, src, offset, gain = 1, pan = 0, endSample = Infinity) {
  const gl = gain * Math.min(1, 1 - pan);
  const gr = gain * Math.min(1, 1 + pan);
  const isStereo = Array.isArray(src);
  const len = isStereo ? src[0].length : src.length;
  const n = dst[0].length;
  const stop = Math.min(len, n - offset, endSample - offset);
  for (let i = Math.max(0, -offset); i < stop; i++) {
    const j = offset + i;
    if (isStereo) {
      dst[0][j] += src[0][i] * gl;
      dst[1][j] += src[1][i] * gr;
    } else {
      dst[0][j] += src[i] * gl;
      dst[1][j] += src[i] * gr;
    }
  }
}

// ---------------------------------------------------------------- oscillators
export function polyBlep(t, dt) {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}
/** Band-limited (PolyBLEP) sawtooth. */
export class Saw {
  constructor(phase = 0) { this.ph = phase; }
  next(freq) {
    const dt = freq / SR;
    const v = 2 * this.ph - 1 - polyBlep(this.ph, dt);
    this.ph += dt;
    if (this.ph >= 1) this.ph -= 1;
    return v;
  }
}
/** Band-limited (PolyBLEP) pulse/square. */
export class Pulse {
  constructor(phase = 0) { this.ph = phase; }
  next(freq, pw = 0.5) {
    const dt = freq / SR;
    let v = this.ph < pw ? 1 : -1;
    v += polyBlep(this.ph, dt);
    let t2 = this.ph + 1 - pw;
    if (t2 >= 1) t2 -= 1;
    v -= polyBlep(t2, dt);
    this.ph += dt;
    if (this.ph >= 1) this.ph -= 1;
    return v;
  }
}
export class Sine {
  constructor(phase = 0) { this.ph = phase; }
  next(freq) {
    const v = Math.sin(2 * Math.PI * this.ph);
    this.ph += freq / SR;
    if (this.ph >= 1) this.ph -= 1;
    return v;
  }
}

// ---------------------------------------------------------------- filters
/** Topology-preserving-transform state-variable filter (Zavalishin / Cytomic). Stable under fast modulation. */
export class SVF {
  constructor() { this.ic1 = 0; this.ic2 = 0; this.lp = 0; this.bp = 0; this.hp = 0; }
  reset() { this.ic1 = 0; this.ic2 = 0; }
  run(x, fc, q) {
    const g = Math.tan(Math.PI * clamp(fc, 5, SR * 0.46) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.ic2;
    const v1 = a1 * this.ic1 + a2 * v3;
    const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2;
    this.bp = v1;
    this.hp = x - k * v1 - v2;
    return v2;
  }
}
/** RBJ cookbook biquad, transposed direct form II. */
export class Biquad {
  constructor(type, f, q = Math.SQRT1_2, gainDb = 0) {
    this.z1 = 0; this.z2 = 0;
    this.set(type, f, q, gainDb);
  }
  set(type, f, q = Math.SQRT1_2, gainDb = 0) {
    const w0 = 2 * Math.PI * clamp(f, 1, SR * 0.49) / SR;
    const cw = Math.cos(w0), sw = Math.sin(w0);
    const alpha = sw / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case 'lowpass': b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
      case 'highpass': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
      case 'bandpass': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
      case 'peak': b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
      case 'lowshelf': {
        const sa = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) - (A - 1) * cw + sa); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - sa);
        a0 = (A + 1) + (A - 1) * cw + sa; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - sa; break;
      }
      case 'highshelf': {
        const sa = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) + (A - 1) * cw + sa); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - sa);
        a0 = (A + 1) - (A - 1) * cw + sa; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - sa; break;
      }
      default: throw new Error(`unknown biquad type ${type}`);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  run(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}
export function biquadInPlace(buf, type, f, q, gainDb) {
  const bq = new Biquad(type, f, q, gainDb);
  for (let i = 0; i < buf.length; i++) buf[i] = bq.run(buf[i]);
  return buf;
}
export function biquadStereo(chans, type, f, q, gainDb) {
  for (const c of chans) biquadInPlace(c, type, f, q, gainDb);
  return chans;
}

// ---------------------------------------------------------------- effects
/**
 * Freeverb (Jezar) — 8 parallel lowpass-feedback combs + 4 series allpasses per channel.
 * Returns wet-only [L, R]. `resets` = sample indices where all internal state is zeroed
 * (used so reverb tails never leak across a hard silence gap).
 */
export function freeverb(inL, inR, { room = 0.84, damp = 0.3, width = 1, predelayMs = 0, resets = [] } = {}) {
  const k = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * k));
  const apT = [556, 441, 341, 225].map((x) => Math.round(x * k));
  const spread = Math.round(23 * k);
  const fb = room * 0.28 + 0.7;
  const d = damp * 0.4;
  const mk = (len) => ({ buf: new Float32Array(len), i: 0, st: 0 });
  const combsL = combT.map((t) => mk(t)), combsR = combT.map((t) => mk(t + spread));
  const apsL = apT.map((t) => mk(t)), apsR = apT.map((t) => mk(t + spread));
  const n = inL.length;
  const pd = Math.round(predelayMs * SR / 1000);
  const pdBuf = new Float32Array(Math.max(1, pd));
  let pdi = 0;
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const rs = [...resets].sort((a, b) => a - b);
  let ri = 0;
  const clear = () => {
    for (const c of [...combsL, ...combsR, ...apsL, ...apsR]) { c.buf.fill(0); c.st = 0; }
    pdBuf.fill(0);
  };
  const wet1 = 3 * (width / 2 + 0.5), wet2 = 3 * ((1 - width) / 2);
  for (let i = 0; i < n; i++) {
    while (ri < rs.length && rs[ri] <= i) { if (rs[ri] === i) clear(); ri++; }
    let x = (inL[i] + inR[i]) * 0.015;
    if (pd > 0) { const y = pdBuf[pdi]; pdBuf[pdi] = x; pdi = (pdi + 1) % pd; x = y; }
    let oL = 0, oR = 0;
    for (let c = 0; c < 8; c++) {
      const cl = combsL[c];
      const yl = cl.buf[cl.i];
      cl.st = yl * (1 - d) + cl.st * d;
      cl.buf[cl.i] = x + cl.st * fb;
      if (++cl.i >= cl.buf.length) cl.i = 0;
      oL += yl;
      const cr = combsR[c];
      const yr = cr.buf[cr.i];
      cr.st = yr * (1 - d) + cr.st * d;
      cr.buf[cr.i] = x + cr.st * fb;
      if (++cr.i >= cr.buf.length) cr.i = 0;
      oR += yr;
    }
    for (let a = 0; a < 4; a++) {
      const al = apsL[a];
      const bl = al.buf[al.i];
      al.buf[al.i] = oL + bl * 0.5;
      if (++al.i >= al.buf.length) al.i = 0;
      oL = bl - oL;
      const ar = apsR[a];
      const br = ar.buf[ar.i];
      ar.buf[ar.i] = oR + br * 0.5;
      if (++ar.i >= ar.buf.length) ar.i = 0;
      oR = br - oR;
    }
    outL[i] = oL * wet1 + oR * wet2;
    outR[i] = oR * wet1 + oL * wet2;
  }
  return [outL, outR];
}

/** Ping-pong delay with one-pole lowpass + highpass in the feedback path. Returns wet-only [L, R]. */
export function pingPong(inL, inR, { delayS = 0.375, feedback = 0.35, lpHz = 5000, hpHz = 250, resets = [] } = {}) {
  const n = inL.length;
  const D = Math.round(delayS * SR);
  const bl = new Float32Array(D), br = new Float32Array(D);
  let idx = 0;
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const lpa = 1 - Math.exp(-2 * Math.PI * lpHz / SR);
  const hpa = 1 - Math.exp(-2 * Math.PI * hpHz / SR);
  let lpL = 0, lpR = 0, hpL = 0, hpR = 0;
  const rs = new Set(resets);
  for (let i = 0; i < n; i++) {
    if (rs.has(i)) { bl.fill(0); br.fill(0); lpL = lpR = hpL = hpR = 0; }
    const yl = bl[idx], yr = br[idx];
    outL[i] = yl; outR[i] = yr;
    lpL += lpa * (yr - lpL); hpL += hpa * (lpL - hpL);
    lpR += lpa * (yl - lpR); hpR += hpa * (lpR - hpR);
    bl[idx] = (inL[i] + inR[i]) * 0.5 + (lpL - hpL) * feedback;
    br[idx] = (lpR - hpR) * feedback;
    if (++idx >= D) idx = 0;
  }
  return [outL, outR];
}

export const softClip = (x, drive = 1) => Math.tanh(x * drive) / Math.tanh(drive);

/**
 * Snare-roll hit times (seconds, relative to roll start), always on the 120 BPM grid.
 * dur ≥ 1.2 s → 1/4 → 1/8 → 1/16 in equal beats (26.0–27.5 roll).
 * shorter      → 1/8 (first beat) → 1/16 → 1/32 until dur (55.0–55.9 roll).
 */
export function rollPattern(dur) {
  const segs = dur >= 1.2
    ? [[0, dur / 3, 0.5], [dur / 3, 2 * dur / 3, 0.25], [2 * dur / 3, dur, 0.125]]
    : [[0, 0.5, 0.25], [0.5, 0.75, 0.125], [0.75, dur, 0.0625]];
  const hits = [];
  for (const [a, b, step] of segs) {
    for (let k = 0; ; k++) {
      const t = +(a + k * step).toFixed(6);
      if (t >= b - 1e-9) break;
      hits.push(t);
    }
  }
  return hits.map((t) => ({ t, vel: 0.35 + 0.65 * (t / dur) }));
}

// ---------------------------------------------------------------- true-peak oversampler
function besselI0(x) {
  let sum = 1, term = 1;
  for (let k = 1; k < 50; k++) {
    term *= (x / (2 * k)) * (x / (2 * k));
    sum += term;
    if (term < 1e-12 * sum) break;
  }
  return sum;
}
let TP_BANK = null;
/** 4x polyphase windowed-sinc (Kaiser beta 8, 32 taps/phase) interpolator, BS.1770-4 Annex 2 style. */
function tpBank() {
  if (TP_BANK) return TP_BANK;
  const L = 4, T = 32, N = L * T, beta = 8, fc = 0.5 / L * 0.96;
  const h = new Float64Array(N);
  const m = (N - 1) / 2;
  for (let k = 0; k < N; k++) {
    const x = k - m;
    const sinc = x === 0 ? 1 : Math.sin(2 * Math.PI * fc * x) / (2 * Math.PI * fc * x);
    const w = besselI0(beta * Math.sqrt(1 - Math.pow((2 * k) / (N - 1) - 1, 2))) / besselI0(beta);
    h[k] = 2 * fc * sinc * w * L;
  }
  const phases = [];
  for (let p = 0; p < L; p++) {
    const ph = new Float64Array(T);
    for (let j = 0; j < T; j++) ph[j] = h[p + L * j];
    phases.push(ph);
  }
  TP_BANK = { L, T, phases, delay: Math.round(m / L) };
  return TP_BANK;
}
/** Per-sample peak envelope including 4x inter-sample peaks: out[n] = max over ch and over interpolated points near n. */
export function interSamplePeaks(chans) {
  const { T, phases, delay } = tpBank();
  const n = chans[0].length;
  const out = new Float32Array(n);
  for (const x of chans) {
    for (let i = 0; i < n; i++) {
      let m = Math.abs(x[i]);
      for (let p = 0; p < phases.length; p++) {
        const ph = phases[p];
        let acc = 0;
        const base = i + delay;
        for (let j = 0; j < T; j++) {
          const idx = base - j;
          if (idx >= 0 && idx < n) acc += ph[j] * x[idx];
        }
        const a = Math.abs(acc);
        if (a > m) m = a;
      }
      if (m > out[i]) out[i] = m;
    }
  }
  return out;
}
export function truePeakDb(chans) {
  const e = interSamplePeaks(chans);
  let m = 0;
  for (let i = 0; i < e.length; i++) if (e[i] > m) m = e[i];
  return gainToDb(m);
}

// ---------------------------------------------------------------- WAV IO
export function writeWav(file, chans, { bits = 24, float = false } = {}) {
  const nch = chans.length, n = chans[0].length;
  const bps = float ? 4 : bits / 8;
  const dataBytes = n * nch * bps;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(float ? 3 : 1, 20);
  buf.writeUInt16LE(nch, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * nch * bps, 28);
  buf.writeUInt16LE(nch * bps, 32);
  buf.writeUInt16LE(float ? 32 : bits, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataBytes, 40);
  let o = 44, clipped = 0;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nch; c++) {
      let x = chans[c][i];
      if (float) { buf.writeFloatLE(x, o); o += 4; continue; }
      if (x > 1 || x < -1) { clipped++; x = clamp(x, -1, 1); }
      if (bits === 24) {
        let v = Math.round(x * 8388607);
        if (v < 0) v += 16777216;
        buf[o] = v & 0xff; buf[o + 1] = (v >> 8) & 0xff; buf[o + 2] = (v >> 16) & 0xff;
        o += 3;
      } else {
        buf.writeInt16LE(Math.round(x * 32767), o);
        o += 2;
      }
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return { clipped, frames: n };
}

export function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`not a WAV: ${file}`);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    const body = p + 8;
    if (id === 'fmt ') {
      fmt = { format: b.readUInt16LE(body), ch: b.readUInt16LE(body + 2), sr: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
      if (fmt.format === 0xfffe) fmt.format = b.readUInt16LE(body + 24);
    } else if (id === 'data') {
      data = { off: body, size: Math.min(size, b.length - body) };
    }
    p = body + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`bad WAV: ${file}`);
  const bps = fmt.bits / 8;
  const n = Math.floor(data.size / (bps * fmt.ch));
  const chans = Array.from({ length: fmt.ch }, () => new Float32Array(n));
  let o = data.off;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < fmt.ch; c++) {
      let v;
      if (fmt.format === 3 && fmt.bits === 32) v = b.readFloatLE(o);
      else if (fmt.bits === 16) v = b.readInt16LE(o) / 32768;
      else if (fmt.bits === 24) { let x = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16); if (x & 0x800000) x -= 0x1000000; v = x / 8388608; }
      else if (fmt.bits === 32) v = b.readInt32LE(o) / 2147483648;
      else throw new Error(`unsupported bits ${fmt.bits}`);
      chans[c][i] = v;
      o += bps;
    }
  }
  return { sr: fmt.sr, bits: fmt.bits, format: fmt.format, channels: chans, frames: n };
}

// ---------------------------------------------------------------- ffmpeg helpers
/** Runs `npx remotion ffmpeg|ffprobe ...` inside video/. Returns {status, stdout, stderr}. */
export function remotionTool(tool, args) {
  const quoted = args.map((a) => (/[\s"^&|<>,;=:]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a));
  const r = spawnSync(`npx remotion ${tool} ${quoted.join(' ')}`, {
    cwd: VIDEO_DIR, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
/** Optional system ffmpeg with the full filter set (ebur128/showwavespic/showspectrumpic). Returns path or null. */
export function findSystemFfmpeg() {
  const r = spawnSync('ffmpeg -hide_banner -filters', { shell: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) return null;
  const out = (r.stdout || '') + (r.stderr || '');
  return /\bebur128\b/.test(out) && /\bshowwavespic\b/.test(out) && /\bshowspectrumpic\b/.test(out) ? 'ffmpeg' : null;
}
export function systemFfmpeg(args) {
  const quoted = args.map((a) => (/[\s"^&|<>,;=:]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a));
  const r = spawnSync(`ffmpeg ${quoted.join(' ')}`, { cwd: VIDEO_DIR, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
