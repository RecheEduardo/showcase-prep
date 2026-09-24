import React from 'react';
import {AbsoluteFill} from 'remotion';
import {tween} from '../motion/tokens';

/** Additive white/ice flash peaking exactly at `at` (absolute seconds). */
export const Flash: React.FC<{t: number; at: number; peak?: number; decay?: number; color?: string}> = ({
	t,
	at,
	peak = 0.9,
	decay = 0.35,
	color = '#ffffff',
}) => {
	if (t < at || t > at + decay) return null;
	const opacity = tween(t, at, at + decay, peak, 0, 'hit');
	return <AbsoluteFill style={{background: color, opacity, pointerEvents: 'none'}} />;
};
