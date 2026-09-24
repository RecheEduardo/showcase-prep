import React, {useId} from 'react';
import {COPY} from '../copy';
import {FONT, MAP} from '../theme';
import {HOUSE_MIX, OUTER_PATH, PALCO, SECTOR_ANCHOR, SECTOR_PATHS, separators, type SectorId} from './mapGeometry';

export type SectorVisual = {
	/** 0..1 colour reveal from neutral grey ("the stadium lights up"). */
	reveal: number;
	/** 0..1 radial sweep of the selected (darker) fill. */
	sel: number;
	/** 0..1 opacity of the selected fill (used to deselect without shrinking the sweep). */
	fade?: number;
};

const BASE: Record<SectorId, string> = {premium: MAP.premium, pista: MAP.pista, nivel1: MAP.nivel1, superior: MAP.superior};
const SELECTED: Record<SectorId, string> = {premium: MAP.premiumSel, pista: MAP.pistaSel, nivel1: MAP.nivel1Sel, superior: MAP.superiorSel};
const ORDER: SectorId[] = ['superior', 'nivel1', 'premium', 'pista'];
const VIEW = {x: 30, y: 18, w: 630, h: 590};

export const MAP_VIEW = VIEW;

/** Map-space point -> pixel position inside a SectorMap of the given width. */
export const mapToPx = (width: number, p: [number, number]): [number, number] => {
	const k = width / VIEW.w;
	return [(p[0] - VIEW.x) * k, (p[1] - VIEW.y) * k];
};

export const SectorMap: React.FC<{width: number; sectors: Record<SectorId, SectorVisual>; sweepRadius?: number}> = ({
	width,
	sectors,
	sweepRadius = 420,
}) => {
	const uid = useId().replace(/:/g, '');
	const height = (width * VIEW.h) / VIEW.w;
	const label = (text: string, x: number, y: number, size: number, opacity = 1) => (
		<text
			x={x}
			y={y}
			textAnchor="middle"
			dominantBaseline="middle"
			fontFamily={FONT}
			fontWeight={800}
			fontSize={size}
			letterSpacing={0.4}
			fill="#ffffff"
			opacity={opacity}
		>
			{text}
		</text>
	);

	return (
		<svg width={width} height={height} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} style={{display: 'block', overflow: 'visible'}}>
			<defs>
				<filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
					<feGaussianBlur stdDeviation="9" />
				</filter>
				{ORDER.map((id) => {
					const [cx, cy] = SECTOR_ANCHOR[id];
					return (
						<clipPath key={id} id={`sweep-${id}-${uid}`}>
							<circle cx={cx} cy={cy} r={Math.max(0.01, sectors[id].sel * sweepRadius)} />
						</clipPath>
					);
				})}
			</defs>

			<path d={OUTER_PATH} fill={MAP.outer} />
			<rect x={PALCO.x} y={PALCO.y} width={PALCO.w} height={PALCO.h} rx={2} fill={MAP.palco} />
			{label(COPY.C05.mapLabels.palco, PALCO.x + PALCO.w / 2, PALCO.y + PALCO.h / 2 + 1, 14)}

			{ORDER.map((id) => (
				<g key={id}>
					<path d={SECTOR_PATHS[id]} fill="#c5ccd6" />
					<path d={SECTOR_PATHS[id]} fill={BASE[id]} opacity={sectors[id].reveal} />
				</g>
			))}

			{ORDER.map((id) =>
				sectors[id].sel > 0.001 && (sectors[id].fade ?? 1) > 0.001 ? (
					<g key={`sel-${id}`} opacity={sectors[id].fade ?? 1}>
						<path d={SECTOR_PATHS[id]} fill={SELECTED[id]} opacity={0.75 * Math.min(1, sectors[id].sel * 1.4)} filter={`url(#glow-${uid})`} />
						<path d={SECTOR_PATHS[id]} fill={SELECTED[id]} clipPath={`url(#sweep-${id}-${uid})`} />
						<path d={SECTOR_PATHS[id]} fill="none" stroke="#ffffff" strokeWidth={2.4} strokeLinejoin="round" opacity={Math.min(1, sectors[id].sel * 1.6)} />
					</g>
				) : null,
			)}

			<path d={separators('superior', 26)} stroke="#ffffff" strokeWidth={1.6} opacity={0.9} />
			<path d={separators('nivel1', 18)} stroke="#ffffff" strokeWidth={1.6} opacity={0.9} />

			<rect x={HOUSE_MIX.x} y={HOUSE_MIX.y} width={HOUSE_MIX.w} height={HOUSE_MIX.h} rx={2} fill="#3a3a44" stroke="#ffffff" strokeWidth={1.2} />
			{label(COPY.C05.mapLabels.premium, 349, 158, 14, 0.95)}
			{label(COPY.C05.mapLabels.pista, 349, 292, 16, 0.95)}
		</svg>
	);
};

export const MAP_LEGEND: {id: SectorId; color: string}[] = [
	{id: 'premium', color: MAP.premium},
	{id: 'pista', color: MAP.pista},
	{id: 'nivel1', color: MAP.nivel1},
	{id: 'superior', color: MAP.superior},
];
