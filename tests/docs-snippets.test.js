/**
 * The snippet generator (F4 step 5, spec f4-customisation.md 3.4): the page
 * "Choose your snippet" is written by scripts/docs-site/snippets.js from the
 * files that npm pack ships, so a hash and a version can never be typed by hand.
 *
 *   snippetData({ root, readFile })  reads each package's package.json and the
 *                                    dist files of the table of 3.4.1
 *   renderSnippets(data)             pure: the HTML of 3.4.2 (the index table,
 *                                    the eight snippets, the chunks table)
 *
 * The checks read the rendered HTML, not the shape of `data`: that is what a
 * reader copies. Two roots are used: the repository (the real dist/, the real
 * pack-files.txt) and a fixture root with a distinct version and distinct
 * content per file, so a version or a hash taken from the wrong place fails.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { renderSnippets, snippetData } from "../scripts/docs-site/snippets.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- What the spec fixes (3.4.1): files per package, the eight ids -------- */

const FILES = {
  tokens: ["luz-tokens.min.css"],
  core: ["luz.min.css", "luz.min.js", "midi.min.js", "table-sort.min.js", "timeline.min.js"],
  site: ["site.min.css", "site.min.js", "search.min.js", "consent.min.js"],
  landing: ["landing.min.css"],
  cms: ["cms.min.css"],
  app: ["app.min.css"],
};
const KIND_PACKAGE = { atoms: null, landing: "landing", blog: "cms", app: "app" };
const KINDS = Object.keys(KIND_PACKAGE);
const IDS = KINDS.flatMap((k) => [`${k}-npm`, `${k}-cdn`]);

/** What each CDN snippet loads, in order: stylesheets then scripts. */
const cdnFor = (kind) => {
  const pkg = KIND_PACKAGE[kind];
  const withSite = pkg !== null;
  return {
    css: [["tokens", "luz-tokens.min.css"], ["core", "luz.min.css"], ...(withSite ? [["site", "site.min.css"], [pkg, `${pkg}.min.css`]] : [])],
    js: [["core", "luz.min.js"], ...(withSite ? [["site", "site.min.js"]] : [])],
  };
};

/* ---- The two roots ------------------------------------------------------- */

const temps = [];
afterAll(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A root with every file of FILES, each with its own content and a version of its own. */
function fixtureRoot({ without = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "luz-snippets-"));
  temps.push(root);
  Object.entries(FILES).forEach(([pkg, files], i) => {
    const dir = join(root, "packages", pkg);
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: `@luz-ds/${pkg}`, version: `${i + 3}.${i + 7}.${i + 11}` }));
    for (const file of files) {
      if (without.includes(file)) continue;
      writeFileSync(join(dir, "dist", file), `/* ${pkg}/${file}: ${"x".repeat(i + 5)} */\n`);
    }
  });
  return root;
}

/** `readFile(path)` of the API: absolute (or relative to the root), returns the bytes. */
const readerOf = (root) => (path, encoding) => readFileSync(isAbsolute(path) ? path : join(root, path), encoding);

const build = (root) => renderSnippets(snippetData({ root, readFile: readerOf(root) }));

const fixture = fixtureRoot();
const ROOTS = [
  ["the repository", repo],
  ["a fixture root", fixture],
];

/* ---- Reading the rendered HTML ------------------------------------------- */

const unescape = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** The text of `<code id="code-<id>">`, tags of a highlighter removed, entities decoded. */
const codeOf = (html, id) => {
  const m = new RegExp(`<code[^>]*\\bid="code-${id}"[^>]*>([\\s\\S]*?)</code>`).exec(html);
  return m ? unescape(m[1].replace(/<[^>]+>/g, "")) : null;
};

