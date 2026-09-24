import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../copy';
import {Kinetic, PALETTE} from '../motion/kinetic';
import {BackdropDrift, cascadeAt, CascadePop, IsoStage, UiPanelExpand, type DriftItem} from '../motion/patterns';
import {useSceneTime, useSceneTimeline} from '../motion/scene';
import {blurFilter, EASE, lerp, popScale, prog, springAt, springHeavy} from '../motion/tokens';
import {APP, APP_CTA, EDITOR, FONT} from '../theme';
import {C08_POLYS, DUR, LABELS} from '../timeline';
import {EditorMap} from '../ui/EditorMap';
import {GlassPill, GradientTile, MiniChart, Orb, Ring, SkeletonCard} from '../ui/Floaters';
import {Icon, IconTile, type IconName} from '../ui/Icon';
import {EDITOR_POLYGONS, type SectorId} from '../ui/mapGeometry';
import type {StockKey} from '../ui/Photo';
import {BoardCard} from '../ui/StatusBoard';

// C08 "Quem organiza". "Quem organiza cria." is born big at the centre letter by letter, then docks
// at the top centre on a heavy spring while the venue map editor (04-admin/06–08, recreated)
// expands underneath in a steep isometric view: the sector list Cascade Pops, one block lights per
// even step between polygons.start and polygons.end and the "Detalhes do setor" glass box under the list follows the
// active sector (name, description, capacity). Small blurred glass pieces, orbs and blue tiles
// drift far behind. At the turn (~53 % of the scene) the plate flips to an ILLUSTRATIVE status board: four events slide
// into "Aguardando aprovação" and two of them move to "Aprovado", each with a toast. Reading hold,
// then the camera punches into the approved column before the flash cut.

const HERO = LABELS['C08.title.hero'];
const ENTER = LABELS['C08.list.cascade'];
const CARDS = LABELS['C08.cards.slide'];
const APPROVALS = [LABELS['C08.approved1'], LABELS['C08.approved2']];
const PUNCH = LABELS['C08.punch'];
const END = DUR.C08;
const DOCK = HERO + 0.55;

// Editor layout: list + details on the left, canvas on the right.
const LIST = {x: 120, y: 190, w: 560};
const DETAILS = {x: 120, y: 618, w: 560, h: 361};
const CANVAS = {x: 720, y: 190, w: 1080, h: 789};
const MAP_W = 680;
const RADIUS = 52;

// Board layout: one big container, two columns with a generous gutter, cards inside.
const BOARD = {x: 120, y: 160, w: 1680, h: 860, pad: 44};
const COL_W = (BOARD.w - BOARD.pad * 3) / 2;
const COLS = [BOARD.x + BOARD.pad, BOARD.x + BOARD.pad * 2 + COL_W];
const COL_TOP = BOARD.y + BOARD.pad;
const COL_H = BOARD.h - BOARD.pad * 2;
const COL_PAD = 28;
const CARD_W = COL_W - COL_PAD * 2;
const CARD_H = 124;
const SLOT_Y = (k: number) => COL_TOP + 104 + k * (CARD_H + 22);

const sectorOf = (i: number): SectorId => EDITOR_POLYGONS[i].sector;
const LIST_SECTORS: SectorId[] = ['pista', 'nivel1', 'superior', 'premium'];
const SECTOR_COLOR: Record<SectorId, string> = {pista: EDITOR.pista, premium: EDITOR.premium, nivel1: EDITOR.nivel1, superior: EDITOR.superior};
const PENDING_PHOTOS: StockKey[] = ['festival', 'art', 'openair', 'comedy'];

