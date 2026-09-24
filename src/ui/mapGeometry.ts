// Venue map geometry in the coordinate space of the real sector map
// (GET /venues/2/sector-map, viewBox 0 0 690 716). Sector outlines come from the
// real polygon points; the stadium drawing is redrawn in vector so it stays sharp in 4K.

export type Pt = [number, number];
export type SectorId = 'premium' | 'pista' | 'nivel1' | 'superior';

export const REAL_POLYGONS: Record<SectorId, Pt[]> = {
	pista: [[234, 210], [464, 208], [464, 368], [235, 368]],
	nivel1: [[163, 110], [223, 128], [222, 359], [236, 384], [312, 403], [419, 399], [458, 389], [475, 361], [473, 129], [532, 106], [535, 367], [502, 434], [441, 458], [345, 464], [252, 458], [189, 430], [160, 365]],
	superior: [[68, 78], [125, 87], [125, 385], [150, 439], [175, 466], [242, 487], [350, 495], [436, 491], [508, 467], [549, 434], [569, 368], [566, 86], [624, 74], [622, 421], [601, 482], [572, 514], [514, 546], [450, 561], [346, 567], [191, 552], [107, 507], [71, 421]],
	premium: [[236, 123], [276, 112], [350, 112], [421, 114], [461, 123], [460, 204], [349, 203], [237, 203]],
};

// U-shaped stands split into their outer and inner chains (same real vertices).
const CHAINS = {
	superior: {
		outer: [[68, 78], [71, 421], [107, 507], [191, 552], [346, 567], [450, 561], [514, 546], [572, 514], [601, 482], [622, 421], [624, 74]] as Pt[],
		inner: [[125, 87], [125, 385], [150, 439], [175, 466], [242, 487], [350, 495], [436, 491], [508, 467], [549, 434], [569, 368], [566, 86]] as Pt[],
	},
	nivel1: {
		outer: [[163, 110], [160, 365], [189, 430], [252, 458], [345, 464], [441, 458], [502, 434], [535, 367], [532, 106]] as Pt[],
		inner: [[223, 128], [222, 359], [236, 384], [312, 403], [419, 399], [458, 389], [475, 361], [473, 129]] as Pt[],
	},
};

const f = (n: number) => n.toFixed(1);

/** Catmull-Rom through points as cubic Bézier segments (no leading M). */
const smoothSegments = (pts: Pt[], k = 0.8): string => {
	let d = '';
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[Math.min(pts.length - 1, i + 2)];
		const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
		const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
		d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
	}
	return d;
};

const standPath = (outer: Pt[], inner: Pt[]) => {
	const rin = [...inner].reverse();
	return `M${f(outer[0][0])},${f(outer[0][1])}${smoothSegments(outer)} L${f(rin[0][0])},${f(rin[0][1])}${smoothSegments(rin)} Z`;
};

const polyPath = (pts: Pt[]) => `M${pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' L')} Z`;

export const SECTOR_PATHS: Record<SectorId, string> = {
	superior: standPath(CHAINS.superior.outer, CHAINS.superior.inner),
	nivel1: standPath(CHAINS.nivel1.outer, CHAINS.nivel1.inner),
	premium: polyPath(REAL_POLYGONS.premium),
	pista: 'M234,214 Q234,210 238,210 L460,208 Q464,208 464,212 L464,352 Q464,368 448,368 L251,368 Q235,368 235,352 Z',
};

const chainLength = (pts: Pt[]) => {
	const acc = [0];
	for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
	return acc;
};

const pointAt = (pts: Pt[], u: number): Pt => {
	const acc = chainLength(pts);
	const target = u * acc[acc.length - 1];
	for (let i = 1; i < pts.length; i++) {
		if (acc[i] >= target) {
			const seg = acc[i] - acc[i - 1] || 1;
			const p = (target - acc[i - 1]) / seg;
			return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * p, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * p];
		}
	}
	return pts[pts.length - 1];
};

