/**
 * CAI — initCopyButtons() is idempotent (PRINCIPLES.md §3: `init*()` is
 * idempotent). Calling it again must not add a second click listener: one
 * click on a copy button writes to the clipboard once.
 *
 * Node has no DOM, but it has the platform's EventTarget, which drops a
 * listener that is already registered exactly as a browser does; the
 * document around it is the smallest stand-in the module needs.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
/* global EventTarget */
import { initCopyButtons } from "../packages/core/src/clipboard.js";

class FakeElement extends EventTarget {
  constructor() {
    super();
    this.attributes = {};
    this.style = {};
    this.classList = { add() {}, remove() {} };
    this.textContent = "";
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  append() {}
  closest() {
    return null;
  }
}

let writes;
let button;
const saved = {};

beforeEach(() => {
  writes = [];
  button = new FakeElement();
  button.dataset = { copy: "--cai-surface-page" };
  button.closest = (selector) => (selector === ".cai-copy-btn" ? button : null);
  const body = new FakeElement();
  const region = new FakeElement();
  for (const key of ["document", "navigator"]) saved[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body,
      documentElement: Object.assign(new FakeElement(), { lang: "en" }),
      getElementById: () => region,
      createElement: () => new FakeElement(),
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText: async (text) => void writes.push(text) } },
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  for (const [key, descriptor] of Object.entries(saved)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

/** Click the copy button: the event bubbles to the delegated listener on body. */
async function click() {
  const event = new Event("click");
  // The delegated listener reads e.target; dispatching on body makes body the
  // target, so it answers closest() with the button.
  document.body.closest = button.closest;
  document.body.dataset = button.dataset;
  document.body.dispatchEvent(event);
  await vi.runAllTimersAsync();
}

describe("initCopyButtons", () => {
  it("copies once per click, however many times it is called", async () => {
    initCopyButtons();
    initCopyButtons();
    initCopyButtons();
    await click();
    expect(writes).toEqual(["--cai-surface-page"]);
  });

  it("still copies after a single call", async () => {
    initCopyButtons();
    await click();
    await click();
    expect(writes).toHaveLength(2);
  });
});
