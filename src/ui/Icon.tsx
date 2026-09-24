import React from 'react';

// Minimal stroke icons in the spirit of the app's lucide-react set (drawn here, no new deps).
export type IconName =
	| 'grid'
	| 'map'
	| 'ticket'
	| 'users'
	| 'seat'
	| 'check'
	| 'calendar'
	| 'clock'
	| 'pin'
	| 'arrow'
	| 'chevron'
	| 'minus'
	| 'plus'
	| 'user'
	| 'card'
	| 'layers'
	| 'info';

const PATHS: Record<IconName, React.ReactNode> = {
	grid: (
		<>
			<rect x="3" y="3" width="7" height="7" rx="1.5" />
			<rect x="14" y="3" width="7" height="7" rx="1.5" />
			<rect x="3" y="14" width="7" height="7" rx="1.5" />
			<rect x="14" y="14" width="7" height="7" rx="1.5" />
		</>
	),
	map: (
		<>
			<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" />
			<path d="M9 4v13M15 6.5v13" />
		</>
	),
	ticket: (
		<>
			<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8z" />
			<path d="M13 6v2M13 11v2M13 16v2" />
		</>
	),
	users: (
		<>
			<circle cx="9" cy="8" r="3.5" />
			<path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
			<path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
		</>
	),
	seat: (
		<>
			<path d="M6 11V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" />
			<path d="M4 11h16v5H4z" />
			<path d="M6 16v4M18 16v4" />
		</>
	),
	check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
	calendar: (
		<>
			<rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
			<path d="M3.5 10h17M8 3v4M16 3v4" />
		</>
	),
	clock: (
		<>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M12 7.5V12l3 2" />
		</>
	),
	pin: (
		<>
			<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
			<circle cx="12" cy="10" r="2.3" />
		</>
	),
	arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
	chevron: <path d="M9 5.5 15.5 12 9 18.5" />,
	minus: <path d="M5.5 12h13" />,
	plus: <path d="M12 5.5v13M5.5 12h13" />,
	user: (
		<>
			<circle cx="12" cy="8" r="4" />
			<path d="M4 21a8 8 0 0 1 16 0" />
		</>
	),
	card: (
		<>
			<rect x="3" y="5" width="18" height="14" rx="2.5" />
			<path d="M3 10h18" />
		</>
	),
	info: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 11v5.5M12 7.8v.2" />
		</>
	),
	layers: (
		<>
			<path d="M12 3 2.5 8 12 13l9.5-5L12 3z" />
			<path d="M2.5 12.5 12 17.5l9.5-5M2.5 16.5 12 21.5l9.5-5" />
		</>
	),
};

export const Icon: React.FC<{name: IconName; size?: number; color?: string; stroke?: number; style?: React.CSSProperties}> = ({
	name,
	size = 24,
	color = 'currentColor',
	stroke = 2,
	style,
}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke={color}
		strokeWidth={stroke}
		strokeLinecap="round"
		strokeLinejoin="round"
		style={{display: 'block', flexShrink: 0, ...style}}
	>
		{PATHS[name]}
	</svg>
);

/** Blue squircle holding an icon (app header pattern). */
export const IconTile: React.FC<{name: IconName; size?: number; soft?: boolean}> = ({name, size = 56, soft = false}) => (
	<div
		style={{
			width: size,
			height: size,
			borderRadius: size * 0.3,
			background: soft ? 'rgba(87,197,244,0.14)' : 'linear-gradient(135deg, #57c5f4 0%, #2959b9 100%)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			boxShadow: soft ? 'none' : '0 10px 24px -10px rgba(41,89,185,.6), inset 0 1px 0 rgba(255,255,255,.4)',
			flexShrink: 0,
		}}
	>
		<Icon name={name} size={size * 0.5} color={soft ? '#2f7fc8' : '#ffffff'} stroke={2} />
	</div>
);
