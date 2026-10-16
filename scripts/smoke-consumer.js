/**
 * LUZ — consumer smoke test.
 * Packs every published package (scripts/luz-packages.js) as `npm pack`
 * would publish it, installs the tarballs into an empty project, and checks
 * what a consumer sees. The versions are the ones the pending changesets
 * will publish: `changeset version` runs on a copy of the manifests, so a
 * package whose peers name the next major of the base (landing's ^0.1.0
 * while the workspace is still at 0.0.0) installs as it will on npm.
 *   1. every entry of each package's `exports` resolves to a file
 *      (patterns such as ./components/* are expanded);
 *   2. a minimal page that links the installed files loads in Chromium with
 *      no failed request, no console error or warning, the tokens defined,
 *      core, site, landing, cms and app CSS applied, and the JS exports importable;
 *   3. the same page with jsDelivr-style URLs (/npm/@luz-ds/<pkg>@<version>/…),
 *      served from the same tarballs by a local server: no network is used;
 *   4. the `luz-tokens` command runs from the installed package;
 *   5. the `luz-check` bin of @luz-ds/check, a tool with no CSS, runs from the
 *      installed package (its version, its help, tests/fixtures/check/pass,
 *      and the files of /fail whose rules this version has).
 *
 * Needs the packages built (`pnpm build`) and Chromium
 * (`pnpm test:ui:install`). Nothing leaves the machine: the install is
 * offline and the server listens on 127.0.0.1 only.
 *
 * Usage: node scripts/smoke-consumer.js [--keep]
 *   --keep   leave the temporary project in place and print its path
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PACKAGES, PUBLISHED } from "./luz-packages.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEEP = process.argv.includes("--keep");
const TYPES = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".html": "text/html",
  ".svg": "image/svg+xml",
};

const results = [];
const servers = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? `\n    ${String(detail).replace(/\n/g, "\n    ")}` : ""}`);
};

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/* ---- 0. Preconditions ------------------------------------------------------ */

for (const name of PUBLISHED) {
  if (!existsSync(join(root, "packages", name, "dist"))) fail(`packages/${name}/dist is missing: run "pnpm build" first`);
}
let chromium;
try {
  ({ chromium } = await import("@playwright/test"));
} catch {
  fail('@playwright/test is not installed: run "pnpm install"');
}

/* ---- 1. Pack and install --------------------------------------------------- */

const work = mkdtempSync(join(process.env.LUZ_SMOKE_DIR ?? tmpdir(), "luz-smoke-"));
const packs = join(work, "packs");
const project = join(work, "project");
mkdirSync(packs);
mkdirSync(project);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

// The release the pending changesets describe: run `changeset version` on
// a copy of the manifests and changesets, never on the working tree
const plan = join(work, "plan");
cpSync(join(root, ".changeset"), join(plan, ".changeset"), { recursive: true });
for (const file of ["package.json", "pnpm-workspace.yaml"]) cpSync(join(root, file), join(plan, file));
for (const name of PUBLISHED) {
  for (const file of ["package.json", "CHANGELOG.md"]) {
    if (existsSync(join(root, "packages", name, file))) cpSync(join(root, "packages", name, file), join(plan, "packages", name, file));
  }
}
const changeset = join(root, "node_modules", ".bin", process.platform === "win32" ? "changeset.cmd" : "changeset");
const versioned = spawnSync(changeset, ["version"], { cwd: plan, encoding: "utf-8" });
check("ran changeset version on a copy of the manifests", versioned.status === 0, versioned.stderr || versioned.stdout);
if (versioned.status !== 0) finish();

// Each package is packed from a copy of its folder with the released manifest
const tarballs = PUBLISHED.map((name) => {
  const copy = join(work, "src", name);
  cpSync(join(root, "packages", name), copy, { recursive: true, filter: (from) => !from.split(sep).includes("node_modules") });
  cpSync(join(plan, "packages", name, "package.json"), join(copy, "package.json"));
  const out = execFileSync(npm, ["pack", "--json", "--pack-destination", packs], { cwd: copy, encoding: "utf-8" });
  return join(packs, JSON.parse(out)[0].filename);
});
check(`packed ${PUBLISHED.length} tarballs (${tarballs.map((t) => t.split(sep).pop().replace(/^luz-ds-|\.tgz$/g, "")).join(", ")})`, tarballs.every(existsSync));

