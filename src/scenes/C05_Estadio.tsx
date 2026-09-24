import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {cascadeAt, CascadePop, IsoStage, PRESERVE_3D, UiPanelExpand} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {EASE, prog} from '../motion/tokens';
import {INVERT} from '../motion/transitions';
import {APP, FONT} from '../theme';
import {LABELS} from '../timeline';
import {Chrome} from '../ui/Chrome';
import {Cursor} from '../ui/Cursor';
import {AppCard} from '../ui/Glass';
import {IconTile} from '../ui/Icon';
import {MAP_LEGEND, mapToPx, SectorMap} from '../ui/SectorMap';
import {SectorListHeader, SectorRow} from '../ui/SectorList';
import {CounterPill, RollText, TicketTypeRow} from '../ui/TicketCounter';
import {SECTOR_ANCHOR, type SectorId} from '../ui/mapGeometry';

// C05 "O estádio acende" (17–23 s) — DROP 2. Recreated ticket-selection page
// (06-queue-and-purchase/02, 03, 06), full screen, no headline: the sector list and the sector
// map ARE the scene. The panels expand out of the inversion circle, the four sectors Cascade Pop
// on the blips, the map lights up in the same 3-frame cadence. Click 1: Pista Premium at 18.0;
// click 2: Cadeira Nível 1 at 20.0 (tooltips pop next to the hovered sector); the camera throws
// down to the ticket block and the prices swap to Nível 1 at 21.5.

const L = {
	listX: 60,
	listY: 60,
	listW: 780,
	cardH: 960,
	rowScale: 1.22,
	rowsY: 184,
	rowGap: 16,
	mapCardX: 870,
	mapCardW: 990,
	mapW: 780,
	mapX: 975,
	mapY: 186,
	ticketsX: 60,
	ticketsY: 1110,
	ticketsW: 900,
} as const;

const ROW_H = 144 * L.rowScale;
const rowTop = (i: number) => L.rowsY + i * (ROW_H + L.rowGap);
const rowCenterY = (i: number) => rowTop(i) + ROW_H / 2;
const mapPoint = (id: SectorId): [number, number] => {
	const [x, y] = mapToPx(L.mapW, SECTOR_ANCHOR[id]);
	return [L.mapX + x, L.mapY + y];
};

const DROP = LABELS['C04.admitted.reveal'];
const T = {
	rows: LABELS['C05.rows.cascade'],
	click1: LABELS['C05.sector1.click'],
	fill1: LABELS['C05.sector1.fill'],
	tip1: LABELS['C05.tooltip1'],
	click2: LABELS['C05.sector2.click'],
	fill2: LABELS['C05.sector2.fill'],
	tip2: LABELS['C05.tooltip2'],
	swap: LABELS['C05.price.swap'],
};
const THROW = 21.0;

