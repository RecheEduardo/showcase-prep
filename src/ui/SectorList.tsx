import React from 'react';
import {COPY} from '../copy';
import {APP, FONT} from '../theme';
import {Icon, IconTile} from './Icon';

type SectorData = (typeof COPY.C05.sectors)[number];

const pill = (text: string, k: number): React.ReactNode => (
	<span
		style={{
			fontFamily: FONT,
			fontSize: 15 * k,
			fontWeight: 700,
			color: '#ffffff',
			background: 'linear-gradient(90deg, #2f86d6 0%, #2563c0 100%)',
			borderRadius: 999,
			padding: `${5 * k}px ${12 * k}px`,
			letterSpacing: '-0.01em',
			whiteSpace: 'nowrap',
			boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)',
		}}
	>
		{text}
	</span>
);

/** One row of "Setores disponíveis" (06-queue-and-purchase/02, 03, 06). `sel` 0..1, `scale` sizes the whole row. */
export const SectorRow: React.FC<{data: SectorData; sel: number; width: number; dataKey?: string; scale?: number}> = ({data, sel, width, dataKey, scale = 1}) => {
	const s = (n: number) => n * scale;
	return (
		<div
			data-row={dataKey}
			style={{
				position: 'relative',
				width,
				height: s(144),
				boxSizing: 'border-box',
				padding: `${s(22)}px ${s(26)}px`,
				borderRadius: s(26),
				background: sel > 0.5 ? '#ffffff' : '#f9fafb',
				boxShadow: `0 ${s(10 + sel * 12)}px ${s(30 + sel * 20)}px -${s(18)}px rgba(41,89,185,${0.25 + sel * 0.3})`,
				fontFamily: FONT,
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					borderRadius: s(26),
					border: `${s(2.5)}px solid ${APP.selBorder}`,
					opacity: sel,
					boxShadow: `0 0 0 ${s(6) * sel}px rgba(87,197,244,${0.16 * sel})`,
				}}
			/>
			<div style={{display: 'flex', alignItems: 'center', gap: s(14)}}>
				<IconTile name={data.id === 'pista' || data.id === 'premium' ? 'users' : 'seat'} size={s(44)} soft />
				<span style={{fontSize: s(27), fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>{data.name}</span>
				<span style={{marginLeft: 'auto', fontSize: s(15), fontWeight: 500, color: APP.muted, whiteSpace: 'nowrap'}}>{COPY.C05.fromLabel}</span>
			</div>
			<div style={{display: 'flex', alignItems: 'center', marginTop: s(8)}}>
				<span style={{fontSize: s(18), fontWeight: 500, color: APP.muted, whiteSpace: 'nowrap'}}>{data.desc}</span>
				<span style={{marginLeft: 'auto', fontSize: s(28), fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>{data.price}</span>
			</div>
			<div style={{display: 'flex', alignItems: 'center', gap: s(10), marginTop: s(10)}}>
				{pill(data.kind, scale)}
				{pill(data.avail, scale)}
				<div style={{marginLeft: 'auto', position: 'relative', height: s(30), width: s(150), flexShrink: 0}}>
					<div style={{position: 'absolute', right: 0, top: s(3), opacity: 1 - sel}}>
						<Icon name="chevron" size={s(24)} color="#2f86d6" stroke={2.4} />
					</div>
					<div
						style={{
							position: 'absolute',
							right: 0,
							top: 0,
							display: 'flex',
							alignItems: 'center',
							gap: s(6),
							padding: `${s(5)}px ${s(14)}px`,
							borderRadius: 999,
							background: 'linear-gradient(90deg, #57c5f4, #3aa6e6)',
							color: '#ffffff',
							fontSize: s(15),
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
