/**
 * ITU-R BS.1770-4 / EBU R128 loudness meter in pure Node (K-weighting, gating, LRA per EBU Tech 3342,
 * true peak via 4x polyphase oversampling from dsp.mjs).
 *
 * Library module (imported by mix.mjs / analyze.mjs). Standalone use from `video/`:
 *   node scripts/audio/loudness.mjs public/audio/master.wav
 */
import { SR, readWav, truePeakDb, gainToDb } from './dsp.mjs';

// BS.1770-4 K-weighting coefficients, defined for fs = 48 kHz.
const PRE = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
const RLB = { b: [1.0, -2.0, 1.0], a: [1, -1.99004745483398, 0.99007225036621] };

function iir(x, { b, a }) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
export function kWeight(x) {
  return iir(iir(x, PRE), RLB);
}
const lk = (z) => (z > 0 ? -0.691 + 10 * Math.log10(z) : -Infinity);

/** Cumulative sum of K-weighted energy (sum over channels, G = 1.0 for L/R). */
export function kEnergyCumsum(chans) {
  if (chans[0].length && SR !== 48000) throw new Error('K-weighting coefficients are for 48 kHz');
  const n = chans[0].length;
  const cs = new Float64Array(n + 1);
  const ks = chans.map(kWeight);
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (const k of ks) e += k[i] * k[i];
    cs[i + 1] = cs[i] + e;
  }
  return cs;
}

export function measureLoudness(chans, { withTruePeak = true } = {}) {
  const n = chans[0].length;
  const cs = kEnergyCumsum(chans);
  const z = (a, b) => (cs[b] - cs[a]) / (b - a);
  // Integrated: 400 ms blocks, 75 % overlap.
  const blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR);
  const zs = [];
  for (let a = 0; a + blk <= n; a += hop) zs.push(z(a, a + blk));
  const absG = zs.filter((v) => lk(v) > -70);
  const relT = lk(absG.reduce((p, v) => p + v, 0) / Math.max(1, absG.length)) - 10;
  const gated = absG.filter((v) => lk(v) > relT);
  const integrated = lk(gated.reduce((p, v) => p + v, 0) / Math.max(1, gated.length));
  // Short-term 3 s every 100 ms (LRA per EBU Tech 3342).
  const stw = 3 * SR;
  const st = [];
  for (let a = 0; a + stw <= n; a += hop) st.push({ t: a / SR, z: z(a, a + stw) });
  const stAbs = st.filter((v) => lk(v.z) > -70);
  const stRel = lk(stAbs.reduce((p, v) => p + v.z, 0) / Math.max(1, stAbs.length)) - 20;
  const stG = stAbs.filter((v) => lk(v.z) > stRel).map((v) => lk(v.z)).sort((x, y) => x - y);
  const pct = (p) => stG[Math.min(stG.length - 1, Math.max(0, Math.round((stG.length - 1) * p)))];
  const lra = stG.length ? pct(0.95) - pct(0.1) : 0;
  const momentaryMax = Math.max(...zs.map(lk));
  const shortTermMax = Math.max(...st.map((v) => lk(v.z)));
  let samplePeak = 0;
  for (const c of chans) for (let i = 0; i < n; i++) { const v = Math.abs(c[i]); if (v > samplePeak) samplePeak = v; }
  return {
    integrated,
    lra,
    momentaryMax,
    shortTermMax,
    samplePeakDb: gainToDb(samplePeak),
    truePeakDb: withTruePeak ? truePeakDb(chans) : null,
    shortTerm: st.map((v) => ({ t: v.t, lufs: lk(v.z) })),
  };
}

/** Loudness (LUFS, ungated) of an arbitrary [t0, t1) range. */
export function rangeLoudness(cs, t0, t1) {
  const a = Math.round(t0 * SR), b = Math.round(t1 * SR);
  return lk((cs[b] - cs[a]) / (b - a));
}

if (process.argv[1] && process.argv[1].endsWith('loudness.mjs') && process.argv[2]) {
  const w = readWav(process.argv[2]);
  const m = measureLoudness(w.channels);
  delete m.shortTerm;
  console.log(JSON.stringify(m, null, 2));
}
