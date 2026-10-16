/**
 * M2 of the Safari review (2026-10-16): in WebKit a text field focused with
 * Tab ends under the fixed cookie band, because WebKit reveals text controls
 * with its own scroll that ignores `scroll-padding` and `scroll-margin`
 * (links and buttons honour them). WCAG 2.4.11. The Playwright check is
 * tests/consent-band.spec.js C4 and fails in WebKit only; this is the guard
 * that runs in Chromium: packages/site/src/consent.js listens to `focusin` and
 * brings a target the band covers back above it with
 * `scrollIntoView({ block: "nearest" })`, which does honour the padding.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(repo, "packages/site/src/consent.js"), "utf-8");

/** The text of the `focusin` handler: from the listener to the end of its statement. */
const handler = () => {
  const at = source.search(/addEventListener\(\s*["']focusin["']/);
  return at < 0 ? "" : source.slice(at, at + 700);
};

describe("the cookie band keeps a focused field in view (WCAG 2.4.11, WebKit)", () => {
  it("listens to focusin on the document", () => {
    expect(source).toMatch(/document\.addEventListener\(\s*["']focusin["']/);
  });

  it("scrolls the target into view with block: nearest, so scroll-padding-block-end is honoured", () => {
    expect(handler()).toMatch(/\.scrollIntoView\(\s*\{\s*block:\s*["']nearest["']\s*\}\s*\)/);
  });

  it("only for a target the band covers: outside the band, and below the band's top edge", () => {
    const h = handler();
    expect(h).toMatch(/\.contains\(/); // the band's own controls are left alone
    expect(h).toMatch(/getBoundingClientRect\(\)\.bottom/); // the target's bottom edge ...
    expect(h).toMatch(/getBoundingClientRect\(\)\.top/); // ... against the band's top edge
  });

  it("does nothing while the band is hidden", () => {
    expect(handler()).toMatch(/\.hidden|isConnected/);
  });
});
