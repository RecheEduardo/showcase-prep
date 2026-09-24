import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, CascadePop, IsoStage, type DriftItem} from '../motion/patterns';
import {useSceneTimeline} from '../motion/scene';
import {EASE} from '../motion/tokens';
import {CATEGORY_TILES} from '../theme';
import {LABELS} from '../timeline';
import {CategoryTile} from '../ui/CategoryTile';
import {PhotoCard} from '../ui/Photo';

// C02 "Vitrine" (8–11 s). SnapZoom pull-in on the 8.0 kick into an isometric home. The headline
// words shoot in from outside the frame (from the left, speed-stretched) at the top centre;
// the ten real categories Cascade Pop (springSnappy, 3 frames apart) on the blips 8.25 → 8.70;
// "Tudo num só lugar." drops letter by letter into the bottom-right corner with a flowing
// gradient. Other events glide far behind (background depth of field). ~1.5 s reading hold.

const TILE = {w: 318, h: 218, gap: 24, x0: 117, y0: 232};
const CASCADE = LABELS['C02.tiles.cascade.start'];
const SETTLED = LABELS['C02.tiles.cascade.end'];

const DRIFT: DriftItem[] = [
	{x: 230, y: 130, z: -900, drift: [140, 20], node: <PhotoCard src="openair" width={420} height={260} />},
	{x: 1700, y: 140, z: -820, drift: [-150, 30], node: <PhotoCard src="festival" width={440} height={270} />},
	{x: 330, y: 900, z: -760, drift: [120, -20], node: <PhotoCard src="samba" width={420} height={260} />},
	{x: 960, y: 980, z: -980, drift: [-100, -10], node: <PhotoCard src="run" width={400} height={250} />},
];

export const C02Vitrine: React.FC = () => {
	const scope = useSceneTimeline(({timeline: tl, selector: q, at, L}) => {
		const iso = q('[data-iso="c02"]');
		tl.fromTo(iso, {rotateX: 26, rotateY: -20}, {rotateX: 8, rotateY: -6, duration: 1.5, ease: EASE.cubicExpoOut}, at(8.0));
		tl.to(iso, {rotateX: 5, rotateY: -2, duration: 1.8, ease: EASE.sine}, L('C02.tiles.cascade.end', 0.3));
	});

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c02">
				<BackdropDrift items={DRIFT} from={8} to={11} />
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
				<Kinetic lines={[COPY.C02.title.split(' ')]} at={8.05} mode="fly" from="left" step={4} size={104} weight={[400, 800]} gradientFrom={2} palette={PALETTE.brand} />
			</div>
			<div style={{position: 'absolute', right: TILE.x0, top: 770, display: 'flex', justifyContent: 'flex-end'}}>
				<Kinetic lines={[COPY.C02.subtitle.split(' ')]} at={SETTLED + 0.05} mode="drop" size={80} weight={[300, 800]} gradientFrom={0} palette={PALETTE.hero} align="right" />
			</div>
		</AbsoluteFill>
	);
};
