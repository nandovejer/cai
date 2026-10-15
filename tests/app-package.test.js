/**
 * F3 step 14, @luz-ds/app 0.1 (.claude/plans/specs/f3-package-model.md, §1.7,
 * §5, §6 and §9 step 14; .claude/plans/specs/f3-ux.md, §2). The sources are
 * read as text; no browser, no build. The browser half is tests/app.spec.js.
 *
 *   - the package: manifest, files, the peers of a kind of site, pack-files.txt
 *   - the build and release scripts, the layer, the budget, the lint glob, CODEOWNERS
 *   - the CSS: two components, core's sticky bar and grid stay core's, nothing
 *     reorders the panels (accessibility requirement O6)
 *   - the docs: the area, its pattern pages, the structure page, the home
 *     page's "next" list in the three catalogs
 *
 * What an existing test already derives from SITE_KINDS (tests/package-model.test.js,
 * package-components.test.js, docs.spec.js, site-docs.spec.js, docs-design.test.js,
 * docs-site.test.js, search.spec.js) starts failing for app by itself once the
 * list has it: peers, one block per package, one stylesheet per component.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LAYERS } from "../scripts/luz-layers.js";
import { BASE, PACKAGES, SITE_KINDS } from "../scripts/luz-packages.js";
import { routeOf, site } from "./helpers/docs-site.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const exists = (path) => existsSync(`${root}${path}`);
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
/** Like `read`, but "" for a file that is not there yet, so the assertion says what is missing. */
const readOr = (path) => (exists(path) ? read(path) : "");
const json = (path) => JSON.parse(readOr(path) || "{}");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const COMPONENTS = ["dashboard", "header"];

/* ---- The package ----------------------------------------------------------- */

describe("@luz-ds/app: the package", () => {
  const manifest = json("packages/app/package.json");

  it("is @luz-ds/app, MIT, 0.0.0 until its first release, CSS only", () => {
    expect(manifest.name).toBe("@luz-ds/app");
    expect(manifest.license).toBe("MIT");
    expect(manifest.version).toBe("0.0.0");
    expect(manifest.type).toBe("module");
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.repository?.directory).toBe("packages/app");
  });

  it("exports ./css, ./css/min, ./classes.json, ./components/* and ./package.json, and nothing else", () => {
    expect(manifest.exports).toEqual({
      "./css": "./dist/app.css",
      "./css/min": "./dist/app.min.css",
      "./classes.json": "./dist/classes.json",
      "./components/*": "./dist/components/*",
      "./package.json": "./package.json",
    });
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
      expect(exists(`packages/app/${file}`), `packages/app/${file}`).toBe(true);
    }
  });

  it("has exactly the header and the dashboard as components, both imported by index.css", () => {
    const sources = exists("packages/app/src/components") ? readdirSync(`${root}packages/app/src/components`).filter((f) => f.endsWith(".css")) : [];
    expect(sources.map((f) => f.replace(/\.css$/, "")).sort()).toEqual(COMPONENTS);
    const index = readOr("packages/app/src/index.css");
    const imports = [...index.matchAll(/@import url\("\.\/components\/([\w-]+)\.css"\)/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual(COMPONENTS);
  });

  it("says in index.css what it requires: tokens and core first, site optional and loaded before it (§5)", () => {
    const index = readOr("packages/app/src/index.css");
    expect(index).toMatch(/Requires: @luz-ds\/tokens and @luz-ds\/core loaded first; @luz-ds\/site\s+optional, loaded before this file/);
  });

  it("lists exactly its files in pack-files.txt, each component plain and minified", () => {
    const packed = readOr("packages/app/pack-files.txt").split("\n").filter(Boolean).sort();
    const expected = [
      "LICENSE",
      "README.md",
      "dist/app.css",
      "dist/app.min.css",
      "dist/classes.json",
      ...COMPONENTS.flatMap((c) => [`dist/components/${c}.css`, `dist/components/${c}.min.css`]),
      "package.json",
    ].sort();
    expect(packed).toEqual(expected);
  });

  it("is a workspace importer of the lockfile (pnpm install was run)", () => {
    expect(read("pnpm-lock.yaml")).toMatch(/^ {2}packages\/app:$/m);
  });
});

/* ---- The lists the scripts read -------------------------------------------- */

