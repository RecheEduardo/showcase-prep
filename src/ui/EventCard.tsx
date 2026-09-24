import React from 'react';
import {APP_CTA, FONT} from '../theme';
import {Icon} from './Icon';
import {Photo, type StockKey} from './Photo';

/** Home carousel banner (01-public-home/01): photo, dark gradient, big white title, price pill. */
export const EventBanner: React.FC<{photo: StockKey; title?: string; price?: string; width: number; height: number; zoom?: number}> = ({
	photo,
	title,
	price,
	width,
	height,
	zoom = 1,
}) => (
	<div
		style={{
			position: 'relative',
			width,
			height,
			borderRadius: 64,
			overflow: 'hidden',
			boxShadow: 'rgba(14,39,70,.45) 0 40px 90px -40px, rgba(28,111,181,.25) 0 10px 30px -10px',
			fontFamily: FONT,
		}}
	>
		<Photo src={photo} width={width} height={height} zoom={zoom} />
		<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,12,24,0.78) 0%, rgba(5,12,24,0.45) 45%, rgba(5,12,24,0.05) 100%)'}} />
		<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(5,12,24,0.45) 0%, rgba(5,12,24,0) 45%)'}} />
		{title && price ? (
		<div style={{position: 'absolute', left: 84, bottom: 92, display: 'flex', flexDirection: 'column', gap: 28}}>
			<div style={{color: '#ffffff', fontSize: 92, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.98, maxWidth: 900}}>{title}</div>
			<div
				style={{
					alignSelf: 'flex-start',
					display: 'flex',
					alignItems: 'center',
					gap: 10,
					padding: '16px 30px',
					borderRadius: 999,
					background: APP_CTA,
					color: '#ffffff',
					fontSize: 28,
					fontWeight: 800,
					letterSpacing: '-0.01em',
					boxShadow: '0 16px 30px -14px rgba(87,197,244,.8), inset 0 1px 0 rgba(255,255,255,.35)',
				}}
			>
				{price}
				<Icon name="chevron" size={24} color="#ffffff" stroke={3} />
			</div>
		</div>
		) : null}
	</div>
);
