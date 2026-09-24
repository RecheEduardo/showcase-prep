import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {COPY} from '../copy';
import {depthScale, IsoStage} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {blurFilter, dofBlur, EASE, lerp, prog, tween} from '../motion/tokens';
import {LABELS, SFX_CUES} from '../timeline';
import {Cursor, type CursorKey} from '../ui/Cursor';

// C00 "Caos" (0–5 s) — PROBLEM (0–2.5) + AGITATION (2.5–4.9). ILLUSTRATIVE generic legacy
// ticketing site (no brand, not modelled on a real product): progress stuck at 99 %, a spinner,
// then error dialogs pile up on the accelerating cues while the camera tilts into the mess.
// ONE cursor carries the emotion: lazy at first, then rage-clicking between "Comprar" and every
// new error, faster and shakier until the freeze. The legacy UI runs on a lagging clock while the
// cursor stays fluid (frantic user vs. frozen system). Newest dialog is sharp in front; older
// ones are pushed back in depth and blur (only the background is ever out of focus).

const LEGACY_FONT = 'Arial, Helvetica, sans-serif';
const ENTER = LABELS['C00.problem.enter'];
const STALL = LABELS['C00.stall.click'];
const AGITATE = LABELS['C00.agitation.start'];
const FREEZE = LABELS['C00.freeze'];
const ERRORS = SFX_CUES.filter((c) => c.parent === 'sfx.c00.errors').map((c) => c.t);
const WIN = {x: 340, y: 170, w: 1240, h: 720};
const BUY = {x: WIN.x + 860, y: WIN.y + 470, w: 300, h: 76};
const DIALOG = {w: 540, h: 210};
const RECEDE = 150;
const FRONT = 120;
const CURSOR_Z = FRONT + 10;
/** Plate point at depth z → the same screen point on the cursor's depth plane (perspective origin 960,540). */
const toCursorPlane = (x: number, y: number, z: number) => {
	const k = depthScale(z) / depthScale(CURSOR_Z);
	return {x: 960 + (x - 960) * k, y: 540 + (y - 540) * k};
};

/** Dropped-frames clock: 8 fps while it is merely slow, 5 fps once everything is on fire. */
const lagClock = (t: number) => (t < AGITATE ? Math.floor(t * 8) / 8 : Math.floor(t * 5) / 5);

const dialogPose = (i: number) => ({
	x: 470 + (i % 5) * 88 + random(`c00-dx-${i}`) * 60,
	y: 250 + (i % 6) * 70 + random(`c00-dy-${i}`) * 40,
	rot: (random(`c00-r-${i}`) - 0.5) * 9,
});
// The newest dialog (the one the cursor attacks) sits at depth FRONT.
const retryButton = (i: number) => {
	const p = dialogPose(i);
	return toCursorPlane(p.x + DIALOG.w - 250, p.y + DIALOG.h - 36, FRONT);
};
const BUY_CENTER = toCursorPlane(BUY.x + BUY.w * 0.5, BUY.y + BUY.h * 0.5, 0);
const latestError = (t: number) => ERRORS.reduce((acc, e, i) => (t >= e ? i : acc), -1);

// The single cursor: lazy wandering, a dead click on "Comprar", then a rage loop whose gaps
// shrink from 0.42 s to 0.1 s, bouncing between "Comprar" and the newest error's buttons.
const LAZY: CursorKey[] = [
	{t: 0.15, x: 640, y: 930},
	{t: 0.7, x: 1180, y: 380},
	{t: 1.2, x: BUY_CENTER.x + 16, y: BUY_CENTER.y},
	{t: 1.85, x: BUY_CENTER.x + 30, y: BUY_CENTER.y + 8},
	{t: 2.3, x: 900, y: 620},
];
const {RAGE_KEYS, RAGE_CLICKS} = (() => {
	const keys: CursorKey[] = [];
	const clicks: number[] = [];
	let tt: number = AGITATE;
	for (let k = 0; tt < FREEZE - 0.12; k++) {
		const p = (tt - AGITATE) / (FREEZE - AGITATE);
		const gap = lerp(0.42, 0.1, Math.pow(p, 0.7));
		const arrive = +(tt + gap).toFixed(4);
		const err = latestError(arrive);
		const onBuy = err < 0 || k % 3 === 2;
		const target = onBuy ? BUY_CENTER : retryButton(err);
		const spread = 18 + 40 * p;
		keys.push({t: arrive, x: target.x + (random(`c00-kx-${k}`) - 0.5) * spread, y: target.y + (random(`c00-ky-${k}`) - 0.5) * spread});
		clicks.push(arrive);
		if (p > 0.55) clicks.push(+(arrive + 0.05).toFixed(4));
		tt = arrive;
	}
	return {RAGE_KEYS: keys, RAGE_CLICKS: clicks};
})();

const Spinner: React.FC<{size: number; angle: number; color?: string}> = ({size, angle, color = '#6b7a90'}) => (
	<svg width={size} height={size} viewBox="0 0 40 40" style={{display: 'block', rotate: `${angle}deg`}}>
		<circle cx="20" cy="20" r="16" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="5" />
		<path d="M20 4 A16 16 0 0 1 36 20" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
	</svg>
);

