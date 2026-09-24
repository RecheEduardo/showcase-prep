// Single audio path: the offline master (music + SFX already mixed by scripts/audio/mix.mjs).
// MUSIC_SOURCE records which music bed the master was mixed from; switching to 'external'
// requires a licensed track registered in audio/LICENSES.md and a re-run of the mix.
export const MUSIC_SOURCE: 'procedural' | 'external' = 'procedural';
export const MASTER_AUDIO = 'audio/master.wav';
export const AUDIO_ENABLED = false;
