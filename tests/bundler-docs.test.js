/**
 * "With a bundler or framework" (F4 step 9, spec f4-customisation.md 3.2):
 * apps/docs/pages/get-started/bundler.html says how to import LUZ in Astro
 * and in any tool that resolves package names. The facts it states are held
 * against the source, so the page cannot drift:
 *
 *   - every `@luz-ds/<pkg>/<subpath>` it writes is an entry of that
 *     package's `exports` (a `./components/*` pattern resolves to a file the
 *     package ships), and the exports table lists exactly the keys;
 *   - the peer range it quotes is the one core declares;
 *   - it says plainly that only Astro was built, dates that build, and
 *     claims nothing for Vite, Next, Nuxt or SvelteKit;
 *   - `vite.ssr.noExternal` is offered as a fix, never as a requirement;
 *   - the manual note tests/manual/astro-build.md has the same version and
 *     date as the "Built with Astro" line.
 *
 * The Astro build itself is not a test (about 200 packages and a network):
 * it is the manual note, re-run in F8 against the published packages.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACKAGES } from "../scripts/luz-packages.js";
import { columnOf, declaredTokens, h2Ids, linksOf, packFiles, preOf, readPage, repo, sectionsOf, sentencesOf, tablesOf, textOf } from "./helpers/page-facts.js";

const IDS = ["imports", "order", "astro", "others", "fonts", "cdn", "problems"];
const MANUAL = join(repo, "tests/manual/astro-build.md");

const page = readPage("get-started/bundler.html");
const sections = sectionsOf(page.body);
const section = (id) => {
  const s = sections.get(id);
  if (!s) throw new Error(`bundler.html has no <h2 id="${id}">`);
  return s.html;
};
/** What a reader reads in a section: its text and its code blocks. */
const readable = (id) => `${textOf(section(id))}\n${preOf(section(id)).join("\n")}`;

const pkgJson = (name) => JSON.parse(readFileSync(join(repo, "packages", name, "package.json"), "utf-8"));
const exportsOf = (name) => pkgJson(name).exports;

/** `@luz-ds/<pkg>/<subpath>` names written anywhere on the page, code blocks included. */
function specifiers() {
  const all = `${textOf(page.body)}\n${preOf(page.body).join("\n")}`;
  const found = new Set();
  for (const m of all.matchAll(/@luz-ds\/([a-z]+)((?:\/[A-Za-z0-9_.*<>-]+)*)/g)) {
    found.add(`@luz-ds/${m[1]}${m[2]}`.replace(/[.,;:)]+$/, ""));
  }
  return [...found];
}

/** The entry of `exports` a specifier resolves to: { key, rest } (rest: what a `*` stands for), or null. */
function resolveSpecifier(spec) {
  const [, name, sub = ""] = /^@luz-ds\/([a-z]+)(\/.*)?$/.exec(spec);
  const map = exportsOf(name);
  const want = sub ? `.${sub}` : ".";
  if (want in map) return { name, key: want, rest: null };
  for (const key of Object.keys(map)) {
    if (!key.includes("*")) continue;
    const [head, tail] = key.split("*");
    if (want.startsWith(head) && want.endsWith(tail) && want.length > head.length + tail.length) {
      return { name, key, rest: want.slice(head.length, want.length - tail.length) };
    }
  }
  return null;
}

describe("the page is the seven sections of the spec", () => {
  it("has an h2 for imports, order, astro, others, fonts, cdn and problems, in that order", () => {
    expect(h2Ids(page)).toEqual(IDS);
  });
});

