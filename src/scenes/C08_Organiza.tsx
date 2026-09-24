import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {cascadeAt, CascadePop, IsoStage, UiPanelExpand} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {EASE, lerp, popScale, prog, springAt, springHeavy} from '../motion/tokens';
import {APP, FONT} from '../theme';
import {LABELS, SFX_CUES} from '../timeline';
import {EditorMap} from '../ui/EditorMap';
import {AppCard} from '../ui/Glass';
import {Icon, IconTile} from '../ui/Icon';
import {EDITOR_POLYGONS, type SectorId} from '../ui/mapGeometry';
import {BoardCard} from '../ui/StatusBoard';

// C08 "Quem organiza" (28–34 s, extended so it reads calmly) — bass swap on the 28.0 cut.
// "Quem organiza cria." is born big at the centre letter by letter, then docks at the top centre
// on a heavy spring while the venue map editor (04-admin/06–08, recreated) expands underneath in
// a steep isometric view; the sector list Cascade Pops and one block lights per eighth-note pluck
// (28.75 + 0.25 i). At 31.0 the plate flips to an ILLUSTRATIVE status board; at 32.0 an event
// moves to "Aprovado" and a sharp "Evento aprovado" toast springs out right next to it. ~1.75 s
// reading hold, then the camera punches in before the flash cut at 34.0.

const POLY_TIMES = SFX_CUES.filter((c) => c.parent === 'sfx.c08.poly').map((c) => c.t);
const HERO = LABELS['C08.title.hero'];
const ENTER = LABELS['C08.list.cascade'];
const CARD1 = LABELS['C08.card1.slide'];
const CARD2 = LABELS['C08.card2.slide'];
const APPROVED = LABELS['C08.approved'];
const DOCK = HERO + 0.55;
const PUNCH = 33.75;
const LIST = {x: 120, y: 210, w: 560};
const CANVAS = {x: 770, y: 170, w: 1030, h: 850};
const MAP_W = 680;
const BOARD = {x: 120, y: 200, w: 1680, h: 720};
const COL_W = 800;
const COLS = [BOARD.x + 30, BOARD.x + 30 + COL_W + 20];
const SLOT_Y = (k: number) => BOARD.y + 108 + k * 134;
const TOAST_AT = APPROVED + 0.3;

const sectorOf = (i: number): SectorId => EDITOR_POLYGONS[i].sector;
const LIST_SECTORS: SectorId[] = ['pista', 'nivel1', 'superior', 'premium'];

