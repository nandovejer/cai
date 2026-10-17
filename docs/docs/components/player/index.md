# Player

Plays a video, a sound or a MIDI file in the page, with the same controls for all three.

### Known issues
Captions, transcripts and audio description depend on the media you provide. The colours of the captions are a request: the reader's own caption settings win, and a browser may draw them its own way, in its own full-screen player for example.

A MIDI file has no player without JavaScript: offer a download link in the fallback text.

### Copy the markup
An audio player. The video player adds a `.luz-player-media-wrap` around the `<video>` and a mute button and volume slider: copy it from the example above.

Audio player markup
```html
<div class="luz-player" data-type="audio" role="group" aria-label="Episode 12 player">
  <audio class="luz-player-audio" preload="none" controls>
    <source src="episode-12.mp3" type="audio/mpeg">
  </audio>
  <div class="luz-player-controls luz-player-controls--audio">
    <button class="luz-player-btn luz-player-playpause" type="button" aria-label="Play">
      <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6,3 20,12 6,21"/></svg>
      <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:none"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>
    </button>
    <div class="luz-player-progress-row luz-player-progress-row--audio">
      <span class="luz-player-time luz-player-current">0:00</span>
      <input class="luz-player-seekbar" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek audio">
      <span class="luz-player-time luz-player-duration">0:00</span>
    </div>
  </div>
</div>
```

Captions and subtitles: one `<track>` per file inside the `<video>`, and one control in `.luz-player-btns`. Use the button for one track and the select for several; the script fills the select.

Captions markup
```html
<video class="luz-player-video" preload="metadata" controls playsinline>
  <source src="interview.mp4" type="video/mp4">
  <track kind="captions" srclang="en" label="English" src="interview-en.vtt" default>
  <track kind="subtitles" srclang="es" label="Español" src="interview-es.vtt">
</video>

<!-- One track: a button that turns it on and off -->
<button class="luz-player-btn luz-player-captions" type="button" aria-pressed="false" aria-label="Captions">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 11h12M6 15h7"/></svg>
</button>

<!-- Several tracks: a select, filled by the script -->
<select class="luz-input luz-player-tracks" aria-label="Captions"></select>
```

Player script code
```js
import { initPlayers } from "@luz-ds/core/player";
initPlayers();
```

### Variants and options
- `data-type="video"`: A `<video class="luz-player-video">`; a click on the picture plays or pauses
- `data-type="audio"`: An `<audio class="luz-player-audio">` with a compact control row (`.luz-player-controls--audio`)
- `data-type="midi"` and `data-src`: A MIDI file, played with Web Audio by `midi.js`, loaded only when needed
- `.luz-player-mute`, `.luz-player-volbar`: A mute button and a volume slider
- `.luz-player-fullscreen`, `.luz-player-pip`: Optional full-screen and picture-in-picture buttons for video
- `<track kind="captions">`, `kind="subtitles"`: A WebVTT file with `srclang` and `label`; `default` shows it from the start
- `.luz-player-captions`: A button that turns captions on and off: the default track, else the first
- `.luz-player-tracks`: A select, with `.luz-input`, to pick one track or none
- `.luz-player-fallback`: Text shown only when the script does not run

### How it works
The native media element plays the file; `player.js` drives the LUZ controls, styled by `components/player.css`.

- `initPlayers()` mounts every `.luz-player` on the page, or inside the element you pass it. `luz.js` runs it. A player already mounted is left as it is, so running it again is safe.
- On mount, the script removes the native `controls` and binds the LUZ ones: play and pause, time, seek and volume. They start from the media's own state: a `muted` video shows as muted, and a length the browser already knows shows at once.
- Seek and volume are native `<input type="range">` sliders. Once the length is known, the seek slider has one step per second, whatever its `max` in the markup.
- A full-screen or picture-in-picture button is hidden where the browser cannot do it.
- Captions and subtitles are the browser's: each `<track>` is a text track, and the browser draws its cues. The LUZ controls only set which track shows, so a choice made in the browser's own menu shows in them too. `::cue` gives the cues light text on the media surface. Nothing is stored. A control with no track to show is hidden.
- `mountPlayer(root)` and `mountMidiPlayer(root)` mount one player.
- The player is a size-query container: below 480 px of its own width the audio controls stack and the volume bar is hidden, wherever the player is placed. A parent that sizes it to its content (an inline-flex item, a float) needs a width of its own.
- In right-to-left text the timeline follows the reading direction: the seek bar starts at the right and fills towards the left, the controls row mirrors, and the slider's keys are the browser's own. The play, pause and volume icons are not mirrored: they do not point anywhere.

### Without JavaScript
Audio and video show the browser's own controls, and the LUZ controls stay hidden. The browser's controls offer the captions and subtitles, and a track with `default` shows from the start.

A MIDI player shows its fallback text instead.

### Keyboard and ARIA
Tab moves through the controls; each one keeps its native keys.

- Buttons: Enter or Space. Their names change with the state: "Play" or "Pause", "Mute" or "Unmute". The captions button keeps its name, "Captions", and says whether it is pressed (`aria-pressed`).
- Track select: the browser's own keys; each option is in the language of its track.
- Sliders: arrow keys, Home, End, Page Up and Page Down. An arrow key moves the seek slider one second, and the volume slider one step (5 % in the example). The seek slider says the time as text.
- When the player itself has focus, not one of its controls (after a click on the video, for example): Space or K plays and pauses, and M mutes. F goes full screen and C turns captions on or off when the player has those buttons. With Ctrl, Alt or Cmd held, these keys do nothing.
- The player is a `role="group"` named by its `aria-label`.

### When to use
Use a player to play a video, a sound or a MIDI file inside the page, when the reader starts it.

### When not to use
Do not use a player for media that starts on its own or plays in the background.

- Never autoplay.
- For a short animated illustration with no sound, use an image or a [figure](https://nandovejer.github.io/luz/docs/components/figure/).
