import React from 'react';
import {COPY} from '../copy';
import {EDITOR, FONT, MAP} from '../theme';
import {EDITOR_POLYGONS, OUTER_PATH, PALCO, type SectorId} from './mapGeometry';
import {MAP_VIEW} from './SectorMap';

// Venue map editor canvas (04-admin/06–08): grey stadium, sector blocks that light up in
// saturated editor colours, blue vertex handles on the active block.

const COLOR: Record<SectorId, string> = {pista: EDITOR.pista, premium: EDITOR.premium, superior: EDITOR.superior, nivel1: EDITOR.nivel1};

export const EditorMap: React.FC<{width: number; lit: number[]; flash: number[]; handles: number[]}> = ({width, lit, flash, handles}) => {
	const height = (width * MAP_VIEW.h) / MAP_VIEW.w;
	return (
		<svg width={width} height={height} viewBox={`${MAP_VIEW.x} ${MAP_VIEW.y} ${MAP_VIEW.w} ${MAP_VIEW.h}`} style={{display: 'block', overflow: 'visible'}}>
			<path d={OUTER_PATH} fill={MAP.outer} />
			<rect x={PALCO.x} y={PALCO.y} width={PALCO.w} height={PALCO.h} rx={2} fill={MAP.palco} />
			<text x={PALCO.x + PALCO.w / 2} y={PALCO.y + PALCO.h / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontWeight={800} fontSize={14} fill="#ffffff">
				{COPY.C05.mapLabels.palco}
			</text>
			{EDITOR_POLYGONS.map((p, i) => (
				<g key={p.key}>
					<path d={p.d} fill="#cfd4dc" stroke="#b3bac5" strokeWidth={1.2} strokeDasharray="5 4" />
					<path d={p.d} fill={COLOR[p.sector]} opacity={0.62 * lit[i]} />
					<path d={p.d} fill="none" stroke={COLOR[p.sector]} strokeWidth={2.6} strokeLinejoin="round" opacity={lit[i]} />
					{flash[i] > 0.001 ? <path d={p.d} fill="#ffffff" opacity={0.75 * flash[i]} /> : null}
				</g>
			))}
			{EDITOR_POLYGONS.map((p, i) =>
				handles[i] > 0.001
					? p.handles.map(([x, y], k) => (
							<circle key={`${p.key}-${k}`} cx={x} cy={y} r={6.2 * handles[i]} fill={EDITOR.handle} stroke="#ffffff" strokeWidth={2.2} opacity={Math.min(1, handles[i] * 1.5)} />
						))
					: null,
			)}
		</svg>
	);
};
