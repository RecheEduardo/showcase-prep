import React from 'react';
import {easeFn, prog, tween} from '../motion/tokens';

export type CursorKey = {t: number; x: number; y: number};

/** Both pointers render 2.4x the old 44 px arrow so they read at a glance. */
export const CURSOR_SCALE = 2.4;

// Classic Mac arrow (44-unit box, hotspot 6,4) and the classic Mac pointing hand, the white
// "Mickey" glove (32-unit box, hotspot on the index fingertip 11.5,1.5).
const ARROW = 'M6 4 L6 34 L13.5 27 L18.5 38.5 L24 36 L19 25 L29.5 25 Z';
const HAND =
	'M9.5 3.5 C9.5 2.4 10.4 1.5 11.5 1.5 C12.6 1.5 13.5 2.4 13.5 3.5 L13.5 11.2 C13.9 10.5 14.6 10.1 15.3 10.1 C16.4 10.1 17.2 10.9 17.2 12 L17.2 12.4 C17.6 11.8 18.2 11.5 18.9 11.5 C20 11.5 20.8 12.3 20.8 13.4 L20.8 14.1 C21.2 13.6 21.8 13.3 22.4 13.3 C23.5 13.3 24.3 14.1 24.3 15.2 L24.3 21.5 C24.3 24.3 23.3 26.2 21.8 27.6 L21.8 30.5 L11.8 30.5 L11.8 28.3 C10.6 27.3 9.4 25.9 8.4 24.2 L5.1 18.6 C4.5 17.6 4.8 16.4 5.8 15.9 C6.8 15.3 8 15.6 8.7 16.5 L9.5 17.6 Z';
const HAND_FOLDS = 'M13.5 11.2 L13.5 16.2 M17.2 12.4 L17.2 16.6 M20.8 14.1 L20.8 17.2 M12 28.4 L21.6 28.4';
// The hand box is sized so both pointers have the same visual height (arrow 34.5 u, hand 29 u).
const HAND_BOX = 38;
const HAND_HOT: [number, number] = [11.5 * (HAND_BOX / 32), 1.5 * (HAND_BOX / 32)];

/**
 * Animated pointer, a pure function of absolute time `t`: piecewise cubicHardSnap between
 * keyframes. It is the arrow while travelling and turns into the pointing hand over anything
 * clickable (0.3 s before each click until 0.25 s after, plus `handWindows`). Each click presses
 * the pointer and emits a ripple whose first frame is exactly the click label frame.
 */
export const Cursor: React.FC<{
	t: number;
	keys: CursorKey[];
	clicks: number[];
	show: [number, number];
	scale?: number;
	dark?: boolean;
	handWindows?: [number, number][];
	/** Extra positional offset in px (e.g. a frantic shake), added after the path. */
	offset?: [number, number];
}> = ({t, keys, clicks, show, scale = CURSOR_SCALE, dark = false, handWindows = [], offset = [0, 0]}) => {
	if (t < show[0] - 0.01 || t > show[1] + 0.01 || keys.length === 0) return null;
	let x = keys[0].x;
	let y = keys[0].y;
	if (t >= keys[keys.length - 1].t) {
		x = keys[keys.length - 1].x;
		y = keys[keys.length - 1].y;
	} else {
		for (let i = 0; i < keys.length - 1; i++) {
			const a = keys[i];
			const b = keys[i + 1];
			if (t >= a.t && t < b.t) {
				const p = easeFn('inOut')((t - a.t) / (b.t - a.t));
				x = a.x + (b.x - a.x) * p;
				y = a.y + (b.y - a.y) * p;
				break;
			}
		}
	}
	x += offset[0];
	y += offset[1];
	const fade = Math.min(prog(t, show[0], show[0] + 0.2, 'soft'), 1 - prog(t, show[1] - 0.2, show[1], 'soft'));
	let press = 1;
	for (const c of clicks) {
		if (t >= c - 0.001 && t < c + 0.2) press = Math.min(press, tween(t, c, c + 0.06, 1, 0.82, 'hit') + tween(t, c + 0.06, c + 0.2, 0, 0.18, 'snap'));
	}
	const hand = clicks.some((c) => t >= c - 0.3 && t <= c + 0.25) || handWindows.some(([a, b]) => t >= a && t <= b);
	const [hx, hy] = hand ? HAND_HOT : [6, 4];
	const box = hand ? HAND_BOX : 44;
	return (
		<div style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none', opacity: fade}}>
			{clicks.map((c) => {
				if (t < c - 0.001 || t > c + 0.45) return null;
				const p = prog(t, c, c + 0.45, 'out');
				const r = 10 + p * 34 * scale;
				return (
					<div
						key={c}
						style={{
							position: 'absolute',
							left: x - r,
							top: y - r,
							width: r * 2,
							height: r * 2,
							borderRadius: '50%',
							border: `${1.6 * scale}px solid ${dark ? 'rgba(255,255,255,0.9)' : 'rgba(42,143,212,0.9)'}`,
							background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(95,176,230,0.18)',
							opacity: 1 - p,
						}}
					/>
				);
			})}
			<svg
				width={box * scale}
				height={box * scale}
				viewBox={hand ? '0 0 32 32' : '0 0 44 44'}
				style={{
					position: 'absolute',
					left: x - hx * scale,
					top: y - hy * scale,
					scale: String(press),
					transformOrigin: `${hx * scale}px ${hy * scale}px`,
					filter: `drop-shadow(0 ${4 * scale}px ${6 * scale}px rgba(14,39,70,0.35))`,
					overflow: 'visible',
				}}
			>
				{hand ? (
					<>
						<path d={HAND} fill="#ffffff" stroke="#0e2746" strokeWidth={1.5} strokeLinejoin="round" />
						<path d={HAND_FOLDS} fill="none" stroke="#0e2746" strokeWidth={1.2} strokeLinecap="round" />
					</>
				) : (
					<path d={ARROW} fill="#ffffff" stroke="#0e2746" strokeWidth={2.4} strokeLinejoin="round" />
				)}
			</svg>
		</div>
	);
};
