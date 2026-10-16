/**
 * LUZ — licence gate (PRINCIPLES.md red lines 1 and 13; spec f7-open-source.md, step 1).
 *
 * 1. Every published package (not `private`) says "license": "MIT", carries a
 *    LICENSE file with exactly the text of the repository's, and has no
 *    `dependencies`, `optionalDependencies` or bundled dependencies (nothing
 *    third-party ships).
 * 2. Every direct dependency of every importer of pnpm-lock.yaml has a licence
 *    on the allowlist. These are development tools: nothing in the list ships,
 *    and the check says so in the report.
 * 3. The Pages site (docs/assets) holds no third-party code without its notice
 *    (`checkPagesSite`): Vite's `__vitePreload` helper and module-preload polyfill
 *    need docs/LICENSE-vite.txt.
 * 4. dev/LICENSES.md is the generated list of those dependencies and is up to
 *    date. `--update` rewrites it; it never legitimises a problem of 1 or 2.
 *
 * Usage: node scripts/check-license.js [--update] [--root <dir>]
 * Exit code: 0 when everything passes, 1 otherwise.
 *
 * Direct dependencies only: transitive ones are the business of `pnpm audit`.
 * Importing this module has no side effect.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** SPDX ids whose terms a dependency of the tooling may have. */
export const ALLOWED = ["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD", "BlueOak-1.0.0", "Python-2.0", "CC0-1.0", "Unlicense", "MIT-0"];

/**
 * Development-only tools whose licence is not on the allowlist, accepted by
 * name AND licence so a change of licence at the next version fails again. The
 * allowlist stays the list of the spec; this is the one place that departs from
 * it, and it never reaches a published package (those have no dependencies).
 */
export const ACCEPTED_DEV = {
  "@axe-core/playwright": {
    licence: "MPL-2.0",
    why: "the accessibility checks of tests/ (axe-core, Deque). MPL-2.0 is a file-level licence: it asks that changes to the tool's own files stay open, not anything that runs it. LUZ does not modify it, bundle it or ship it.",
  },
};

/** True when a dependency's licence is allowed, or is the accepted licence of an accepted dev tool. */
export function acceptedDependency(entry) {
  return allowedLicence(entry.licence) || ACCEPTED_DEV[entry.name]?.licence === entry.licence;
}

/* ---- SPDX expressions ------------------------------------------------------- */

/**
 * `A OR B`: one side is enough. `A AND B`: both. AND binds tighter than OR, as
 * in SPDX. Anything the grammar does not know (WITH, +, a typo) is not allowed.
 */
export function allowedLicence(spdx) {
  if (typeof spdx !== "string" || !spdx.trim() || spdx === "UNKNOWN") return false;
  const tokens = spdx.match(/\(|\)|[^\s()]+/g) ?? [];
  let at = 0;
  const peek = () => tokens[at];

  // Each parser returns true, false, or null for a syntax error.
  function parseOr() {
    let result = parseAnd();
    while (result !== null && peek() === "OR") {
      at++;
      const right = parseAnd();
      result = right === null ? null : result || right;
    }
    return result;
  }
  function parseAnd() {
    let result = parseAtom();
    while (result !== null && peek() === "AND") {
      at++;
      const right = parseAtom();
      result = right === null ? null : result && right;
    }
    return result;
  }
  function parseAtom() {
    const token = tokens[at++];
    if (token === undefined || token === ")" || token === "OR" || token === "AND") return null;
    if (token === "(") {
      const inner = parseOr();
      if (inner === null || tokens[at++] !== ")") return null;
      return inner;
    }
    return ALLOWED.includes(token);
  }

  const result = parseOr();
  return result === true && at === tokens.length;
}

/* ---- pnpm-lock.yaml (v9) -------------------------------------------------------- */

