import React from 'react';
import {FONT} from '../theme';
import {Icon} from './Icon';

/** Category tile as on the home grid (01-public-home/03): vivid gradient, white 800 label + arrow. */
export const CategoryTile: React.FC<{name: string; from: string; to: string; width: number; height: number; dataIndex?: number}> = ({
	name,
	from,
	to,
	width,
	height,
	dataIndex,
}) => (
	<div
		data-tile={dataIndex}
		style={{
			position: 'relative',
			width,
			height,
			borderRadius: 34,
			background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
			boxShadow: `0 26px 50px -26px ${to}, inset 0 1px 0 rgba(255,255,255,0.28)`,
			overflow: 'hidden',
			fontFamily: FONT,
		}}
	>
		<div style={{position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 10% 0%, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%)'}} />
		<div
			style={{
				position: 'absolute',
				left: 26,
				right: 22,
				bottom: 22,
				display: 'flex',
				alignItems: 'flex-end',
				gap: 10,
				color: '#ffffff',
				fontSize: 30,
				fontWeight: 800,
				letterSpacing: '-0.02em',
				lineHeight: 1.08,
			}}
		>
			<span style={{flex: 1}}>{name}</span>
			<Icon name="arrow" size={28} color="#ffffff" stroke={2.8} />
		</div>
	</div>
);
