/**
 * LUZ — the manifests of a package, written for agents and for @luz-ds/check
 * (f5-ai-ready.md 2.1, 2.2; RL-19: what an agent reads is generated, never
 * written by hand).
 *
 *   buildClassManifest(name, { root })   packages/<name>/dist/classes.json, as an object
 *   buildElementManifest(name, { root }) packages/<name>/dist/custom-elements.json, as an object
 *                                        (null when the package defines or declares no tag)
 *   writeManifests(name, { root })       both, written next to the CSS they were read from
 *
 * The source is the unminified CSS of the package's dist/, so what the
 * manifest says is what a browser gets. Every `.css` file of dist/ is read,
 * strict (a stylesheet the reader cannot read fails the build with
 * `file:line:column`), except `*.min.css`: the same rules in one line.
 *
 * Shape (schema 1): { schema, package, version, classes, properties, hooks? }.
 *   classes     [{ name, kind, layer, files, defined, block?, modifier?, part? }]
 *               by name. Only the LUZ namespace: `luz-*`, `o-*`, `u-*`, `is-*`.
 *   properties  [{ name, scope, layer, files? }] by name. Only `--luz-*`;
 *               `files` only for a property a component sets for itself.
 *   hooks       ["data-luz-…"] (the last key, and only when the package reads
 *               one): the attribute names the package's own unminified CSS
 *               selects (`[data-luz-x]`) or its unminified JS reads or writes
 *               (`dataset.luzFooBar`, a literal `"data-luz-x"`), sorted, once.
 *               A `data-luz-label-*` is never listed (that family is accepted
 *               by prefix), and nothing is read from a `.min` file.
 *   files       the stylesheets, as the package's exports name them, that
 *               define the class (or only mention it, when it is never
 *               defined). The bundle (what `./css` exports) is named only for
 *               what is in no stylesheet of its own.
 * No time, no absolute path and no file system order is in the output.
 *
 * `kind` follows the name (`pattern` is the `luz-<package>-*` classes of site
 * and the kinds of site); `block`, `modifier` and `part` are its BEM split.
 *
 * custom-elements.json (Custom Elements Manifest, schema 2.1.0; f5 2.3): one
 * module per tag, from the source tags of the header comment of the file that
 * defines it (a script) or styles it (a CSS-only tag, components/<tag>.css):
 *
 *   @element <tag> - <description>
 *   @attr {<type>} <name> - <description>
 *   @attr {<type>} [<name>=<default>] - <description>
 *   @fires <event> {<type>} - <description>
 *
 * The build fails, with the file and the name, when the header and the code
 * disagree: an attribute the code reads (getAttribute / hasAttribute with a
 * literal, dataset.luzFooBar, a `[data-luz-…]` selector, a
 * `data-luz-label-${key}` template with its keys, or, in a stylesheet, an
 * attribute selector written on the tag) that the header does not declare, or
 * one the header declares that the code does not read. A global attribute and
 * what a script only writes are not the tag's. The demos are the docs pages
 * that document the tag, only when apps/docs exists under the root.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readCss } from "../packages/check/src/css.js";
import { scanSite } from "./docs-site/site.js";

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

/** Every unminified file under `dir` with the extension (`.css`, `.js`), as paths relative to it, sorted; none when `dir` is missing. */
function unminified(dir, ext, prefix = "") {
  if (!existsSync(join(dir, prefix))) return [];
  const out = [];
  for (const entry of readdirSync(join(dir, prefix)).sort()) {
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(join(dir, rel)).isDirectory()) out.push(...unminified(dir, ext, rel));
    else if (entry.endsWith(ext) && !entry.endsWith(`.min${ext}`)) out.push(rel);
  }
  return out;
}

