import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {cascadeAt, CascadePop, IsoStage, PRESERVE_3D, UiPanelExpand} from '../motion/patterns';
import {useSceneTime, useSceneTimeline, useVideoTime} from '../motion/scene';
import {EASE, prog} from '../motion/tokens';
import {INVERT} from '../motion/transitions';
import {APP, FONT} from '../theme';
import {DUR, LABELS} from '../timeline';
import {Chrome} from '../ui/Chrome';
import {Cursor} from '../ui/Cursor';
import {AppCard} from '../ui/Glass';
import {IconTile} from '../ui/Icon';
import {MAP_LEGEND, mapToPx, SectorMap} from '../ui/SectorMap';
import {SectorListHeader, SectorRow, sectorRowHeight} from '../ui/SectorList';
import {SECTOR_ANCHOR, type SectorId} from '../ui/mapGeometry';

// C05 "O estádio acende" — DROP 2. Recreated ticket-selection page (06-queue-and-purchase/02, 03,
// 06), full screen, no headline: the sector list and the sector map ARE the scene. The panels
// expand out of the inversion circle, the four sectors Cascade Pop, the map lights up in the same
// 3-frame cadence. Click 1: Pista Premium at 1.0 s; click 2: Cadeira Nível 1 at 3.0 s (tooltips pop
// next to the hovered sector). The scene then holds and cross-fades straight into C06.

const L = {
	listX: 60,
	listY: 44,
	listW: 770,
	cardH: 992,
	cardPad: 36,
	cardRadius: 60,
	rowScale: 1,
	rowsY: 164,
	rowGap: 26,
	/** Space between the two containers. */
	gutter: 56,
	mapW: 760,
	mapY: 190,
} as const;
const MAP_CARD_X = L.listX + L.listW + L.gutter;
const MAP_CARD_W = 1920 - 60 - MAP_CARD_X;
const MAP_X = MAP_CARD_X + (MAP_CARD_W - L.mapW) / 2;

const ROW_H = sectorRowHeight(L.rowScale);
const rowTop = (i: number) => L.rowsY + i * (ROW_H + L.rowGap);
const rowCenterY = (i: number) => rowTop(i) + ROW_H / 2;
const mapPoint = (id: SectorId): [number, number] => {
	const [x, y] = mapToPx(L.mapW, SECTOR_ANCHOR[id]);
	return [MAP_X + x, L.mapY + y];
};

const T = {
	rows: LABELS['C05.rows.cascade'],
	click1: LABELS['C05.sector1.click'],
	fill1: LABELS['C05.sector1.fill'],
	tip1: LABELS['C05.tooltip1'],
	click2: LABELS['C05.sector2.click'],
	fill2: LABELS['C05.sector2.fill'],
	tip2: LABELS['C05.tooltip2'],
};
const END = DUR.C05;

