import {Audio} from '@remotion/media';
import React from 'react';
import {Sequence, staticFile} from 'remotion';
import AUDIO_BUILD from './data/cues.json';
import {PACING} from './pacing';
import {SFX_CUES, TOTAL_SECONDS} from './timeline';

const PACING_KEYS = Object.keys(PACING) as (keyof typeof PACING)[];

// Offline master (music + SFX, `npm run audio`: cues.mjs → synth.mjs → sfx.mjs → mix.mjs →
// analyze.mjs). Everything is timed from src/timeline.ts, i.e. from src/pacing.ts. MUSIC_SOURCE
// records which music bed the master was mixed from; switching to 'external' requires a licensed
// track registered in audio/LICENSES.md and a re-run of the mix.
export const MUSIC_SOURCE: 'procedural' | 'external' = 'procedural';
export const MASTER_AUDIO = 'audio/master.wav';

/** The master is only played when it was built for the current PACING (otherwise it would drift). */
export const AUDIO_IN_SYNC =
	PACING_KEYS.every((k) => (AUDIO_BUILD.pacing as Record<string, number>)[k] === PACING[k]) && AUDIO_BUILD.total_seconds === TOTAL_SECONDS;
export const AUDIO_ENABLED = AUDIO_IN_SYNC;
if (!AUDIO_IN_SYNC) {
	console.warn('[audio] src/pacing.ts mudou desde o último áudio gerado: rode `npm run audio` para refazer música + SFX no novo tempo. Áudio desligado até lá.');
}

// Remotion-side SFX layer: short samples from public/audio/sfx placed on the frames of
// SFX_CUES (src/timeline.ts), so they follow src/pacing.ts automatically. Only the kinds listed
// here are audible. The C07 typing ticks are muted for now; to bring them back, add:
//   key_tick: {files: Array.from({length: 12}, (_, i) => `audio/sfx/key_tick_${String(i).padStart(2, '0')}.wav`), volume: 0.55},
export const SFX_KINDS: Record<string, {files: string[]; volume: number}> = {};

const SFX_FRAMES = 12;

export const SfxLayer: React.FC = () => (
	<>
		{SFX_CUES.filter((c) => SFX_KINDS[c.kind]).map((c) => {
			const kind = SFX_KINDS[c.kind];
			return (
				<Sequence key={c.id} from={c.frame} durationInFrames={SFX_FRAMES} name={c.id} layout="none">
					<Audio src={staticFile(kind.files[(c.index ?? 0) % kind.files.length])} volume={kind.volume} />
				</Sequence>
			);
		})}
	</>
);
