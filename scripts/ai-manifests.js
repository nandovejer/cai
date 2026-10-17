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
 *   classes     [{ name, kind, layer, files, defined, block?, modifier?, part?, hosts? }]
 *               by name. Only the LUZ namespace: `luz-*`, `o-*`, `u-*`, `is-*`.
 *               `hosts` (the last key) is the list of a `@host` line of a
 *               stylesheet comment, as written, in order: see `hostsOf`.
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
 * A class no stylesheet lists but an unminified script of dist/ names (a
 * selector it queries, a class it adds; RL-19) is listed too, `defined: false`,
 * in the package's own component layer, with `files` naming the script (the
 * package's bundle, `exports["."]`, only when no other script names it). The
 * scan is plain text, never run: see `scriptClasses`.
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
const PATTERN = /^luz-(?:site|landing|cms|app|docs)-/;
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

const HOST_LINE = /^@host(?![\w-])/;
const HOST_DECLARATION = /^@host\s+([A-Za-z0-9_-]+)\s*:\s*(\S.*)$/;
const HOST_SELECTOR = /^[a-z][a-z0-9]*(?:\[[a-z][a-z-]*(?:=[A-Za-z0-9_-]+)?\])?$/;

/**
 * The `@host <block>: <selector>, …` lines of the block comments of a
 * stylesheet (D13-A): a tag with at most one attribute test, `a`,
 * `input[type=submit]`, `a[href]`. A `@host` in a string or a declaration is
 * not read. Throws, `file:line`, on a line that does not follow the grammar.
 * @returns {{ block: string, hosts: string[], line: number }[]}
 */
function hostsOf(text, file) {
  const found = [];
  let line = 1;
  let counted = 0;
  const lineOf = (index) => {
    for (let i = text.indexOf("\n", counted); i !== -1 && i < index; i = text.indexOf("\n", counted)) {
      line++;
      counted = i + 1;
    }
    return line;
  };
  for (let i = 0; i < text.length; ) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      const end = close === -1 ? text.length : close;
      const body = text.slice(i + 2, end);
      if (body.includes("@host")) {
        const first = lineOf(i);
        body.split("\n").forEach((raw, offset) => {
          const source = raw.replace(/^[\s*]*/, "").trimEnd();
          if (!HOST_LINE.test(source)) return;
          const at = `${file}:${first + offset}`;
          const m = HOST_DECLARATION.exec(source);
          const hosts = m ? m[2].split(",").map((item) => item.trim()) : [];
          if (!m || !hosts.every((host) => HOST_SELECTOR.test(host))) {
            throw new Error(`${at}: "${source.slice(0, 100)}" does not follow "@host <block>: <tag>[, <tag>[attribute=value]]"; each host is a lowercase tag with at most one attribute test`);
          }
          found.push({ block: m[1], hosts, line: first + offset });
        });
      }
      i = end + 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c && text[j] !== "\n") j += text[j] === "\\" ? 2 : 1;
      i = j + 1;
    } else i++;
  }
  return found;
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

