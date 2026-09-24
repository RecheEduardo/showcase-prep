import React from 'react';
import {Img, staticFile} from 'remotion';

// Stock event photography (Unsplash License: free commercial use, no watermark; credits in
// out/provenance.json). One photo per fictitious event of COPY.events, so no scene repeats
// another scene's picture.
export const STOCK = {
	arena: 'photos/arena.jpg',
	festival: 'photos/festival.jpg',
	openair: 'photos/openair.jpg',
	stage: 'photos/stage.jpg',
	comedy: 'photos/comedy.jpg',
	food: 'photos/food.jpg',
	tech: 'photos/tech.jpg',
	art: 'photos/art.jpg',
	electro: 'photos/electro.jpg',
	samba: 'photos/samba.jpg',
	run: 'photos/run.jpg',
} as const;

export type StockKey = keyof typeof STOCK;

/** Rounded event photo card (background drift, thumbnails). */
export const PhotoCard: React.FC<{src: StockKey; width: number; height: number; radius?: number}> = ({src, width, height, radius = 36}) => (
	<div style={{width, height, borderRadius: radius, overflow: 'hidden', boxShadow: '0 30px 60px -30px rgba(14,39,70,.55)'}}>
		<Photo src={src} width={width} height={height} />
	</div>
);

/**
 * Cover-cropped stock photo. `zoom` enlarges around `position` (parallax / push) by resizing the
 * image box, NOT with a CSS transform or filter: either one turns the image into its own compositing
 * layer and, inside an IsoStage (preserve-3d), it can be depth-sorted over the overlays on top of it.
 */
export const Photo: React.FC<{
	src: StockKey;
	width: number | string;
	height: number | string;
	zoom?: number;
	position?: string;
	brightness?: number;
	style?: React.CSSProperties;
}> = ({src, width, height, zoom = 1, position = '50% 50%', brightness = 1, style}) => {
	const [px, py] = position.split(' ').map((v) => parseFloat(v) / 100);
	return (
		<div style={{position: 'relative', width, height, overflow: 'hidden', ...style}}>
			<Img
				src={staticFile(STOCK[src])}
				style={{
					position: 'absolute',
					left: `${(-(zoom - 1) * px * 100).toFixed(3)}%`,
					top: `${(-(zoom - 1) * py * 100).toFixed(3)}%`,
					width: `${(zoom * 100).toFixed(3)}%`,
					height: `${(zoom * 100).toFixed(3)}%`,
					maxWidth: 'none',
					objectFit: 'cover',
					objectPosition: position,
				}}
			/>
			{/* Brightness as a dark film (a CSS filter would promote the image to its own layer too). */}
			{brightness < 1 ? <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${(1 - brightness).toFixed(3)})`}} /> : null}
		</div>
	);
};
