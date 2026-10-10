/**
 * CAI — captions and subtitles of the video player (packages/core/src/player.js).
 *
 * The state is the TextTrack's mode, never a variable: the button and the
 * select only set it and mirror it. Node has no DOM, but it has EventTarget;
 * the elements around it are the smallest stand-ins mountPlayer() reads. The
 * real TextTrack API is exercised in the browsers by tests/player.spec.js.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
/* global EventTarget */
import { mountPlayer } from "../packages/core/src/player.js";

class FakeElement extends EventTarget {
  constructor(tagName = "DIV", lang = "") {
    super();
    this.tagName = tagName;
    this.lang = lang;
    this.attributes = {};
    this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {}, contains: () => false };
    this.dataset = {};
    this.hidden = false;
    this.parts = {};
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  querySelector(selector) {
    return this.parts[selector] ?? null;
  }
  closest(selector) {
    return selector === "[lang]" && this.lang ? this : null;
  }
  click() {
    this.dispatchEvent(new Event("click"));
  }
}

/** A <select>: replaceChildren() takes the options, value picks one or none. */
class FakeSelect extends FakeElement {
  constructor() {
    super("SELECT");
    this.options = [];
    this.selected = null;
  }
  replaceChildren(...options) {
    this.options = options;
    this.selected = options[0] ?? null;
  }
  get value() {
    return this.selected?.value ?? "";
  }
  set value(v) {
    this.selected = this.options.find((o) => o.value === String(v)) ?? null;
  }
  choose(index) {
    this.value = this.options[index].value;
    this.dispatchEvent(new Event("change"));
  }
}

/** A TextTrackList: iterable, and fires "change" when a mode changes. */
function trackList(specs) {
  const list = new EventTarget();
  const tracks = specs.map(({ kind, label, language }) => {
    let mode = "disabled";
    return {
      kind,
      label,
      language,
      get mode() {
        return mode;
      },
      set mode(next) {
        if (next === mode) return;
        mode = next;
        list.dispatchEvent(new Event("change"));
      },
    };
  });
  list[Symbol.iterator] = () => tracks[Symbol.iterator]();
  return { list, tracks };
}

let saved;

beforeEach(() => {
  saved = {
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    Option: globalThis.Option,
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { documentElement: { lang: "en", setAttribute() {} }, pictureInPictureEnabled: false, addEventListener() {} },
  });
  globalThis.Option = class {
    constructor(text, value) {
      this.text = text;
      this.value = String(value);
      this.lang = "";
    }
  };
});

afterEach(() => {
  if (saved.document) Object.defineProperty(globalThis, "document", saved.document);
  else delete globalThis.document;
  globalThis.Option = saved.Option;
});

/**
 * A mounted video player.
 * @param {object[]} specs     - the <track> elements: { kind, label, language }
 * @param {object}   options
 * @param {number}   [options.defaultIndex] - the track with `default`
 * @param {boolean}  [options.button]       - author a .cai-player-captions
 * @param {boolean}  [options.select]       - author a .cai-player-tracks
 * @param {string}   [options.lang]         - lang of the player
 */
function player(specs, { defaultIndex, button = true, select = false, lang = "" } = {}) {
  const { list, tracks } = trackList(specs);
  const root = new FakeElement("DIV", lang);
  root.dataset.type = "video";
  const media = new FakeElement("VIDEO");
  media.textTracks = list;
  media.controls = true;
  const ccBtn = button ? new FakeElement("BUTTON") : null;
  const ccMenu = select ? new FakeSelect() : null;
  root.parts = {
    ".cai-player-video": media,
    ".cai-player-controls": new FakeElement(),
    ".cai-player-captions": ccBtn,
    ".cai-player-tracks": ccMenu,
    "track[default]": defaultIndex === undefined ? null : { track: tracks[defaultIndex] },
  };
  mountPlayer(root);
  return { root, media, tracks, ccBtn, ccMenu };
}

const EN = { kind: "captions", label: "English", language: "en" };
const ES = { kind: "subtitles", label: "Español", language: "es" };
const CHAPTERS = { kind: "chapters", label: "Chapters", language: "en" };
const showing = (tracks) => tracks.filter((tk) => tk.mode === "showing").map((tk) => tk.label);

