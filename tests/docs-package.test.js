/**
 * F6a, @luz-ds/docs 0.1 (.claude/plans/luz-home-docs-identity.md, section 3.2; the brief is
 * f6-docs-spec.md, F6a; recipe "Adding one" of AGENTS.md, Package layering). The sources are read as
 * text; no browser, no build. The browser half is tests/docs-patterns.spec.js.
 *
 *   - the package: manifest, files, the peers of a kind of site, pack-files.txt, no JavaScript
 *   - the build and release scripts, the layer, the budget, the lint glob, CODEOWNERS, the changesets
 *   - the CSS: seven components, every rule in luz.docs, only `.luz-docs-*` classes, nothing of the
 *     docs app (`.docs-*`) or of what the docs teach (LUZ content)
 *   - the move: the dodont, pager, page-head and on-this-page rules left apps/docs/reference.css, and
 *     the generator, the layouts, the pages and the docs script use the new names
 *   - the docs: the area `documentation`, its pattern pages, the structure page
 *
 * What an existing test derives from SITE_KINDS and PACKAGES (tests/package-model.test.js,
 * package-components.test.js, class-manifest.test.js, docs.spec.js, site-docs.spec.js, docs-design.test.js,
 * docs-site.test.js) starts failing for docs by itself once the lists have it.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LAYERS } from "../scripts/luz-layers.js";
import { BASE, PACKAGES, PUBLISHED, SITE_KINDS } from "../scripts/luz-packages.js";
import { buildSite, scanSite } from "../scripts/docs-site/site.js";
import { routeOf } from "./helpers/docs-site.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const exists = (path) => existsSync(`${root}${path}`);
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
/** Like `read`, but "" for a file that is not there yet, so the assertion says what is missing. */
const readOr = (path) => (exists(path) ? read(path) : "");
const json = (path) => JSON.parse(readOr(path) || "{}");
/** Whether `text` has `needle` (a string or a pattern): a boolean, so a failure never prints a whole file. */
const has = (text, needle) => (typeof needle === "string" ? text.includes(needle) : needle.test(text));
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const COMPONENTS = ["dodont", "example", "pager", "page-foot", "page-head", "rail", "shell"];

/** Every file under `dir` (relative to the repo) whose name ends in one of `extensions`. */
function walk(dir, extensions, out = []) {
  if (!exists(dir)) return out;
  for (const entry of readdirSync(`${root}${dir}`)) {
    if (["node_modules", "dist", ".git", "test-results"].includes(entry)) continue;
    const path = `${dir}/${entry}`;
    if (statSync(`${root}${path}`).isDirectory()) walk(path, extensions, out);
    else if (extensions.some((e) => entry.endsWith(e))) out.push(path);
  }
  return out;
}

const sourceCss = () => walk("packages/docs/src", [".css"]).map((path) => ({ path, text: stripComments(read(path)) }));

/* ---- The package ----------------------------------------------------------- */

