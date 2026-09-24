import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, cascadeAt, IsoStage, UiPanelExpand, type DriftItem} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {EASE, prog} from '../motion/tokens';
import {APP, FONT} from '../theme';
import {C07_TYPING, DUR, LABELS, typedChars} from '../timeline';
import {GlassPill, GradientTile, Orb, Ring, SkeletonCard} from '../ui/Floaters';
import {AppCard} from '../ui/Glass';
import {Icon} from '../ui/Icon';
import {Photo} from '../ui/Photo';
import {Pill} from '../ui/Pill';

// C07 "Checkout" for a DIFFERENT fictitious event ("Pulse Open Air"): summary card
// (06-queue-and-purchase/05) WITHOUT totals (the real checkout adds a platform fee), mirrored
// layout (summary left, holders right), fictitious holder names and masked documents. The FOUR
// holders are filled one after the other, name then document, character by character (each key
// is a sound cue, src/timeline.ts C07_TYPING); the active field gets the focus ring and a caret, a
// finished ticket gets a check. Business value on top: "Cada ingresso tem dono." (10-SCRIPTING-INPUT
// A: each ticket is linked to a holder) drops letter by letter into the top-right corner.

const RIGHT = {x: 800, w: 1010, y: 290, cardH: 164, gap: 14};
const SUMMARY = {x: 110, y: 205, w: 600};
const ENTER = LABELS['C07.holders.enter'];
const SLIDE = LABELS['C07.card.slide'];

const DRIFT: DriftItem[] = [
	{x: 1640, y: 1030, z: -800, drift: [-220, 0], node: <GlassPill w={240} icon="user" />},
	{x: 560, y: 1000, z: -950, drift: [-200, -10], node: <SkeletonCard w={300} h={150} icon="card" lines={2} />},
	{x: 140, y: 110, z: -900, drift: [160, 10], node: <Pill icon="ticket" text={COPY.events.electro.price} />},
	{x: 700, y: 90, z: -1100, drift: [120, 10], node: <Orb size={84} />},
	{x: 1880, y: 620, z: -1000, drift: [-80, 20], node: <GradientTile size={86} icon="check" />},
	{x: 60, y: 900, z: -1100, drift: [100, -10], node: <Ring size={130} />},
];

const Field: React.FC<{label: string; value: string; shown: number; active: boolean; blink: boolean; masked?: boolean}> = ({label, value, shown, active, blink, masked}) => (
	<div style={{flex: 1, minWidth: 0}}>
		<div style={{fontSize: 18, fontWeight: 600, color: APP.fg, marginBottom: 8, lineHeight: 1}}>{label}</div>
		<div
			style={{
				height: 56,
				boxSizing: 'border-box',
				borderRadius: 18,
				border: `1.5px solid ${active ? '#57c5f4' : 'rgba(0,51,77,0.12)'}`,
				boxShadow: active ? '0 0 0 5px rgba(87,197,244,0.18)' : 'none',
				background: '#ffffff',
				display: 'flex',
				alignItems: 'center',
				padding: '0 20px',
				overflow: 'hidden',
			}}
		>
			<span style={{fontSize: 23, fontWeight: 600, color: masked ? APP.muted : APP.fg, letterSpacing: masked ? '0.08em' : '-0.01em', whiteSpace: 'pre'}}>{[...value].slice(0, shown).join('')}</span>
			{active && blink ? <span style={{width: 2.5, height: 28, marginLeft: 2, borderRadius: 2, background: '#2a8fd4'}} /> : null}
		</div>
	</div>
);

