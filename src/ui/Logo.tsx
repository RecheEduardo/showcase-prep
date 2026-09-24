import React from 'react';
import {Img, staticFile} from 'remotion';
import {COPY} from '../copy';
import {BRAND, FONT} from '../theme';

/** The only brand symbol of the video: the app's 2D squircle (frontend/public/goticket_logo.svg). */
export const LogoApp: React.FC<{size: number; shadow?: boolean; style?: React.CSSProperties}> = ({size, shadow = false, style}) => (
	<Img
		src={staticFile('brand/logo-app.svg')}
		style={{
			width: size,
			height: size,
			display: 'block',
			filter: shadow ? 'drop-shadow(rgba(28,111,181,.42) 0 26px 48px)' : undefined,
			...style,
		}}
	/>
);

export const Wordmark: React.FC<{size: number; color?: string; style?: React.CSSProperties}> = ({size, color = BRAND.ink, style}) => (
	<span
		style={{
			fontFamily: FONT,
			fontWeight: 800,
			fontSize: size,
			letterSpacing: '-0.035em',
			color,
			lineHeight: 1,
			whiteSpace: 'nowrap',
			...style,
		}}
	>
		{COPY.brand.name}
	</span>
);
