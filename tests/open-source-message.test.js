/**
 * F7 step 7 (spec f7-open-source.md): the message, said the same way in the
 * home page, the README, PRINCIPLES.md, a page of the docs and the
 * "Use or contribute" table.
 *
 *   The two statements (English, exactly):
 *     "Human-first, AI-ready"
 *     "Every change starts with a failing test"
 *
 *   Home page    apps/landing/i18n/{en,es,ar}.json carry, beside each other, the keys
 *                  built.title  = the first statement      (en)
 *                  built.line   = the second statement     (en)
 *                the same keys in es and ar, translated (es differs from en; ar has no
 *                Latin letter in them); apps/landing/index.html writes them as
 *                {{t:built.title}} and {{t:built.line}} (the build fails on an unused key)
 *   README.md, PRINCIPLES.md   both statements before the first `## ` heading
 *   Page         apps/docs/pages/get-started/how-luz-is-built.html: front matter
 *                title "How LUZ is built", area get-started, order 12 (after Classless),
 *                toc: false, a description; h2 sections "Human-first, AI-ready",
 *                "Tests first", "Zero dependencies"; links to PRINCIPLES.md, TESTING.md
 *                and /docs/get-started/ai/; every /docs/ link goes to a page that exists
 *   Table        a markdown table under a heading "Use or contribute", in README.md and
 *                CONTRIBUTING.md, the same lines in both: header `| I want to | How |`,
 *                then these eight rows, first cell exactly:
 *                  Use it, Copy it, Fork it, Report a bug, Propose a change,
 *                  Send a pull request, Add a language, Review in Safari/Firefox
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { linksOf, sectionsOf, textOf } from "./helpers/page-facts.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function read(rel) {
  const file = join(repo, rel);
  if (!existsSync(file)) throw new Error(`${rel} does not exist`);
  return readFileSync(file, "utf-8");
}
const flat = (s) => s.replace(/\s+/g, " ");

const STATEMENT = "Human-first, AI-ready";
const LINE = "Every change starts with a failing test";

/* ---- Home page ------------------------------------------------------------- */

describe("the home page says it in three languages", () => {
  const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));

  it("English has the two statements, word for word", () => {
    // The owner replaced the home's hero line by "We love TDD: every change starts with a failing test."
    // (title, separator and line are three keys); README.md and PRINCIPLES.md keep STATEMENT and LINE.
    expect(catalog("en")["built.title"]).toBe("We love TDD");
    expect(catalog("en")["built.sep"]).toBe(": ");
    expect(catalog("en")["built.line"]).toBe("every change starts with a failing test.");
  });

  it.each(["es", "ar"])("%s has the same keys, translated", (code) => {
    const en = catalog("en");
    const c = catalog(code);
    for (const key of ["built.title", "built.line"]) {
      expect(typeof c[key], `${code} ${key}`).toBe("string");
      expect(c[key].trim().length, `${code} ${key}`).toBeGreaterThan(0);
      expect(c[key], `${code} ${key} is not the English text`).not.toBe(en[key]);
    }
  });

  it("Arabic has no English in them", () => {
    const ar = catalog("ar");
    for (const key of ["built.title", "built.line"]) expect(ar[key], key).not.toMatch(/[A-Za-z]/);
  });

  it("the template writes both keys, so the build's unused-key check passes", () => {
    const html = read("apps/landing/index.html");
    expect(html).toContain("{{t:built.title}}");
    expect(html).toContain("{{t:built.line}}");
  });
});

/* ---- README and PRINCIPLES.md ------------------------------------------------ */

describe.each(["README.md", "PRINCIPLES.md"])("%s", (file) => {
  it("says both statements in its intro, before the first `##` heading", () => {
    const text = read(file);
    const intro = flat(text.slice(0, text.search(/^## /m)));
    expect(intro).toContain(STATEMENT);
    expect(intro).toContain(LINE);
  });
});

/* ---- The page --------------------------------------------------------------------- */

/** Routes of every page of apps/docs/pages (a name starting with `_` is not a page). */
function routes() {
  const base = join(repo, "apps/docs/pages");
  const out = new Set(["/docs/a-z/"]);
  const walk = (dir, prefix) => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith("_")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, `${prefix}${name}/`);
      else if (name.endsWith(".html")) out.add(name === "index.html" ? `/docs/${prefix}` : `/docs/${prefix}${name.slice(0, -5)}/`);
    }
  };
  walk(base, "");
  return out;
}

