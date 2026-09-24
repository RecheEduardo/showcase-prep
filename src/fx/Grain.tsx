import React from 'react';
import {AbsoluteFill, random, staticFile, useCurrentFrame} from 'remotion';

/** Very subtle film grain; tile offset is seeded per frame (deterministic). */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.035}) => {
	const frame = useCurrentFrame();
	const ox = Math.floor(random(`grain-x-${frame}`) * 256);
	const oy = Math.floor(random(`grain-y-${frame}`) * 256);
	return (
		<AbsoluteFill
			style={{
				backgroundImage: `url(${staticFile('brand/grain.png')})`,
				backgroundSize: '256px 256px',
				backgroundPosition: `${ox}px ${oy}px`,
				mixBlendMode: 'overlay',
				opacity,
				pointerEvents: 'none',
			}}
		/>
	);
};