describe("@luz-ds/app: the build, the release scripts and the layer", () => {
  it("is the third kind of site, after landing and cms, and the last package in dependency order", () => {
    expect(SITE_KINDS).toEqual(["landing", "cms", "app"]);
    expect(PACKAGES).toEqual([...BASE, "landing", "cms", "app"]);
  });

  it("has scripts/build-app.js, three lines on the shared builder, and an app:build chained in build", () => {
    const script = readOr("scripts/build-app.js");
    expect(script).toMatch(/import \{ buildPackage \} from "\.\/build-package\.js"/);
    expect(script).toMatch(/buildPackage\(\{ name: "app", label: "App" \}\)/);
    const pkg = json("package.json");
    expect(pkg.scripts?.["app:build"]).toBe("node scripts/build-app.js");
    expect(pkg.scripts?.build).toMatch(/pnpm cms:build && pnpm app:build( && pnpm luzcheck:build)?$/);
  });

  it("is a sentinel of check-dist, a pattern of qa-release and a probe of smoke-consumer", () => {
    expect(readOr("scripts/check-dist.js")).toContain("../packages/app/dist/app.css");
    expect(readOr("scripts/qa-release.js")).toMatch(/\(core\|site\|landing\|cms\|(?:app\|tokens|tokens\|app)(?:\|check)?\)/);
    const smoke = readOr("scripts/smoke-consumer.js");
    expect(smoke).toContain("/node_modules/@luz-ds/app");
    expect(smoke).toContain("/dist/app.css");
    expect(smoke).toContain("luz-app-");
  });

  it("is a public layer that comes right after cms", () => {
    expect(LAYERS.indexOf("app")).toBe(LAYERS.indexOf("cms") + 1);
    expect(readOr("scripts/luz-layers.js")).toMatch(/luz\.app\s+\.luz-app-\*/);
  });

  it("is in the published layer list of the docs, the versioning notes and the READMEs", () => {
    for (const file of ["VERSIONING.md", "packages/core/README.md", "AGENTS.md", "apps/docs/pages/get-started/layers.html"]) {
      expect(readOr(file), file).toContain("luz.app");
    }
  });
});

describe("@luz-ds/app: the budget, the lint rules and the owners", () => {
  it("has a row in budgets.json, a ceiling of 2 kB (a new row, no other ceiling raised)", () => {
    const row = json("budgets.json").budgets?.find((b) => b.name === "app CSS");
    expect(row).toMatchObject({ file: "packages/app/dist/app.min.css", max: 2048 });
    expect(row?.ideal ?? 0).toBeLessThanOrEqual(2048);
    const others = Object.fromEntries(json("budgets.json").budgets.filter((b) => b.name !== "app CSS").map((b) => [b.name, b.max]));
    expect(others["cms CSS"]).toBe(4096);
    expect(others["landing CSS"]).toBe(2048);
    expect(others["core CSS"]).toBe(15360);
  });

  it("has its row in the PRINCIPLES.md table of section 8, with the same ceiling", () => {
    expect(read("PRINCIPLES.md")).toMatch(/^\| `app` CSS \|[^\n]*\| 2 kB \|$/m);
  });

  it("is under the RL-10 override of stylelint (no hex, no named colour, no literal space)", () => {
    expect(read("stylelint.config.js")).toContain('"packages/app/src/**/*.css"');
  });

  it("is owned: CODEOWNERS names packages/app/ and its build script", () => {
    const owners = read(".github/CODEOWNERS");
    expect(owners).toMatch(/^packages\/app\/\s+@nandovejer$/m);
    expect(owners).toMatch(/^scripts\/build-app\.js\s+@nandovejer$/m);
  });

  it("has a minor changeset of its own, out of the fixed group, and one for tokens and core (their dist repeats the layer statement)", () => {
    const changesets = readdirSync(`${root}.changeset`).filter((f) => f.endsWith(".md") && f !== "README.md").map((f) => read(`.changeset/${f}`));
    const head = (text) => text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    expect(changesets.some((text) => /"@luz-ds\/app": minor/.test(head(text)))).toBe(true);
    expect(changesets.some((text) => /"@luz-ds\/tokens": minor/.test(head(text)) && /"@luz-ds\/core": minor/.test(head(text)) && /luz\.app/.test(text))).toBe(true);
  });
});

/* ---- The CSS ----------------------------------------------------------------- */

