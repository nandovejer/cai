/**
 * LUZ check: where the facts come from (f5-ai-ready.md 5.4; the review
 * answers of security-auditor Q5).
 *
 *   createFacts({ data })        -> { forDirectory(absoluteDirectory) -> World }
 *
 * For each of the six packages the data is read from the project's own
 * node_modules when it is there (the release the project runs): from the
 * directory of a checked file, walk up to node_modules/@luz-ds/<pkg>/, whose
 * package.json must name @luz-ds/<pkg>, and read dist/classes.json and
 * dist/custom-elements.json as DATA (the package is never imported). A
 * package that is not found, or whose manifest is not usable, comes from the
 * snapshot beside the bundle (`data`, dist/data of this package). A manifest
 * is data of a size and a shape: at most 8 MiB, the shape of the spec, every
 * name in the echo alphabet and none of `__proto__`, `constructor` or
 * `prototype`; anything else makes that package fall back, never crash.
 * Names are held in Set and Map, never in an object keyed by a file's text.
 *
 * A World is what a rule reads:
 *   packages   [{ package, version, source: "node_modules" | "bundled" }] in
 *              dependency order, one per package that has a manifest
 *   classes    Set of every class name; `byPrefix` the sorted names of
 *              `luz-`, `o-` and `u-`; `blocks` the BEM blocks; `info` Map
 *              name -> { kind, defined, block, modifier, part, hosts, package }
 *              (what the manifest says; `hosts` is an array of selectors, a
 *              tag with at most one attribute test, or undefined)
 *   tags       Map tag -> { attributes: Set, package }; `tagNames` the tags, sorted
 *   properties Map --luz-* name -> "root" | "component" (root wins when two
 *              packages say both); `publicNames` the root ones, sorted
 *   hooks      Set of the data-luz-* names LUZ reads (manifest hooks plus
 *              every attribute of every element)
 *   versions   Map package short name -> { version, source }
 *
 * LUZ's tokens for the theme rules are a file, not a package: tokensFor(dir)
 * is the dist/tokens.css of the nearest node_modules/@luz-ds/tokens that names
 * itself (at most 1 MiB, read as data), else data/tokens/tokens.css of the
 * snapshot, else null.
 *
 * No network, no environment, no module loading: node:fs and node:path only.
 */
import { join, dirname } from "node:path";
import { readLimited } from "./walk.js";

export const PACKAGES = ["tokens", "core", "site", "landing", "cms", "app"];
export const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
const MAX_PACKAGE_JSON_BYTES = 256 * 1024;
const MAX_CLASSES = 50000;
const MAX_ELEMENTS = 2000;
const MAX_ATTRIBUTES = 1000;
const MAX_HOOKS = 2000;
const MAX_PROPERTIES = 20000;
const MAX_TOKENS_BYTES = 1024 * 1024;

const NAME = /^[A-Za-z0-9_:.\-/]{1,64}$/;
const TAG = /^[a-z][a-z0-9-]{0,63}$/;
const HOOK = /^data-luz-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOST = /^[a-z][a-z0-9]{0,31}(?:\[[a-z][a-z-]{0,31}(?:=[A-Za-z0-9_-]{1,32})?\])?$/;
const MAX_HOSTS = 16;
const VERSION = /^[0-9A-Za-z.+_-]{1,40}$/;
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isName = (value) => typeof value === "string" && NAME.test(value) && !FORBIDDEN.has(value);

function readJson(path, max) {
  const read = readLimited(path, max);
  if (read.reason !== undefined) return null;
  try {
    return JSON.parse(read.text);
  } catch {
    return null;
  }
}

