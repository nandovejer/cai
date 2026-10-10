---
"@cai-ds/core": minor
---

The video player offers captions and subtitles from the `<track>` elements of its `<video>`, with the browser's own TextTrack API.

**Added (`@cai-ds/core`)**

- `.cai-player-captions`: a `cai-player-btn` with `aria-pressed` that turns captions on (the track with `default`, else the first `captions` or `subtitles` track) and off. Its name, "Captions", comes from the dictionary.
- `.cai-player-tracks`: a `<select class="cai-input cai-player-tracks">` for a video with several tracks. `mountPlayer()` fills it with "Off" and one option per track (its `label`, in the track's language through `lang`).
- The state is the track's `mode`: a choice made in the browser's own menu, or a `default` track shown on load, shows in the CAI controls. Nothing is stored. A control with no track to show is hidden.
- C turns captions on or off when the player itself has focus, as K, M and F do.
- `::cue` on `.cai-player-video`: `--cai-text-on-fill` on `--cai-surface-media`, 21:1 in every mode. The reader's own caption settings still win.
- New strings `captions` and `captionsOff` in `@cai-ds/core/i18n` (English and Spanish); override them with `data-cai-label-captions` and `data-cai-label-captions-off`.
- `.cai-player-btns` wraps, so a narrow player puts the last controls on a second line instead of squeezing the volume slider.

**Changed (`@cai-ds/core`)**

- The player's key shortcuts (Space, K, M, F, C) do nothing while Ctrl, Alt or Cmd is held, so Ctrl+K, Ctrl+F and Ctrl+C keep their meaning. F, like C, now works only when the player itself has focus, as the docs already said, not from one of its controls.

Without JavaScript nothing changes: the native controls stay, and they offer the tracks.
