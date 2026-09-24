import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {GoTicketShowcase} from './GoTicketShowcase';
import {FPS, HEIGHT, TOTAL_FRAMES, WIDTH} from './timeline';

export const RemotionRoot: React.FC = () => (
	<Composition id="GoTicketShowcase" component={GoTicketShowcase} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