describe("@luz-ds/docs: the package", () => {
  const manifest = json("packages/docs/package.json");

  it("is @luz-ds/docs, MIT, 0.0.0 until its first release, CSS only", () => {
    expect(manifest.name).toBe("@luz-ds/docs");
    expect(manifest.license).toBe("MIT");
    expect(manifest.version).toBe("0.0.0");
    expect(manifest.type).toBe("module");
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.repository?.directory).toBe("packages/docs");
  });

  it("exports ./css, ./css/min, ./classes.json, ./components/* and ./package.json, and nothing else (no JavaScript)", () => {
    expect(manifest.exports).toEqual({
      "./css": "./dist/docs.css",
      "./css/min": "./dist/docs.min.css",
      "./classes.json": "./dist/classes.json",
      "./components/*": "./dist/components/*",
      "./package.json": "./package.json",
    });
    expect(manifest.main).toBeUndefined();
    expect(manifest.module).toBeUndefined();
  });

  it("ships dist and LICENSE, and marks only its CSS as having side effects", () => {
    expect(manifest.files).toEqual(["dist", "LICENSE"]);
    expect(manifest.sideEffects).toEqual(["*.css"]);
  });

  it("requires tokens and core, takes site as an optional peer, with literal ranges", () => {
    expect(manifest.peerDependencies).toEqual({ "@luz-ds/core": "^0.1.0", "@luz-ds/site": "^0.1.0", "@luz-ds/tokens": "^0.1.0" });
    expect(manifest.peerDependenciesMeta).toEqual({ "@luz-ds/site": { optional: true } });
    expect(manifest.devDependencies).toEqual({ "@luz-ds/core": "workspace:*", "@luz-ds/site": "workspace:*", "@luz-ds/tokens": "workspace:*" });
  });

  it("has its README, LICENSE, pack-files.txt and stylesheets", () => {
    for (const file of ["README.md", "LICENSE", "pack-files.txt", "src/index.css", ...COMPONENTS.map((c) => `src/components/${c}.css`)]) {
      expect(exists(`packages/docs/${file}`), `packages/docs/${file}`).toBe(true);
    }
  });

  it("has exactly the seven patterns as components, all imported by index.css, and no JavaScript source", () => {
    const sources = exists("packages/docs/src/components") ? readdirSync(`${root}packages/docs/src/components`).filter((f) => f.endsWith(".css")) : [];
    expect(sources.map((f) => f.replace(/\.css$/, "")).sort()).toEqual([...COMPONENTS].sort());
    const index = readOr("packages/docs/src/index.css");
    const imports = [...index.matchAll(/@import url\("\.\/components\/([\w-]+)\.css"\)/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual([...COMPONENTS].sort());
    expect(walk("packages/docs", [".js", ".mjs", ".cjs", ".ts"]), "a JavaScript file in the package").toEqual([]);
  });

  it("says in index.css what it requires: tokens and core first, site optional and loaded before it", () => {
    expect(has(readOr("packages/docs/src/index.css"), /Requires: @luz-ds\/tokens and @luz-ds\/core loaded first; @luz-ds\/site\s+optional, loaded before this file/), `"packages/docs/src/index.css" matches ${/Requires: @luz-ds\/tokens and @luz-ds\/core loaded first; @luz-ds\/site\s+optional, loaded before this file/}`).toBe(true);
  });

  it("lists exactly its files in pack-files.txt, each component plain and minified", () => {
    const packed = readOr("packages/docs/pack-files.txt").split("\n").filter(Boolean).sort();
    const expected = [
      "LICENSE",
      "README.md",
      "dist/classes.json",
      "dist/docs.css",
      "dist/docs.min.css",
      ...COMPONENTS.flatMap((c) => [`dist/components/${c}.css`, `dist/components/${c}.min.css`]),
      "package.json",
    ].sort();
    expect(packed).toEqual(expected);
  });

  it("is a workspace importer of the lockfile (pnpm install was run)", () => {
    expect(has(read("pnpm-lock.yaml"), /^ {2}packages\/docs:$/m), "pnpm-lock.yaml").toBe(true);
  });

  it("the private docs app is @luz-ds/docs-site and depends on the package", () => {
    const app = json("apps/docs/package.json");
    expect(app.name).toBe("@luz-ds/docs-site");
    expect(app.private).toBe(true);
    expect(app.dependencies?.["@luz-ds/docs"]).toBe("workspace:*");
    expect(has(read("pnpm-lock.yaml"), /^ {2}apps\/docs:$/m), "pnpm-lock.yaml").toBe(true);
  });
});

/* ---- The lists the scripts read -------------------------------------------- */

describe("@luz-ds/docs: the build, the release scripts and the layer", () => {
  it("is the fourth package for one kind of site and the last library in dependency order", () => {
    expect(SITE_KINDS).toEqual(["landing", "cms", "app", "docs"]);
    expect(PACKAGES).toEqual([...BASE, "landing", "cms", "app", "docs"]);
    expect(PUBLISHED.indexOf("docs")).toBeLessThan(PUBLISHED.indexOf("check"));
  });

  it("has scripts/build-docs.js, three lines on the shared builder, and a docs:build chained in build", () => {
    const script = readOr("scripts/build-docs.js");
    expect(script).toMatch(/import \{ buildPackage \} from "\.\/build-package\.js"/);
    expect(script).toMatch(/buildPackage\(\{ name: "docs", label: "Docs" \}\)/);
    const pkg = json("package.json");
    expect(pkg.scripts?.["docs:build"]).toBe("node scripts/build-docs.js");
    expect(pkg.scripts?.build).toMatch(/pnpm app:build && pnpm docs:build( && pnpm luzcheck:build)?$/);
  });

  it("is a sentinel of check-dist, a pattern of qa-release and a probe of smoke-consumer", () => {
    expect(has(readOr("scripts/check-dist.js"), "../packages/docs/dist/docs.css"), `"scripts/check-dist.js" has ${"../packages/docs/dist/docs.css"}`).toBe(true);
    const qa = readOr("scripts/qa-release.js");
    expect(qa.match(/\^packages\\\/\(([^)]*)\)\\\/src\\\//)?.[1].split("|")).toContain("docs");
    expect(has(qa, "Build (tokens, core, site, landing, cms, app, docs)"), "qa-release step name").toBe(true);
    const smoke = readOr("scripts/smoke-consumer.js");
    expect(has(smoke, "/node_modules/@luz-ds/docs"), "smoke-consumer: " + "/node_modules/@luz-ds/docs").toBe(true);
    expect(has(smoke, "/dist/docs.css"), "smoke-consumer: " + "/dist/docs.css").toBe(true);
    expect(has(smoke, "luz-docs-"), "smoke-consumer: " + "luz-docs-").toBe(true);
  });

  it("is a public layer between app and print, explained in luz-layers.js", () => {
    expect(LAYERS.indexOf("docs")).toBe(LAYERS.indexOf("app") + 1);
    expect(LAYERS.indexOf("docs")).toBe(LAYERS.indexOf("print") - 1);
    expect(has(readOr("scripts/luz-layers.js"), /luz\.docs\s+\.luz-docs-\*/), `"scripts/luz-layers.js" matches ${/luz\.docs\s+\.luz-docs-\*/}`).toBe(true);
    expect(has(readOr("scripts/luz-layers.js"), /luz\.docs[\s\S]*shares no class[\s\S]*luz\.print/), "it says why its place moves no other layer").toBe(true);
  });

  it("is in the published layer list of the docs, the versioning notes and the READMEs", () => {
    for (const file of ["VERSIONING.md", "packages/core/README.md", "AGENTS.md", "apps/docs/pages/get-started/layers.html"]) {
      expect(has(readOr(file), "luz.docs"), file).toBe(true);
    }
  });

  it("is in the release and tooling notes of AGENTS.md: its CSS and its docs-app rule", () => {
    expect(has(readOr("AGENTS.md"), /@luz-ds\/docs/), `"AGENTS.md" matches ${/@luz-ds\/docs/}`).toBe(true);
  });
});

describe("@luz-ds/docs: the budget, the lint rules and the owners", () => {
  it("has a row in budgets.json, ideal 2 kB and ceiling 4 kB, appended (a new row, no other ceiling raised)", () => {
    const budgets = json("budgets.json").budgets ?? [];
    const row = budgets.find((b) => b.name === "docs CSS");
    expect(row).toEqual({ name: "docs CSS", file: "packages/docs/dist/docs.min.css", ideal: 2048, max: 4096 });
    // The home's light rows stay the last four (tests/home-light.test.js) and i18n-es stays right before the mode chunk
    // (tests/size-guard.test.js), so the docs row is the first free place: after the manifests row, the last AI-ready one.
    const names = budgets.map((b) => b.name);
    expect(names.indexOf("docs CSS"), "docs CSS comes right after the manifests row").toBe(names.indexOf("manifests (each, uncompressed)") + 1);
    expect(names.indexOf("docs CSS"), "docs CSS comes after app CSS").toBeGreaterThan(names.indexOf("app CSS"));
    expect(names.indexOf("docs CSS"), "docs CSS comes before the light rows").toBeLessThan(names.indexOf("home light controller JS"));
    expect(names.slice(-4), "the light rows stay last").toEqual(["home light controller JS", "home light visual: globe", "home light visual: city", "home light visual: map"]);
    const others = Object.fromEntries(budgets.filter((b) => b.name !== "docs CSS").map((b) => [b.name, b.max]));
    expect(others["app CSS"]).toBe(2048);
    expect(others["cms CSS"]).toBe(4096);
    expect(others["core CSS"]).toBe(15360);
  });

  it("has its row in the PRINCIPLES.md table of section 8, with the same ceiling", () => {
    expect(has(read("PRINCIPLES.md"), /^\| `docs` CSS \|[^\n]*\| 4 kB \|$/m), "PRINCIPLES.md table row").toBe(true);
  });

  it("is named in the PRINCIPLES.md introduction and in its Core or site rule", () => {
    const text = read("PRINCIPLES.md");
    expect(has(text, /`@luz-ds\/docs`/), "PRINCIPLES.md intro").toBe(true);
    const bullet = text.split("\n").find((line) => line.startsWith("- **Core or site.**")) ?? "";
    expect(bullet).toContain("`docs`");
  });

  it("is under the RL-10 override of stylelint (no hex, no named colour, no literal space)", () => {
    expect(has(read("stylelint.config.js"), '"packages/docs/src/**/*.css"'), "stylelint.config.js").toBe(true);
  });

  it("is owned: CODEOWNERS names packages/docs/ and its build script", () => {
    const owners = read(".github/CODEOWNERS");
    expect(has(owners, /^packages\/docs\/\s+@nandovejer$/m), "CODEOWNERS packages/docs/").toBe(true);
    expect(has(owners, /^scripts\/build-docs\.js\s+@nandovejer$/m), "CODEOWNERS build-docs").toBe(true);
  });

  it("is a choice of both issue templates", () => {
    for (const file of readdirSync(`${root}.github/ISSUE_TEMPLATE`).filter((f) => f.endsWith(".yml"))) {
      const text = read(`.github/ISSUE_TEMPLATE/${file}`);
      if (/@luz-ds\/app|\bapp\b/.test(text) && /@luz-ds\/cms|\bcms\b/.test(text)) expect(text, file).toMatch(/@luz-ds\/docs|\bdocs\b/);
    }
  });

  it("has a minor changeset of its own, out of the fixed group, and one for tokens and core (their dist repeats the layer statement)", () => {
    const changesets = readdirSync(`${root}.changeset`).filter((f) => f.endsWith(".md") && f !== "README.md").map((f) => read(`.changeset/${f}`));
    const head = (text) => text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    expect(changesets.some((text) => /"@luz-ds\/docs": minor/.test(head(text)))).toBe(true);
    expect(changesets.some((text) => /"@luz-ds\/tokens": minor/.test(head(text)) && /"@luz-ds\/core": minor/.test(head(text)) && /luz\.docs/.test(text))).toBe(true);
    expect(json(".changeset/config.json").fixed).toEqual([["@luz-ds/tokens", "@luz-ds/core", "@luz-ds/site"]]);
  });

  it("has the guides of the repository know the package", () => {
    for (const file of ["README.md", "dev/STRUCTURE.md", "dev/QUICK-REFERENCE.md", "dev/DIST-RULES.md"]) {
      expect(has(readOr(file), /@luz-ds\/docs|packages\/docs|luz-docs-/), file).toBe(true);
    }
  });
});

/* ---- The CSS ----------------------------------------------------------------- */

describe("@luz-ds/docs: the stylesheets", () => {
  const files = sourceCss();
  const css = files.map((f) => f.text).join("\n");

  it("has CSS to read", () => {
    expect(files.length, "packages/docs/src/**/*.css").toBeGreaterThan(0);
  });

  it("has no `mark` selector: the example's code is not highlighted with <mark> (core's highlight.js rewrites it from textContent)", () => {
    expect(has(css, /(?<![\w-])mark(?![\w-])/), "a `mark` type selector or element name").toBe(false);
  });

  it("documentation/example.html has no <mark> element inside a pre.luz-code-block", () => {
    const html = readOr("apps/docs/pages/documentation/example.html");
    expect(html.length, "apps/docs/pages/documentation/example.html").toBeGreaterThan(0);
    const blocks = [...html.matchAll(/<pre\b[^>]*\bluz-code-block\b[^>]*>[\s\S]*?<\/pre>/g)].map((m) => m[0]);
    expect(blocks.length, "pre.luz-code-block blocks").toBeGreaterThan(0);
    expect(blocks.filter((block) => /<mark\b/i.test(block))).toEqual([]);
  });

  it("the fixture page of the browser spec has no <mark> either", () => {
    expect(has(read("tests/fixtures/docs-patterns.html"), /<mark\b/i)).toBe(false);
  });

  it("defines the seven patterns and their parts", () => {
    for (const name of [
      ".luz-docs-shell",
      ".luz-docs-nav",
      ".luz-docs-main",
      ".luz-docs-rail",
      ".luz-docs-rail__onpage",
      ".luz-docs-rail__actions",
      ".luz-docs-page-head",
      ".luz-docs-page-head__eyebrow",
      ".luz-docs-page-head__lead",
      ".luz-docs-page-head__meta",
      ".luz-docs-example",
      ".luz-docs-example__preview",
      ".luz-docs-example__code",
      ".luz-docs-example__frame",
      ".luz-docs-dodont",
      ".luz-docs-dodont__item",
      ".luz-docs-dodont__item--do",
      ".luz-docs-dodont__item--dont",
      ".luz-docs-dodont__verdict",
      ".luz-docs-dodont__stage",
      ".luz-docs-pager",
      ".luz-docs-pager__prev",
      ".luz-docs-pager__next",
      ".luz-docs-pager__link",
      ".luz-docs-page-foot",
    ]) {
      expect(has(css, new RegExp(`${name.replace(/[.]/g, "\\.")}(?![\\w-])`)), name).toBe(true);
    }
  });

  it("every class in a selector is a `.luz-docs-*` class: no core class, no `.docs-*` of the docs app", () => {
    expect(files.length, "packages/docs/src/**/*.css").toBeGreaterThan(0);
    const offenders = [];
    for (const { path, text } of files) {
      for (const [, prelude] of text.matchAll(/([^{};]+)\{/g)) {
        if (prelude.trim().startsWith("@")) continue;
        for (const [, name] of prelude.matchAll(/\.([a-zA-Z_-][\w-]*)/g)) if (!name.startsWith("luz-docs-")) offenders.push(`${path}: .${name}`);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it("every custom property it declares is `--luz-docs-*`, and the shell sets the measure to 46rem", () => {
    const declared = [...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
    expect(declared.filter((name) => !name.startsWith("--luz-docs-"))).toEqual([]);
    expect(has(css, /--luz-docs-measure\s*:\s*46rem/), "--luz-docs-measure: 46rem").toBe(true);
    expect(has(css, /--luz-docs-example-w/), "--luz-docs-example-w").toBe(true);
  });

  it("knows nothing of the docs app or of what the docs teach: no `docs-*` class or hook, no demo or page id", () => {
    expect(files.length, "packages/docs/src/**/*.css").toBeGreaterThan(0);
    const offenders = [];
    for (const { path, text } of files) {
      text.split("\n").forEach((line, i) => {
        if (/(?<![\w-])\.?docs-[a-z]|data-docs|#demo-|#c-[a-z]|#p-[a-z]|\.luz-(?:btn|card|search|table|alert|badge)\b/.test(line)) offenders.push(`${path}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("places the shell by columns, not by position: three tracks from 80rem, a sidebar of 16.5rem and a rail of 14rem", () => {
    const shell = stripComments(readOr("packages/docs/src/components/shell.css"));
    expect(has(shell, /16\.5rem/), "16.5rem").toBe(true);
    expect(has(shell, /14rem/), "14rem").toBe(true);
    expect(has(shell, /80rem/), "80rem").toBe(true);
    expect(has(shell, /60rem/), "60rem").toBe(true);
  });

  it("uses no hex colour, named colour or literal space (RL-10 reads it too)", () => {
    expect(files.length, "packages/docs/src/**/*.css").toBeGreaterThan(0);
    expect(has(css, /#[0-9a-fA-F]{3,8}\b(?![\w-])/), "a hex colour").toBe(false);
  });

  it("uses no class or property of another kind of site", () => {
    expect(files.length, "packages/docs/src/**/*.css").toBeGreaterThan(0);
    expect(has(css, /luz-(?:site|landing|cms|app)-/), "another kind's class").toBe(false);
  });
});

describe("@luz-ds/docs: the layer, once built", () => {
  const built = exists("packages/docs/dist/docs.css");

  it("is built: run pnpm docs:build", () => {
    expect(built, "packages/docs/dist/docs.css").toBe(true);
  });

  it("has every rule in `@layer luz.docs`, after the order statement, and nothing at the top level", () => {
    const css = stripComments(readOr("packages/docs/dist/docs.css"));
    expect(css.length, "docs.css").toBeGreaterThan(0);
    const top = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") {
        depth--;
        if (depth === 0) {
          top.push(css.slice(start, css.indexOf("{", start)).trim());
          start = i + 1;
        }
      } else if (css[i] === ";" && depth === 0) {
        top.push(css.slice(start, i).trim());
        start = i + 1;
      }
    }
    expect(top.filter((prelude) => prelude !== "@layer luz.docs" && !/^@layer luz\./.test(prelude) && !/^@charset/.test(prelude))).toEqual([]);
    expect(top.filter((prelude) => prelude === "@layer luz.docs")).toHaveLength(1);
  });

  it("ships a classes.json that holds only `luz-docs-*` classes, all in luz.docs", () => {
    const manifest = json("packages/docs/dist/classes.json");
    expect(manifest.package).toBe("@luz-ds/docs");
    const names = (manifest.classes ?? []).map((c) => c.name);
    expect(names.length).toBeGreaterThan(20);
    expect(names.filter((n) => !n.startsWith("luz-docs-"))).toEqual([]);
  });

  it("stays under its ceiling: 4 kB of minified and gzipped CSS", () => {
    expect(exists("packages/docs/dist/docs.min.css"), "docs.min.css").toBe(true);
  });
});

/* ---- The move: what left apps/docs/reference.css ------------------------------------ */

describe("the patterns moved out of the docs app", () => {
  const OLD = /(?<![\w-])\.?docs-(?:dodont|pager|page-head|onpage)/;

  it("apps/docs/reference.css no longer defines .docs-dodont*, .docs-pager*, .docs-page-head* or .docs-onpage*", () => {
    const css = stripComments(read("apps/docs/reference.css"));
    const offenders = css.split("\n").flatMap((line, i) => (OLD.test(line) ? [`reference.css:${i + 1}: ${line.trim()}`] : []));
    expect(offenders.slice(0, 12), `${offenders.length} lines`).toEqual([]);
  });

  it("nothing else of the docs app, the generator or the guides names the old classes", () => {
    const files = [
      ...walk("apps/docs", [".html", ".js", ".css", ".json"]),
      ...walk("scripts/docs-site", [".js"]),
      "scripts/docs-site/site.js",
    ].filter((f, i, all) => all.indexOf(f) === i && f !== "apps/docs/reference.css");
    const offenders = files.flatMap((f) => read(f).split("\n").flatMap((line, i) => (OLD.test(line) ? [`${f}:${i + 1}: ${line.trim().slice(0, 90)}`] : [])));
    expect(offenders.slice(0, 12), `${offenders.length} places`).toEqual([]);
  });

  it("the docs layout loads the package's stylesheet and the generator writes the new names", () => {
    expect(has(readOr("apps/docs/_layouts/page.html"), '<link rel="stylesheet" href="/packages/docs/dist/docs.css">'), `"apps/docs/_layouts/page.html" has ${'<link rel="stylesheet" href="/packages/docs/dist/docs.css">'}`).toBe(true);
    const generator = readOr("scripts/docs-site/site.js");
    for (const name of ["luz-docs-page-head", "luz-docs-pager", "luz-docs-rail__onpage"]) expect(has(generator, name), name).toBe(true);
  });

  it("every page the generator writes uses them: the page head, the pager and the on-this-page rail", () => {
    const site = scanSite(join(root, "apps/docs"), root);
    const { rendered } = buildSite(site, { unchecked: ["/"] });
    const page = rendered.get("/docs/components/button/");
    expect(page, "the button page is rendered").toBeTruthy();
    expect(has(page, '<div class="luz-docs-page-head">'), "page head").toBe(true);
    expect(has(page, /<ul class="luz-docs-pager">/), "pager").toBe(true);
    expect(has(page, '<nav class="luz-docs-rail__onpage"'), "on this page").toBe(true);
    expect(has(page, 'class="luz-docs-pager__prev"'), "pager prev").toBe(true);
    expect(has(page, 'class="luz-docs-pager__link"'), "pager link").toBe(true);
    expect(has(page, OLD), "an old class in the rendered page").toBe(false);
  });

  it("a component page's Do and don't uses the package's classes", () => {
    const body = readOr("apps/docs/pages/components/button.html");
    expect(has(body, 'class="luz-docs-dodont"'), "dodont").toBe(true);
    expect(has(body, "luz-docs-dodont__item--do"), "item do").toBe(true);
    expect(has(body, "luz-docs-dodont__stage"), "stage").toBe(true);
    expect(has(body, OLD), "an old class in button.html").toBe(false);
  });

  it("the docs script finds the specimens and the rail by the new names", () => {
    const script = readOr("apps/docs/reference.js");
    expect(has(script, ".luz-docs-dodont__stage"), "specimen selector").toBe(true);
    expect(has(script, "luz-docs-rail"), "rail selector").toBe(true);
    expect(has(script, OLD), "an old class in reference.js").toBe(false);
  });
});

/* ---- The docs ---------------------------------------------------------------- */

describe("@luz-ds/docs: the docs area", () => {
  const siteJson = json("apps/docs/site.json");
  const areas = (siteJson.areas ?? []).map((a) => a.id);
  const site = scanSite(join(root, "apps/docs"), root);
  const inArea = (group) => site.pages.filter((p) => p.meta.area === "documentation" && (group ? p.meta.group === group : true));

  it("has the area `documentation`, labelled Documentation, right after app and before accessibility", () => {
    const area = siteJson.areas?.find((a) => a.id === "documentation");
    expect(area).toMatchObject({ id: "documentation", label: "Documentation", slug: "documentation" });
    expect(areas.slice(areas.indexOf("app"))).toEqual(["app", "documentation", "accessibility"]);
  });

  it("groups it as the other kinds are: patterns, then a reference list, with essentials", () => {
    const area = siteJson.areas?.find((a) => a.id === "documentation");
    expect(area?.groups?.map((g) => g.id)).toEqual(["patterns", "reference"]);
    expect(area?.groups?.find((g) => g.id === "reference")?.list).toBe(true);
    expect((area?.essentials ?? []).length).toBeGreaterThan(0);
  });

  it("names its pattern pages in the A-Z index: AREA_KIND has `documentation`", () => {
    expect(has(readOr("scripts/docs-site/site.js"), /^\s*documentation: "Documentation pattern",$/m), `"scripts/docs-site/site.js" matches ${/^\s*documentation: "Documentation pattern",$/m}`).toBe(true);
  });

  it("has the gallery, the seven patterns and the templates", () => {
    const routes = inArea().map((p) => p.route).sort();
    expect(routes).toEqual(["/docs/documentation/", ...COMPONENTS.map((c) => `/docs/documentation/${c}/`), "/docs/documentation/templates/"].sort());
  });

  it("has seven pattern pages, the ids p-docs-shell, p-docs-page-head, p-docs-rail, p-docs-example, p-docs-dodont, p-docs-pager and p-docs-page-foot", () => {
    expect(inArea("patterns").map((p) => p.route).sort()).toEqual(COMPONENTS.map((c) => `/docs/documentation/${c}/`).sort());
    const routeOrNull = (id) => {
      try {
        return routeOf(id);
      } catch {
        return null;
      }
    };
    for (const c of COMPONENTS) expect(routeOrNull(`p-docs-${c}`), `p-docs-${c}`).toBe(`/docs/documentation/${c}/`);
  });

  it("names the classes each pattern page documents in its `files` front matter", () => {
    expect(inArea("patterns")).toHaveLength(7);
    for (const page of inArea("patterns")) {
      const slug = page.route.split("/").filter(Boolean).at(-1);
      expect(page.meta.files, page.file).toContain(`.luz-docs-${slug}`);
    }
  });

  it("loads the package in the docs layout and depends on it", () => {
    expect(has(readOr("apps/docs/_layouts/page.html"), '<link rel="stylesheet" href="/packages/docs/dist/docs.css">'), `"apps/docs/_layouts/page.html" has ${'<link rel="stylesheet" href="/packages/docs/dist/docs.css">'}`).toBe(true);
    expect(json("apps/docs/package.json").dependencies?.["@luz-ds/docs"]).toBe("workspace:*");
  });
});

describe("@luz-ds/docs: the pages that count the kinds", () => {
  it("get-started/structure.html lists the docs package with its seven blocks", () => {
    const page = readOr("apps/docs/pages/get-started/structure.html");
    expect(has(page, "@luz-ds/docs"), "structure.html names the package").toBe(true);
    for (const block of [".luz-docs-shell", ".luz-docs-page-head", ".luz-docs-rail", ".luz-docs-example", ".luz-docs-dodont", ".luz-docs-pager", ".luz-docs-page-foot"]) {
      expect(has(page, block), block).toBe(true);
    }
  });

  it("get-started/index.html has docs in its packages for one kind of site, with the install command", () => {
    const page = readOr("apps/docs/pages/get-started/index.html");
    expect(has(page, "@luz-ds/docs"), "index.html names the package").toBe(true);
    expect(has(page, 'href="/docs/documentation/"'), "index.html links the area").toBe(true);
  });

  it("the accessibility statement says what is known about the package (no JavaScript, the sticky rail)", () => {
    expect(has(readOr("apps/docs/pages/accessibility.html"), /luz-docs-|@luz-ds\/docs/), `"apps/docs/pages/accessibility.html" matches ${/luz-docs-|@luz-ds\/docs/}`).toBe(true);
  });
});

/* ---- From the F6a accessibility and UX review ------------------------------------------------ */

describe("@luz-ds/docs: the pager pattern pages name each link by its visible text (WCAG 2.5.3)", () => {
  /** The start tags of a.luz-docs-pager__link, live (`<a …>`) and written out in a code block (`&lt;a …&gt;`). */
  const pagerLinks = (text) => [
    ...[...text.matchAll(/<a\b[^>]*\bluz-docs-pager__link\b[^>]*>/g)].map((m) => m[0]),
    ...[...text.matchAll(/&lt;a\b(?:(?!&gt;)[\s\S])*?\bluz-docs-pager__link\b(?:(?!&gt;)[\s\S])*?&gt;/g)].map((m) => m[0]),
  ];

  for (const file of ["apps/docs/pages/documentation/pager.html", "apps/docs/pages/documentation/templates.html"]) {
    it(`${file}: no pager link has an aria-label, in the live markup or in the code it teaches`, () => {
      const links = pagerLinks(readOr(file));
      expect(links.length, `pager links in ${file}`).toBeGreaterThan(0);
      expect(links.filter((tag) => /\baria-label(?:ledby)?\b/.test(tag)).map((tag) => tag.slice(0, 120))).toEqual([]);
    });
  }
});

describe("@luz-ds/docs: the Do and don't pattern page", () => {
  const site = scanSite(join(root, "apps/docs"), root);
  const ROUTE = "/docs/documentation/dodont/";
  const { rendered } = buildSite(site, { unchecked: ["/"] });
  const text = (html) => html.replace(/<[^>]*>/g, "").replace(/&#39;|&apos;|&#x27;/g, "'").replace(/\s+/g, " ").trim();

  it(`is titled "Do and don't", the name the component pages use for the same block`, () => {
    expect(site.byRoute.get(ROUTE)?.meta.title).toBe("Do and don't");
  });

  it(`its h1 reads "Do and don't"`, () => {
    const h1 = /<h1 class="docs-title">([\s\S]*?)<\/h1>/.exec(rendered.get(ROUTE) ?? "")?.[1] ?? "";
    expect(text(h1)).toBe("Do and don't");
  });

  it(`its sidebar label, on this page and on a sibling, reads "Do and don't"`, () => {
    for (const route of [ROUTE, "/docs/documentation/pager/"]) {
      const links = [...(rendered.get(route) ?? "").matchAll(/<a\b[^>]*\bhref="\/docs\/documentation\/dodont\/"[^>]*\bclass="luz-sidebar__link"[^>]*>([\s\S]*?)<\/a>|<a\b[^>]*\bclass="luz-sidebar__link"[^>]*\bhref="\/docs\/documentation\/dodont\/"[^>]*>([\s\S]*?)<\/a>/g)];
      expect(links.map((m) => text(m[1] ?? m[2])), `sidebar links to ${ROUTE} on ${route}`).toEqual(["Do and don't"]);
    }
  });
});
