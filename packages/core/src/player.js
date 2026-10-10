/**
 * CAI Design System — Media players
 * Video & audio (native HTMLMediaElement API, captions from <track>) and MIDI (midi.js, loaded
 * lazily) sharing the same UI: seekbar, volume, keyboard shortcuts.
 *
 * Importing this module has no side effects; call initPlayers() to mount
 * every .cai-player on the page, or mountPlayer()/mountMidiPlayer()
 * for a single one.
 */

/* global Option */
import { enableJs, formatTime } from "./utils.js";
import { t } from "./i18n.js";

// Players already mounted: mounting twice would bind every control twice
// (one click would play, then pause). Same guard as modal.js and theme.js.
const mounted = new WeakSet();

/** Share (0-1) a range input currently stands at. */
function rangeShare(bar) {
  const max = Number(bar.max) || 1;
  return Math.max(0, Math.min(1, Number(bar.value) / max));
}

/** Put a range input at `share` (0-1) and mirror it in --cai-seek. */
function setRange(bar, share, valueText) {
  const clamped = Math.max(0, Math.min(1, share));
  bar.value = String(clamped * (Number(bar.max) || 1));
  // The value the browser kept (it snaps to the step): fill and thumb agree
  bar.style.setProperty("--cai-seek", rangeShare(bar) * 100 + "%");
  if (valueText) bar.setAttribute("aria-valuetext", valueText);
}

/**
 * Seek and volume bars are native <input type="range" class="cai-player-seekbar">.
 * Pointer, touch and keyboard handling belong to the browser; this only
 * reports the new position as a share from 0 to 1.
 * @param {HTMLInputElement} bar
 * @param {Function}         onSeek - called with 0-1 whenever the user moves it
 */
export function initSeekbar(bar, onSeek) {
  bar.addEventListener("input", () => {
    bar.style.setProperty("--cai-seek", rangeShare(bar) * 100 + "%");
    onSeek(rangeShare(bar));
  });
}

/**
 * Wraps an HTMLMediaElement to match the MidiPlayer event API.
 * @param {HTMLMediaElement} el
 * @returns {{ on: Function, paused: boolean, duration: number,
 *             currentTime: number, volume: number, muted: boolean,
 *             play: Function, pause: Function }}
 */
export function wrapHTMLMedia(el) {
  return {
    get paused() {
      return el.paused;
    },
    get duration() {
      return el.duration;
    },
    get currentTime() {
      return el.currentTime;
    },
    set currentTime(v) {
      el.currentTime = v;
    },
    get volume() {
      return el.volume;
    },
    get muted() {
      return el.muted;
    },
    play() {
      return el.play();
    },
    pause() {
      el.pause();
    },
    setMute(v) {
      el.muted = v;
    },
    setVolume(v) {
      el.volume = v;
    },
    seek(v) {
      if (el.duration) el.currentTime = v * el.duration;
    },
    on(event, cb) {
      el.addEventListener(event, cb);
    },
  };
}

/**
 * Binds shared player UI controls to a media-like object.
 * Handles: play/pause, mute, seek, volume, keyboard shortcuts.
 * Video-only controls (PiP, fullscreen, captions, mediaWrap click) are handled
 * separately in mountPlayer since MidiPlayer has no video element.
 *
 * @param {HTMLElement} root         - .cai-player element
 * @param {HTMLElement} controls     - .cai-player-controls element
 * @param {object}      mediaLike    - wrapHTMLMedia() or MidiPlayer instance
 */
