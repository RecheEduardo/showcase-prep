import {useGsapTimeline, type GsapTimelineBuildContext} from '@remotion/gsap';
import React, {createContext, useContext} from 'react';
import {useCurrentFrame} from 'remotion';
import {FPS, LABELS, SCENE, type Label, type SceneId} from '../timeline';

// Each scene is mounted in a <Sequence> that starts `lead` seconds before the scene's start (so
// the entering half of a transition can render). Scene code works in LOCAL seconds: 0 is the
// first frame of the scene, DUR[id] its end (see src/pacing.ts); the lead is negative time.

type SceneClockValue = {id: SceneId; lead: number};
const SceneClockContext = createContext<SceneClockValue | null>(null);

export const SceneClock: React.FC<{id: SceneId; lead: number; children: React.ReactNode}> = ({id, lead, children}) => (
	<SceneClockContext.Provider value={{id, lead}}>{children}</SceneClockContext.Provider>
);

const useClock = () => {
	const ctx = useContext(SceneClockContext);
	if (!ctx) throw new Error('Scene components must be rendered inside <SceneClock>');
	return ctx;
};

/** Seconds since the start of the current scene (works inside Freeze / CameraMotionBlur). */
export const useSceneTime = (): number => {
	const frame = useCurrentFrame();
	const {lead} = useClock();
	return frame / FPS - lead;
};

/** Absolute video seconds (for layers that must stay continuous across scenes, e.g. the mesh). */
export const useVideoTime = (): number => {
	const {id} = useClock();
	return SCENE[id].start + useSceneTime();
};

export type SceneTimelineContext = GsapTimelineBuildContext<HTMLDivElement> & {
	/** Local scene seconds -> timeline position. */
	at: (localSeconds: number) => number;
	/** Label (+ optional offset in seconds) -> timeline position. */
	L: (label: Label, offset?: number) => number;
};

/**
 * One GSAP timeline per scene. Every label of the scene is registered with timeline.addLabel()
 * at (label + lead), so tweens can be placed with either `L('C05.sector1.click')` or `at(1.25)`.
 */
export const useSceneTimeline = (build: (ctx: SceneTimelineContext) => void) => {
	const {id, lead} = useClock();
	const scene = SCENE[id];
	return useGsapTimeline<HTMLDivElement>((ctx) => {
		const at = (local: number) => Math.max(0, +(local + lead).toFixed(6));
		const L = (label: Label, offset = 0) => at(LABELS[label] + offset);
		for (const [name, t] of Object.entries(scene.labels)) {
			ctx.timeline.addLabel(name, at(t));
		}
		build({...ctx, at, L});
	});
};
