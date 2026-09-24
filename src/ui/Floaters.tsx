import React from 'react';
import {BRAND_GRADIENT} from '../theme';
import {Icon, type IconName} from './Icon';
import {PhotoCard, type StockKey} from './Photo';

// Background vocabulary (what SaaS product films use behind the UI): the gradient mesh is the
// light source, and in front of it float glass plates and ABSTRACT UI fragments (skeleton bars
// instead of readable text, so they add depth without competing with the foreground copy), blue
// gradient app-tiles, glossy orbs and thin rings. Photos are only a small accent. Every piece is
// plain HTML with gradients (no images, no backdrop-filter) and is meant to sit in BackdropDrift.

const GLASS_BG = 'linear-gradient(155deg, rgba(255,255,255,0.72) 0%, rgba(236,245,253,0.46) 100%)';
const GLASS_BORDER = '1.5px solid rgba(255,255,255,0.9)';
const GLASS_SHADOW = '0 30px 60px -34px rgba(28,111,181,0.55), inset 0 1px 0 rgba(255,255,255,0.95)';
const BAR = 'linear-gradient(90deg, rgba(95,176,230,0.55), rgba(42,143,212,0.28))';
const BAR_SOFT = 'rgba(28,111,181,0.14)';

const Bar: React.FC<{w: number | string; h?: number; soft?: boolean}> = ({w, h = 12, soft}) => <div style={{width: w, height: h, borderRadius: h, background: soft ? BAR_SOFT : BAR}} />;

/** Blue gradient app tile with a white glyph. */
export const GradientTile: React.FC<{size?: number; icon?: IconName; radius?: number}> = ({size = 96, icon = 'ticket', radius}) => (
	<div
		style={{
			width: size,
			height: size,
			borderRadius: radius ?? size * 0.3,
			background: BRAND_GRADIENT,
			boxShadow: `0 ${size * 0.25}px ${size * 0.5}px -${size * 0.25}px rgba(28,111,181,0.7), inset 0 1.5px 0 rgba(255,255,255,0.45)`,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		}}
	>
		<Icon name={icon} size={size * 0.46} color="#ffffff" stroke={2.2} />
	</div>
);

/** Glossy blue sphere (studio-lit bubble). */
export const Orb: React.FC<{size?: number; tone?: 'blue' | 'ice'}> = ({size = 120, tone = 'blue'}) => (
	<div
		style={{
			width: size,
			height: size,
			borderRadius: '50%',
			background:
				tone === 'blue'
					? 'radial-gradient(circle at 32% 28%, #ffffff 0%, #bfe4fb 14%, #5fb0e6 42%, #1c6fb5 78%, #134f86 100%)'
					: 'radial-gradient(circle at 32% 28%, #ffffff 0%, #f1f8ff 30%, #cfe6f8 70%, #9fcaee 100%)',
			boxShadow: `0 ${size * 0.28}px ${size * 0.5}px -${size * 0.26}px rgba(28,111,181,0.65)`,
		}}
	/>
);

/** Thin glass ring. */
export const Ring: React.FC<{size?: number; width?: number}> = ({size = 160, width = 10}) => (
	<div
		style={{
			width: size,
			height: size,
			borderRadius: '50%',
			boxSizing: 'border-box',
			border: `${width}px solid rgba(255,255,255,0.75)`,
			boxShadow: '0 20px 40px -24px rgba(28,111,181,0.6), inset 0 0 0 1.5px rgba(95,176,230,0.45), 0 0 0 1.5px rgba(95,176,230,0.35)',
		}}
	/>
);

/** Glass card holding an abstract UI fragment (icon tile + skeleton lines). */
export const SkeletonCard: React.FC<{w?: number; h?: number; icon?: IconName; lines?: number}> = ({w = 300, h = 170, icon = 'ticket', lines = 3}) => (
	<div
		style={{
			width: w,
			height: h,
			boxSizing: 'border-box',
			padding: 22,
			borderRadius: 34,
			background: GLASS_BG,
			border: GLASS_BORDER,
			boxShadow: GLASS_SHADOW,
			display: 'flex',
			flexDirection: 'column',
			gap: 14,
		}}
	>
		<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
			<GradientTile size={46} icon={icon} />
			<div style={{display: 'flex', flexDirection: 'column', gap: 8, flex: 1}}>
				<Bar w="80%" h={12} />
				<Bar w="50%" h={9} soft />
			</div>
		</div>
		{Array.from({length: Math.max(0, lines - 1)}, (_, i) => (
			<Bar key={i} w={`${92 - i * 22}%`} h={10} soft />
		))}
	</div>
);

/** Glass pill: blue dot + one skeleton line (a notification / status chip). */
export const GlassPill: React.FC<{w?: number; icon?: IconName}> = ({w = 230, icon}) => (
	<div
		style={{
			width: w,
			height: 64,
			boxSizing: 'border-box',
			padding: '0 22px 0 12px',
			borderRadius: 999,
			background: GLASS_BG,
			border: GLASS_BORDER,
			boxShadow: GLASS_SHADOW,
			display: 'flex',
			alignItems: 'center',
			gap: 12,
		}}
	>
		{icon ? <GradientTile size={42} icon={icon} radius={21} /> : <div style={{width: 40, height: 40, borderRadius: 20, background: BRAND_GRADIENT}} />}
		<Bar w="100%" h={12} />
	</div>
);

/** Glass mini chart: blue gradient bars rising (a dashboard fragment). */
export const MiniChart: React.FC<{w?: number; h?: number}> = ({w = 260, h = 170}) => {
	const bars = [0.42, 0.6, 0.5, 0.78, 0.66, 0.95];
	return (
		<div
			style={{
				width: w,
				height: h,
				boxSizing: 'border-box',
				padding: '20px 22px',
				borderRadius: 34,
				background: GLASS_BG,
				border: GLASS_BORDER,
				boxShadow: GLASS_SHADOW,
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
			}}
		>
			<Bar w="46%" h={10} soft />
			<div style={{flex: 1, display: 'flex', alignItems: 'flex-end', gap: 10}}>
				{bars.map((b, i) => (
					<div key={i} style={{flex: 1, height: `${b * 100}%`, borderRadius: 10, background: i === bars.length - 1 ? BRAND_GRADIENT : 'linear-gradient(180deg, rgba(95,176,230,0.6), rgba(95,176,230,0.2))'}} />
				))}
			</div>
		</div>
	);
};

/** Small event photo in a glass frame: context, never the subject. */
export const PhotoChip: React.FC<{src: StockKey; w?: number; h?: number}> = ({src, w = 200, h = 130}) => (
	<div style={{padding: 8, borderRadius: 30, background: GLASS_BG, border: GLASS_BORDER, boxShadow: GLASS_SHADOW}}>
		<PhotoCard src={src} width={w} height={h} radius={22} />
	</div>
);