const SECTIONS = new Set(["dependencies", "devDependencies", "optionalDependencies"]);
const unquote = (s) => s.trim().replace(/^(["'])(.*)\1$/, "$2");

/** The direct dependencies of every importer, in file order. */
export function parseImporters(lockText) {
  const out = [];
  let inImporters = false;
  let importer = null;
  let section = null;
  let name = null;
  for (const line of lockText.split("\n")) {
    if (/^\S/.test(line)) {
      inImporters = line.startsWith("importers:");
      importer = section = name = null;
      continue;
    }
    if (!inImporters || !line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const text = line.trim();
    if (indent === 2 && text.endsWith(":")) {
      importer = unquote(text.slice(0, -1));
      section = name = null;
    } else if (indent === 4 && text.endsWith(":")) {
      section = SECTIONS.has(text.slice(0, -1)) ? text.slice(0, -1) : null;
      name = null;
    } else if (indent === 6 && section && text.endsWith(":")) {
      name = unquote(text.slice(0, -1));
    } else if (indent === 8 && name && text.startsWith("version:")) {
      const version = unquote(text.slice("version:".length));
      if (!version.startsWith("link:")) out.push({ importer, name, version: version.replace(/\(.*$/, "") });
      name = null;
    }
  }
  return out;
}

const byNameThenVersion = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.version < b.version ? -1 : a.version > b.version ? 1 : 0);

function licenceOf(file) {
  if (!existsSync(file)) return "UNKNOWN";
  try {
    const pkg = JSON.parse(readFileSync(file, "utf-8"));
    if (typeof pkg.license === "string" && pkg.license.trim()) return pkg.license.trim();
    if (typeof pkg.license?.type === "string" && pkg.license.type.trim()) return pkg.license.type.trim();
  } catch {
    // An unreadable package.json has no licence we can vouch for.
  }
  return "UNKNOWN";
}

/** One entry per name@version: its licence (from node_modules) and the importers that use it. */
export function collectDependencies(root) {
  const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf-8");
  const entries = new Map();
  for (const { importer, name, version } of parseImporters(lock)) {
    const key = `${name}@${version}`;
    if (!entries.has(key)) {
      const dir = importer === "." ? root : join(root, importer);
      entries.set(key, { name, version, licence: licenceOf(join(dir, "node_modules", name, "package.json")), usedBy: [] });
    }
    const entry = entries.get(key);
    if (!entry.usedBy.includes(importer)) entry.usedBy.push(importer);
  }
  return [...entries.values()].sort(byNameThenVersion);
}

/* ---- The published packages ------------------------------------------------------ */

export function checkPackages(root) {
  const problems = [];
  const dir = join(root, "packages");
  if (!existsSync(dir)) return problems;
  const repoLicence = existsSync(join(root, "LICENSE")) ? readFileSync(join(root, "LICENSE"), "utf-8") : null;
  for (const entry of readdirSync(dir).sort()) {
    const base = join(dir, entry);
    if (!statSync(base).isDirectory() || !existsSync(join(base, "package.json"))) continue;
    const pkg = JSON.parse(readFileSync(join(base, "package.json"), "utf-8"));
    if (pkg.private) continue;
    const name = pkg.name ?? `packages/${entry}`;
    if (pkg.license !== "MIT") problems.push(`${name}: "license" is ${JSON.stringify(pkg.license ?? null)}, a published package is MIT and only MIT (red line 13).`);
    if (!existsSync(join(base, "LICENSE"))) problems.push(`${name}: no LICENSE file; copy the one at the root of the repository.`);
    else if (repoLicence === null || readFileSync(join(base, "LICENSE"), "utf-8") !== repoLicence) problems.push(`${name}: its LICENSE is not exactly the text of the repository's LICENSE.`);
    for (const field of ["dependencies", "optionalDependencies"]) {
      const names = Object.keys(pkg[field] ?? {});
      if (names.length) problems.push(`${name}: it has ${field} (${names.join(", ")}); a published package ships no third-party code (red line 1).`);
    }
    for (const field of ["bundleDependencies", "bundledDependencies"]) {
      const value = pkg[field];
      const names = Array.isArray(value) ? value : value && typeof value === "object" ? Object.keys(value) : [];
      if (names.length || value === true) problems.push(`${name}: it has ${field} (${value === true ? "all" : names.join(", ")}); a published package ships no third-party code (red line 1).`);
    }
  }
  return problems;
}

/* ---- The Pages site ------------------------------------------------------------------ */

function* jsFiles(dir) {
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) yield* jsFiles(file);
    else if (name.endsWith(".js")) yield file;
  }
}

/**
 * Third-party code the Pages build emits into docs/assets: Vite's `__vitePreload`
 * helper and its module-preload polyfill (MIT, VoidZero Inc. and Vite
 * contributors; the polyfill is recognised by two markers in one file). A built
 * file that holds either needs docs/LICENSE-vite.txt beside the site, with the
 * real notice: its text names "MIT License" and "Vite" (red line 13). The pages
 * build turns the polyfill off and emits the notice; each file is reported once.
 */
export function checkPagesSite(root) {
  const problems = [];
  const assets = join(root, "docs", "assets");
  if (!existsSync(assets)) return problems;
  const noticeFile = join(root, "docs", "LICENSE-vite.txt");
  let state = null;
  const noticeState = () => {
    if (state) return state;
    if (!existsSync(noticeFile)) return (state = "is missing");
    const text = readFileSync(noticeFile, "utf-8");
    return (state = text.includes("MIT License") && text.includes("Vite") ? "ok" : "is not Vite's licence notice (it needs the text of Vite's LICENSE.md)");
  };
  for (const file of jsFiles(assets)) {
    const text = readFileSync(file, "utf-8");
    const helper = text.includes("__vitePreload");
    const polyfill = text.includes('link[rel="modulepreload"]') && text.includes("MutationObserver");
    if (!helper && !polyfill) continue;
    const status = noticeState();
    if (status === "ok") continue;
    const what = helper ? "Vite's __vitePreload helper" : "Vite's module-preload polyfill";
    problems.push(`${relative(root, file).split(sep).join("/")}: it holds ${what} (MIT) and docs/LICENSE-vite.txt ${status}; the pages build emits it (red line 13).`);
  }
  return problems;
}

/* ---- dev/LICENSES.md --------------------------------------------------------------- */

/**
 * Data the Pages site serves that is neither code nor a dependency: public
 * domain, with its origin noted next to it (PRINCIPLES.md red line 13, owner
 * decision D9, 2026-10-16). Listed in dev/LICENSES.md after the dependencies.
 */
export const DATA = [
  {
    name: "Natural Earth 1:50m land polygons",
    licence: "public domain, naturalearthdata.com terms of use",
    where: "the land of the home page's globe, rasterised into `apps/landing/light/globe.js`",
    file: "apps/landing/light/globe.js",
    origin: "Natural Earth",
  },
];

/** Each DATA entry's file, when it is there, carries its origin note: the origin and "public domain". */
export function checkData(root) {
  const problems = [];
  for (const d of DATA) {
    const path = join(root, d.file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf-8");
    if (!text.includes(d.origin) || !/public domain/i.test(text)) {
      problems.push(`${d.file}: the data of ${d.name} needs its origin note next to it, "${d.origin}" and "public domain" (red line 13, DATA in scripts/check-license.js).`);
    }
  }
  return problems;
}

const cell = (text) => String(text).replace(/\|/g, "\\|");

export function renderReport(entries) {
  const rows = [...entries].sort(byNameThenVersion).map((e) => `| ${cell(e.name)} | ${cell(e.version)} | ${cell(e.licence)} | ${cell(e.usedBy.join(", "))} |`);
  const accepted = [...entries].sort(byNameThenVersion).filter((e) => !allowedLicence(e.licence) && ACCEPTED_DEV[e.name]?.licence === e.licence);
  return [
    "# Licences of the development dependencies",
    "",
    "<!-- Generated by scripts/check-license.js. Do not edit by hand. -->",
    "",
    "This list is generated: run `node scripts/check-license.js --update` after a change to `pnpm-lock.yaml`, and `pnpm check:license` fails when it is out of date.",
    "",
    "Every package here is a development-only tool (build, lint, test) of the repository's workspaces, and none of them is shipped in a published package: those have no `dependencies` and are MIT (`pnpm check:license` checks both). Code a tool puts into the Pages site is not covered by this list: `pnpm check:license` looks for it in `docs/assets` and asks for its notice (`checkPagesSite` in `scripts/check-license.js`). Only the direct dependencies of each workspace are listed, with the licence their installed `package.json` declares; \"Used by\" is the workspace (`.` is the root).",
    "",
    "| Name | Version | Licence | Used by |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    ...(accepted.length ? ["Not on the allowlist, accepted by name (`ACCEPTED_DEV` in `scripts/check-license.js`):", "", ...accepted.map((e) => `- \`${e.name}\` (${e.licence}): ${ACCEPTED_DEV[e.name].why}`), ""] : []),
    "Data, not a dependency: the Pages site serves it, it is in the public domain and its origin is noted next to it (`DATA` in `scripts/check-license.js`):",
    "",
    ...DATA.map((d) => `- ${d.name} (${d.licence}): ${d.where}.`),
    "",
  ].join("\n");
}

export function reportStatus(root) {
  const expected = renderReport(collectDependencies(root));
  const file = join(root, "dev", "LICENSES.md");
  return { upToDate: existsSync(file) && readFileSync(file, "utf-8") === expected, expected };
}

/* ---- Command ------------------------------------------------------------------------- */

function main(argv) {
  const update = argv.includes("--update");
  const at = argv.indexOf("--root");
  const root = at >= 0 && argv[at + 1] ? resolve(argv[at + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), "..");

  const problems = [...checkPackages(root), ...checkPagesSite(root), ...checkData(root)];
  const entries = collectDependencies(root);
  for (const e of entries) {
    if (!acceptedDependency(e)) problems.push(`${e.name}@${e.version} (${e.usedBy.join(", ")}): licence ${e.licence} is not on the allowlist (${ALLOWED.join(", ")}).`);
  }

  if (problems.length) {
    console.error(`✗ check:license: ${problems.length} problem${problems.length === 1 ? "" : "s"}${update ? " (dev/LICENSES.md was not written: --update never legitimises one)" : ""}`);
    for (const p of problems) console.error(`  - ${p}`);
    return 1;
  }

  const status = reportStatus(root);
  if (update) {
    if (!status.upToDate) {
      mkdirSync(join(root, "dev"), { recursive: true });
      writeFileSync(join(root, "dev", "LICENSES.md"), status.expected);
    }
    console.log(`✓ check:license: dev/LICENSES.md ${status.upToDate ? "is up to date" : "rewritten"} (${entries.length} dependencies)`);
    return 0;
  }
  if (!status.upToDate) {
    console.error("✗ check:license: dev/LICENSES.md is missing or out of date with pnpm-lock.yaml. Run: node scripts/check-license.js --update");
    return 1;
  }
  console.log(`✓ check:license: ${entries.length} dependencies, all allowed; published packages are MIT with no dependencies`);
  return 0;
}

const isEntry = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isEntry) process.exit(main(process.argv.slice(2)));