/** The `link` and `script` tags of a text: their attributes. */
const tagsOf = (text) =>
  [...text.matchAll(/<(link|script)\b([^>]*)>/g)].map(([, tag, attrs]) => {
    const a = Object.fromEntries([...attrs.matchAll(/([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    return { tag, ...a, url: a.href ?? a.src };
  });

const URL_RE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/([a-z]+)@([^/]+)\/dist\/([^/]+)$/;
const parts = (url) => {
  const m = URL_RE.exec(url ?? "");
  expect(m, `${url} is https://cdn.jsdelivr.net/npm/@luz-ds/<pkg>@<version>/dist/<file>`).not.toBeNull();
  return { pkg: m[1], version: m[2], file: m[3] };
};

const sri = (root, pkg, file) => `sha384-${createHash("sha384").update(readFileSync(join(root, "packages", pkg, "dist", file))).digest("base64")}`;
const versionOf = (root, pkg) => JSON.parse(readFileSync(join(root, "packages", pkg, "package.json"), "utf-8")).version;

/** The markup of one snippet: from its opening tag to the next snippet or the end of its section. */
const snippetOf = (html, id) => {
  const at = html.search(new RegExp(`\\bid="${id}"`));
  expect(at, `#${id} exists`).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<", at);
  const afterOpen = html.indexOf(">", start) + 1;
  const next = html.slice(afterOpen).search(/data-snippet\b|<\/section>/);
  return html.slice(start, next < 0 ? undefined : afterOpen + next);
};

/** Every `<code>` of the page, decoded: where the modulepreload lines are. */
const allCode = (html) => [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)].map((m) => unescape(m[1].replace(/<[^>]+>/g, "")));

/* ---- The tests ----------------------------------------------------------- */

describe("the snippet generator", () => {
  it("renders the same HTML from the same data twice (renderSnippets is pure)", () => {
    const data = snippetData({ root: fixture, readFile: readerOf(fixture) });
    expect(typeof renderSnippets(data)).toBe("string");
    expect(renderSnippets(data)).toBe(renderSnippets(data));
    expect(renderSnippets(snippetData({ root: fixture, readFile: readerOf(fixture) }))).toBe(renderSnippets(data));
  });

  it("has the eight snippets, each an element with its id, data-snippet, data-kind and data-via", () => {
    const html = build(fixture);
    for (const id of IDS) {
      expect(html.match(new RegExp(`\\bid="${id}"`, "g"))?.length, `#${id} once`).toBe(1);
      const [kind, via] = id.split("-");
      const open = snippetOf(html, id).match(/^<[^>]*>/)[0];
      expect(open, id).toMatch(/\bdata-snippet\b/);
      expect(open, id).toContain(`data-kind="${kind}"`);
      expect(open, id).toContain(`data-via="${via}"`);
      expect(codeOf(html, id), `${id} has its code block`).not.toBeNull();
    }
  });

  it("has an index table that links to each of the eight snippets", () => {
    const html = build(fixture);
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0] ?? "";
    for (const id of IDS) {
      expect(table, `the table links to #${id}`).toContain(`href="#${id}"`);
      expect(html, `#${id} is an element`).toMatch(new RegExp(`\\bid="${id}"`));
    }
  });

  it("has a section of its own for the chunks", () => {
    expect(build(fixture)).toMatch(/\bid="chunks"/);
  });

  for (const [label, root] of ROOTS) {
    describe(`with ${label}`, () => {
      const html = build(root);

      for (const kind of KINDS) {
        it(`${kind}, from a CDN: the files of its table, tokens then core then site then the kind, every line with its own hash`, () => {
          const tags = tagsOf(codeOf(html, `${kind}-cdn`));
          const want = cdnFor(kind);
          const sheets = tags.filter((t) => t.tag === "link");
          const scripts = tags.filter((t) => t.tag === "script");
          expect(sheets.map((t) => `${parts(t.url).pkg}/${parts(t.url).file}`)).toEqual(want.css.map(([p, f]) => `${p}/${f}`));
          expect(scripts.map((t) => `${parts(t.url).pkg}/${parts(t.url).file}`)).toEqual(want.js.map(([p, f]) => `${p}/${f}`));
          for (const t of sheets) expect(t.rel, t.url).toBe("stylesheet");
          for (const t of scripts) expect(t.type, t.url).toBe("module");
          for (const t of tags) {
            const { pkg, version, file } = parts(t.url);
            expect(version, `${t.url}: the version of the package`).toBe(versionOf(root, pkg));
            expect(t.integrity, `${t.url}: sha384 of packages/${pkg}/dist/${file}`).toBe(sri(root, pkg, file));
            expect(t.crossorigin, t.url).toBe("anonymous");
          }
        });

        it(`${kind}, with npm: install command and imports in layer order, core's script after the styles`, () => {
          const pkg = KIND_PACKAGE[kind];
          const el = snippetOf(html, `${kind}-npm`);
          const add = ["@luz-ds/tokens", "@luz-ds/core", ...(pkg ? ["@luz-ds/site", `@luz-ds/${pkg}`] : [])];
          expect(el).toContain(`data-copy="pnpm add ${add.join(" ")}"`);
          const code = codeOf(html, `${kind}-npm`);
          const imports = [...code.matchAll(/\bimport\s+["']([^"']+)["']/g)].map((m) => m[1]);
          const css = imports.filter((s) => s.endsWith("/css"));
          expect(css).toEqual(add.map((p) => `${p}/css`));
          const js = imports.filter((s) => !s.endsWith("/css")).sort();
          expect(js).toEqual(pkg ? ["@luz-ds/core", "@luz-ds/site"] : ["@luz-ds/core"]);
        });
      }

      it("marks the site lines of landing, blog and app as optional, in both ways of loading", () => {
        for (const kind of KINDS.filter((k) => KIND_PACKAGE[k])) {
          for (const via of ["npm", "cdn"]) expect(codeOf(html, `${kind}-${via}`), `${kind}-${via}`).toMatch(/optional/i);
        }
      });

      it("keeps modulepreload out of the eight snippets: a chunk is fetched only by the page that needs it", () => {
        for (const id of IDS) expect(codeOf(html, id), id).not.toMatch(/modulepreload/);
      });

      it("lists, in the chunks table, exactly the lazy chunks that budgets.json budgets, each with its hash and version", () => {
        const budgets = JSON.parse(readFileSync(join(repo, "budgets.json"), "utf-8")).budgets;
        const budgeted = budgets.filter((b) => /lazy chunk:/.test(b.name)).map((b) => b.file.replace(/^packages\//, ""));
        expect(budgeted.length).toBe(5);
        const section = html.slice(html.search(/\bid="chunks"/));
        const preload = section
          .match(/<code[^>]*>[\s\S]*?<\/code>/g)
          .map((c) => unescape(c.replace(/<[^>]+>/g, "")))
          .flatMap(tagsOf)
          .filter((t) => t.rel === "modulepreload");
        const listed = preload.map((t) => {
          const { pkg, file } = parts(t.url);
          return `${pkg}/dist/${file}`;
        });
        expect(listed.sort()).toEqual([...budgeted].sort());
        for (const t of preload) {
          const { pkg, version, file } = parts(t.url);
          expect(version, t.url).toBe(versionOf(root, pkg));
          expect(t.integrity, t.url).toBe(sri(root, pkg, file));
          expect(t.crossorigin, t.url).toBe("anonymous");
        }
        // each row says when to add the line
        for (const element of ["luz-timeline", "luz-search", "luz-consent"]) expect(section, element).toContain(element);
      });
    });
  }

  it("takes each version from its own package.json: the six fixture versions are all different", () => {
    const html = build(fixture);
    const versions = new Set(tagsOf(codeOf(html, "app-cdn")).map((t) => parts(t.url).version));
    expect(versions.size).toBe(4); // tokens, core, site, app
    expect(versions.has(versionOf(fixture, "tokens"))).toBe(true);
    expect(versions.has(versionOf(fixture, "app"))).toBe(true);
  });

  it("lists only files that each package ships (pack-files.txt), so a renamed file fails here", () => {
    const html = build(repo);
    const shipped = Object.fromEntries(
      Object.keys(FILES).map((pkg) => [pkg, new Set(readFileSync(join(repo, "packages", pkg, "pack-files.txt"), "utf-8").split("\n").map((l) => l.trim()))]),
    );
    const urls = new Set(allCode(html).flatMap(tagsOf).map((t) => t.url).filter(Boolean));
    expect(urls.size).toBeGreaterThanOrEqual(9);
    for (const url of urls) {
      const { pkg, file } = parts(url);
      expect(shipped[pkg]?.has(`dist/${file}`), `${url} is in packages/${pkg}/pack-files.txt`).toBe(true);
    }
  });

  describe("a file that is missing", () => {
    for (const file of ["luz-tokens.min.css", "search.min.js"]) {
      it(`fails with the file name and "run pnpm build" (${file})`, () => {
        const root = fixtureRoot({ without: [file] });
        expect(() => snippetData({ root, readFile: readerOf(root) })).toThrow(new RegExp(`${file.replace(/\./g, "\\.")}[\\s\\S]*run pnpm build|run pnpm build[\\s\\S]*${file.replace(/\./g, "\\.")}`));
      });
    }
  });
});

/* ---- Nothing is typed: hashes, and the Install page's lines ----------------- */

describe("the hashes and URLs of the docs are never typed", () => {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

  it("has no sha384- followed by 64 base64 characters in apps/docs/pages/ or in a README", () => {
    const files = [
      ...walk(join(repo, "apps/docs/pages")),
      join(repo, "README.md"),
      ...readdirSync(join(repo, "packages"))
        .map((p) => join(repo, "packages", p, "README.md"))
        .filter(existsSync),
    ];
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const typed = readFileSync(file, "utf-8").match(/sha384-[A-Za-z0-9+/]{64}/g);
      expect(typed, file).toBeNull();
    }
  });

  describe("the Install page", () => {
    const raw = readFileSync(join(repo, "apps/docs/pages/get-started/index.html"), "utf-8");
    const source = unescape(raw);
    const html = build(repo);
    const urlsOf = (text) => tagsOf(text).map((t) => t.url);

    it("uses only URLs the generator writes: same package, same version, same file", () => {
      const generated = new Set(allCode(html).flatMap((c) => c.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/[^\s"'<>]+/g) ?? []));
      const typed = source.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/[^\s"'<>]+/g) ?? [];
      expect(typed.length).toBeGreaterThan(10);
      for (const url of new Set(typed)) expect(generated.has(url), `${url} is a generated URL`).toBe(true);
    });

    it("loads in each block the generated lines without integrity: level 2 is Components only, landing, cms and app are theirs", () => {
      const block = (id) => {
        const text = codeOf(raw, id);
        expect(text, `#code-${id} on the Install page`).toBeTruthy();
        return urlsOf(text);
      };
      const isSubsequence = (small, big) => {
        let i = 0;
        for (const x of big) if (x === small[i]) i++;
        return i === small.length;
      };
      const generated = (kind) => {
        const { css, js } = cdnFor(kind);
        return urlsOf(codeOf(html, `${kind}-cdn`)).filter((u) => [...css, ...js].some(([p, f]) => parts(u).pkg === p && parts(u).file === f));
      };
      // the same lines in the same order, for the one block that is a whole kind
      expect(block("cdn-level-2")).toEqual(generated("atoms"));
      for (const [id, kind] of [["cdn-landing", "landing"], ["cdn-cms", "blog"], ["cdn-app", "app"]]) {
        expect(isSubsequence(block(id), generated(kind)), `${id} is lines of the ${kind} snippet, in its order`).toBe(true);
      }
    });

    it("gives the install commands the generator gives", () => {
      const commands = new Set([...source.matchAll(/data-copy="(pnpm add [^"]+)"/g)].map((m) => m[1]));
      for (const kind of KINDS) {
        const pkg = KIND_PACKAGE[kind];
        const add = `pnpm add ${["@luz-ds/tokens", "@luz-ds/core", ...(pkg ? ["@luz-ds/site", `@luz-ds/${pkg}`] : [])].join(" ")}`;
        expect(commands.has(add), add).toBe(true);
        expect(snippetOf(html, `${kind}-npm`)).toContain(`data-copy="${add}"`);
      }
    });
  });
});