writeFileSync(join(project, "package.json"), JSON.stringify({ name: "luz-smoke", private: true, type: "module" }));
const install = spawnSync(npm, ["install", "--offline", "--no-audit", "--no-fund", "--ignore-scripts", ...tarballs], { cwd: project, encoding: "utf-8" });
check("installed the tarballs offline", install.status === 0, install.stderr || install.stdout);
if (install.status !== 0) finish();

const installed = (name) => join(project, "node_modules", "@luz-ds", name);
const versions = Object.fromEntries(PUBLISHED.map((n) => [n, JSON.parse(readFileSync(join(installed(n), "package.json"), "utf-8")).version]));

/* ---- 2. Every export resolves ---------------------------------------------- */

const require = createRequire(join(project, "package.json"));
for (const name of PUBLISHED) {
  const pkg = JSON.parse(readFileSync(join(installed(name), "package.json"), "utf-8"));
  const problems = [];
  let count = 0;
  for (const [key, target] of Object.entries(pkg.exports)) {
    const file = typeof target === "string" ? target : (target.default ?? Object.values(target).find((t) => typeof t === "string"));
    if (!file) {
      problems.push(`${key}: no file target`);
      continue;
    }
    const keys = [];
    if (key.includes("*")) {
      // Expand the pattern against the files that are installed
      const [prefix, suffix = ""] = file.split("*");
      // The prefix may end in the start of a file name (./dist/i18n-*.js)
      const folder = prefix.slice(0, prefix.lastIndexOf("/") + 1);
      const stem = prefix.slice(folder.length);
      const dir = join(installed(name), folder);
      if (!existsSync(dir)) problems.push(`${key}: ${folder} is not installed`);
      else {
        // A pattern matches nested paths too (./fonts/serif/ETBook-Bold.woff2)
        const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [relative(dir, join(d, e.name)).split(sep).join("/")]));
        for (const f of walk(dir).filter((f) => f.startsWith(stem) && f.endsWith(suffix))) keys.push(key.replace("*", f.slice(stem.length, f.length - suffix.length)));
      }
      if (existsSync(dir) && keys.length === 0) problems.push(`${key}: the pattern matches nothing`);
    } else keys.push(key);
    for (const k of keys) {
      count++;
      const specifier = `@luz-ds/${name}${k === "." ? "" : k.slice(1)}`;
      try {
        const path = require.resolve(specifier);
        if (!existsSync(path)) problems.push(`${specifier}: resolves to a missing file`);
      } catch (error) {
        problems.push(`${specifier}: ${error.code ?? error.message}`);
      }
    }
  }
  check(`@luz-ds/${name}: ${count} exports resolve`, problems.length === 0, problems.join("\n"));
}

/* ---- 3. The pages ---------------------------------------------------------- */

const PAGE = (base, label) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LUZ smoke test: ${label}</title>
  <link rel="stylesheet" href="${base.tokens}/dist/luz-tokens.css">
  <link rel="stylesheet" href="${base.core}/dist/luz.css">
  <link rel="stylesheet" href="${base.site}/dist/site.css">
  <link rel="stylesheet" href="${base.landing}/dist/landing.css">
  <link rel="stylesheet" href="${base.cms}/dist/cms.css">
  <link rel="stylesheet" href="${base.app}/dist/app.css">
</head>
<body>
  <h1>Smoke test</h1>
  <button class="luz-btn luz-btn--primary" type="button" id="probe-button">Save changes</button>
  <div id="probe-fill" style="background: var(--luz-brand-fill)"></div>
  <luz-banner id="probe-section"></luz-banner>
  <footer class="luz-landing-footer" id="probe-landing"></footer>
  <div class="luz-cms-article-header" id="probe-article"></div>
  <main class="luz-app-dashboard" id="probe-dashboard"></main>
  <script type="module">
    const core = ${JSON.stringify(base.core)};
    const site = ${JSON.stringify(base.site)};
    const wanted = {
      [core + "/dist/luz.js"]: ["loadLocales"],
      [core + "/dist/tabs.js"]: ["initTabs"],
      [core + "/dist/theme.js"]: ["applyTheme"],
      [core + "/dist/i18n.js"]: ["t", "registerLocale", "loadLocales"],
      [core + "/dist/i18n-es.js"]: ["default"],
      [core + "/dist/clipboard.js"]: ["initCopyButtons"],
      [site + "/dist/search.js"]: ["search"],
      [site + "/dist/consent.js"]: ["getConsent"],
      [site + "/dist/mode.js"]: ["phaseOf"],
      [site + "/dist/site.js"]: [],
    };
    const missing = [];
    for (const [url, names] of Object.entries(wanted)) {
      try {
        const module = await import(url);
        for (const name of names) {
          // a language file is data: its default export is the dictionary
          const kind = name === "default" ? "object" : "function";
          if (typeof module[name] !== kind) missing.push(url + " has no " + name + (kind === "function" ? "()" : " object"));
        }
      } catch (error) {
        missing.push(url + ": " + error.message);
      }
    }
    window.__smoke = { done: true, missing };
  </script>
