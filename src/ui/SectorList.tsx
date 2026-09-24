import React from 'react';
import {COPY} from '../copy';
import {APP, FONT} from '../theme';
import {Icon, IconTile} from './Icon';

type SectorData = (typeof COPY.C05.sectors)[number];

/** Chip as a real flex box (an inline span's vertical padding does not take part in layout and
 * used to spill past the bottom of the row). Height is explicit so the row can reserve it. */
const CHIP_H = 32;
const pill = (text: string, k: number): React.ReactNode => (
	<span
		style={{
			display: 'inline-flex',
			alignItems: 'center',
			height: CHIP_H * k,
			boxSizing: 'border-box',
			fontFamily: FONT,
			fontSize: 15 * k,
			lineHeight: 1,
			fontWeight: 700,
			color: '#ffffff',
			background: 'linear-gradient(90deg, #2f86d6 0%, #2563c0 100%)',
			borderRadius: 999,
			padding: `0 ${13 * k}px`,
			letterSpacing: '-0.01em',
			whiteSpace: 'nowrap',
			boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)',
		}}
	>
		{text}
	</span>
);

/** Natural height of a row at scale 1: padding + title line + description line + chip line + gaps. */
export const SECTOR_ROW = {pad: 24, line1: 46, gap1: 10, line2: 36, gap2: 14, line3: CHIP_H} as const;
export const sectorRowHeight = (scale = 1) =>
	(SECTOR_ROW.pad * 2 + SECTOR_ROW.line1 + SECTOR_ROW.gap1 + SECTOR_ROW.line2 + SECTOR_ROW.gap2 + SECTOR_ROW.line3) * scale;

/** One row of "Setores disponíveis" (06-queue-and-purchase/02, 03, 06). `sel` 0..1, `scale` sizes the whole row. */
export const SectorRow: React.FC<{data: SectorData; sel: number; width: number; dataKey?: string; scale?: number}> = ({data, sel, width, dataKey, scale = 1}) => {
	const s = (n: number) => n * scale;
	const R = SECTOR_ROW;
	return (
		<div
			data-row={dataKey}
			style={{
				position: 'relative',
				width,
				height: sectorRowHeight(scale),
				boxSizing: 'border-box',
				padding: `${s(R.pad)}px ${s(28)}px`,
				borderRadius: s(30),
				background: sel > 0.5 ? '#ffffff' : '#f9fafb',
				boxShadow: `0 ${s(10 + sel * 12)}px ${s(30 + sel * 20)}px -${s(18)}px rgba(41,89,185,${0.25 + sel * 0.3}), inset 0 0 0 1px rgba(0,51,77,0.05)`,
				fontFamily: FONT,
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			{/* Selection outline: exactly on the row's border box. */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					boxSizing: 'border-box',
					borderRadius: s(30),
					border: `${s(2.5)}px solid ${APP.selBorder}`,
					opacity: sel,
					boxShadow: `0 0 0 ${s(6) * sel}px rgba(87,197,244,${0.16 * sel})`,
				}}
			/>
			<div style={{display: 'flex', alignItems: 'center', gap: s(14), height: s(R.line1), flexShrink: 0}}>
				<IconTile name={data.id === 'pista' || data.id === 'premium' ? 'users' : 'seat'} size={s(44)} soft />
				<span style={{fontSize: s(27), lineHeight: 1, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>{data.name}</span>
				<span style={{marginLeft: 'auto', fontSize: s(15), lineHeight: 1, fontWeight: 500, color: APP.muted, whiteSpace: 'nowrap'}}>{COPY.C05.fromLabel}</span>
			</div>
			<div style={{display: 'flex', alignItems: 'center', height: s(R.line2), marginTop: s(R.gap1), flexShrink: 0}}>
				<span style={{fontSize: s(18), lineHeight: 1, fontWeight: 500, color: APP.muted, whiteSpace: 'nowrap'}}>{data.desc}</span>
				<span style={{marginLeft: 'auto', fontSize: s(28), lineHeight: 1, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>{data.price}</span>
			</div>
			<div style={{display: 'flex', alignItems: 'center', gap: s(10), height: s(R.line3), marginTop: s(R.gap2), flexShrink: 0}}>
				{pill(data.kind, scale)}
				{pill(data.avail, scale)}
				<div style={{marginLeft: 'auto', position: 'relative', height: s(CHIP_H), width: s(150), flexShrink: 0}}>
					<div style={{position: 'absolute', right: 0, top: s(4), opacity: 1 - sel}}>
						<Icon name="chevron" size={s(24)} color="#2f86d6" stroke={2.4} />
					</div>
					<div
						style={{
							position: 'absolute',
							right: 0,
							top: 0,
							height: s(CHIP_H),
							boxSizing: 'border-box',
							display: 'flex',
							alignItems: 'center',
							gap: s(6),
							padding: `0 ${s(14)}px`,
							borderRadius: 999,
							background: 'linear-gradient(90deg, #57c5f4, #3aa6e6)',
							color: '#ffffff',
							fontSize: s(15),
							lineHeight: 1,
							fontWeight: 700,
							opacity: sel,
							scale: String(0.7 + 0.3 * sel),
							transformOrigin: 'right center',
							whiteSpace: 'nowrap',
						}}
					>
						<Icon name="check" size={s(16)} color="#ffffff" stroke={3} />
						{COPY.C05.selected}
					</div>
				</div>
			</div>
		</div>
	);
};

export const SectorListHeader: React.FC = () => (
	<div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT}}>
		<IconTile name="grid" size={54} />
		<div>
			<div style={{fontSize: 30, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}>{COPY.C05.sectorsTitle}</div>
			<div style={{fontSize: 17, fontWeight: 500, color: APP.muted, marginTop: 2}}>{COPY.C05.sectorsSub}</div>
		</div>
	</div>
);
