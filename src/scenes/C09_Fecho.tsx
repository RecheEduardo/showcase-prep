import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, IsoStage, type DriftItem} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {EASE, lerp, popScale, prog, springAt, springSnappy, tween} from '../motion/tokens';
import {APP_CTA, BRAND, FONT} from '../theme';
import {LABELS, SFX_CUES} from '../timeline';
import {Cursor} from '../ui/Cursor';
import {Icon} from '../ui/Icon';
import {Lockup} from '../ui/Lockup';
import {PhotoCard} from '../ui/Photo';

// C09 "Fecho" (34–38 s) — final impact on the 34.0 kick after the flash cut. The lockup slams on
// springSnappy, the landing's closing line flips up word by word in 3D with a flowing gradient,
// "Criar conta" pops, shines at 35.0, is clicked at 35.25 and pulses at 35.5. At 36.0 the line and
// the button pop OUT on springs and the lockup pops back IN, bigger and centred, with a glint.
// The mandatory footnote holds 35.0–38.0 while other events glide far behind.

const SLAM = LABELS['C09.logo.slam'];
const REVEAL = LABELS['C09.copy.reveal'];
const SHINE = LABELS['C09.cta.shine'];
const CLICK = SFX_CUES.find((c) => c.id === 'sfx.c09.click')!.t;
const PULSES = [LABELS['C09.cta.pulse1']];
const OUTRO = LABELS['C09.outro.pop'];
const CTA_AT = REVEAL + 0.35;
const LOCKUP_Y = 300;
const CTA = {cx: 960, cy: 790, w: 430, h: 108};
const FOOT_Y = 1010;

const DRIFT: DriftItem[] = [
	{x: 260, y: 200, z: -800, drift: [120, 20], node: <PhotoCard src="openair" width={400} height={250} />},
	{x: 1680, y: 220, z: -900, drift: [-140, 10], node: <PhotoCard src="comedy" width={380} height={240} />},
	{x: 230, y: 860, z: -950, drift: [110, -20], node: <PhotoCard src="samba" width={380} height={240} />},
	{x: 1700, y: 860, z: -760, drift: [-120, -20], node: <PhotoCard src="tech" width={400} height={250} />},
];

export const C09Fecho: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, L}) => {
		tl.fromTo(q('[data-iso="c09"]'), {rotateX: -14, rotateY: 12}, {rotateX: 0, rotateY: 0, duration: 1.8, ease: EASE.cubicExpoOut}, L('C09.logo.slam'));
		tl.fromTo(q('[data-shine9]'), {xPercent: -160}, {xPercent: 460, duration: 0.6, ease: EASE.cubicHardSnap}, L('C09.cta.shine'));
	});

	// Slam: 2.1x → 1 on springSnappy; outro: back IN, 1.7x and centred, on another springSnappy.
	const slam = lerp(2.1, 1, springAt(t, SLAM, springSnappy));
	const hero = springAt(t, OUTRO + 0.08, springSnappy);
	const lockupScale = slam * lerp(1, 1.7, hero);
	const lockupShift = lerp(LOCKUP_Y - 540, 0, hero);
	const glint = t >= OUTRO + 0.5 && t <= OUTRO + 1.2 ? prog(t, OUTRO + 0.5, OUTRO + 1.2, 'inOut') : -1;

	let pulse = 0;
	for (const p of PULSES) if (t >= p) pulse = Math.max(pulse, 1 - prog(t, p, p + 0.45, 'out'));
	const press = t >= CLICK && t < CLICK + 0.25 ? tween(t, CLICK, CLICK + 0.06, 1, 0.95, 'hit') + tween(t, CLICK + 0.06, CLICK + 0.25, 0, 0.05, 'snap') : 1;
	const ctaScale = press * (1 + 0.05 * pulse);
	const ctaOut = Math.max(0, 1 - springAt(t, OUTRO + 0.1, springSnappy));
	const ring = PULSES.map((p) => (t >= p && t < p + 0.6 ? prog(t, p, p + 0.6, 'out') : -1));
	const shineGlow = prog(t, SHINE, SHINE + 0.12, 'hit') * (1 - prog(t, SHINE + 0.2, SHINE + 0.9, 'soft'));

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c09">
				<BackdropDrift items={DRIFT} from={SLAM} to={38} />
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

				<div style={{position: 'absolute', left: CTA.cx - CTA.w / 2, top: CTA.cy - CTA.h / 2, width: CTA.w, height: CTA.h, scale: String(popScale(t, CTA_AT) * ctaOut)}}>
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
					{t: 34.7, x: 1500, y: 1140},
					{t: 35.1, x: CTA.cx + 70, y: CTA.cy + 18},
					{t: 35.6, x: CTA.cx + 70, y: CTA.cy + 18},
					{t: 35.95, x: CTA.cx + 460, y: CTA.cy + 260},
				]}
				clicks={[CLICK]}
				handWindows={[[34.95, 35.7]]}
				show={[34.7, 35.95]}
			/>
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: FOOT_Y - 12,
					textAlign: 'center',
					fontFamily: FONT,
					fontSize: 21,
					fontWeight: 500,
					color: BRAND.inkSoft,
					opacity: prog(t, LABELS['C09.footnote'], LABELS['C09.footnote'] + 0.4, 'soft'),
				}}
			>
				{COPY.footnote}
			</div>
		</AbsoluteFill>
	);
};
