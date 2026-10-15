/**
 * LUZ — what an agent reads is generated from what a person reads, and a
 * stale copy fails (PRINCIPLES.md, red line 19, RL-19).
 *
 * The files for AI agents are written by the builds: the manifests of each
 * package by `pnpm build`, llms.txt, llms-full.txt, the examples and the
 * copies of the manifests on Pages by `pnpm pages:build`. This script
 * regenerates each in memory, with the repository's own generators, and
 * compares bytes with what is on disk:
 *
 *   1. `classes.json` of every package, and `custom-elements.json` of core
 *      and site: regenerated from the CSS and JS of `packages/<p>/dist`
 *      (scripts/ai-manifests.js), against the files beside them;
 *   2. `docs/llms.txt`, `docs/llms-full.txt`, every `docs/examples/<area>/
 *      <slug>.html` and every `docs/manifests/<pkg>/*.json`: rendered by
 *      scripts/docs-site/ai.js from `apps/docs` with SITE_URL, PAGES_CSP and
 *      the versions of the packages, as the pages build uses them, and the
 *      manifests of layer 1;
 *   3. the "For AI agents" block of each README: `node scripts/ai-readme.js
 *      --check`;
 *   4. the snapshot `tests/fixtures/check/agent.md`: against the agent
 *      `@luz-ds/check` builds from the repository's accessibility agent.
 *
 * Needs the packages built: run `pnpm build` first (`pnpm check:ai` in CI and
 * in `pnpm qa:release` runs after it). It reads the repository it sits in,
 * not the working directory; it writes nothing, makes no temporary file and
 * opens no connection. What it does not see: prose only an agent would read,
 * and whether a description means what it says (that is the review's).
 *
 * Exit 0 and a line that starts with ✓, or exit 1 and, on stderr, one line
 * per stale file (its path from the repository root) and what to run.
 *
 * Usage: node scripts/check-ai.js
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAgent } from "./build-check.js";
import { buildClassManifest, buildElementManifest, formatClassManifest } from "./ai-manifests.js";
import { exampleDocuments, renderLlmsFull, renderLlmsTxt } from "./docs-site/ai.js";
import { scanSite } from "./docs-site/site.js";
import { PACKAGES } from "./luz-packages.js";
import { PAGES_CSP, SITE_URL } from "../vite.config.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = "tests/fixtures/check/agent.md";
const ELEMENT_PACKAGES = ["core", "site"];

/** `✗ <path>: <why>` per stale file, in the order found. */
const problems = [];
/** The commands that put them right, once each, in the order first needed. */
const fixes = new Set();

const stale = (path, why, fix) => {
  problems.push(`✗ ${path}: ${why}`);
  fixes.add(fix);
};
const BUILD = "`pnpm build` (the packages' dist/, then the manifests)";
const PAGES = "`pnpm pages:build`, then commit docs/";

/** The bytes of a file of the repository, or null when there is none. */
const bytesOf = (path) => (existsSync(join(root, path)) ? readFileSync(join(root, path)) : null);

/** Compare the file at `path` with `expected` (a string or a Buffer); report it when missing or different. */
function compare(path, expected, fix) {
  const actual = bytesOf(path);
  if (actual === null) return stale(path, "is missing", fix);
  if (!actual.equals(Buffer.isBuffer(expected) ? expected : Buffer.from(expected, "utf-8"))) {
    stale(path, "differs from what is generated", fix);
  }
  return undefined;
}

/** Run one layer: an error a generator throws is a problem of that layer, never a stack trace. */
function layer(name, fix, work) {
  try {
    work();
  } catch (error) {
    problems.push(`✗ ${name}: ${String(error?.message ?? error).split("\n")[0]}`);
    fixes.add(fix);
  }
}

/** Every file under `dir` (relative to the root, with `/`), sorted; none when `dir` is missing. */
function filesUnder(dir) {
  if (!existsSync(join(root, dir))) return [];
  const out = [];
  for (const entry of readdirSync(join(root, dir)).sort()) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...filesUnder(rel));
    else out.push(rel);
  }
  return out;
}

/* ---- 0. The packages are built ------------------------------------------------ */

const unbuilt = PACKAGES.filter((name) => !existsSync(join(root, "packages", name, "dist", "classes.json")));
if (unbuilt.length > 0) {
  for (const name of unbuilt) problems.push(`✗ packages/${name}/dist: is not built, so there is nothing to compare`);
  fixes.add(BUILD);
  report();
}

/* ---- 1. The manifests of the packages ----------------------------------------- */

