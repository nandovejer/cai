/**
 * The runner of the fixtures of @luz-ds/check, and the small worlds the rules
 * of steps 9-11 are tested in (f5-ai-ready.md 5.9). Each step that adds rules
 * asks this file for the cases of its rule-id prefixes and compares them with
 * what the files say, so no step writes its own reader of `expect:` comments.
 *
 *   fixtureCases(["class/", "element/"])
 *       the files of fail/ and warn/ whose `expect:` comments name a rule of
 *       these prefixes -> [{ folder, name, path, text, expected }], where
 *       `expected` is [{ rule, line, column, options }] of those prefixes only.
 *   checkCase(entry, prefixes, env)
 *       runs the CLI on that one file, in the fixtures folder, and answers
 *       { code, data, found, expected, key } with `found` and `expected`
 *       both reduced to the rules of the prefixes and sorted, and `key(x)`
 *       writing a finding or an expectation as "rule line:column", so
 *       `expect(found.map(key)).toEqual(expected.map(key))` is the test.
 *   passCases()  the files of pass/, to be run the same way (no expectation).
 *
 * The facts the rules read come in through `env.data`, the folder of the
 * bundled snapshot (what dist/data is in the published package). A test asks
 * for it with `builtData()`, which builds the bundle into a temporary folder
 * with scripts/build-check.js, so the snapshot the fixtures are read against
 * is the one the build makes. `miniWorld()` is the same data, made by hand
 * and small, for the tests that need to know every name in it.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../../packages/check/src/cli.js";
import { builtOnce } from "./check-build.js";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const FIXTURES = join(ROOT, "tests/fixtures/check");
export const VERSION = "9.9.9";
/** The six libraries, in dependency order: the order `manifests` is written in. */
export const LIBRARIES = ["tokens", "core", "site", "landing", "cms", "app"];

/* ---- The `expect:` comments ----------------------------------------------------------------- */

/** The `expect:` lines of a fixture: { rule, line, column, options } each. */
export function expectations(text) {
  const found = [];
  for (const match of text.matchAll(/(?:<!--|\/\*)\s*expect:\s*(.*?)\s*(?:-->|\*\/)/g)) {
    const [rule, ...rest] = match[1].split(/\s+/);
    const entry = { rule, line: null, column: null, options: {} };
    for (const part of rest) {
      const at = /^(\d+)(?::(\d+))?$/.exec(part);
      if (at) {
        entry.line = Number(at[1]);
        entry.column = at[2] === undefined ? null : Number(at[2]);
      } else {
        const [key, ...value] = part.split("=");
        entry.options[key] = value.join("=");
      }
    }
    found.push(entry);
  }
  return found;
}

/** The .html and .css files of a folder of fixtures, sorted. */
export const fixtureFiles = (folder) =>
  readdirSync(join(FIXTURES, folder))
    .filter((name) => /\.(?:html|css)$/.test(name))
    .sort();

const matches = (rule, prefixes) => prefixes.some((prefix) => rule.startsWith(prefix));
const byPosition = (a, b) => (a.line ?? 0) - (b.line ?? 0) || (a.column ?? 0) - (b.column ?? 0) || (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0);

/** "rule line:column", for a finding or an expectation. */
export const key = (item) => `${item.rule} ${item.line ?? "-"}:${item.column ?? "-"}`;

/** The cases of fail/ and warn/ that name a rule of these prefixes (["class/", "element/"]). */
export function fixtureCases(prefixes, folders = ["fail", "warn"]) {
  const cases = [];
  for (const folder of folders) {
    for (const name of fixtureFiles(folder)) {
      const text = readFileSync(join(FIXTURES, folder, name), "utf-8");
      const expected = expectations(text).filter((e) => matches(e.rule, prefixes));
      if (expected.length > 0) cases.push({ folder, name, path: `${folder}/${name}`, text, expected: expected.sort(byPosition) });
    }
  }
  return cases;
}

/** The files of pass/, as cases with no expectation. */
export const passCases = () => fixtureFiles("pass").map((name) => ({ folder: "pass", name, path: `pass/${name}`, text: readFileSync(join(FIXTURES, "pass", name), "utf-8"), expected: [] }));

/* ---- Running the CLI ------------------------------------------------------------------------ */

/** run() with --json: { code, stdout, stderr, data }; data is null when stdout is not JSON. */
export function checkJson(argv, cwd, env = {}) {
  const result = run([...argv, "--json"], { version: VERSION, cwd, ...env });
  let data = null;
  try {
    data = JSON.parse(result.stdout);
  } catch {
    // the caller's assertion says what stderr said
  }
  return { ...result, data };
}

/** One fixture, in place (cwd is the fixtures folder), reduced to the rules of the prefixes. */
export function checkCase(entry, prefixes, env = {}) {
  const result = checkJson([entry.path], FIXTURES, env);
  const all = result.data?.findings ?? [];
  return {
    code: result.code,
    stderr: result.stderr,
    data: result.data,
    found: all.filter((f) => matches(f.rule, prefixes)).sort(byPosition),
    expected: entry.expected,
    key,
  };
}

