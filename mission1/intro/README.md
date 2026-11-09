# Colonies series intro (v9: short shots matched to each line)

Current build: `work_v9/build_v9.py` (run with `/workspace/ant-colony/.venv-tts/bin/python work_v9/build_v9.py happy_c1 intro.mp4`). New clips in `gen9/`, orbit and sky graphics from `work_v9/graphics.py`. v8 backup: `intro_v8_backup.mp4`. Title-voice takes: `voice_samples/title_takes/`.

(v8 notes below)

Plays from the home page "Watch the intro" pop-up. Series intro, not Mission 1. **Not published.**

| File | Purpose |
|------|---------|
| `intro.mp4` | v8, ~32 s, 1280x720 H.264 + AAC, +faststart, ~6.3 MB |
| `intro_poster.jpg` | Kepler and Comet frame (no captions) |
| `contact_sheet.jpg` | 2 fps QC sheet |
| `intro_timing.json` | Beat, narration and title timing |
| `intro_stills_v7.mp4` | Backup of the old Ken Burns version |
| `intro_v8_alt_kokoro_george.mp4` | Same cut, local Kokoro bm_george narration (fallback) |
| `voice_samples/` | First two lines in 4 voices for picking |
| `gen/` | Generated motion clips (Grok Imagine image-to-video) |

Beats: Earth launch (gen beat1_v1) / space (beat2_v1) / landing (beat3_v2) / Kepler and Comet (beat4 v5+v4 splice) / empty plain + COLONIES title (beat5_v1).
Narration: en-US-AndrewMultilingualNeural via edge-tts (free, online, no key), rubberband tempo 0.93, each line separate with pauses. Title spoken "Colonies..." slowed 0.8x with light echo and a music swell.
Rebuild: `/workspace/ant-colony/.venv-tts/bin/python work_v8/build_v8.py andrew intro.mp4` (or `bm_george <name>.mp4` for local Kokoro).
Deploy note: exclude gen/, voice_work/, work*/, qc*/, clips/, stills/old_v1 and the backup/alt mp4s from the site copy. sw.js precaches intro_poster.jpg, so bump the cache version when publishing.
