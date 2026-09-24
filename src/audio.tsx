import {Audio} from '@remotion/media';
import React from 'react';
import {Sequence, staticFile} from 'remotion';
import {SFX_CUES} from './timeline';

// Offline master (music + SFX mixed by scripts/audio/mix.mjs). MUSIC_SOURCE records which music
// bed the master was mixed from; switching to 'external' requires a licensed track registered in
// audio/LICENSES.md and a re-run of the mix. The master is disabled: it predates the current cut.
export const MUSIC_SOURCE: 'procedural' | 'external' = 'procedural';
export const MASTER_AUDIO = 'audio/master.wav';
export const AUDIO_ENABLED = false;

// Remotion-side SFX layer: short samples from public/audio/sfx placed on the frames of
// SFX_CUES (src/timeline.ts), so they follow src/pacing.ts automatically. Only the kinds listed
// here are audible; today that is the C07 typing (one key per typed character).
export const SFX_KINDS: Record<string, {files: string[]; volume: number}> = {
	key_tick: {files: Array.from({length: 12}, (_, i) => `audio/sfx/key_tick_${String(i).padStart(2, '0')}.wav`), volume: 0.55},
};

const SFX_FRAMES = 12;

export const SfxLayer: React.FC = () => (
	<>
		{SFX_CUES.filter((c) => SFX_KINDS[c.kind]).map((c) => {
			const kind = SFX_KINDS[c.kind];
			return (
				<Sequence key={c.id} from={c.frame} durationInFrames={SFX_FRAMES} name={c.id} layout="none">
					<Audio src={staticFile(kind.files[c.variant % kind.files.length])} volume={kind.volume} />
				</Sequence>
			);
		})}
	</>
);