export const C08Organiza: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, L}) => {
		const iso = q('[data-iso="c08"]');
		tl.fromTo(iso, {rotateX: 30, rotateY: -22}, {rotateX: 12, rotateY: -8, duration: 1.6, ease: EASE.cubicExpoOut}, L('C08.list.cascade'));
		tl.to(iso, {rotateX: 9, rotateY: -4, duration: 0.5, ease: EASE.sine}, L('C08.polygons.end'));
		tl.to(iso, {rotateX: 5, rotateY: 0, duration: 0.6, ease: EASE.cubicExpoOut}, L('C08.turn'));
		// Turn (31.0): the editor flips away, the status board flips in.
		tl.to(q('[data-editor]'), {rotateY: 90, opacity: 0.4, duration: 0.2, ease: EASE.in, transformOrigin: '960px 560px'}, L('C08.turn'));
		tl.set(q('[data-editor]'), {opacity: 0}, L('C08.turn', 0.2));
		tl.fromTo(q('[data-board]'), {rotateY: -90, opacity: 0}, {rotateY: 0, opacity: 1, duration: 0.3, ease: EASE.cubicExpoOut, transformOrigin: '960px 560px'}, L('C08.turn', 0.2));
		// Approval: slow push, then a fast punch into the approved column before the cut.
		tl.to(q('[data-board-cam]'), {scale: 1.05, duration: PUNCH - APPROVED, ease: EASE.sine, transformOrigin: '1380px 560px'}, L('C08.approved'));
		tl.to(q('[data-board-cam]'), {scale: 1.32, duration: 34 - PUNCH, ease: EASE.in, transformOrigin: '1380px 560px'}, L('C08.approved', PUNCH - APPROVED));
	});

	const lit = POLY_TIMES.map((pt) => prog(t, pt, pt + 0.2, 'out'));
	const flash = POLY_TIMES.map((pt) => (t >= pt ? 1 - prog(t, pt, pt + 0.3, 'out') : 0));
	const handles = POLY_TIMES.map((pt, i) => {
		const on = prog(t, pt, pt + 0.15, 'snap');
		const n1 = sectorOf(i) === 'nivel1';
		const next = POLY_TIMES[i + 1];
		// Only the active block keeps handles, except Nível 1 which accumulates its real vertices.
		const off = !n1 && next !== undefined ? prog(t, next, next + 0.15, 'soft') : 0;
		return on * (1 - off);
	});
	// Polygon cues span exactly C08.polygons.start → C08.polygons.end (checked by scripts/verify.mjs).
	const activeIdx = t >= LABELS['C08.polygons.end'] ? POLY_TIMES.length - 1 : t < LABELS['C08.polygons.start'] ? -1 : POLY_TIMES.reduce((acc, pt, i) => (t >= pt ? i : acc), -1);
	const activeSector: SectorId | null = activeIdx >= 0 ? sectorOf(activeIdx) : null;

	// Board cards: positions are pure functions of time.
	const c1In = prog(t, CARD1, CARD1 + 0.4, 'out');
	const c2In = prog(t, CARD2, CARD2 + 0.4, 'out');
	const move = prog(t, APPROVED, APPROVED + 0.4, 'inOut');
	const lift = Math.sin(Math.PI * move);
	const badge = prog(t, APPROVED + 0.15, APPROVED + 0.35, 'out');
	const c2Up = prog(t, APPROVED + 0.18, APPROVED + 0.55, 'out');
	const card1 = {x: lerp(COLS[0], COLS[1], move) - (1 - c1In) * 260, y: lerp(SLOT_Y(0), SLOT_Y(1), move) - lift * 40, o: c1In};
	const card2 = {x: COLS[0] - (1 - c2In) * 260, y: lerp(SLOT_Y(1), SLOT_Y(0), c2Up), o: c2In};
	const pendingCount = (t >= CARD1 ? 1 : 0) + (t >= CARD2 ? 1 : 0) - (t >= APPROVED + 0.18 ? 1 : 0);
	const approvedCount = 1 + (t >= APPROVED + 0.18 ? 1 : 0);
	const glow = prog(t, APPROVED + 0.18, APPROVED + 0.55, 'out');
	const shake = prog(t, 33.5, 33.95, 'softIn') * 4;
	const sx = Math.sin(t * 97) * shake;

	// Title hand-off: big at the centre, then docked at the top centre on springHeavy.
	const dock = springAt(t, DOCK, springHeavy);
	const heroY = lerp(420, 36, dock);
	const heroScale = lerp(1, 0.5, dock);

	const colHeader = (label: string, color: string, count: number, x: number) => (
		<div style={{position: 'absolute', left: x + 10, top: BOARD.y + 40, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT}}>
			<span style={{width: 14, height: 14, borderRadius: 7, background: color}} />
			<span style={{fontSize: 27, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em'}}>{label}</span>
			<span style={{fontSize: 19, fontWeight: 800, color, background: 'rgba(0,51,77,0.05)', padding: '4px 12px', borderRadius: 999}}>{count}</span>
		</div>
	);

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c08" origin="960px 580px">
				<div data-editor style={{position: 'absolute', inset: 0}}>
					<UiPanelExpand at={ENTER} radius={[60, 36]} origin="50% 0%" style={{position: 'absolute', left: LIST.x, top: LIST.y}}>
						{(r) => (
							<AppCard radius={r} style={{width: LIST.w, boxSizing: 'border-box', padding: 28, fontFamily: FONT}}>
								<div style={{fontSize: 30, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em', marginBottom: 20}}>{COPY.C08.sectorsHeader}</div>
								<div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
									{COPY.C08.sectorList.map((name, i) => {
										const on = activeSector === LIST_SECTORS[i];
										return (
											<CascadePop key={name} at={ENTER + 0.05} index={i} origin="20% 50%">
												<div
													style={{
														height: 74,
														borderRadius: 22,
														display: 'flex',
														alignItems: 'center',
														padding: '0 24px',
														fontSize: 25,
														fontWeight: 700,
														color: on ? '#ffffff' : APP.fg,
														background: on ? 'linear-gradient(90deg, #63aee0, #2f86d6)' : '#ffffff',
														boxShadow: on ? '0 16px 34px -16px rgba(47,134,214,.8)' : '0 8px 24px -18px rgba(41,89,185,.4), inset 0 0 0 1px rgba(0,51,77,.05)',
													}}
												>
													{name}
												</div>
											</CascadePop>
										);
									})}
								</div>
							</AppCard>
						)}
					</UiPanelExpand>
					<UiPanelExpand at={cascadeAt(ENTER, 1)} radius={[64, 36]} origin="50% 0%" style={{position: 'absolute', left: CANVAS.x, top: CANVAS.y}}>
						{(r) => (
							<AppCard radius={r} style={{position: 'relative', width: CANVAS.w, height: CANVAS.h, boxSizing: 'border-box', padding: 28}}>
								<div style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT}}>
									<IconTile name="map" size={52} />
									<span style={{fontSize: 32, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}>{COPY.C08.editorTitle}</span>
									<span style={{marginLeft: 'auto', fontSize: 20, fontWeight: 700, color: APP.fg, padding: '10px 20px', borderRadius: 999, background: '#ffffff', boxShadow: 'inset 0 0 0 1px rgba(0,51,77,.1)'}}>
										{COPY.C08.addSector}
									</span>
								</div>
								<div style={{position: 'absolute', left: (CANVAS.w - MAP_W) / 2, top: 112}}>
									<EditorMap width={MAP_W} lit={lit} flash={flash} handles={handles} />
								</div>
							</AppCard>
						)}
					</UiPanelExpand>
				</div>

				<div data-board style={{position: 'absolute', inset: 0, opacity: 0}}>
					<div data-board-cam style={{position: 'absolute', inset: 0}}>
						<div style={{position: 'absolute', inset: 0, translate: `${sx}px 0px`}}>
							<AppCard radius={44} style={{position: 'absolute', left: BOARD.x, top: BOARD.y, width: BOARD.w, height: BOARD.h}} />
							{[0, 1].map((k) => (
								<div
									key={k}
									style={{
										position: 'absolute',
										left: COLS[k] - 10,
										top: BOARD.y + 20,
										width: COL_W,
										height: BOARD.h - 40,
										borderRadius: 32,
										background: k === 0 ? 'rgba(253,230,138,0.14)' : `rgba(167,243,208,${0.16 + 0.25 * glow})`,
										border: `1.5px solid ${k === 0 ? 'rgba(217,119,6,0.12)' : `rgba(5,150,105,${0.12 + 0.3 * glow})`}`,
									}}
								/>
							))}
							{colHeader(COPY.C08.columns.pending, APP.pendingFg, pendingCount, COLS[0])}
							{colHeader(COPY.C08.columns.approved, APP.approvedFg, approvedCount, COLS[1])}
							<div style={{position: 'absolute', left: COLS[1], top: SLOT_Y(0)}}>
								<BoardCard title={COPY.C08.cards[2].title} category={COPY.C08.cards[2].category} width={COL_W - 40} thumb={{photo: 'tech'}} approved={1} labels={COPY.C08.badges} />
							</div>
							<div style={{position: 'absolute', left: card2.x, top: card2.y, opacity: card2.o}}>
								<BoardCard title={COPY.C08.cards[1].title} category={COPY.C08.cards[1].category} width={COL_W - 40} thumb={{photo: 'art'}} approved={0} labels={COPY.C08.badges} />
							</div>
							<div style={{position: 'absolute', left: card1.x, top: card1.y, opacity: card1.o, scale: String(1 + 0.05 * lift)}}>
								<BoardCard title={COPY.C08.cards[0].title} category={COPY.C08.cards[0].category} width={COL_W - 40} thumb={{photo: 'festival'}} approved={badge} labels={COPY.C08.badges} glow={glow} />
							</div>
							{/* Approval toast: sharp, springs out of the card that just landed (just below it). */}
							<div
								style={{
									position: 'absolute',
									left: COLS[1] + COL_W - 380,
									top: SLOT_Y(1) + 132,
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									padding: '12px 22px 12px 14px',
									borderRadius: 999,
									background: '#ffffff',
									border: `2px solid ${APP.approvedBorder}`,
									boxShadow: '0 20px 44px -18px rgba(5,150,105,.55)',
									fontFamily: FONT,
									fontSize: 24,
									fontWeight: 800,
									color: APP.approvedFg,
									whiteSpace: 'nowrap',
									scale: String(popScale(t, TOAST_AT)),
									transformOrigin: '80% 0%',
									opacity: t >= TOAST_AT ? 1 : 0,
								}}
							>
								<span style={{width: 36, height: 36, borderRadius: 18, background: APP.approvedFg, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
									<Icon name="check" size={22} color="#ffffff" stroke={3.2} />
								</span>
								{COPY.C08.approvedToast}
							</div>
						</div>
					</div>
				</div>
			</IsoStage>

			{/* Title hand-off in screen space: hero → docked; swaps on the approval. */}
			<div style={{position: 'absolute', left: 0, right: 0, top: heroY, display: 'flex', justifyContent: 'center', scale: String(heroScale), transformOrigin: '50% 0%'}}>
				<Kinetic lines={[[...COPY.C08.title[0].split(' '), ...COPY.C08.title[1].split(' ')]]} at={HERO} mode="pop" size={150} weight={[250, 800]} gradientFrom={2} palette={PALETTE.hero} exitAt={APPROVED - 0.2} />
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 36, display: 'flex', justifyContent: 'center'}}>
				<Kinetic lines={[[...COPY.C08.title2[0].split(' '), ...COPY.C08.title2[1].split(' ')]]} at={APPROVED} mode="fly" step={3} size={75} weight={[400, 800]} gradientFrom={3} palette={PALETTE.hero} />
			</div>
		</AbsoluteFill>
	);
};
