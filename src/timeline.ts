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
// AUDIO PLAN — every sound cue and every music section is anchored to the SAME labels and design
// clocks as the animation, then converted to real video time with the scene's stretch. So when a
// duration changes in src/pacing.ts, `npm run audio` re-renders music + SFX in sync with the new cut
// (scripts/audio/cues.mjs writes src/data/cues.json from this plan).

export type SfxCue = {
	id: string;
	parent: string;
	kind: string;
	source: string;
	scene: SceneId;
	/** Real video seconds / frame of the cue onset. */
	t: number;
	frame: number;
	gain_db: number;
	/** Real length in seconds for sustained kinds (riser, swell, roll, silence gap…). */
	dur?: number;
	index?: number;
	count?: number;
	midi?: number;
	pitch_semitones?: number;
};

/** A minor pentatonic (MIDI), ascending runs for the melodic cue repeats. */
const PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88];
/** Frames a SnapZoom / whip out-transition lasts before the cut (real time, like the transition). */
const OUT_WHOOSH = 10 / FPS;
const CUSTOM = 'custom';
const WHIP = 'remotion-sfx:whip|whoosh';

type CueOpts = {source?: string; dur?: number; real?: boolean; index?: number; count?: number; midi?: number; pitch?: number};
const realOf = (scene: SceneId, local: number) => SCENE[scene].start + local * SCENE[scene].stretch;
/** One cue at `local` design seconds of `scene` (or real seconds with `real: true`). `dur` is design seconds unless `real`. */
const cue = (scene: SceneId, id: string, kind: string, local: number, gain_db: number, o: CueOpts = {}): SfxCue => {
	const tReal = o.real ? SCENE[scene].start + local : realOf(scene, local);
	const frame = sec(tReal);
	// The end is quantized to a frame too, so a silence gap ends exactly on the cut (never past it).
	const dur = o.dur === undefined ? undefined : +((sec(tReal + (o.real ? o.dur : o.dur * SCENE[scene].stretch)) - frame) / FPS).toFixed(6);
	return {
		id: o.index === undefined ? id : `${id}#${o.index}`,
		parent: id,
		kind,
		source: o.source ?? CUSTOM,
		scene,
		t: frame / FPS,
		frame,
		gain_db,
		...(dur !== undefined ? {dur} : {}),
		...(o.index !== undefined ? {index: o.index, count: o.count} : {}),
		...(o.midi !== undefined ? {midi: o.midi} : {}),
		...(o.pitch !== undefined ? {pitch_semitones: o.pitch} : {}),
	};
};
/** `count` repeats `step` design seconds apart; melodic runs climb the pentatonic from `from`. */
const run = (scene: SceneId, id: string, kind: string, at: number, gain_db: number, count: number, step: number, from?: number) =>
	Array.from({length: count}, (_, i) => cue(scene, id, kind, at + i * step, gain_db, {index: i, count, ...(from !== undefined ? {midi: PENTA[from + (i % (PENTA.length - from))]} : {})}));
/** Whoosh that leads the SnapZoom out of a scene (real time before the cut). */
const outWhoosh = (scene: SceneId) => cue(scene, `sfx.${scene.toLowerCase()}.out`, 'whoosh', SCENE[scene].duration - OUT_WHOOSH, -8, {source: WHIP, real: true});
const lastReal = (scene: SceneId, seconds: number) => SCENE[scene].duration - seconds;
const STEP = 3 / FPS; // Cascade Pop stagger (design seconds)
const L_ = LABELS;

