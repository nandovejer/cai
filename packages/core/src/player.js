/**
 * CAI Design System — Media players
 * Video & audio (native HTMLMediaElement API) and MIDI (midi.js, loaded
 * lazily) sharing the same UI: seekbar, volume, keyboard shortcuts.
 *
 * Importing this module has no side effects; call initPlayers() to mount
 * every .cai-player on the page, or mountPlayer()/mountMidiPlayer()
 * for a single one.
 */

import { formatTime } from "./utils.js";

/**
 * Seekbar drag logic — shared by seek and volume bars.
 * @param {HTMLElement} bar   - .cai-player-seekbar element
 * @param {Function}    onSeek - called with value 0-1 during drag and on click
 */
export function initSeekbar(bar, onSeek) {
  let dragging = false;

  function valueFromEvent(e) {
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  bar.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    onSeek(valueFromEvent(e));
  });

  bar.addEventListener(
    "touchstart",
    (e) => {
      dragging = true;
      onSeek(valueFromEvent(e));
    },
    { passive: true },
  );

  document.addEventListener("mousemove", (e) => {
    if (dragging) onSeek(valueFromEvent(e));
  });

  document.addEventListener(
    "touchmove",
    (e) => {
      if (dragging) onSeek(valueFromEvent(e));
    },
    { passive: true },
  );

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
  document.addEventListener("touchend", () => {
    dragging = false;
  });

  // Keyboard: left/right arrows ±5%, Home/End
  bar.addEventListener("keydown", (e) => {
    const fill = bar.querySelector(".cai-player-seekbar-fill");
    const current = parseFloat(fill?.style.width || "0") / 100;
    const step = 0.05;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onSeek(Math.min(1, current + step));
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onSeek(Math.max(0, current - step));
    }
    if (e.key === "Home") {
      e.preventDefault();
      onSeek(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      onSeek(1);
    }
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
  const seekFill = seekbar?.querySelector(".cai-player-seekbar-fill");
  const seekThumb = seekbar?.querySelector(".cai-player-seekbar-thumb");
  const volbar = controls.querySelector(".cai-player-volbar");
  const volFill = volbar?.querySelector(".cai-player-seekbar-fill");
  const volThumb = volbar?.querySelector(".cai-player-seekbar-thumb");
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
    const pct = (mediaLike.currentTime / mediaLike.duration) * 100;
    if (seekFill) seekFill.style.width = pct + "%";
    if (seekThumb) seekThumb.style.left = pct + "%";
    if (seekbar) seekbar.setAttribute("aria-valuenow", Math.round(pct));
    if (currentEl) currentEl.textContent = formatTime(mediaLike.currentTime);
  }

  function updateVolumeUI(v) {
    if (volFill) volFill.style.width = v * 100 + "%";
    if (volThumb) volThumb.style.left = v * 100 + "%";
    if (volbar) volbar.setAttribute("aria-valuenow", Math.round(v * 100));
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
    if (seekFill) seekFill.style.width = "0%";
    if (seekThumb) seekThumb.style.left = "0%";
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
  const seekBuf = controls?.querySelector(
    ".cai-player-progress-row .cai-player-seekbar .cai-player-seekbar-buf",
  );
  const pipBtn = root.querySelector(".cai-player-pip");
  const fsBtn = root.querySelector(".cai-player-fullscreen");

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
    if (!media.duration || !seekBuf) return;
    try {
      const buf = media.buffered;
      if (buf.length > 0) {
        seekBuf.style.width =
          (buf.end(buf.length - 1) / media.duration) * 100 + "%";
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
  document.querySelectorAll(".cai-player").forEach((root) => {
    if (root.dataset.type === "midi") {
      mountMidiPlayer(root);
    } else {
      mountPlayer(root);
    }
  });
}