const HOOK_IN_CSS = /\[\s*(data-luz-[a-z0-9]+(?:-[a-z0-9]+)*)(?![-a-z0-9])/g;
const HOOK_IN_JS = /(?<![A-Za-z0-9-])data-luz-[a-z0-9]+(?:-[a-z0-9]+)*(?![-a-z0-9])/g;
const DATASET_IN_JS = /\bdataset\.(luz[A-Z][A-Za-z0-9]*)/g;

/** The data-luz-* names the unminified CSS and JS of a package's dist/ read, sorted, once, without the label overrides. */
function hooksOf(dist) {
  const names = new Set();
  for (const file of unminified(dist, ".css")) {
    const css = readFileSync(join(dist, file), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(HOOK_IN_CSS)) names.add(m[1]);
  }
  for (const file of unminified(dist, ".js")) {
    const code = stripJs(readFileSync(join(dist, file), "utf-8"));
    for (const m of code.matchAll(HOOK_IN_JS)) names.add(m[0]);
    for (const m of code.matchAll(DATASET_IN_JS)) names.add(`data-${kebab(m[1])}`);
  }
  return [...names].filter((name) => name !== "data-luz-label" && !name.startsWith("data-luz-label-")).sort();
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

  const manifest = { schema: 1, package: pkg.name, version: pkg.version, classes: classList, properties: propertyList };
  const hooks = hooksOf(dist);
  if (hooks.length > 0) manifest.hooks = hooks;
  return manifest;
}

/** `{ "k": v, … }` on one line, arrays as `[a, b]`: one entry, one line. */
function inline(value) {
  if (Array.isArray(value)) return `[${value.map(inline).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    return `{ ${Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}: ${inline(v)}`).join(", ")} }`;
  }
  return JSON.stringify(value);
}

/** The text of dist/classes.json: two-space JSON, one class, property or hook per line, a final newline. */
export function formatClassManifest(manifest) {
  const list = (items) => (items.length ? `[\n${items.map((item) => `    ${inline(item)}`).join(",\n")}\n  ]` : "[]");
  const hooks = Array.isArray(manifest.hooks) && manifest.hooks.length > 0;
  return [
    "{",
    `  "schema": ${JSON.stringify(manifest.schema)},`,
    `  "package": ${JSON.stringify(manifest.package)},`,
    `  "version": ${JSON.stringify(manifest.version)},`,
    `  "classes": ${list(manifest.classes)},`,
    `  "properties": ${list(manifest.properties)}${hooks ? "," : ""}`,
    ...(hooks ? [`  "hooks": ${list(manifest.hooks)}`] : []),
    "}",
    "",
  ].join("\n");
}

/* ---- custom-elements.json --------------------------------------------- */

/** Attributes every element has: never the tag's own. */
const GLOBAL_ATTRIBUTES = new Set([
  "accesskey", "autofocus", "class", "contenteditable", "dir", "draggable", "enterkeyhint", "hidden", "id", "inert", "inputmode", "is",
  "itemid", "itemprop", "itemref", "itemscope", "itemtype", "lang", "nonce", "part", "popover", "role", "slot", "spellcheck", "style",
  "tabindex", "title", "translate", "writingsuggestions",
]);
const isGlobal = (name) => GLOBAL_ATTRIBUTES.has(name) || name.startsWith("aria-");

const kebab = (camel) => camel.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pascal = (tag) => tag.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");

/** JS without its comments (a `//` after a colon is a URL, not a comment). */
const stripJs = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
const stripCss = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every file under `dir` with the extension, as paths relative to it with `/`, sorted. */
function filesUnder(dir, ext, prefix = "") {
  if (!existsSync(join(dir, prefix))) return [];
  const out = [];
  for (const entry of readdirSync(join(dir, prefix)).sort()) {
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(join(dir, rel)).isDirectory()) out.push(...filesUnder(dir, ext, rel));
    else if (entry.endsWith(ext)) out.push(rel);
  }
  return out;
}

/** The keys a `data-luz-label-${key}` template can take in a script: its `en` dictionary, `say("key")`, a `const state = … "key"` line. */
function labelKeys(code) {
  const keys = new Set();
  const dictionary = /\ben:\s*\{([^}]*)\}/.exec(code);
  if (dictionary) for (const m of dictionary[1].matchAll(/(\w+)\s*:/g)) keys.add(m[1]);
  for (const m of code.matchAll(/\bsay\(\s*"(\w+)"/g)) keys.add(m[1]);
  for (const line of code.split("\n").filter((l) => /\bconst state\s*=/.test(l))) for (const m of line.matchAll(/"(\w+)"/g)) keys.add(m[1]);
  return keys;
}

