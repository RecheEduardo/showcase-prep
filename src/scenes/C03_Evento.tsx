import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic} from '../motion/kinetic';
import {CascadePop, IsoStage, UiPanelExpand} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {EASE, prog, tween} from '../motion/tokens';
import {APP, BRAND, FONT} from '../theme';
import {LABELS} from '../timeline';
import {Cursor} from '../ui/Cursor';
import {AppCard} from '../ui/Glass';
import {Icon} from '../ui/Icon';
import {Photo} from '../ui/Photo';
import {Pill} from '../ui/Pill';

// C03 "O evento" (11–13 s). Event page (02-event-details, features/event-details) of the fictitious
// "Mega Arena Game Show 2026" in an isometric camera: parallax banner with the frontend's
// transparent → black/90 foot gradient, the title flipping up in 3D at its bottom-left corner,
// info pills, the "Sobre o Evento" description card (EventDescription.tsx) and the ticket panel
// whose first date card pulses on the 12.0 kick and is clicked at 12.5. The camera flattens
// before the click so the card can expand into navy (C04) in screen space.

const EVENT = COPY.events.arena;
const BANNER_H = 620;
const PANEL = {x: 1090, y: 470, w: 720, pad: 28};
const CARD = {x: PANEL.x + PANEL.pad, w: PANEL.w - PANEL.pad * 2, h: 132, y0: PANEL.y + PANEL.pad + 56 + 22, gap: 16};
const PANEL_H = PANEL.pad * 2 + 56 + 22 + CARD.h * 2 + CARD.gap;
const LEFT = {x: 100, w: 930};
const EXPAND = LABELS['C03.panel.expand'];
const PULSE = LABELS['C03.datecard.pulse'];
const CLICK = LABELS['C03.datecard.click'];
const OPEN = CLICK + 0.05;