const SCRIPT_CLASS = new RegExp(`\\.((?:luz|o|u|is)-[a-z0-9]+(?:(?:__|--|-)[a-z0-9]+)*)(?![\\w$-])`, "g");
const SCRIPT_WORD = /^(?:luz|o|u|is)-[a-z0-9]+(?:(?:__|--|-)[a-z0-9]+)*$/;
const REGEX_AFTER_CHAR = /[(,=:[!&|?{};+\-*%<>~^]/;
const REGEX_AFTER_WORD = /\b(?:return|typeof|case|in|of|delete|void|throw|new|else|do)$/;

/**
 * The string and template literals of a script, read as text: comments are
 * skipped, a regular expression literal is not mistaken for a string, and a
 * template's `${…}` is code of its own (its static text keeps a `${}` where it
 * was). Never throws: an unterminated literal ends at the end of its line (a
 * template, at the end of the file).
 * @returns {{ code: string, literals: Map<number, { end: number, value: string }> }}
 *          `code` is the text with every comment blanked, same offsets.
 */
function readScript(text) {
  const n = text.length;
  const literals = new Map();
  const comments = [];

  const string = (start, quote) => {
    let i = start + 1;
    while (i < n && text[i] !== quote && text[i] !== "\n") i += text[i] === "\\" ? 2 : 1;
    const end = Math.min(i, n);
    literals.set(start, { end: text[end] === quote ? end + 1 : end, value: text.slice(start + 1, end) });
    return text[end] === quote ? end + 1 : end;
  };
  const template = (start) => {
    let i = start + 1;
    let value = "";
    while (i < n && text[i] !== "`") {
      if (text[i] === "\\") {
        value += text.slice(i, i + 2);
        i += 2;
      } else if (text[i] === "$" && text[i + 1] === "{") {
        i = code(i + 2, true);
        value += "${}";
      } else value += text[i++];
    }
    const end = Math.min(i + 1, n);
    literals.set(start, { end, value });
    return end;
  };
  const regex = (start) => {
    let i = start + 1;
    let inClass = false;
    while (i < n && text[i] !== "\n") {
      const c = text[i];
      if (c === "\\") i += 2;
      else if (c === "[" || c === "]") {
        inClass = c === "[";
        i++;
      } else if (c === "/" && !inClass) {
        i++;
        while (i < n && /[a-z]/i.test(text[i])) i++;
        return i;
      } else i++;
    }
    return start + 1; // not a regular expression: a division
  };
  /** Code from `i`; in a `${…}`, up to and after its closing brace. */
  function code(start, inInterpolation) {
    let i = start;
    let depth = 0;
    let prev = "";
    while (i < n) {
      const c = text[i];
      const next = text[i + 1];
      if (c === "/" && next === "/") {
        const end = text.indexOf("\n", i);
        comments.push([i, end < 0 ? n : end]);
        i = end < 0 ? n : end;
      } else if (c === "/" && next === "*") {
        const end = text.indexOf("*/", i + 2);
        comments.push([i, end < 0 ? n : end + 2]);
        i = end < 0 ? n : end + 2;
      } else if (c === '"' || c === "'") {
        i = string(i, c);
        prev = c;
      } else if (c === "`") {
        i = template(i);
        prev = c;
      } else if (c === "/") {
        const afterWord = /[A-Za-z]/.test(prev) && REGEX_AFTER_WORD.test(text.slice(Math.max(0, i - 10), i).trimEnd());
        i = prev === "" || REGEX_AFTER_CHAR.test(prev) || afterWord ? regex(i) : i + 1;
        prev = "/";
      } else {
        if (c === "{") depth++;
        else if (c === "}") {
          if (inInterpolation && depth === 0) return i + 1;
          depth--;
        }
        if (!/\s/.test(c)) prev = c;
        i++;
      }
    }
    return n;
  }
  code(0, false);

  let masked = "";
  let at = 0;
  for (const [from, to] of comments.sort((a, b) => a[0] - b[0])) {
    if (from < at) continue;
    masked += text.slice(at, from) + text.slice(from, to).replace(/[^\n]/g, " ");
    at = to;
  }
  return { code: masked + text.slice(at), literals };
}

/**
 * The LUZ classes a script names, by a plain scan (RL-19). A class is named
 * by: a `.name` inside a string or template literal (no `${` next to it); a
 * literal argument of `classList.add|remove|toggle|contains|replace`; the
 * words of a literal assigned to `className`, passed to
 * `setAttribute("class", …)` or `getElementsByClassName(…)`. A name that ends
 * in `-` or `_`, or touches `${}`, is computed at run time and skipped; a
 * tag, a `customElements` name, a storage key and a `data-luz-*` have no dot
 * and are not read by any of the three.
 */
function scriptClasses(text) {
  const { code, literals } = readScript(text);
  const names = new Set();
  const words = (value) => {
    for (const word of value.split(/\s+/)) if (SCRIPT_WORD.test(word)) names.add(word);
  };
  for (const { value } of literals.values()) {
    for (const m of value.matchAll(SCRIPT_CLASS)) names.add(m[1]);
  }
  const literalAt = (from) => {
    let i = from;
    while (/\s/.test(code[i] ?? "")) i++;
    return literals.get(i);
  };
  for (const m of code.matchAll(/\bclassName\s*\+?=(?!=)\s*/g)) {
    const literal = literalAt(m.index + m[0].length);
    if (literal) words(literal.value);
  }
  for (const m of code.matchAll(/\bgetElementsByClassName\(\s*/g)) {
    const literal = literalAt(m.index + m[0].length);
    if (literal) words(literal.value);
  }
  for (const m of code.matchAll(/\bsetAttribute\(\s*(?=["'])/g)) {
    const key = literalAt(m.index + m[0].length);
    if (!key || key.value !== "class") continue;
    const comma = /^\s*,\s*/.exec(code.slice(key.end));
    const literal = comma ? literals.get(key.end + comma[0].length) : undefined;
    if (literal) words(literal.value);
  }
  for (const m of code.matchAll(/\bclassList\.(?:add|remove|toggle|contains|replace)\(/g)) {
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < code.length && depth > 0) {
      const literal = literals.get(i);
      if (literal) {
        words(literal.value);
        i = literal.end;
        continue;
      }
      if (code[i] === "(") depth++;
      else if (code[i] === ")") depth--;
      i++;
    }
  }
  return names;
}

/** The layer a package's own scripts' classes belong to: the one its components are in. */
const ownLayerOf = (name) => (name === "core" ? "luz.components" : `luz.${name}`);

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
  const hosted = new Map(); // block -> { hosts, at }
  for (const file of files) {
    const source = readFileSync(join(dist, file), "utf-8");
    const at = `packages/${name}/dist/${file}`;
    const read = readCss(source, at, { strict: true });
    for (const declared of hostsOf(source, at)) {
      const known = hosted.get(declared.block);
      const here = { hosts: declared.hosts, at: `${at}:${declared.line}`, file };
      if (known === undefined) hosted.set(declared.block, here);
      else if (known.hosts.join() !== here.hosts.join()) throw new Error(`${here.at}: @host ${declared.block} lists ${here.hosts.join(", ")}; ${known.at} lists ${known.hosts.join(", ")}; give the block one list`);
    }
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

  // A block that carries hosts is a class a stylesheet of the package defines, and not a modifier or a part
  for (const [block, { at }] of hosted) {
    if (block.includes("--") || block.includes("__")) throw new Error(`${at}: @host ${block} is a modifier or a part; a list of hosts belongs to the block`);
    if (classes.get(block)?.defined !== true) throw new Error(`${at}: @host ${block}: no stylesheet of ${pkg.name} defines .${block}`);
  }

  // What the unminified scripts name that no stylesheet lists
  const exportedScript = typeof pkg.exports?.["."] === "string" ? pkg.exports["."] : pkg.exports?.["."]?.default;
  const script = typeof exportedScript === "string" && exportedScript.startsWith("./dist/") && exportedScript.endsWith(".js") ? exportedScript.slice("./dist/".length) : null;
  const named = new Map();
  for (const file of unminified(dist, ".js")) {
    for (const className of scriptClasses(readFileSync(join(dist, file), "utf-8"))) {
      if (!CLASS_NAMESPACE.test(className) || classes.has(className)) continue;
      if (!named.has(className)) named.set(className, new Set());
      named.get(className).add(file);
    }
  }
  for (const [className, set] of named) {
    classes.set(className, { layer: ownLayerOf(name), defined: false, definedIn: new Set(), seenIn: set, fromScript: true });
  }

  const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const classList = [...classes]
    .map(([className, entry]) => {
      const kind = kindOf(className);
      const out = { name: className, kind, layer: entry.layer, files: filesOf(entry.defined ? entry.definedIn : entry.seenIn, entry.fromScript ? script : bundle), defined: entry.defined };
      if (kind !== "utility" && kind !== "state") {
        const [, block, part, modifier] = BEM.exec(className);
        out.block = block;
        if (modifier !== undefined) out.modifier = modifier;
        if (part !== undefined) out.part = part;
      }
      const hosts = hosted.get(className)?.hosts;
      if (hosts !== undefined) out.hosts = hosts;
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
