import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {FocusIn, Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, IsoStage, type DriftItem} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {blurFilter, EASE, lerp, popScale, prog, springAt, springSnappy, tween} from '../motion/tokens';
import {APP_CTA, BRAND, FONT} from '../theme';
import {DUR, LABELS} from '../timeline';
import {Cursor} from '../ui/Cursor';
import {GlassPill, GradientTile, Orb, PhotoChip, Ring, SkeletonCard} from '../ui/Floaters';
import {Icon} from '../ui/Icon';
import {Lockup} from '../ui/Lockup';

// C09 "Fecho" — final impact after the flash cut. The lockup slams on springSnappy, the landing's
// closing line flips up word by word in 3D with a flowing gradient, "Criar conta" pops, shines at
// 1.0 s, is clicked at 1.25 s and pulses at 1.5 s. At 2.0 s the line and the button pop OUT on
// springs; only once they are gone (2.7 s) the lockup springs to the centre, bigger, with a
// bouncy overshoot and a glint. The mandatory footnote holds from 1.0 s to the end.

const SLAM = LABELS['C09.logo.slam'];
const REVEAL = LABELS['C09.copy.reveal'];
const SHINE = LABELS['C09.cta.shine'];
const CLICK = LABELS['C09.cta.click'];
const PULSES = [LABELS['C09.cta.pulse1']];
const OUTRO = LABELS['C09.outro.pop'];
const HERO = Math.max(LABELS['C09.logo.hero'], OUTRO + 0.55);
/** Final lockup move: a bouncier spring than the UI pops (≈25 % overshoot, a couple of wobbles). */
const HERO_SPRING = {stiffness: 150, damping: 9, mass: 1};
const CTA_AT = REVEAL + 0.35;
const LOCKUP_Y = 300;
const CTA = {cx: 960, cy: 790, w: 430, h: 108};
const FOOT_Y = 1010;

const DRIFT: DriftItem[] = [
	{x: 250, y: 200, z: -800, drift: [120, 20], node: <PhotoChip src="openair" w={230} h={145} />},
	{x: 1690, y: 210, z: -900, drift: [-140, 10], node: <SkeletonCard w={300} h={160} icon="ticket" />},
	{x: 230, y: 870, z: -950, drift: [110, -20], node: <SkeletonCard w={290} h={150} icon="calendar" lines={2} />},
	{x: 1700, y: 870, z: -760, drift: [-120, -20], node: <PhotoChip src="tech" w={220} h={140} />},
	{x: 620, y: 90, z: -1100, drift: [80, 10], node: <Orb size={90} />},
	{x: 1800, y: 540, z: -1100, drift: [-40, -10], node: <GradientTile size={84} icon="check" />},
	{x: 1340, y: 80, z: -1150, drift: [-60, 10], node: <Ring size={140} />},
	{x: 140, y: 540, z: -1000, drift: [40, -10], node: <GlassPill w={200} icon="users" />},
];

