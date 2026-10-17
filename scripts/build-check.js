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
 *   packages/check/dist/data/index.json                    the seven packages and their versions
 *   packages/check/dist/data/<pkg>/classes.json            tokens, core, site, landing, cms, app, docs
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
 * and the accessibility reviewer `luz-check agent` prints (f5-ai-ready.md 5.8,
 * 8 "The published agent"):
 *
 *   packages/check/dist/agents/luz-accessibility-reviewer.md
 *
 * Built from ONE file, read by its literal path, and never from the rest of
 * the repo's agent folder or of its private notes: the sections of
 * the repo's accessibility agent that sit between `luz:publish` fences, copied
 * verbatim and in order under a frontmatter this script writes (name,
 * description and tools: read-only, nothing copied from the source). It fails
 * closed, before anything is written, on a missing file, no fence, a fence
 * that is not closed or is nested, a forbidden string in what leaves the
 * repo, or a result over 12 KiB. Never inlined in the bundle.
 *
 * buildCheck({ outdir }) writes <outdir>/luz-check.js, <outdir>/data/ and
 * <outdir>/agents/ and returns esbuild's metafile, so a test reads exactly
 * what `pnpm build` would write; importing this file builds nothing.
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
const PACKAGES = ["tokens", "core", "site", "landing", "cms", "app", "docs"];

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

/**
 * One class or element per line, so a change to the data is a readable diff,
 * and no indentation: the folder stays under its 56 KiB with seven packages.
 */
function format(manifest) {
  const lines = [];
  for (const [key, value] of Object.entries(manifest)) {
    if (Array.isArray(value)) {
      lines.push(value.length === 0 ? `${JSON.stringify(key)}:[]` : `${JSON.stringify(key)}:[\n${value.map((item) => JSON.stringify(item)).join(",\n")}\n]`);
    } else lines.push(`${JSON.stringify(key)}:${JSON.stringify(value)}`);
  }
  return `{\n${lines.join(",\n")}\n}\n`;
}

/** custom-elements.json with one declaration per line, unindented. */
function formatElements(manifest) {
  const modules = manifest.modules.map(({ declarations, ...module }) => {
    const head = JSON.stringify(module).slice(0, -1);
    return `${head},"declarations":[\n${declarations.map((d) => JSON.stringify(d)).join(",\n")}\n]}`;
  });
  return `{"schemaVersion":${JSON.stringify(manifest.schemaVersion)},"modules":[\n${modules.join(",\n")}\n]}\n`;
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
    if (existsSync(elements)) writeFileSync(resolve(data, name, "custom-elements.json"), formatElements(reduceElements(readJson(elements))), "utf-8");
  }
  writeFileSync(resolve(data, "tokens", "tokens.css"), reduceTokens(readFileSync(resolve(repoRoot, "packages", "tokens", "dist", "tokens.css"), "utf-8")), "utf-8");
  writeFileSync(resolve(data, "index.json"), `${JSON.stringify({ schema: 1, packages }, null, 2)}\n`, "utf-8");
}

/* ---- The published agent ------------------------------------------------------------------------ */

// The one file the agent is built from, by its literal path
const AGENT_SOURCE = resolve(repoRoot, ".claude/agents/accessibility-engineer.md");
const AGENT_NAME = "luz-accessibility-reviewer";
const FENCE_START = "<!-- luz:publish:start -->";
const FENCE_END = "<!-- luz:publish:end -->";
const AGENT_MAX_BYTES = 12288;
const AGENT_DESCRIPTION =
  "Reviews the HTML, CSS and JavaScript of a web project for accessibility against WCAG 2.2 level AA and EN 301 549, reading source files only. Use it when a page or a component is written or changed. It reads your files and writes nothing.";
const AGENT_HEADER = `# Accessibility reviewer

This agent reviews source files for web accessibility. It is advice from reading code: it cannot establish that a page is usable with assistive technology.`;

/**
 * What must not leave the repo: the paths and files of the repo's own working
 * notes and rules, its commands and tools, the names of its other agents and
 * contact details. A line of a fence that matches one stops the build.
 * tests/check-agent.test.js holds the longer list and checks the result with it.
 */