// Small pieces parked in the free bands around the panels (top band beside the title, the side
// margins, the bottom strip), shallow enough to read as soft bokeh rather than disappear.
const DRIFT: DriftItem[] = [
	{x: 250, y: 120, z: -650, drift: [50, 6], node: <GlassPill w={190} icon="check" />},
	{x: 1640, y: 120, z: -700, drift: [-50, 6], node: <SkeletonCard w={220} h={110} icon="calendar" lines={2} />},
	{x: 470, y: 60, z: -800, drift: [40, 0], node: <Orb size={54} />},
	{x: 1420, y: 50, z: -850, drift: [-40, 0], node: <Ring size={80} width={7} />},
	{x: 50, y: 330, z: -650, drift: [20, 30], node: <GradientTile size={56} icon="map" />},
	{x: 55, y: 760, z: -700, drift: [20, -30], node: <Orb size={60} tone="ice" />},
	{x: 1870, y: 330, z: -650, drift: [-20, 30], node: <Orb size={64} />},
	{x: 1868, y: 720, z: -700, drift: [-20, -20], node: <GradientTile size={58} icon="ticket" />},
	{x: 420, y: 1040, z: -700, drift: [60, 0], node: <GlassPill w={180} icon="users" />},
	{x: 1000, y: 1050, z: -800, drift: [-50, 0], node: <Ring size={70} width={6} />},
	{x: 1520, y: 1045, z: -700, drift: [-60, 0], node: <MiniChart w={170} h={100} />},
	{x: 1880, y: 1010, z: -900, drift: [-20, -10], node: <Orb size={44} />},
];

