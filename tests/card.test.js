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
    expect(selector).toContain(":not(.luz-card__title a)");
    // No other rule gives the title link a stacking order
    for (const r of rules) {
      if (r === lifted[0]) continue;
      if (/\.luz-card__title a\b/.test(r.selector) && !/::after/.test(r.selector)) {
        expect(r.body, r.selector).not.toMatch(/z-index|position:\s*relative/);
      }
    }
  });

  it("keeps the overlay on the title link, in the card", () => {
    expect(css).toMatch(/\.luz-card\s*\{[^}]*position:\s*relative/);
    expect(css).toMatch(/\.luz-card__title a::after\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/);
  });

  it("wraps a button's label, so a long one stays in its card (WCAG 1.4.4, 1.4.10)", () => {
    expect(css).toMatch(/\.luz-card \.luz-btn\s*\{[^}]*white-space:\s*normal/);
  });

  it("breaks a word longer than the card too (K1 of the button review)", () => {
    expect(css).toMatch(/\.luz-card \.luz-btn\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });
});

describe("card.css, featured card (band-and-featured-card.md, B5 and B6)", () => {
  const featured = rules.find((r) => r.selector === ".luz-card--featured");

  it("is a 2 px border in the brand colour, with the pixel taken from the padding", () => {
    expect(featured, ".luz-card--featured rule").toBeDefined();
    expect(featured.body).toMatch(/border-width:\s*2px/);
    expect(featured.body).toMatch(/border-color:\s*var\(--luz-brand-primary\)/);
    expect(featured.body).toMatch(/padding:\s*calc\(var\(--luz-space-md\)\s*-\s*1px\)/);
  });

  it("is not a rule of the title link, and gives the title link no stacking order", () => {
    for (const r of rules.filter((x) => x.selector.includes("--featured"))) {
      expect(r.body, r.selector).not.toMatch(/z-index|position:\s*relative/);
    }
  });

  it("stands the ring of a linked featured card off its border (B6)", () => {
    const ring = rules.find((r) => r.selector === ".luz-card--featured .luz-card__title a:focus-visible::after");
    expect(ring, "ring rule").toBeDefined();
    expect(ring.body).toMatch(/outline-offset:\s*var\(--luz-space-2xs\)/);
  });

  it("keeps its brand colour on hover, a step darker, in a linked card (the hover of a card would turn it grey)", () => {
    const hover = rules.find((r) => r.selector === ".luz-card--featured:has(.luz-card__title a):hover");
    expect(hover, "hover rule").toBeDefined();
    expect(hover.body).toMatch(/border-color:\s*var\(--luz-brand-hover\)/);
    // After the card's own hover rule, with the same specificity, so it wins
    const own = rules.findIndex((r) => r.selector === ".luz-card:has(.luz-card__title a):hover");
    expect(rules.indexOf(hover)).toBeGreaterThan(own);
  });
});
