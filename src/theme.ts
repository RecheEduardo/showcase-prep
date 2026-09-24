// Two token layers (14-DESIGN-RECONCILIATION §7):
// BRAND = deck identity for the video frame (background, chrome, kinetic type).
// APP   = the real product UI, used only inside recreated UI plates.

export const FONT = 'Plus Jakarta Sans';

export const BRAND = {
	ink: '#0e2746',
	inkSoft: '#4a5e7f',
	ice1: '#f4f8fd',
	ice2: '#e8f1fb',
	ice3: '#dbe8f7',
	blue1: '#2a8fd4',
	blue2: '#1c6fb5',
	blueSoft: '#5fb0e6',
	navy: '#0e2746',
	navyDeep: '#081a31',
} as const;

export const BRAND_GRADIENT = 'linear-gradient(135deg, #5fb0e6 0%, #2a8fd4 45%, #1c6fb5 100%)';
export const BRAND_GRADIENT_2 = 'linear-gradient(135deg, #2a8fd4 0%, #1c6fb5 100%)';

/** Light ice gradient of the app palette under the living blue/white mesh (ui/Chrome.tsx). */
export const CLEAN_BACKGROUND = 'linear-gradient(165deg, #f6faff 0%, #eaf3fd 55%, #dfeaf8 100%)';
export const CLEAN_BASE = '#eef5fd';

export const SHADOW = {
	panel: 'rgba(28,111,181,.5) 0 40px 100px -50px, rgba(28,111,181,.12) 0 10px 28px -10px, rgba(255,255,255,.95) 0 1px 0 inset',
	frame: 'rgba(28,111,181,.38) 0 40px 80px -20px, rgba(255,255,255,.75) 0 0 0 1.5px, rgba(255,255,255,.9) 0 1px 0 inset',
	badge: 'rgba(28,111,181,.55) 0 14px 30px -12px, rgba(255,255,255,.5) 0 1px 0 inset',
	node: 'rgba(28,111,181,.3) 0 8px 32px -8px, rgba(255,255,255,.9) 0 1px 0 inset',
} as const;

export const GLASS_DEEP = 'linear-gradient(160deg, rgba(255,255,255,.78), rgba(232,241,251,.6))';

// Product UI tokens, measured in 07-UI-OBSERVATIONS and sampled from the screenshots.
export const APP = {
	fg: '#00334d',
	fgSoft: '#1e4b62',
	muted: '#5b7385',
	primary: '#57c5f4',
	primaryDeep: '#2959b9',
	bg: '#fafeff',
	card: '#ffffff',
	cardSoft: '#f7fafc',
	border: 'rgba(0,51,77,0.08)',
	chip: '#2f7fc8',
	chipSoft: '#dbf0f9',
	selBorder: '#98daf6',
	heroEm: '#0078f4',
	heroClique: '#0dbde4',
	approvedFg: '#059669',
	approvedBg: '#ecfdf5',
	approvedBorder: '#a7f3d0',
	pendingFg: '#d97706',
	pendingBg: '#fffbeb',
	pendingBorder: '#fde68a',
} as const;

export const APP_CTA = 'linear-gradient(90deg, #57c5f4 0%, #2959b9 100%)';
export const APP_CTA_REVERSED = 'linear-gradient(90deg, #2959b9 0%, #57c5f4 100%)';
export const APP_HERO_GRADIENT = 'linear-gradient(90deg, #0078f4 0%, #0dbde4 100%)';
export const APP_CARD_SHADOW = '0 18px 50px -24px rgba(41,89,185,.35), 0 2px 8px -2px rgba(0,51,77,.06)';

// Sector map colours sampled from 06-queue-and-purchase/02, 03, 06.
export const MAP = {
	outer: '#dddddd',
	palco: '#39393b',
	premium: '#1c86e9',
	premiumSel: '#0f5ca7',
	pista: '#bf3390',
	pistaSel: '#8f1f6c',
	nivel1: '#14a3b1',
	nivel1Sel: '#0b698e',
	superior: '#3e68c0',
	superiorSel: '#2a4891',
} as const;

// Venue map editor colours sampled from 04-admin/08.
export const EDITOR = {
	pista: '#e50e8b',
	premium: '#4963cd',
	nivel1: '#14a3b1',
	superior: '#6d5292',
	handle: '#2a8fd4',
} as const;

// Category tiles (01-public-home/03): top-left -> bottom-right gradient stops.
export const CATEGORY_TILES = [
	{name: 'Música', from: '#2362f6', to: '#1c1b44'},
	{name: 'Tecnologia', from: '#991cf4', to: '#2a104d'},
	{name: 'Gastronomia', from: '#fa265c', to: '#441013'},
	{name: 'Artes e Cultura', from: '#fd980d', to: '#441b0b'},
	{name: 'Cursos e Workshops', from: '#0db983', to: '#0c2a34'},
	{name: 'Esportes e Bem-estar', from: '#0da1f3', to: '#132149'},
	{name: 'Comédia e Stand-up', from: '#2261f5', to: '#1c1b43'},
	{name: 'Feiras e Negócios', from: '#991cf3', to: '#371f5b'},
	{name: 'Festas e Shows', from: '#fa265c', to: '#451113'},
	{name: 'Games e E-Sports', from: '#fd990d', to: '#441b0b'},
] as const;

// Video type scale (art-direction/ART-DIRECTION.md §Tipografia).
export const TYPE = {
	display: {fontSize: 168, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.95},
	h1: {fontSize: 112, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1},
	h2: {fontSize: 80, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.02},
	lead: {fontSize: 56, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1},
	body: {fontSize: 30, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.4},
	eyebrow: {fontSize: 22, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, lineHeight: 1},
	foot: {fontSize: 20, fontWeight: 500, letterSpacing: '0', lineHeight: 1.3},
} as const;