describe("@luz-ds/app: header.css", () => {
  const css = stripComments(readOr("packages/app/src/components/header.css"));

  it("defines the header and its parts: product, actions, account and its name", () => {
    expect(css.length, "header.css exists").toBeGreaterThan(0);
    for (const name of [".luz-app-header", ".luz-app-header__product", ".luz-app-header__actions", ".luz-app-header__account-name"]) {
      expect(css, name).toMatch(new RegExp(`${name.replace(/[.]/g, "\\.")}(?![\\w-])`));
    }
  });

  it("leaves stickiness to core's .o-sticky: no position: sticky in app", () => {
    expect(css.length, "header.css exists").toBeGreaterThan(0);
    expect(css).not.toMatch(/position\s*:\s*sticky/);
  });

  it("gives .o-main the scroll padding of the bar (O5): scroll-padding-block-start: var(--luz-bar-h)", () => {
    expect(css).toMatch(/\.o-main[^{}]*\{[^}]*scroll-padding-block-start\s*:\s*var\(--luz-bar-h\)/);
  });

  it("clips the account name with the visually-hidden technique, never display: none, so it stays in the name", () => {
    const rule = css.match(/\.luz-app-header__account-name[^{}]*\{([^}]*)\}/g)?.join("\n") ?? "";
    expect(rule, "a rule for the name").not.toBe("");
    expect(rule).not.toMatch(/display\s*:\s*none/);
    expect(rule).not.toMatch(/visibility\s*:\s*hidden/);
    expect(rule).not.toMatch(/font-size\s*:\s*0\b/);
  });

  it("uses no `luz-site-*` class or property", () => {
    expect(css.length, "header.css exists").toBeGreaterThan(0);
    expect(css).not.toMatch(/luz-site-/);
  });
});

