/**
 * LUZ Check — dist builder
 * Bundles packages/check/src/main.js into one file, the bin of
 * @luz-ds/check (f5-ai-ready.md 5.1, 8 "Supply chain"):
 *
 *   packages/check/dist/luz-check.js
 *
 * esbuild, as scripts/build-package.js: Node, ESM, node20, every `node:`
 * built-in left as an import. Not minified (people and the security audit
 * read it), no source map, and the `sample` of each message of messages.js
 * left out (it is what tests/check-messages.test.js renders, never what the
 * tool says), and nothing in it that changes between runs: the
 * paths in its comments are relative to the repository, and the shebang is
 * the one line esbuild writes first. `packages: "external"` keeps a bare
 * import an import, which tests/check-capabilities.test.js then rejects,
 * instead of inlining a file of node_modules into a published tool.
 *
 * and, beside it, the facts of this release for a project that has no
 * node_modules/@luz-ds (it uses a CDN), as DATA the tool reads at run time and
 * never inlined in the bundle (f5-ai-ready.md 5.4, 5.1):
 *
 *   packages/check/dist/data/index.json                    the six packages and their versions
 *   packages/check/dist/data/<pkg>/classes.json            tokens, core, site, landing, cms, app
 *   packages/check/dist/data/<core|site>/custom-elements.json
 *   packages/check/dist/data/tokens/tokens.css             LUZ's colour tokens, for the theme rules
 *
 * Each is what the package's own dist/ says, reduced to what a rule reads
 * (names, kinds, definitions, the BEM split, hooks; tags and attribute names):
 * no layer, no file, no text. tokens.css is dist/tokens.css of @luz-ds/tokens
 * reduced to the declarations the contrast engine can read (the colours, whose
 * var() chains end in one), under the selectors it understands, with no
 * comment: the verdicts are those of the whole file. The same bytes on every
 * build, no date and no path. `pnpm build` runs the packages first, so their
 * manifests are there.
 *
 * buildCheck({ outdir }) writes <outdir>/luz-check.js and <outdir>/data/ and
 * returns esbuild's metafile, so a test reads exactly what `pnpm build` would
 * write; importing this file builds nothing.
 *
 * Usage: node scripts/build-check.js (from the repo root)
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { colourTokens } from "../packages/check/src/rules/theme.js";
import { parseRules } from "../packages/tokens/lib/theme.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = resolve(repoRoot, "packages", "check", "src", "main.js");
const defaultOutdir = resolve(repoRoot, "packages", "check", "dist");
// In dependency order: the order the facts are listed in
const PACKAGES = ["tokens", "core", "site", "landing", "cms", "app"];

const readJson = (path) => {
  if (!existsSync(path)) throw new Error(`${path} does not exist; build the packages first (pnpm build)`);
  return JSON.parse(readFileSync(path, "utf-8"));
};

/** classes.json reduced to what a rule reads. */
function reduceClasses(manifest) {
  const out = { schema: manifest.schema, package: manifest.package, version: manifest.version };
  out.classes = manifest.classes.map((entry) => {
    const kept = { name: entry.name, kind: entry.kind, defined: entry.defined };
    for (const key of ["block", "modifier", "part", "hosts"]) if (entry[key] !== undefined) kept[key] = entry[key];
    return kept;
  });
  out.properties = manifest.properties.map(({ name, scope }) => ({ name, scope }));
  if (manifest.hooks !== undefined) out.hooks = manifest.hooks;
  return out;
}

/** custom-elements.json reduced to tags and attribute names. */
function reduceElements(manifest) {
  return {
    schemaVersion: manifest.schemaVersion,
    modules: manifest.modules.map((module) => ({
      kind: module.kind,
      path: module.path,
      declarations: (module.declarations ?? []).map((declaration) => ({
        kind: declaration.kind,
        name: declaration.name,
        customElement: declaration.customElement,
        tagName: declaration.tagName,
        attributes: (declaration.attributes ?? []).map(({ name }) => ({ name })),
      })),
    })),
  };
}

