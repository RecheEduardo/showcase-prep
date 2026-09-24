import React from 'react';
import {COPY} from '../copy';
import {APP, APP_CTA, FONT} from '../theme';
import {Icon} from './Icon';

/** "TOTAL" summary card of the ticket selection (06-queue-and-purchase/04). */
export const TotalCard: React.FC<{value: React.ReactNode; width: number; shine: React.ReactNode; ctaGlow: number; radius?: number}> = ({value, width, shine, ctaGlow, radius = 40}) => (
	<div
		style={{
			width,
			boxSizing: 'border-box',
			padding: 38,
			borderRadius: radius,
			background: 'linear-gradient(180deg, rgba(255,255,255,0.99), rgba(250,254,255,0.95))',
			border: '1px solid rgba(255,255,255,0.95)',
			boxShadow: '0 40px 90px -40px rgba(41,89,185,.55), 0 2px 8px -2px rgba(0,51,77,.06)',
			fontFamily: FONT,
		}}
	>
		<div style={{fontSize: 20, fontWeight: 700, letterSpacing: '0.22em', color: APP.muted}}>{COPY.C06.totalLabel}</div>
		<div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8}}>
			<span style={{fontSize: 92, fontWeight: 800, color: APP.fg, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums'}}>{value}</span>
			<span style={{fontSize: 26, fontWeight: 600, color: APP.muted}}>{COPY.C06.totalCount}</span>
		</div>
		<div style={{height: 1, background: 'rgba(0,51,77,0.1)', margin: '22px 0'}} />
		<div style={{display: 'flex', justifyContent: 'space-between', fontSize: 23, color: APP.muted, fontWeight: 500}}>
			<span>{COPY.C06.totalLine}</span>
			<span style={{fontWeight: 700, color: APP.fg}}>{COPY.C06.totalLineValue}</span>
		</div>
		<div
			data-cta
			style={{
				position: 'relative',
				marginTop: 30,
				height: 96,
				borderRadius: 999,
				background: APP_CTA,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 14,
				color: '#ffffff',
				fontSize: 34,
				fontWeight: 800,
				letterSpacing: '-0.02em',
				overflow: 'hidden',
				boxShadow: `0 ${18 + 14 * ctaGlow}px ${40 + 40 * ctaGlow}px -18px rgba(41,89,185,${0.6 + 0.35 * ctaGlow}), 0 0 0 ${10 * ctaGlow}px rgba(87,197,244,${0.22 * ctaGlow}), inset 0 1px 0 rgba(255,255,255,.35)`,
			}}
		>
			{shine}
			<span style={{position: 'relative'}}>{COPY.C06.cta}</span>
			<Icon name="arrow" size={30} color="#ffffff" stroke={2.8} style={{position: 'relative'}} />
		</div>
	</div>
);