export const SFX_CUES: SfxCue[] = [
	// C00 — chaos: drone, dead click, one tick per error dialog, riser into the freeze, total silence.
	cue('C00', 'sfx.c00.drone', 'sub_swell', 0, -20, {dur: L_['C00.agitation.start']}),
	cue('C00', 'sfx.c00.deadclick', 'click', L_['C00.stall.click'], -14),
	...C00_ERRORS.map((t, i) => cue('C00', 'sfx.c00.errors', 'tick', t, -14, {index: i, count: C00_ERRORS.length})),
	cue('C00', 'sfx.c00.riser', 'riser', L_['C00.agitation.start'], -12, {dur: L_['C00.freeze'] - L_['C00.agitation.start']}),
	cue('C00', 'sfx.c00.gap', 'silence_gap', L_['C00.freeze'], 0, {dur: DUR.C00 - L_['C00.freeze']}),
	// C01 — hard cut into the brand.
	cue('C01', 'sfx.drop1.impact', 'impact_big', 0, -4),
	cue('C01', 'sfx.c01.float', 'whoosh_up', 0.25, -14),
	...run('C01', 'sfx.c01.tagline', 'tick_soft', L_['C01.tagline.cascade'], -18, 6, 0.05),
	outWhoosh('C01'),
	// C02 — categories.
	cue('C02', 'sfx.c02.in', 'impact_soft', 0, -12),
	...run('C02', 'sfx.c02.tiles', 'blip_pop', L_['C02.tiles.cascade.start'], -14, 10, STEP, 3),
	outWhoosh('C02'),
	// C03 — event page; the click comes first, then the card's ping.
	cue('C03', 'sfx.c03.in', 'impact_soft', 0, -12),
	cue('C03', 'sfx.c03.panel', 'whoosh_soft', L_['C03.panel.expand'], -14),
	cue('C03', 'sfx.c03.click', 'click', L_['C03.datecard.click'], -8),
	cue('C03', 'sfx.c03.ping', 'chime_ping', L_['C03.datecard.click'] + 0.06, -14),
	cue('C03', 'sfx.c03.out', 'whoosh', L_['C03.card.open'], -6, {source: 'remotion-sfx:whoosh|custom'}),
	// C04 — queue: heartbeat hit, one tick per countdown value, riser + roll, stop-time silence.
	cue('C04', 'sfx.c04.thud', 'sub_hit', 0, -8),
	...COUNTDOWN.map((c, i) => cue('C04', 'sfx.c04.countdown', 'tick', c.t, -18, {index: i, count: COUNTDOWN.length})),
	cue('C04', 'sfx.c04.riser', 'riser', L_['C04.lean'], -12, {dur: DUR.C04 - L_['C04.lean']}),
	cue('C04', 'sfx.c04.roll', 'snare_roll', L_['C04.roll'], -12, {dur: L_['C04.stoptime'] - L_['C04.roll']}),
	cue('C04', 'sfx.c04.stoptime', 'silence_gap', L_['C04.stoptime'], 0, {dur: DUR.C04 - L_['C04.stoptime']}),
	// C05 — drop 2: the stadium lights up, two sector picks.
	cue('C05', 'sfx.drop2.impact', 'impact_huge', 0, -3),
	cue('C05', 'sfx.drop2.chime', 'chime_success', 0, -10),
	...run('C05', 'sfx.c05.rows', 'blip_pop', L_['C05.rows.cascade'], -16, 4, STEP, 3),
	cue('C05', 'sfx.c05.click1', 'click', L_['C05.sector1.click'], -8),
	cue('C05', 'sfx.c05.fill1', 'swell_fill', L_['C05.sector1.fill'], -12, {dur: 0.6, pitch: 0}),
	cue('C05', 'sfx.c05.tip1', 'pop', L_['C05.tooltip1'], -14),
	cue('C05', 'sfx.c05.click2', 'click', L_['C05.sector2.click'], -8),
	cue('C05', 'sfx.c05.fill2', 'swell_fill', L_['C05.sector2.fill'], -12, {dur: 0.6, pitch: 3}),
	cue('C05', 'sfx.c05.tip2', 'pop', L_['C05.tooltip2'], -14),
	cue('C05', 'sfx.c05.out', 'whoosh_soft', lastReal('C05', 0.3), -12, {real: true}),
	// C06 — quantity and total.
	cue('C06', 'sfx.c06.appear', 'pop', L_['C06.counter.appear'], -12),
	cue('C06', 'sfx.c06.plus1', 'click', L_['C06.plus1'], -8),
	cue('C06', 'sfx.c06.roll1', 'counter_roll', L_['C06.plus1'], -18, {dur: 0.4}),
	cue('C06', 'sfx.c06.plus2', 'click', L_['C06.plus2'], -8),
	cue('C06', 'sfx.c06.roll2', 'counter_roll', L_['C06.plus2'], -18, {dur: 0.4}),
	cue('C06', 'sfx.c06.total', 'whoosh_up', L_['C06.total.card'], -10),
	cue('C06', 'sfx.c06.shine', 'shine', L_['C06.cta.shine'], -12),
	outWhoosh('C06'),
	// C07 — checkout: typing ticks stay out of the master for now; a pop per finished ticket.
	cue('C07', 'sfx.c07.in', 'impact_small', 0, -8),
	cue('C07', 'sfx.c07.slide', 'whoosh', L_['C07.card.slide'], -10, {source: WHIP}),
	...C07_TYPING.filter((f) => f.field === 'doc').map((f) => cue('C07', 'sfx.c07.done', 'pop', f.end + 0.05, -16, {index: f.holder, count: 2})),
	outWhoosh('C07'),
	// C08 — organizer: list pops, one pluck per lit block, the turn, board cards, two approvals, build.
	cue('C08', 'sfx.c08.swap', 'impact_small', 0, -6),
	...run('C08', 'sfx.c08.list', 'blip_pop', L_['C08.list.cascade'] + 0.05, -16, 4, STEP, 3),
	...C08_POLYS.map((t, i) => cue('C08', 'sfx.c08.poly', 'pluck_note', t, -14, {index: i, count: C08_POLYS.length, midi: PENTA[i % PENTA.length]})),
	cue('C08', 'sfx.c08.turn', 'whoosh', L_['C08.turn'], -8, {source: 'remotion-sfx:whoosh|custom'}),
	...[0, 1, 2, 3].map((k) => cue('C08', 'sfx.c08.card', 'whoosh_soft', L_['C08.cards.slide'] + k * 0.15, -16, {index: k, count: 4})),
	cue('C08', 'sfx.c08.approved1', 'check_ding', L_['C08.approved1'] + 0.18, -10),
	cue('C08', 'sfx.c08.approved2', 'check_ding', L_['C08.approved2'] + 0.18, -10),
	cue('C08', 'sfx.c08.riser', 'riser', lastReal('C08', 1), -12, {dur: 1, real: true}),
	cue('C08', 'sfx.c08.roll', 'snare_roll', lastReal('C08', 0.5), -14, {dur: 0.45, real: true}),
	// C09 — final impact, closing line, CTA, pop-out and the lockup landing.
	cue('C09', 'sfx.c09.impact', 'impact_huge', 0, -3),
	...run('C09', 'sfx.c09.reveal', 'tick_soft', L_['C09.copy.reveal'], -18, 6, 0.05),
	cue('C09', 'sfx.c09.shine', 'shine', L_['C09.cta.shine'], -10),
	cue('C09', 'sfx.c09.click', 'click', L_['C09.cta.click'], -12),
	cue('C09', 'sfx.c09.pulse', 'chime_ping', L_['C09.cta.pulse1'], -16),
	cue('C09', 'sfx.c09.outro', 'whoosh_up', L_['C09.outro.pop'], -8),
	cue('C09', 'sfx.end.ding', 'chime_ping', L_['C09.logo.hero'], -12, {dur: 1.5, real: false}),
	// Typing (muted in the master; the Remotion SFX layer can play it, see src/audio.tsx).
	...C07_TYPING.flatMap((f) =>
		Array.from({length: f.chars}, (_, k) => cue('C07', `sfx.c07.type.${f.holder}.${f.field}`, 'key_tick', f.start + k * KEY_STEP, -18, {index: (f.holder * 7 + k * 5 + (f.field === 'doc' ? 3 : 0)) % 12, count: 12})),
	).map((c, i) => ({...c, id: `${c.parent}#${i}`})),
].sort((a, b) => a.frame - b.frame || a.id.localeCompare(b.id));

