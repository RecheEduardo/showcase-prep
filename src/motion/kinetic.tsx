import React from 'react';
import type {SpringConfig} from 'remotion';
import {FONT} from '../theme';
import {FPS} from '../timeline';
import {useSceneTime} from './scene';
import {blurFilter, lerp, prog, springAt, springSnappy} from './tokens';

// Kinetic typography (replaces the mask fade-in-up). Every glyph is a pure function of the scene
// time driven by Remotion springs:
//   pop   letters spring up from the baseline with alternating tilt   (unit: letter)
//   drop  letters fall from above and bounce on the baseline          (unit: letter)
//   fly   words shoot in from outside the frame (same side, so they never cross), speed-stretched
//   flip  words flip up in 3D around their baseline                   (unit: word)
//   slam  words hit the frame from 2.6x and rebound                   (unit: word)
// Variable weight: Plus Jakarta Sans is variable (200–800), so glyphs gain weight as they land.
// Each glyph sits in a slot sized by its FINAL weight, so the line never reflows while animating.
// Gradient words get a per-letter colour ramp that keeps flowing, plus a shine after landing.
// Every unit also racks focus: it enters blurred and sharpens as its spring lands, and blurs out
// again on the pop-out (blur-to-focus, like a lens pulling focus), so no text ever pops in hard.

export type KineticMode = 'pop' | 'drop' | 'fly' | 'flip' | 'slam';

export const PALETTE = {
	brand: ['#5fb0e6', '#2a8fd4', '#1c6fb5'],
	hero: ['#0078f4', '#0dbde4', '#57c5f4'],
	night: ['#bfe8ff', '#57c5f4', '#2a8fd4'],
	/** Darker blue ramp for gradient text that sits directly on the light ice background. */
	deep: ['#1a64c8', '#0f4a94', '#1c6fb5'],
} as const;

const bouncy: Partial<SpringConfig> = {stiffness: 170, damping: 11, mass: 1};
// Near-critical for flying words: a big overshoot would drive a word into its neighbour.
const heavy: Partial<SpringConfig> = {stiffness: 170, damping: 23, mass: 1.2};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: number[], b: number[], p: number) => a.map((v, i) => Math.round(v + (b[i] - v) * p));
/** Colour on a palette ramp at p (0..1, mirrored outside so a moving phase ping-pongs). */
const ramp = (stops: readonly string[], p: number) => {
	const m = ((p % 2) + 2) % 2;
	const x = (m > 1 ? 2 - m : m) * (stops.length - 1);
	const i = Math.min(stops.length - 2, Math.floor(x));
	return mix(hex(stops[i]), hex(stops[i + 1]), x - i);
};
const rgb = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Glyph = {ch: string; word: number; charInWord: number; global: number; gradIndex: number};