let snapshot;
/** The snapshot the build writes: { error, data } with `data` the folder to pass as env.data. */
export async function builtData() {
  snapshot ??= builtOnce().then((built) => ({ error: built.error, data: join(built.outdir, "data") }));
  return snapshot;
}

/* ---- Temporary projects ---------------------------------------------------------------------- */

const folders = [];

/** A temporary folder holding these files (name -> string or Buffer). */
export function workspace(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "luz-check-rules-"));
  folders.push(dir);
  for (const [name, content] of Object.entries(files)) put(dir, name, content);
  return dir;
}

export function put(dir, name, content) {
  const path = join(dir, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export function removeWorkspaces() {
  for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true });
}

/* ---- A small world of manifests, made by hand ------------------------------------------------- */

const BEM = /^(.+?)(?:__(.+?))?(?:--(.+))?$/;
const kindOf = (name) => (/^luz-(?:site|landing|cms|app)-/.test(name) ? "pattern" : name.startsWith("o-") ? "object" : name.startsWith("u-") ? "utility" : name.startsWith("is-") ? "state" : "component");

/** A class as a manifest lists it: name, kind, layer, files, defined, then block, modifier, part. */
function fullClass(pkg, spec) {
  const { name, defined = true, hosts } = typeof spec === "string" ? { name: spec } : spec;
  const [, block, part, modifier] = BEM.exec(name);
  const entry = { name, kind: kindOf(name), layer: pkg === "core" ? "luz.components" : `luz.${pkg}`, files: ["luz.css"], defined };
  if (!name.startsWith("is-") && !name.startsWith("u-")) entry.block = block;
  if (modifier !== undefined) entry.modifier = modifier;
  if (part !== undefined) entry.part = part;
  if (hosts) entry.hosts = hosts;
  return entry;
}

/** What `.luz-btn` may sit on: the `@host` line of button.css, as the manifest lists it (f5-ai-ready.md 5.6, the answer of accessibility-engineer Q1). */
export const BUTTON_HOSTS = ["a", "button", "input[type=button]", "input[type=submit]", "input[type=reset]"];

/** The small world: what each package knows. Every test names only what is here. */
export const MINI = {
  tokens: { classes: [], properties: ["--luz-brand-fill", "--luz-text-primary"], elements: [], hooks: [] },
  core: {
    classes: [
      "is-active",
      "luz-alert",
      "luz-alert--error",
      { name: "luz-btn", hosts: BUTTON_HOSTS },
      "luz-btn--block",
      "luz-btn--lg",
      "luz-btn--primary",
      "luz-btn--secondary",
      "luz-btn--sm",
      "luz-card",
      "luz-card__body",
      "luz-card__title",
      "luz-field__label",
      "luz-table",
      { name: "luz-table--compact", defined: false },
      { name: "luz-table__numeric", defined: false },
      "luz-tabs",
      "luz-timeline",
      "luz-timeline__item",
      "o-container",
      "o-media",
      "o-row",
      "o-stack",
      "u-hidden",
      "u-sr-only",
    ],
    properties: ["--luz-type-base"],
    elements: [{ tag: "luz-timeline", attributes: ["layout", "autoplay", "interval", "data-luz-label-previous", "data-luz-label-next", "data-luz-label-pause", "data-luz-label-play"] }],
    hooks: ["data-luz-classless", "data-luz-sort", "data-luz-spy"],
  },
  site: {
    classes: ["luz-consent", "luz-search", "luz-search__field", "luz-search__results", "luz-sidebar", "luz-site-hero"],
    properties: [],
    elements: [
      { tag: "luz-banner", attributes: ["tone"] },
      { tag: "luz-lang-switch", attributes: [] },
      { tag: "luz-search", attributes: ["data-luz-search-src", "data-luz-search-show"] },
    ],
    hooks: [],
  },
  landing: { classes: ["luz-landing-hero", "luz-landing-hero__title", "luz-landing-main"], properties: [], elements: [], hooks: [] },
  cms: { classes: ["luz-cms-post", "luz-cms-post__title"], properties: [], elements: [], hooks: [] },
  app: { classes: ["luz-app-shell", "luz-app-shell__nav"], properties: [], elements: [], hooks: [] },
};

/**
 * `{ core: { version, classes, elements, hooks }, … }` over MINI: what a test changes in a package.
 * A property is a name (scope "root") or { name, scope: "root" | "component" }.
 */
function worldOf(version, overrides = {}) {
  const world = {};
  for (const name of LIBRARIES) {
    const base = MINI[name];
    const over = overrides[name] ?? {};
    world[name] = {
      version: over.version ?? version,
      classes: [...(over.classes ?? base.classes)],
      properties: over.properties ?? base.properties,
      elements: over.elements ?? base.elements,
      hooks: over.hooks ?? base.hooks,
    };
  }
  return world;
}

