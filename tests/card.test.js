/**
 * Card: the rule that raises links and controls above the stretched title
 * link (a11y review of 2026-10-13, product card). A regression that raised
 * the title link itself would take the card's click from it, silently.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../packages/core/src/components/card.css", import.meta.url), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));

describe("card.css", () => {
  it("raises other links and controls above the stretched link, and never the title link", () => {
    const lifted = rules.filter((r) => /position:\s*relative/.test(r.body) && /z-index:\s*1\b/.test(r.body));
    expect(lifted).toHaveLength(1);
    const { selector } = lifted[0];
    for (const element of ["a", "button", "input", "select", "textarea", "summary"]) {
      expect(selector, element).toMatch(new RegExp(`[(,\\s]${element}[,)\\s]`));
    }
    // The title link is excluded by the selector itself
    expect(selector).toContain(":not(.cai-card__title a)");
    // No other rule gives the title link a stacking order
    for (const r of rules) {
      if (r === lifted[0]) continue;
      if (/\.cai-card__title a\b/.test(r.selector) && !/::after/.test(r.selector)) {
        expect(r.body, r.selector).not.toMatch(/z-index|position:\s*relative/);
      }
    }
  });

  it("keeps the overlay on the title link, in the card", () => {
    expect(css).toMatch(/\.cai-card\s*\{[^}]*position:\s*relative/);
    expect(css).toMatch(/\.cai-card__title a::after\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/);
  });

  it("wraps a button's label, so a long one stays in its card (WCAG 1.4.4, 1.4.10)", () => {
    expect(css).toMatch(/\.cai-card \.cai-btn\s*\{[^}]*white-space:\s*normal/);
  });
});