const Bar: React.FC<{w: number; h?: number; tone?: string}> = ({w, h = 16, tone = '#cfd3d9'}) => <div style={{width: w, height: h, borderRadius: 3, background: tone}} />;

const ErrorDialog: React.FC<{i: number; t: number}> = ({i, t}) => {
	const at = ERRORS[i];
	if (t < at) return null;
	const pose = dialogPose(i);
	const pop = tween(t, at, at + 3 / 60, 0.55, 1, 'hit');
	// Every newer dialog pushes this one one step further back (cubicExpoOut per push). The pile lives
	// in front of the legacy window (z 0): the newest sits at FRONT, older ones sink toward the window
	// and blur by how far they have been pushed from the focal plane.
	const pushed = ERRORS.slice(i + 1).reduce((z, e) => z + RECEDE * prog(t, e, e + 0.25, 'cubicExpoOut'), 0);
	const depth = Math.max(20, FRONT - pushed);
	const k = depthScale(-pushed);
	return (
		<div
			style={{
				position: 'absolute',
				left: pose.x,
				top: pose.y,
				width: DIALOG.w,
				height: DIALOG.h,
				transform: `translateZ(${depth.toFixed(1)}px) rotate(${pose.rot.toFixed(2)}deg) scale(${pop.toFixed(3)})`,
				filter: blurFilter(dofBlur(k, 16)),
				opacity: lerp(1, 0.55, 1 - k),
				background: '#f0f0f0',
				border: '1px solid #8c8c8c',
				borderRadius: 4,
				boxShadow: '6px 8px 0 rgba(0,0,0,0.22)',
				fontFamily: LEGACY_FONT,
				overflow: 'hidden',
			}}
		>
			<div style={{height: 36, background: 'linear-gradient(180deg, #d9534f, #b33a36)', color: '#ffffff', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', padding: '0 14px'}}>
				{COPY.C00.errorTitle}
			</div>
			<div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '22px 22px 0'}}>
				<svg width={46} height={42} viewBox="0 0 46 42" style={{flexShrink: 0}}>
					<path d="M23 2 L44 40 L2 40 Z" fill="#f2c230" stroke="#9a7a10" strokeWidth="2" strokeLinejoin="round" />
					<rect x="21" y="14" width="4" height="14" fill="#3a2e05" />
					<rect x="21" y="31" width="4" height="4" fill="#3a2e05" />
				</svg>
				<span style={{fontSize: 22, color: '#222222'}}>{COPY.C00.errors[i % COPY.C00.errors.length]}</span>
			</div>
			<div style={{position: 'absolute', right: 18, bottom: 16, display: 'flex', gap: 10}}>
				{[COPY.C00.retry, COPY.C00.ok].map((label) => (
					<span key={label} style={{fontSize: 17, color: '#222222', padding: '7px 18px', background: 'linear-gradient(180deg, #fafafa, #d6d6d6)', border: '1px solid #8c8c8c', borderRadius: 3}}>
						{label}
					</span>
				))}
			</div>
		</div>
	);
};

