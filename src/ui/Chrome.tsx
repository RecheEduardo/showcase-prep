import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CLEAN_BACKGROUND} from '../theme';
import {FPS} from '../timeline';

// Frame chrome with every slideshow artefact removed (no brand lockup, no section pill). What is
// left is the backdrop: a light ice gradient of the app palette with a living mesh on top, blue
// and white pools that drift on slow Lissajous orbits (15–26 s periods) and breathe, so their
// overlaps keep mixing and swapping. Soft by construction (radial gradients, no filter). On top, a
// faint blue dot grid (masked to fade out toward the edges, drifting very slowly) gives the empty
// space a surface, and a soft blue vignette frames the shot.

type Pool = {x: number; y: number; r: number; color: string; ax: number; ay: number; px: number; py: number; phase: number};

const POOLS: Pool[] = [
	{x: 300, y: 200, r: 820, color: 'rgba(95,176,230,0.38)', ax: 260, ay: 160, px: 19, py: 23, phase: 0},
	{x: 1620, y: 160, r: 900, color: 'rgba(42,143,212,0.24)', ax: 240, ay: 180, px: 23, py: 17, phase: 1.4},
	{x: 1500, y: 900, r: 860, color: 'rgba(143,205,245,0.42)', ax: 280, ay: 150, px: 17, py: 26, phase: 2.6},
	{x: 360, y: 940, r: 760, color: 'rgba(28,111,181,0.16)', ax: 200, ay: 140, px: 25, py: 19, phase: 3.9},
	{x: 980, y: 520, r: 780, color: 'rgba(255,255,255,0.85)', ax: 420, ay: 200, px: 21, py: 15, phase: 0.8},
	{x: 1750, y: 560, r: 620, color: 'rgba(255,255,255,0.7)', ax: 220, ay: 260, px: 16, py: 22, phase: 5.1},
	{x: 150, y: 560, r: 600, color: 'rgba(255,255,255,0.65)', ax: 180, ay: 240, px: 24, py: 18, phase: 2.1},
];

/** `t` = absolute video seconds; pass it when rendering inside a Sequence so the mesh stays in sync. */
export const Chrome: React.FC<{t?: number}> = ({t: tAbs}) => {
	const frame = useCurrentFrame();
	const t = tAbs ?? frame / FPS;
	return (
		<AbsoluteFill style={{background: CLEAN_BACKGROUND, overflow: 'hidden'}}>
			{POOLS.map((p, i) => {
				const cx = p.x + p.ax * Math.sin((2 * Math.PI * t) / p.px + p.phase);
				const cy = p.y + p.ay * Math.cos((2 * Math.PI * t) / p.py + p.phase * 0.7);
				const breathe = 1 + 0.1 * Math.sin((2 * Math.PI * t) / (p.px * 0.6) + p.phase);
				const r = p.r * breathe;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: cx - r,
							top: cy - r,
							width: r * 2,
							height: r * 2,
							borderRadius: '50%',
							background: `radial-gradient(closest-side, ${p.color}, rgba(255,255,255,0) 100%)`,
						}}
					/>
				);
			})}
			<AbsoluteFill
				style={{
					backgroundImage: 'radial-gradient(circle, rgba(28,111,181,0.2) 1.7px, rgba(28,111,181,0) 2.2px)',
					backgroundSize: '46px 46px',
					backgroundPosition: `${(t * 6).toFixed(2)}px ${(t * 3).toFixed(2)}px`,
					maskImage: 'radial-gradient(ellipse 62% 58% at 50% 46%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)',
					WebkitMaskImage: 'radial-gradient(ellipse 62% 58% at 50% 46%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)',
				}}
			/>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 75% at 50% 50%, rgba(28,111,181,0) 55%, rgba(28,111,181,0.14) 100%)'}} />
		</AbsoluteFill>
	);
};
