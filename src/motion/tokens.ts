import {gsap} from 'gsap';
import {CustomEase} from 'gsap/CustomEase';
import {interpolate, spring, type SpringConfig} from 'remotion';
import {FPS} from '../timeline';

// Motion Design System: aggressive exponential Bézier curves and physical springs, no linear
// easing. GSAP names are the source of truth; `easeFn` exposes the same curves to interpolate().
gsap.registerPlugin(CustomEase);

/** Fast attack, long glide: panels, cards, camera settles. */
export const cubicExpoOut = CustomEase.create('cubicExpo', '0.16, 1, 0.3, 1');
/** Aggressive in-out snap: scene transitions, snap zooms, camera throws. */
export const cubicHardSnap = CustomEase.create('hardSnap', '0.85, 0, 0.15, 1');

/** spring(): fast pop-ins (≈8 % natural overshoot, settles in ~27 frames). */
export const springSnappy: Partial<SpringConfig> = {stiffness: 400, damping: 25, mass: 1};
/** spring(): slow, weighty settle (≈11 % overshoot, settles in ~48 frames). */
export const springHeavy: Partial<SpringConfig> = {stiffness: 200, damping: 20, mass: 1.5};

export const EASE = {
	cubicExpoOut: 'cubicExpo',
	cubicHardSnap: 'hardSnap',
	out: 'cubicExpo',
	inOut: 'hardSnap',
	whip: 'hardSnap',
	snap: 'back.out(1.7)',
	hit: 'power4.out',
	in: 'expo.in',
	soft: 'power2.out',
	softIn: 'power2.in',
	sine: 'sine.inOut',
} as const;

export type EaseName = keyof typeof EASE;

const cache = new Map<string, (t: number) => number>();
export const easeFn = (name: EaseName | string): ((t: number) => number) => {
	const key = name in EASE ? EASE[name as EaseName] : name;
	let fn = cache.get(key);
	if (!fn) {
		fn = gsap.parseEase(key) as (t: number) => number;
		cache.set(key, fn);
	}
	return fn;
};

const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Clamped interpolate between two times (seconds) with a named ease. */
export const tween = (t: number, t0: number, t1: number, from: number, to: number, ease: EaseName | string = 'out') =>
	interpolate(t, [t0, t1], [from, to], {...CLAMP, easing: easeFn(ease)});

/** 0..1 progress between two times with a named ease (defaults to cubicExpoOut). */
export const prog = (t: number, t0: number, t1: number, ease: EaseName | string = 'out') => tween(t, t0, t1, 0, 1, ease);

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Remotion spring driven by absolute video time (seconds); 0 before `at`. */
export const springAt = (t: number, at: number, config: Partial<SpringConfig> = springSnappy) => spring({frame: (t - at) * FPS, fps: FPS, config});

const SNAPPY_PEAK = Math.max(...Array.from({length: 60}, (_, f) => spring({frame: f, fps: FPS, config: springSnappy})));
/** Cascade Pop: springSnappy with its overshoot rescaled so the curve reads 0 → 1.05 → 1.0. */
export const popScale = (t: number, at: number) => {
	const s = springAt(t, at, springSnappy);
	return s <= 1 ? s : 1 + ((s - 1) * 0.05) / (SNAPPY_PEAK - 1);
};

/** Depth of field: Gaussian blur (px) for an apparent scale; the focal plane sits at scale 1. */
export const dofBlur = (scale: number, strength = 11, max = 18) => Math.min(max, strength * Math.abs(Math.log(Math.max(scale, 0.02))));

/** CSS filter for a DoF blur, omitted below 0.25 px so in-focus layers never pay for a filter. */
export const blurFilter = (px: number) => (px > 0.25 ? `blur(${px.toFixed(2)}px)` : undefined);
