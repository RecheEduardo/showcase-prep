// Writes public/brand/grain.png: a 256x256 seeded luminance-noise tile (grey + alpha).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 256;
let s = 0x9e3779b9;
const rnd = () => {
	s |= 0; s = (s + 0x6d2b79f5) | 0;
	let t = Math.imul(s ^ (s >>> 15), 1 | s);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const raw = Buffer.alloc((W * 2 + 1) * W);
for (let y = 0; y < W; y++) {
	raw[y * (W * 2 + 1)] = 0;
	for (let x = 0; x < W; x++) {
		const v = Math.round(rnd() * 255);
		raw[y * (W * 2 + 1) + 1 + x * 2] = v;
		raw[y * (W * 2 + 1) + 2 + x * 2] = 255;
	}
}
const crcTable = Array.from({length: 256}, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc = (buf) => {
	let c = 0xffffffff;
	for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
	const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
	return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 4; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(path.join(root, 'public', 'brand', 'grain.png'), png);
console.log('grain.png', png.length, 'bytes');
