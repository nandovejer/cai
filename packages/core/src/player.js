/**
 * CAI Design System — Media players
 * Video & audio (native HTMLMediaElement API) and MIDI (midi.js, loaded
 * lazily) sharing the same UI: seekbar, volume, keyboard shortcuts.
 *
 * Importing this module has no side effects; call initPlayers() to mount
 * every .cai-player on the page, or mountPlayer()/mountMidiPlayer()
 * for a single one.
 */

import { enableJs, formatTime } from "./utils.js";

/** Share (0-1) a range input currently stands at. */
function rangeShare(bar) {
  const max = Number(bar.max) || 1;
  return Math.max(0, Math.min(1, Number(bar.value) / max));
}

/** Put a range input at `share` (0-1) and mirror it in --cai-seek. */
function setRange(bar, share, valueText) {
  const clamped = Math.max(0, Math.min(1, share));
  bar.value = String(clamped * (Number(bar.max) || 1));
  bar.style.setProperty("--cai-seek", clamped * 100 + "%");
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
 * Video-only controls (PiP, fullscreen, mediaWrap click) are handled
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
    playPauseBtn?.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function setMuteState(muted) {
    const on = muteBtn?.querySelector(".icon-vol-on");
    const off = muteBtn?.querySelector(".icon-vol-off");
    if (on) on.style.display = muted ? "none" : "";
    if (off) off.style.display = muted ? "" : "none";
    muteBtn?.setAttribute("aria-label", muted ? "Unmute" : "Mute");
  }

  function updateSeekUI() {
    if (!mediaLike.duration) return;
    const share = mediaLike.currentTime / mediaLike.duration;
    if (seekbar) {
      setRange(
        seekbar,
        share,
        `${formatTime(mediaLike.currentTime)} of ${formatTime(mediaLike.duration)}`,
      );
    }
    if (currentEl) currentEl.textContent = formatTime(mediaLike.currentTime);
  }

  function updateVolumeUI(v) {
    if (volbar) setRange(volbar, v, `${Math.round(v * 100)}%`);
  }

  // ---- Wire media events to UI ----

  mediaLike.on("loadedmetadata", () => {
    if (durationEl) durationEl.textContent = formatTime(mediaLike.duration);
  });

  mediaLike.on("timeupdate", updateSeekUI);
  mediaLike.on("play", () => setPlayState(true));
  mediaLike.on("pause", () => setPlayState(false));
  mediaLike.on("ended", () => {
    setPlayState(false);
    if (seekbar) setRange(seekbar, 0, "");
    if (currentEl) currentEl.textContent = "0:00";
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

  // Keyboard shortcuts
  root.setAttribute("tabindex", "-1");
  root.addEventListener("keydown", (e) => {
    if (["INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(e.target.tagName))
      return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      mediaLike.paused ? mediaLike.play() : mediaLike.pause();
    }
    if (e.key === "m") mediaLike.setMute(!mediaLike.muted);
  });

  // ---- Init state ----
  setPlayState(false);
  setMuteState(false);
  updateVolumeUI(1);

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
  const isVideo = root.dataset.type === "video";
  const media = root.querySelector(
    isVideo ? ".cai-player-video" : ".cai-player-audio",
  );
  if (!media) return;

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
      pipBtn.style.display = "none";
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

  // ---- Fullscreen (video only) ----
  if (fsBtn) {
    const iconExpand = fsBtn.querySelector(".icon-expand");
    const iconCompress = fsBtn.querySelector(".icon-compress");

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
      fsBtn.setAttribute("aria-label", isFs ? "Exit fullscreen" : "Fullscreen");
    });

    // f = fullscreen shortcut (video-specific)
    root.addEventListener("keydown", (e) => {
      if (e.key === "f") fsBtn.click();
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
  if (!src) {
    console.warn(
      '[CAI] .cai-player[data-type="midi"] missing data-src attribute',
    );
    return;
  }

  const controls = root.querySelector(".cai-player-controls");
  const playPauseBtn = root.querySelector(".cai-player-playpause");
  const statusEl = root.querySelector(".cai-player-midi-status");

  // Loading state
  if (statusEl) {
    statusEl.textContent = "Loading…";
    statusEl.setAttribute("aria-live", "polite"); // Bug 1.11: screen reader support
  }
  if (playPauseBtn) playPauseBtn.disabled = true;

  const { MidiPlayer } = await import("./midi.js");

  let player;
  try {
    player = await MidiPlayer.load(src);
  } catch (err) {
    if (statusEl) statusEl.textContent = "Failed to load MIDI file.";
    console.error("[CAI] MIDI load error:", err);
    return;
  }

  if (statusEl) statusEl.textContent = "";
  if (playPauseBtn) playPauseBtn.disabled = false;

  // Bind shared UI (play/pause, mute, seek, volume, keyboard)
  const { durationEl } = bindPlayerUI(root, controls, player);

  // Bug 1.9 fix: loadedmetadata fires before listeners register because
  // MidiPlayer.load() resolves after emitting the event synchronously.
  // Seed the duration display directly after load resolves.
  if (durationEl && player.duration) {
    durationEl.textContent = formatTime(player.duration);
  }
}

/**
 * Mount every .cai-player on the page (video, audio, and MIDI).
 */
export function initPlayers() {
  enableJs();
  document.querySelectorAll(".cai-player").forEach((root) => {
    if (root.dataset.type === "midi") {
      mountMidiPlayer(root);
    } else {
      mountPlayer(root);
    }
  });
}
