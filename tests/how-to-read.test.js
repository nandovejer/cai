/**
 * "How to read LUZ" (F4 step 10, spec f4-customisation.md 3.3):
 * apps/docs/pages/get-started/how-to-read.html teaches the names, and links
 * out for packages and layers. RL-19 applied to a page: every name it writes
 * is looked up, by kind, in the source, so the page fails the day it stops
 * matching it.
 *
 *   class      a `.luz-`, `.o-`, `.u-`, `.is-` name occurs in a package's CSS
 *   prefix     each prefix of the table occurs in a package's CSS
 *   token      a `--luz-*` name is declared by tokens, semantic.css or settings
 *   attribute  a `data-*` name occurs in a package's source
 *   element    a `<luz-*>` tag is defined by customElements.define or has a
 *              CSS type selector (the CSS-only tags)
 *   file       a file name is in the pack-files.txt of the package it names
 *   surface    the "public" lines are the first column of the "What is public
 *              API" table of VERSIONING.md
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LAYERS } from "../scripts/luz-layers.js";
import { PACKAGES } from "../scripts/luz-packages.js";
import { codesOf, columnOf, declaredTokens, escapeRe, h2Ids, linksOf, packFiles, packageSources, readPage, repo, sectionsOf, stripCssComments, tablesOf, textOf } from "./helpers/page-facts.js";

const IDS = ["classes", "tokens", "attributes", "elements", "layers", "public", "files"];
const PREFIXES = [".luz-", ".o-", ".u-", ".luz-landing-", ".luz-cms-", ".luz-app-", ".is-"];
const ATTRIBUTES = ["data-theme", "data-mode", "data-luz-*", "data-luz-label-*"];
const ELEMENTS = ["luz-search", "luz-consent", "luz-timeline", "luz-lang-switch", "luz-submenu", "luz-banner"];
const FILES = ["luz-tokens.css", "tokens.css", "components/<name>.css", "base.css", "classless.css", "themes/_template.css"];

const page = readPage("get-started/how-to-read.html");
const sections = sectionsOf(page.body);
const section = (id) => {
  const s = sections.get(id);
  if (!s) throw new Error(`how-to-read.html has no <h2 id="${id}">`);
  return s.html;
};

/* ---- The source ---------------------------------------------------------- */

const sources = packageSources();
const css = sources.filter((s) => s.path.endsWith(".css")).map((s) => stripCssComments(s.text)).join("\n");
const everything = sources.map((s) => s.text).join("\n");
const jsSources = sources.filter((s) => s.path.endsWith(".js")).map((s) => s.text).join("\n");

const hasClass = (name) => new RegExp(`\\.${escapeRe(name.replace(/^\./, ""))}(?![\\w-])`).test(css);
const hasPrefix = (prefix) => css.includes(prefix);
const isDefinedTag = (tag) =>
  new RegExp(`customElements\\.define\\(\\s*["']${escapeRe(tag)}["']`).test(jsSources) || new RegExp(`(?<![.\\w-])${escapeRe(tag)}(?![\\w-])`).test(css);

/** Codes of the whole page, outside <pre>. */
const allCodes = codesOf(page.body);

/** Every `class="…"` of a code sample, decoded: luz-, o- and u- classes only (the docs' own are not LUZ's). */
const classesInMarkup = () => {
  const text = `${page.body}\n${[...page.body.matchAll(/<pre\b[\s\S]*?<\/pre>/g)].map((m) => textOf(m[0])).join("\n")}`;
  const out = new Set();
  for (const m of text.matchAll(/\bclass=(?:"|&quot;)([^"&]+)/g)) {
    for (const c of m[1].split(/\s+/)) if (/^(luz|o|u)-[\w-]+$/.test(c) && !c.endsWith("-")) out.add(c);
  }
  return [...out];
};

/* ---- VERSIONING.md ------------------------------------------------------- */