export const C00Caos: React.FC = () => {
	const tRaw = useSceneTime();
	// Freeze: every React-driven visual holds the 4.9 frame until the hard cut.
	const t = Math.min(tRaw, FREEZE);
	const lag = lagClock(t);

	const scope = useSceneTimeline(({timeline: tl, selector: q, at, L}) => {
		const iso = q('[data-iso="c00"]');
		tl.fromTo(iso, {rotateX: 2, rotateY: -3, scale: 1}, {rotateX: 5, rotateY: 4, scale: 1.03, duration: AGITATE, ease: EASE.sine}, at(0));
		// Agitation: the camera leans into the mess and keeps accelerating until the freeze frame.
		tl.to(iso, {rotateX: 16, rotateY: -14, scale: 1.16, duration: FREEZE - AGITATE, ease: EASE.in}, L('C00.agitation.start'));
	});

	const agitation = prog(t, AGITATE, FREEZE, 'softIn');
	const shake = agitation * agitation * 16;
	const sx = Math.sin(t * 93) * shake;
	const sy = Math.cos(t * 71) * shake * 0.7;
	// The hand gets shakier as the anger builds.
	const tremor = 28 * Math.pow(agitation, 1.4);
	const cursorOffset: [number, number] = [tremor * (Math.sin(t * 61) + 0.5 * Math.sin(t * 149)), tremor * (Math.cos(t * 53) + 0.5 * Math.sin(t * 131))];
	const pct = t < STALL + 0.5 ? Math.round(tween(lag, 0.2, 2.0, 12, 99, 'out')) : 99;
	const clicked = lag >= STALL;
	const deadShake = clicked && t < STALL + 0.3 ? Math.sin((t - STALL) * 80) * 6 * (1 - prog(t, STALL, STALL + 0.3, 'soft')) : 0;
	const lastErr = latestError(t);
	const redPulse = lastErr < 0 ? 0 : 0.12 * (1 - prog(t, ERRORS[lastErr], ERRORS[lastErr] + 0.18, 'soft'));
	const blink = t >= AGITATE && Math.floor(t * 6) % 2 === 0;

	return (
		<AbsoluteFill ref={scope} style={{background: '#dde1e6', filter: agitation > 0.001 ? `saturate(${(1 - 0.55 * agitation).toFixed(3)}) contrast(${(1 + 0.12 * agitation).toFixed(3)})` : undefined}}>
			<IsoStage name="c00" style={{translate: `${sx.toFixed(2)}px ${sy.toFixed(2)}px`}}>
				<div
					style={{
						position: 'absolute',
						left: WIN.x,
						top: WIN.y,
						width: WIN.w,
						height: WIN.h,
						background: '#efefef',
						border: '1px solid #9a9a9a',
						borderRadius: 6,
						boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
						fontFamily: LEGACY_FONT,
						overflow: 'hidden',
						opacity: prog(t, ENTER, ENTER + 0.2, 'soft'),
					}}
				>
					<div style={{height: 44, background: 'linear-gradient(180deg, #e6e6e6, #c9c9c9)', borderBottom: '1px solid #9a9a9a', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px'}}>
						{[0, 1, 2].map((i) => (
							<span key={i} style={{width: 14, height: 14, borderRadius: 7, background: '#b9b9b9'}} />
						))}
						<div style={{marginLeft: 24, flex: 1, height: 26, background: '#ffffff', border: '1px solid #aaaaaa', display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', fontSize: 15, color: '#666666'}}>
							<Spinner size={16} angle={lag * 420} />
							{COPY.C00.loading}
						</div>
					</div>
					<div style={{height: 70, background: '#3c4a5c', display: 'flex', alignItems: 'center', gap: 28, padding: '0 28px'}}>
						<span style={{fontSize: 26, fontWeight: 700, color: '#e8e8e8'}}>{COPY.C00.site}</span>
						<Bar w={90} tone="#5d6b7e" />
						<Bar w={110} tone="#5d6b7e" />
						<Bar w={80} tone="#5d6b7e" />
					</div>
					<div style={{display: 'flex', gap: 34, padding: 34}}>
						<div style={{width: 700, height: 380, background: '#d7dbe0', border: '1px solid #b9bec5', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<Spinner size={96} angle={lag * 300} />
						</div>
						<div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 16}}>
							<Bar w={320} h={28} />
							<Bar w={260} />
							<Bar w={290} />
							<Bar w={180} />
							<div style={{height: 60}} />
							<Bar w={220} h={36} tone="#c4c9d0" />
						</div>
					</div>
					<div style={{position: 'absolute', left: 34, right: 34, bottom: 30, display: 'flex', alignItems: 'center', gap: 18}}>
						<div style={{flex: 1, height: 22, background: '#ffffff', border: '1px solid #9a9a9a'}}>
							<div style={{width: `${pct}%`, height: '100%', background: 'repeating-linear-gradient(45deg, #3b6fd1 0 14px, #5584dd 14px 28px)'}} />
						</div>
						<span style={{fontSize: 22, fontWeight: 700, color: blink ? '#b33a36' : '#333333', minWidth: 60}}>{`${pct}%`}</span>
					</div>
				</div>
				<div
					style={{
						position: 'absolute',
						left: BUY.x,
						top: BUY.y,
						width: BUY.w,
						height: BUY.h,
						translate: `${deadShake.toFixed(2)}px 0px`,
						background: clicked ? 'linear-gradient(180deg, #e2e2e2, #c7c7c7)' : 'linear-gradient(180deg, #f4f4f4, #d0d0d0)',
						border: '1px solid #8c8c8c',
						borderRadius: 4,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 12,
						fontFamily: LEGACY_FONT,
						fontSize: 26,
						fontWeight: 700,
						color: clicked ? '#8a8a8a' : '#333333',
						opacity: prog(t, ENTER, ENTER + 0.2, 'soft'),
					}}
				>
					{clicked ? <Spinner size={26} angle={lag * 380} /> : null}
					{clicked ? COPY.C00.wait : COPY.C00.buy}
				</div>
				{ERRORS.map((_, i) => (
					<ErrorDialog key={i} i={i} t={t} />
				))}
				{/* The cursor lives on the stage (just in front of the newest dialog) so it stays glued to the buttons it hits. */}
				<div style={{position: 'absolute', inset: 0, transform: `translateZ(${CURSOR_Z}px)`, pointerEvents: 'none'}}>
					<Cursor t={t} keys={[...LAZY, ...RAGE_KEYS]} clicks={[STALL, ...RAGE_CLICKS]} show={[0.15, FREEZE + 0.2]} offset={cursorOffset} />
				</div>
			</IsoStage>
			<AbsoluteFill style={{background: '#b33a36', opacity: redPulse, pointerEvents: 'none'}} />
			<AbsoluteFill style={{pointerEvents: 'none', background: 'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(20,20,24,0) 45%, rgba(20,20,24,0.75) 100%)', opacity: 0.25 + 0.75 * agitation}} />
		</AbsoluteFill>
	);
};