const DateCard: React.FC<{i: number}> = ({i}) => {
	const d = COPY.C03.dateCards[i];
	return (
		<div
			data-date={i}
			style={{
				width: CARD.w,
				height: CARD.h,
				boxSizing: 'border-box',
				padding: '22px 26px',
				borderRadius: 26,
				background: '#ffffff',
				boxShadow: '0 16px 40px -22px rgba(41,89,185,.45), inset 0 0 0 1px rgba(0,51,77,.05)',
				display: 'flex',
				alignItems: 'center',
				gap: 18,
				fontFamily: FONT,
			}}
		>
			<Icon name="calendar" size={30} color="#57c5f4" stroke={2} />
			<div style={{flex: 1}}>
				<div style={{fontSize: 25, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>{d.day}</div>
				<div style={{fontSize: 20, fontWeight: 500, color: APP.muted, marginTop: 6}}>{d.time}</div>
			</div>
			<div style={{textAlign: 'right'}}>
				<div style={{fontSize: 16, fontWeight: 500, color: APP.muted}}>{d.from}</div>
				<div style={{fontSize: 30, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em'}}>{d.price}</div>
			</div>
			<Icon name="chevron" size={26} color="#2f86d6" stroke={2.6} />
		</div>
	);
};

export const C03Evento: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, at, L}) => {
		const iso = q('[data-iso="c03"]');
		tl.fromTo(iso, {rotateX: 12, rotateY: 16}, {rotateX: 3, rotateY: 4, duration: 1.0, ease: EASE.cubicExpoOut}, at(11.0));
		// Flatten before the click: the expanding card lives in screen space.
		tl.to(iso, {rotateX: 0, rotateY: 0, duration: 0.45, ease: EASE.cubicExpoOut}, L('C03.datecard.pulse'));
		// Pulse on the kick, press on the click.
		tl.to(q('[data-date="0"]'), {scale: 1.045, duration: 0.1, ease: EASE.hit}, L('C03.datecard.pulse'));
		tl.to(q('[data-date="0"]'), {scale: 1, duration: 0.4, ease: EASE.snap}, L('C03.datecard.pulse', 0.1));
		tl.to(q('[data-date="0"]'), {scale: 0.97, duration: 0.05, ease: EASE.hit}, L('C03.datecard.click'));
		tl.to(q('[data-date="0"]'), {scale: 1, duration: 0.15, ease: EASE.snap}, L('C03.datecard.click', 0.05));
		// Card expand (12.55–13.0): the clicked card grows to full frame and turns navy.
		const card = q('[data-expand]');
		tl.set(card, {opacity: 1}, at(OPEN));
		tl.to(card, {left: 0, top: 0, width: 1920, height: 1080, borderRadius: 0, duration: 13 - OPEN, ease: EASE.cubicHardSnap}, at(OPEN));
		tl.to(card, {backgroundColor: BRAND.navy, duration: 0.25, ease: EASE.soft}, at(OPEN + 0.03));
	});

	const ringP = prog(t, PULSE, PULSE + 0.6, 'out');
	const card0 = {x: CARD.x, y: CARD.y0};
	const push = 1.04 + 0.05 * prog(t, 11, 13, 'sine');
	const chips = [
		{icon: 'calendar' as const, text: EVENT.day},
		{icon: 'clock' as const, text: EVENT.time},
		{icon: 'pin' as const, text: `${EVENT.venue}, ${EVENT.city}`},
	];

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c03">
				{/* Banner as in ParallaxBanner.tsx: brightness 85 %, transparent → black/90 at the foot.
				    It bleeds past the frame so the isometric tilt never uncovers its edges. */}
				<div style={{position: 'absolute', left: -120, top: -80, width: 2160, height: BANNER_H + 80, overflow: 'hidden'}}>
					<Photo src="arena" width={2160} height={BANNER_H + 80} zoom={push} position="50% 40%" brightness={0.85} />
					<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.9) 100%)'}} />
				</div>

				<div style={{position: 'absolute', left: LEFT.x, top: 250}}>
					<CascadePop at={11.0} index={0} origin="0% 50%" style={{marginBottom: 20, display: 'inline-block'}}>
						<div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', fontFamily: FONT}}>
							<span style={{width: 10, height: 10, borderRadius: 5, background: '#57c5f4'}} />
							<span style={{fontSize: 20, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#ffffff'}}>{COPY.C03.eyebrow}</span>
						</div>
					</CascadePop>
					<Kinetic lines={[COPY.C03.title[0].split(' '), COPY.C03.title[1].split(' ')]} at={11.05} mode="flip" step={4} size={104} color="#ffffff" weight={[500, 800]} shadow="0 12px 40px rgba(0,0,0,0.45)" />
				</div>

				<div style={{position: 'absolute', left: LEFT.x, top: BANNER_H + 36, display: 'flex', gap: 14}}>
					{chips.map((c, i) => (
						<CascadePop key={c.icon} at={11.1} index={i}>
							<Pill icon={c.icon} text={c.text} />
						</CascadePop>
					))}
				</div>

				{/* "Sobre o Evento" (EventDescription.tsx): heading with the Info icon + rounded card. */}
				<div style={{position: 'absolute', left: LEFT.x, top: BANNER_H + 128, width: LEFT.w, fontFamily: FONT}}>
					<CascadePop at={EXPAND} index={0} origin="0% 50%" style={{display: 'flex', alignItems: 'center', gap: 12}}>
						<Icon name="info" size={36} color="#57c5f4" stroke={2.2} />
						<span style={{fontSize: 36, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}>{COPY.C03.aboutTitle}</span>
					</CascadePop>
					<UiPanelExpand at={EXPAND + 0.05} radius={[56, 32]} origin="0% 0%" style={{marginTop: 18}}>
						{(r) => (
							<div
								style={{
									borderRadius: r,
									padding: '26px 38px',
									background: 'rgba(255,255,255,0.78)',
									border: '1px solid rgba(255,255,255,0.95)',
									boxShadow: '0 1px 2px 0 rgba(87,197,244,0.45), 0 18px 40px -26px rgba(41,89,185,0.45)',
									fontSize: 23,
									fontWeight: 500,
									lineHeight: 1.55,
									color: APP.muted,
								}}
							>
								{EVENT.description}
							</div>
						)}
					</UiPanelExpand>
				</div>

				<UiPanelExpand at={EXPAND} radius={[64, 36]} origin="50% 0%" style={{position: 'absolute', left: PANEL.x, top: PANEL.y}}>
					{(r) => (
						<AppCard radius={r} style={{width: PANEL.w, height: PANEL_H, boxSizing: 'border-box', padding: PANEL.pad}}>
							<div style={{display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT}}>
								<Icon name="ticket" size={40} color="#57c5f4" stroke={2} />
								<span style={{fontSize: 36, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}>{COPY.C03.ticketsHeader}</span>
							</div>
						</AppCard>
					)}
				</UiPanelExpand>
				{t >= PULSE && t < PULSE + 0.6 ? (
					<div
						style={{
							position: 'absolute',
							left: CARD.x - 14 * ringP - 4,
							top: CARD.y0 - 14 * ringP - 4,
							width: CARD.w + 28 * ringP + 8,
							height: CARD.h + 28 * ringP + 8,
							borderRadius: 30 + 14 * ringP,
							border: '3px solid rgba(87,197,244,0.9)',
							opacity: 1 - ringP,
						}}
					/>
				) : null}
				{[0, 1].map((i) => (
					<CascadePop key={i} at={EXPAND + 0.05} index={i} style={{position: 'absolute', left: CARD.x, top: CARD.y0 + i * (CARD.h + CARD.gap), opacity: i === 0 ? 1 - prog(t, OPEN, OPEN + 0.1, 'soft') : 1}}>
						<DateCard i={i} />
					</CascadePop>
				))}
			</IsoStage>

			<div data-expand style={{position: 'absolute', left: CARD.x, top: CARD.y0, width: CARD.w, height: CARD.h, borderRadius: 26, backgroundColor: '#ffffff', opacity: 0}} />
			<Cursor
				t={t}
				keys={[
					{t: 11.85, x: 1880, y: 1140},
					{t: 12.3, x: card0.x + 250, y: card0.y + 80},
					{t: 12.7, x: card0.x + 250, y: card0.y + 80},
				]}
				clicks={[CLICK]}
				handWindows={[[12.15, 12.5]]}
				show={[11.85, 12.62]}
			/>
			{t >= 12.9 ? <AbsoluteFill style={{background: BRAND.navy, opacity: tween(t, 12.9, 13.0, 0, 1, 'soft'), pointerEvents: 'none'}} /> : null}
		</AbsoluteFill>
	);
};
