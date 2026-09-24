import React from 'react';
import {APP, FONT} from '../theme';
import {IconTile, type IconName} from './Icon';

/** Glass info pill (event page chips): icon tile + short label. Also used as a Z-space floater. */
export const Pill: React.FC<{icon: IconName; text: string; style?: React.CSSProperties}> = ({icon, text, style}) => (
	<div
		style={{
			display: 'flex',
			alignItems: 'center',
			gap: 10,
			padding: '12px 22px 12px 12px',
			borderRadius: 999,
			background: 'linear-gradient(160deg, rgba(255,255,255,.92), rgba(232,241,251,.74))',
			border: '1px solid rgba(255,255,255,.95)',
			boxShadow: 'rgba(28,111,181,.32) 0 14px 34px -16px',
			fontFamily: FONT,
			whiteSpace: 'nowrap',
			...style,
		}}
	>
		<IconTile name={icon} size={36} />
		<span style={{fontSize: 21, fontWeight: 700, color: APP.fg, letterSpacing: '-0.01em'}}>{text}</span>
	</div>
);
