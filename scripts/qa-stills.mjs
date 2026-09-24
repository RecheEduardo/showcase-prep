// Renders the QA still set with a single bundle + browser (much faster than one CLI call per frame).
// Default set: first/last frame of every scene, every transition midpoint, every big hit and every
// JSON label frame (clicks included). Output: qa/stills/f<frame>_<t>s_<tags>.png at --scale (default 2 = 4K).
// Usage: node scripts/qa-stills.mjs [--scale=2] [--frames=1740,1980] [--out=qa/stills]
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

const tl = JSON.parse(fs.readFileSync(path.join(root, '..', 'data', 'scene-timeline.json'), 'utf8'));
const FPS = tl._meta.fps;
const tags = new Map();
const add = (frame, tag) => {
	const f = Math.max(0, Math.min(tl._meta.total_frames - 1, frame));
	tags.set(f, [...(tags.get(f) ?? []), tag]);
};

const explicit = arg('frames', null);
if (explicit) {
	for (const f of explicit.split(',')) add(Number(f), 'manual');
} else {
	for (const s of tl.scenes) {
		add(Math.round(s.start * FPS), `${s.id}-first`);
		add(Math.round(s.end * FPS) - 1, `${s.id}-last`);
		for (const [label, t] of Object.entries(s.labels)) add(Math.round(t * FPS), label);
	}
	for (const s of tl.scenes.slice(1)) add(Math.round(s.start * FPS), 'transition-mid');
	for (const d of tl._meta.hits) add(Math.round(d * FPS), `hit-${d}`);
}

const frames = [...tags.keys()].sort((a, b) => a - b);
console.log(`bundling… (${frames.length} stills at scale ${scale})`);
const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), onProgress: () => undefined});
const browser = await openBrowser('chrome');
const composition = await selectComposition({serveUrl, id: 'GoTicketShowcase', puppeteerInstance: browser});
const written = [];
for (const frame of frames) {
	const t = (frame / FPS).toFixed(2);
	const tag = tags.get(frame).join('+').replace(/[^\w.+-]/g, '_').slice(0, 80);
	const output = path.join(outDir, `f${String(frame).padStart(4, '0')}_${t}s_${tag}.png`);
	const t0 = Date.now();
	await renderStill({composition, serveUrl, output, frame, scale, imageFormat: 'png', puppeteerInstance: browser, overwrite: true});
	written.push(output);
	console.log(`  ${path.relative(root, output)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close({silent: true});
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(frames.map((f) => ({frame: f, t: +(f / FPS).toFixed(3), tags: tags.get(f)})), null, 2));
console.log(`done: ${written.length} stills -> ${path.relative(root, outDir)}`);
