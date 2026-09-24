import {gsap} from 'gsap';
import React, {createContext, useContext, useLayoutEffect, useRef} from 'react';
import {useCurrentFrame} from 'remotion';
import {FPS, LABELS, SCENE, type Label, type SceneId} from '../timeline';

// Each scene is mounted in a <Sequence> that starts `lead` REAL seconds before the scene's start
// (so the entering half of a transition can render). Scene code works on the scene's DESIGN clock
// (src/timeline.ts): 0 is the first frame of the scene, DUR[id] its end, and the clock runs
// `stretch = PACING[id] / base` times slower than real time, so changing a duration in
// src/pacing.ts stretches every action point and animation of the scene proportionally.

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

/** REAL seconds since the start of the current scene (transitions live on this clock). */
export const useSceneRealTime = (): number => {
	const frame = useCurrentFrame();
	const {lead} = useClock();
	return frame / FPS - lead;
};

/** DESIGN seconds since the start of the current scene (all scene animation uses this clock). */
export const useSceneTime = (): number => {
	const {id} = useClock();
	return useSceneRealTime() / SCENE[id].stretch;
};

/** Absolute video seconds (for layers that must stay continuous across scenes, e.g. the mesh). */
export const useVideoTime = (): number => {
	const {id} = useClock();
	return SCENE[id].start + useSceneRealTime();
};

export type SceneTimelineContext = {
	timeline: gsap.core.Timeline;
	scope: HTMLDivElement;
	selector: (query: string) => Element[];
	/** Local design seconds -> timeline position. */
	at: (localSeconds: number) => number;
	/** Label (+ optional offset in design seconds) -> timeline position. */
	L: (label: Label, offset?: number) => number;
};

/**
 * One paused GSAP timeline per scene, authored in design seconds and driven by the scene's design
 * clock (so it stretches with PACING like everything else). Deterministic: every frame seeks the
 * timeline from 0 to the current time; no ticker, no playback. Labels are registered with
 * timeline.addLabel(), so tweens can be placed with `L('C05.sector1.click')` or `at(1.25)`.
 */
export const useSceneTimeline = (build: (ctx: SceneTimelineContext) => void) => {
	const {id, lead} = useClock();
	const scene = SCENE[id];
	// Timeline time = design time + the lead converted to design seconds (positions stay >= 0).
	const offset = lead / scene.stretch;
	const time = Math.max(0, useSceneTime() + offset);
	const scopeRef = useRef<HTMLDivElement>(null);
	const tlRef = useRef<gsap.core.Timeline | null>(null);
	const timeRef = useRef(time);
	timeRef.current = time;
	const buildRef = useRef(build);
	buildRef.current = build;

	useLayoutEffect(() => {
		const scope = scopeRef.current;
		if (!scope) return;
		const ctx = gsap.context(() => {
			const timeline = gsap.timeline({paused: true});
			const at = (local: number) => Math.max(0, +(local + offset).toFixed(6));
			const L = (label: Label, extra = 0) => at(LABELS[label] + extra);
			for (const [name, t] of Object.entries(scene.labels)) timeline.addLabel(name, at(t));
			buildRef.current({timeline, scope, selector: gsap.utils.selector(scope), at, L});
			tlRef.current = timeline;
		}, scope);
		tlRef.current?.totalTime(0, true).totalTime(timeRef.current, true);
		return () => {
			tlRef.current = null;
			ctx.revert();
		};
	}, [offset, scene]);

	useLayoutEffect(() => {
		tlRef.current?.totalTime(0, true).totalTime(time, true);
	}, [time]);

	return scopeRef;
};
