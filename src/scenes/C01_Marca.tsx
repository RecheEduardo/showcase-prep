import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, IsoStage, type DriftItem} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {EASE, lerp, prog, springAt, springSnappy} from '../motion/tokens';
import {CATEGORY_TILES} from '../theme';
import {LABELS} from '../timeline';
import {CategoryTile} from '../ui/CategoryTile';
import {Lockup} from '../ui/Lockup';
import {PhotoCard} from '../ui/Photo';
import {Pill} from '../ui/Pill';

// C01 "Marca" (5–8 s) — SOLUTION. Hard cut on the 5.0 downbeat: the app symbol + wordmark slam in
// on springSnappy while event photos glide far behind (background depth of field). The tagline
// pops letter by letter at 5.5 (springs, alternating tilt, variable weight 250 → 800) and
// "Em 1 clique." keeps a flowing gradient; the frame then settles until the SnapZoom at 8.0.

const SLAM = LABELS['C01.logo.slam'];
const TAGLINE = LABELS['C01.tagline.cascade'];
const LOCKUP_CY = 430;

const DRIFT: DriftItem[] = [
	{x: 190, y: 170, z: -700, drift: [90, 20], node: <PhotoCard src="stage" width={320} height={210} />},
	{x: 1740, y: 160, z: -820, drift: [-100, 30], node: <PhotoCard src="food" width={320} height={210} />},
	{x: 170, y: 920, z: -880, drift: [110, -20], node: <PhotoCard src="art" width={320} height={210} />},
	{x: 1760, y: 910, z: -680, drift: [-90, -30], node: <PhotoCard src="comedy" width={300} height={200} />},
	{x: 960, y: 1020, z: -1000, drift: [80, -10], node: <CategoryTile name={COPY.C02.tiles[8]} from={CATEGORY_TILES[8].from} to={CATEGORY_TILES[8].to} width={260} height={160} />},
	{x: 960, y: 80, z: -950, drift: [-70, 10], node: <Pill icon="ticket" text={COPY.events.festival.price} />},
];

export const C01Marca: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, L}) => {
		tl.fromTo(q('[data-iso="c01"]'), {rotateX: 16, rotateY: -20}, {rotateX: 3, rotateY: 5, duration: 2.6, ease: EASE.cubicExpoOut}, L('C01.logo.slam'));
	});

	// Slam: 2.2x → 1 on springSnappy (the overshoot dips under 1 and settles).
	const slam = lerp(2.2, 1, springAt(t, SLAM, springSnappy));
	const glint = t >= 6.25 && t <= 6.95 ? prog(t, 6.25, 6.95, 'inOut') : -1;

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c01">
				<BackdropDrift items={DRIFT} from={SLAM} to={8} />
				<div style={{position: 'absolute', left: 0, right: 0, top: LOCKUP_CY - 100, display: 'flex', justifyContent: 'center'}}>
					<div style={{scale: String(slam), opacity: t >= SLAM ? 1 : 0}}>
						<Lockup size={200} glint={glint} />
					</div>
				</div>
				<div style={{position: 'absolute', left: 0, right: 0, top: 590, display: 'flex', justifyContent: 'center'}}>
					<Kinetic
						lines={[[...COPY.C01.titleWords, ...COPY.C01.typed.split(' ')]]}
						at={TAGLINE}
						mode="pop"
						size={92}
						weight={[250, 800]}
						gradientFrom={COPY.C01.titleWords.length}
						palette={PALETTE.brand}
					/>
				</div>
			</IsoStage>
		</AbsoluteFill>
	);
};
