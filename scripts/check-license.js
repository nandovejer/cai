/**
 * LUZ — licence gate (PRINCIPLES.md red lines 1 and 13; spec f7-open-source.md, step 1).
 *
 * 1. Every published package (not `private`) says "license": "MIT", carries a
 *    LICENSE file with exactly the text of the repository's, and has no
 *    `dependencies` (nothing third-party ships).
 * 2. Every direct dependency of every importer of pnpm-lock.yaml has a licence
 *    on the allowlist. These are development tools: nothing in the list ships,
 *    and the check says so in the report.
 * 3. dev/LICENSES.md is the generated list of those dependencies and is up to
 *    date. `--update` rewrites it; it never legitimises a problem of 1 or 2.
 *
 * Usage: node scripts/check-license.js [--update] [--root <dir>]
 * Exit code: 0 when everything passes, 1 otherwise.
 *
 * Direct dependencies only: transitive ones are the business of `pnpm audit`.
 * Importing this module has no side effect.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
    if (Object.keys(pkg.dependencies ?? {}).length) problems.push(`${name}: it has dependencies (${Object.keys(pkg.dependencies).join(", ")}); a published package ships no third-party code (red line 1).`);
  }
  return problems;
}

/* ---- dev/LICENSES.md --------------------------------------------------------------- */

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
    "Every package here is a development-only tool (build, lint, test). Nothing in this list ships: the published packages have no `dependencies` and are MIT (`pnpm check:license` checks both). Only the direct dependencies of each workspace are listed, with the licence their installed `package.json` declares; \"Used by\" is the workspace (`.` is the root).",
    "",
    "| Name | Version | Licence | Used by |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    ...(accepted.length ? ["Not on the allowlist, accepted by name (`ACCEPTED_DEV` in `scripts/check-license.js`):", "", ...accepted.map((e) => `- \`${e.name}\` (${e.licence}): ${ACCEPTED_DEV[e.name].why}`), ""] : []),
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

  const problems = checkPackages(root);
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