/** What each package's dist should hold: package -> { classes, elements } as text (elements null when it has no tag). */
const manifests = new Map();
layer("the manifests of the packages", BUILD, () => {
  for (const name of PACKAGES) {
    const dist = `packages/${name}/dist`;
    const classes = formatClassManifest(buildClassManifest(name, { root }));
    const element = buildElementManifest(name, { root });
    const elements = element === null ? null : `${JSON.stringify(element, null, 2)}\n`;
    manifests.set(name, { classes, elements });
    compare(`${dist}/classes.json`, classes, BUILD);
    if (elements !== null) compare(`${dist}/custom-elements.json`, elements, BUILD);
    else if (bytesOf(`${dist}/custom-elements.json`) !== null) stale(`${dist}/custom-elements.json`, "is there, and the package defines no tag", BUILD);
  }
  for (const name of ELEMENT_PACKAGES) {
    if (manifests.get(name)?.elements === null) stale(`packages/${name}/dist/custom-elements.json`, "is not generated: the package defines no tag", BUILD);
  }
});

/* ---- 2. llms.txt, llms-full.txt, the examples, the manifests on Pages ---------- */

layer("the pages of docs/", PAGES, () => {
  const site = scanSite(join(root, "apps", "docs"), root);
  compare("docs/llms.txt", renderLlmsTxt(site, { siteUrl: SITE_URL }), PAGES);
  compare("docs/llms-full.txt", renderLlmsFull(site, { siteUrl: SITE_URL }), PAGES);

  // The examples: one document per page with a markup section, and no other
  if (existsSync(join(root, "packages", "site", "dist", "custom-elements.json"))) {
    const versions = Object.fromEntries(
      PACKAGES.map((name) => [name, JSON.parse(readFileSync(join(root, "packages", name, "package.json"), "utf-8")).version]),
    );
    const expected = new Map();
    for (const doc of exampleDocuments(site, { csp: PAGES_CSP, versions, root })) expected.set(`docs${doc.route}`, doc.html);
    for (const [path, html] of expected) compare(path, html, PAGES);
    // The files the build copies beside them (docs/examples/dist/) are check-generated's
    const have = filesUnder("docs/examples").filter((path) => path.endsWith(".html") && !path.startsWith("docs/examples/dist/"));
    for (const path of have) if (!expected.has(path)) stale(path, "is not produced by any page", PAGES);
  }

  // The manifests: the package's own bytes, copied
  const copies = new Set();
  for (const [name, { classes, elements }] of manifests) {
    copies.add(`docs/manifests/${name}/classes.json`);
    compare(`docs/manifests/${name}/classes.json`, classes, PAGES);
    if (elements !== null) {
      copies.add(`docs/manifests/${name}/custom-elements.json`);
      compare(`docs/manifests/${name}/custom-elements.json`, elements, PAGES);
    }
  }
  for (const path of filesUnder("docs/manifests")) if (!copies.has(path)) stale(path, "is not a manifest of any package", PAGES);
});

/* ---- 3. The "For AI agents" block of each README ------------------------------- */

layer("the READMEs", "`node scripts/ai-readme.js --write`, then commit the READMEs", () => {
  const readme = spawnSync(process.execPath, [join(root, "scripts", "ai-readme.js"), "--check"], { cwd: root, encoding: "utf-8" });
  if (readme.status === 0) return;
  const lines = String(readme.stderr ?? "").split("\n").filter((line) => line.startsWith("✗ "));
  if (lines.length === 0) throw new Error(`scripts/ai-readme.js --check failed: ${String(readme.stderr ?? "").trim().split("\n")[0] || "no message"}`);
  for (const line of lines) {
    problems.push(line);
    fixes.add("`node scripts/ai-readme.js --write`, then commit the READMEs");
  }
});

/* ---- 4. The snapshot of the published agent ------------------------------------- */

layer("the agent of @luz-ds/check", `\`node scripts/build-check.js\`, then copy packages/check/dist/agents/luz-accessibility-reviewer.md to ${SNAPSHOT} and read the diff`, () => {
  compare(
    SNAPSHOT,
    buildAgent(),
    `\`node scripts/build-check.js\`, then copy packages/check/dist/agents/luz-accessibility-reviewer.md to ${SNAPSHOT} and read the diff`,
  );
});

report();

/** Print the result and end: exit 0 on a clean run, 1 with every stale file and what to run. */
function report() {
  if (problems.length > 0) {
    console.error(`${problems.join("\n")}\nThe files for AI agents are generated, never edited by hand (RL-19). To put them right, run: ${[...fixes].join("; ")}.`);
    process.exit(1);
  }
  console.log("✓ the manifests, llms.txt, llms-full.txt, the examples, the READMEs' agent blocks and the agent snapshot are as generated");
  process.exit(0);
}
