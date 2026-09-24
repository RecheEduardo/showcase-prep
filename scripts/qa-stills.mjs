// Renders the QA still set with a single bundle + browser (much faster than one CLI call per frame).
// Default set: first/last frame of every scene, every transition midpoint, every big hit and every
// label frame (clicks included). Output: qa/stills/f<frame>_<t>s_<tags>.png at --scale (default 2 = 4K).
// Usage: node scripts/qa-stills.mjs [--scale=2] [--frames=1740,1980 | --times=12.5,30] [--out=qa/stills]
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => {
	const a = process.argv.find((x) => x.startsWith(`--${name}=`));
	return a ? a.split('=')[1] : def;
};
const scale = Number(arg('scale', '2'));
const outDir = path.join(root, arg('out', 'qa/stills'));
fs.mkdirSync(outDir, {recursive: true});

// Timing comes straight from src/timeline.ts (derived from src/pacing.ts); Node strips the types.
const {FPS, SCENES, TOTAL_FRAMES, HITS} = await import('../src/timeline.ts');
const tags = new Map();
const add = (frame, tag) => {
	const f = Math.max(0, Math.min(TOTAL_FRAMES - 1, frame));
	tags.set(f, [...(tags.get(f) ?? []), tag]);
};

const explicit = arg('frames', null);
const explicitTimes = arg('times', null);
if (explicit) {
	for (const f of explicit.split(',')) add(Number(f), 'manual');
} else if (explicitTimes) {
	for (const x of explicitTimes.split(',')) add(Math.round(Number(x) * FPS), 'manual');
} else {
	for (const s of SCENES) {
		add(s.startFrame, `${s.id}-first`);
		add(s.endFrame - 1, `${s.id}-last`);
		for (const [label, t] of Object.entries(s.labels)) add(Math.round((s.start + t) * FPS), label);
	}
	for (const s of SCENES.slice(1)) add(s.startFrame, 'transition-mid');
	for (const d of HITS) add(Math.round(d * FPS), `hit-${d}`);
}

const frames = [...tags.keys()].sort((a, b) => a - b);
console.log(`bundling… (${frames.length} stills at scale ${scale})`);
const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), onProgress: () => undefined});
// REMOTION_BROWSER lets the script use a preinstalled Chromium instead of downloading one.
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const browser = await openBrowser('chrome', {browserExecutable});
const composition = await selectComposition({serveUrl, id: 'GoTicketShowcase', puppeteerInstance: browser, browserExecutable});
const written = [];
for (const frame of frames) {
	const t = (frame / FPS).toFixed(2);
	const tag = tags.get(frame).join('+').replace(/[^\w.+-]/g, '_').slice(0, 80);
	const output = path.join(outDir, `f${String(frame).padStart(4, '0')}_${t}s_${tag}.png`);
	const t0 = Date.now();
	await renderStill({composition, serveUrl, output, frame, scale, imageFormat: 'png', puppeteerInstance: browser, overwrite: true, browserExecutable});
	written.push(output);
	console.log(`  ${path.relative(root, output)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close({silent: true});
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(frames.map((f) => ({frame: f, t: +(f / FPS).toFixed(3), tags: tags.get(f)})), null, 2));
console.log(`done: ${written.length} stills -> ${path.relative(root, outDir)}`);
