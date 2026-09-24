import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, cascadeAt, IsoStage, UiPanelExpand, type DriftItem} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {EASE, prog} from '../motion/tokens';
import {APP, FONT} from '../theme';
import {LABELS} from '../timeline';
import {AppCard} from '../ui/Glass';
import {Icon} from '../ui/Icon';
import {Photo, PhotoCard} from '../ui/Photo';
import {Pill} from '../ui/Pill';

// C07 "Checkout relance" (26–28 s) for a DIFFERENT fictitious event ("Pulse Open Air"): summary
// card (06-queue-and-purchase/05) WITHOUT totals (the real checkout adds a platform fee), mirrored
// layout (summary left, holders right), fictitious holder names and masked documents. Business
// value on top: "Cada ingresso tem dono." (10-SCRIPTING-INPUT A: each ticket is linked to a
// holder) drops letter by letter into the top-right corner.

const RIGHT = {x: 790, w: 1020};
const SUMMARY = {x: 110, y: 205, w: 600};
const ENTER = LABELS['C07.holders.enter'];
const SLIDE = LABELS['C07.card.slide'];
const TYPE_AT = LABELS['C07.names.type'];

const DRIFT: DriftItem[] = [
	{x: 1600, y: 990, z: -800, drift: [-220, 0], node: <PhotoCard src="openair" width={380} height={240} />},
	{x: 560, y: 1000, z: -950, drift: [-200, -10], node: <PhotoCard src="stage" width={360} height={230} />},
	{x: 140, y: 110, z: -900, drift: [160, 10], node: <Pill icon="ticket" text={COPY.events.electro.price} />},
];

const Field: React.FC<{label: string; value: string; reveal: number; masked?: boolean}> = ({label, value, reveal, masked}) => (
	<div style={{flex: 1, minWidth: 0}}>
		<div style={{fontSize: 21, fontWeight: 600, color: APP.fg, marginBottom: 10}}>{label}</div>
		<div
			style={{
				height: 66,
				borderRadius: 20,
				border: '1.5px solid rgba(0,51,77,0.12)',
				background: '#ffffff',
				display: 'flex',
				alignItems: 'center',
				padding: '0 22px',
				overflow: 'hidden',
			}}
		>
			<span
				style={{
					fontSize: 25,
					fontWeight: 600,
					color: masked ? APP.muted : APP.fg,
					letterSpacing: masked ? '0.08em' : '-0.01em',
					whiteSpace: 'nowrap',
					clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)`,
				}}
			>
				{value}
			</span>
		</div>
	</div>
);

export const C07Checkout: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, L}) => {
		tl.fromTo(q('[data-iso="c07"]'), {rotateX: 12, rotateY: -18}, {rotateX: 3, rotateY: -4, duration: 1.3, ease: EASE.cubicExpoOut}, L('C07.holders.enter'));
		tl.from(q('[data-title7]'), {x: 60, opacity: 0, duration: 0.5, ease: EASE.cubicExpoOut}, L('C07.holders.enter'));
		tl.from(q('[data-summary]'), {x: -520, rotateY: 35, opacity: 0, duration: 0.6, ease: EASE.cubicExpoOut, transformOrigin: '0% 50%'}, L('C07.card.slide'));
	});

	const r1 = prog(t, TYPE_AT, TYPE_AT + 0.3, 'soft');
	const r2 = prog(t, TYPE_AT + 0.1, TYPE_AT + 0.4, 'soft');
	const d1 = prog(t, TYPE_AT + 0.15, TYPE_AT + 0.45, 'soft');
	const d2 = prog(t, TYPE_AT + 0.25, TYPE_AT + 0.55, 'soft');
	const holders = COPY.C07.holders;

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c07" origin="960px 540px">
				<BackdropDrift items={DRIFT} from={26} to={28} />
				<div data-title7 style={{position: 'absolute', left: RIGHT.x, top: 196, fontFamily: FONT}}>
					<div style={{fontSize: 44, fontWeight: 800, color: APP.fg, letterSpacing: '-0.03em'}}>{COPY.C07.title}</div>
					<div style={{fontSize: 21, fontWeight: 500, color: APP.muted, marginTop: 4}}>{COPY.C07.sub}</div>
				</div>
				{holders.map((h, i) => (
					<UiPanelExpand key={h.name} at={cascadeAt(ENTER, i)} radius={[60, 36]} style={{position: 'absolute', left: RIGHT.x, top: 300 + i * 262}}>
						{(r) => (
							<AppCard radius={r} style={{width: RIGHT.w, boxSizing: 'border-box', padding: '28px 34px', fontFamily: FONT}}>
								<div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18}}>
									<span style={{fontSize: 19, fontWeight: 700, letterSpacing: '0.14em', color: APP.muted}}>
										{COPY.C07.ticket} {i + 1}
									</span>
									<span style={{fontSize: 17, fontWeight: 700, color: '#2f9fe0', background: 'rgba(87,197,244,0.14)', padding: '4px 14px', borderRadius: 999}}>{COPY.C07.type}</span>
								</div>
								<div style={{display: 'flex', gap: 24}}>
									<Field label={COPY.C07.nameLabel} value={h.name} reveal={i === 0 ? r1 : r2} />
									<Field label={COPY.C07.docLabel} value={h.doc} reveal={i === 0 ? d1 : d2} masked />
								</div>
							</AppCard>
						)}
					</UiPanelExpand>
				))}

				<AppCard data-summary radius={40} style={{position: 'absolute', left: SUMMARY.x, top: SUMMARY.y, width: SUMMARY.w, overflow: 'hidden', fontFamily: FONT}}>
					<Photo src="electro" width={SUMMARY.w} height={290} zoom={1.05} />
					<div style={{padding: '30px 36px 36px'}}>
						<div style={{fontSize: 40, fontWeight: 800, color: APP.fg, letterSpacing: '-0.03em'}}>{COPY.C07.event}</div>
						<div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, fontSize: 23, color: APP.muted, fontWeight: 500}}>
							<Icon name="calendar" size={26} color={APP.muted} stroke={2} />
							{COPY.C07.when}
						</div>
						<div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 23, color: APP.muted, fontWeight: 500}}>
							<Icon name="pin" size={26} color={APP.muted} stroke={2} />
							{COPY.C07.where}
						</div>
						<div style={{height: 1, background: 'rgba(0,51,77,0.1)', margin: '26px 0'}} />
						<div style={{fontSize: 19, fontWeight: 700, letterSpacing: '0.12em', color: APP.muted}}>{COPY.C07.sector}</div>
						<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10}}>
							<span style={{fontSize: 32, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em'}}>{COPY.C07.items}</span>
							<span style={{fontSize: 24, fontWeight: 600, color: '#2f9fe0'}}>{COPY.C07.count}</span>
						</div>
					</div>
				</AppCard>
			</IsoStage>

			<div style={{position: 'absolute', right: 110, top: 60}}>
				<Kinetic lines={[[...COPY.C07.phrase[0].split(' '), ...COPY.C07.phrase[1].split(' ')]]} at={SLIDE - 0.1} mode="drop" size={100} weight={[300, 800]} gradientFrom={3} palette={PALETTE.hero} align="right" />
			</div>
		</AbsoluteFill>
	);
};
