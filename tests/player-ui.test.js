/**
 * CAI — the shared controls of the players (bindPlayerUI in
 * packages/core/src/player.js), on a stand-in media object: the state comes
 * from the media, whatever it was before the script ran.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bindPlayerUI } from "../packages/core/src/player.js";

class FakeElement {
  constructor() {
    this.attributes = {};
    this.style = { display: "", props: {}, setProperty(k, v) { this.props[k] = v; } };
    this.textContent = "";
    this.parts = {};
    this.max = "1000";
    this.value = "0";
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  querySelector(selector) {
    return this.parts[selector] ?? null;
  }
  closest() {
    return null;
  }
  addEventListener() {}
}

/** A media-like object: wrapHTMLMedia() or MidiPlayer have the same shape. */
function media(state) {
  const listeners = {};
  return {
    paused: true,
    muted: false,
    volume: 1,
    duration: NaN,
    currentTime: 0,
    ...state,
    on(event, fn) {
      (listeners[event] ??= []).push(fn);
    },
    emit(event) {
      (listeners[event] || []).forEach((fn) => fn(new Event(event)));
    },
  };
}

function mount(state) {
  const root = new FakeElement();
  const controls = new FakeElement();
  const muteBtn = new FakeElement();
  const parts = {
    seekbar: new FakeElement(),
    volbar: new FakeElement(),
    current: new FakeElement(),
    duration: new FakeElement(),
  };
  root.parts = { ".cai-player-mute": muteBtn };
  controls.parts = {
    ".cai-player-progress-row .cai-player-seekbar": parts.seekbar,
    ".cai-player-volbar": parts.volbar,
    ".cai-player-current": parts.current,
    ".cai-player-duration": parts.duration,
  };
  const m = media(state);
  bindPlayerUI(root, controls, m);
  return { m, muteBtn, ...parts };
}

let saved;
beforeEach(() => {
  saved = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { documentElement: { lang: "en" } },
  });
});
afterEach(() => {
  if (saved) Object.defineProperty(globalThis, "document", saved);
  else delete globalThis.document;
});

describe("player controls — initial state", () => {
  it("shows a muted media as muted, with the volume slider at zero", () => {
    const { muteBtn, volbar } = mount({ muted: true });
    expect(muteBtn.getAttribute("aria-label")).toBe("Unmute");
    expect(volbar.value).toBe("0");
  });

  it("reads a duration the media already has (metadata loaded before the script)", () => {
    const { duration, seekbar } = mount({ duration: 83 });
    expect(duration.textContent).toBe("1:23");
    expect(seekbar.getAttribute("aria-valuetext")).toBe("0:00 of 1:23");
    // One step a second: an arrow key moves one second, whatever the length
    expect(seekbar.max).toBe(83);
  });

  it("names the seek slider's value in time as soon as the metadata arrives", () => {
    const { m, seekbar } = mount();
    expect(seekbar.getAttribute("aria-valuetext")).toBeNull();
    m.duration = 83;
    m.emit("loadedmetadata");
    expect(seekbar.getAttribute("aria-valuetext")).toBe("0:00 of 1:23");
  });
});

describe("player controls — the end", () => {
  it("goes back to the start, value text included, while the media still stands at its end", () => {
    const { m, seekbar, current } = mount({ duration: 83 });
    m.currentTime = 83;
    m.emit("timeupdate");
    expect(seekbar.getAttribute("aria-valuetext")).toBe("1:23 of 1:23");
    m.emit("ended");
    expect(seekbar.value).toBe("0");
    expect(seekbar.getAttribute("aria-valuetext")).toBe("0:00 of 1:23");
    expect(current.textContent).toBe("0:00");
  });
});
