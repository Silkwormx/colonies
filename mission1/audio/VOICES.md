# Mission 1 voices (Kokoro + faster-whisper WER)

Narrator fixed as Kokoro `am_eric` at natural speed `1.0` (user pick). Kepler/Comet chosen by WER among natural American Kokoro voices, distinct from Eric and each other. Truncated clips rejected and regenerated. WER is a machine proxy — nobody has listened to the full set yet.

## Chosen

- **narrator**: Kokoro `am_eric` at speed `1.0` — Colony Guide / story narrator — natural Kokoro am_eric
- **kepler**: Kokoro `am_onyx` at speed `1.0` — Kepler — calm, low, deadpan (Kokoro am_onyx)
- **comet**: Kokoro `am_puck` at speed `1.08` — Comet — quick, bright (Kokoro am_puck)

## Kepler candidates

| Voice | Speed | Lines | WER | Exact |
|---|---|---|---|---|
| am_onyx | 1.0 | 8 | 9.09% | 6/8 |
| am_michael | 1.0 | 8 | 15.15% | 6/8 |

## Comet candidates

| Voice | Speed | Lines | WER | Exact |
|---|---|---|---|---|
| am_puck | 1.08 | 6 | 7.69% | 4/6 |
| am_fenrir | 1.08 | 6 | 30.77% | 2/6 |
| am_liam | 1.08 | 6 | 69.23% | 2/6 |

## Notes

- Science fix: MARS AIR guide now says surface pressure is **less than** one percent of Earth's (story.md, index.html, s01_08.mp3).
- Short titles (Snacks, Ice) may WER-hallucinate in Whisper; clips were regenerated with gentle loudnorm.
