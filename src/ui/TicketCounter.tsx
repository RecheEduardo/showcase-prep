import React from 'react';
import {COPY} from '../copy';
import {APP, FONT} from '../theme';
import {Icon} from './Icon';

/**
 * Slot-machine text: `from` rolls up into `to` with progress p (0..1).
 * Used for the quantity counter and price swaps.
 */
export const RollText: React.FC<{from: string; to: string; p: number; height: number; style?: React.CSSProperties}> = ({from, to, p, height, style}) => {
	if (from === to || p <= 0) return <span style={{display: 'inline-block', height, lineHeight: `${height}px`, ...style}}>{from}</span>;
	if (p >= 1) return <span style={{display: 'inline-block', height, lineHeight: `${height}px`, ...style}}>{to}</span>;
	return (
		<span style={{display: 'inline-block', position: 'relative', height, overflow: 'hidden', verticalAlign: 'top', ...style}}>
			<span style={{display: 'block', height, lineHeight: `${height}px`, translate: `0px ${-p * height}px`, opacity: 1 - p}}>{from}</span>
			<span style={{display: 'block', height, lineHeight: `${height}px`, translate: `0px ${-p * height}px`, opacity: p}}>{to}</span>
		</span>
	);
};

/** "− N +" pill of the ticket type row. */
export const CounterPill: React.FC<{from: number; to: number; p: number; plusGlow: number; scale?: number}> = ({from, to, p, plusGlow, scale = 1}) => {
	const s = (n: number) => n * scale;
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: s(18),
				padding: `${s(8)}px ${s(10)}px`,
				borderRadius: 999,
				background: '#ffffff',
				boxShadow: '0 10px 26px -14px rgba(41,89,185,.45), inset 0 0 0 1px rgba(0,51,77,.06)',
				fontFamily: FONT,
			}}
		>
			<div style={{width: s(48), height: s(48), borderRadius: s(24), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
				<Icon name="minus" size={s(24)} color={to > 0 && p > 0.5 ? APP.fgSoft : '#9fb1bd'} stroke={2.6} />
			</div>
			<RollText
				from={String(from)}
				to={String(to)}
				p={p}
				height={s(44)}
				style={{fontSize: s(30), fontWeight: 800, color: APP.fg, minWidth: s(30), textAlign: 'center', fontVariantNumeric: 'tabular-nums'}}
			/>
			<div
				data-plus
				style={{
					width: s(48),
					height: s(48),
					borderRadius: s(24),
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					background: `rgba(87,197,244,${0.12 + 0.3 * plusGlow})`,
					boxShadow: plusGlow > 0 ? `0 0 0 ${s(8) * plusGlow}px rgba(87,197,244,${0.18 * plusGlow})` : 'none',
				}}
			>
				<Icon name="plus" size={s(24)} color="#2959b9" stroke={2.6} />
			</div>
		</div>
	);
};

type TypeKey = keyof typeof COPY.tickets.types;

/** Ticket type card (Inteira / Meia entrada / Solidária) with LOTE 1 chip and counter. */
export const TicketTypeRow: React.FC<{
	type: TypeKey;
	price: React.ReactNode;
	width: number;
	counter: React.ReactNode;
	highlight?: number;
	scale?: number;
}> = ({type, price, width, counter, highlight = 0, scale = 1}) => {
	const s = (n: number) => n * scale;
	return (
		<div
			style={{
				position: 'relative',
				width,
				boxSizing: 'border-box',
				padding: `${s(24)}px ${s(28)}px`,
				borderRadius: s(28),
				background: '#ffffff',
				boxShadow: `0 ${s(14)}px ${s(40)}px -${s(22)}px rgba(41,89,185,${0.3 + highlight * 0.25})`,
				display: 'flex',
				alignItems: 'center',
				gap: s(20),
				fontFamily: FONT,
			}}
		>
			<div style={{position: 'absolute', inset: 0, borderRadius: s(28), border: `${s(2)}px solid ${APP.selBorder}`, opacity: highlight}} />
			<div style={{flex: 1, minWidth: 0}}>
				<div style={{display: 'flex', alignItems: 'center', gap: s(12)}}>
					<span style={{fontSize: s(27), fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em'}}>{COPY.tickets.types[type].name}</span>
					<span
						style={{
							fontSize: s(13),
							fontWeight: 800,
							color: '#ffffff',
							background: 'linear-gradient(90deg, #57c5f4, #2f86d6)',
							padding: `${s(4)}px ${s(10)}px`,
							borderRadius: 999,
							letterSpacing: '0.04em',
						}}
					>
						{COPY.tickets.lot}
					</span>
				</div>
				<div style={{fontSize: s(17), fontWeight: 500, color: APP.muted, marginTop: s(6), lineHeight: 1.35}}>{COPY.tickets.types[type].desc}</div>
				<div style={{fontSize: s(30), fontWeight: 800, color: APP.fg, marginTop: s(10), letterSpacing: '-0.02em'}}>{price}</div>
			</div>
			<div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: s(10)}}>
				{counter}
				<span style={{fontSize: s(14), fontWeight: 500, color: APP.muted}}>{COPY.tickets.max}</span>
			</div>
		</div>
	);
};
