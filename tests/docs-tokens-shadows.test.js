/**
 * The Shadows token page (apps/docs/pages/tokens/shadows.html) tells the truth
 * about modes (SR-9, test first).
 *
 * The scale is not "the same in every mode": packages/tokens/src/semantic.css
 * redraws --luz-shadow-sm/md/lg in the dark block (a heavier black on a darker
 * ground) and replaces them in the high-contrast block (hairline outlines, since
 * a blur is invisible there). The light values are the primitives in
 * packages/tokens/tokens.json (`shadow.*`), emitted on :root.
 *
 *   - the page does not say the shadows are the same in every mode
 *   - the page says, next to "shadow", that dark and high contrast change them
 *   - the value printed under each --luz-shadow-sm|md|lg|icon is the light value
 *     of tokens.json, whitespace-normalised, so a changed token fails here
 *
 * Nothing here types a shadow: every value is read from the token files.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeEntities, readHtml } from "../scripts/docs-site/html.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repo, path), "utf-8");
const squash = (s) => s.replace(/\s+/g, " ").trim();
const textOf = (html) => squash(decodeEntities(html.replace(/<[^>]*>/g, " ")));

const PAGE = "tokens/shadows.html";
const html = read(`apps/docs/pages/${PAGE}`);
readHtml(html, PAGE); // fails on a mis-nested tag

const tokens = JSON.parse(read("packages/tokens/tokens.json"));
const semantic = read("packages/tokens/src/semantic.css");

/** The shadow declarations of a slice of semantic.css, as { "--luz-shadow-sm": "value" }. */
const shadowsIn = (css) =>
  Object.fromEntries([...css.matchAll(/(--luz-shadow-[a-z]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], squash(m[2])]));

const darkBlock = semantic.slice(semantic.indexOf("COLOR MODE: DARK"), semantic.indexOf("COLOR MODE: HIGH CONTRAST"));
const contrastBlock = semantic.slice(semantic.indexOf("COLOR MODE: HIGH CONTRAST"));

const NAMES = ["sm", "md", "lg", "icon"];

describe("tokens/shadows.html: shadows by mode", () => {
  it("the premise holds: dark redraws sm, md and lg, and high contrast replaces them", () => {
    for (const [mode, block] of [["dark", darkBlock], ["high-contrast", contrastBlock]]) {
      const own = shadowsIn(block);
      for (const n of ["sm", "md", "lg"]) {
        expect(own[`--luz-shadow-${n}`], `${mode} sets --luz-shadow-${n}`).toBeTruthy();
        expect(own[`--luz-shadow-${n}`], `${mode} differs from light`).not.toBe(squash(tokens.shadow[n].value));
      }
    }
  });

  it("does not say the shadows are the same in every mode", () => {
    const text = textOf(html);
    expect(text).not.toMatch(/same in (every|all|each) (color |colour )?modes?/i);
    expect(text).not.toMatch(/(do not|does not|never) (change|differ|vary)[^.]{0,30}(mode|theme)/i);
  });

  it("says, in a sentence about shadow, that dark and high contrast change them", () => {
    const blocks = [...html.matchAll(/<(li|p)\b[\s\S]*?<\/\1>/g)].map((m) => textOf(m[0]));
    const about = blocks.filter(
      (t) => /shadow/i.test(t) && /\bdark\b/i.test(t) && /high[- ]contrast/i.test(t),
    );
    expect(about, "a paragraph or list item that names shadow, dark and high contrast").not.toHaveLength(0);
    expect(
      about.some((t) => /\b(change[sd]?|differ(s|ent)?|redrawn|replaced?|heavier|darker|swapped|own)\b/i.test(t)),
      "and says that they change",
    ).toBe(true);
  });

  it("prints, under each token, the light value of tokens.json", () => {
    const boxes = [
      ...html.matchAll(
        /<div class="[^"]*docs-box--shadow[^"]*"[^>]*style="--v:\s*var\((--luz-shadow-[a-z]+)\)"[^>]*>([\s\S]*?)<\/div>/g,
      ),
    ];
    expect(boxes.map((m) => m[1]).sort(), "one box per token").toEqual(NAMES.map((n) => `--luz-shadow-${n}`).sort());
    for (const [, name, inner] of boxes) {
      const key = name.replace("--luz-shadow-", "");
      const printed = textOf(inner).replace(name, "").trim();
      expect(printed, name).toBe(squash(tokens.shadow[key].value));
    }
  });
});
