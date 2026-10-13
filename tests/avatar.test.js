/**
 * Avatar with a photo: the box must not clip (A1 of the speakers review).
 * `overflow: hidden` on the avatar cuts initials that outgrow a 24 px box at
 * 200 % text; the photo is rounded by `border-radius: inherit` instead.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../packages/core/src/components/avatar.css", import.meta.url), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));

describe("avatar.css", () => {
  it("never clips the box", () => {
    for (const r of rules) expect(r.body, r.selector).not.toMatch(/overflow\s*:\s*(hidden|clip)/);
  });

  it("fills the box with the photo and rounds it with the box's own corners", () => {
    const img = rules.find((r) => /\.cai-avatar\s+:where\(img\)/.test(r.selector));
    expect(img, "img rule").toBeDefined();
    expect(img.body).toMatch(/inline-size:\s*100%/);
    expect(img.body).toMatch(/block-size:\s*100%/);
    expect(img.body).toMatch(/object-fit:\s*cover/);
    expect(img.body).toMatch(/border-radius:\s*inherit/);
  });
});
