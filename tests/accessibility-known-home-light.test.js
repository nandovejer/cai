/**
 * Known issue (owner's decision of 2026-10-18): the home page's light has no
 * "Pause motion" button. The globe and the stars of the landing page move for
 * more than five seconds and stop only with the system's reduced-motion
 * setting (RL-8 holds: every animation stops under prefers-reduced-motion), so
 * WCAG 2.2 success criterion 2.2.2 (Pause, Stop, Hide, level A) is not met for
 * them. The accessibility statement, apps/docs/pages/accessibility.html, says
 * so under "Known issues", in the form of the other criteria it lists (a
 * bullet that starts with a bold name and names "WCAG 2.2 success criterion
 * x.y.z"), and no longer describes a button that is gone.
 */
import { describe, expect, it } from "vitest";
import { readPage, sectionsOf, textOf } from "./helpers/page-facts.js";

const page = () => readPage("accessibility.html");
const known = () => sectionsOf(page().body).get("h-a11y-known");
const items = () => [...known().html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => ({ html: m[1], text: textOf(m[1]) }));
/** The bullet that names criterion 2.2.2. */
const bullet = () => items().find((i) => /\b2\.2\.2\b/.test(i.text));

describe("the accessibility statement no longer talks about a Pause motion button", () => {
  it("says nothing of Pause motion anywhere, and does not say the browser remembers a choice of the light", () => {
    const text = textOf(page().body);
    expect(text).not.toMatch(/Pause motion/i);
    expect(text).not.toMatch(/remembers the choice/i);
  });

  it("the Light of the home page bullet does not describe a pressed state or a border for it in forced colors", () => {
    const light = items().find((i) => /^<strong>Light of the home page/i.test(i.html.trim()));
    expect(light, "a bullet <strong>Light of the home page…</strong>").toBeTruthy();
    expect(light.text).not.toMatch(/pressed|toggle|stops the motion for anyone/i);
  });

  it("the Light of the home page bullet still says that with reduced motion nothing in the drawing animates and the stars stop", () => {
    const light = items().find((i) => /^<strong>Light of the home page/i.test(i.html.trim()));
    expect(light?.text ?? "").toMatch(/reduced motion/i);
    expect(light?.text ?? "").toMatch(/stars/i);
  });
});

describe("the accessibility statement lists WCAG 2.2.2 as not met for the light of the home page", () => {
  it("has a known issue that names criterion 2.2.2", () => {
    expect(known(), "a Known issues section").toBeTruthy();
    expect(bullet(), "a bullet that names 2.2.2").toBeTruthy();
  });

  it("starts with a bold name that says it is the motion of the home page's light, as the other bullets do", () => {
    expect(bullet()?.html.trim() ?? "").toMatch(/^<strong>[^<]*(?:motion|light|globe|stars)[^<]*\.<\/strong>/i);
  });

  it("names the criterion as the other bullets do: WCAG 2.2 success criterion 2.2.2, Pause, Stop, Hide, level A", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/WCAG 2\.2 success criterion 2\.2\.2/);
    expect(t).toMatch(/Pause, Stop, Hide/);
    expect(t).toMatch(/level A\b(?!A)/);
  });

  it("says it is not met, for the globe and for the stars of the page", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/not met|is not met|fails|does not meet|not satisfied/i);
    expect(t).toMatch(/\bglobe\b/i);
    expect(t).toMatch(/\bstars\b/i);
  });

  it("says the motion stops only with the system's reduced-motion setting, and that the bar has no pause control", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/only/i);
    expect(t).toMatch(/reduced.motion|prefers-reduced-motion|less motion/i);
    expect(t).toMatch(/system|operating system|device|browser/i);
    expect(t).toMatch(/no (?:button|control)|nothing in the page|cannot (?:pause|stop)|no way to (?:pause|stop)/i);
  });

  it("says it has not been tested with a screen reader", () => {
    expect(bullet()?.text ?? "").toMatch(/not (?:yet |been )?tested with a screen reader/i);
  });
});
