/**
 * No version is typed by hand in the header or the footers of the site
 * (F7 decision of the accessibility review): the header's tag and the docs
 * footer say what the home footer says, the `version` of
 * packages/core/package.json, through `{{version}}` (scripts/docs-site/site.js).
 * A literal `v0.1.0` in a partial, a layout or the home template goes stale at
 * the next release. The pages as the browser shows them are checked in
 * tests/site-version.spec.js.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = new URL("..", import.meta.url).pathname;
const FOLDERS = ["apps/site/_partials", "apps/docs/_partials", "apps/docs/_layouts"];
const LITERAL = /v\d+\.\d+\.\d+/;

describe("no version is typed by hand in the partials, the layouts and the home template", () => {
  const files = [...FOLDERS.flatMap((dir) => readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".html")).map((f) => `${dir}/${f}`)), "apps/landing/index.html"];

  it("finds the files it is meant to read", () => {
    expect(files).toEqual(expect.arrayContaining(["apps/site/_partials/header.html", "apps/docs/_partials/footer-links.html", "apps/docs/_layouts/page.html", "apps/landing/index.html"]));
  });

  for (const file of files) {
    it(`${file} has no literal vN.N.N`, () => {
      const found = readFileSync(join(ROOT, file), "utf-8")
        .split("\n")
        .map((line, i) => (LITERAL.test(line) ? `line ${i + 1}: ${line.match(LITERAL)[0]}` : null))
        .filter(Boolean);
      expect(found, `${file}: a version typed by hand; write {{version}}`).toEqual([]);
    });
  }

  it("the header and the docs footer use {{version}}", () => {
    for (const file of ["apps/site/_partials/header.html", "apps/docs/_partials/footer-links.html"]) {
      expect(readFileSync(join(ROOT, file), "utf-8").includes("{{version}}"), `${file} writes {{version}}`).toBe(true);
    }
  });
});
