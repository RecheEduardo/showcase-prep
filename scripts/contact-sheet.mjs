// Contact sheet of QA stills in pure Node (the bundled ffmpeg has no xstack/pad).
// Usage: node scripts/contact-sheet.mjs out.png <cols> a.png b.png ...
import {decodePng, encodePng, resize} from './lib/png.mjs';

const [out, cols, ...inputs] = process.argv.slice(2);
if (!out || !inputs.length) {
	console.error('usage: node scripts/contact-sheet.mjs out.png <cols> a.png b.png ...');
	process.exit(1);
}
const c = Number(cols), TW = 640, TH = 360, G = 6;
const rows = Math.ceil(inputs.length / c);
const W = c * TW + (c + 1) * G, H = rows * TH + (rows + 1) * G;
const rgb = Buffer.alloc(W * H * 3, 20);
inputs.forEach((f, k) => {
	const img = resize(decodePng(f), TW, TH);
	const ox = G + (k % c) * (TW + G), oy = G + Math.floor(k / c) * (TH + G);
	for (let y = 0; y < TH; y++) img.rgb.copy(rgb, ((oy + y) * W + ox) * 3, y * TW * 3, (y + 1) * TW * 3);
});
encodePng(out, W, H, rgb);
console.log('wrote', out, `${W}x${H}`);