/** Glass container of the editor (brand glass over the mesh, big radius, blue rim light). */
const GlassBox: React.FC<{radius: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({radius, style, children}) => (
	<div
		style={{
			borderRadius: radius,
			background: 'linear-gradient(160deg, rgba(255,255,255,0.86), rgba(234,244,253,0.7))',
			border: '1.5px solid rgba(255,255,255,0.95)',
			boxShadow: '0 40px 90px -46px rgba(28,111,181,0.6), 0 0 0 1px rgba(95,176,230,0.18), inset 0 1px 0 rgba(255,255,255,1)',
			boxSizing: 'border-box',
			fontFamily: FONT,
			...style,
		}}
	>
		{children}
	</div>
);

const Input: React.FC<{label: string; value: string; focus: number; blur: number}> = ({label, value, focus, blur}) => (
	<div>
		<div style={{fontSize: 17, lineHeight: 1, fontWeight: 700, color: APP.fgSoft, marginBottom: 7}}>{label}</div>
		<div
			style={{
				height: 50,
				boxSizing: 'border-box',
				borderRadius: 16,
				background: '#ffffff',
				border: `1.5px solid ${focus > 0.01 ? `rgba(87,197,244,${0.4 + 0.6 * focus})` : 'rgba(0,51,77,0.1)'}`,
				boxShadow: `0 0 0 ${(5 * focus).toFixed(2)}px rgba(87,197,244,0.2)`,
				display: 'flex',
				alignItems: 'center',
				padding: '0 18px',
				overflow: 'hidden',
			}}
		>
			<span style={{fontSize: 21, fontWeight: 600, color: APP.fg, whiteSpace: 'nowrap', filter: blurFilter(blur)}}>{value}</span>
		</div>
	</div>
);

const ToolButton: React.FC<{icon: IconName; on?: boolean}> = ({icon, on}) => (
	<div
		style={{
			width: 50,
			height: 50,
			borderRadius: 16,
			background: on ? 'linear-gradient(135deg, #57c5f4 0%, #2959b9 100%)' : 'rgba(87,197,244,0.12)',
			boxShadow: on ? '0 12px 24px -12px rgba(41,89,185,.8), inset 0 1px 0 rgba(255,255,255,.4)' : 'inset 0 0 0 1px rgba(87,197,244,0.25)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		}}
	>
		<Icon name={icon} size={24} color={on ? '#ffffff' : '#2f7fc8'} stroke={2.2} />
	</div>
);

export const C08Organiza: React.FC = () => {
	const t = useSceneTime();

	const scope = useSceneTimeline(({timeline: tl, selector: q, L}) => {
		const iso = q('[data-iso="c08"]');
		tl.fromTo(iso, {rotateX: 30, rotateY: -22}, {rotateX: 12, rotateY: -8, duration: 1.6, ease: EASE.cubicExpoOut}, L('C08.list.cascade'));
		// Slow drift while the finished map reads, right up to the turn.
		tl.to(iso, {rotateX: 8, rotateY: -3, duration: LABELS['C08.turn'] - LABELS['C08.polygons.end'], ease: EASE.sine}, L('C08.polygons.end'));
		tl.to(iso, {rotateX: 5, rotateY: 0, duration: 0.6, ease: EASE.cubicExpoOut}, L('C08.turn'));
		// Turn: the editor flips away, the status board flips in.
		tl.to(q('[data-editor]'), {rotateY: 90, opacity: 0.4, duration: 0.2, ease: EASE.in, transformOrigin: '960px 560px'}, L('C08.turn'));
		tl.set(q('[data-editor]'), {opacity: 0}, L('C08.turn', 0.2));
		tl.fromTo(q('[data-board]'), {rotateY: -90, opacity: 0}, {rotateY: 0, opacity: 1, duration: 0.3, ease: EASE.cubicExpoOut, transformOrigin: '960px 560px'}, L('C08.turn', 0.2));
		// Approvals: slow push, then a fast punch into the approved column before the cut.
		tl.to(q('[data-board-cam]'), {scale: 1.05, duration: PUNCH - APPROVALS[0], ease: EASE.sine, transformOrigin: '1380px 560px'}, L('C08.approved1'));
		tl.to(q('[data-board-cam]'), {scale: 1.32, duration: END - PUNCH, ease: EASE.in, transformOrigin: '1380px 560px'}, L('C08.punch'));
	});

	// ---------------------------------------------------------------- editor
	const lit = C08_POLYS.map((pt) => prog(t, pt, pt + 0.2, 'out'));
	const flash = C08_POLYS.map((pt) => (t >= pt ? 1 - prog(t, pt, pt + 0.3, 'out') : 0));
	const handles = C08_POLYS.map((pt, i) => {
		const on = prog(t, pt, pt + 0.15, 'snap');
		const n1 = sectorOf(i) === 'nivel1';
		const next = C08_POLYS[i + 1];
		// Only the active block keeps handles, except Nível 1 which accumulates its real vertices.
		const off = !n1 && next !== undefined ? prog(t, next, next + 0.15, 'soft') : 0;
		return on * (1 - off);
	});
	const activeIdx = t >= LABELS['C08.polygons.end'] ? C08_POLYS.length - 1 : C08_POLYS.reduce((acc, pt, i) => (t >= pt ? i : acc), -1);
	const activeSector: SectorId | null = activeIdx >= 0 ? sectorOf(activeIdx) : null;
	const detailIdx = Math.max(0, LIST_SECTORS.indexOf(activeSector ?? 'pista'));
	// The details box refocuses (blur → sharp, focus ring) each time the selected sector changes.
	const lastSwitch = activeIdx < 0 ? -Infinity : C08_POLYS.reduce((acc, pt, i) => (i <= activeIdx && (i === 0 || sectorOf(i) !== sectorOf(i - 1)) ? pt : acc), -Infinity);
	// Before the first block lights there is no switch yet: no focus ring, no blur.
	const refocus = Number.isFinite(lastSwitch) ? 1 - prog(t, lastSwitch, lastSwitch + 0.35, 'out') : 0;
	const valueBlur = Number.isFinite(lastSwitch) ? 8 * (1 - prog(t, lastSwitch, lastSwitch + 0.2, 'out')) : 0;
	const details = COPY.C08.details;

	// ---------------------------------------------------------------- board
	const enter = COPY.C08.pending.map((_, k) => prog(t, CARDS + k * 0.15, CARDS + k * 0.15 + 0.4, 'out'));
	const move = APPROVALS.map((a) => prog(t, a, a + 0.45, 'inOut'));
	const shift = APPROVALS.map((a) => prog(t, a + 0.18, a + 0.55, 'out'));
	const badge = APPROVALS.map((a) => prog(t, a + 0.15, a + 0.35, 'out'));
	const done = APPROVALS.map((a) => (t >= a + 0.18 ? 1 : 0));
	const pendingCount = COPY.C08.pending.reduce<number>((n, _, k) => n + (t >= CARDS + k * 0.15 ? 1 : 0), 0) - done[0] - done[1];
	const approvedCount = 1 + done[0] + done[1];
	const glow = Math.min(1, 0.6 * shift[0] + 0.6 * shift[1]);
	const shake = prog(t, END - 0.5, END - 0.05, 'softIn') * 4;
	const sx = Math.sin(t * 97) * shake;

	/** Position of pending card k: slides in, climbs as earlier cards leave, or travels to "Aprovado". */
	const cardPose = (k: number) => {
		// Card k is approved by approval j === k (the first two cards, in order).
		if (k < APPROVALS.length) {
			const m = move[k];
			const lift = Math.sin(Math.PI * m);
			const fromSlot = k === 1 ? 1 - shift[0] : 0;
			return {
				x: lerp(COLS[0], COLS[1], m) + COL_PAD - (1 - enter[k]) * 260,
				y: lerp(SLOT_Y(fromSlot), SLOT_Y(1 + k), m) - lift * 40,
				scale: 1 + 0.05 * lift,
				approved: badge[k],
				glow: prog(t, APPROVALS[k] + 0.18, APPROVALS[k] + 0.55, 'out') * (1 - prog(t, APPROVALS[k] + 0.9, APPROVALS[k] + 1.6, 'soft')),
			};
		}
		const slot = k - shift[0] - shift[1];
		return {x: COLS[0] + COL_PAD - (1 - enter[k]) * 260, y: SLOT_Y(slot), scale: 1, approved: 0, glow: 0};
	};

	// Title hand-off: big at the centre, then docked at the top centre on springHeavy.
	const dock = springAt(t, DOCK, springHeavy);
	const heroY = lerp(420, 36, dock);
	const heroScale = lerp(1, 0.5, dock);

	const colHeader = (label: string, color: string, count: number, x: number) => (
		<div style={{position: 'absolute', left: x + COL_PAD, top: COL_TOP + 34, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT}}>
			<span style={{width: 14, height: 14, borderRadius: 7, background: color}} />
			<span style={{fontSize: 27, fontWeight: 800, color: APP.fg, letterSpacing: '-0.02em'}}>{label}</span>
			<span style={{fontSize: 19, fontWeight: 800, color, background: 'rgba(0,51,77,0.05)', padding: '4px 12px', borderRadius: 999}}>{count}</span>
		</div>
	);

	return (
		<AbsoluteFill ref={scope}>
			<IsoStage name="c08" origin="960px 580px">
				<BackdropDrift items={DRIFT} from={0} to={END} opacity={0.75} />
				<div data-editor style={{position: 'absolute', inset: 0}}>
					{/* Sector list */}
					<UiPanelExpand at={ENTER} radius={[84, RADIUS]} origin="50% 0%" style={{position: 'absolute', left: LIST.x, top: LIST.y}}>
						{(r) => (
							<GlassBox radius={r} style={{width: LIST.w, padding: 28}}>
								<div style={{display: 'flex', alignItems: 'center', gap: 14, height: 44, marginBottom: 18}}>
									<IconTile name="layers" size={44} />
									<span style={{fontSize: 30, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}>{COPY.C08.sectorsHeader}</span>
									<span style={{marginLeft: 'auto', minWidth: 40, height: 34, borderRadius: 17, background: 'linear-gradient(135deg, #57c5f4, #2959b9)', color: '#ffffff', fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', boxSizing: 'border-box'}}>
										{COPY.C08.sectorList.length}
									</span>
								</div>
								<div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
									{COPY.C08.sectorList.map((name, i) => {
										const on = activeSector === LIST_SECTORS[i];
										return (
											<CascadePop key={name} at={ENTER + 0.05} index={i} origin="20% 50%">
												<div
													style={{
														height: 64,
														boxSizing: 'border-box',
														borderRadius: 22,
														display: 'flex',
														alignItems: 'center',
														gap: 14,
														padding: '0 22px',
														fontSize: 24,
														fontWeight: 700,
														color: on ? '#ffffff' : APP.fg,
														background: on ? 'linear-gradient(90deg, #63aee0, #2f86d6)' : '#ffffff',
														boxShadow: on ? '0 16px 34px -16px rgba(47,134,214,.8)' : '0 8px 24px -18px rgba(41,89,185,.4), inset 0 0 0 1px rgba(0,51,77,.05)',
													}}
												>
													<span style={{width: 14, height: 14, borderRadius: 5, background: on ? '#ffffff' : SECTOR_COLOR[LIST_SECTORS[i]]}} />
													{name}
													<span style={{marginLeft: 'auto', opacity: on ? 1 : 0.5}}>
														<Icon name="chevron" size={22} color={on ? '#ffffff' : '#2f86d6'} stroke={2.4} />
													</span>
												</div>
											</CascadePop>
										);
									})}
								</div>
							</GlassBox>
						)}
					</UiPanelExpand>

					{/* Sector details: name, description and capacity of the selected block. */}
					<UiPanelExpand at={cascadeAt(ENTER, 2)} radius={[84, RADIUS]} origin="50% 0%" style={{position: 'absolute', left: DETAILS.x, top: DETAILS.y}}>
						{(r) => (
							<GlassBox radius={r} style={{width: DETAILS.w, height: DETAILS.h, padding: 28}}>
								<div style={{display: 'flex', alignItems: 'center', gap: 14, height: 44, marginBottom: 18}}>
									<IconTile name="info" size={44} />
									<span style={{fontSize: 28, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}>{details.title}</span>
									<span style={{marginLeft: 'auto', width: 16, height: 16, borderRadius: 8, background: SECTOR_COLOR[LIST_SECTORS[detailIdx]], boxShadow: '0 0 0 5px rgba(255,255,255,0.9)'}} />
								</div>
								<div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
									<Input label={details.name} value={COPY.C08.sectorList[detailIdx]} focus={refocus} blur={valueBlur} />
									<Input label={details.desc} value={details.values[detailIdx].desc} focus={0} blur={valueBlur} />
									<Input label={details.capacity} value={details.values[detailIdx].capacity} focus={0} blur={valueBlur} />
								</div>
							</GlassBox>
						)}
					</UiPanelExpand>

					{/* Canvas */}
					<UiPanelExpand at={cascadeAt(ENTER, 1)} radius={[88, RADIUS]} origin="50% 0%" style={{position: 'absolute', left: CANVAS.x, top: CANVAS.y}}>
						{(r) => (
							<GlassBox radius={r} style={{position: 'relative', width: CANVAS.w, height: CANVAS.h, padding: 28}}>
								<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
									<IconTile name="map" size={52} />
									<span style={{fontSize: 32, fontWeight: 800, color: APP.fg, letterSpacing: '-0.025em'}}>{COPY.C08.editorTitle}</span>
									<div style={{marginLeft: 26, display: 'flex', gap: 10}}>
										<ToolButton icon="grid" on />
										<ToolButton icon="layers" />
										<ToolButton icon="pin" />
									</div>
									<span
										style={{
											marginLeft: 'auto',
											display: 'flex',
											alignItems: 'center',
											gap: 10,
											height: 52,
											boxSizing: 'border-box',
											padding: '0 22px 0 16px',
											borderRadius: 999,
											background: APP_CTA,
											color: '#ffffff',
											fontSize: 20,
											fontWeight: 800,
											boxShadow: '0 14px 30px -14px rgba(41,89,185,.8), inset 0 1px 0 rgba(255,255,255,.35)',
										}}
									>
										<Icon name="plus" size={22} color="#ffffff" stroke={2.8} />
										{COPY.C08.addSector}
									</span>
								</div>
								{/* Drawing surface: soft blue grid under the stadium. */}
								<div
									style={{
										position: 'absolute',
										left: 28,
										right: 28,
										top: 104,
										bottom: 28,
										borderRadius: 36,
										background: 'rgba(87,197,244,0.07)',
										backgroundImage: 'radial-gradient(circle, rgba(47,134,214,0.22) 1.5px, rgba(47,134,214,0) 2px)',
										backgroundSize: '28px 28px',
										boxShadow: 'inset 0 0 0 1.5px rgba(87,197,244,0.22)',
									}}
								/>
								<div style={{position: 'absolute', left: (CANVAS.w - MAP_W) / 2, top: 124}}>
									<EditorMap width={MAP_W} lit={lit} flash={flash} handles={handles} />
								</div>
							</GlassBox>
						)}
					</UiPanelExpand>
				</div>

				<div data-board style={{position: 'absolute', inset: 0, opacity: 0}}>
					<div data-board-cam style={{position: 'absolute', inset: 0}}>
						<div style={{position: 'absolute', inset: 0, translate: `${sx}px 0px`}}>
							<GlassBox radius={60} style={{position: 'absolute', left: BOARD.x, top: BOARD.y, width: BOARD.w, height: BOARD.h}} />
							{[0, 1].map((k) => (
								<div
									key={k}
									style={{
										position: 'absolute',
										left: COLS[k],
										top: COL_TOP,
										width: COL_W,
										height: COL_H,
										boxSizing: 'border-box',
										borderRadius: 44,
										background: k === 0 ? 'rgba(253,230,138,0.16)' : `rgba(167,243,208,${0.16 + 0.25 * glow})`,
										border: `1.5px solid ${k === 0 ? 'rgba(217,119,6,0.14)' : `rgba(5,150,105,${0.12 + 0.3 * glow})`}`,
									}}
								/>
							))}
							{colHeader(COPY.C08.columns.pending, APP.pendingFg, pendingCount, COLS[0])}
							{colHeader(COPY.C08.columns.approved, APP.approvedFg, approvedCount, COLS[1])}
							<div style={{position: 'absolute', left: COLS[1] + COL_PAD, top: SLOT_Y(0)}}>
								<BoardCard title={COPY.C08.approvedCard.title} category={COPY.C08.approvedCard.category} width={CARD_W} thumb={{photo: 'tech'}} approved={1} labels={COPY.C08.badges} />
							</div>
							{/* Draw order: the card that is travelling to "Aprovado" stays on top. */}
							{[3, 2, 1, 0].map((k) => {
								const p = cardPose(k);
								const c = COPY.C08.pending[k];
								return (
									<div key={c.title} style={{position: 'absolute', left: p.x, top: p.y, opacity: enter[k], scale: String(p.scale), filter: blurFilter(10 * (1 - enter[k]))}}>
										<BoardCard title={c.title} category={c.category} width={CARD_W} thumb={{photo: PENDING_PHOTOS[k]}} approved={p.approved} labels={COPY.C08.badges} glow={p.glow} />
									</div>
								);
							})}
							{/* Approval toasts: one per approval, just below the card that landed. */}
							{APPROVALS.map((a, j) => {
								const at = a + 0.3;
								const next = APPROVALS[j + 1];
								const out = next === undefined ? 0 : prog(t, next, next + 0.25, 'softIn');
								if (t < at || out >= 1) return null;
								return (
									<div
										key={j}
										style={{
											position: 'absolute',
											left: COLS[1] + COL_W - COL_PAD - 330,
											top: SLOT_Y(1 + j) + CARD_H + 16,
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
											scale: String(popScale(t, at) * (1 - 0.2 * out)),
											transformOrigin: '80% 0%',
											opacity: 1 - out,
											filter: blurFilter(10 * out),
										}}
									>
										<span style={{width: 36, height: 36, borderRadius: 18, background: APP.approvedFg, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
											<Icon name="check" size={22} color="#ffffff" stroke={3.2} />
										</span>
										{COPY.C08.approvedToast}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</IsoStage>

			{/* Title hand-off in screen space: hero → docked; swaps on the first approval. */}
			<div style={{position: 'absolute', left: 0, right: 0, top: heroY, display: 'flex', justifyContent: 'center', scale: String(heroScale), transformOrigin: '50% 0%'}}>
				<Kinetic lines={[[...COPY.C08.title[0].split(' '), ...COPY.C08.title[1].split(' ')]]} at={HERO} mode="pop" size={150} weight={[250, 800]} gradientFrom={2} palette={PALETTE.heroDeep} exitAt={APPROVALS[0] - 0.2} />
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 36, display: 'flex', justifyContent: 'center'}}>
				<Kinetic lines={[[...COPY.C08.title2[0].split(' '), ...COPY.C08.title2[1].split(' ')]]} at={APPROVALS[0]} mode="fly" step={3} size={75} weight={[400, 800]} gradientFrom={3} palette={PALETTE.heroDeep} />
			</div>
		</AbsoluteFill>
	);
};
