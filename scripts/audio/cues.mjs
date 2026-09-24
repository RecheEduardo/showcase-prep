// Writes src/data/cues.json (consumed by synth.mjs / sfx.mjs / mix.mjs / analyze.mjs) from the audio
// plan in src/timeline.ts, which is derived from src/pacing.ts. Run it (via `npm run audio`) after
// changing any duration so the music and the SFX are rebuilt in sync with the current cut.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const {FPS, TOTAL_SECONDS, TOTAL_FRAMES, SCENES, SFX_CUES, MASTER_MUTED_KINDS, MUSIC_SECTIONS, MUSIC_ANCHORS} = await import('../../src/timeline.ts');
const {PACING} = await import('../../src/pacing.ts');

const SR = 48000;
const cues = SFX_CUES.filter((c) => !MASTER_MUTED_KINDS.includes(c.kind)).map(({scene, ...c}) => c);
const out = {
	_generated_by: 'scripts/audio/cues.mjs from src/timeline.ts (src/pacing.ts)',
	pacing: PACING,
	fps: FPS,
	sample_rate_hz: SR,
	samples_per_frame: SR / FPS,
	total_seconds: TOTAL_SECONDS,
	total_frames: TOTAL_FRAMES,
	scenes: SCENES.map((s) => ({id: s.id, start: s.start, end: s.end, stretch: +s.stretch.toFixed(4)})),
	music_sections: MUSIC_SECTIONS,
	music_anchors: MUSIC_ANCHORS,
	mix_targets: {integrated_lufs: -14, true_peak_dbtp_max: -1, sample_rate_hz: SR, channels: 2},
	cues,
};
const file = path.join(root, 'src', 'data', 'cues.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`[cues] ${cues.length} cues, ${MUSIC_SECTIONS.length} music sections, ${TOTAL_SECONDS} s -> ${path.relative(root, file)}`);