describe("get-started/how-luz-is-built", () => {
  const FILE = "apps/docs/pages/get-started/how-luz-is-built.html";
  const source = () => read(FILE);
  const front = () => Object.fromEntries([...(/<!--\s*luz:page\b([\s\S]*?)-->/.exec(source())?.[1] ?? "").matchAll(/^\s*([\w-]+):\s*(.*)$/gm)].map((m) => [m[1], m[2].trim()]));
  const body = () => source().replace(/^\s*<!--\s*luz:page\b[\s\S]*?-->/, "");

  it("has the front matter of a Get started page, after Classless, without a table of contents", () => {
    const f = front();
    expect(f.title).toBe("How LUZ is built");
    expect(f.area).toBe("get-started");
    expect(f.order).toBe("12");
    expect(f.toc).toBe("false");
    expect((f.description ?? "").length).toBeGreaterThan(20);
  });

  it("has the three sections: Human-first, AI-ready · Tests first · Zero dependencies", () => {
    expect([...sectionsOf(body()).values()].map((s) => s.title)).toEqual([STATEMENT, "Tests first", "Zero dependencies"]);
  });

  it("says that every change starts with a failing test", () => {
    expect(textOf(body())).toContain(LINE);
  });

  it("links PRINCIPLES.md, TESTING.md and the page Working with AI", () => {
    const hrefs = linksOf(body()).map((l) => l.href);
    expect(hrefs.some((h) => h.includes("PRINCIPLES.md"))).toBe(true);
    expect(hrefs.some((h) => h.includes("TESTING.md"))).toBe(true);
    expect(hrefs).toContain("/docs/get-started/ai/");
  });

  it("every internal link goes to a page that exists, written root-absolute with a trailing slash", () => {
    const known = routes();
    const internal = linksOf(body()).map((l) => l.href).filter((h) => h.startsWith("/"));
    expect(internal.length).toBeGreaterThan(0);
    for (const href of internal) {
      const route = href.split("#")[0];
      expect(route.endsWith("/"), href).toBe(true);
      expect(known.has(route), href).toBe(true);
    }
  });

  it("is short, 450 words at most (the A–Z index and llms-full.txt are close to their ceilings)", () => {
    // 400 until "Tests first" had to explain how TDD is done (commit 2d9278c3): 419 words now, 450 with a margin.
    expect(textOf(body()).split(/\s+/).length).toBeLessThanOrEqual(450);
  });
});

/* ---- Use or contribute -------------------------------------------------------------- */

const ROWS = ["Use it", "Copy it", "Fork it", "Report a bug", "Propose a change", "Send a pull request", "Add a language", "Review in Safari/Firefox"];

/** The lines of the table under a heading "Use or contribute". */
function useOrContribute(file) {
  const lines = read(file).split("\n");
  const at = lines.findIndex((l) => /^#{2,4}\s+Use or contribute\s*$/.test(l));
  if (at < 0) return null;
  const table = [];
  for (const l of lines.slice(at + 1)) {
    if (l.startsWith("|")) table.push(l.trim());
    else if (table.length) break;
  }
  return table;
}
const cells = (line) => line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

describe("the Use or contribute table", () => {
  it.each(["README.md", "CONTRIBUTING.md"])("%s has it: header, rule and the eight rows, in order", (file) => {
    const table = useOrContribute(file);
    expect(table, `a heading "Use or contribute" with a table in ${file}`).not.toBeNull();
    expect(cells(table[0])).toEqual(["I want to", "How"]);
    expect(table[1]).toMatch(/^\|[\s:|-]+\|$/);
    expect(table.slice(2).map((l) => cells(l)[0])).toEqual(ROWS);
  });

  it("is identical, line for line, in README.md and CONTRIBUTING.md", () => {
    const readme = useOrContribute("README.md");
    expect(readme, 'a heading "Use or contribute" with a table in README.md').not.toBeNull();
    expect(useOrContribute("CONTRIBUTING.md")).toEqual(readme);
  });

  it("says the thing each row promises", () => {
    const rows = Object.fromEntries((useOrContribute("README.md") ?? []).slice(2).map((l) => [cells(l)[0], cells(l)[1]]));
    expect(rows["Use it"]).toMatch(/MIT/);
    expect(rows["Use it"]).toMatch(/no registration/i);
    expect(rows["Use it"]).toMatch(/no telemetry/i);
    expect(rows["Copy it"]).toMatch(/notice/i);
    expect(rows["Fork it"]).toMatch(/MIT/);
    expect(rows["Fork it"]).toMatch(/what (you )?changed/i);
    expect(rows["Propose a change"]).toMatch(/Discussions/);
    expect(rows["Send a pull request"]).toContain("`test:`");
    expect(rows["Add a language"]).toMatch(/JSON/);
    expect(rows["Add a language"]).toMatch(/reader of the language/i);
    expect(rows["Review in Safari/Firefox"]).toContain("needs-browser-review");
  });
});
