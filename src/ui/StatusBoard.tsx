import React from 'react';
import {APP, FONT} from '../theme';
import {Icon, type IconName} from './Icon';
import {Photo, type StockKey} from './Photo';

// ILLUSTRATIVE organizer status board (H12): columns and badges follow the product's status
// colours (orange = pending, green = approved, 04-admin/02). Not a capture.

export const StatusBadge: React.FC<{approved: number; labels: {pending: string; approved: string}}> = ({approved, labels}) => {
	const a = approved;
	return (
		<div style={{position: 'relative', height: 40, width: 170}}>
			{[
				{label: labels.pending, fg: APP.pendingFg, bg: APP.pendingBg, border: APP.pendingBorder, o: 1 - a, icon: null},
				{label: labels.approved, fg: APP.approvedFg, bg: APP.approvedBg, border: APP.approvedBorder, o: a, icon: 'check' as IconName},
			].map((b) => (
				<div
					key={b.label}
					style={{
						position: 'absolute',
						right: 0,
						top: 0,
						height: 40,
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						padding: '0 16px',
						borderRadius: 999,
						background: b.bg,
						border: `1.5px solid ${b.border}`,
						color: b.fg,
						fontFamily: FONT,
						fontSize: 19,
						fontWeight: 700,
						opacity: b.o,
						scale: String(0.85 + 0.15 * b.o),
						transformOrigin: 'right center',
						whiteSpace: 'nowrap',
					}}
				>
					{b.icon ? <Icon name={b.icon} size={18} color={b.fg} stroke={3} /> : <span style={{width: 9, height: 9, borderRadius: 5, background: b.fg}} />}
					{b.label}
				</div>
			))}
		</div>
	);
};

export const BoardCard: React.FC<{
	title: string;
	category: string;
	width: number;
	thumb: {photo?: StockKey; from?: string; to?: string; icon?: IconName};
	approved: number;
	labels: {pending: string; approved: string};
	glow?: number;
}> = ({title, category, width, thumb, approved, labels, glow = 0}) => (
	<div
		style={{
			width,
			height: 116,
			boxSizing: 'border-box',
			padding: '16px 22px 16px 16px',
			borderRadius: 28,
			background: '#ffffff',
			boxShadow: `0 18px 44px -24px rgba(41,89,185,${0.45 + 0.3 * glow}), 0 0 0 ${6 * glow}px rgba(16,185,129,${0.16 * glow})`,
			display: 'flex',
			alignItems: 'center',
			gap: 18,
			fontFamily: FONT,
		}}
	>
		<div style={{width: 84, height: 84, borderRadius: 20, overflow: 'hidden', flexShrink: 0}}>
			{thumb.photo ? (
				<Photo src={thumb.photo} width={84} height={84} />
			) : (
				<div style={{width: 84, height: 84, background: `linear-gradient(160deg, ${thumb.from}, ${thumb.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
					<Icon name={thumb.icon ?? 'ticket'} size={38} color="#ffffff" stroke={2.2} />
				</div>
			)}
		</div>
		<div style={{flex: 1, minWidth: 0}}>
			<div style={{fontSize: 28, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>{title}</div>
			<div style={{fontSize: 19, fontWeight: 500, color: APP.muted, marginTop: 4}}>{category}</div>
		</div>
		<StatusBadge approved={approved} labels={labels} />
	</div>
);