export const C05Estadio: React.FC = () => {
	const t = useSceneTime();
	const tVideo = useVideoTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, at, L: lab}) => {
		// Tooltips pop (back.out) on the labels, content swaps in between.
		tl.fromTo(q('[data-tip="premium"]'), {scale: 0.6, opacity: 0, filter: 'blur(10px)'}, {scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.35, ease: EASE.snap}, lab('C05.tooltip1'));
		tl.to(q('[data-tip="premium"]'), {scale: 0.85, opacity: 0, filter: 'blur(10px)', duration: 0.15, ease: EASE.in}, lab('C05.sector2.click', 0.05));
		tl.fromTo(q('[data-tip="nivel1"]'), {scale: 0.6, opacity: 0, filter: 'blur(10px)'}, {scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.35, ease: EASE.snap}, lab('C05.tooltip2'));

		// Isometric camera: lands tilted on the drop, drifts while choosing, settles for the hold.
		const iso = q('[data-iso="c05"]');
		tl.fromTo(iso, {rotateX: 22, rotateY: 16}, {rotateX: 6, rotateY: -4, duration: 1.3, ease: EASE.cubicExpoOut}, at(0));
		tl.to(iso, {rotateX: 4, rotateY: -7, duration: 1.8, ease: EASE.sine}, lab('C05.sector1.click'));
		tl.to(iso, {rotateX: 5, rotateY: 4, duration: 0.6, ease: EASE.cubicExpoOut}, lab('C05.sector2.click'));
		tl.to(iso, {rotateX: 3, rotateY: 1, duration: Math.max(0.3, END - T.tip2), ease: EASE.sine}, lab('C05.tooltip2'));

		const cam = q('[data-camera]');
		tl.to(cam, {scale: 1.015, x: -6, duration: 1.8, ease: EASE.sine}, at(T.click1 + 0.2));
		tl.to(cam, {scale: 1.025, x: -10, y: -4, duration: Math.max(0.3, END - T.click2 - 0.2), ease: EASE.sine}, at(T.click2 + 0.2));
	});

	// Selection states are pure functions of time (they feed SVG attributes).
	const premiumSel = prog(t, T.fill1, T.fill1 + 0.5, 'out');
	const premiumFade = 1 - prog(t, T.fill2, T.fill2 + 0.35, 'soft');
	const nivel1Sel = prog(t, T.fill2, T.fill2 + 0.5, 'out');
	const rowPremium = prog(t, T.click1, T.click1 + 0.12, 'hit') * (1 - prog(t, T.click2, T.click2 + 0.12, 'soft'));
	const rowNivel1 = prog(t, T.click2, T.click2 + 0.12, 'hit');
	// The map lights up in the same 3-frame cadence as the list cascade.
	const reveal = (i: number) => prog(t, cascadeAt(T.rows + 0.05, i), cascadeAt(T.rows + 0.05, i) + 0.4, 'out');
	const sectors = {
		superior: {reveal: reveal(0), sel: 0},
		nivel1: {reveal: reveal(1), sel: nivel1Sel},
		pista: {reveal: reveal(2), sel: 0},
		premium: {reveal: reveal(3), sel: premiumSel, fade: premiumFade},
	};

	const pPremium = mapPoint('premium');
	const pNivel1 = mapPoint('nivel1');
	const rowX = L.listX + L.cardPad + 520;
	const cursorKeys = [
		{t: T.click1 - 0.55, x: 1180, y: 1150},
		{t: T.click1 - 0.1, x: rowX, y: rowCenterY(3)},
		{t: T.click1 + 0.3, x: rowX, y: rowCenterY(3)},
		{t: T.click1 + 0.9, x: pPremium[0], y: pPremium[1]},
		{t: T.click2 - 0.5, x: pPremium[0] - 10, y: pPremium[1] + 6},
		{t: T.click2 - 0.1, x: rowX, y: rowCenterY(0)},
		{t: T.click2 + 0.2, x: rowX, y: rowCenterY(0)},
		{t: T.click2 + 0.8, x: pNivel1[0], y: pNivel1[1]},
	];

	// Tooltip anchored to the hovered sector (up-right of the pointer), as the real map hover card.
	const tooltip = (id: 'premium' | 'nivel1') => {
		const s = COPY.C05.sectors.find((x) => x.id === id)!;
		const [ax, ay] = mapPoint(id);
		return (
			<div
				data-tip={id}
				style={{
					position: 'absolute',
					left: ax + 70,
					top: ay - 150,
					padding: '18px 26px',
					borderRadius: 26,
					background: '#ffffff',
					boxShadow: '0 22px 50px -20px rgba(41,89,185,.55), 0 2px 6px rgba(0,51,77,.08)',
					fontFamily: FONT,
					transformOrigin: '0% 100%',
					whiteSpace: 'nowrap',
					opacity: 0,
				}}
			>
				<div style={{fontSize: 26, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em'}}>{s.name}</div>
				<div style={{fontSize: 20, fontWeight: 500, color: APP.muted, marginTop: 4}}>{s.avail}</div>
				<div style={{fontSize: 22, fontWeight: 800, color: '#2f9fe0', marginTop: 4}}>
					{COPY.C05.tooltipFrom} {s.price}
				</div>
			</div>
		);
	};

	return (
		<AbsoluteFill ref={scope}>
			{t < INVERT.end + 0.05 ? <Chrome t={tVideo} /> : null}
			<IsoStage name="c05" origin="960px 560px">
				<div data-camera style={{position: 'absolute', inset: 0, transformOrigin: '960px 540px', ...PRESERVE_3D}}>
					<UiPanelExpand at={0.12} radius={[88, L.cardRadius]} origin="50% 0%" style={{position: 'absolute', left: L.listX, top: L.listY}}>
						{(r) => (
							<AppCard radius={r} style={{width: L.listW, height: L.cardH, boxSizing: 'border-box', padding: `32px ${L.cardPad}px`}}>
								<SectorListHeader />
							</AppCard>
						)}
					</UiPanelExpand>
					{COPY.C05.sectors.map((s, i) => (
						<CascadePop key={s.id} at={T.rows} index={i} origin="30% 50%" style={{position: 'absolute', left: L.listX + L.cardPad, top: rowTop(i)}}>
							<SectorRow data={s} dataKey={s.id} width={L.listW - L.cardPad * 2} scale={L.rowScale} sel={s.id === 'premium' ? rowPremium : s.id === 'nivel1' ? rowNivel1 : 0} />
						</CascadePop>
					))}

					<UiPanelExpand at={0.18} radius={[88, L.cardRadius]} origin="50% 0%" style={{position: 'absolute', left: MAP_CARD_X, top: L.listY}}>
						{(r) => (
							<AppCard radius={r} style={{position: 'relative', width: MAP_CARD_W, height: L.cardH, boxSizing: 'border-box', padding: `32px ${L.cardPad}px`}}>
								<div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT}}>
									<IconTile name="map" size={58} soft />
									<div>
										<div style={{fontSize: 34, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}>{COPY.C05.mapTitle}</div>
										<div style={{fontSize: 19, fontWeight: 500, color: APP.muted, marginTop: 2}}>{COPY.C05.mapSub}</div>
									</div>
									<span style={{marginLeft: 'auto', fontSize: 20, fontWeight: 800, color: '#1d1d1f', letterSpacing: '0.06em'}}>{COPY.C05.venueLabel}</span>
								</div>
								<div style={{position: 'absolute', left: 48, right: 48, bottom: 44, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
									{MAP_LEGEND.map((m, i) => (
										<div key={m.id} style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT}}>
											<span style={{width: 22, height: 22, borderRadius: 6, background: m.color}} />
											<span style={{fontSize: 18, fontWeight: 800, color: APP.fg, letterSpacing: '0.02em'}}>{COPY.C05.legend[i]}</span>
										</div>
									))}
								</div>
							</AppCard>
						)}
					</UiPanelExpand>
					<div style={{position: 'absolute', left: MAP_X, top: L.mapY}}>
						<SectorMap width={L.mapW} sectors={sectors} />
					</div>
					{tooltip('premium')}
					{tooltip('nivel1')}

					<Cursor t={t} keys={cursorKeys} clicks={[T.click1, T.click2]} handWindows={[[T.click1 + 0.7, T.click2 - 0.4], [T.click2 + 0.6, END + 1]]} show={[T.click1 - 0.55, END + 1]} />
				</div>
			</IsoStage>
		</AbsoluteFill>
	);
};
