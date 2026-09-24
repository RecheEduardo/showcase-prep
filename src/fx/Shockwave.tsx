import React from 'react';
import {AbsoluteFill} from 'remotion';
import {prog} from '../motion/tokens';

/** Blue shockwave ring born at `at` from (x, y). Pure function of time. */
export const Shockwave: React.FC<{
	t: number;
	at: number;
	x: number;
	y: number;
	maxR?: number;
	dur?: number;
	color?: string;
	width?: number;
}> = ({t, at, x, y, maxR = 1400, dur = 0.9, color = '#5fb0e6', width = 36}) => {
	if (t < at || t > at + dur) return null;
	const p = prog(t, at, at + dur, 'out');
	const r = 40 + p * maxR;
	const fade = 1 - prog(t, at, at + dur, 'soft');
	const w = width * (1 - p * 0.8) + 2;
	const r2 = 20 + prog(t, at + 0.06, at + dur, 'out') * maxR * 0.7;
	return (
		<AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
			<div
				style={{
					position: 'absolute',
					left: x - r,
					top: y - r,
					width: r * 2,
					height: r * 2,
					borderRadius: '50%',
					border: `${w}px solid ${color}`,
					opacity: fade * 0.85,
					boxShadow: `0 0 ${60 * fade}px ${color}, inset 0 0 ${40 * fade}px rgba(255,255,255,0.7)`,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: x - r2,
					top: y - r2,
					width: r2 * 2,
					height: r2 * 2,
					borderRadius: '50%',
					border: `${Math.max(1.5, w * 0.35)}px solid rgba(255,255,255,0.9)`,
					opacity: fade * 0.7,
				}}
			/>
		</AbsoluteFill>
	);
};
