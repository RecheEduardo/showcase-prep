import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {COPY} from '../copy';
import {IsoStage, UiPanelExpand, ZPlane} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {gradientText} from '../motion/text';
import {EASE, prog} from '../motion/tokens';
import {INVERT} from '../motion/transitions';
import {BRAND, FONT} from '../theme';
import {COUNTDOWN, LABELS} from '../timeline';
import {Icon} from '../ui/Icon';

// C04 "A fila" (13–17 s) — ILLUSTRATIVE (H11 was never captured). Waiting-room card recreated
// from the real component text (WaitingRoomCard.tsx), no headline: the card itself fills the
// frame. It expands out of C03's navy card, the position drops 301 -> 1 on the 40 accelerating
// tick cues (one value per tick) while the isometric camera leans in; everything freezes at 16.5
// (stop-time) and C05 bursts out of the number on the 17.0 downbeat.

const ENTER = LABELS['C04.dark.enter'];
const STOP = LABELS['C04.stoptime'];
const COUNT_START = LABELS['C04.counter.start'];
const HIT1 = LABELS['C04.counter.hit1'];
const LEAN = 15.0;
const CARD = {w: 1180, h: 940, cx: 960, top: 70};
const NUMBER_CY = INVERT.cy;
const DOTS = (() => {
	const cols = 32;
	const rows = 11;
	const out: {x: number; y: number; order: number; r: number}[] = [];
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const x = 60 + c * 58 + (r % 2 ? 29 : 0);
			const y = 110 + r * 88;
			out.push({x, y, order: random(`dot-${r}-${c}`), r: 3 + random(`dot-r-${r}-${c}`) * 2.5});
		}
	}
	// Rank by seeded order: rank k dissolves when the position drops to k or below.
	const ranked = [...out].sort((a, b) => a.order - b.order);
	return ranked.slice(0, 300).map((d, k) => ({...d, rank: k + 1}));
})();

const valueAt = (t: number) => {
	let v = COUNTDOWN[0].value;
	for (const c of COUNTDOWN) if (t >= c.t - 1e-6) v = c.value;
	return v;
};
const lastTickAt = (t: number) => {
	let last = -1;
	for (const c of COUNTDOWN) if (t >= c.t - 1e-6) last = c.t;
	return last;
};
const dissolveTime = (rank: number) => COUNTDOWN.find((c) => c.value <= rank)?.t ?? Infinity;

const fmt = (n: number) => n.toLocaleString('pt-BR');
const waitFor = (v: number) => {
	const s = COPY.C04.waitSteps;
	if (v > 240) return s[0];
	if (v > 160) return s[1];
	if (v > 80) return s[2];
	if (v > 20) return s[3];
	return s[4];
};