export const C05Estadio: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, at, L: lab}) => {
		// Tooltips pop (back.out) on the labels, content swaps in between.
		tl.fromTo(q('[data-tip="premium"]'), {scale: 0.6, opacity: 0}, {scale: 1, opacity: 1, duration: 0.35, ease: EASE.snap}, lab('C05.tooltip1'));
		tl.to(q('[data-tip="premium"]'), {scale: 0.85, opacity: 0, duration: 0.15, ease: EASE.in}, at(T.click2 + 0.05));
		tl.fromTo(q('[data-tip="nivel1"]'), {scale: 0.6, opacity: 0}, {scale: 1, opacity: 1, duration: 0.35, ease: EASE.snap}, lab('C05.tooltip2'));
		tl.to(q('[data-tip="nivel1"]'), {scale: 0.85, opacity: 0, duration: 0.15, ease: EASE.in}, at(THROW));

		// Isometric camera: lands tilted on the drop, drifts while choosing, throws down to the tickets.
		const iso = q('[data-iso="c05"]');
		tl.fromTo(iso, {rotateX: 22, rotateY: 16}, {rotateX: 6, rotateY: -4, duration: 1.3, ease: EASE.cubicExpoOut}, at(DROP));
		tl.to(iso, {rotateX: 4, rotateY: -7, duration: 1.8, ease: EASE.sine}, lab('C05.sector1.click'));
		tl.to(iso, {rotateX: 5, rotateY: 4, duration: 0.6, ease: EASE.cubicExpoOut}, lab('C05.sector2.click'));
		tl.to(iso, {rotateX: 12, rotateY: 0, duration: 0.45, ease: EASE.cubicHardSnap}, at(THROW));
		tl.to(iso, {rotateX: 4, rotateY: -3, duration: 1.3, ease: EASE.cubicExpoOut}, lab('C05.price.swap'));

		const cam = q('[data-camera]');
		tl.to(cam, {scale: 1.03, x: -14, duration: 1.8, ease: EASE.sine}, at(18.2));
		tl.to(cam, {scale: 1.05, x: -30, y: -8, duration: 0.8, ease: EASE.sine}, at(20.2));
		tl.to(cam, {scale: 1.12, x: 504, y: -941, duration: 0.45, ease: EASE.cubicHardSnap}, at(THROW));
		tl.to(cam, {scale: 1.15, x: 520, y: -968, duration: 1.3, ease: EASE.sine}, lab('C05.price.swap'));
		tl.to(q('[data-dim]'), {opacity: 0.22, duration: 0.45, ease: EASE.cubicHardSnap}, at(THROW + 0.05));
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
	const swapP = prog(t, T.swap, T.swap + 0.3, 'out');
	const swapP2 = prog(t, T.swap + 0.05, T.swap + 0.35, 'out');

	const pPremium = mapPoint('premium');
	const pNivel1 = mapPoint('nivel1');
	const rowX = L.listX + 26 + 560;
	const cursorKeys = [
		{t: 17.45, x: 1180, y: 1150},
		{t: 17.9, x: rowX, y: rowCenterY(3)},
		{t: 18.3, x: rowX, y: rowCenterY(3)},
		{t: 18.9, x: pPremium[0], y: pPremium[1]},
		{t: 19.5, x: pPremium[0] - 10, y: pPremium[1] + 6},
		{t: 19.9, x: rowX, y: rowCenterY(0)},
		{t: 20.2, x: rowX, y: rowCenterY(0)},
		{t: 20.8, x: pNivel1[0], y: pNivel1[1]},
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
					borderRadius: 24,
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
			{t < INVERT.end + 0.05 ? <Chrome t={t} /> : null}
			<IsoStage name="c05" origin="960px 560px">
				<div data-camera style={{position: 'absolute', inset: 0, transformOrigin: '960px 540px', ...PRESERVE_3D}}>
					<UiPanelExpand at={DROP + 0.12} radius={[64, 36]} origin="50% 0%" style={{position: 'absolute', left: L.listX, top: L.listY}}>
						{(r) => (
							<AppCard data-dim radius={r} style={{width: L.listW, height: L.cardH, boxSizing: 'border-box', padding: 30}}>
								<SectorListHeader />
							</AppCard>
						)}
					</UiPanelExpand>
					{COPY.C05.sectors.map((s, i) => (
						<CascadePop key={s.id} at={T.rows} index={i} origin="30% 50%" style={{position: 'absolute', left: L.listX + 30, top: rowTop(i)}}>
							<div data-dim>
								<SectorRow data={s} dataKey={s.id} width={L.listW - 60} scale={L.rowScale} sel={s.id === 'premium' ? rowPremium : s.id === 'nivel1' ? rowNivel1 : 0} />
							</div>
						</CascadePop>
					))}

					<UiPanelExpand at={DROP + 0.18} radius={[64, 36]} origin="50% 0%" style={{position: 'absolute', left: L.mapCardX, top: L.listY}}>
						{(r) => (
							<AppCard data-dim radius={r} style={{position: 'relative', width: L.mapCardW, height: L.cardH, boxSizing: 'border-box', padding: 30}}>
								<div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT}}>
									<IconTile name="map" size={58} soft />
									<div>
										<div style={{fontSize: 34, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}>{COPY.C05.mapTitle}</div>
										<div style={{fontSize: 19, fontWeight: 500, color: APP.muted, marginTop: 2}}>{COPY.C05.mapSub}</div>
									</div>
									<span style={{marginLeft: 'auto', fontSize: 20, fontWeight: 800, color: '#1d1d1f', letterSpacing: '0.06em'}}>{COPY.C05.venueLabel}</span>
								</div>
								<div style={{position: 'absolute', left: 40, right: 40, bottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
									{MAP_LEGEND.map((m, i) => (
										<div key={m.id} style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT}}>
											<span style={{width: 22, height: 22, borderRadius: 5, background: m.color}} />
											<span style={{fontSize: 18, fontWeight: 800, color: APP.fg, letterSpacing: '0.02em'}}>{COPY.C05.legend[i]}</span>
										</div>
									))}
								</div>
							</AppCard>
						)}
					</UiPanelExpand>
					<div data-dim style={{position: 'absolute', left: L.mapX, top: L.mapY}}>
						<SectorMap width={L.mapW} sectors={sectors} />
					</div>
					{tooltip('premium')}
					{tooltip('nivel1')}

					{/* Ticket type block (below the list), revealed by the camera throw at 21.0. */}
					<AppCard style={{position: 'absolute', left: L.ticketsX, top: L.ticketsY, width: L.ticketsW, boxSizing: 'border-box', padding: 32}}>
						<div style={{display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT}}>
							<IconTile name="ticket" size={62} />
							<div>
								<RollText
									from={COPY.C05.sectors[3].name}
									to={COPY.C05.sectors[0].name}
									p={swapP}
									height={44}
									style={{fontSize: 36, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}
								/>
								<div style={{fontSize: 20, fontWeight: 500, color: APP.muted}}>{COPY.C05.ticketsSub}</div>
							</div>
						</div>
						<div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 26}}>
							<TicketTypeRow
								type="inteira"
								width={L.ticketsW - 64}
								scale={1.15}
								highlight={0}
								price={<RollText from={COPY.tickets.prices.premium.inteira} to={COPY.tickets.prices.nivel1.inteira} p={swapP} height={44} />}
								counter={<CounterPill from={0} to={0} p={0} plusGlow={0} scale={1.15} />}
							/>
							<TicketTypeRow
								type="meia"
								width={L.ticketsW - 64}
								scale={1.15}
								price={<RollText from={COPY.tickets.prices.premium.meia} to={COPY.tickets.prices.nivel1.meia} p={swapP2} height={44} />}
								counter={<CounterPill from={0} to={0} p={0} plusGlow={0} scale={1.15} />}
							/>
						</div>
					</AppCard>

					<Cursor t={t} keys={cursorKeys} clicks={[T.click1, T.click2]} handWindows={[[18.7, 19.6], [20.6, THROW]]} show={[17.45, THROW + 0.05]} />
				</div>
			</IsoStage>
		</AbsoluteFill>
	);
};