export const Kinetic: React.FC<{
	lines: readonly (readonly string[])[];
	at: number;
	mode: KineticMode;
	size: number;
	/** Frames between two units (letters or words, per mode). */
	step?: number;
	color?: string;
	/** Words from this global index on use the flowing gradient. */
	gradientFrom?: number;
	palette?: readonly string[];
	weight?: [number, number];
	/** Absolute time the pop-out starts (spring scale to 0, unit by unit). */
	exitAt?: number;
	align?: 'left' | 'center' | 'right';
	lineHeight?: number;
	letterSpacing?: string;
	shadow?: string;
	/** fly only: side the words come from. */
	from?: 'left' | 'right';
	style?: React.CSSProperties;
}> = ({lines, at, mode, size, step, color = '#0e2746', gradientFrom = Infinity, palette = PALETTE.brand, weight = [320, 800], exitAt, align = 'left', lineHeight = 1.02, letterSpacing = '-0.035em', shadow, from = 'right', style}) => {
	const t = useSceneTime();
	const perLetter = mode === 'pop' || mode === 'drop';
	const stepS = (step ?? (perLetter ? 1 : 3)) / FPS;

	let global = 0;
	let wordIdx = 0;
	let gradCount = 0;
	const built = lines.map((line) =>
		line.map((word) => {
			const w = wordIdx++;
			const glyphs: Glyph[] = [...word].map((ch, k) => ({ch, word: w, charInWord: k, global: global++, gradIndex: w >= gradientFrom ? gradCount++ : -1}));
			return {w, word, glyphs};
		}),
	);
	const gradTotal = Math.max(1, gradCount - 1);
	const unitsTotal = perLetter ? global : wordIdx;
	const landAt = at + unitsTotal * stepS + 0.35;

	// Words flying in from the left must be led by the LAST word, otherwise later words would cross
	// over the ones already landed; from the right, reading order never crosses.
	const order = (w: number) => (mode === 'fly' && from === 'left' ? unitsTotal - 1 - w : w);
	const unitSpring = (unit: number, cfg: Partial<SpringConfig>) => springAt(t, at + unit * stepS, cfg);
	const exitOf = (unit: number) => (exitAt === undefined ? 0 : springAt(t, exitAt + unit * (perLetter ? 0.6 : 2) / FPS, springSnappy));

	// Focus pull: blur is proportional to how far the unit still is from its landed state.
	const maxBlur = Math.min(20, Math.max(8, size * 0.14));
	const focus = (s: number, e: number) => blurFilter(maxBlur * (Math.max(0, 1 - clamp01(s)) + clamp01(e)));

	const glyphColor = (g: Glyph) => {
		if (g.gradIndex < 0) return color;
		const flow = Math.max(0, t - at) * 0.22;
		const base = ramp(palette, g.gradIndex / gradTotal + flow);
		const band = (t - landAt) / 0.7;
		const center = band * (gradCount + 6) - 3;
		const shine = band >= 0 && band <= 1 ? Math.max(0, 1 - Math.abs(g.gradIndex - center) / 2.4) : 0;
		return rgb(mix(base, [255, 255, 255], 0.65 * shine));
	};

	const wordStyle = (w: number): React.CSSProperties => {
		if (perLetter) return {};
		const cfg = mode === 'fly' ? heavy : springSnappy;
		const s = unitSpring(order(w), cfg);
		const e = exitOf(order(w));
		const out = Math.max(0, 1 - e);
		if (mode === 'fly') {
			const dir = from === 'left' ? -1 : 1;
			// Speed-driven smear: the faster the word travels, the more it stretches along its path.
			const speed = Math.abs(s - springAt(t - 1 / FPS, at + order(w) * stepS, cfg)) * FPS;
			const stretch = Math.min(0.55, speed * 0.09);
			return {transform: `translateX(${(dir * 1500 * (1 - s)).toFixed(1)}px) skewX(${(-dir * stretch * 22).toFixed(2)}deg) scale(${(1 + stretch) * out}, ${(1 - stretch * 0.3) * out})`, transformOrigin: '50% 80%', filter: focus(s, e)};
		}
		if (mode === 'flip') {
			return {transform: `translateY(${(30 * (1 - s)).toFixed(1)}px) rotateX(${(-100 * (1 - s)).toFixed(2)}deg) scale(${out})`, transformOrigin: '50% 100%', opacity: clamp01(s * 3) * clamp01(out * 3), filter: focus(s, e)};
		}
		// slam
		return {transform: `scale(${(lerp(2.6, 1, s) * out).toFixed(4)})`, transformOrigin: '50% 60%', opacity: clamp01(s * 4) * clamp01(out * 3), filter: focus(s, e)};
	};

	const glyphStyle = (g: Glyph): {slot: React.CSSProperties; weightNow: number} => {
		if (!perLetter) {
			const s = unitSpring(order(g.word), mode === 'fly' ? heavy : springSnappy);
			return {slot: {}, weightNow: lerp(weight[0], weight[1], clamp01(s))};
		}
		const s = unitSpring(g.global, mode === 'drop' ? bouncy : springSnappy);
		const e = exitOf(g.global);
		const out = Math.max(0, 1 - e);
		const tilt = (g.global % 2 === 0 ? -1 : 1) * 14;
		const transform =
			mode === 'pop'
				? `translate(-50%, ${(size * 0.6 * (1 - s)).toFixed(1)}px) rotate(${(tilt * (1 - s)).toFixed(2)}deg) scale(${(lerp(0.2, 1, s) * out).toFixed(4)})`
				: `translate(-50%, ${(-size * 1.4 * (1 - s)).toFixed(1)}px) rotate(${((tilt / 2) * (1 - s)).toFixed(2)}deg) scale(${out.toFixed(4)})`;
		return {slot: {transform, opacity: clamp01(s * 2.5) * clamp01(out * 3), filter: focus(s, e)}, weightNow: lerp(weight[0], weight[1], clamp01(s))};
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
				fontFamily: FONT,
				fontSize: size,
				lineHeight,
				letterSpacing,
				perspective: mode === 'flip' ? 900 : undefined,
				...style,
			}}
		>
			{built.map((line, li) => (
				<div key={li} style={{display: 'flex', columnGap: '0.26em', whiteSpace: 'nowrap', transformStyle: mode === 'flip' ? 'preserve-3d' : undefined}}>
					{line.map(({w, glyphs}) => (
						<span key={w} style={{display: 'inline-block', whiteSpace: 'nowrap', ...wordStyle(w)}}>
							{glyphs.map((g) => {
								const {slot, weightNow} = glyphStyle(g);
								return (
									<span key={g.global} style={{position: 'relative', display: 'inline-block'}}>
										<span style={{visibility: 'hidden', fontWeight: weight[1]}}>{g.ch}</span>
										<span
											style={{
												position: 'absolute',
												left: '50%',
												top: 0,
												whiteSpace: 'pre',
												fontWeight: Math.round(weightNow),
												color: glyphColor(g),
												textShadow: shadow,
												transform: perLetter ? undefined : 'translateX(-50%)',
												transformOrigin: '50% 100%',
												...slot,
											}}
										>
											{g.ch}
										</span>
									</span>
								);
							})}
						</span>
					))}
				</div>
			))}
		</div>
	);
};

/**
 * Focus pull for plain text blocks (labels, captions, footnotes): the block fades in while it
 * sharpens from a blur and rises a little; with `exitAt` it blurs and fades out again.
 */
export const FocusIn: React.FC<{at: number; dur?: number; exitAt?: number; rise?: number; blur?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
	at,
	dur = 0.5,
	exitAt,
	rise = 18,
	blur = 14,
	style,
	children,
}) => {
	const t = useSceneTime();
	const p = prog(t, at, at + dur, 'cubicExpoOut');
	const e = exitAt === undefined ? 0 : prog(t, exitAt, exitAt + dur * 0.7, 'softIn');
	return (
		<div style={{...style, opacity: clamp01(p * 1.6) * (1 - e), translate: `0px ${(rise * (1 - p) - rise * 0.5 * e).toFixed(2)}px`, filter: blurFilter(blur * (1 - p) + blur * e)}}>
			{children}
		</div>
	);
};