export function bindPlayerUI(root, controls, mediaLike) {
  const playPauseBtn = root.querySelector(".cai-player-playpause");
  const muteBtn = root.querySelector(".cai-player-mute");
  const seekbar = controls.querySelector(
    ".cai-player-progress-row .cai-player-seekbar",
  );
  const volbar = controls.querySelector(".cai-player-volbar");
  const currentEl = controls.querySelector(".cai-player-current");
  const durationEl = controls.querySelector(".cai-player-duration");

  // ---- UI helpers ----

  function setPlayState(playing) {
    const iconPlay = playPauseBtn?.querySelector(".icon-play");
    const iconPause = playPauseBtn?.querySelector(".icon-pause");
    if (iconPlay) iconPlay.style.display = playing ? "none" : "";
    if (iconPause) iconPause.style.display = playing ? "" : "none";
    playPauseBtn?.setAttribute("aria-label", t(playing ? "pause" : "play", root));
  }

  function setMuteState(muted) {
    const on = muteBtn?.querySelector(".icon-vol-on");
    const off = muteBtn?.querySelector(".icon-vol-off");
    if (on) on.style.display = muted ? "none" : "";
    if (off) off.style.display = muted ? "" : "none";
    muteBtn?.setAttribute("aria-label", t(muted ? "unmute" : "mute", root));
  }

  function updateSeekUI(time = mediaLike.currentTime) {
    if (!mediaLike.duration) return;
    if (seekbar) {
      setRange(
        seekbar,
        time / mediaLike.duration,
        t("timeOf", root, {
          current: formatTime(time),
          total: formatTime(mediaLike.duration),
        }),
      );
    }
    if (currentEl) currentEl.textContent = formatTime(time);
  }

  function updateDuration() {
    // One step a second: an arrow key moves the seek bar by one second,
    // whatever the length (a fixed max made it 0.1 % of it)
    if (seekbar && isFinite(mediaLike.duration)) {
      seekbar.max = Math.ceil(mediaLike.duration);
    }
    if (durationEl) durationEl.textContent = formatTime(mediaLike.duration);
    updateSeekUI();
  }

  function updateVolumeUI(v) {
    if (volbar) setRange(volbar, v, `${Math.round(v * 100)}%`);
  }

  // ---- Wire media events to UI ----

  mediaLike.on("loadedmetadata", updateDuration);
  mediaLike.on("timeupdate", () => updateSeekUI());
  mediaLike.on("play", () => setPlayState(true));
  mediaLike.on("pause", () => setPlayState(false));
  mediaLike.on("ended", () => {
    setPlayState(false);
    // Back to the start, value text included (the media may still be at its end)
    updateSeekUI(0);
  });
  mediaLike.on("volumechange", () => {
    setMuteState(mediaLike.muted);
    updateVolumeUI(mediaLike.muted ? 0 : mediaLike.volume);
  });

  // ---- Wire controls to media ----

  playPauseBtn?.addEventListener("click", () => {
    mediaLike.paused ? mediaLike.play() : mediaLike.pause();
  });

  muteBtn?.addEventListener("click", () => {
    mediaLike.setMute(!mediaLike.muted);
  });

  if (seekbar) {
    initSeekbar(seekbar, (v) => {
      mediaLike.seek(v);
      updateSeekUI();
    });
  }

  if (volbar) {
    initSeekbar(volbar, (v) => {
      mediaLike.setVolume(v);
      mediaLike.setMute(v === 0);
      updateVolumeUI(v);
    });
  }

  // Keyboard shortcuts: only when the player itself has focus (after a click
  // on it), never from one of its controls (WCAG 2.1.4, active only on focus)
  root.setAttribute("tabindex", "-1");
  root.addEventListener("keydown", (e) => {
    if (e.target !== root || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === " " || e.key === "k") {
      // eslint-disable-next-line no-restricted-syntax -- RL-3: Space plays or pauses the focused player, as native media controls do, instead of scrolling the page
      e.preventDefault();
      mediaLike.paused ? mediaLike.play() : mediaLike.pause();
    }
    if (e.key === "m") mediaLike.setMute(!mediaLike.muted);
  });

  // ---- Init state: from the media, which may be muted or already loaded ----
  setPlayState(!mediaLike.paused);
  setMuteState(mediaLike.muted);
  updateVolumeUI(mediaLike.muted ? 0 : mediaLike.volume);
  if (mediaLike.duration) updateDuration();

  return {
    setPlayState,
    setMuteState,
    updateSeekUI,
    updateVolumeUI,
    durationEl,
  };
}

