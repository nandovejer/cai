/**
 * Known issue (reviews of 2026-10-16): a `.luz-btn` has `white-space: nowrap`
 * (packages/core/src/components/button.css, the base rule of the component), so
 * a label that is long does not wrap and the button can spill out of its
 * container at 320 px with text at 130 % (WCAG 1.4.10 Reflow). The
 * accessibility statement, apps/docs/pages/accessibility.html, lists it under
 * "Known issues" in plain words: a bullet that starts with a bold name that
 * says Button, and says the label does not wrap, that the button can overflow,
 * at 320 pixels, with text at 130 percent.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readPage, repo, sectionsOf, textOf } from "./helpers/page-facts.js";

const css = readFileSync(`${repo}/packages/core/src/components/button.css`, "utf-8");
const known = () => sectionsOf(readPage("accessibility.html").body).get("h-a11y-known");
const items = () => [...known().html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => ({ html: m[1], text: textOf(m[1]) }));
/** The bullet about the button: its bold label names the button. */
const bullet = () => items().find((i) => /^<strong>[^<]*\bbutton\b/i.test(i.html.trim()) && !/Copy button|Legacy theme|Avatar|Account/i.test(i.html.slice(0, 60)));

describe("the accessibility statement lists the button label that does not wrap", () => {
  it("the premise holds: .luz-btn sets white-space: nowrap", () => {
    expect(css).toMatch(/\.luz-btn\s*\{[^}]*white-space:\s*nowrap/);
  });

  it("has a known issue whose bold name says Button", () => {
    expect(known(), "a Known issues section").toBeTruthy();
    expect(bullet(), "a bullet <strong>Button…</strong>").toBeTruthy();
  });

  it("says plainly that a long label does not wrap and can overflow", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/does not wrap|doesn.t wrap|no wrap|cannot wrap|can.t wrap/i);
    expect(t).toMatch(/long label|label is long|label that is long|long text/i);
    expect(t).toMatch(/overflow|spill|stick out|runs? out|goes? past|wider than/i);
  });

  it("gives the case: 320 pixels wide, text at 130 percent, and names .luz-btn", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/\b320\s*(px|pixels)/i);
    expect(t).toMatch(/\b130\s*(%|percent|per cent)/i);
    expect(t).toContain(".luz-btn");
  });
});
