# Mission 1 voices

One narrator for the whole app: Microsoft **Andrew** (`en-US-AndrewMultilingualNeural`, edge-tts), the same voice as the animated intro.

- Book (`a1_*.mp3`) and Solve-it read-aloud (`../solve/audio/a_*.mp3`): rate `-7%`, pitch `+0Hz`, one clip per sentence/span.
- "live" no longer appears in the book (intro page 1 replaced with "First steps"); Andrew's approved intro render of "Could ants live on Mars?" says it correctly.
- A few speak respellings for clarity: cover "Won cracked pod" (Andrew swallowed "One"), oxygen game "Fill up Kepler's/Comet's tank".
- "Sol" is respelled "soul" in speak text (Andrew already says it that way).
- Cover reads the title once: "Mission 1 · Can't Breathe".
- Loudness: two-pass ffmpeg loudnorm, linear, I=-16 LUFS, TP=-1.5 dB; leading/trailing silence trimmed; 24 kHz mono 64 kbps.
- Pacing between spans comes from the pause entries in `manifest.json` (0.22–0.45 s); theme music on cover/intro pages unchanged.
- Generator: `/workspace/ant-colony/build/andrew/gen_all.py`; old Kokoro set backed up in `/workspace/ant-colony/build/old_audio_kokoro/`.