/** The attribute names a script reads (globals left out), sorted. */
function scriptReads(text) {
  const code = stripJs(text);
  const names = new Set();
  for (const m of code.matchAll(/\.(?:getAttribute|hasAttribute)\(\s*"([^"]+)"/g)) names.add(m[1]);
  for (const m of code.matchAll(/\bdataset\.(luz[A-Za-z0-9]*)/g)) names.add(`data-${kebab(m[1])}`);
  for (const m of code.matchAll(/\[(data-luz-[a-z0-9-]+)[^\]]*\]/g)) names.add(m[1]);
  if (code.includes("data-luz-label-${")) for (const key of labelKeys(code)) names.add(`data-luz-label-${key}`);
  return [...names].filter((n) => !isGlobal(n)).sort();
}

/** The attribute names a stylesheet selects on the tag itself (`:where(luz-banner)[tone="warning"]`), sorted. */
function cssReads(text, tag) {
  const names = new Set();
  const selector = new RegExp(`(?<![.\\w-])${escapeRe(tag)}\\)?\\[([a-z][\\w-]*)(?:=["']?[^"'\\]]*["']?)?\\]`, "g");
  for (const m of stripCss(text).matchAll(selector)) names.add(m[1]);
  return [...names].filter((n) => !isGlobal(n)).sort();
}

/** The source tags of the first block comment of a file. Lines that start with a tag name and do not follow the grammar are in `malformed`. */
function headerTags(text, { script }) {
  const block = script ? /^\s*\/\*\*([\s\S]*?)\*\//.exec(text) : /\/\*([\s\S]*?)\*\//.exec(text);
  const out = { elements: [], attrs: [], fires: [], malformed: [] };
  if (!block) return out;
  for (const raw of block[1].split("\n")) {
    const line = raw.replace(/^[\s*]*/, "").trimEnd();
    if (!/^@(?:element|attr|attribute|fires)\b/.test(line)) continue;
    let m;
    if ((m = /^@element\s+(luz-[a-z0-9-]+)\s+-\s+(\S.*)$/.exec(line))) out.elements.push({ tag: m[1], description: m[2] });
    else if ((m = /^@attr\s+\{([^}]+)\}\s+(?:\[([\w-]+)=([^\]]*)\]|([\w-]+))\s+-\s+(\S.*)$/.exec(line))) {
      const attr = { name: m[2] ?? m[4], type: { text: m[1] } };
      if (m[2] !== undefined) attr.default = m[3];
      attr.description = m[5];
      out.attrs.push(attr);
    } else if ((m = /^@fires\s+([\w:-]+)\s+\{([^}]+)\}\s+-\s+(\S.*)$/.exec(line))) out.fires.push({ name: m[1], type: { text: m[2] }, description: m[3] });
    else out.malformed.push(line);
  }
  return out;
}