</body>
</html>
`;

// A package for one kind of site works without site, its optional peer
// (f3-package-model §5): tokens, core and the kind, nothing else
const ALONE = (base) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LUZ smoke test: landing without site</title>
  <link rel="stylesheet" href="${base.tokens}/dist/luz-tokens.css">
  <link rel="stylesheet" href="${base.core}/dist/luz.css">
  <link rel="stylesheet" href="${base.landing}/dist/landing.css">
</head>
<body class="o-page">
  <main class="o-container o-stack luz-landing-main">
    <section class="luz-landing-hero o-grid o-grid--split" id="probe-hero" aria-labelledby="probe-title"><div class="luz-landing-hero__copy"><h1 class="luz-landing-hero__title" id="probe-title">Smoke test</h1></div></section>
  </main>
  <footer class="luz-landing-footer" id="probe-landing"><div class="o-container o-container--inline o-row"><p>Footer</p></div></footer>
</body>
</html>
`;

const APP_ALONE = (base) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LUZ smoke test: app without site</title>
  <link rel="stylesheet" href="${base.tokens}/dist/luz-tokens.css">
  <link rel="stylesheet" href="${base.core}/dist/luz.css">
  <link rel="stylesheet" href="${base.app}/dist/app.css">
</head>
<body>
  <div class="o-shell">
    <div class="o-main">
      <header class="luz-app-header o-sticky" id="probe-app-header"><div class="o-row"><p class="luz-app-header__product">App</p></div></header>
      <main class="luz-app-dashboard" id="probe-app-dashboard"><div class="luz-app-dashboard__head"><h1 class="luz-app-dashboard__title">Smoke test</h1></div></main>
    </div>
  </div>