/** classes.json of schema 1 -> { version, classes: [{ name, block, kind, defined, modifier, part, hosts }], hooks } or null. */
function parseClasses(data, pkg) {
  if (!isObject(data) || data.schema !== 1 || data.package !== `@luz-ds/${pkg}`) return null;
  if (typeof data.version !== "string" || !VERSION.test(data.version)) return null;
  if (!Array.isArray(data.classes) || data.classes.length > MAX_CLASSES) return null;
  const classes = [];
  for (const entry of data.classes) {
    if (!isObject(entry) || !isName(entry.name)) return null;
    for (const key of ["block", "modifier", "part"]) if (entry[key] !== undefined && !isName(entry[key])) return null;
    const { hosts } = entry;
    if (hosts !== undefined && !(Array.isArray(hosts) && hosts.length > 0 && hosts.length <= MAX_HOSTS && hosts.every((host) => typeof host === "string" && HOST.test(host)))) return null;
    classes.push({ name: entry.name, block: entry.block, kind: entry.kind, defined: entry.defined, modifier: entry.modifier, part: entry.part, hosts });
  }
  if (data.properties !== undefined && !Array.isArray(data.properties)) return null;
  // An entry that is not a name with a scope is left out; the rest of the manifest stands
  const properties = (data.properties ?? []).slice(0, MAX_PROPERTIES).filter((entry) => isObject(entry) && isName(entry.name) && (entry.scope === "root" || entry.scope === "component"));
  let hooks = [];
  if (data.hooks !== undefined) {
    if (!Array.isArray(data.hooks) || data.hooks.length > MAX_HOOKS || !data.hooks.every((hook) => typeof hook === "string" && HOOK.test(hook))) return null;
    hooks = data.hooks;
  }
  return { version: data.version, classes, properties, hooks };
}

/** A Custom Elements Manifest (or its reduction) -> [{ tag, attributes: string[] }] or null. */
function parseElements(data) {
  if (!isObject(data) || !Array.isArray(data.modules) || data.modules.length > MAX_ELEMENTS) return null;
  const elements = [];
  for (const module of data.modules) {
    if (!isObject(module)) return null;
    if (module.declarations === undefined) continue;
    if (!Array.isArray(module.declarations)) return null;
    for (const declaration of module.declarations) {
      if (!isObject(declaration)) return null;
      if (declaration.tagName === undefined) continue;
      if (typeof declaration.tagName !== "string" || !TAG.test(declaration.tagName)) return null;
      const attributes = [];
      if (declaration.attributes !== undefined) {
        if (!Array.isArray(declaration.attributes) || declaration.attributes.length > MAX_ATTRIBUTES) return null;
        for (const attribute of declaration.attributes) {
          if (!isObject(attribute) || !isName(attribute.name)) return null;
          attributes.push(attribute.name);
        }
      }
      elements.push({ tag: declaration.tagName, attributes });
    }
  }
  return elements;
}

/** The two files of a package in one folder layout -> { version, classes, hooks, elements } or null. */
function readPackage(classesPath, elementsPath, pkg) {
  const data = readJson(classesPath, MAX_MANIFEST_BYTES);
  if (data === null) return null;
  const classes = parseClasses(data, pkg);
  if (classes === null) return null;
  let elements = [];
  const present = readLimited(elementsPath, MAX_MANIFEST_BYTES);
  if (present.reason === "too-large" || present.reason === "symlink" || present.reason === "not-a-file") return null;
  if (present.reason === undefined) {
    let parsed;
    try {
      parsed = JSON.parse(present.text);
    } catch {
      return null;
    }
    elements = parseElements(parsed);
    if (elements === null) return null;
  }
  return { ...classes, elements };
}

/** The text of a file at most `max` bytes long, or null. */
function readText(path, max) {
  const read = readLimited(path, max);
  return read.reason === undefined ? read.text : null;
}

