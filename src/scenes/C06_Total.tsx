import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, CascadePop, IsoStage, UiPanelExpand, type DriftItem} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {EASE, popScale, prog} from '../motion/tokens';
import {APP, APP_CTA, FONT} from '../theme';
import {DUR, LABELS} from '../timeline';
import {Cursor} from '../ui/Cursor';
import {AppCard} from '../ui/Glass';
import {GlassPill, GradientTile, MiniChart, Orb, Ring, SkeletonCard} from '../ui/Floaters';
import {IconTile} from '../ui/Icon';
import {Pill} from '../ui/Pill';
import {CounterPill, RollText, TicketTypeRow} from '../ui/TicketCounter';
import {TotalCard} from '../ui/TotalCard';

// C06 "Quantidade e total". Ticket types of Cadeira Nível 1 (06-queue-and-purchase/03→04)
// on an isometric stage. Business value, not commodity labels: "Sem surpresa no valor." slams in
// word by word, stacked big on the right, with "O total atualiza a cada clique." (10-SCRIPTING-INPUT
// A: the total updates with quantity and type). Two clicks on "+" (0.5 / 1.0 s) take Inteira 0 → 2,
// each throwing a SHARP "+1" that springs up; the TOTAL card expands at 1.25 s with R$ 360,00 and
// "Continuar" shines at 2.0 s. Blur lives only in the background: glass fragments and prices.

const CARD = {x: 110, y: 150, w: 930, pad: 30};
const ROW_SCALE = 1.2;
const APPEAR = LABELS['C06.counter.appear'];
const PLUS1 = LABELS['C06.plus1'];
const PLUS2 = LABELS['C06.plus2'];
const TOTAL_AT = LABELS['C06.total.card'];
const SHINE = LABELS['C06.cta.shine'];
const PLUS_POS = {x: 928, y: 362};
const RIGHT = {x: 1100, w: 710};
// "Sem" / "surpresa" / "no valor." stacked on three lines.
const HEADLINE = [...COPY.C06.title[0].split(' ').map((w) => [w]), COPY.C06.title[1].split(' ')];

const DRIFT: DriftItem[] = [
	{x: 1500, y: 160, z: -820, drift: [-260, 10], node: <Pill icon="ticket" text={COPY.events.comedy.price} />},
	{x: 700, y: 1000, z: -700, drift: [-300, -10], node: <Pill icon="ticket" text={COPY.events.tech.price} />},
	{x: 1760, y: 990, z: -900, drift: [-240, -20], node: <MiniChart w={260} h={160} />},
	{x: 250, y: 1000, z: -960, drift: [-200, 0], node: <SkeletonCard w={300} h={150} icon="card" lines={2} />},
	{x: 1860, y: 560, z: -1000, drift: [-160, 20], node: <GradientTile size={100} icon="ticket" />},
	{x: 1180, y: 1030, z: -1100, drift: [-150, -10], node: <GlassPill w={230} icon="plus" />},
	{x: 60, y: 90, z: -1100, drift: [120, 10], node: <Orb size={90} />},
	{x: 1080, y: 60, z: -1150, drift: [-120, 10], node: <Ring size={130} />},
];

const PlusOne: React.FC<{at: number; t: number}> = ({at, t}) => {
	if (t < at) return null;
	const rise = prog(t, at, at + 0.6, 'cubicExpoOut');
	const out = prog(t, at + 0.45, at + 0.65, 'soft');
	if (out >= 1) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: PLUS_POS.x + 10,
				top: PLUS_POS.y - 60 - 110 * rise,
				width: 96,
				height: 96,
				borderRadius: 48,
				background: APP_CTA,
				boxShadow: '0 18px 40px -16px rgba(41,89,185,.7), inset 0 1px 0 rgba(255,255,255,.4)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: '#ffffff',
				fontFamily: FONT,
				fontSize: 40,
				fontWeight: 800,
				letterSpacing: '-0.03em',
				scale: String(popScale(t, at)),
				opacity: 1 - out,
				transform: 'translateZ(60px)',
			}}
		>
			{'+1'}
		</div>
	);
};

