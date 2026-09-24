// Timing of the whole video, DERIVED from src/pacing.ts (the only file to edit to change the
// pace). Scene starts are the running sum of the durations; every label and sound cue below is in
// seconds LOCAL to its scene (0 = first frame of the scene). `fromEnd(x)` anchors a beat x seconds
// before the scene's end, so it follows the scene when its duration changes. `min` is the shortest
// duration that still shows every beat of the scene (scripts/verify.mjs fails below it).
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
	C00: {name: 'Caos', min: 4.9, illustrative: true, labels: {'C00.problem.enter': 0, 'C00.stall.click': 1.5, 'C00.agitation.start': 2.5, 'C00.freeze': fromEnd(0.1)}},
	C01: {name: 'Marca', min: 2, illustrative: false, labels: {'C01.logo.slam': 0, 'C01.tagline.cascade': 0.5}},
	C02: {name: 'Vitrine', min: 1.8, illustrative: false, labels: {'C02.tiles.cascade.start': 0.25, 'C02.tiles.cascade.end': 0.7}},
	C03: {name: 'O evento', min: 2.2, illustrative: false, labels: {'C03.panel.expand': 0.25, 'C03.datecard.click': 1.5, 'C03.card.open': fromEnd(0.45)}},
	C04: {
		name: 'A fila',
		min: 2.5,
		illustrative: true,
		labels: {'C04.dark.enter': 0, 'C04.counter.start': 0.5, 'C04.lean': fromEnd(2), 'C04.roll': fromEnd(1), 'C04.stoptime': fromEnd(0.5)},
	},
	C05: {
		name: 'O estádio acende',
		min: 4.2,
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
	C06: {name: 'Quantidade e total', min: 2.4, illustrative: false, labels: {'C06.counter.appear': 0, 'C06.plus1': 0.5, 'C06.plus2': 1, 'C06.total.card': 1.25, 'C06.cta.shine': 2}},
	C07: {name: 'Checkout', min: 4.8, illustrative: false, labels: {'C07.holders.enter': 0, 'C07.card.slide': 0.25, 'C07.names.type': 0.7}},
	C08: {
		name: 'Quem organiza',
		min: 6.4,
		illustrative: true,
		labels: {
			'C08.title.hero': 0,
			'C08.list.cascade': 0.5,
			'C08.polygons.start': 0.75,
			'C08.polygons.end': 2.5,
			'C08.turn': 3,
			'C08.cards.slide': 3.3,
			'C08.approved1': 4.4,
			'C08.approved2': 5.4,
			'C08.punch': fromEnd(0.3),
		},
	},
	C09: {
		name: 'Fecho',
		min: 3.6,
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
} as const satisfies Record<SceneId, {name: string; min: number; illustrative: boolean; labels: Record<string, LabelTime>}>;

type LabelsOf<S> = S extends {labels: infer L} ? keyof L : never;
export type Label = {[K in SceneId]: LabelsOf<(typeof SCENE_DEFS)[K]>}[SceneId] & string;

export type Scene = {
	id: SceneId;
	name: string;
	/** Absolute start/end in the video (seconds). */
	start: number;
	end: number;
	/** Scene length (seconds) = PACING[id]. */
	duration: number;
	/** Shortest duration that still shows every beat of the scene (checked by scripts/verify.mjs). */
	min: number;
	startFrame: number;
	endFrame: number;
	durationInFrames: number;
	illustrative: boolean;
	/** Label times LOCAL to the scene (seconds). */
	labels: Record<string, number>;
};

const IDS = Object.keys(PACING) as SceneId[];
export const SCENES: Scene[] = (() => {
	let acc = 0;
	return IDS.map((id) => {
		const duration = PACING[id];
		const def = SCENE_DEFS[id];
		const labels: Record<string, number> = {};
		for (const [k, v] of Object.entries(def.labels as Record<string, LabelTime>)) labels[k] = typeof v === 'number' ? v : +(duration - v.fromEnd).toFixed(6);
		const start = acc;
		acc = +(acc + duration).toFixed(6);
		const startFrame = sec(start);
		const endFrame = sec(acc);
		return {id, name: def.name, start, end: acc, duration, min: def.min, startFrame, endFrame, durationInFrames: endFrame - startFrame, illustrative: def.illustrative, labels};
	});
})();

export const SCENE: Record<SceneId, Scene> = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, Scene>;
export const TOTAL_SECONDS = SCENES[SCENES.length - 1].end;
export const TOTAL_FRAMES = SCENES[SCENES.length - 1].endFrame;

/** Label -> seconds LOCAL to its scene. */
export const LABELS = Object.assign({}, ...SCENES.map((s) => s.labels)) as Record<Label, number>;
/** Scene length in seconds (local time of its last frame boundary). */
export const DUR = Object.fromEntries(SCENES.map((s) => [s.id, s.duration])) as Record<SceneId, number>;

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

/** C08: one sector block lights per eighth note between polygons.start and polygons.end. */
export const C08_POLYS = Array.from({length: 8}, (_, i) => +(LABELS['C08.polygons.start'] + i * 0.25).toFixed(6));

/** C07: the four holders are typed one after the other, name then document, one key per char. */
const KEY_STEP = 0.028;
const FIELD_GAP = 0.1;
const HOLDER_GAP = 0.14;
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
	const t = +(SCENE[scene].start + local).toFixed(6);
	return {id, kind, scene, t, frame: sec(t), variant};
};
export const SFX_CUES: SfxCue[] = [
	...C07_TYPING.flatMap((f) =>
		Array.from({length: f.chars}, (_, k) => cue('C07', `c07.type.${f.holder}.${f.field}#${k}`, 'key_tick', f.start + k * KEY_STEP, (f.holder * 7 + k * 5 + (f.field === 'doc' ? 3 : 0)) % 12)),
	),
].sort((a, b) => a.frame - b.frame);

/** Big visual hits (flash + shockwave): the hard cut into the brand, drop 2, the final impact. */
export const HITS = [SCENE.C01.start, SCENE.C05.start, SCENE.C09.start] as const;
