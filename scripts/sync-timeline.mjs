// Generates src/data/scene-timeline.json (verbatim copy), src/data/cues.json (expanded,
// frame-quantized cues shared by the audio scripts) and src/timeline.ts from the single
// source of truth: ../data/scene-timeline.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const sourcePath = path.join(root, '..', 'data', 'scene-timeline.json');
const raw = fs.readFileSync(sourcePath, 'utf8');
const tl = JSON.parse(raw);

const FPS = tl._meta.fps;
const toFrame = (t) => Math.round(t * FPS);
const q = (t) => toFrame(t) / FPS;

// A minor pentatonic (MIDI). Ascending runs used by repeated melodic cues.
const PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88];
const midiName = (m) => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12] + (Math.floor(m / 12) - 1);

// Accelerating ticks: geometric gaps from ~0.25 s down to ~0.05 s, scaled so the last
// tick lands exactly on `until`. Frame-quantized and strictly increasing.
const acceleratingTimes = (start, until, count) => {
	const ratio = Math.pow(0.05 / 0.25, 1 / (count - 2));
	const gaps = Array.from({length: count - 1}, (_, i) => 0.25 * Math.pow(ratio, i));
	const total = gaps.reduce((a, b) => a + b, 0);
	const scale = (until - start) / total;
	const times = [start];
	let acc = start;
	for (const g of gaps) {
		acc += g * scale;
		times.push(acc);
	}
	let prevFrame = -1;
	return times.map((t, i) => {
		let f = i === times.length - 1 ? toFrame(until) : toFrame(t);
		if (f <= prevFrame) f = prevFrame + 1;
		prevFrame = f;
		return f / FPS;
	});
};

const melodicStart = (cue) => {
	if (cue.id === 'sfx.c02.tiles' || cue.id === 'sfx.c05.rows') return 3; // E4 upward: brighter for tiles/rows
	if (cue.id === 'sfx.c08.poly') return 0; // A3 upward
	return 5;
};

const expanded = [];
for (const cue of tl.sfx_cues) {
	const base = {
		parent: cue.id,
		kind: cue.kind,
		source: cue.source,
		gain_db: cue.gain_db,
		...(cue.dur !== undefined ? {dur: cue.dur} : {}),
		...(cue.pitch_semitones !== undefined ? {pitch_semitones: cue.pitch_semitones} : {}),
	};
	if (cue.curve === 'accelerating') {
		const times = acceleratingTimes(cue.t, cue.until, cue.count);
		times.forEach((t, i) => expanded.push({...base, id: `${cue.id}#${i}`, index: i, count: times.length, t, frame: toFrame(t)}));
		continue;
	}
	if (cue.repeat) {
		const {count, interval} = cue.repeat;
		const melodic = typeof cue.scale === 'string';
		for (let i = 0; i < count; i++) {
			const t = q(cue.t + i * interval);
			const extra = melodic ? {midi: PENTA[melodicStart(cue) + (i % (PENTA.length - melodicStart(cue)))]} : {};
			if (extra.midi !== undefined) extra.note = midiName(extra.midi);
			expanded.push({...base, ...extra, id: `${cue.id}#${i}`, index: i, count, t, frame: toFrame(t)});
		}
		continue;
	}
	expanded.push({...base, id: cue.id, t: q(cue.t), frame: toFrame(cue.t)});
}
expanded.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));

const scenes = tl.scenes.map((s) => ({
	id: s.id,
	name: s.name,
	start: s.start,
	end: s.end,
	startFrame: toFrame(s.start),
	endFrame: toFrame(s.end),
	durationInFrames: toFrame(s.end) - toFrame(s.start),
	provenance: s.provenance,
	illustrative: s.illustrative,
	labels: s.labels,
}));

// Kick map (macro pacing): every beat of a 'four' section, beats 1 and 3 of a 'half' section,
// nothing in 'none' sections or inside silence gaps. Bars are counted from beat_origin_seconds.
const ORIGIN = tl._meta.beat_origin_seconds ?? 0;
const BEAT = tl._meta.beat_seconds;
const gaps = tl.sfx_cues.filter((c) => c.kind === 'silence_gap').map((c) => [c.t, +(c.t + c.dur).toFixed(6)]);
const inGap = (t) => gaps.some(([a, b]) => t >= a - 1e-9 && t < b - 1e-9);
const kicks = [];
for (const sc of tl.music_sections) {
	if (!sc.kick || sc.kick === 'none') continue;
	const until = sc.kick_until ?? sc.end - 1e-9;
	for (let k = 0; ; k++) {
		const t = +(sc.start + k * BEAT).toFixed(6);
		if (t >= sc.end - 1e-9 || t > until + 1e-9) break;
		const beatIdx = Math.round((t - ORIGIN) / BEAT);
		if (beatIdx < 0 || inGap(t)) continue;
		const beatInBar = ((beatIdx % 4) + 4) % 4;
		if (sc.kick === 'half' && beatInBar % 2 !== 0) continue;
		kicks.push({t, frame: toFrame(t), downbeat: beatInBar === 0, section: sc.id});
	}
}

const labels = {};
for (const s of tl.scenes) for (const [k, v] of Object.entries(s.labels)) labels[k] = v;

