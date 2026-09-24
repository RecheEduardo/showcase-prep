// Minimal PNG codec (8-bit RGB/RGBA/grey, non-interlaced) for QA tooling. No deps.
import fs from 'node:fs';
import zlib from 'node:zlib';

export const decodePng = (file) => {
	const b = fs.readFileSync(file);
	let p = 8, w, h, ct;
	const idat = [];
	while (p < b.length) {
		const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
		if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
		if (type === 'IDAT') idat.push(d);
		p += 12 + len;
	}
	const bpp = {0: 1, 2: 3, 4: 2, 6: 4}[ct];
	const raw = zlib.inflateSync(Buffer.concat(idat));
	const stride = w * bpp;
	const px = Buffer.alloc(h * stride);
	for (let y = 0; y < h; y++) {
		const f = raw[y * (stride + 1)];
		const off = y * (stride + 1) + 1;
		for (let x = 0; x < stride; x++) {
			const a = x >= bpp ? px[y * stride + x - bpp] : 0;
			const up = y > 0 ? px[(y - 1) * stride + x] : 0;
			const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
			let v = raw[off + x];
			if (f === 1) v += a;
			else if (f === 2) v += up;
			else if (f === 3) v += (a + up) >> 1;
			else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
			px[y * stride + x] = v & 255;
		}
	}
	const rgb = Buffer.alloc(w * h * 3);
	for (let i = 0; i < w * h; i++) {
		if (bpp >= 3) { rgb[i * 3] = px[i * bpp]; rgb[i * 3 + 1] = px[i * bpp + 1]; rgb[i * 3 + 2] = px[i * bpp + 2]; }
		else { rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = px[i * bpp]; }
	}
	return {w, h, rgb};
};

const crcTable = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };

export const encodePng = (file, w, h, rgb) => {
	const raw = Buffer.alloc((w * 3 + 1) * h);
	for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
	const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
	fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level: 6})), chunk('IEND', Buffer.alloc(0))]));
};

/** Box-filter downscale to (tw, th). */
export const resize = (img, tw, th) => {
	const out = Buffer.alloc(tw * th * 3);
	const sx = img.w / tw, sy = img.h / th;
	for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
		const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
		const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
		let r = 0, g = 0, b = 0, n = 0;
		for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * img.w + xx) * 3; r += img.rgb[i]; g += img.rgb[i + 1]; b += img.rgb[i + 2]; n++; }
		const o = (y * tw + x) * 3; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
	}
	return {w: tw, h: th, rgb: out};
};
