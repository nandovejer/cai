/**
 * S1 of the Safari review (2026-10-16): packages/core/src/timeline.js
 * `schedule()` sets the Pause / Play button's `textContent` on every call
 * (mousemove start, idle timeout, focusin, tick). WebKit drops the click when
 * the node under the pointer is replaced between mousedown and mouseup, and
 * that button is the WCAG 2.2.2 control. The text is written only when it
 * changed. The behaviour is checked in Chromium by tests/timeline.spec.js
 * ("the Pause button's text is not rewritten …", a MutationObserver); this is
 * the source-level guard.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(repo, "packages/core/src/timeline.js"), "utf-8");

describe("timeline.js writes the toggle's text only when it changed", () => {
  const writes = [...source.matchAll(/toggle\.textContent\s*=(?!=)/g)];

  it("still writes it (Pause becomes Play)", () => {
    expect(writes.length).toBeGreaterThan(0);
  });

  it("every write of toggle.textContent is guarded by a `!==` against its current value", () => {
    const guarded = [...source.matchAll(/if\s*\(\s*toggle\.textContent\s*!==\s*[\w.]+\s*\)\s*toggle\.textContent\s*=(?!=)/g)];
    expect(guarded.length, "unguarded `toggle.textContent =` writes").toBe(writes.length);
  });

  it("does not use innerHTML, replaceChildren or append to rewrite the button", () => {
    expect(source).not.toMatch(/toggle\.(innerHTML|replaceChildren|replaceWith|append)\b/);
  });
});
