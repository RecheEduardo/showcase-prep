import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, CascadePop, IsoStage, type DriftItem} from '../motion/patterns';
import {useSceneTimeline} from '../motion/scene';
import {EASE} from '../motion/tokens';
import {CATEGORY_TILES} from '../theme';
import {DUR, LABELS} from '../timeline';
import {CategoryTile} from '../ui/CategoryTile';
import {GlassPill, GradientTile, MiniChart, Orb, PhotoChip, Ring, SkeletonCard} from '../ui/Floaters';

// C02 "Vitrine". SnapZoom pull-in into an isometric home. The headline words shoot in from
// outside the frame (from the left, speed-stretched) at the top centre; the ten real categories
// Cascade Pop (springSnappy, 3 frames apart) from 0.25 s; "Tudo num só lugar." drops letter by
// letter into the bottom-right corner in a DEEP blue gradient (contrast on the ice background).
// Behind: glass fragments, a mini chart, orbs and only two small photos (depth of field).

const TILE = {w: 318, h: 218, gap: 24, x0: 117, y0: 232};
const CASCADE = LABELS['C02.tiles.cascade.start'];
const SETTLED = LABELS['C02.tiles.cascade.end'];

const DRIFT: DriftItem[] = [
	{x: 200, y: 120, z: -900, drift: [140, 20], node: <SkeletonCard w={320} h={170} icon="grid" />},
	{x: 1730, y: 120, z: -820, drift: [-150, 30], node: <PhotoChip src="festival" w={230} h={145} />},
	{x: 250, y: 960, z: -760, drift: [120, -20], node: <MiniChart w={270} h={170} />},
	{x: 1180, y: 1010, z: -980, drift: [-100, -10], node: <PhotoChip src="samba" w={210} h={135} />},
	{x: 1740, y: 960, z: -900, drift: [-120, -10], node: <GlassPill w={250} icon="ticket" />},
	{x: 700, y: 1030, z: -1100, drift: [90, -10], node: <Orb size={96} />},
	{x: 620, y: 60, z: -1100, drift: [80, 10], node: <GradientTile size={80} icon="calendar" />},
	{x: 1320, y: 60, z: -1150, drift: [-80, 10], node: <Ring size={140} />},
];

export const C02Vitrine: React.FC = () => {
	const scope = useSceneTimeline(({timeline: tl, selector: q, at, L}) => {
		const iso = q('[data-iso="c02"]');
		tl.fromTo(iso, {rotateX: 26, rotateY: -20}, {rotateX: 8, rotateY: -6, duration: 1.5, ease: EASE.cubicExpoOut}, at(0));
		tl.to(iso, {rotateX: 5, rotateY: -2, duration: 1.8, ease: EASE.sine}, L('C02.tiles.cascade.end', 0.3));
	});

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c02">
				<BackdropDrift items={DRIFT} from={0} to={DUR.C02} />
				{CATEGORY_TILES.map((c, i) => (
					<CascadePop
						key={c.name}
						at={CASCADE}
						index={i}
						origin="50% 60%"
						style={{position: 'absolute', left: TILE.x0 + (i % 5) * (TILE.w + TILE.gap), top: TILE.y0 + Math.floor(i / 5) * (TILE.h + TILE.gap)}}
					>
						<CategoryTile dataIndex={i} name={COPY.C02.tiles[i]} from={c.from} to={c.to} width={TILE.w} height={TILE.h} />
					</CascadePop>
				))}
			</IsoStage>

			<div style={{position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', justifyContent: 'center'}}>
				<Kinetic lines={[COPY.C02.title.split(' ')]} at={0.05} mode="fly" from="left" step={4} size={104} weight={[400, 800]} gradientFrom={2} palette={PALETTE.brand} />
			</div>
			<div style={{position: 'absolute', right: TILE.x0, top: 770, display: 'flex', justifyContent: 'flex-end'}}>
				<Kinetic lines={[COPY.C02.subtitle.split(' ')]} at={SETTLED + 0.05} mode="drop" size={80} weight={[300, 800]} gradientFrom={0} palette={PALETTE.deep} align="right" shadow="0 10px 30px rgba(255,255,255,0.55)" />
			</div>
		</AbsoluteFill>
	);
};
