import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FPS} from '../timeline';
import {useSceneTime} from './scene';
import {blurFilter, dofBlur, lerp, popScale, prog} from './tokens';

// Motion patterns shared by every scene. All of them are React-driven pure functions of the
// scene time, so they never fight the scene's GSAP timeline for the same element (DECISIONS D26).

export const PERSPECTIVE = 2000;
/** Stagger between two Cascade Pop items: 3 frames (50 ms). */
export const CASCADE_STEP = 3 / FPS;
/** Intermediate wrappers between an IsoStage and a Z-positioned child must keep the 3D context. */
export const PRESERVE_3D: React.CSSProperties = {transformStyle: 'preserve-3d'};

type RadiusChild = React.ReactNode | ((radius: number) => React.ReactNode);

const baseOpacity = (style?: React.CSSProperties) => (typeof style?.opacity === 'number' ? style.opacity : 1);

/**
 * UiPanelExpand: window/list entrance. scale 0.95 → 1, opacity 0 → 1 and border-radius
 * radius[0] → radius[1], all on cubicExpoOut. The live radius is handed to a render-prop child so
 * the card keeps drawing its own surface and shadow.
 */
export const UiPanelExpand: React.FC<{
	at: number;
	dur?: number;
	radius?: readonly [number, number];
	origin?: string;
	style?: React.CSSProperties;
	children: RadiusChild;
}> = ({at, dur = 0.7, radius = [30, 16], origin = '50% 50%', style, children}) => {
	const t = useSceneTime();
	const p = prog(t, at, at + dur, 'cubicExpoOut');
	const r = lerp(radius[0], radius[1], p);
	return (
		<div style={{...style, scale: String(lerp(0.95, 1, p)), opacity: baseOpacity(style) * prog(t, at, at + dur * 0.35, 'cubicExpoOut'), transformOrigin: origin}}>
			{typeof children === 'function' ? children(r) : children}
		</div>
	);
};

export const cascadeAt = (at: number, index: number, step = CASCADE_STEP) => at + index * step;

/** Cascade Pop: item `index` pops on springSnappy (scale 0 → 1.05 → 1), `step` after the previous one. */
export const CascadePop: React.FC<{
	at: number;
	index: number;
	step?: number;
	origin?: string;
	style?: React.CSSProperties;
	children: React.ReactNode;
}> = ({at, index, step, origin = '50% 50%', style, children}) => {
	const t = useSceneTime();
	const s = popScale(t, cascadeAt(at, index, step));
	return <div style={{...style, scale: String(s), opacity: s > 0.002 ? baseOpacity(style) : 0, transformOrigin: origin}}>{children}</div>;
};

/**
 * Isometric camera. A perspective box (2000 px) around a preserve-3d stage whose rotateX / rotateY
 * belong to the scene's GSAP timeline (target `[data-iso="<name>"]`). React never styles the
 * stage's transform. `style` goes on the outer perspective box (e.g. a React-driven shake).
 */
export const IsoStage: React.FC<{name: string; origin?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({name, origin = '50% 50%', style, children}) => (
	<AbsoluteFill style={{perspective: PERSPECTIVE, perspectiveOrigin: origin, ...style}}>
		<AbsoluteFill data-iso={name} style={{...PRESERVE_3D, transformOrigin: origin}}>
			{children}
		</AbsoluteFill>
	</AbsoluteFill>
);

/** Apparent scale of a layer at depth z (px, + toward the lens) inside an IsoStage. */
export const depthScale = (z: number) => PERSPECTIVE / (PERSPECTIVE - z);

/**
 * Static depth plate (background or foreground): pushed to `z` and size-compensated so the layout
 * is unchanged, blurred by its distance to the focal plane. Gives real parallax against the
 * in-focus UI whenever the IsoStage rotates. Must sit directly in the stage (or a PRESERVE_3D wrapper).
 */
export const ZPlane: React.FC<{z: number; opacity?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({z, opacity = 1, style, children}) => (
	<AbsoluteFill
		style={{
			...style,
			transform: `translateZ(${z}px) scale(${(1 / depthScale(z)).toFixed(5)})`,
			filter: blurFilter(dofBlur(depthScale(z))),
			opacity,
		}}
	>
		{children}
	</AbsoluteFill>
);

/**
 * Background drift: event fragments (photos, tickets, price tags) parked BEHIND the UI at negative
 * depth. Only these carry depth-of-field blur, so nothing in the foreground is ever softened.
 * Each item glides across its window on a sine ease with a slow bob; the IsoStage rotation adds
 * real parallax. Must sit directly in the stage (or a PRESERVE_3D wrapper), before the UI.
 */
export type DriftItem = {x: number; y: number; z: number; drift?: readonly [number, number]; node: React.ReactNode};

export const BackdropDrift: React.FC<{items: readonly DriftItem[]; from: number; to: number; opacity?: number}> = ({items, from, to, opacity = 0.6}) => {
	const t = useSceneTime();
	const travel = prog(t, from, to, 'sine') - 0.5;
	const fadeIn = prog(t, from, from + 0.4, 'soft');
	return (
		<>
			{items.map((it, i) => {
				const [dx, dy] = it.drift ?? [0, 0];
				const bob = Math.sin((t - from) * 1.3 + i * 1.7) * 10;
				const k = depthScale(it.z);
				// Size AND position are compensated for the perspective (origin at the frame centre),
				// so the item lands where it is authored instead of being pulled toward the centre.
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: 960 + (it.x + dx * travel - 960) / k,
							top: 540 + (it.y + dy * travel + bob - 540) / k,
							transform: `translate(-50%, -50%) translateZ(${it.z}px) scale(${(1 / k).toFixed(4)})`,
							filter: blurFilter(dofBlur(k, 18)),
							opacity: opacity * fadeIn,
						}}
					>
						{it.node}
					</div>
				);
			})}
		</>
	);
};