export const C09Fecho: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, L}) => {
		tl.fromTo(q('[data-iso="c09"]'), {rotateX: -14, rotateY: 12}, {rotateX: 0, rotateY: 0, duration: 1.8, ease: EASE.cubicExpoOut}, L('C09.logo.slam'));
		tl.fromTo(q('[data-shine9]'), {xPercent: -160}, {xPercent: 460, duration: 0.6, ease: EASE.cubicHardSnap}, L('C09.cta.shine'));
	});

	// Slam: 2.1x → 1 on springSnappy; outro: after the pop-outs, 1.7x and centred on a bouncy spring.
	const slam = lerp(2.1, 1, springAt(t, SLAM, springSnappy));
	const hero = springAt(t, HERO, HERO_SPRING);
	const lockupScale = slam * lerp(1, 1.7, hero);
	const lockupShift = lerp(LOCKUP_Y - 540, 0, hero);
	const glint = t >= HERO + 0.45 && t <= HERO + 1.15 ? prog(t, HERO + 0.45, HERO + 1.15, 'inOut') : -1;

	let pulse = 0;
	for (const p of PULSES) if (t >= p) pulse = Math.max(pulse, 1 - prog(t, p, p + 0.45, 'out'));
	const press = t >= CLICK && t < CLICK + 0.25 ? tween(t, CLICK, CLICK + 0.06, 1, 0.95, 'hit') + tween(t, CLICK + 0.06, CLICK + 0.25, 0, 0.05, 'snap') : 1;
	const ctaScale = press * (1 + 0.05 * pulse);
	const ctaOutS = springAt(t, OUTRO + 0.1, springSnappy);
	const ctaOut = Math.max(0, 1 - ctaOutS);
	const ring = PULSES.map((p) => (t >= p && t < p + 0.6 ? prog(t, p, p + 0.6, 'out') : -1));
	const shineGlow = prog(t, SHINE, SHINE + 0.12, 'hit') * (1 - prog(t, SHINE + 0.2, SHINE + 0.9, 'soft'));

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c09">
				<BackdropDrift items={DRIFT} from={SLAM} to={DUR.C09} />
				<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
					<div style={{translate: `0px ${lockupShift.toFixed(1)}px`}}>
						<div style={{scale: String(lockupScale), opacity: t >= SLAM ? 1 : 0}}>
							<Lockup glint={glint} />
						</div>
					</div>
				</AbsoluteFill>

				<div style={{position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center'}}>
					<Kinetic lines={COPY.C09.lines} at={REVEAL} mode="flip" step={3} size={80} weight={[400, 800]} gradientFrom={COPY.C09.lines[0].length + 1} palette={PALETTE.brand} align="center" exitAt={OUTRO} />
				</div>

				<div style={{position: 'absolute', left: CTA.cx - CTA.w / 2, top: CTA.cy - CTA.h / 2, width: CTA.w, height: CTA.h, scale: String(popScale(t, CTA_AT) * ctaOut), opacity: t >= CTA_AT ? 1 : 0, filter: blurFilter(12 * Math.min(1, ctaOutS) + 12 * (1 - Math.min(1, popScale(t, CTA_AT))))}}>
					{ring.map((r, k) =>
						r >= 0 ? (
							<div
								key={k}
								style={{
									position: 'absolute',
									left: -30 * r,
									top: -30 * r,
									width: CTA.w + 60 * r,
									height: CTA.h + 60 * r,
									borderRadius: 999,
									border: '3px solid rgba(87,197,244,0.9)',
									opacity: 1 - r,
								}}
							/>
						) : null,
					)}
					<div
						style={{
							position: 'relative',
							width: '100%',
							height: '100%',
							borderRadius: 999,
							background: APP_CTA,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 16,
							color: '#ffffff',
							fontFamily: FONT,
							fontSize: 40,
							fontWeight: 800,
							letterSpacing: '-0.02em',
							overflow: 'hidden',
							scale: String(ctaScale),
							boxShadow: `0 ${24 + 20 * shineGlow}px ${50 + 40 * (shineGlow + pulse)}px -20px rgba(41,89,185,${0.65 + 0.3 * Math.max(shineGlow, pulse)}), inset 0 1px 0 rgba(255,255,255,.35)`,
						}}
					>
						<div data-shine9 style={{position: 'absolute', left: 0, top: 0, width: 120, height: '100%', background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)'}} />
						<span style={{position: 'relative'}}>{COPY.C09.cta}</span>
						<Icon name="arrow" size={36} color="#ffffff" stroke={2.8} style={{position: 'relative'}} />
					</div>
				</div>
			</IsoStage>

			<Cursor
				t={t}
				keys={[
					{t: CLICK - 0.55, x: 1500, y: 1140},
					{t: CLICK - 0.15, x: CTA.cx + 70, y: CTA.cy + 18},
					{t: CLICK + 0.35, x: CTA.cx + 70, y: CTA.cy + 18},
					{t: OUTRO - 0.05, x: CTA.cx + 460, y: CTA.cy + 260},
				]}
				clicks={[CLICK]}
				handWindows={[[CLICK - 0.3, CLICK + 0.45]]}
				show={[CLICK - 0.55, OUTRO - 0.05]}
			/>
			<FocusIn at={LABELS['C09.footnote']} rise={10} blur={8} style={{position: 'absolute', left: 0, right: 0, top: FOOT_Y - 12, textAlign: 'center', fontFamily: FONT, fontSize: 21, fontWeight: 500, color: BRAND.inkSoft}}>
				{COPY.footnote}
			</FocusIn>
		</AbsoluteFill>
	);
};
