/**
 * LUZ — the manifests of a package, written for agents and for @luz-ds/check
 * (f5-ai-ready.md 2.1, 2.2; RL-19: what an agent reads is generated, never
 * written by hand).
 *
 *   buildClassManifest(name, { root })   packages/<name>/dist/classes.json, as an object
 *   writeManifests(name, { root })       the same, written next to the CSS it was read from
 *
 * The source is the unminified CSS of the package's dist/, so what the
 * manifest says is what a browser gets. Every `.css` file of dist/ is read,
 * strict (a stylesheet the reader cannot read fails the build with
 * `file:line:column`), except `*.min.css`: the same rules in one line.
 *
 * Shape (schema 1): { schema, package, version, classes, properties }.
 *   classes     [{ name, kind, layer, files, defined, block?, modifier?, part? }]
 *               by name. Only the LUZ namespace: `luz-*`, `o-*`, `u-*`, `is-*`.
 *   properties  [{ name, scope, layer, files? }] by name. Only `--luz-*`;
 *               `files` only for a property a component sets for itself.
 *   files       the stylesheets, as the package's exports name them, that
 *               define the class (or only mention it, when it is never
 *               defined). The bundle (what `./css` exports) is named only for
 *               what is in no stylesheet of its own.
 * No time, no absolute path and no file system order is in the output.
 *
 * `kind` follows the name (`pattern` is the `luz-<package>-*` classes of site
 * and the kinds of site); `block`, `modifier` and `part` are its BEM split.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readCss } from "../packages/check/src/css.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CLASS_NAMESPACE = /^(?:luz|o|u|is)-/;
const PROPERTY_NAMESPACE = /^--luz-/;
const PATTERN = /^luz-(?:site|landing|cms|app)-/;
const BEM = /^(.+?)(?:__(.+?))?(?:--(.+))?$/;

/** The kind of a class, from its name. */
function kindOf(name) {
  if (PATTERN.test(name)) return "pattern";
  if (name.startsWith("o-")) return "object";
  if (name.startsWith("u-")) return "utility";
  if (name.startsWith("is-")) return "state";
  return "component";
}

/** Every unminified stylesheet under `dir`, as paths relative to it with `/`, sorted. */
function stylesheets(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(join(dir, prefix)).sort()) {
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(join(dir, rel)).isDirectory()) out.push(...stylesheets(dir, rel));
    else if (entry.endsWith(".css") && !entry.endsWith(".min.css")) out.push(rel);
  }
  return out;
}

/** The files to name for a class or property: its own stylesheets, else the bundle. */
function filesOf(set, bundle) {
  const own = [...set].filter((file) => file !== bundle);
  return (own.length ? own : [...set]).sort();
}

/**
 * The class manifest of a package, read from packages/<name>/dist.
 * @param {string} name   the package folder (`core`, `site`, …)
 * @param {{ root?: string }} [options] the repository root (default: this one)
 */
export function buildClassManifest(name, { root = repoRoot } = {}) {
  const pkgRoot = join(root, "packages", name);
  const dist = join(pkgRoot, "dist");
  const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf-8"));
  const exported = pkg.exports?.["./css"];
  const bundle = typeof exported === "string" && exported.startsWith("./dist/") ? exported.slice("./dist/".length) : null;

  // The bundle first: the first rule that defines a class is read in the
  // order of the bundle, which is the order of the cascade
  const files = stylesheets(dist);
  if (bundle !== null && files.includes(bundle)) files.unshift(...files.splice(files.indexOf(bundle), 1));

  const classes = new Map();
  const properties = new Map();
  for (const file of files) {
    const read = readCss(readFileSync(join(dist, file), "utf-8"), `packages/${name}/dist/${file}`, { strict: true });
    for (const c of read.classes) {
      if (!CLASS_NAMESPACE.test(c.name)) continue;
      let entry = classes.get(c.name);
      if (entry === undefined) {
        entry = { layer: c.layer, defined: false, definedIn: new Set(), seenIn: new Set() };
        classes.set(c.name, entry);
      }
      entry.seenIn.add(file);
      if (c.defined) {
        entry.definedIn.add(file);
        if (!entry.defined) {
          entry.defined = true;
          entry.layer = c.layer;
        }
      }
    }
    for (const p of read.properties) {
      if (!PROPERTY_NAMESPACE.test(p.name)) continue;
      const entry = properties.get(p.name);
      if (entry === undefined) properties.set(p.name, { scope: p.scope, layer: p.layer, files: new Set([file]) });
      else {
        entry.files.add(file);
        if (p.scope === "root" && entry.scope !== "root") {
          entry.scope = "root";
          entry.layer = p.layer;
        }
      }
    }
  }

  const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const classList = [...classes]
    .map(([className, entry]) => {
      const kind = kindOf(className);
      const out = { name: className, kind, layer: entry.layer, files: filesOf(entry.defined ? entry.definedIn : entry.seenIn, bundle), defined: entry.defined };
      if (kind !== "utility" && kind !== "state") {
        const [, block, part, modifier] = BEM.exec(className);
        out.block = block;
        if (modifier !== undefined) out.modifier = modifier;
        if (part !== undefined) out.part = part;
      }
      return out;
    })
    .sort(byName);
  const propertyList = [...properties]
    .map(([propertyName, entry]) => {
      const out = { name: propertyName, scope: entry.scope, layer: entry.layer };
      if (entry.scope === "component") out.files = filesOf(entry.files, bundle);
      return out;
    })
    .sort(byName);

  return { schema: 1, package: pkg.name, version: pkg.version, classes: classList, properties: propertyList };
}

/** `{ "k": v, … }` on one line, arrays as `[a, b]`: one entry, one line. */
function inline(value) {
  if (Array.isArray(value)) return `[${value.map(inline).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    return `{ ${Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}: ${inline(v)}`).join(", ")} }`;
  }
  return JSON.stringify(value);
}

/** The text of dist/classes.json: two-space JSON, one class or property per line, a final newline. */
export function formatClassManifest(manifest) {
  const list = (items) => (items.length ? `[\n${items.map((item) => `    ${inline(item)}`).join(",\n")}\n  ]` : "[]");
  return [
    "{",
    `  "schema": ${JSON.stringify(manifest.schema)},`,
    `  "package": ${JSON.stringify(manifest.package)},`,
    `  "version": ${JSON.stringify(manifest.version)},`,
    `  "classes": ${list(manifest.classes)},`,
    `  "properties": ${list(manifest.properties)}`,
    "}",
    "",
  ].join("\n");
}

/** Write packages/<name>/dist/classes.json and return the manifest. */
export function writeManifests(name, { root = repoRoot } = {}) {
  const manifest = buildClassManifest(name, { root });
  const target = join(root, "packages", name, "dist", "classes.json");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, formatClassManifest(manifest), "utf-8");
  return manifest;
}