</body>
</html>
`;

const local = {
  tokens: "/node_modules/@luz-ds/tokens",
  core: "/node_modules/@luz-ds/core",
  site: "/node_modules/@luz-ds/site",
  landing: "/node_modules/@luz-ds/landing",
  cms: "/node_modules/@luz-ds/cms",
  app: "/node_modules/@luz-ds/app",
};
const cdn = Object.fromEntries(PACKAGES.map((n) => [n, `/npm/@luz-ds/${n}@${versions[n]}`]));

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const path = decodeURIComponent(url.pathname);
  const send = (status, body, type = "text/plain") => {
    res.writeHead(status, { "content-type": type });
    res.end(body);
  };
  if (path === "/npm.html") return send(200, PAGE(local, "installed files"), TYPES[".html"]);
  if (path === "/cdn.html") return send(200, PAGE(cdn, "CDN paths"), TYPES[".html"]);
  if (path === "/landing-alone.html") return send(200, ALONE(local), TYPES[".html"]);
  if (path === "/app-alone.html") return send(200, APP_ALONE(local), TYPES[".html"]);
  // jsDelivr layout: /npm/@luz-ds/<name>@<version>/<file>
  const cdnPath = path.match(/^\/npm\/@luz-ds\/([\w-]+)@([^/]+)\/(.+)$/);
  let file;
  if (cdnPath) {
    if (versions[cdnPath[1]] !== cdnPath[2]) return send(404, "unknown version");
    file = join(installed(cdnPath[1]), cdnPath[3]);
  } else file = join(project, path);
  const safe = normalize(file);
  if (!safe.startsWith(project + sep) || relative(project, safe).startsWith("..")) return send(403, "outside the project");
  if (!existsSync(safe) || !statSync(safe).isFile()) return send(404, `not found: ${path}`);
  send(200, readFileSync(safe), TYPES[extname(safe)] ?? "application/octet-stream");
});
servers.push(server);
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

let browser;
try {
  browser = await chromium.launch();
} catch (error) {
  check("started Chromium", false, `${error.message}\nRun "pnpm test:ui:install"`);
}

if (browser) {
  for (const [route, label] of [["/npm.html", "installed files"], ["/cdn.html", "CDN-style paths"]]) {
    const page = await browser.newPage();
    const problems = [];
    page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()} ${new URL(r.url()).pathname}`));
    page.on("requestfailed", (r) => problems.push(`failed ${new URL(r.url()).pathname}: ${r.failure()?.errorText}`));
    page.on("pageerror", (e) => problems.push(`error: ${e.message}`));
    page.on("console", (m) => ["error", "warning"].includes(m.type()) && problems.push(`console ${m.type()}: ${m.text()}`));
    // Nothing may leave the machine
    page.on("request", (r) => !r.url().startsWith(origin) && !r.url().startsWith("data:") && problems.push(`left the machine: ${r.url()}`));

    await page.goto(origin + route);
    await page.waitForFunction(() => window.__smoke?.done, null, { timeout: 15000 }).catch(() => problems.push("the module script did not finish"));
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const button = getComputedStyle(document.getElementById("probe-button"));
      const fill = getComputedStyle(document.getElementById("probe-fill"));
      const section = getComputedStyle(document.getElementById("probe-section"));
      const landing = getComputedStyle(document.getElementById("probe-landing"));
      const article = getComputedStyle(document.getElementById("probe-article"));
      const sheets = [...document.styleSheets].map((s) => {
        try {
          return s.cssRules.length;
        } catch {
          return -1;
        }
      });
      return {
        token: root.getPropertyValue("--luz-brand-fill").trim(),
        buttonBackground: button.backgroundColor,
        tokenBackground: fill.backgroundColor,
        buttonHeight: parseFloat(button.height),
        sectionDisplay: section.display,
        landingBorder: landing.borderTopStyle,
        articleDisplay: article.display,
        dashboardType: getComputedStyle(document.getElementById("probe-dashboard")).containerType,
        sheets,
        missing: window.__smoke?.missing ?? ["no result"],
      };
    });
    const label2 = `${label}:`;
    check(`${label2} no failed request, console message or request off the machine`, problems.length === 0, problems.join("\n"));
    check(`${label2} tokens loaded (--luz-brand-fill is defined)`, state.token !== "", "the custom property is empty");
    check(`${label2} core CSS applied (.luz-btn--primary uses the token)`, state.buttonBackground === state.tokenBackground && state.buttonBackground !== "rgba(0, 0, 0, 0)", `${state.buttonBackground} vs ${state.tokenBackground}`);
    check(`${label2} site CSS applied (<luz-banner> is a block)`, state.sectionDisplay === "block", state.sectionDisplay);
    check(`${label2} landing CSS applied (.luz-landing-footer has its rule)`, state.landingBorder === "solid", state.landingBorder);
    check(`${label2} cms CSS applied (.luz-cms-article-header is a grid)`, state.articleDisplay === "grid", state.articleDisplay);
    check(`${label2} app CSS applied (.luz-app-dashboard is a size container)`, state.dashboardType === "inline-size", state.dashboardType);
    check(`${label2} ${PACKAGES.length} stylesheets with rules`, state.sheets.length === PACKAGES.length && state.sheets.every((n) => n > 0), JSON.stringify(state.sheets));
    check(`${label2} JS entries import and export what the docs name`, state.missing.length === 0, state.missing.join("\n"));
    await page.close();
  }

  // landing with tokens and core only: no request for site, the probes apply
  {
    const page = await browser.newPage();
    const problems = [];
    page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()} ${new URL(r.url()).pathname}`));
    page.on("request", (r) => r.url().includes("/@luz-ds/site") && problems.push(`asked for site: ${new URL(r.url()).pathname}`));
    page.on("console", (m) => ["error", "warning"].includes(m.type()) && problems.push(`console ${m.type()}: ${m.text()}`));
    await page.goto(origin + "/landing-alone.html");
    const state = await page.evaluate(() => ({
      border: getComputedStyle(document.getElementById("probe-landing")).borderTopStyle,
      gridMin: getComputedStyle(document.getElementById("probe-hero")).getPropertyValue("--luz-grid-min").trim(),
      display: getComputedStyle(document.getElementById("probe-hero")).display,
    }));
    check("landing without site: no failed request, no request for site, no console message", problems.length === 0, problems.join("\n"));
    check("landing without site: the footer has its rule and the hero is core's grid with the landing's measure", state.border === "solid" && state.display === "grid" && state.gridMin === "24rem", JSON.stringify(state));
    await page.close();
  }

  // app with tokens and core only: no request for site, the probes apply
  {
    const page = await browser.newPage();
    const problems = [];
    page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()} ${new URL(r.url()).pathname}`));
    page.on("request", (r) => r.url().includes("/@luz-ds/site") && problems.push(`asked for site: ${new URL(r.url()).pathname}`));
    page.on("console", (m) => ["error", "warning"].includes(m.type()) && problems.push(`console ${m.type()}: ${m.text()}`));
    await page.goto(origin + "/app-alone.html");
    const state = await page.evaluate(() => ({
      divider: getComputedStyle(document.getElementById("probe-app-header")).borderBlockEndStyle,
      type: getComputedStyle(document.getElementById("probe-app-dashboard")).containerType,
      gridMin: getComputedStyle(document.getElementById("probe-app-dashboard")).getPropertyValue("--luz-grid-min").trim(),
    }));
    check("app without site: no failed request, no request for site, no console message", problems.length === 0, problems.join("\n"));
    check("app without site: the header has its rule and the dashboard is a size container with an 18rem column", state.divider === "solid" && state.type === "inline-size" && state.gridMin === "18rem", JSON.stringify(state));
    await page.close();
  }
  await browser.close();
}
server.close();

