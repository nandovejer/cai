---
"@cai-ds/core": patch
---

Player review: the controls start from the media's real state, the seek bar moves by seconds, and the MIDI player no longer leaks notes.

**Fixed (`@cai-ds/core`, `player.js`)**

- The controls start from the media: a `muted` video shows "Unmute" and an empty volume slider, and a length the browser already knew before the script ran shows at once (it stayed at 0:00). The docs site's workaround for this is gone.
- Once the length is known, the seek slider has one step per second (`max` becomes the length in whole seconds). With the fixed `max="1000"`, an arrow key moved 0.1 % of the length: 20 ms on a 20-second clip, so the time read out did not change.
- The seek slider's value text says the time from the start (`0:00 of 1:23`) as soon as the length is known, and again when the media ends; it was missing until playback, and the MIDI player kept the end time after it stopped.
- Mounting is idempotent: `initPlayers()`, `mountPlayer()` and `mountMidiPlayer()` leave a player already mounted as it is. Running `initPlayers()` after `cai.js` had run it bound every control twice, so one click on play played and paused at once. `initPlayers(root)` now takes an optional root, like `initModals()` and `initSidebar()`.
- `mountPlayer()` and `mountMidiPlayer()` set `data-cai-js` themselves. Mounting one player without `initPlayers()` removed the native controls and kept the CAI ones hidden: the player had no controls at all.
- Space, K and M work only when the player itself has focus, as C and F do and as the docs say, not from a link or other element inside it.
- The full-screen button is hidden where the browser cannot go full screen (`document.fullscreenEnabled`, false on an iPhone or in an iframe without `allowfullscreen`), and the picture-in-picture button now uses `hidden`, like the captions controls.
- If the `midi.js` chunk itself fails to load, the player shows the error message instead of "Loading…" for ever.
- A captions control keeps an `aria-label` written in the HTML; the dictionary names only a control that has none.

**Fixed (`@cai-ds/core`, `midi.js`)**

- Pause and seek silence the notes already scheduled ahead of the playhead; dragging the seek slider stacked them.
- After the tab was hidden, the notes missed meanwhile are dropped instead of all playing at once.
- A note with no note-off stops at the end of the track instead of sounding for ever.
- The same note on two channels is two notes: one channel's note-off no longer cuts the other.
- Notes at the same time sort with a consistent comparator (note-offs first).

**Fixed (`@cai-ds/core`, `components/player.css`)**

- Full screen: the picture fills the height the controls leave, instead of keeping its 360 px cap.
- Forced colours in a right-to-left page: the seek bar fills from the right in system colours (the RTL rule overrode the forced-colours one). One custom property, `--cai-seek-to`, now carries the direction.
- The buttons' focus ring sits 2 px outside, as on every other CAI control (it was 1 px).
- Logical properties (`inline-size`, `block-size`, `border-block-start`) instead of physical ones.

**Changed (`@cai-ds/core`, strings)**

- `fullscreen` and `exitFullscreen` read "Enter full screen" and "Exit full screen" (Spanish "Ver a pantalla completa"); `midiError` says what to do: "Could not load the MIDI file. Reload the page to try again." Override them with `data-cai-label-*` as before.

The docs example's volume slider is `max="100" step="5"`: an arrow key moves the volume 5 %.