/** The tags a script of any package under `root` defines: `customElements.define("luz-x"`. */
function definedTags(root) {
  const out = new Map();
  const packages = join(root, "packages");
  if (!existsSync(packages)) return out;
  for (const pkg of readdirSync(packages).sort()) {
    const src = join(packages, pkg, "src");
    for (const file of filesUnder(src, ".js")) {
      const code = stripJs(readFileSync(join(src, file), "utf-8"));
      for (const m of code.matchAll(/customElements\.define\(\s*"(luz-[a-z0-9-]+)"/g)) out.set(m[1], `${pkg}/${file}`);
    }
  }
  return out;
}

/** The docs routes of the pages that document `tag`: `files` names `<tag>`, or `module` is the script that defines it. */
function demosOf(pages, tag, script) {
  return pages
    .filter((p) => String(p.meta.files ?? "").includes(`<${tag}>`) || (script !== null && p.meta.module === basename(script)))
    .map((p) => ({ url: p.route }))
    .sort((a, b) => (a.url < b.url ? -1 : 1));
}

/**
 * The Custom Elements Manifest of a package, or null when it defines or
 * declares no tag. A tag a script defines is read from that script; a tag no
 * script defines, from components/<tag minus luz->.css when that stylesheet
 * has a type selector for it.
 * @param {string} name   the package folder (`core`, `site`, …)
 * @param {{ root?: string }} [options] the repository root (default: this one)
 */
export function buildElementManifest(name, { root = repoRoot } = {}) {
  const src = join(root, "packages", name, "src");
  const where = (file) => `packages/${name}/src/${file}`;
  const entries = []; // { path, tag, script, text }

  const defined = definedTags(root);
  for (const file of filesUnder(src, ".js")) {
    const text = readFileSync(join(src, file), "utf-8");
    const tags = [...stripJs(text).matchAll(/customElements\.define\(\s*"(luz-[a-z0-9-]+)"/g)].map((m) => m[1]);
    const header = headerTags(text, { script: true });
    if (tags.length === 0) {
      if (header.elements.length) throw new Error(`${where(file)}: @element ${header.elements[0].tag} but no customElements.define() in the file`);
      continue;
    }
    if (tags.length > 1) throw new Error(`${where(file)}: defines ${tags.join(", ")}; one tag to a file`);
    entries.push({ path: file, tag: tags[0], script: true, text });
  }
  for (const file of filesUnder(join(src, "components"), ".css")) {
    if (basename(file).startsWith("_")) continue;
    const tag = `luz-${basename(file, ".css")}`;
    if (defined.has(tag)) continue;
    const text = readFileSync(join(src, "components", file), "utf-8");
    if (!new RegExp(`(?<![.\\w#-])${escapeRe(tag)}(?![\\w-])`).test(stripCss(text))) continue;
    entries.push({ path: `components/${file}`, tag, script: false, text });
  }
  if (entries.length === 0) return null;

  const docsDir = join(root, "apps", "docs");
  const pages = existsSync(docsDir) ? scanSite(docsDir, root).pages : [];

  const modules = entries
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map(({ path, tag, script, text }) => {
      const header = headerTags(text, { script });
      const file = where(path);
      if (header.malformed.length) throw new Error(`${file}: "${header.malformed[0]}" does not follow "@element <tag> - <text>", "@attr {<type>} <name> - <text>" or "@fires <event> {<type>} - <text>"`);
      if (header.elements.length !== 1 || header.elements[0].tag !== tag) {
        throw new Error(`${file}: the header comment needs one "@element ${tag} - <description>" line (it has ${header.elements.map((e) => e.tag).join(", ") || "none"})`);
      }
      const { description } = header.elements[0];
      if (!script && !description.startsWith("CSS-only: no script defines this tag.")) {
        throw new Error(`${file}: the description of <${tag}> starts "CSS-only: no script defines this tag."`);
      }
      const declared = header.attrs.map((a) => a.name);
      const reads = script ? scriptReads(text) : cssReads(text, tag);
      for (const attr of declared) {
        if (declared.indexOf(attr) !== declared.lastIndexOf(attr)) throw new Error(`${file}: @attr ${attr} is declared twice`);
        if (!reads.includes(attr)) throw new Error(`${file}: @attr ${attr} is declared but the code never reads it; remove the line or read it`);
      }
      for (const attr of reads) {
        if (!declared.includes(attr)) throw new Error(`${file}: the code reads ${attr} and the header does not declare it; add "@attr {<type>} ${attr} - <text>"`);
      }
      if (!script && header.fires.length) throw new Error(`${file}: <${tag}> is CSS-only and dispatches nothing; remove @fires`);

      const className = pascal(tag);
      const declaration = { kind: "class", name: className, customElement: true, tagName: tag };
      if (script) declaration.superclass = { name: "HTMLElement" };
      declaration.description = description;
      if (header.attrs.length) declaration.attributes = header.attrs;
      if (header.fires.length) declaration.events = header.fires;
      const demos = demosOf(pages, tag, script ? path : null);
      if (demos.length) declaration.demos = demos;

      const module = { kind: "javascript-module", path, declarations: [declaration] };
      if (script) module.exports = [{ kind: "custom-element-definition", name: tag, declaration: { name: className, module: path } }];
      return module;
    });

  return { schemaVersion: "2.1.0", readme: "README.md", modules };
}

/** Write packages/<name>/dist/classes.json (and custom-elements.json, when the package has a tag) and return the class manifest. */
export function writeManifests(name, { root = repoRoot } = {}) {
  const manifest = buildClassManifest(name, { root });
  const dist = join(root, "packages", name, "dist");
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, "classes.json"), formatClassManifest(manifest), "utf-8");
  const elements = buildElementManifest(name, { root });
  if (elements !== null) writeFileSync(join(dist, "custom-elements.json"), `${JSON.stringify(elements, null, 2)}\n`, "utf-8");
  return manifest;
}
