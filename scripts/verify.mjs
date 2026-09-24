// Structural verification of the timing: src/pacing.ts → src/timeline.ts.
// Usage: node scripts/verify.mjs   (Node ≥ 22.18 strips the TypeScript types on import)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const {PACING} = await import('../src/pacing.ts');
const {FPS, SCENES, TOTAL_FRAMES, TOTAL_SECONDS, SFX_CUES} = await import('../src/timeline.ts');
// transitions.tsx holds JSX, so its table is read as text.
const trSrc = fs.readFileSync(path.join(root, 'src', 'motion', 'transitions.tsx'), 'utf8');
const TRANSITIONS = [...trSrc.matchAll(/\{from: '(\w+)', to: '(\w+)', kind: '(\w+)'/g)].map((m) => ({from: m[1], to: m[2], kind: m[3]}));
const prov = JSON.parse(fs.readFileSync(path.join(root, 'out', 'provenance.json'), 'utf8'));

const results = [];
const check = (name, ok, detail = '') => results.push({name, ok, detail});

// (a) one scene per PACING entry, contiguous, positive durations
check('(a) every PACING entry is a scene with a positive duration', SCENES.length === Object.keys(PACING).length && SCENES.every((s) => s.duration > 0), SCENES.map((s) => `${s.id}=${s.duration}s`).join(' '));
let contiguous = SCENES[0].start === 0;
for (let i = 1; i < SCENES.length; i++) if (SCENES[i].startFrame !== SCENES[i - 1].endFrame) contiguous = false;
check(`(a2) scenes cover 0–${TOTAL_SECONDS} s contiguously (${TOTAL_FRAMES} frames @ ${FPS} fps)`, contiguous, SCENES.map((s) => `${s.id}[${s.start}-${s.end}]`).join(' '));

// (b) every label lands inside its scene's design clock in its authored order, and the stretch
// factor (PACING / base) is sane.
const bad = [];
for (const s of SCENES) {
	if (!(s.stretch > 0.2 && s.stretch < 5)) bad.push(`${s.id}: ${s.duration}s é ${s.stretch.toFixed(2)}× o padrão de ${s.base}s`);
	let prev = -Infinity;
	for (const [label, t] of Object.entries(s.labels)) {
		if (t < prev - 1e-9 || t < 0 || t > s.base + 1e-9) bad.push(`${label} = ${t.toFixed(2)}s fora de ordem/da cena`);
		prev = t;
	}
}
check('(b) labels fit their design clock in order; each PACING value is 0.2×–5× its default', bad.length === 0, SCENES.map((s) => `${s.id}×${s.stretch.toFixed(2)}`).join(' ') + (bad.length ? ` — ${bad.join('; ')}` : ''));

// (b2) every label is used by the scene code
const scenesDir = path.join(root, 'src', 'scenes');
// Beat schedules derived in src/timeline.ts (typing, polygons, countdown) count as uses too.
const sceneCode = [...fs.readdirSync(scenesDir).map((f) => path.join(scenesDir, f)), path.join(root, 'src', 'timeline.ts')].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const unused = SCENES.flatMap((s) => Object.keys(s.labels)).filter((label) => !sceneCode.includes(`'${label}'`));
check('(b2) every label is referenced by the scene code or a derived schedule', unused.length === 0, unused.length ? `unused: ${unused.join(', ')}` : '');

// (c) sound cues are frame-aligned and inside the video
const badCues = SFX_CUES.filter((c) => c.frame !== Math.round(c.t * FPS) || c.frame < 0 || c.frame >= TOTAL_FRAMES);
check('(c) all SFX cues frame-aligned and inside the video', badCues.length === 0, `${SFX_CUES.length} cues`);

// (d) one transition per scene boundary
{
	const ok = TRANSITIONS.length === SCENES.length - 1 && TRANSITIONS.every((x, i) => x.from === SCENES[i].id && x.to === SCENES[i + 1].id);
	check('(d) one transition per scene boundary', ok, TRANSITIONS.map((x) => `${x.from}->${x.to}(${x.kind})`).join(' '));
}

// (e) provenance
const illus = SCENES.filter((s) => s.illustrative).map((s) => s.id);
check('(e) illustrative scenes are declared in out/provenance.json', illus.every((id) => /illustrative/.test(prov.scenes.find((p) => p.id === id)?.provenance ?? '')), `illustrative: ${illus.join(', ')}`);
check('(e2) provenance.json lists every scene', SCENES.every((s) => prov.scenes.some((p) => p.id === s.id)));

let failed = 0;
for (const r of results) {
	if (!r.ok) failed++;
	console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  —  ${r.detail}` : ''}`);
}
console.log(`\nverify: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
