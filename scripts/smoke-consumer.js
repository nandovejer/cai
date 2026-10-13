/**
 * CAI — consumer smoke test.
 * Packs every published package (scripts/cai-packages.js) as `npm pack`
 * would publish it, installs the tarballs into an empty project, and checks
 * what a consumer sees. The versions are the ones the pending changesets
 * will publish: `changeset version` runs on a copy of the manifests, so a
 * package whose peers name the next major of the base (landing's ^3.0.0
 * while the workspace is still at 2.x) installs as it will on npm.
 *   1. every entry of each package's `exports` resolves to a file
 *      (patterns such as ./components/* are expanded);
 *   2. a minimal page that links the installed files loads in Chromium with
 *      no failed request, no console error or warning, the tokens defined,
 *      core, site and landing CSS applied, and the JS exports importable;
 *   3. the same page with jsDelivr-style URLs (/npm/@cai-ds/<pkg>@<version>/…),
 *      served from the same tarballs by a local server: no network is used;
 *   4. the `cai-tokens` command runs from the installed package.
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
import { PACKAGES } from "./cai-packages.js";

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

for (const name of PACKAGES) {
  if (!existsSync(join(root, "packages", name, "dist"))) fail(`packages/${name}/dist is missing: run "pnpm build" first`);
}
let chromium;
try {
  ({ chromium } = await import("@playwright/test"));
} catch {
  fail('@playwright/test is not installed: run "pnpm install"');
}

/* ---- 1. Pack and install --------------------------------------------------- */

const work = mkdtempSync(join(process.env.CAI_SMOKE_DIR ?? tmpdir(), "cai-smoke-"));
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
for (const name of PACKAGES) {
  for (const file of ["package.json", "CHANGELOG.md"]) {
    if (existsSync(join(root, "packages", name, file))) cpSync(join(root, "packages", name, file), join(plan, "packages", name, file));
  }
}
const changeset = join(root, "node_modules", ".bin", process.platform === "win32" ? "changeset.cmd" : "changeset");
const versioned = spawnSync(changeset, ["version"], { cwd: plan, encoding: "utf-8" });
check("ran changeset version on a copy of the manifests", versioned.status === 0, versioned.stderr || versioned.stdout);
if (versioned.status !== 0) finish();

// Each package is packed from a copy of its folder with the released manifest
const tarballs = PACKAGES.map((name) => {
  const copy = join(work, "src", name);
  cpSync(join(root, "packages", name), copy, { recursive: true, filter: (from) => !from.split(sep).includes("node_modules") });
  cpSync(join(plan, "packages", name, "package.json"), join(copy, "package.json"));
  const out = execFileSync(npm, ["pack", "--json", "--pack-destination", packs], { cwd: copy, encoding: "utf-8" });
  return join(packs, JSON.parse(out)[0].filename);
});
check(`packed ${PACKAGES.length} tarballs (${tarballs.map((t) => t.split(sep).pop().replace(/^cai-ds-|\.tgz$/g, "")).join(", ")})`, tarballs.every(existsSync));

writeFileSync(join(project, "package.json"), JSON.stringify({ name: "cai-smoke", private: true, type: "module" }));
const install = spawnSync(npm, ["install", "--offline", "--no-audit", "--no-fund", "--ignore-scripts", ...tarballs], { cwd: project, encoding: "utf-8" });
check("installed the tarballs offline", install.status === 0, install.stderr || install.stdout);
if (install.status !== 0) finish();

const installed = (name) => join(project, "node_modules", "@cai-ds", name);
const versions = Object.fromEntries(PACKAGES.map((n) => [n, JSON.parse(readFileSync(join(installed(n), "package.json"), "utf-8")).version]));

/* ---- 2. Every export resolves ---------------------------------------------- */

const require = createRequire(join(project, "package.json"));
for (const name of PACKAGES) {
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
      const dir = join(installed(name), prefix);
      if (!existsSync(dir)) problems.push(`${key}: ${prefix} is not installed`);
      else {
        // A pattern matches nested paths too (./fonts/serif/ETBook-Bold.woff2)
        const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [relative(dir, join(d, e.name)).split(sep).join("/")]));
        for (const f of walk(dir).filter((f) => f.endsWith(suffix))) keys.push(key.replace("*", f.slice(0, f.length - suffix.length)));
      }
      if (existsSync(dir) && keys.length === 0) problems.push(`${key}: the pattern matches nothing`);
    } else keys.push(key);
    for (const k of keys) {
      count++;
      const specifier = `@cai-ds/${name}${k === "." ? "" : k.slice(1)}`;
      try {
        const path = require.resolve(specifier);
        if (!existsSync(path)) problems.push(`${specifier}: resolves to a missing file`);
      } catch (error) {
        problems.push(`${specifier}: ${error.code ?? error.message}`);
      }
    }
  }
  check(`@cai-ds/${name}: ${count} exports resolve`, problems.length === 0, problems.join("\n"));
}

/* ---- 3. The pages ---------------------------------------------------------- */

const PAGE = (base, label) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CAI smoke test: ${label}</title>
  <link rel="stylesheet" href="${base.tokens}/dist/cai-tokens.css">
  <link rel="stylesheet" href="${base.core}/dist/cai.css">
  <link rel="stylesheet" href="${base.site}/dist/site.css">
  <link rel="stylesheet" href="${base.landing}/dist/landing.css">