const countdownCue = expanded.filter((c) => c.parent === 'sfx.c04.countdown');
const countdown = countdownCue.map((c, i) => ({
	t: c.t,
	frame: c.frame,
	value: Math.round(301 - (300 * i) / (countdownCue.length - 1)),
}));

const dataDir = path.join(root, 'src', 'data');
fs.mkdirSync(dataDir, {recursive: true});
fs.writeFileSync(path.join(dataDir, 'scene-timeline.json'), raw);
fs.writeFileSync(
	path.join(dataDir, 'cues.json'),
	JSON.stringify(
		{
			_generated_by: 'scripts/sync-timeline.mjs from ../data/scene-timeline.json',
			fps: FPS,
			sample_rate_hz: tl.mix_targets.sample_rate_hz,
			samples_per_frame: tl.mix_targets.sample_rate_hz / FPS,
			total_seconds: tl._meta.total_seconds,
			music_sections: tl.music_sections,
			mix_targets: tl.mix_targets,
			cues: expanded,
			kicks,
			countdown,
		},
		null,
		2,
	),
);

const ts = `// AUTO-GENERATED by scripts/sync-timeline.mjs from data/scene-timeline.json. Do not edit.
export const FPS = ${FPS};
export const BPM = ${tl._meta.bpm};
export const BEAT_FRAMES = ${tl._meta.beat_frames};
export const BAR_FRAMES = ${tl._meta.bar_frames};
export const TOTAL_SECONDS = ${tl._meta.total_seconds};
export const TOTAL_FRAMES = ${tl._meta.total_frames};
/** The musical grid starts here (C00 is off-grid); bar downbeats are BEAT_ORIGIN + 2k seconds. */
export const BEAT_ORIGIN = ${ORIGIN};
export const WIDTH = ${tl._meta.resolution[0]};
export const HEIGHT = ${tl._meta.resolution[1]};

/** Seconds -> frame (frame = round(t * FPS)). */
export const sec = (s: number) => Math.round(s * FPS);
/** Beats (quarter notes at ${tl._meta.bpm} BPM) -> frames. */
export const beat = (n: number) => n * BEAT_FRAMES;
/** Bars (4/4) -> frames. */
export const bar = (n: number) => n * BAR_FRAMES;

export type SceneId = ${scenes.map((s) => `'${s.id}'`).join(' | ')};
export type Scene = {
	id: SceneId;
	name: string;
	start: number;
	end: number;
	startFrame: number;
	endFrame: number;
	durationInFrames: number;
	provenance: string;
	illustrative: boolean;
	labels: Record<string, number>;
};

export const SCENES: Scene[] = ${JSON.stringify(scenes, null, '\t')};

export const SCENE: Record<SceneId, Scene> = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, Scene>;

export const LABELS = ${JSON.stringify(labels, null, '\t')} as const;
export type Label = keyof typeof LABELS;

/** Label time in seconds relative to the start of its scene (for GSAP positions). */
export const rel = (label: Label): number => {
	const sceneId = label.split('.')[0] as SceneId;
	return +(LABELS[label] - SCENE[sceneId].start).toFixed(6);
};
/** Label frame relative to the start of its scene. */
export const relFrame = (label: Label): number => sec(rel(label));
/** Absolute seconds relative to a scene start. */
export const relTo = (sceneId: SceneId, seconds: number): number => +(seconds - SCENE[sceneId].start).toFixed(6);

export type SfxCue = {
	id: string;
	parent: string;
	kind: string;
	source: string;
	gain_db?: number;
	t: number;
	frame: number;
	dur?: number;
	index?: number;
	count?: number;
	midi?: number;
	note?: string;
	pitch_semitones?: number;
};
export const SFX_CUES: SfxCue[] = ${JSON.stringify(expanded)};

/** C04 queue countdown: value shown from each tick onwards (ticks == audio cues). */
export const COUNTDOWN: {t: number; frame: number; value: number}[] = ${JSON.stringify(countdown)};

export const MUSIC_SECTIONS: {id: string; start: number; end: number; intensity: number}[] = ${JSON.stringify(
	tl.music_sections.map(({id, start, end, intensity}) => ({id, start, end, intensity})),
)};

/** Macro-pacing grid: one entry per kick of the music bed (frame-exact). */
export const KICKS: {t: number; frame: number; downbeat: boolean; section: string}[] = ${JSON.stringify(kicks)};
const KICK_FRAMES = new Set(KICKS.map((k) => k.frame));
/** True when absolute time t (seconds) lands exactly on a kick frame. */
export const onKick = (t: number) => KICK_FRAMES.has(sec(t));

export const DROPS = ${JSON.stringify(tl._meta.drops)} as const;
export const HITS = ${JSON.stringify(tl._meta.hits)} as const;
export const SILENCES = ${JSON.stringify(gaps)} as const;
`;
fs.writeFileSync(path.join(root, 'src', 'timeline.ts'), ts);
console.log(`timeline.ts: ${scenes.length} scenes, ${Object.keys(labels).length} labels, ${expanded.length} expanded cues, ${kicks.length} kicks, countdown ${countdown.length} ticks (${countdown[0].value} -> ${countdown.at(-1).value})`);
