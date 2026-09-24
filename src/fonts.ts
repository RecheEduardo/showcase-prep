import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {FONT} from './theme';

// Plus Jakarta Sans (OFL, public/fonts/OFL.txt), local variable fonts 200–800.
// loadFont() holds the render (delayRender) until each face is ready.
export const fontsReady = Promise.all([
	loadFont({family: FONT, url: staticFile('fonts/PlusJakartaSans-VF.ttf'), weight: '200 800', style: 'normal'}),
	loadFont({family: FONT, url: staticFile('fonts/PlusJakartaSans-Italic-VF.ttf'), weight: '200 800', style: 'italic'}),
]);
