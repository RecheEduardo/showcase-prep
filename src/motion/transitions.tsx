import {CameraMotionBlur} from '@remotion/motion-blur';
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FPS, SCENE, type SceneId} from '../timeline';
import {useSceneRealTime} from './scene';
import {blurFilter, dofBlur, tween} from './tokens';

// Transition vocabulary: hard cut (chaos → brand), SnapZoom, card expand into navy, navy → ice
// inversion, blurred cross-fade and flash cut. Every window is centred on the scene boundary, whose
// time comes from src/pacing.ts, so changing a duration moves its transitions with it. Transitions
// run on REAL time (their length never stretches); scene content runs on the design clock.

export type TransitionKind = 'hardCut' | 'snapZoom' | 'cardExpand' | 'invert' | 'fade' | 'flashCut';

/** `frames` = half window. `origin` = neutral point the outgoing camera dives into (snapZoom). */
export type TransitionSpec = {from: SceneId; to: SceneId; kind: TransitionKind; frames: number; origin?: readonly [number, number]};

export const TRANSITIONS: TransitionSpec[] = [
	{from: 'C00', to: 'C01', kind: 'hardCut', frames: 0},
	{from: 'C01', to: 'C02', kind: 'snapZoom', frames: 10, origin: [960, 1000]},
	{from: 'C02', to: 'C03', kind: 'snapZoom', frames: 10, origin: [600, 1000]},
	{from: 'C03', to: 'C04', kind: 'cardExpand', frames: 27},
	{from: 'C04', to: 'C05', kind: 'invert', frames: 30},
	{from: 'C05', to: 'C06', kind: 'fade', frames: 18},
	{from: 'C06', to: 'C07', kind: 'snapZoom', frames: 10, origin: [40, 1060]},
	{from: 'C07', to: 'C08', kind: 'snapZoom', frames: 10, origin: [1300, 1000]},
	{from: 'C08', to: 'C09', kind: 'flashCut', frames: 0},
];

/** Absolute time of a transition = start of the incoming scene. */
export const transitionAt = (tr: TransitionSpec) => SCENE[tr.to].start;
export const inTransition = (id: SceneId) => TRANSITIONS.find((x) => x.to === id);
export const outTransition = (id: SceneId) => TRANSITIONS.find((x) => x.from === id);
const halfOf = (tr: TransitionSpec) => tr.frames / FPS;

/** Seconds a scene is mounted before its start: only a cross-fade overlaps its predecessor. */
export const sceneLead = (id: SceneId) => {
	const tin = inTransition(id);
	return tin?.kind === 'fade' ? halfOf(tin) : 0;
};
/** Seconds a scene stays mounted after its end (under the inversion circle / the cross-fade). */
export const sceneTail = (id: SceneId) => {
	const out = outTransition(id);
	return out?.kind === 'invert' || out?.kind === 'fade' ? halfOf(out) : 0;
};

/** SnapZoom: outgoing camera dives 1 → 3 into a neutral area on cubicHardSnap; incoming pulls 0.5 → 1. */
export const SNAP_ZOOM = {outScale: 3, inScale: 0.5} as const;

/** Inversion circle C04 -> C05, born at the queue number (real seconds local to C05). */
export const INVERT = {start: 0, end: 0.5, cx: 960, cy: 590, maxR: 2300};

/** Blurred cross-fade: opacity and blur (px) at local time t for the entering/leaving scene. */
const FADE_BLUR = 16;

const stageStyle = (id: SceneId, t: number): React.CSSProperties => {
	const tin = inTransition(id);
	const tout = outTransition(id);
	const end = SCENE[id].duration;
	const style: React.CSSProperties = {};
	let blur = 0;

	if (tin?.kind === 'snapZoom' && t >= 0 && t <= halfOf(tin)) {
		const s = tween(t, 0, halfOf(tin), SNAP_ZOOM.inScale, 1, 'cubicExpoOut');
		style.scale = String(s);
		blur = dofBlur(s);
	}
	if (tin?.kind === 'invert') {
		if (t < INVERT.start) style.visibility = 'hidden';
		const r = tween(t, INVERT.start, INVERT.end, 0, INVERT.maxR, 'cubicExpoOut');
		if (t < INVERT.end) style.clipPath = `circle(${r}px at ${INVERT.cx}px ${INVERT.cy}px)`;
	}
	if (tin?.kind === 'fade' && t < halfOf(tin)) {
		const p = tween(t, -halfOf(tin), halfOf(tin), 0, 1, 'inOut');
		style.opacity = p;
		blur = Math.max(blur, FADE_BLUR * (1 - p));
	}
	if (tout?.kind === 'snapZoom' && tout.origin && t >= end - halfOf(tout)) {
		const s = tween(t, end - halfOf(tout), end, 1, SNAP_ZOOM.outScale, 'cubicHardSnap');
		style.scale = String(s);
		style.transformOrigin = `${tout.origin[0]}px ${tout.origin[1]}px`;
		blur = Math.max(blur, dofBlur(s) * 0.7);
	}
	if (tout?.kind === 'fade' && t > end - halfOf(tout)) {
		const p = tween(t, end - halfOf(tout), end + halfOf(tout), 0, 1, 'inOut');
		style.opacity = 1 - p;
		blur = Math.max(blur, FADE_BLUR * p);
	}
	style.filter = blurFilter(blur);
	if (tout && t >= end + sceneTail(id)) style.visibility = 'hidden';
	return style;
};

const StageTransform: React.FC<{id: SceneId; children: React.ReactNode}> = ({id, children}) => {
	const t = useSceneRealTime();
	return <AbsoluteFill style={stageStyle(id, t)}>{children}</AbsoluteFill>;
};

/** Applies the scene's in/out transition; the SnapZoom dive also gets camera motion blur. */
export const SceneStage: React.FC<{id: SceneId; children: React.ReactNode}> = ({id, children}) => {
	const t = useSceneRealTime();
	const tout = outTransition(id);
	const inner = <StageTransform id={id}>{children}</StageTransform>;
	if (tout?.kind === 'snapZoom' && t >= SCENE[id].duration - halfOf(tout) && t < SCENE[id].duration) {
		return (
			<CameraMotionBlur samples={8} shutterAngle={180}>
				{inner}
			</CameraMotionBlur>
		);
	}
	return inner;
};
