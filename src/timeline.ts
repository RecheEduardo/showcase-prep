// Timing of the whole video, DERIVED from src/pacing.ts (the only file to edit to change the
// pace). Scene starts are the running sum of the durations.
//
// Every scene is authored on its own DESIGN clock of `base` seconds: labels, springs, tweens,
// cursor paths and GSAP timelines are all written in design seconds LOCAL to the scene (0 = its
// first frame). PACING[id] sets the real length, and the scene clock is stretched by
// `stretch = PACING[id] / base` (motion/scene.tsx), so EVERY action point and animation of the
// scene spreads out (or tightens) proportionally: no dead time at the end, nothing cut off.
// `fromEnd(x)` anchors a beat x design seconds before the end of the design clock.
import {COPY} from './copy.ts';
import {PACING} from './pacing.ts';

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Seconds -> frame (frame = round(t * FPS)). */
export const sec = (s: number) => Math.round(s * FPS);

export type SceneId = keyof typeof PACING;

type FromEnd = {fromEnd: number};
const fromEnd = (seconds: number): FromEnd => ({fromEnd: seconds});
type LabelTime = number | FromEnd;

const SCENE_DEFS = {
	C00: {name: 'Caos', base: 5, illustrative: true, labels: {'C00.problem.enter': 0, 'C00.stall.click': 1.5, 'C00.agitation.start': 2.5, 'C00.freeze': fromEnd(0.1)}},
	C01: {name: 'Marca', base: 3, illustrative: false, labels: {'C01.logo.slam': 0, 'C01.tagline.cascade': 0.5}},
	C02: {name: 'Vitrine', base: 3, illustrative: false, labels: {'C02.tiles.cascade.start': 0.25, 'C02.tiles.cascade.end': 0.7}},
	C03: {name: 'O evento', base: 2.5, illustrative: false, labels: {'C03.panel.expand': 0.25, 'C03.datecard.click': 1.5, 'C03.card.open': fromEnd(0.45)}},
	C04: {
		name: 'A fila',
		base: 4,
		illustrative: true,
		labels: {'C04.dark.enter': 0, 'C04.counter.start': 0.5, 'C04.lean': fromEnd(2), 'C04.roll': fromEnd(1), 'C04.stoptime': fromEnd(0.5)},
	},
	C05: {
		name: 'O estádio acende',
		base: 5,
		illustrative: false,
		labels: {
			'C05.rows.cascade': 0.25,
			'C05.sector1.click': 1,
			'C05.sector1.fill': 1.1,
			'C05.tooltip1': 1.5,
			'C05.sector2.click': 3,
			'C05.sector2.fill': 3.1,
			'C05.tooltip2': 3.5,
		},
	},
	C06: {name: 'Quantidade e total', base: 3, illustrative: false, labels: {'C06.counter.appear': 0, 'C06.plus1': 0.5, 'C06.plus2': 1, 'C06.total.card': 1.25, 'C06.cta.shine': 2}},
	C07: {name: 'Checkout', base: 3, illustrative: false, labels: {'C07.holders.enter': 0, 'C07.card.slide': 0.25, 'C07.names.type': 0.7}},
	C08: {
		name: 'Quem organiza',
		base: 8,
		illustrative: true,
		// Editor part (0 → turn) is a bit longer than the status-board part (turn → end): ~53 / 47 %.
		labels: {
			'C08.title.hero': 0,
			'C08.list.cascade': 0.5,
			'C08.polygons.start': 0.8,
			'C08.polygons.end': 3.4,
			'C08.turn': 4.2,
			'C08.cards.slide': 4.45,
			'C08.approved1': 5.4,
			'C08.approved2': 6.25,
			'C08.punch': fromEnd(0.3),
		},
	},
	C09: {
		name: 'Fecho',
		base: 4.5,
		illustrative: false,
		labels: {
			'C09.logo.slam': 0,
			'C09.copy.reveal': 0.25,
			'C09.cta.shine': 1,
			'C09.footnote': 1,
			'C09.cta.click': 1.25,
			'C09.cta.pulse1': 1.5,
			'C09.outro.pop': 2,
			// The lockup only grows to the centre once the line and the CTA have fully popped out.
			'C09.logo.hero': 2.7,
		},
	},
} as const satisfies Record<SceneId, {name: string; base: number; illustrative: boolean; labels: Record<string, LabelTime>}>;

type LabelsOf<S> = S extends {labels: infer L} ? keyof L : never;
export type Label = {[K in SceneId]: LabelsOf<(typeof SCENE_DEFS)[K]>}[SceneId] & string;

export type Scene = {
	id: SceneId;
	name: string;
	/** Absolute start/end in the video (seconds). */
	start: number;
	end: number;
	/** Real scene length (seconds) = PACING[id]. */
	duration: number;
	/** Length of the design clock the scene is authored on (seconds). */
	base: number;
	/** Real seconds per design second (PACING[id] / base). */
	stretch: number;
	startFrame: number;
	endFrame: number;
	durationInFrames: number;
	illustrative: boolean;
	/** Label times LOCAL to the scene, in design seconds. */
	labels: Record<string, number>;
};

