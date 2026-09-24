import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, IsoStage, type DriftItem} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {EASE, lerp, prog, springAt, springSnappy} from '../motion/tokens';
import {DUR, LABELS} from '../timeline';
import {GlassPill, GradientTile, Orb, PhotoChip, Ring, SkeletonCard} from '../ui/Floaters';
import {Lockup} from '../ui/Lockup';
import {Pill} from '../ui/Pill';

// C01 "Marca" — SOLUTION. Hard cut: the app symbol + wordmark slam in on springSnappy while glass
// fragments, blue tiles and orbs glide far behind (background depth of field; only two small
// photos). The tagline pops letter by letter at 0.5 s and "Em 1 clique." keeps a flowing
// gradient; the frame then settles until the SnapZoom at the end of the scene.

const SLAM = LABELS['C01.logo.slam'];
const TAGLINE = LABELS['C01.tagline.cascade'];
const LOCKUP_CY = 430;

const DRIFT: DriftItem[] = [
	{x: 230, y: 190, z: -700, drift: [90, 20], node: <SkeletonCard w={300} h={160} icon="calendar" />},
	{x: 1720, y: 170, z: -820, drift: [-100, 30], node: <PhotoChip src="stage" w={220} h={140} />},
	{x: 190, y: 900, z: -880, drift: [110, -20], node: <PhotoChip src="food" w={200} h={130} />},
	{x: 1740, y: 900, z: -680, drift: [-90, -30], node: <SkeletonCard w={290} h={150} icon="users" lines={2} />},
	{x: 560, y: 110, z: -1000, drift: [60, 10], node: <Orb size={90} />},
	{x: 1420, y: 1010, z: -950, drift: [-70, -10], node: <GradientTile size={92} icon="ticket" />},
	{x: 1350, y: 90, z: -1100, drift: [-60, 10], node: <Ring size={150} />},
	{x: 560, y: 1000, z: -900, drift: [80, -10], node: <GlassPill w={240} icon="check" />},
	{x: 960, y: 70, z: -950, drift: [-70, 10], node: <Pill icon="ticket" text={COPY.events.festival.price} />},
	{x: 90, y: 560, z: -1150, drift: [40, 30], node: <Orb size={70} tone="ice" />},
	{x: 1850, y: 560, z: -1150, drift: [-40, -30], node: <GradientTile size={70} icon="map" />},
];

export const C01Marca: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, L}) => {
		tl.fromTo(q('[data-iso="c01"]'), {rotateX: 16, rotateY: -20}, {rotateX: 3, rotateY: 5, duration: 2.6, ease: EASE.cubicExpoOut}, L('C01.logo.slam'));
	});

	// Slam: 2.2x → 1 on springSnappy (the overshoot dips under 1 and settles).
	const slam = lerp(2.2, 1, springAt(t, SLAM, springSnappy));
	const glint = t >= SLAM + 1.25 && t <= SLAM + 1.95 ? prog(t, SLAM + 1.25, SLAM + 1.95, 'inOut') : -1;

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c01">
				<BackdropDrift items={DRIFT} from={SLAM} to={DUR.C01} />
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