/** Seat-block separators: segments joining the inner and outer chains at equal arc-length. */
export const separators = (id: 'superior' | 'nivel1', count: number): string => {
	const {outer, inner} = CHAINS[id];
	let d = '';
	for (let k = 1; k < count; k++) {
		const u = k / count;
		const a = pointAt(inner, u);
		const b = pointAt(outer, u);
		d += `M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])} `;
	}
	return d;
};

export const OUTER_PATH = 'M40,34 Q40,28 46,28 L644,28 Q650,28 650,34 L650,430 C650,522 560,598 345,598 C130,598 40,522 40,430 Z';
export const PALCO = {x: 274, y: 60, w: 141, h: 51};
export const HOUSE_MIX = {x: 328, y: 207, w: 42, h: 29};

/** Anchor points (map space) used for sweeps, tooltips and cursor targets. */
export const SECTOR_ANCHOR: Record<SectorId, Pt> = {
	premium: [349, 158],
	pista: [349, 290],
	nivel1: [345, 440],
	superior: [345, 540],
};

// Eight editor "polygons" for C08 (48.5–52.0 s): pista, premium, then the stands split
// into three blocks each. Handles are the block corners/midpoints; the Cadeira Nível 1
// blocks reuse the 17 real vertices of that sector, grouped by position.
const slice = (id: 'superior' | 'nivel1', u0: number, u1: number): {d: string; handles: Pt[]} => {
	const {outer, inner} = CHAINS[id];
	const n = 10;
	const o: Pt[] = [];
	const i: Pt[] = [];
	for (let k = 0; k <= n; k++) {
		const u = u0 + ((u1 - u0) * k) / n;
		o.push(pointAt(outer, u));
		i.push(pointAt(inner, u));
	}
	return {d: standPath(o, i), handles: [o[0], o[n / 2], o[n], i[n], i[n / 2], i[0]]};
};

export type EditorPolygon = {key: string; sector: SectorId; d: string; handles: Pt[]};

const U_SPLIT = [0, 0.36, 0.64, 1];
const N1 = REAL_POLYGONS.nivel1;
const isLeft = ([x, y]: Pt) => x < 240 && y < 400;
const isRight = ([x, y]: Pt) => x > 455 && y < 400;
const n1Part = (part: 'l' | 'b' | 'r') => N1.filter((p) => (part === 'l' ? isLeft(p) : part === 'r' ? isRight(p) : !isLeft(p) && !isRight(p)));

export const EDITOR_POLYGONS: EditorPolygon[] = [
	{key: 'pista', sector: 'pista', d: SECTOR_PATHS.pista, handles: REAL_POLYGONS.pista},
	{key: 'premium', sector: 'premium', d: SECTOR_PATHS.premium, handles: REAL_POLYGONS.premium},
	{key: 'sup-l', sector: 'superior', ...slice('superior', U_SPLIT[0], U_SPLIT[1])},
	{key: 'sup-b', sector: 'superior', ...slice('superior', U_SPLIT[1], U_SPLIT[2])},
	{key: 'sup-r', sector: 'superior', ...slice('superior', U_SPLIT[2], U_SPLIT[3])},
	{key: 'n1-l', sector: 'nivel1', d: slice('nivel1', U_SPLIT[0], U_SPLIT[1]).d, handles: n1Part('l')},
	{key: 'n1-b', sector: 'nivel1', d: slice('nivel1', U_SPLIT[1], U_SPLIT[2]).d, handles: n1Part('b')},
	{key: 'n1-r', sector: 'nivel1', d: slice('nivel1', U_SPLIT[2], U_SPLIT[3]).d, handles: n1Part('r')},
];

/** The whole Cadeira Nível 1 outline (real polygon) shown once the sector is complete. */
export const NIVEL1_OUTLINE = polyPath(REAL_POLYGONS.nivel1);
