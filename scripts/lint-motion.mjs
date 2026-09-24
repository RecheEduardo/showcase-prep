// Fails if src/ contains non-deterministic or clock-driven animation APIs
// (15-PRODUCTION-PIPELINE §3.1): every frame must be a pure function of the frame number.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const RULES = [
	[/gsap\.ticker/, 'gsap.ticker'],
	[/requestAnimationFrame/, 'requestAnimationFrame'],
	[/setTimeout|setInterval/, 'setTimeout/setInterval'],
	[/Date\.now|new Date\(/, 'Date.now / new Date()'],
	[/Math\.random/, 'Math.random (use random(seed) from remotion)'],
	[/ScrollTrigger/, 'ScrollTrigger'],
	[/Draggable/, 'Draggable'],
	[/\btransition\s*:/, 'CSS transition'],
	[/\banimation\s*:/, 'CSS animation'],
	[/@keyframes/, '@keyframes'],
	[/<video\b|\.gif['"]/i, '<video>/GIF used to animate UI'],
	[/\.play\(\)|\.resume\(\)|\.restart\(\)/, 'GSAP playback call'],
	[/random\(\s*['"`]?\s*\)/, 'random() without a seed'],
];

const files = [];
const walk = (dir) => {
	for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p);
		else if (/\.(tsx?|css)$/.test(e.name)) files.push(p);
	}
};
walk(root);

const problems = [];
for (const f of files) {
	const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
	lines.forEach((line, i) => {
		const code = line.replace(/\/\/.*$/, '');
		for (const [re, name] of RULES) if (re.test(code)) problems.push(`${path.relative(path.join(root, '..'), f)}:${i + 1}  ${name}  ->  ${line.trim()}`);
	});
}
if (problems.length) {
	console.error(`lint-motion: ${problems.length} problem(s)`);
	for (const p of problems) console.error('  ' + p);
	process.exit(1);
}
console.log(`lint-motion: OK (${files.length} files scanned)`);