const FORBIDDEN = [
  ["a red line id", /(?<![A-Za-z])RL-/],
  ["a strong rule id", /(?<![A-Za-z])SR-/],
  ["an exception id", /(?<![A-Za-z])EX-\d/],
  ["a path under tests/", /tests\//],
  ["a path under .claude/ (the plans, the agents, the private notes)", /\.claude\//],
  ["the plans folder", /(?<![A-Za-z])plans\/|f5-ai-ready|luz-0\.1/],
  ["the owner's notes (OWNER)", /OWNER/],
  ["PRINCIPLES", /PRINCIPLES\.md/],
  ["AGENTS", /AGENTS\.md/],
  ["CLAUDE", /CLAUDE\.md/],
  ["MEMORY", /MEMORY/],
  ["luz-browser-review", /luz-browser-review/],
  ["a path of this machine", /\/home\/|~\/|(?:^|[\s"'`(=])\/(?:Users|root|etc|tmp|var|usr|opt|mnt)\/|[A-Za-z]:\\/],
  ["pnpm", /\bpnpm\b/],
  ["a folder of this repo (packages/, apps/, dist/)", /(?:packages|apps|dist)\//],
  ["EXCEPTIONS", /luz-exception|EXCEPTIONS/],
  ["a model name", /\b(?:Opus|Sonnet)\b/],
  ["an e-mail address", /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/],
  ...[
    "accessibility-engineer",
    "security-auditor",
    "frontend-engineer",
    "ux-designer",
    "test-writer",
    "test-runner",
    "chore-runner",
    "docs-writer",
    "outside-reviewer",
    "safari-reviewer",
    "firefox-reviewer",
  ].map((name) => [`the repo agent ${name}`, new RegExp(`(?<![A-Za-z0-9-])${name}(?![A-Za-z0-9-])`)]),
];

/** The fenced sections of a text, each trimmed of blank lines at its edges; throws on a fence that is wrong. */
function fencedSections(text) {
  const sections = [];
  let open = null;
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    const marker = line.trim();
    if (marker === FENCE_START) {
      if (open !== null) throw new Error(`accessibility-engineer.md: a luz:publish fence is nested at line ${index + 1}`);
      open = index;
    } else if (marker === FENCE_END) {
      if (open === null) throw new Error(`accessibility-engineer.md: a luz:publish end marker has no start at line ${index + 1}`);
      const section = lines.slice(open + 1, index).join("\n").replace(/^\n+|\n+$/g, "");
      if (section.trim() === "") throw new Error(`accessibility-engineer.md: the luz:publish fence at line ${open + 1} is empty`);
      sections.push(section);
      open = null;
    }
  });
  if (open !== null) throw new Error(`accessibility-engineer.md: the luz:publish fence at line ${open + 1} is not closed`);
  if (sections.length === 0) throw new Error(`accessibility-engineer.md has no ${FENCE_START} … ${FENCE_END} fence: nothing to publish`);
  return sections;
}

/**
 * The text of the published agent, or a thrown error that names the file or the marker. Reads nothing else.
 * Exported for scripts/check-ai.js, which compares it with the committed snapshot and writes nothing.
 */
export function buildAgent() {
  if (!existsSync(AGENT_SOURCE)) throw new Error("accessibility-engineer.md is missing: the agent is built from .claude/agents/accessibility-engineer.md, between its luz:publish fences");
  const source = readFileSync(AGENT_SOURCE, "utf-8").replace(/\r\n?/g, "\n");
  const sections = fencedSections(source);
  for (const section of sections) {
    for (const line of section.split("\n")) {
      for (const [label, pattern] of FORBIDDEN) {
        if (pattern.test(line)) throw new Error(`accessibility-engineer.md: a luz:publish section has a forbidden string (${label}); it may not leave the repository`);
      }
    }
  }
  const text = `---\nname: ${AGENT_NAME}\ndescription: ${AGENT_DESCRIPTION}\ntools: Read, Grep, Glob\n---\n\n${AGENT_HEADER}\n\n${sections.join("\n\n")}\n`;
  if (/\t|\r|^\uFEFF/.test(text)) throw new Error("accessibility-engineer.md: a luz:publish section has a tab, a carriage return or a byte order mark");
  const bytes = Buffer.byteLength(text);
  // The cap only: an agent definition is read into a context each time it runs. The floor is a test of the real file
  if (bytes > AGENT_MAX_BYTES) {
    throw new Error(`the luz:publish sections of accessibility-engineer.md make ${bytes} bytes; the published agent is at most ${AGENT_MAX_BYTES}`);
  }
  return text;
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
 * @param {string} [options.outdir] where luz-check.js, data/ and agents/ are written (default: packages/check/dist, emptied first)
 * @returns {Promise<{ outfile: string, metafile: object }>}
 */
export async function buildCheck({ outdir = defaultOutdir } = {}) {
  const folder = resolve(outdir);
  // First, and before anything is written: a source that may not be published stops the build
  const agent = buildAgent();
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
  mkdirSync(resolve(folder, "agents"), { recursive: true });
  writeFileSync(resolve(folder, "agents", `${AGENT_NAME}.md`), agent, "utf-8");
  return { outfile, metafile };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { outfile } = await buildCheck();
  console.log(`✓ Check CLI bundled → ${outfile}, with its data/ and agents/ beside it`);
}
