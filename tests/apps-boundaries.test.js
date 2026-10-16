/**
 * The three apps (F2 of .claude/plans/luz-home-docs-identity.md, section 3.4):
 * what the home page and the docs share lives in apps/site, and neither
 * app reaches into the other.
 *
 *   apps/site/     the header, the footer, the favicons, the colour mode boot
 *                  and the four lights: depends on no other app
 *   apps/landing/  the home page: no path into apps/docs
 *   apps/docs/     the documentation: no path into apps/landing
 *
 * The search is a text search of paths in every .html, .js, .css and .json
 * file; routes (href="/", "/docs/...") are not paths into an app.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");

/** Every text file of an app, as repo-relative paths (not node_modules, not a build). */
function filesOf(app) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(join(repo, dir))) return;
    for (const entry of readdirSync(join(repo, dir))) {
      if (entry === "node_modules" || entry === "dist") continue;
      const rel = `${dir}/${entry}`;
      if (statSync(join(repo, rel)).isDirectory()) walk(rel);
      else if (/\.(html|js|css|json)$/.test(entry)) out.push(rel);
    }
  };
  walk(app);
  return out;
}

/** "file:line: text" for each line of the app's files that matches. */
function mentions(app, pattern) {
  return filesOf(app).flatMap((file) =>
    read(file)
      .split("\n")
      .flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1}: ${line.trim().slice(0, 90)}`] : [])),
  );
}

describe("no app reaches into another", () => {
  it("apps/landing names nothing of apps/docs", () => {
    expect(mentions("apps/landing", /apps\/docs|\.\.\/docs\//)).toEqual([]);
  });

  it("apps/docs names nothing of apps/landing", () => {
    expect(mentions("apps/docs", /apps\/landing|\.\.\/landing\//)).toEqual([]);
  });

  it("apps/site names nothing of apps/docs or apps/landing", () => {
    expect(existsSync(join(repo, "apps/site")), "apps/site exists").toBe(true);
    expect(filesOf("apps/site").length, "apps/site has files").toBeGreaterThan(0);
    expect(mentions("apps/site", /apps\/(?:docs|landing)|\.\.\/(?:docs|landing)\//)).toEqual([]);
  });
});

describe("apps/site holds what the home page and the docs share", () => {
  const MOVED = [
    ["apps/docs/site-header.css", "apps/site/header.css"],
    ["apps/docs/site-header.js", "apps/site/header.js"],
    ["apps/landing/theme-boot.js", "apps/site/boot.js"],
    ["apps/docs/_partials/header.html", "apps/site/_partials/header.html"],
    ["apps/docs/_partials/site-links.html", "apps/site/_partials/site-links.html"],
    ["apps/docs/_partials/footer.html", "apps/site/_partials/footer.html"],
    ["apps/landing/assets/favicon.ico", "apps/site/assets/favicon.ico"],
    ["apps/landing/assets/favicon.svg", "apps/site/assets/favicon.svg"],
    ["apps/landing/assets/apple-touch-icon.png", "apps/site/assets/apple-touch-icon.png"],
    ["apps/landing/assets/logo-mark.svg", "apps/site/assets/logo-mark.svg"],
  ];

  it.each(MOVED)("%s moved to %s", (from, to) => {
    expect(existsSync(join(repo, to)), `${to} exists`).toBe(true);
    expect(existsSync(join(repo, from)), `${from} is gone`).toBe(false);
  });

  it("has theme-light.css, the four lights", () => {
    expect(existsSync(join(repo, "apps/site/theme-light.css"))).toBe(true);
  });

  it("is the private workspace package @luz-ds/website, on core, site and tokens", () => {
    expect(existsSync(join(repo, "apps/site/package.json")), "apps/site/package.json exists").toBe(true);
    const pkg = JSON.parse(read("apps/site/package.json"));
    expect(pkg.name).toBe("@luz-ds/website");
    expect(pkg.version).toBe("0.0.0");
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies).toEqual({
      "@luz-ds/core": "workspace:*",
      "@luz-ds/site": "workspace:*",
      "@luz-ds/tokens": "workspace:*",
    });
  });

  it("is the folder of the shared partials and of nothing else's: no partial is in both folders", () => {
    const names = (dir) => (existsSync(join(repo, dir)) ? readdirSync(join(repo, dir)) : []);
    const both = names("apps/site/_partials").filter((n) => names("apps/docs/_partials").includes(n));
    expect(both).toEqual([]);
  });
});

describe("the header moved to apps/site keeps what it did", () => {
  // The rules of the old apps/docs/site-header.css, comments out and whitespace squeezed: moved, not changed
  const normal = (css) =>
    css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([{};:,>])\s*/g, "$1")
      .trim();
  const OLD_RULES = "aab969bd46c2e344c793ab637298679d45d128bdfb690beb0b4c95eaaf1f8fc1";

  it("header.css has the same rules as site-header.css had (only comments may name the new path)", () => {
    expect(existsSync(join(repo, "apps/site/header.css")), "apps/site/header.css exists").toBe(true);
    expect(createHash("sha256").update(normal(read("apps/site/header.css"))).digest("hex")).toBe(OLD_RULES);
  });

  it("header.js exports initSiteHeader() with no option, still wires core's cycle button and the sidebar, and defines <luz-mode>", () => {
    expect(existsSync(join(repo, "apps/site/header.js")), "apps/site/header.js exists").toBe(true);
    const code = read("apps/site/header.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(code).toMatch(/export\s+function\s+initSiteHeader\s*\(\s*\)/);
    expect(code).toMatch(/\binitThemeCycle\s*\(/);
    expect(code).toMatch(/\binitSidebar\s*\(/);
    expect(code).toContain("--site-header-h");
    expect(code).toMatch(/import\s*["']\/packages\/site\/dist\/mode\.js["']|from\s*["']\/packages\/site\/dist\/mode\.js["']/);
    expect(code).not.toMatch(/onModeChange|luz-site-mode|initModes/);
  });
});