/* ---- 4. The command -------------------------------------------------------- */

const bin = join(installed("tokens"), "bin", "luz-tokens.js");
if (existsSync(bin)) {
  writeFileSync(join(project, "empty.css"), "/* no overrides */\n");
  writeFileSync(join(project, "bad.css"), ":root { --luz-text-secondary: #bbb; }\n");
  const ok = spawnSync(process.execPath, [bin, "check-contrast", "empty.css"], { cwd: project, encoding: "utf-8" });
  check("luz-tokens check-contrast passes LUZ's own tokens (exit 0)", ok.status === 0, ok.stdout + ok.stderr);
  const bad = spawnSync(process.execPath, [bin, "check-contrast", "bad.css"], { cwd: project, encoding: "utf-8" });
  check("luz-tokens check-contrast fails a low-contrast override (exit 1)", bad.status === 1, `exit ${bad.status}\n${bad.stdout}${bad.stderr}`);
} else check("luz-tokens is installed", false, `${relative(project, bin)} is missing`);

/* ---- 5. The check bin ------------------------------------------------------ */

// A tool, not a stylesheet: it is run from the installed package, offline,
// the way `npx @luz-ds/check` runs it. The bin is the link npm made
const checkPkg = JSON.parse(readFileSync(join(installed("check"), "package.json"), "utf-8"));
const checkBin = process.platform === "win32" ? null : join(project, "node_modules", ".bin", "luz-check");
const checkFile = join(installed("check"), checkPkg.bin?.["luz-check"] ?? "dist/luz-check.js");
const luzCheck = (args) =>
  checkBin && existsSync(checkBin)
    ? spawnSync(checkBin, args, { cwd: project, encoding: "utf-8", env: { PATH: process.env.PATH } })
    : spawnSync(process.execPath, [checkFile, ...args], { cwd: project, encoding: "utf-8", env: { PATH: process.env.PATH } });
