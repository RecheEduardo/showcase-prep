import React from 'react';
import {APP_CARD_SHADOW, GLASS_DEEP, SHADOW} from '../theme';

type DivProps = React.HTMLAttributes<HTMLDivElement> & {[key: `data-${string}`]: string | boolean | undefined};

/** Deck glass plate (brand layer): radius ~104, blue-tinted shadow + white inset. */
export const Glass: React.FC<DivProps & {radius?: number}> = ({radius = 104, style, children, ...rest}) => (
	<div
		{...rest}
		style={{
			background: GLASS_DEEP,
			border: '1px solid rgba(255,255,255,.95)',
			borderRadius: radius,
			boxShadow: SHADOW.panel,
			...style,
		}}
	>
		{children}
	</div>
);

/** Product card (app layer): white surface, big radius, soft blue shadow. */
export const AppCard: React.FC<DivProps & {radius?: number}> = ({radius = 36, style, children, ...rest}) => (
	<div
		{...rest}
		style={{
			background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,254,255,0.94))',
			border: '1px solid rgba(255,255,255,0.95)',
			borderRadius: radius,
			boxShadow: APP_CARD_SHADOW,
			...style,
		}}
	>
		{children}
	</div>
);