/** One class or element per line, so a change to the data is a readable diff. */
function format(manifest) {
  const lines = [];
  for (const [key, value] of Object.entries(manifest)) {
    if (Array.isArray(value)) {
      lines.push(value.length === 0 ? `  ${JSON.stringify(key)}: []` : `  ${JSON.stringify(key)}: [\n${value.map((item) => `    ${JSON.stringify(item)}`).join(",\n")}\n  ]`);
    } else lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
  }
  return `{\n${lines.join(",\n")}\n}\n`;
}

/**
 * dist/tokens.css reduced to what the contrast engine reads: the declarations
 * that hold a colour, in the rules that apply to a mode, each rule once in its
 * place. A selector with a function in it (the no-JavaScript :is(:root:has(…))
 * path) is one the engine does not read; the layer and @supports around a rule
 * are ones it takes as true.
 */
function reduceTokens(css) {
  const rules = parseRules(css);
  const colours = colourTokens(rules);
  const blocks = [];
  for (const rule of rules) {
    const declarations = rule.declarations.filter(({ name }) => colours.has(name));
    const selectors = rule.selectors.filter((selector) => !selector.includes("("));
    if (declarations.length === 0 || selectors.length === 0) continue;
    let block = `${selectors.join(",")}{\n${declarations.map(({ name, value }) => `${name}:${value};`).join("\n")}\n}`;
    for (const condition of rule.conditions.filter((c) => !/^@(?:layer|supports)\b/i.test(c)).reverse()) block = `${condition}{\n${block}\n}`;
    blocks.push(block);
  }
  return `${blocks.join("\n")}\n`;
}

/** Write <folder>/data/: the snapshot of this release. */
function writeData(folder) {
  const data = resolve(folder, "data");
  rmSync(data, { recursive: true, force: true });
  const packages = [];
  for (const name of PACKAGES) {
    const dist = resolve(repoRoot, "packages", name, "dist");
    const classes = reduceClasses(readJson(resolve(dist, "classes.json")));
    packages.push({ package: `@luz-ds/${name}`, version: readJson(resolve(repoRoot, "packages", name, "package.json")).version });
    mkdirSync(resolve(data, name), { recursive: true });
    writeFileSync(resolve(data, name, "classes.json"), format(classes), "utf-8");
    const elements = resolve(dist, "custom-elements.json");
    if (existsSync(elements)) writeFileSync(resolve(data, name, "custom-elements.json"), `${JSON.stringify(reduceElements(readJson(elements)), null, 2)}\n`, "utf-8");
  }
  writeFileSync(resolve(data, "tokens", "tokens.css"), reduceTokens(readFileSync(resolve(repoRoot, "packages", "tokens", "dist", "tokens.css"), "utf-8")), "utf-8");
  writeFileSync(resolve(data, "index.json"), `${JSON.stringify({ schema: 1, packages }, null, 2)}\n`, "utf-8");
}

/** The `sample: {…},` lines of messages.js, which only the tests read: out of the shipped bundle. */
const withoutSamples = {
  name: "luz-check-no-samples",
  setup(build) {
    build.onLoad({ filter: /[\\/]check[\\/]src[\\/]messages\.js$/ }, (args) => ({
      contents: readFileSync(args.path, "utf-8").replace(/\n[ \t]*sample: \{[^\n]*\},(?=\n)/g, ""),
      loader: "js",
    }));
  },
};

/**
 * @param {object} [options]
 * @param {string} [options.outdir] where luz-check.js and data/ are written (default: packages/check/dist, emptied first)
 * @returns {Promise<{ outfile: string, metafile: object }>}
 */
export async function buildCheck({ outdir = defaultOutdir } = {}) {
  const folder = resolve(outdir);
  // Only the package's own dist is emptied, so removed outputs never linger
  if (folder === defaultOutdir) rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  const outfile = resolve(folder, "luz-check.js");

  const { metafile } = await esbuild.build({
    entryPoints: [entry],
    outfile,
    absWorkingDir: repoRoot,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    packages: "external",
    metafile: true,
    plugins: [withoutSamples],
    banner: { js: "#!/usr/bin/env node" },
    minify: false,
    legalComments: "inline",
    logLevel: "warning",
  });
  chmodSync(outfile, 0o755);
  writeData(folder);
  return { outfile, metafile };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { outfile } = await buildCheck();
  console.log(`✓ Check CLI bundled → ${outfile}, with its data/ beside it`);
}