/** Kinds the offline master leaves out (kept in SFX_CUES for the Remotion layer). */
export const MASTER_MUTED_KINDS = ['key_tick'] as const;

/**
 * Music sections (real seconds), one arrangement block per scene range. The synth adapts every
 * block to its actual length (grid, chords and automation restart at each section start, so every
 * cut lands on a kick). `hold` is where the finale's last chord is struck (the lockup's pop-out).
 */
export type MusicSection = {id: string; start: number; end: number; intensity: number};
const TAIL = 1;
export const MUSIC_SECTIONS: MusicSection[] = [
	{id: 'intro', start: SCENE.C00.start, end: SCENE.C00.end, intensity: 2},
	{id: 'drop1', start: SCENE.C01.start, end: SCENE.C02.end, intensity: 4},
	{id: 'groove_lift', start: SCENE.C03.start, end: SCENE.C03.end, intensity: 3},
	{id: 'breakdown', start: SCENE.C04.start, end: SCENE.C04.end, intensity: 1},
	{id: 'drop2', start: SCENE.C05.start, end: SCENE.C05.end, intensity: 5},
	{id: 'groove_rise', start: SCENE.C06.start, end: SCENE.C06.end, intensity: 4},
	{id: 'microdrop', start: SCENE.C07.start, end: SCENE.C07.end, intensity: 4},
	{id: 'swap', start: SCENE.C08.start, end: SCENE.C08.end, intensity: 4},
	{id: 'finale', start: SCENE.C09.start, end: +(SCENE.C09.end - TAIL).toFixed(6), intensity: 5},
	{id: 'tail', start: +(SCENE.C09.end - TAIL).toFixed(6), end: SCENE.C09.end, intensity: 1},
];
/** Finale anchor: the held chord lands with the lockup's pop-out (real seconds). */
export const MUSIC_ANCHORS = {finaleHold: +realOf('C09', L_['C09.outro.pop']).toFixed(6)};

/** Big visual hits (flash + shockwave): the hard cut into the brand, drop 2, the final impact. */
export const HITS = [SCENE.C01.start, SCENE.C05.start, SCENE.C09.start] as const;