export const C04Fila: React.FC = () => {
	const tRaw = useSceneTime();
	// Stop-time: every visual is frozen on the 16.5 frame until the drop.
	const t = tRaw >= STOP ? STOP : tRaw;

	const scope = useSceneTimeline(({timeline: tl, selector: q, at, L}) => {
		const iso = q('[data-iso="c04"]');
		tl.fromTo(iso, {rotateX: 20, scale: 1}, {rotateX: 4, duration: 1.0, ease: EASE.cubicExpoOut}, L('C04.dark.enter'));
		// Riser: the camera leans in until the freeze. Ends exactly at 16.5 so nothing moves after.
		tl.to(iso, {rotateX: 11, scale: 1.1, duration: STOP - LEAN, ease: EASE.in}, at(LEAN));
		tl.from(q('[data-cardin]'), {y: 24, opacity: 0, duration: 0.5, ease: EASE.cubicExpoOut, stagger: 0.05}, at(ENTER + 0.15));
	});

	const value = t < COUNT_START ? COUNTDOWN[0].value : valueAt(t);
	const sinceTick = t - lastTickAt(t);
	const punch = t >= HIT1 ? 1 + 0.16 * (1 - prog(sinceTick, 0, 0.12, 'hit')) + 0.06 : 1 + 0.07 * (1 - prog(sinceTick, 0, 0.12, 'out'));
	const build = prog(t, LEAN, STOP, 'softIn');
	const roll = prog(t, 15.5, STOP, 'softIn');
	const shake = roll * 5;
	const sx = Math.sin(t * 91) * shake;
	const sy = Math.cos(t * 77) * shake * 0.6;
	const frozen = tRaw >= STOP;
	const dotsIn = prog(t, ENTER, ENTER + 0.6, 'out');

	return (
		<AbsoluteFill ref={scope} style={{background: BRAND.navy}}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(900px 600px at 50% ${NUMBER_CY}px, rgba(42,143,212,${0.28 + 0.3 * build}), rgba(14,39,70,0) 70%), radial-gradient(1200px 700px at 90% -10%, rgba(95,176,230,0.16), transparent 60%), radial-gradient(900px 700px at -10% 110%, rgba(28,111,181,0.25), transparent 60%)`,
				}}
			/>
			<IsoStage name="c04" origin={`960px ${NUMBER_CY}px`} style={{translate: `${sx.toFixed(2)}px ${sy.toFixed(2)}px`}}>
				<ZPlane z={-520}>
					<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
						{DOTS.map((d, i) => {
							const dt = dissolveTime(d.rank);
							const gone = prog(t, dt, dt + 0.18, 'out');
							if (gone >= 1) return null;
							return (
								<circle
									key={i}
									cx={d.x}
									cy={d.y}
									r={d.r * (1 - gone) * (1 + 0.8 * gone)}
									fill="#5fb0e6"
									opacity={(0.18 + 0.3 * random(`tw-${i}`)) * dotsIn * (1 - gone) + gone * 0.6 * (1 - gone)}
								/>
							);
						})}
					</svg>
				</ZPlane>

				<UiPanelExpand at={ENTER} radius={[110, 64]} style={{position: 'absolute', left: CARD.cx - CARD.w / 2, top: CARD.top}}>
					{(r) => (
						<div
							style={{
								width: CARD.w,
								height: CARD.h,
								boxSizing: 'border-box',
								borderRadius: r,
								background: 'linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
								border: '1px solid rgba(255,255,255,0.18)',
								boxShadow: `0 50px 120px -40px rgba(0,0,0,0.55), 0 0 ${60 + 120 * build}px ${-10 + 20 * build}px rgba(42,143,212,${0.25 + 0.45 * build}), inset 0 1px 0 rgba(255,255,255,0.25)`,
								fontFamily: FONT,
								color: '#ffffff',
								textAlign: 'center',
							}}
						>
							<div data-cardin style={{marginTop: 56, fontSize: 24, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#57c5f4'}}>
								{COPY.C04.eyebrow}
							</div>
							<div data-cardin style={{fontSize: 56, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 14}}>
								{COPY.C04.event}
							</div>
							<div data-cardin style={{fontSize: 26, fontWeight: 500, color: 'rgba(255,255,255,0.62)', marginTop: 8}}>
								{COPY.C04.eventMeta}
							</div>
							<div data-cardin style={{fontSize: 22, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginTop: 30}}>
								{COPY.C04.position}
							</div>
						</div>
					)}
				</UiPanelExpand>

				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: NUMBER_CY - 150,
						height: 300,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontFamily: FONT,
						fontStyle: 'italic',
						fontWeight: 800,
						fontSize: 300,
						letterSpacing: '-0.05em',
						fontVariantNumeric: 'tabular-nums',
						opacity: dotsIn,
					}}
				>
					<span
						style={{
							display: 'inline-block',
							scale: String(punch),
							...(frozen || value === 1 ? {color: '#ffffff', textShadow: '0 0 60px rgba(95,176,230,0.9)'} : gradientText('linear-gradient(180deg, #bfe8ff 0%, #57c5f4 55%, #2a8fd4 100%)')),
							paddingRight: '0.08em',
						}}
					>
						{value}
					</span>
				</div>

				<div style={{position: 'absolute', left: CARD.cx - CARD.w / 2 + 60, top: CARD.top + 715, width: CARD.w - 120, display: 'flex', gap: 26, fontFamily: FONT}}>
					{[
						{icon: 'users' as const, label: COPY.C04.people, value: fmt(4500 + value)},
						{icon: 'clock' as const, label: COPY.C04.wait, value: waitFor(value)},
					].map((b) => (
						<div
							key={b.label}
							data-cardin
							style={{
								flex: 1,
								padding: '24px 22px',
								borderRadius: 32,
								background: 'rgba(255,255,255,0.06)',
								border: '1px solid rgba(255,255,255,0.14)',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 6,
							}}
						>
							<Icon name={b.icon} size={34} color="rgba(255,255,255,0.65)" stroke={2} />
							<div style={{fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.65)'}}>{b.label}</div>
							<div style={{fontSize: 42, fontWeight: 800, color: '#ffffff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em'}}>{b.value}</div>
						</div>
					))}
				</div>
			</IsoStage>
			{/* Freeze vignette: the whole frame holds on 16.5 while the audio drops out. */}
			<AbsoluteFill style={{pointerEvents: 'none', background: 'radial-gradient(ellipse 75% 70% at 50% 52%, rgba(8,26,49,0) 50%, rgba(8,26,49,0.7) 100%)', opacity: 0.4 + 0.6 * build}} />
		</AbsoluteFill>
	);
};