/**
 * Mount a single media player (video or audio).
 * @param {HTMLElement} root - .cai-player element
 */
export function mountPlayer(root) {
  if (mounted.has(root)) return;
  const isVideo = root.dataset.type === "video";
  const media = root.querySelector(
    isVideo ? ".cai-player-video" : ".cai-player-audio",
  );
  if (!media) return;
  mounted.add(root);
  // The CAI controls show only under data-cai-js: mounting one player
  // without initPlayers() must not leave it with no controls at all
  enableJs();

  const controls = root.querySelector(".cai-player-controls");
  const mediaWrap = root.querySelector(".cai-player-media-wrap"); // video only
  const seekbar = controls?.querySelector(
    ".cai-player-progress-row .cai-player-seekbar",
  );
  const pipBtn = root.querySelector(".cai-player-pip");
  const fsBtn = root.querySelector(".cai-player-fullscreen");

  // The native controls were the no-JavaScript interface; the custom UI
  // replaces them now that it is about to be bound.
  media.controls = false;
  media.removeAttribute("controls");

  const wrapped = wrapHTMLMedia(media);

  // Bind shared UI (play/pause, mute, seek, volume, keyboard)
  const { setPlayState } = bindPlayerUI(root, controls, wrapped);

  // ---- Video-specific: mediaWrap class sync ----
  if (mediaWrap) {
    mediaWrap.classList.add("is-paused");
    media.addEventListener("play", () =>
      mediaWrap.classList.remove("is-paused"),
    );
    media.addEventListener("pause", () => mediaWrap.classList.add("is-paused"));
  }

  // ---- Video-specific: buffer progress ----
  function updateBuffer() {
    if (!media.duration || !seekbar) return;
    try {
      const buf = media.buffered;
      if (buf.length > 0) {
        seekbar.style.setProperty(
          "--cai-buf",
          (buf.end(buf.length - 1) / media.duration) * 100 + "%",
        );
      }
    } catch (_) {}
  }
  media.addEventListener("timeupdate", updateBuffer);
  media.addEventListener("progress", updateBuffer);

  // ---- Bug 1.10 fix: ended — deterministic order ----
  media.addEventListener("ended", () => {
    media.currentTime = 0; // first: reposition
    setPlayState(false); // then: update UI
  });

  // ---- Video-specific: click on video area toggles play/pause ----
  if (mediaWrap) {
    mediaWrap.addEventListener("click", (e) => {
      if (
        e.target === mediaWrap ||
        e.target === media ||
        e.target.classList.contains("cai-player-overlay")
      ) {
        media.paused ? media.play() : media.pause();
      }
    });
  }

  // ---- PiP (video only) ----
  if (pipBtn) {
    if (!document.pictureInPictureEnabled) {
      pipBtn.hidden = true;
    } else {
      pipBtn.addEventListener("click", async () => {
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await media.requestPictureInPicture();
          }
        } catch (err) {
          console.warn("PiP not available:", err);
        }
      });
    }
  }

  // ---- Captions and subtitles: the TextTracks of the <track> elements ----
  // A track's mode is the state and the browser draws the cues. The button
  // turns them on (the default track, else the first) or off; the select
  // picks one track or none.
  const ccBtn = root.querySelector(".cai-player-captions");
  const ccMenu = root.querySelector(".cai-player-tracks");
  const tracks = [...(media.textTracks || [])].filter((tk) =>
    /^(captions|subtitles)$/.test(tk.kind),
  );
  const showing = () => tracks.find((tk) => tk.mode === "showing");
  const show = (track) =>
    tracks.forEach((tk) => {
      if (tk === track) tk.mode = "showing";
      else if (tk.mode === "showing") tk.mode = "disabled";
    });
  const sync = () => {
    ccBtn?.setAttribute("aria-pressed", !!showing());
    if (ccMenu) ccMenu.value = tracks.indexOf(showing());
  };
  for (const el of [ccBtn, ccMenu]) {
    if (!el) continue;
    el.hidden = !tracks.length;
    // A name written in the HTML wins (the README's promise)
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", t("captions", root));
  }
  ccBtn?.addEventListener("click", () => {
    const def = root.querySelector("track[default]")?.track;
    show(showing() ? null : tracks.includes(def) ? def : tracks[0]);
  });
  if (ccMenu) {
    ccMenu.replaceChildren(
      new Option(t("captionsOff", root), -1),
      ...tracks.map((tk, i) => {
        const option = new Option(tk.label || tk.language, i);
        if (tk.language) option.lang = tk.language;
        return option;
      }),
    );
    ccMenu.addEventListener("change", () => show(tracks[ccMenu.value]));
  }
  media.textTracks?.addEventListener("change", sync);
  sync();

  // Shortcuts when the player itself has focus, not one of its controls
  root.addEventListener("keydown", (e) => {
    if (e.target !== root || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "c") ccBtn?.click();
    if (e.key === "f") fsBtn?.click();
  });

  // ---- Fullscreen (video only) ----
  if (fsBtn) {
    const iconExpand = fsBtn.querySelector(".icon-expand");
    const iconCompress = fsBtn.querySelector(".icon-compress");

    // Hidden where the player cannot go full screen (an iPhone, an iframe
    // without allowfullscreen), as the picture-in-picture button is
    fsBtn.hidden = !document.fullscreenEnabled;
    fsBtn.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) {
          await root.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen not available:", err);
      }
    });

    document.addEventListener("fullscreenchange", () => {
      const isFs = !!document.fullscreenElement;
      if (iconExpand) iconExpand.style.display = isFs ? "none" : "";
      if (iconCompress) iconCompress.style.display = isFs ? "" : "none";
      fsBtn.setAttribute(
        "aria-label",
        t(isFs ? "exitFullscreen" : "fullscreen", root),
      );
    });
  }
}