</head>
<body>
  <h1>Smoke test</h1>
  <button class="cai-btn cai-btn--primary" type="button" id="probe-button">Save changes</button>
  <div id="probe-fill" style="background: var(--cai-brand-fill)"></div>
  <div class="cai-site-section" id="probe-section"></div>
  <div class="cai-landing-feature-grid" id="probe-grid"></div>
  <script type="module">
    const core = ${JSON.stringify(base.core)};
    const site = ${JSON.stringify(base.site)};
    const wanted = {
      [core + "/dist/cai.js"]: [],
      [core + "/dist/tabs.js"]: ["initTabs"],
      [core + "/dist/theme.js"]: ["applyTheme"],
      [core + "/dist/i18n.js"]: ["t", "registerLocale"],
      [core + "/dist/clipboard.js"]: ["initCopyButtons"],
      [site + "/dist/search.js"]: ["search"],
      [site + "/dist/site.js"]: [],
    };
    const missing = [];
    for (const [url, names] of Object.entries(wanted)) {
      try {
        const module = await import(url);
        for (const name of names) if (typeof module[name] !== "function") missing.push(url + " has no " + name + "()");
      } catch (error) {
        missing.push(url + ": " + error.message);
      }
    }
    window.__smoke = { done: true, missing };
  </script>
</body>
</html>
`;

const local = {
  tokens: "/node_modules/@cai-ds/tokens",
  core: "/node_modules/@cai-ds/core",
  site: "/node_modules/@cai-ds/site",
  landing: "/node_modules/@cai-ds/landing",
};
const cdn = Object.fromEntries(PACKAGES.map((n) => [n, `/npm/@cai-ds/${n}@${versions[n]}`]));

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const path = decodeURIComponent(url.pathname);
  const send = (status, body, type = "text/plain") => {
    res.writeHead(status, { "content-type": type });
    res.end(body);
  };
  if (path === "/npm.html") return send(200, PAGE(local, "installed files"), TYPES[".html"]);
  if (path === "/cdn.html") return send(200, PAGE(cdn, "CDN paths"), TYPES[".html"]);
  // jsDelivr layout: /npm/@cai-ds/<name>@<version>/<file>
  const cdnPath = path.match(/^\/npm\/@cai-ds\/([\w-]+)@([^/]+)\/(.+)$/);
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
      const grid = getComputedStyle(document.getElementById("probe-grid"));
      const sheets = [...document.styleSheets].map((s) => {
        try {
          return s.cssRules.length;
        } catch {
          return -1;
        }
      });
      return {
        token: root.getPropertyValue("--cai-brand-fill").trim(),
        buttonBackground: button.backgroundColor,
        tokenBackground: fill.backgroundColor,
        buttonHeight: parseFloat(button.height),
        sectionDisplay: section.display,
        gridDisplay: grid.display,
        gridColumns: grid.gridTemplateColumns,
        sheets,
        missing: window.__smoke?.missing ?? ["no result"],
      };
    });
    const label2 = `${label}:`;
    check(`${label2} no failed request, console message or request off the machine`, problems.length === 0, problems.join("\n"));
    check(`${label2} tokens loaded (--cai-brand-fill is defined)`, state.token !== "", "the custom property is empty");
    check(`${label2} core CSS applied (.cai-btn--primary uses the token)`, state.buttonBackground === state.tokenBackground && state.buttonBackground !== "rgba(0, 0, 0, 0)", `${state.buttonBackground} vs ${state.tokenBackground}`);
    check(`${label2} site CSS applied (.cai-site-section is a grid)`, state.sectionDisplay === "grid", state.sectionDisplay);
    check(`${label2} landing CSS applied (.cai-landing-feature-grid is a grid with columns)`, state.gridDisplay === "grid" && state.gridColumns !== "none", `${state.gridDisplay} / ${state.gridColumns}`);
    check(`${label2} ${PACKAGES.length} stylesheets with rules`, state.sheets.length === PACKAGES.length && state.sheets.every((n) => n > 0), JSON.stringify(state.sheets));
    check(`${label2} JS entries import and export what the docs name`, state.missing.length === 0, state.missing.join("\n"));
    await page.close();
  }
  await browser.close();
}
server.close();

/* ---- 4. The command -------------------------------------------------------- */

const bin = join(installed("tokens"), "bin", "cai-tokens.js");
if (existsSync(bin)) {
  writeFileSync(join(project, "empty.css"), "/* no overrides */\n");
  writeFileSync(join(project, "bad.css"), ":root { --cai-text-secondary: #bbb; }\n");
  const ok = spawnSync(process.execPath, [bin, "check-contrast", "empty.css"], { cwd: project, encoding: "utf-8" });
  check("cai-tokens check-contrast passes CAI's own tokens (exit 0)", ok.status === 0, ok.stdout + ok.stderr);
  const bad = spawnSync(process.execPath, [bin, "check-contrast", "bad.css"], { cwd: project, encoding: "utf-8" });
  check("cai-tokens check-contrast fails a low-contrast override (exit 1)", bad.status === 1, `exit ${bad.status}\n${bad.stdout}${bad.stderr}`);
} else check("cai-tokens is installed", false, `${relative(project, bin)} is missing`);

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