describe("@luz-ds/app: dashboard.css", () => {
  const css = stripComments(readOr("packages/app/src/components/dashboard.css"));

  it("defines the dashboard, its title row, its panel and the wide panel", () => {
    expect(css.length, "dashboard.css exists").toBeGreaterThan(0);
    for (const name of [".luz-app-dashboard", ".luz-app-dashboard__head", ".luz-app-dashboard__title", ".luz-app-dashboard__panel", ".luz-app-dashboard__panel--wide"]) {
      expect(css, name).toMatch(new RegExp(`${name.replace(/[.]/g, "\\.")}(?![\\w-])`));
    }
  });

  it("is the container of its own size query: inline-size, and the wide panel spans two columns from a 40rem container", () => {
    expect(css).toMatch(/container-type\s*:\s*inline-size/);
    expect(css).toMatch(/@container\s*\(\s*min-width\s*:\s*40rem\s*\)[^{]*\{[^}]*\.luz-app-dashboard__panel--wide[^{}]*\{[^}]*grid-column\s*:\s*span\s+2/);
  });

  it("lets a panel shrink (min-inline-size: 0), so a wide child never widens its column", () => {
    expect(css).toMatch(/\.luz-app-dashboard__panel[^{}]*\{[^}]*min-(inline-size|width)\s*:\s*0/);
  });

  it("never reorders the panels: no dense packing, no order (O6)", () => {
    expect(css.length, "dashboard.css exists").toBeGreaterThan(0);
    expect(css).not.toMatch(/grid-auto-flow\s*:[^;]*dense/);
    expect(css).not.toMatch(/(^|[;{\s])order\s*:/);
    expect(css).not.toMatch(/row-reverse|column-reverse/);
  });

  it("leaves the grid to core's .o-grid: no second sticky bar, no sidebar, and no `luz-site-*`", () => {
    expect(css.length, "dashboard.css exists").toBeGreaterThan(0);
    expect(css).not.toMatch(/position\s*:\s*sticky/);
    expect(css).not.toMatch(/luz-sidebar|luz-site-/);
  });
});

/* ---- The docs ---------------------------------------------------------------- */

describe("@luz-ds/app: the docs area", () => {
  const siteJson = json("apps/docs/site.json");
  const areas = (siteJson.areas ?? []).map((a) => a.id);

  it("has the area `app`, labelled App, right after cms and before accessibility", () => {
    const area = siteJson.areas?.find((a) => a.id === "app");
    expect(area).toMatchObject({ id: "app", label: "App", slug: "app" });
    expect(areas.slice(areas.indexOf("cms"))).toEqual(["cms", "app", "accessibility"]);
  });

  it("groups it as the other kinds are: patterns, then a reference list, with essentials", () => {
    const area = siteJson.areas?.find((a) => a.id === "app");
    expect(area?.groups?.map((g) => g.id)).toEqual(["patterns", "reference"]);
    expect(area?.groups?.find((g) => g.id === "reference")?.list).toBe(true);
    expect((area?.essentials ?? []).length).toBeGreaterThan(0);
  });

  it("names its pattern pages in the A-Z index: AREA_KIND has `app`", () => {
    expect(readOr("scripts/docs-site/site.js")).toMatch(/^\s*app: "App pattern",$/m);
  });

  it("has the gallery, the header, the dashboard and the templates", () => {
    const routes = site.pages.filter((p) => p.meta.area === "app").map((p) => p.route).sort();
    expect(routes).toEqual(["/docs/app/", "/docs/app/dashboard/", "/docs/app/header/", "/docs/app/templates/"]);
  });

  it("has two pattern pages, header and dashboard, the ids p-app-header and p-app-dashboard", () => {
    const patterns = site.pages.filter((p) => p.meta.area === "app" && p.meta.group === "patterns").map((p) => p.route).sort();
    expect(patterns).toEqual(["/docs/app/dashboard/", "/docs/app/header/"]);
    const routeOrNull = (id) => {
      try {
        return routeOf(id);
      } catch {
        return null;
      }
    };
    expect(routeOrNull("p-app-header")).toBe("/docs/app/header/");
    expect(routeOrNull("p-app-dashboard")).toBe("/docs/app/dashboard/");
  });

  it("loads app's stylesheet in the docs layout and depends on the package", () => {
    expect(readOr("apps/docs/_layouts/page.html")).toContain('<link rel="stylesheet" href="/packages/app/dist/app.css">');
    expect(json("apps/docs/package.json").dependencies?.["@luz-ds/app"] ?? json("apps/docs/package.json").devDependencies?.["@luz-ds/app"]).toBe("workspace:*");
  });

  it("writes the account's initials as text in the name, never aria-hidden, in every page that shows the button", () => {
    const pages = ["header", "dashboard", "templates"].map((p) => `apps/docs/pages/app/${p}.html`).filter(exists);
    expect(pages.length).toBeGreaterThan(0);
    const offenders = [];
    for (const file of pages) {
      const text = read(file);
      for (const match of text.matchAll(/luz-app-header__account(?!-name)[\s\S]*?(?:<\/button>|&lt;\/button&gt;)/g)) {
        if (/luz-avatar[^>]*aria-hidden|luz-avatar[^&]*aria-hidden/.test(match[0])) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("puts the view's h1 in the dashboard's title row, not in the bar, in every template", () => {
    const text = readOr("apps/docs/pages/app/templates.html");
    expect(text.length, "templates.html exists").toBeGreaterThan(0);
    expect(text).toMatch(/luz-app-dashboard__head/);
    expect(text).not.toMatch(/luz-app-header__title/);
  });
});

describe("@luz-ds/app: the pages that count the kinds", () => {
  it("get-started/structure.html lists the app kind with its two blocks", () => {
    const page = readOr("apps/docs/pages/get-started/structure.html");
    expect(page).toContain("@luz-ds/app");
    expect(page).toContain(".luz-app-header");
    expect(page).toContain(".luz-app-dashboard");
  });

  it("get-started/index.html has app in its packages for one kind of site, with the install command", () => {
    const page = readOr("apps/docs/pages/get-started/index.html");
    expect(page).toContain("pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/app");
    expect(page).toContain('href="/docs/app/"');
  });

  it("the home page's `next` list has adopt.next.app, in the template and in the three catalogs, linking the area", () => {
    expect(readOr("apps/landing/index.html")).toContain("{{html:adopt.next.app}}");
    for (const lang of ["en", "es", "ar"]) {
      const catalog = json(`apps/landing/i18n/${lang}.json`);
      expect(catalog["adopt.next.app"], `${lang}.json`).toContain('href="/docs/app/"');
    }
  });

  it("README.md and the repository's own guides know the kind", () => {
    for (const file of ["README.md", "dev/STRUCTURE.md", "dev/QUICK-REFERENCE.md", "dev/DIST-RULES.md"]) {
      expect(readOr(file), file).toMatch(/@luz-ds\/app|packages\/app|luz-app-/);
    }
    expect(readOr("PRINCIPLES.md")).toMatch(/`@luz-ds\/app`/);
  });
});