const IDS = Object.keys(PACING) as SceneId[];
export const SCENES: Scene[] = (() => {
	let acc = 0;
	return IDS.map((id) => {
		const duration = PACING[id];
		const def = SCENE_DEFS[id];
		const labels: Record<string, number> = {};
		for (const [k, v] of Object.entries(def.labels as Record<string, LabelTime>)) labels[k] = typeof v === 'number' ? v : +(def.base - v.fromEnd).toFixed(6);
		const start = acc;
		acc = +(acc + duration).toFixed(6);
		const startFrame = sec(start);
		const endFrame = sec(acc);
		return {id, name: def.name, start, end: acc, duration, base: def.base, stretch: duration / def.base, startFrame, endFrame, durationInFrames: endFrame - startFrame, illustrative: def.illustrative, labels};
	});
})();

export const SCENE: Record<SceneId, Scene> = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, Scene>;
export const TOTAL_SECONDS = SCENES[SCENES.length - 1].end;
export const TOTAL_FRAMES = SCENES[SCENES.length - 1].endFrame;

/** Label -> design seconds LOCAL to its scene. */
export const LABELS = Object.assign({}, ...SCENES.map((s) => s.labels)) as Record<Label, number>;
/** End of each scene's DESIGN clock (design seconds): what scene code anchors end-of-scene beats to. */
export const DUR = Object.fromEntries(SCENES.map((s) => [s.id, s.base])) as Record<SceneId, number>;

// ------------------------------------------------------------------------------------------------
// Beat schedules derived from the labels (each one is also a sound cue).

/** Accelerating ticks: geometric gaps ~0.25 s → ~0.05 s scaled to land the last one on `until`. */
const accelerating = (start: number, until: number, count: number) => {
	const ratio = Math.pow(0.05 / 0.25, 1 / (count - 2));
	const gaps = Array.from({length: count - 1}, (_, i) => 0.25 * Math.pow(ratio, i));
	const scale = (until - start) / gaps.reduce((a, b) => a + b, 0);
	const out = [start];
	let prevFrame = sec(start);
	let acc = start;
	for (let i = 0; i < gaps.length; i++) {
		acc += gaps[i] * scale;
		let f = i === gaps.length - 1 ? sec(until) : sec(acc);
		if (f <= prevFrame) f = prevFrame + 1;
		prevFrame = f;
		out.push(f / FPS);
	}
	return out;
};

/** C00: one error dialog per accelerating tick, from the agitation to just before the freeze. */
export const C00_ERRORS = accelerating(LABELS['C00.agitation.start'], LABELS['C00.freeze'] - 0.15, 10);

/** C04 queue countdown (local seconds): value shown from each tick onwards, 301 → 1 in 40 ticks. */
export const COUNTDOWN = accelerating(LABELS['C04.counter.start'], LABELS['C04.stoptime'], 40).map((t, i, all) => ({
	t,
	value: Math.round(301 - (300 * i) / (all.length - 1)),
}));

/** C08: the eight sector blocks light evenly spaced from polygons.start to polygons.end. */
export const C08_POLYS = Array.from({length: 8}, (_, i) => +(LABELS['C08.polygons.start'] + (i * (LABELS['C08.polygons.end'] - LABELS['C08.polygons.start'])) / 7).toFixed(6));

/** C07: the holders are typed one field at a time (name, then document), one key per char. */
const KEY_STEP = 0.018;
const FIELD_GAP = 0.08;
const HOLDER_GAP = 0.1;
export type TypingField = {holder: number; field: 'name' | 'doc'; start: number; end: number; chars: number};
export const C07_TYPING: TypingField[] = (() => {
	const out: TypingField[] = [];
	let t = LABELS['C07.names.type'];
	COPY.C07.holders.forEach((h, i) => {
		for (const field of ['name', 'doc'] as const) {
			const chars = [...h[field]].length;
			out.push({holder: i, field, start: +t.toFixed(4), end: +(t + chars * KEY_STEP).toFixed(4), chars});
			t += chars * KEY_STEP + FIELD_GAP;
		}
		t += HOLDER_GAP - FIELD_GAP;
	});
	return out;
})();
/** Characters of a typed field visible at local time t. */
export const typedChars = (f: TypingField, t: number) => (t < f.start ? 0 : Math.min(f.chars, Math.floor((t - f.start) / KEY_STEP) + 1));

// ------------------------------------------------------------------------------------------------
// Sound cues placed by the Remotion SFX layer (src/audio.ts decides which kinds are audible).

export type SfxCue = {id: string; kind: string; scene: SceneId; t: number; frame: number; variant: number};
const cue = (scene: SceneId, id: string, kind: string, local: number, variant = 0): SfxCue => {
	// Design seconds -> real video seconds (the scene clock is stretched by PACING).
	const t = +(SCENE[scene].start + local * SCENE[scene].stretch).toFixed(6);
	return {id, kind, scene, t, frame: sec(t), variant};
};
export const SFX_CUES: SfxCue[] = [
	...C07_TYPING.flatMap((f) =>
		Array.from({length: f.chars}, (_, k) => cue('C07', `c07.type.${f.holder}.${f.field}#${k}`, 'key_tick', f.start + k * KEY_STEP, (f.holder * 7 + k * 5 + (f.field === 'doc' ? 3 : 0)) % 12)),
	),
].sort((a, b) => a.frame - b.frame);

/** Big visual hits (flash + shockwave): the hard cut into the brand, drop 2, the final impact. */
export const HITS = [SCENE.C01.start, SCENE.C05.start, SCENE.C09.start] as const;