const versioning = readFileSync(join(repo, "VERSIONING.md"), "utf-8");
const surfaces = () => {
  const block = versioning.split(/^## What is public API\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  return [...block.matchAll(/^\|\s*\*\*([^*|]+)\*\*\s*\|/gm)].map((m) => m[1].trim());
};
const repoUrl = () => {
  const url = JSON.parse(readFileSync(join(repo, "packages/core/package.json"), "utf-8")).repository.url;
  return /github\.com\/([^/]+\/[^/.]+)/.exec(url)[1];
};

describe("the page is the seven sections of the spec", () => {
  it("has an h2 for classes, tokens, attributes, elements, layers, public and files, in that order", () => {
    expect(h2Ids(page)).toEqual(IDS);
  });

  it("links out for packages and for layers instead of repeating them", () => {
    const hrefs = linksOf(page.body).map((l) => l.href);
    expect(hrefs).toContain("/docs/get-started/structure/");
    expect(hrefs).toContain("/docs/get-started/layers/");
  });
});

describe("classes", () => {
  const prefixTable = () => {
    const t = tablesOf(section("classes")).find((tb) => tb.rows.length > 0 && tb.rows.every((r) => /^\.[a-z-]+-$/.test(r.cells[0].codes[0] ?? "")));
    if (!t) throw new Error("#classes has no table whose first column is the prefixes (<code>.luz-</code>, <code>.o-</code>, …)");
    return t;
  };
  const prefixes = () => prefixTable().rows.map((r) => r.cells[0].codes[0]);

  it("has the table of prefixes of the spec", () => {
    for (const prefix of PREFIXES) expect(prefixes(), `no row for ${prefix}`).toContain(prefix);
  });

  it("keeps to prefixes the packages' CSS uses", () => {
    for (const prefix of prefixes()) expect(hasPrefix(prefix), `${prefix} occurs in no package's CSS`).toBe(true);
  });

  it("says a state mirror (.is-) is not for styling from outside", () => {
    const row = prefixTable().rows.find((r) => r.cells[0].codes[0] === ".is-");
    expect(row, "a row for .is-").toBeTruthy();
    expect(row.cells.map((c) => c.text).join(" ")).toMatch(/\b(not|never)\b/i);
  });

  it("reads one BEM example, a part and a variant", () => {
    const codes = codesOf(section("classes"));
    expect(codes.some((c) => /^\.[\w-]+__[\w-]+$/.test(c)), "a part, like .luz-card__title").toBe(true);
    expect(codes.some((c) => /^\.[\w-]+--[\w-]+$/.test(c)), "a variant, like .luz-btn--primary").toBe(true);
  });

  it("names only classes that exist in the CSS", () => {
    const named = allCodes.filter((c) => /^\.(luz|o|u|is)-[\w-]+$/.test(c) && !c.endsWith("-"));
    expect(named.length, "the page names classes in <code>").toBeGreaterThan(0);
    for (const c of named) expect(hasClass(c), `${c} is in no package's CSS`).toBe(true);
  });

  it("writes only classes that exist in its code samples", () => {
    expect(classesInMarkup().length, "a sample with LUZ classes (the worked example)").toBeGreaterThan(0);
    for (const c of classesInMarkup()) expect(hasClass(c), `class "${c}" in a sample is in no package's CSS`).toBe(true);
  });
});

describe("tokens", () => {
  it("names only custom properties that are declared", () => {
    const known = declaredTokens();
    const named = allCodes.filter((c) => /^--luz-[a-z0-9-]+$/.test(c));
    expect(named.length).toBeGreaterThan(0);
    for (const t of named) {
      if (t.endsWith("-")) expect([...known].some((k) => k.startsWith(t)), `no token starts with ${t}`).toBe(true);
      else expect(known.has(t), `${t} is declared by no token file`).toBe(true);
    }
  });

  it("gives an example of each kind: a few tokens, and a knob", () => {
    const named = new Set(codesOf(section("tokens")).filter((c) => /^--luz-[a-z0-9-]+$/.test(c)));
    expect(named.size, "five or more tokens named under #tokens").toBeGreaterThanOrEqual(5);
    expect([...named].some((t) => ["--luz-type-base", "--luz-type-ratio", "--luz-space-unit"].includes(t)), "a knob (--luz-type-base)").toBe(true);
  });

  it("links the five token pages", () => {
    const pages = new Set(linksOf(section("tokens")).map((l) => /^\/docs\/tokens\/([a-z-]+)\/$/.exec(l.href)?.[1]).filter(Boolean));
    expect(pages.size).toBeGreaterThanOrEqual(5);
    for (const slug of pages) expect(existsSync(join(repo, "apps/docs/pages/tokens", `${slug}.html`)), `/docs/tokens/${slug}/`).toBe(true);
  });
});

describe("attributes", () => {
  const named = () =>
    [...new Set(codesOf(section("attributes")).filter((c) => /^data-[a-z0-9-]+\*?(?:=.*)?$/.test(c)).map((c) => c.replace(/=.*$/, "")))];

  it("names data-theme, data-mode, data-luz-* and data-luz-label-*", () => {
    for (const a of ATTRIBUTES) expect(named(), a).toContain(a);
  });

  it("gives a few examples, not the full list", () => {
    expect(named().length).toBeGreaterThanOrEqual(5);
    expect(named().length).toBeLessThanOrEqual(8);
  });

  it("names only attributes that occur in a package's source", () => {
    const every = [...new Set(allCodes.filter((c) => /^data-[a-z0-9-]+\*?(?:=.*)?$/.test(c)).map((c) => c.replace(/=.*$/, "")))];
    expect(every.length).toBeGreaterThan(0);
    for (const a of every) {
      expect(a, "data-docs-* hooks are the docs site's, not LUZ's").not.toMatch(/^data-docs-/);
      expect(everything.includes(a.replace(/\*$/, "")), `${a} occurs in no package's source`).toBe(true);
    }
  });
});

describe("elements", () => {
  const tags = () => codesOf(section("elements")).map((c) => /^<(luz-[a-z-]+)>$/.exec(c)?.[1]).filter(Boolean);

  it("names the three that need a script and the three CSS-only tags", () => {
    for (const tag of ELEMENTS) expect(tags(), `<${tag}>`).toContain(tag);
  });

  it("names only tags the source defines or styles", () => {
    const every = [...new Set(allCodes.map((c) => /^<(luz-[a-z-]+)>$/.exec(c)?.[1]).filter(Boolean))];
    expect(every.length).toBeGreaterThan(0);
    for (const tag of every) expect(isDefinedTag(tag), `<${tag}> is defined and styled nowhere in packages/*/src`).toBe(true);
  });

  it("says they are light DOM and that the CSS-only ones are styled before and without a script", () => {
    const text = textOf(section("elements"));
    expect(text).toMatch(/light DOM/i);
    expect(text).toMatch(/style[^.]*without[^.]*script/i);
  });
});

describe("layers", () => {
  it("is one paragraph with the link to Cascade layers, and no list", () => {
    const html = section("layers");
    expect((html.match(/<p\b/g) ?? []).length).toBe(1);
    expect(html).not.toMatch(/<(ul|ol|table|dl)\b/);
    expect(linksOf(html).map((l) => l.href)).toContain("/docs/get-started/layers/");
  });

  it("does not list the layers (that is LAYERS in scripts/luz-layers.js, shown by Cascade layers)", () => {
    const text = textOf(page.body);
    const named = LAYERS.filter((l) => new RegExp(`\\bluz\\.${l}\\b`).test(text));
    expect(named.length, `names ${named.join(", ")}`).toBeLessThanOrEqual(2);
  });
});

describe("public", () => {
  const items = () => [...section("public").matchAll(/<li\b[^>]*>\s*<strong>([^<]+)<\/strong>/g)].map((m) => m[1].trim());

  it("reads the first column of the What is public API table of VERSIONING.md", () => {
    const real = surfaces();
    expect(real.length, "VERSIONING.md has the table").toBeGreaterThan(0);
    expect(items().length, "four <li>, each starting with <strong>Surface</strong>").toBe(4);
    expect(new Set(items()).size).toBe(4);
    for (const s of items()) expect(real, `"${s}" is not a surface of VERSIONING.md`).toContain(s);
  });

  it("says that in beta anything may break, with a changeset that says how to migrate", () => {
    const text = textOf(section("public"));
    expect(text).toMatch(/in beta,? anything may break/i);
    expect(text).toMatch(/changeset/i);
    expect(text).toMatch(/migrat/i);
  });

  it("links VERSIONING.md on GitHub", () => {
    const re = new RegExp(`^https://github\\.com/${escapeRe(repoUrl())}/blob/[^/]+/VERSIONING\\.md(?:#.*)?$`);
    expect(linksOf(section("public")).some((l) => re.test(l.href))).toBe(true);
  });
});

describe("files", () => {
  const table = () => {
    const t = tablesOf(section("files")).find((tb) => columnOf(tb, /^file/i) >= 0 && columnOf(tb, /^package/i) >= 0);
    if (!t) throw new Error('#files has no table with a "File" and a "Package" column');
    return t;
  };
  /** A file as the page writes it ("components/<name>.css") against pack-files.txt: the path under dist/. */
  const shipped = (pkg, file) => {
    const pattern = new RegExp(`^dist/${file.split(/<[^>]+>/).map(escapeRe).join("[^/]+")}$`);
    return packFiles(pkg).some((line) => pattern.test(line));
  };

  it("has a table of file, package and when to load it", () => {
    const t = table();
    expect(columnOf(t, /^when/i), 'a "When to load it" column').toBeGreaterThanOrEqual(0);
  });

  it("names the files of the spec", () => {
    const t = table();
    const files = t.rows.map((r) => r.cells[columnOf(t, /^file/i)].codes[0]);
    for (const f of FILES) expect(files, f).toContain(f);
    expect(textOf(section("files"))).toMatch(/\.min\b/);
  });

  it("names for each file the package whose pack-files.txt lists it", () => {
    const t = table();
    const fileCol = columnOf(t, /^file/i);
    const pkgCol = columnOf(t, /^package/i);
    expect(t.rows.length).toBeGreaterThan(0);
    for (const row of t.rows) {
      const file = row.cells[fileCol].codes[0];
      const pkg = row.cells[pkgCol].text.replace(/^@luz-ds\//, "").trim();
      expect(PACKAGES, `${file}: "${pkg}" is not a package`).toContain(pkg);
      expect(shipped(pkg, file), `${file} is not in packages/${pkg}/pack-files.txt`).toBe(true);
    }
  });

  it("names no other file the packages do not ship", () => {
    const named = allCodes.filter((c) => /^[\w<>/-]+(?:\.min)?\.(css|js|json)$/.test(c) && !c.includes("*"));
    expect(named.length).toBeGreaterThan(0);
    for (const file of named) {
      expect(PACKAGES.some((pkg) => shipped(pkg, file) || packFiles(pkg).includes(file)), `${file} is in no package's pack-files.txt`).toBe(true);
    }
  });
});
