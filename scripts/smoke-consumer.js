/**
 * CAI — consumer smoke test.
 * Packs the three packages as `npm pack` would publish them, installs the
 * tarballs into an empty project, and checks what a consumer sees:
 *   1. every entry of each package's `exports` resolves to a file
 *      (patterns such as ./components/* are expanded);
 *   2. a minimal page that links the installed files loads in Chromium with
 *      no failed request, no console error or warning, the tokens defined,
 *      core and platform CSS applied, and the JS exports importable;
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
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEEP = process.argv.includes("--keep");
const PACKAGES = ["tokens", "core", "platform"];
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

const tarballs = PACKAGES.map((name) => {
  const out = execFileSync(npm, ["pack", "--json", "--pack-destination", packs], { cwd: join(root, "packages", name), encoding: "utf-8" });
  return join(packs, JSON.parse(out)[0].filename);
});
check(`packed ${PACKAGES.length} tarballs`, tarballs.every(existsSync));

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
  <link rel="stylesheet" href="${base.platform}/dist/platform.css">
</head>
<body>
  <h1>Smoke test</h1>
  <button class="cai-btn cai-btn--primary" type="button" id="probe-button">Save changes</button>
  <div id="probe-fill" style="background: var(--cai-brand-fill)"></div>
  <script type="module">
    const core = ${JSON.stringify(base.core)};
    const platform = ${JSON.stringify(base.platform)};
    const wanted = {
      [core + "/dist/cai.js"]: [],
      [core + "/dist/tabs.js"]: ["initTabs"],
      [core + "/dist/theme.js"]: ["applyTheme"],
      [core + "/dist/i18n.js"]: ["t", "registerLocale"],
      [core + "/dist/clipboard.js"]: ["initCopyButtons"],
      [platform + "/dist/search.js"]: ["search"],
      [platform + "/dist/platform.js"]: [],
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
  platform: "/node_modules/@cai-ds/platform",
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
        sheets,
        missing: window.__smoke?.missing ?? ["no result"],
      };
    });
    const label2 = `${label}:`;
    check(`${label2} no failed request, console message or request off the machine`, problems.length === 0, problems.join("\n"));
    check(`${label2} tokens loaded (--cai-brand-fill is defined)`, state.token !== "", "the custom property is empty");
    check(`${label2} core CSS applied (.cai-btn--primary uses the token)`, state.buttonBackground === state.tokenBackground && state.buttonBackground !== "rgba(0, 0, 0, 0)", `${state.buttonBackground} vs ${state.tokenBackground}`);
    check(`${label2} three stylesheets with rules`, state.sheets.length === 3 && state.sheets.every((n) => n > 0), JSON.stringify(state.sheets));
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
