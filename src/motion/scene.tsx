import {useGsapTimeline, type GsapTimelineBuildContext} from '@remotion/gsap';
import React, {createContext, useContext} from 'react';
import {useCurrentFrame} from 'remotion';
import {FPS, LABELS, SCENE, type Label, type SceneId} from '../timeline';

// Each scene is mounted in a <Sequence> that starts `lead` seconds before the scene's
// nominal start (so the entering half of a transition can render). The scene clock maps
// the Sequence-relative frame back to ABSOLUTE video seconds, which is what the JSON
// labels use. GSAP timelines are positioned in Sequence-local seconds via `at()`.

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

/** Absolute video time in seconds (works inside Freeze / CameraMotionBlur). */
export const useSceneTime = (): number => {
	const frame = useCurrentFrame();
	const {id, lead} = useClock();
	return SCENE[id].start - lead + frame / FPS;
};

export type SceneTimelineContext = GsapTimelineBuildContext<HTMLDivElement> & {
	/** Absolute seconds -> timeline position. */
	at: (absSeconds: number) => number;
	/** JSON label (+ optional offset in seconds) -> timeline position. */
	L: (label: Label, offset?: number) => number;
};

/**
 * One GSAP timeline per scene. Every JSON label of the scene is registered with
 * timeline.addLabel() at (label - scene.start + lead), so tweens can be placed with
 * either `L('C05.sector1.click')` or the label string itself.
 */
export const useSceneTimeline = (build: (ctx: SceneTimelineContext) => void) => {
	const {id, lead} = useClock();
	const scene = SCENE[id];
	return useGsapTimeline<HTMLDivElement>((ctx) => {
		const at = (abs: number) => +(abs - scene.start + lead).toFixed(6);
		const L = (label: Label, offset = 0) => at(LABELS[label] + offset);
		for (const [name, t] of Object.entries(scene.labels)) {
			ctx.timeline.addLabel(name, at(t));
		}
		build({...ctx, at, L});
	});
};