check("luz-check is installed (the bin of @luz-ds/check)", existsSync(checkFile), `${relative(project, checkFile)} is missing`);
if (existsSync(checkFile)) {
  const version = luzCheck(["--version"]);
  check("luz-check --version prints the installed version (exit 0)", version.status === 0 && version.stdout.includes(versions.check), `exit ${version.status}\n${version.stdout}${version.stderr}`);
  const help = luzCheck(["--help"]);
  check("luz-check --help prints its usage (exit 0)", help.status === 0 && /^Usage: luz-check/m.test(help.stdout), `exit ${help.status}\n${help.stdout}${help.stderr}`);
  const wrong = luzCheck(["--no-such-option"]);
  check("luz-check with an unknown option exits 2", wrong.status === 2, `exit ${wrong.status}\n${wrong.stdout}${wrong.stderr}`);
  const agent = luzCheck(["agent"]);
  check("luz-check agent prints the accessibility reviewer from the installed package (exit 0, first line ---, nothing on stderr)", agent.status === 0 && agent.stdout.split("\n")[0] === "---" && agent.stderr === "", `exit ${agent.status}\n${agent.stdout.slice(0, 200)}${agent.stderr}`);

  // The fixtures of step 8 are copied next to the installed packages, so the
  // run finds node_modules/@luz-ds from them as a project's files do. Every
  // file of pass/ must exit 0. A file of fail/ must exit 1 only for a rule
  // this version of luz-check has: its `expect:` comments name the rules
  // (<!-- expect: rule line:column --> or /* … */), and a file that names one
  // that is not in IMPLEMENTED_RULES is skipped with the step that brings it.
  // Steps 9, 10 and 11 of .claude/plans/specs/f5-ai-ready.md add their rule
  // ids to IMPLEMENTED_RULES, and nothing else in this block changes. Step 9:
  // the rules of names (classes, elements, attributes). Step 10: loading,
  // misuse and accessibility. Step 11: theme colours and the CSS warnings.
  const IMPLEMENTED_RULES = new Set([
    "parse/error",
    "class/unknown",
    "class/unknown-in-css",
    "class/reserved-prefix",
    "element/unknown",
    "element/unknown-attribute",
    "attr/unknown-hook",
    "load/tokens-missing",
    "load/package-missing",
    "load/layer-statement",
    "load/order",
    "load/no-stylesheet",
    "misuse/host-element",
    "misuse/modifier-alone",
    "misuse/part-orphan",
    "misuse/state-class",
    "a11y/role-on-generic",
    "a11y/link-no-href",
    "theme/contrast",
    "theme/unreadable",
    "theme/advisory",
    "css/literal-colour",
    "css/literal-size",
    "css/knob-in-px",
    "css/important",
    "css/private-token",
    "css/unknown-token",
  ]);
  const STEP_OF = [
    [/^(?:class|element|attr)\//, "step 9"],
    [/^(?:load|misuse|a11y)\//, "step 10"],
    [/^(?:theme|css)\//, "step 11"],
  ];
  const stepOf = (rule) => STEP_OF.find(([pattern]) => pattern.test(rule))?.[1] ?? "a later step";
  const expectedRules = (text) => [...text.matchAll(/(?:<!--|\/\*)\s*expect:\s*(\S+)/g)].map((m) => m[1]);

  for (const [folder, wanted] of [["pass", 0], ["fail", 1]]) {
    const from = join(root, "tests", "fixtures", "check", folder);
    if (!existsSync(from)) {
      console.log(`– luz-check on ${folder}/: tests/fixtures/check/${folder} does not exist yet, skipped`);
      continue;
    }
    const to = join(project, "check-fixtures", folder);
    cpSync(from, to, { recursive: true });
    const named = readdirSync(to, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();
    const files = [];
    for (const file of named) {
      const missingRules = folder === "pass" ? [] : [...new Set(expectedRules(readFileSync(join(to, file), "utf-8")))].filter((rule) => !IMPLEMENTED_RULES.has(rule));
      if (missingRules.length === 0) files.push(file);
      else console.log(`– luz-check on ${folder}/${file}: ${missingRules.join(", ")} arrives in ${stepOf(missingRules[0])}, skipped`);
    }
    const wrongExit = files.map((file) => ({ file, run: luzCheck([`check-fixtures/${folder}/${file}`]) })).filter(({ run }) => run.status !== wanted);
    check(
      `luz-check exits ${wanted} on each of the ${files.length} files of ${folder}/${files.length < named.length ? " that this version can judge" : ""}`,
      files.length > 0 && wrongExit.length === 0,
      files.length === 0 ? "no file to judge" : wrongExit.map(({ file, run }) => `${file}: exit ${run.status}\n${run.stdout}${run.stderr}`).join("\n"),
    );
  }
}

/* ---- Done ------------------------------------------------------------------ */

function finish() {
  for (const s of servers) s.close();
  if (KEEP) console.log(`\nkept: ${work}`);
  else rmSync(work, { recursive: true, force: true });
  const failed = results.filter((r) => !r.ok);
  console.log(failed.length ? `\n✗ consumer smoke test: ${failed.length} of ${results.length} checks failed` : `\n✓ consumer smoke test: ${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}
finish();
