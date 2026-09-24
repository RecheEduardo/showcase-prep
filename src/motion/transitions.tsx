import {CameraMotionBlur} from '@remotion/motion-blur';
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FPS, type SceneId} from '../timeline';
import {useSceneTime} from './scene';
import {blurFilter, dofBlur, tween} from './tokens';

// Transition vocabulary: hard cut (chaos → brand), SnapZoom (replaces the linear whips), card
// expand into navy, navy → ice inversion, flash cut. Every cut sits on a kick frame
// (scripts/verify.mjs e2) and every window is centred on the boundary: midpoint == next scene start.

export type TransitionKind = 'hardCut' | 'snapZoom' | 'cardExpand' | 'invert' | 'flashCut';

/** `frames` = half window. `origin` = neutral point the outgoing camera dives into (snapZoom). */
export type TransitionSpec = {at: number; from: SceneId; to: SceneId; kind: TransitionKind; frames: number; origin?: readonly [number, number]};

export const TRANSITIONS: TransitionSpec[] = [
	{at: 5, from: 'C00', to: 'C01', kind: 'hardCut', frames: 0},
	{at: 8, from: 'C01', to: 'C02', kind: 'snapZoom', frames: 10, origin: [960, 1000]},
	{at: 11, from: 'C02', to: 'C03', kind: 'snapZoom', frames: 10, origin: [600, 1000]},
	{at: 13, from: 'C03', to: 'C04', kind: 'cardExpand', frames: 27},
	{at: 17, from: 'C04', to: 'C05', kind: 'invert', frames: 30},
	{at: 23, from: 'C05', to: 'C06', kind: 'snapZoom', frames: 10, origin: [1840, 150]},
	{at: 26, from: 'C06', to: 'C07', kind: 'snapZoom', frames: 10, origin: [40, 1060]},
	{at: 28, from: 'C07', to: 'C08', kind: 'snapZoom', frames: 10, origin: [1300, 1000]},
	{at: 34, from: 'C08', to: 'C09', kind: 'flashCut', frames: 0},
];

export const inTransition = (id: SceneId) => TRANSITIONS.find((x) => x.to === id);
export const outTransition = (id: SceneId) => TRANSITIONS.find((x) => x.from === id);
/** Seconds a scene is mounted before its nominal start (no transition overlaps its predecessor). */
export const sceneLead = (_id: SceneId) => 0;
/** Seconds a scene stays mounted after its end: only the inversion keeps C04 under the growing circle. */
export const sceneTail = (id: SceneId) => {
	const out = outTransition(id);
	return out?.kind === 'invert' ? out.frames / FPS : 0;
};

/** SnapZoom: outgoing camera dives 1 → 3 into a neutral area on cubicHardSnap; incoming pulls 0.5 → 1. */
export const SNAP_ZOOM = {outScale: 3, inScale: 0.5} as const;

/** Inversion circle for C04 -> C05, born at the queue number. */
export const INVERT = {start: 17, end: 17.5, cx: 960, cy: 590, maxR: 2300};

const halfOf = (tr: TransitionSpec) => tr.frames / FPS;

const stageStyle = (id: SceneId, t: number): React.CSSProperties => {
	const tin = inTransition(id);
	const tout = outTransition(id);
	const style: React.CSSProperties = {};

	if (tin?.kind === 'snapZoom' && t >= tin.at && t <= tin.at + halfOf(tin)) {
		const s = tween(t, tin.at, tin.at + halfOf(tin), SNAP_ZOOM.inScale, 1, 'cubicExpoOut');
		style.scale = String(s);
		style.filter = blurFilter(dofBlur(s));
	}
	if (tin?.kind === 'invert') {
		if (t < INVERT.start) style.visibility = 'hidden';
		const r = tween(t, INVERT.start, INVERT.end, 0, INVERT.maxR, 'cubicExpoOut');
		if (t < INVERT.end) style.clipPath = `circle(${r}px at ${INVERT.cx}px ${INVERT.cy}px)`;
	}
	if (tout?.kind === 'snapZoom' && tout.origin && t >= tout.at - halfOf(tout)) {
		const s = tween(t, tout.at - halfOf(tout), tout.at, 1, SNAP_ZOOM.outScale, 'cubicHardSnap');
		style.scale = String(s);
		style.transformOrigin = `${tout.origin[0]}px ${tout.origin[1]}px`;
		style.filter = blurFilter(dofBlur(s) * 0.7);
	}
	if (tout && t >= tout.at + sceneTail(id)) style.visibility = 'hidden';
	return style;
};

const StageTransform: React.FC<{id: SceneId; children: React.ReactNode}> = ({id, children}) => {
	const t = useSceneTime();
	return <AbsoluteFill style={stageStyle(id, t)}>{children}</AbsoluteFill>;
};

/** Applies the scene's in/out transition; the SnapZoom dive also gets camera motion blur. */
export const SceneStage: React.FC<{id: SceneId; children: React.ReactNode}> = ({id, children}) => {
	const t = useSceneTime();
	const tout = outTransition(id);
	const inner = <StageTransform id={id}>{children}</StageTransform>;
	if (tout?.kind === 'snapZoom' && t >= tout.at - halfOf(tout) && t < tout.at) {
		return (
			<CameraMotionBlur samples={8} shutterAngle={180}>
				{inner}
			</CameraMotionBlur>
		);
	}
	return inner;
};
