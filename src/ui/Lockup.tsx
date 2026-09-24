import React from 'react';
import {LogoApp, Wordmark} from './Logo';

// Squircle of logo-app.svg measured in its viewBox: 6.84 % inset per side, corners ≈ 33 % of the
// squircle. The glint is clipped to that shape with CSS geometry (no async mask image to load).
const SQUIRCLE_INSET = '6.84%';
const SQUIRCLE_RADIUS = '33%';

/** Brand lockup: app symbol + wordmark. `glint` 0..1 sweeps a highlight across the symbol. */
export const Lockup: React.FC<{size?: number; glint?: number}> = ({size = 176, glint = -1}) => (
	<div style={{display: 'flex', alignItems: 'center', gap: size * 0.17}}>
		<div style={{position: 'relative', width: size, height: size}}>
			<LogoApp size={size} shadow />
			{glint >= 0 && glint <= 1 ? (
				<div style={{position: 'absolute', inset: SQUIRCLE_INSET, borderRadius: SQUIRCLE_RADIUS, overflow: 'hidden'}}>
					<div
						style={{
							position: 'absolute',
							top: -size * 0.25,
							bottom: -size * 0.25,
							width: size * 0.4,
							left: -size * 0.7 + glint * size * 2.2,
							rotate: '20deg',
							background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.75), rgba(255,255,255,0))',
						}}
					/>
				</div>
			) : null}
		</div>
		<Wordmark size={size * 0.75} />
	</div>
);