const cem = (pkg, elements, withText) => ({
  schemaVersion: "2.1.0",
  readme: "README.md",
  modules: elements.map(({ tag, attributes }) => ({
    kind: "javascript-module",
    path: `${tag}.js`,
    declarations: [
      {
        kind: "class",
        name: tag.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(""),
        customElement: true,
        tagName: tag,
        ...(withText ? { description: `The ${tag} element of ${pkg}, with its documentation text.` } : {}),
        attributes: attributes.map((name) => (withText ? { name, type: { text: "string" }, description: `The ${name} attribute of ${tag}, with its documentation text.` } : { name })),
      },
    ],
  })),
});

/**
 * node_modules/@luz-ds/<pkg>/{package.json,dist/classes.json,dist/custom-elements.json}
 * under `dir`, the files `npm install` leaves, for every package of the world.
 * `overrides` is { core: { version, classes, elements, hooks } }; `only` keeps
 * the listed packages. -> the world, to compare against.
 */
export function installPackages(dir, { version = "0.1.0", overrides = {}, only = LIBRARIES } = {}) {
  const world = worldOf(version, overrides);
  for (const name of only) {
    const pkg = world[name];
    const base = `node_modules/@luz-ds/${name}`;
    put(dir, `${base}/package.json`, JSON.stringify({ name: `@luz-ds/${name}`, version: pkg.version }));
    const manifest = {
      schema: 1,
      package: `@luz-ds/${name}`,
      version: pkg.version,
      classes: pkg.classes.map((spec) => fullClass(name, spec)),
      properties: pkg.properties.map((p) => (typeof p === "string" ? { name: p, scope: "root", layer: "luz.tokens" } : { layer: p.scope === "component" ? "luz.components" : "luz.tokens", ...p })),
    };
    if (pkg.hooks.length > 0) manifest.hooks = pkg.hooks;
    put(dir, `${base}/dist/classes.json`, JSON.stringify(manifest, null, 2));
    if (pkg.elements.length > 0) put(dir, `${base}/dist/custom-elements.json`, JSON.stringify(cem(name, pkg.elements, true), null, 2));
  }
  return world;
}

/**
 * A bundled snapshot in the shape the build writes (dist/data): index.json,
 * <pkg>/classes.json with only what a rule reads, <pkg>/custom-elements.json
 * with tag and attribute names. -> the folder, to pass as env.data.
 */
export function miniSnapshot({ version = "0.1.0", overrides = {}, only = LIBRARIES } = {}) {
  const dir = workspace();
  const world = worldOf(version, overrides);
  put(dir, "index.json", JSON.stringify({ schema: 1, packages: only.map((name) => ({ package: `@luz-ds/${name}`, version: world[name].version })) }));
  for (const name of only) {
    const pkg = world[name];
    const classes = pkg.classes.map((spec) => {
      const { name: n, defined, block, modifier, part, hosts } = fullClass(name, spec);
      return { name: n, kind: kindOf(n), defined, ...(block === undefined ? {} : { block }), ...(modifier === undefined ? {} : { modifier }), ...(part === undefined ? {} : { part }), ...(hosts ? { hosts } : {}) };
    });
    const manifest = { schema: 1, package: `@luz-ds/${name}`, version: pkg.version, classes, properties: pkg.properties.map((p) => (typeof p === "string" ? { name: p, scope: "root" } : { name: p.name, scope: p.scope })) };
    if (pkg.hooks.length > 0) manifest.hooks = pkg.hooks;
    put(dir, `${name}/classes.json`, JSON.stringify(manifest));
    if (pkg.elements.length > 0) put(dir, `${name}/custom-elements.json`, JSON.stringify(cem(name, pkg.elements, false)));
  }
  return dir;
}

/** A pnpm layout: node_modules/@luz-ds/<pkg> is a link to a folder elsewhere in the tree. */
export function linkPackage(dir, name, { version = "0.1.0", store = ".pnpm-store" } = {}) {
  const stage = workspace();
  installPackages(stage, { version, only: [name] });
  const real = join(dir, store, name);
  mkdirSync(dirname(real), { recursive: true });
  cpSync(join(stage, "node_modules/@luz-ds", name), real, { recursive: true });
  mkdirSync(join(dir, "node_modules/@luz-ds"), { recursive: true });
  symlinkSync(real, join(dir, "node_modules/@luz-ds", name));
}

/** 1-based { line, column } of the first `needle` in `text` at or after `from`. */
export function where(text, needle, from = 0) {
  const index = text.indexOf(needle, from);
  if (index === -1) throw new Error(`"${needle}" is not in the text`);
  const before = text.slice(0, index).split("\n");
  return { line: before.length, column: before.at(-1).length + 1 };
}