/**
 * Mount a MIDI player. Uses MidiPlayer (midi.js, imported lazily) but
 * drives the exact same UI as the audio player — same CSS classes,
 * same seekbar, same controls.
 * @param {HTMLElement} root - .cai-player[data-type="midi"] element
 */
export async function mountMidiPlayer(root) {
  const src = root.dataset.src;
  if (mounted.has(root)) return;
  if (!src) {
    console.warn(
      '[CAI] .cai-player[data-type="midi"] missing data-src attribute',
    );
    return;
  }
  mounted.add(root);

  const controls = root.querySelector(".cai-player-controls");
  const playPauseBtn = root.querySelector(".cai-player-playpause");
  const statusEl = root.querySelector(".cai-player-midi-status");

  // Loading state
  if (statusEl) {
    statusEl.textContent = t("loading", root);
    statusEl.setAttribute("aria-live", "polite"); // Bug 1.11: screen reader support
  }
  if (playPauseBtn) playPauseBtn.disabled = true;
  enableJs();

  let player;
  try {
    // The chunk itself can fail to load: same message as a bad file
    const { MidiPlayer } = await import("./midi.js");
    player = await MidiPlayer.load(src);
  } catch (err) {
    if (statusEl) statusEl.textContent = t("midiError", root);
    console.error("[CAI] MIDI load error:", err);
    return;
  }

  if (statusEl) statusEl.textContent = "";
  if (playPauseBtn) playPauseBtn.disabled = false;

  // Bind shared UI (play/pause, mute, seek, volume, keyboard). The file is
  // loaded already: bindPlayerUI() reads its duration on the spot.
  bindPlayerUI(root, controls, player);
}

/**
 * Mount every .cai-player in `root` (video, audio, and MIDI). Idempotent:
 * a player already mounted is left as it is.
 * @param {ParentNode} [root=document]
 */
export function initPlayers(root = document) {
  enableJs();
  root.querySelectorAll(".cai-player").forEach((player) => {
    if (player.dataset.type === "midi") {
      mountMidiPlayer(player);
    } else {
      mountPlayer(player);
    }
  });
}
