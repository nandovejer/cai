/**
 * The accessibility statement covers the two pages F4 added (SR-9, test first):
 * "Choose your snippet" (get-started/snippet.html) and the size knobs of
 * "Make it yours" (get-started/make-it-yours.html).
 *
 * Each expectation is read from a paragraph or list item of
 * apps/docs/pages/accessibility.html that names the page, so it is anchored to
 * the concept, not to a word order. What the writer must say:
 *
 *   (a) Choose your snippet, without JavaScript: the picker is absent, every
 *       snippet is shown, the index table is the navigation.
 *   (b) Choose your snippet, with JavaScript: the picker announces the shown
 *       snippet through its <output>.
 *   (c) Make it yours: the sizes demo is optional, is not shown without
 *       JavaScript, resizes the page itself and has a reset button.
 *   (d) The size knobs change the page's text and space, and a reader's own
 *       text size is respected (the scale is in rem).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeEntities, readHtml } from "../scripts/docs-site/html.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "apps/docs/pages/accessibility.html";
const html = readFileSync(resolve(repo, FILE), "utf-8");
readHtml(html, FILE);

const squash = (s) => s.replace(/\s+/g, " ").trim();
const textOf = (h) => squash(decodeEntities(h.replace(/<[^>]*>/g, " ")));
/** Every paragraph and list item of the statement, as text. */
const blocks = [...html.matchAll(/<(li|p)\b[\s\S]*?<\/\1>/g)].map((m) => textOf(m[0]));
const about = (concept) => blocks.filter((t) => t.toLowerCase().includes(concept.toLowerCase()));

const NO_JS = /without JavaScript|JavaScript (is |turned |switched )?off|no JavaScript|without a script/i;

/** One block that names the concept and passes every check. */
function expectBlock(concept, checks) {
  const candidates = about(concept);
  expect(candidates, `a paragraph or list item of the statement names "${concept}"`).not.toHaveLength(0);
  const ok = candidates.some((t) => checks.every(([re]) => re.test(t)));
  const missing = candidates.length
    ? checks.filter(([re]) => !candidates.some((t) => re.test(t))).map(([, what]) => what)
    : [];
  expect(ok, `one block about "${concept}" must say: ${checks.map(([, w]) => w).join("; ")}${missing.length ? ` (nowhere: ${missing.join("; ")})` : ""}`).toBe(true);
}

describe("accessibility statement: Choose your snippet", () => {
  it("(a) without JavaScript the picker is absent, every snippet is shown and the index table navigates", () => {
    expectBlock("Choose your snippet", [
      [NO_JS, "says it without JavaScript"],
      [/picker[^.]{0,80}(absent|not (shown|present|in the page|there|drawn|rendered|offered)|missing)|no picker|without the picker/i, "the picker is absent"],
      [/(every|all)( of)?( the)? snippets?[^.]{0,40}(shown|visible|on the page|listed|are there)|(shows?|lists?) (every|all)( of)?( the)? snippets?/i, "every snippet is shown"],
      [/\btable\b/i, "the index table"],
    ]);
  });

  it("(b) with JavaScript the picker announces the shown snippet through its output", () => {
    expectBlock("Choose your snippet", [
      [/picker/i, "names the picker"],
      [/announce/i, "announces"],
      [/output/i, "through its <output>"],
    ]);
  });
});

describe("accessibility statement: Make it yours", () => {
  it("(c) the sizes demo is optional, absent without JavaScript, resizes the page itself and has a reset button", () => {
    expectBlock("Make it yours", [
      [/optional/i, "the demo is optional"],
      [NO_JS, "says it without JavaScript"],
      [/(not (shown|present|in the page|there|drawn|rendered)|absent|hidden|does not (show|appear)|no demo)/i, "it is not shown without JavaScript"],
      [/(resiz|re-?scal|chang)\w*[^.]{0,60}\bpage\b|\bpage\b[^.]{0,40}(itself|resiz|re-?scal)/i, "it resizes the page itself"],
      [/reset/i, "has a reset button"],
    ]);
  });

  it("(d) the size knobs change the page's text and space, and a reader's own text size is respected", () => {
    const hit = blocks.filter(
      (t) =>
        /knobs?/i.test(t) &&
        /\btext\b/i.test(t) &&
        /\bspace\b|\bspacing\b/i.test(t) &&
        /\brem\b|root (font |text )?size|(reader|visitor|user)[’']s own|own text size|browser[’']s (own |default )?(text |font )?size/i.test(t) &&
        /respect|honou?r|follow|keeps?|scales?/i.test(t),
    );
    expect(hit, "a block that names the knobs, the text and space they change, and the reader's own text size (rem)").not.toHaveLength(0);
  });
});
