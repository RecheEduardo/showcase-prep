// Structural verification (F6): timing grid, label/cue sync, macro pacing, transitions, provenance, audio length.
// Usage: node scripts/verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tl = JSON.parse(fs.readFileSync(path.join(root, '..', 'data', 'scene-timeline.json'), 'utf8'));
const cuesFile = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'cues.json'), 'utf8'));
const prov = JSON.parse(fs.readFileSync(path.join(root, 'out', 'provenance.json'), 'utf8'));
const transitionsSrc = fs.readFileSync(path.join(root, 'src', 'motion', 'transitions.tsx'), 'utf8');
const FPS = tl._meta.fps;
const TOTAL_S = tl._meta.total_seconds;
const TOTAL_F = tl._meta.total_frames;
const ORIGIN = tl._meta.beat_origin_seconds ?? 0;
const fr = (t) => Math.round(t * FPS);

const results = [];
const check = (name, ok, detail = '') => results.push({name, ok, detail});

// (a) scenes cover 0–total without gaps or overlaps
const scenes = tl.scenes;
let contiguous = scenes[0].start === 0 && scenes.at(-1).end === TOTAL_S;
for (let i = 1; i < scenes.length; i++) if (scenes[i].start !== scenes[i - 1].end) contiguous = false;
check(`(a) SCENES cover 0–${TOTAL_S} s contiguously`, contiguous, scenes.map((s) => `${s.id}[${s.start}-${s.end}]`).join(' '));

// (c) total frames
check(`(c) TOTAL_FRAMES = ${TOTAL_F} = ${TOTAL_S} s × ${FPS}`, fr(TOTAL_S) === TOTAL_F, `total_frames=${TOTAL_F}`);

// (b) every label either has a cue on the same frame or is a declared visual-only beat
const VISUAL_ONLY = new Set(['C09.footnote']);
const cueFrames = new Map();
for (const c of cuesFile.cues) {
	if (!cueFrames.has(c.frame)) cueFrames.set(c.frame, []);
	cueFrames.get(c.frame).push(c.id);
}
const labelRows = [];
let labelsOk = true;
for (const s of scenes) {
	for (const [label, t] of Object.entries(s.labels)) {
		const f = fr(t);
		const hits = cueFrames.get(f) ?? [];
		const ok = hits.length > 0 || VISUAL_ONLY.has(label);
		if (!ok) labelsOk = false;
		labelRows.push(`${ok ? 'ok ' : 'XX '} ${label.padEnd(24)} t=${t.toFixed(2).padStart(5)} f=${String(f).padStart(4)}  ${hits.length ? hits.join(', ') : VISUAL_ONLY.has(label) ? '(visual-only)' : 'NO CUE'}`);
	}
}
check('(b) every label has a cue on the same frame (or is declared visual-only)', labelsOk);

// (b2) every label is used by the scene code (literal label string or LABELS[...])
const scenesDir = path.join(root, 'src', 'scenes');
const sceneCode = fs.readdirSync(scenesDir).map((f) => fs.readFileSync(path.join(scenesDir, f), 'utf8')).join('\n');
const unused = [];
for (const s of scenes) for (const label of Object.keys(s.labels)) if (!sceneCode.includes(`'${label}'`)) unused.push(label);
check('(b2) every label is referenced by the scene code', unused.length === 0, unused.length ? `unused: ${unused.join(', ')}` : '');

// (b3) cues are frame-aligned: sample index = frame × samples_per_frame, inside the video
const spf = cuesFile.samples_per_frame;
const badCues = cuesFile.cues.filter((c) => Math.abs(c.t * FPS - c.frame) > 1e-6 || c.frame < 0 || c.frame >= TOTAL_F || !Number.isInteger(c.frame * spf));
check(`(b3) all cues frame-aligned (t×${FPS} = frame, sample = frame×${spf})`, badCues.length === 0, `${cuesFile.cues.length} cues`);

// (b4) drops on bar downbeats (bars counted from beat_origin_seconds) and on kicks
const kickFrames = new Set(cuesFile.kicks.map((k) => k.frame));
const drops = tl._meta.drops;
check('(b4) drops on bar downbeats', drops.every((d) => (d - ORIGIN) % 2 === 0 && fr(d - ORIGIN) % tl._meta.bar_frames === 0 && kickFrames.has(fr(d))), `origin=${ORIGIN}s drops=${drops.join(', ')}`);
check('(b5) big hits land on kicks', tl._meta.hits.every((h) => kickFrames.has(fr(h))), tl._meta.hits.join(', '));

// (e) transition midpoints equal the next scene start; (e2) every cut lands on a kick (macro pacing)
const tr = [...transitionsSrc.matchAll(/\{at: ([\d.]+), from: '(\w+)', to: '(\w+)', kind: '(\w+)', frames: (\d+)/g)].map((m) => ({at: +m[1], from: m[2], to: m[3], kind: m[4], frames: +m[5]}));
const trOk = tr.length === scenes.length - 1 && tr.every((x) => scenes.find((s) => s.id === x.to)?.start === x.at && scenes.find((s) => s.id === x.from)?.end === x.at && Number.isInteger(fr(x.at)));
check('(e) transition windows centred on scene boundaries', trOk, tr.map((x) => `${x.from}->${x.to}@${x.at}(${x.kind}±${x.frames}f)`).join(' '));
const offKick = tr.filter((x) => !kickFrames.has(fr(x.at)));
check('(e2) every scene cut lands on a kick frame', tr.length > 0 && offKick.length === 0, offKick.length ? `off-kick: ${offKick.map((x) => x.at).join(', ')}` : `${cuesFile.kicks.length} kicks`);

// (d) illustrative scenes declared in provenance.json
const illus = scenes.filter((s) => s.illustrative).map((s) => s.id);
const provOk = illus.every((id) => /illustrative/.test(prov.scenes.find((p) => p.id === id)?.provenance ?? ''));
check('(d) illustrative scenes are declared in out/provenance.json', provOk, `illustrative: ${illus.join(', ')}`);
check('(d2) provenance.json lists every scene', scenes.every((s) => prov.scenes.some((p) => p.id === s.id)));

// (f) master audio length, if rendered
const master = path.join(root, 'public', 'audio', 'master.wav');
const expectSamples = TOTAL_S * cuesFile.sample_rate_hz;
if (fs.existsSync(master)) {
	const b = fs.readFileSync(master);
	let p = 12, fmt = null, dataLen = 0;
	while (p < b.length - 8) {
		const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
		if (id === 'fmt ') fmt = {ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22)};
		if (id === 'data') { dataLen = len; break; }
		p += 8 + len + (len % 2);
	}
	const frames = fmt ? dataLen / (fmt.ch * fmt.bits / 8) : 0;
	check(`(f) master.wav = 48 kHz stereo, ${expectSamples} samples (${TOTAL_S}.0 s)`, fmt && fmt.sr === 48000 && fmt.ch === 2 && frames === expectSamples, fmt ? `${fmt.sr} Hz, ${fmt.ch} ch, ${fmt.bits} bit, ${frames} samples` : 'no fmt');
} else {
	check('(f) master.wav present', false, 'public/audio/master.wav not found');
}

console.log('Label ↔ cue table');
for (const r of labelRows) console.log('  ' + r);
console.log('');
let failed = 0;
for (const r of results) {
	if (!r.ok) failed++;
	console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  —  ${r.detail}` : ''}`);
}
console.log(`\nverify: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
