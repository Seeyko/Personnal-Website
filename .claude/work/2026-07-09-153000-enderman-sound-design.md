# Terminal Sound Design (enderman + site-wide UI)

**Status**: completed
**Branch**: `claude/enderman-design-minecraft-hgljf7`
**Started**: 2026-07-09 15:20

## Task
Add synthesized sound design to the terminal theme (no audio assets —
everything generated with the Web Audio API): the enderman act soundtrack,
plus site-wide soft mechanical-keyboard sounds on clicks/keystrokes and
gentle blips when cards reveal on scroll.

## Site-wide UI sounds
- `sfxKeyInto`: soft "thock" (triangle body 155→72 Hz + lowpassed felt
  noise, random ±8% detune per press); lighter/higher variant on release.
  Wired to pointerdown/up (mouse/pen), click (touch taps only, so scroll
  flicks stay silent) and keydown/keyup.
- `sfxBlipInto`: gentle sine blip on card reveal (IntersectionObserver +
  MutationObserver for late-rendered cards); consecutive reveals climb a
  pentatonic step. Throttled (35ms keys / 90ms blips).
- `window.sound()` console command toggles everything, persisted in
  localStorage `terminal-sfx`; listed in help(). Enderman soundtrack
  respects the same switch.
- Every click/keypress doubles as the AudioContext unlock gesture.

## Files Being Modified
- frontend/themes/terminal/terminal.js

## Progress
- [x] Audio unlock on first user gesture (pointerdown/keydown), one-time
      listeners; act stays silent if no gesture happened yet
- [x] `scheduleEndermanSounds(ctx, dest, t0)` — full soundtrack aligned
      with the 9s act timeline; works on live + OfflineAudioContext
- [x] Stare tension drone while hovering the hidden eyes (starts on
      mouseenter, stops on mouseleave/trigger)
- [x] Wired into both triggers (hover + `window.enderman()`), with a
      re-entry guard so the act can't double-schedule
- [x] Verified in Chromium: context created & running after gesture,
      single context across gestures, no console errors
- [x] Soundtrack rendered offline to WAV: max -13.3 dB (no clipping),
      spectrogram matches the timeline event by event

## Sound map (t = seconds after the enderman appears)
- hover: low sawtooth drone swelling for 2s (tension)
- 0.0: teleport-in vwoop (saw sweep down + bandpass noise)
- 0.5-9.2: chiptune groove locked to the 0.45s bounce (sine kick,
  noise hats, square bassline A2/C3/E3)
- 1.2 / 5.5: deep triangle "vwoo" enderman voice
- 4.1: block pop (sine 350→900)
- 4.64: toss whoosh (noise bandpass 400→2600)
- 5.35: cartoon falling whistle (sine 1400→600)
- 6.12: volley kick thump + launch whoosh + block whistling away
- 6.8 / 8.0: victory arpeggios (square C5-E5-G5-C6, then up a third)
- 9.6: teleport-out rising vwoop

## Notes/Discoveries
- Top-level `let` in a classic script does NOT become a window property;
  probing `window.endermanAudioCtx` from tests is useless — instrument
  the AudioContext constructor instead.
- Demo video audio was produced by running `scheduleEndermanSounds` in an
  OfflineAudioContext in-page, encoding WAV in JS, then muxing with
  ffmpeg using the recorded hover timestamp as offset.