export const C06Total: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, L}) => {
		const iso = q('[data-iso="c06"]');
		tl.fromTo(iso, {rotateX: 16, rotateY: -22}, {rotateX: 4, rotateY: -6, duration: 1.3, ease: EASE.cubicExpoOut}, L('C06.counter.appear'));
		tl.to(iso, {rotateX: 2, rotateY: -2, duration: 1.4, ease: EASE.sine}, L('C06.total.card', 0.05));
		tl.fromTo(q('[data-shine6]'), {xPercent: -160}, {xPercent: 420, duration: 0.6, ease: EASE.cubicHardSnap}, L('C06.cta.shine'));
	});

	const c1 = prog(t, PLUS1, PLUS1 + 0.2, 'out');
	const c2 = prog(t, PLUS2, PLUS2 + 0.2, 'out');
	const from = t >= PLUS2 ? 1 : 0;
	const to = t >= PLUS2 ? 2 : t >= PLUS1 ? 1 : 0;
	const p = t >= PLUS2 ? c2 : c1;
	const plusGlow = Math.max(1 - prog(t, PLUS1, PLUS1 + 0.3, 'out'), 1 - prog(t, PLUS2, PLUS2 + 0.3, 'out')) * (t >= PLUS1 ? 1 : 0);
	// The total flips from one ticket (R$ 180,00) to two (R$ 360,00): no invented intermediate values.
	const totalP = prog(t, TOTAL_AT + 0.1, TOTAL_AT + 0.45, 'out');
	const ctaGlow = prog(t, SHINE, SHINE + 0.12, 'hit') * (1 - prog(t, SHINE + 0.2, SHINE + 0.8, 'soft'));
	const rowWidth = CARD.w - CARD.pad * 2;
	const rows = [
		<TicketTypeRow
			key="inteira"
			type="inteira"
			width={rowWidth}
			scale={ROW_SCALE}
			highlight={c1}
			price={COPY.tickets.prices.nivel1.inteira}
			counter={<CounterPill from={from} to={to} p={p} plusGlow={plusGlow} scale={ROW_SCALE} />}
		/>,
		<TicketTypeRow key="meia" type="meia" width={rowWidth} scale={ROW_SCALE} price={COPY.tickets.prices.nivel1.meia} counter={<CounterPill from={0} to={0} p={0} plusGlow={0} scale={ROW_SCALE} />} />,
		<TicketTypeRow
			key="solidaria"
			type="solidaria"
			width={rowWidth}
			scale={ROW_SCALE}
			price={COPY.tickets.prices.nivel1.solidaria}
			counter={<CounterPill from={0} to={0} p={0} plusGlow={0} scale={ROW_SCALE} />}
		/>,
	];

	const cursorKeys = [
		{t: PLUS1 - 0.4, x: 1500, y: 1150},
		{t: PLUS1 - 0.08, x: PLUS_POS.x, y: PLUS_POS.y},
		{t: PLUS2 + 0.3, x: PLUS_POS.x, y: PLUS_POS.y},
		{t: SHINE - 0.15, x: RIGHT.x + RIGHT.w / 2 + 40, y: 915},
	];

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c06" origin="760px 540px">
				<BackdropDrift items={DRIFT} from={0} to={DUR.C06} />
				<UiPanelExpand at={APPEAR} radius={[64, 36]} origin="50% 0%" style={{position: 'absolute', left: CARD.x, top: CARD.y}}>
					{(r) => (
						<AppCard radius={r} style={{width: CARD.w, boxSizing: 'border-box', padding: CARD.pad}}>
							<div style={{display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT}}>
								<IconTile name="ticket" size={62} />
								<div>
									<div style={{fontSize: 38, fontWeight: 800, color: APP.fg, letterSpacing: '-0.03em'}}>{COPY.C06.sectorTitle}</div>
									<div style={{fontSize: 20, fontWeight: 500, color: APP.muted, marginTop: 2}}>{COPY.C05.ticketsSub}</div>
								</div>
							</div>
							<div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 26}}>
								{rows.map((row, i) => (
									<CascadePop key={i} at={APPEAR + 0.05} index={i} origin="50% 50%">
										{row}
									</CascadePop>
								))}
							</div>
						</AppCard>
					)}
				</UiPanelExpand>

				<UiPanelExpand at={TOTAL_AT} radius={[72, 40]} origin="50% 100%" style={{position: 'absolute', left: RIGHT.x, top: 575}}>
					{(r) => (
						<TotalCard
							width={RIGHT.w}
							radius={r}
							value={<RollText from={COPY.C06.totalOne} to={COPY.C06.totalLineValue} p={totalP} height={104} />}
							ctaGlow={ctaGlow}
							shine={
								<div
									data-shine6
									style={{position: 'absolute', left: 0, top: 0, width: 140, height: '100%', background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)'}}
								/>
							}
						/>
					)}
				</UiPanelExpand>

				<PlusOne at={PLUS1} t={t} />
				<PlusOne at={PLUS2} t={t} />
				<Cursor t={t} keys={cursorKeys} clicks={[PLUS1, PLUS2]} handWindows={[[SHINE - 0.3, DUR.C06 - 0.3]]} show={[PLUS1 - 0.4, DUR.C06 - 0.3]} />
			</IsoStage>

			{/* Value headline in screen space: stacked big, words slam in on springs. */}
			<div style={{position: 'absolute', left: RIGHT.x - 10, top: 70}}>
				<Kinetic lines={HEADLINE} at={APPEAR + 0.1} mode="slam" step={5} size={128} lineHeight={0.98} weight={[500, 800]} gradientFrom={2} palette={PALETTE.brand} />
			</div>
			<div style={{position: 'absolute', left: RIGHT.x, top: 500}}>
				<Kinetic lines={[COPY.C06.sub.split(' ')]} at={APPEAR + 0.45} mode="pop" size={34} weight={[300, 700]} color="#4a5e7f" letterSpacing="-0.01em" />
			</div>
		</AbsoluteFill>
	);
};