export const C07Checkout: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, L}) => {
		tl.fromTo(q('[data-iso="c07"]'), {rotateX: 12, rotateY: -18}, {rotateX: 3, rotateY: -4, duration: 1.3, ease: EASE.cubicExpoOut}, L('C07.holders.enter'));
		tl.to(q('[data-iso="c07"]'), {rotateX: 2, rotateY: -1, duration: Math.max(0.5, DUR.C07 - 1.3), ease: EASE.sine}, L('C07.holders.enter', 1.3));
		tl.fromTo(q('[data-title7]'), {x: 60, opacity: 0, filter: 'blur(12px)'}, {x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.5, ease: EASE.cubicExpoOut}, L('C07.holders.enter'));
		tl.from(q('[data-summary]'), {x: -520, rotateY: 35, opacity: 0, duration: 0.6, ease: EASE.cubicExpoOut, transformOrigin: '0% 50%'}, L('C07.card.slide'));
	});

	const holders = COPY.C07.holders;
	const blink = Math.floor(t * 4) % 2 === 0;
	const fieldOf = (i: number, f: 'name' | 'doc') => C07_TYPING.find((x) => x.holder === i && x.field === f)!;

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c07" origin="960px 540px">
				<BackdropDrift items={DRIFT} from={0} to={DUR.C07} />
				<div data-title7 style={{position: 'absolute', left: RIGHT.x, top: 188, fontFamily: FONT}}>
					<div style={{fontSize: 44, fontWeight: 800, color: APP.fg, letterSpacing: '-0.03em'}}>{COPY.C07.title}</div>
					<div style={{fontSize: 21, fontWeight: 500, color: APP.muted, marginTop: 4}}>{COPY.C07.sub}</div>
				</div>
				{holders.map((h, i) => {
					const fName = fieldOf(i, 'name');
					const fDoc = fieldOf(i, 'doc');
					const nameActive = t >= fName.start && t < fDoc.start;
					const docActive = t >= fDoc.start && t < fDoc.end + 0.12;
					const done = prog(t, fDoc.end + 0.05, fDoc.end + 0.3, 'snap');
					const current = nameActive || docActive;
					return (
						<UiPanelExpand key={h.name} at={cascadeAt(ENTER, i)} radius={[64, 40]} style={{position: 'absolute', left: RIGHT.x, top: RIGHT.y + i * (RIGHT.cardH + RIGHT.gap)}}>
							{(r) => (
								<AppCard
									radius={r}
									style={{
										width: RIGHT.w,
										height: RIGHT.cardH,
										boxSizing: 'border-box',
										padding: '20px 30px',
										fontFamily: FONT,
										boxShadow: current ? '0 24px 60px -26px rgba(41,89,185,.6), 0 0 0 2px rgba(87,197,244,0.55)' : undefined,
									}}
								>
									<div style={{display: 'flex', alignItems: 'center', gap: 14, height: 30, marginBottom: 12}}>
										<span style={{fontSize: 18, fontWeight: 700, letterSpacing: '0.14em', color: APP.muted, lineHeight: 1}}>
											{COPY.C07.ticket} {i + 1}
										</span>
										<span style={{display: 'inline-flex', alignItems: 'center', height: 30, fontSize: 16, lineHeight: 1, fontWeight: 700, color: '#2f9fe0', background: 'rgba(87,197,244,0.14)', padding: '0 14px', borderRadius: 999}}>{h.type}</span>
										<span
											style={{
												marginLeft: 'auto',
												width: 30,
												height: 30,
												borderRadius: 15,
												background: 'linear-gradient(135deg, #57c5f4, #2959b9)',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												scale: String(done),
												opacity: done > 0.01 ? 1 : 0,
											}}
										>
											<Icon name="check" size={18} color="#ffffff" stroke={3.2} />
										</span>
									</div>
									<div style={{display: 'flex', gap: 22}}>
										<Field label={COPY.C07.nameLabel} value={h.name} shown={typedChars(fName, t)} active={nameActive} blink={blink} />
										<Field label={COPY.C07.docLabel} value={h.doc} shown={typedChars(fDoc, t)} active={docActive} blink={blink} masked />
									</div>
								</AppCard>
							)}
						</UiPanelExpand>
					);
				})}

				<AppCard data-summary radius={44} style={{position: 'absolute', left: SUMMARY.x, top: SUMMARY.y, width: SUMMARY.w, overflow: 'hidden', fontFamily: FONT}}>
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
						<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
							<span style={{fontSize: 19, fontWeight: 700, letterSpacing: '0.12em', color: APP.muted}}>{COPY.C07.sector}</span>
							<span style={{fontSize: 22, fontWeight: 700, color: '#2f9fe0'}}>{COPY.C07.count}</span>
						</div>
						{COPY.C07.items.map((it) => (
							<div key={it} style={{fontSize: 28, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em', marginTop: 10}}>
								{it}
							</div>
						))}
					</div>
				</AppCard>
			</IsoStage>

			<div style={{position: 'absolute', right: 110, top: 56}}>
				<Kinetic lines={[[...COPY.C07.phrase[0].split(' '), ...COPY.C07.phrase[1].split(' ')]]} at={SLIDE - 0.1} mode="drop" size={100} weight={[300, 800]} gradientFrom={3} palette={PALETTE.hero} align="right" />
			</div>
		</AbsoluteFill>
	);
};
