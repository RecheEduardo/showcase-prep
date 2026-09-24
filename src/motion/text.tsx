import type React from 'react';
import {BRAND_GRADIENT} from '../theme';

// Gradient-clipped text for single blocks (e.g. the queue number). Titles use motion/kinetic.tsx.
export const gradientText = (gradient = BRAND_GRADIENT): React.CSSProperties => ({
	backgroundImage: gradient,
	WebkitBackgroundClip: 'text',
	backgroundClip: 'text',
	color: 'transparent',
	WebkitTextFillColor: 'transparent',
});