describe("every import the page writes exists", () => {
  it("names the imports the spec shows", () => {
    const names = specifiers();
    for (const spec of ["@luz-ds/tokens/css", "@luz-ds/core/css", "@luz-ds/core", "@luz-ds/site/css", "@luz-ds/tokens/tokens.css"]) {
      expect(resolveSpecifier(spec), `${spec} is not an export: the spec's list is stale`).not.toBeNull();
      expect(names, `the page never writes ${spec}`).toContain(spec);
    }
  });

  it("resolves every specifier with a subpath to an entry of the matching package.json exports", () => {
    const names = specifiers();
    expect(names.length).toBeGreaterThan(0);
    for (const spec of names) {
      const name = /^@luz-ds\/([a-z]+)/.exec(spec)[1];
      expect(PACKAGES, `${spec}: @luz-ds/${name} is not a published package`).toContain(name);
      // a bare name is a package named in prose or the "." import: only the subpaths are looked up
      if (spec === `@luz-ds/${name}`) continue;
      expect(resolveSpecifier(spec), `${spec} is not in the exports of @luz-ds/${name}`).not.toBeNull();
    }
  });

  it("points every ./components/* import at a stylesheet the package ships", () => {
    const withFile = specifiers().filter((s) => /\/components\/[^<*]+$/.test(s));
    expect(withFile.length, "write at least one component import by name, e.g. @luz-ds/core/components/button.css").toBeGreaterThan(0);
    for (const spec of withFile) {
      const hit = resolveSpecifier(spec);
      expect(hit?.rest, spec).toBeTruthy();
      const target = exportsOf(hit.name)[hit.key].replace("*", hit.rest).replace(/^\.\//, "");
      expect(packFiles(hit.name), `${spec} -> ${target} is not in pack-files.txt`).toContain(target);
      const base = hit.rest.replace(/\.min\.css$|\.css$/, "");
      expect(existsSync(join(repo, "packages", hit.name, "src/components", `${base}.css`)), `${spec}: no src/components/${base}.css`).toBe(true);
    }
  });

  it("writes only custom properties that exist", () => {
    const known = declaredTokens();
    const text = `${textOf(page.body)}\n${preOf(page.body).join("\n")}`;
    const used = [...new Set([...text.matchAll(/--luz-[a-z0-9-]+/g)].map((m) => m[0].replace(/-+$/, "")))];
    expect(used.length).toBeGreaterThan(0);
    for (const token of used) expect(known.has(token), `${token} is not declared by tokens or core settings`).toBe(true);
  });
});

describe("the exports table equals the exports of each package", () => {
  // One table in #imports: a row per export. Columns "Package" (the
  // <code>@luz-ds/<name></code>) and "Export" (the <code>./css</code> key).
  const table = () => {
    const found = tablesOf(section("imports")).find((t) => columnOf(t, /^package/i) >= 0 && columnOf(t, /^export/i) >= 0);
    if (!found) throw new Error('#imports has no table with a "Package" and an "Export" column');
    return found;
  };

  it("has a table with a Package column and an Export column in #imports", () => {
    expect(() => table()).not.toThrow();
  });

  it.each(PACKAGES)("lists every key of @luz-ds/%s, and no other", (name) => {
    const t = table();
    const pkgCol = columnOf(t, /^package/i);
    const keyCol = columnOf(t, /^export/i);
    const listed = t.rows
      .filter((r) => r.cells[pkgCol].text.replace(/\s/g, "") === `@luz-ds/${name}`)
      .map((r) => r.cells[keyCol].codes[0] ?? r.cells[keyCol].text);
    // "./package.json" is an export, not an import anyone writes: the page may leave it out
    const expected = Object.keys(exportsOf(name)).filter((k) => k !== "./package.json").sort();
    expect(listed.filter((k) => k !== "./package.json").sort()).toEqual(expected);
  });
});

describe("what the page claims about its own build", () => {
  it("says plainly, in the others section, that only Astro was built", () => {
    const sentences = sentencesOf(textOf(section("others")));
    const said = sentences.find((s) => /\bonly Astro\b/i.test(s));
    expect(said, 'a sentence with "only Astro" in the section "Vite, Next, Nuxt, SvelteKit"').toBeTruthy();
    expect(said).toMatch(/\b(built|tested|verified)\b/i);
  });

  it("links the own documentation of Vite, Next, Nuxt and SvelteKit", () => {
    const links = linksOf(section("others")).filter((l) => /^https:\/\//.test(l.href));
    for (const re of [/vite/i, /next/i, /nuxt/i, /svelte/i]) {
      expect(links.some((l) => re.test(l.text) || re.test(l.href)), `no external link for ${re}`).toBe(true);
    }
  });

  it("claims no test of Vite, Next, Nuxt, SvelteKit or webpack", () => {
    const named = /\b(Vite|Next(?:\.js)?|Nuxt|SvelteKit|webpack)\b/;
    const claim = /\b(tested|verified|built|checked|confirmed)\b/i;
    const denial = /\b(not|no|never|only|without|untested|unverified)\b|n't/i;
    for (const s of sentencesOf(textOf(page.body))) {
      if (named.test(s) && claim.test(s)) expect(s, "a claim about a tool that was not built").toMatch(denial);
    }
  });

  it('has a dated "Built with Astro <version> on <date>" line in the Astro section', () => {
    const m = /Built with Astro (\d+\.\d+(?:\.\d+)?) on (\d{4}-\d{2}-\d{2})/.exec(textOf(section("astro")));
    expect(m, 'the line "Built with Astro 7.3 on 2026-10-15" (version and ISO date)').toBeTruthy();
    const [, , date] = m;
    expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(date);
    expect(new Date(`${date}T00:00:00Z`).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("says that Astro and LUZ are both in beta, so the page is dated", () => {
    expect(textOf(section("astro"))).toMatch(/\bbeta\b/i);
  });

  it("states the Astro version and the date of tests/manual/astro-build.md", () => {
    const manual = readFileSync(MANUAL, "utf-8");
    const version = /\|\s*Astro\s*\|\s*(\d+\.\d+\.\d+)\s*\|/.exec(manual)?.[1];
    const date = /\|\s*Date\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|/.exec(manual)?.[1];
    expect(version, "the note has an Astro row with x.y.z").toBeTruthy();
    expect(date, "the note has a Date row").toBeTruthy();
    const m = /Built with Astro (\d+\.\d+(?:\.\d+)?) on (\d{4}-\d{2}-\d{2})/.exec(textOf(section("astro")));
    expect(m, "the Built with Astro line").toBeTruthy();
    expect(`${version}.`.startsWith(`${m[1]}.`), `page says Astro ${m[1]}, the note ${version}`).toBe(true);
    expect(m[2]).toBe(date);
  });
});

describe("vite.ssr.noExternal is a fix, not a requirement", () => {
  it("mentions it, only in a sentence that starts from a condition", () => {
    const text = textOf(page.body);
    const hits = sentencesOf(text).filter((s) => s.includes("vite.ssr.noExternal"));
    expect(hits.length, "the page names vite.ssr.noExternal").toBeGreaterThan(0);
    for (const s of hits) {
      expect(s, "a condition: if your tool reports an unresolved import").toMatch(/\bif\b/i);
      expect(s, "never always, must or required").not.toMatch(/\b(always|must|required|mandatory)\b|\bneeds? to\b/i);
    }
  });
});

describe("the Astro example", () => {
  it("shows the project, the three imports, the knob and the commands", () => {
    const text = readable("astro");
    for (const piece of [
      "astro.config.mjs",
      "Base.astro",
      'import "@luz-ds/tokens/css"',
      'import "@luz-ds/core/css"',
      'import "@luz-ds/core"',
      "--luz-type-base",
      "npm create astro@latest",
      "npm install @luz-ds/tokens @luz-ds/core",
      "npm run dev",
    ]) {
      expect(text, `the Astro section never writes ${piece}`).toContain(piece);
    }
  });

  it("puts the consumer's own CSS outside any layer, and says it wins", () => {
    expect(`${textOf(section("order"))} ${textOf(section("astro"))}`).toMatch(/unlayered|outside any layer|without a layer/i);
  });
});

describe("the other sections state what they were asked to", () => {
  it("links Choose your snippet from the imports and from the CDN section", () => {
    for (const id of ["imports", "cdn"]) {
      expect(linksOf(section(id)).map((l) => l.href), id).toContain("/docs/get-started/snippet/");
    }
  });

  it("names tokens.css (no font) in the fonts section", () => {
    const text = readable("fonts");
    expect(text).toContain("@luz-ds/tokens/tokens.css");
    expect(text).toContain("luz-tokens.css");
  });

  it("quotes the peer range core declares for tokens, and links the layers page, under problems", () => {
    const range = pkgJson("core").peerDependencies["@luz-ds/tokens"];
    expect(range).toBeTruthy();
    expect(readable("problems")).toContain(range);
    expect(linksOf(section("problems")).map((l) => l.href)).toContain("/docs/get-started/layers/");
  });

  it("says in the others section that a module imports on the server with no side effect", () => {
    expect(textOf(section("others"))).toMatch(/server/i);
    expect(textOf(section("others"))).toMatch(/side effect/i);
  });
});

describe("tests/manual/astro-build.md, the manual record of the build", () => {
  const manual = () => readFileSync(MANUAL, "utf-8");

  it("exists", () => {
    expect(existsSync(MANUAL)).toBe(true);
  });

  it("dates the run and names the Astro and Node versions", () => {
    const text = manual();
    expect(text).toMatch(/\|\s*Date\s*\|\s*\d{4}-\d{2}-\d{2}\s*\|/);
    expect(text).toMatch(/\|\s*Astro\s*\|\s*\d+\.\d+\.\d+\s*\|/);
    expect(text).toMatch(/\|\s*Node\s*\|\s*\d+\.\d+\.\d+\s*\|/);
  });

  it("lists what is verified and what is not, with the four tools the page must not claim", () => {
    const text = manual();
    expect(text).toMatch(/^## What is verified/m);
    const notVerified = text.split(/^## Not verified/m)[1];
    expect(notVerified, 'a "## Not verified" section').toBeTruthy();
    for (const tool of ["Vite", "Next", "Nuxt", "SvelteKit"]) expect(notVerified).toContain(tool);
  });
});