describe("player captions — the button", () => {
  it("is hidden when the media has no captions or subtitles track", () => {
    const { ccBtn } = player([CHAPTERS]);
    expect(ccBtn.hidden).toBe(true);
  });

  it("is named from the dictionary in the language of the player", () => {
    expect(player([EN]).ccBtn.getAttribute("aria-label")).toBe("Captions");
    expect(player([EN], { lang: "es" }).ccBtn.getAttribute("aria-label")).toBe("Subtítulos");
  });

  it("turns the default track on and off, and aria-pressed follows the track's mode", () => {
    const { ccBtn, tracks } = player([EN, ES], { defaultIndex: 1 });
    expect(ccBtn.hidden).toBe(false);
    expect(ccBtn.getAttribute("aria-pressed")).toBe("false");
    ccBtn.click();
    expect(showing(tracks)).toEqual(["Español"]);
    expect(ccBtn.getAttribute("aria-pressed")).toBe("true");
    ccBtn.click();
    expect(showing(tracks)).toEqual([]);
    expect(tracks[1].mode).toBe("disabled");
    expect(ccBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("turns the first captions or subtitles track on when none is the default", () => {
    const { ccBtn, tracks } = player([CHAPTERS, ES, EN]);
    ccBtn.click();
    expect(showing(tracks)).toEqual(["Español"]);
    expect(tracks[0].mode).toBe("disabled");
  });

  it("mirrors a mode set elsewhere (the browser's own menu, a default track)", () => {
    const { ccBtn, tracks } = player([EN]);
    tracks[0].mode = "showing";
    expect(ccBtn.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("player captions — the select", () => {
  it("lists Off, then each track by its label, in the track's language", () => {
    const { ccMenu } = player([EN, CHAPTERS, ES], { button: false, select: true });
    expect(ccMenu.options.map((o) => [o.text, o.lang])).toEqual([
      ["Off", ""],
      ["English", "en"],
      ["Español", "es"],
    ]);
    expect(ccMenu.getAttribute("aria-label")).toBe("Captions");
    expect(ccMenu.selected.text).toBe("Off");
  });

  it("shows the chosen track only, and Off turns every one off", () => {
    const { ccMenu, tracks } = player([EN, ES], { button: false, select: true });
    ccMenu.choose(1);
    expect(showing(tracks)).toEqual(["English"]);
    ccMenu.choose(2);
    expect(showing(tracks)).toEqual(["Español"]);
    expect(ccMenu.selected.text).toBe("Español");
    ccMenu.choose(0);
    expect(showing(tracks)).toEqual([]);
    expect(ccMenu.selected.text).toBe("Off");
  });

  it("follows the button when the player has both", () => {
    const { ccBtn, ccMenu } = player([EN, ES], { select: true, defaultIndex: 0 });
    ccBtn.click();
    expect(ccMenu.selected.text).toBe("English");
  });

  it("is hidden with no track to show", () => {
    expect(player([CHAPTERS], { button: false, select: true }).ccMenu.hidden).toBe(true);
  });
});

describe("player captions — the C key", () => {
  it("toggles captions when the player itself has focus", () => {
    const { root, tracks } = player([EN]);
    root.dispatchEvent(Object.assign(new Event("keydown"), { key: "c" }));
    expect(showing(tracks)).toEqual(["English"]);
  });

  it("does nothing with Ctrl, Alt or Cmd held, so Ctrl+C still copies", () => {
    const { root, tracks } = player([EN]);
    for (const mod of ["ctrlKey", "altKey", "metaKey"]) {
      root.dispatchEvent(Object.assign(new Event("keydown"), { key: "c", [mod]: true }));
    }
    expect(showing(tracks)).toEqual([]);
  });

  it("does nothing from inside one of the player's controls", () => {
    const { root, ccBtn, tracks } = player([EN]);
    // The event bubbles from the focused button to the player
    const event = new Event("keydown");
    Object.defineProperty(event, "target", { value: ccBtn });
    event.key = "c";
    root.dispatchEvent(event);
    expect(showing(tracks)).toEqual([]);
  });
});

describe("player captions — a name written in the HTML", () => {
  it("is kept: the dictionary names only a control that has none", () => {
    const { list } = trackList([EN]);
    const root = new FakeElement("DIV", "es");
    root.dataset.type = "video";
    const media = new FakeElement("VIDEO");
    media.textTracks = list;
    const ccBtn = new FakeElement("BUTTON");
    ccBtn.setAttribute("aria-label", "Closed captions");
    root.parts = { ".cai-player-video": media, ".cai-player-controls": new FakeElement(), ".cai-player-captions": ccBtn };
    mountPlayer(root);
    expect(ccBtn.getAttribute("aria-label")).toBe("Closed captions");
  });
});
