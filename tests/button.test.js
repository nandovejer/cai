/**
 * Button: the full-width modifier (.claude/plans/specs/button-block.md and its
 * accessibility review, K1 and K2). A regression that gave it a fixed `width`,
 * or took the wrapping away, would overflow a narrow card at 200 % text
 * (WCAG 1.4.4, 1.4.10) and nothing would say so until a phone did.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../packages/core/src/components/button.css", import.meta.url), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
const block = rules.find((r) => r.selector === ".luz-btn--block");

describe(".luz-btn--block", () => {
  it("is the width of its container, and wraps its label", () => {
    expect(block, ".luz-btn--block rule").toBeDefined();
    expect(block.body).toMatch(/inline-size:\s*100%/);
    expect(block.body).toMatch(/white-space:\s*normal/);
    // A physical width would break the logical-property rule and the wrapping above it
    expect(block.body).not.toMatch(/(^|[;\s])(width|max-width|min-width)\s*:/);
  });

  it("breaks a word longer than the box (K1) and keeps air above and below a wrapped label (K2)", () => {
    expect(block.body).toMatch(/overflow-wrap:\s*anywhere/);
    expect(block.body).toMatch(/padding-block:\s*var\(--luz-space-2xs\)/);
  });

  it("comes after the sizes, so its block padding wins over theirs", () => {
    const at = (selector) => rules.findIndex((r) => r.selector === selector);
    expect(at(".luz-btn--block")).toBeGreaterThan(at(".luz-btn--sm"));
    expect(at(".luz-btn--block")).toBeGreaterThan(at(".luz-btn--lg"));
  });
});
