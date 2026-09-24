import {Audio} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {AUDIO_ENABLED, MASTER_AUDIO, SfxLayer} from './audio';
import {Flash} from './fx/Flash';
import {Grain} from './fx/Grain';
import {Shockwave} from './fx/Shockwave';
import {SceneClock} from './motion/scene';
import {INVERT, sceneLead, sceneTail, SceneStage} from './motion/transitions';
import {C00Caos} from './scenes/C00_Caos';
import {C01Marca} from './scenes/C01_Marca';
import {C02Vitrine} from './scenes/C02_Vitrine';
import {C03Evento} from './scenes/C03_Evento';
import {C04Fila} from './scenes/C04_Fila';
import {C05Estadio} from './scenes/C05_Estadio';
import {C06Total} from './scenes/C06_Total';
import {C07Checkout} from './scenes/C07_Checkout';
import {C08Organiza} from './scenes/C08_Organiza';
import {C09Fecho} from './scenes/C09_Fecho';
import {FPS, HITS, SCENES, sec, type SceneId} from './timeline';
import {CLEAN_BASE} from './theme';
import {Chrome} from './ui/Chrome';

const COMPONENTS: Record<SceneId, React.FC> = {
	C00: C00Caos,
	C01: C01Marca,
	C02: C02Vitrine,
	C03: C03Evento,
	C04: C04Fila,
	C05: C05Estadio,
	C06: C06Total,
	C07: C07Checkout,
	C08: C08Organiza,
	C09: C09Fecho,
};

// Big visual hits, one per entry of HITS (src/timeline.ts): the hard cut into the brand, drop 2 out
// of the queue number and the final impact. Their times follow src/pacing.ts.
const [HIT_CUT, HIT_DROP, HIT_FINALE] = HITS;
const FX = [
	{at: HIT_CUT, x: 960, y: 430, flash: 0.85, decay: 0.35, maxR: 1500, width: 40},
	{at: HIT_DROP, x: INVERT.cx, y: INVERT.cy, flash: 0.9, decay: 0.5, maxR: 1900, width: 48},
	{at: HIT_FINALE, x: 960, y: 300, flash: 0.9, decay: 0.45, maxR: 1900, width: 48},
];

const GlobalFx: React.FC = () => {
	const t = useCurrentFrame() / FPS;
	return (
		<>
			{FX.map((h) => (
				<React.Fragment key={h.at}>
					<Shockwave t={t} at={h.at} x={h.x} y={h.y} maxR={h.maxR} width={h.width} />
					<Flash t={t} at={h.at} peak={h.flash} decay={h.decay} />
				</React.Fragment>
			))}
		</>
	);
};

export const GoTicketShowcase: React.FC = () => (
	<>
		<AbsoluteFill style={{backgroundColor: CLEAN_BASE}}>
			<Chrome />
			{SCENES.map((s) => {
				const lead = sceneLead(s.id);
				const tail = sceneTail(s.id);
				const Component = COMPONENTS[s.id];
				return (
					<Sequence key={s.id} name={`${s.id} ${s.name}`} from={s.startFrame - sec(lead)} durationInFrames={s.durationInFrames + sec(lead) + sec(tail)}>
						<SceneClock id={s.id} lead={lead}>
							<SceneStage id={s.id}>
								<Component />
							</SceneStage>
						</SceneClock>
					</Sequence>
				);
			})}
			<GlobalFx />
			<Grain />
			<SfxLayer />
			{AUDIO_ENABLED ? <Audio src={staticFile(MASTER_AUDIO)} /> : null}
		</AbsoluteFill>
	</>
);