/** Group what each package says into the facts a rule reads. */
function buildWorld(parts) {
  const classes = new Set();
  const blocks = new Set();
  const tags = new Map();
  const hooks = new Set();
  const versions = new Map();
  const packages = [];
  const names = { luz: [], o: [], u: [] };
  const info = new Map();
  const properties = new Map();
  for (const part of parts) {
    packages.push({ package: `@luz-ds/${part.name}`, version: part.version, source: part.source });
    versions.set(part.name, { version: part.version, source: part.source });
    for (const { name, block, ...rest } of part.classes) {
      if (!classes.has(name)) {
        classes.add(name);
        info.set(name, { block, ...rest, package: part.name });
        if (name.startsWith("luz-")) names.luz.push(name);
        else if (name.startsWith("o-")) names.o.push(name);
        else if (name.startsWith("u-")) names.u.push(name);
      }
      if (block !== undefined) blocks.add(block);
    }
    for (const hook of part.hooks) hooks.add(hook);
    for (const { name, scope } of part.properties) if (scope === "root" || !properties.has(name)) properties.set(name, scope);
    for (const { tag, attributes } of part.elements) {
      let known = tags.get(tag);
      if (known === undefined) {
        known = { attributes: new Set(), package: part.name };
        tags.set(tag, known);
      }
      for (const attribute of attributes) {
        known.attributes.add(attribute);
        if (attribute.startsWith("data-luz-")) hooks.add(attribute);
      }
    }
  }
  for (const list of Object.values(names)) list.sort();
  const publicNames = [...properties].filter(([, scope]) => scope === "root").map(([name]) => name).sort();
  return { packages, classes, blocks, tags, tagNames: [...tags.keys()].sort(), hooks, versions, byPrefix: names, info, properties, publicNames };
}

/**
 * @param {{ data: string | null }} options `data` is the folder of the bundled snapshot
 */
export function createFacts({ data }) {
  const bundled = new Map(); // package -> part | null
  const installed = new Map(); // absolute package folder -> part | null
  const worlds = new Map(); // absolute directory -> world
  const shared = new Map(); // the parts a world is made of -> world, so two folders with the same packages share one
  const ids = new Map(); // part -> number

  const fromSnapshot = (pkg) => {
    if (bundled.has(pkg)) return bundled.get(pkg);
    let part = null;
    if (typeof data === "string" && data !== "") {
      const folder = join(data, pkg);
      const read = readPackage(join(folder, "classes.json"), join(folder, "custom-elements.json"), pkg);
      if (read !== null) part = { name: pkg, source: "bundled", ...read };
    }
    bundled.set(pkg, part);
    return part;
  };

  const fromFolder = (folder, pkg) => {
    if (installed.has(folder)) return installed.get(folder);
    let part = null;
    const named = readJson(join(folder, "package.json"), MAX_PACKAGE_JSON_BYTES);
    if (isObject(named) && named.name === `@luz-ds/${pkg}`) {
      const read = readPackage(join(folder, "dist", "classes.json"), join(folder, "dist", "custom-elements.json"), pkg);
      if (read !== null) part = { name: pkg, source: "node_modules", ...read };
    }
    installed.set(folder, part);
    return part;
  };

  function forDirectory(directory) {
    const cached = worlds.get(directory);
    if (cached !== undefined) return cached;
    const parts = [];
    for (const pkg of PACKAGES) {
      let part = null;
      for (let current = directory; ; ) {
        part = fromFolder(join(current, "node_modules", "@luz-ds", pkg), pkg);
        if (part !== null) break;
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
      }
      part ??= fromSnapshot(pkg);
      if (part !== null) parts.push(part);
    }
    const key = parts.map((part) => ids.get(part) ?? ids.set(part, ids.size).get(part)).join(",");
    let world = shared.get(key);
    if (world === undefined) {
      world = buildWorld(parts);
      shared.set(key, world);
    }
    worlds.set(directory, world);
    return world;
  }

  const tokenFiles = new Map(); // absolute package folder -> text | null

  /** LUZ's tokens as text, for the theme rules: the project's own first, unless `bundled`. -> { text, source } | null */
  function tokensFor(directory, bundled = false) {
    for (let current = directory; !bundled; ) {
      const folder = join(current, "node_modules", "@luz-ds", "tokens");
      if (!tokenFiles.has(folder)) {
        const named = readJson(join(folder, "package.json"), MAX_PACKAGE_JSON_BYTES);
        tokenFiles.set(folder, isObject(named) && named.name === "@luz-ds/tokens" ? readText(join(folder, "dist", "tokens.css"), MAX_TOKENS_BYTES) : null);
      }
      const text = tokenFiles.get(folder);
      if (text !== null) return { text, source: "node_modules" };
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
    const text = typeof data === "string" && data !== "" ? readText(join(data, "tokens", "tokens.css"), MAX_TOKENS_BYTES) : null;
    return text === null ? null : { text, source: "bundled" };
  }

  return { forDirectory, tokensFor };
}
