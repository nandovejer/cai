/**
 * F5 step 3, `custom-elements.json` (.claude/plans/specs/f5-ai-ready.md §2.3,
 * §2.2, §10 row 3; decisions D5 and D6, and "Review answers"). One manifest in
 * each package that ships a tag, in the Custom Elements Manifest format, schema
 * version 2.1.0: core ships `<luz-timeline>`; site ships `<luz-search>`,
 * `<luz-consent>` and the CSS-only `<luz-lang-switch>`, `<luz-submenu>`,
 * `<luz-banner>`. Tokens, landing, cms and app ship none.
 *
 * The facts come from the code, not from this file: the expected sets are read
 * from the JS and CSS sources by a scan of their own (`readsOf`, `eventsOf`,
 * `definedTags`, `cssOnlyTags` below), so this is an oracle and not a copy of
 * the generator. The source tags the implementer writes in each header comment
 * are checked against that scan, both ways, and the generated manifest against
 * the tags.
 *
 * The contract these tests pin (the spec leaves the names open; the implementer
 * follows them):
 *
 *   scripts/ai-manifests.js
 *     buildElementManifest(name, { root = repoRoot } = {})
 *       -> the manifest object, or null when the package defines or declares no tag
 *       Reads packages/<name>/src (JS files, and components/<tag minus luz->.css
 *       for a tag no script defines); reads apps/docs through scanSite() for
 *       `demos` only when <root>/apps/docs exists. Throws, with the path of the
 *       file (`packages/<name>/src/<file>`) and the attribute or tag, when a
 *       header tag names an attribute or tag the code does not read, when the
 *       code reads an attribute the header does not declare, or when a tag a
 *       script defines has no @element.
 *     writeManifests(name, { root = repoRoot } = {})
 *       -> still returns the class manifest; also writes
 *       <root>/packages/<name>/dist/custom-elements.json when
 *       buildElementManifest() is not null (two-space JSON, final newline)
 *
 *   Source tags, in the first block comment of the file (the JSDoc comment at
 *   the top of a JS file, the first comment of a stylesheet), one tag per line,
 *   the description to the end of the line, ` - ` before it:
 *     @element <tag> - <description>
 *     @attr {<type>} <name> - <description>
 *     @attr {<type>} [<name>=<default>] - <description>
 *     @fires <event> {<type>} - <description>
 *   One `@attr` per attribute, a `data-luz-label-<key>` each (no wildcard).
 *
 *   Which attributes a tag declares (the same rule for the scan and the
 *   generator): the names the file READS and nothing else: a literal
 *   getAttribute("x") / hasAttribute("x"), `dataset.luzFooBar` (as
 *   `data-luz-foo-bar`), a `[data-luz-…]` selector in a string, a
 *   `data-luz-label-${key}` template with its keys, and, in a stylesheet, an
 *   attribute selector written on the tag itself (`:where(luz-banner)[tone]`).
 *   Not the global attributes (role, tabindex, hidden, lang, aria-*, …), and
 *   not what the script only writes (setAttribute / removeAttribute:
 *   `data-luz-state`, `data-luz-ready`).
 *
 *   Manifest, keys in this order:
 *     { schemaVersion: "2.1.0", readme: "README.md", modules: [ by path ] }
 *     module  { kind: "javascript-module", path (as the package exports it:
 *               "timeline.js", "components/banner.css"), declarations,
 *               exports? }
 *     declaration (one per module) { kind: "class", name (`Luz` + the tag in
 *               PascalCase), customElement: true, tagName, superclass?
 *               ({ name: "HTMLElement" }, only when a script defines the
 *               tag), description (the @element text), attributes?, events?,
 *               demos? }
 *     attribute { name, type: { text }, default? (a string), description }
 *     event     { name, type: { text }, description }
 *     demos     [{ url }] with the docs route of the page of the tag
 *     exports   a tag a script defines only: [{ kind: "custom-element-
 *               definition", name: <tag>, declaration: { name, module: <path> } }]
 *   A CSS-only tag has a declaration and no `exports`; its description starts
 *   "CSS-only: no script defines this tag." (D6-A). No slots, no cssParts.
 *
 *   Each shipping package.json (core, site): exports["./custom-elements.json"]
 *   is "./dist/custom-elements.json" and `customElements` is
 *   "dist/custom-elements.json"; its pack-files.txt lists the file. No other
 *   package has either.
 *
 * The schema is not fetched (no network in a test, and no vendored copy: a
 * third-party file would need its own licence, RL-13). The required fields are
 * encoded here from the interfaces the spec quotes (Package, JavaScriptModule,
 * ClassDeclaration with CustomElement, Attribute, Event, Type, Reference,
 * CustomElementExport).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import * as manifests from "../scripts/ai-manifests.js";
import { PACKAGES } from "../scripts/luz-packages.js";
import { scanSite } from "../scripts/docs-site/site.js";

const root = fileURLToPath(new URL("../", import.meta.url));

const read = (path) => readFileSync(`${root}${path}`, "utf-8");
const readJson = (path) => JSON.parse(read(path));

/** The generator functions, or a clear failure when the module does not have them yet. */
function generator(name) {
  const fn = manifests[name];
  if (typeof fn !== "function") throw new Error(`scripts/ai-manifests.js does not export ${name}()`);
  return fn;
}
const buildElementManifest = (...args) => generator("buildElementManifest")(...args);
const writeManifests = (...args) => generator("writeManifests")(...args);

/** Every file under `dir` (absolute), sorted. */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

/* ---- the tags: what the spec says, and a scan that must agree with it ------ */

// [tag, package, file as the package exports it, a script defines it]
const TAGS = [
  { tag: "luz-timeline", pkg: "core", file: "timeline.js", script: true },
  { tag: "luz-search", pkg: "site", file: "search.js", script: true },
  { tag: "luz-consent", pkg: "site", file: "consent.js", script: true },
  { tag: "luz-lang-switch", pkg: "site", file: "components/lang-switch.css", script: false },
  { tag: "luz-submenu", pkg: "site", file: "components/submenu.css", script: false },
  { tag: "luz-banner", pkg: "site", file: "components/banner.css", script: false },
];
const SHIPPING = [...new Set(TAGS.map((t) => t.pkg))];
const tagsOf = (pkg) => TAGS.filter((t) => t.pkg === pkg).map((t) => t.tag);
const sourceOf = ({ pkg, file }) => read(`packages/${pkg}/src/${file}`);

/** `luz-lang-switch` -> `LuzLangSwitch` */
const pascal = (tag) => tag.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");

/* ---- the scan: what the code reads, found independently of the generator ---- */

const GLOBAL = new Set([
  "accesskey", "autofocus", "class", "contenteditable", "dir", "draggable", "enterkeyhint", "hidden", "id", "inert", "inputmode", "is",
  "itemid", "itemprop", "itemref", "itemscope", "itemtype", "lang", "nonce", "part", "popover", "role", "slot", "spellcheck", "style",
  "tabindex", "title", "translate", "writingsuggestions",
]);
const isGlobal = (name) => GLOBAL.has(name) || name.startsWith("aria-");

const kebab = (camel) => camel.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** JS without its comments (a `//` after a colon is a URL, not a comment). */
const stripJs = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
const stripCss = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");

/** The keys a `data-luz-label-${key}` template can take in a script. */
function labelKeys(code) {
  const keys = new Set();
  const dictionary = /\ben:\s*\{([^}]*)\}/.exec(code);
  if (dictionary) for (const m of dictionary[1].matchAll(/(\w+)\s*:/g)) keys.add(m[1]);
  for (const m of code.matchAll(/\bsay\(\s*"(\w+)"/g)) keys.add(m[1]);
  for (const line of code.split("\n").filter((l) => /\bconst state\s*=/.test(l))) for (const m of line.matchAll(/"(\w+)"/g)) keys.add(m[1]);
  return keys;
}

/**
 * What a file reads of its tag: { names, types, defaults, written }.
 * `types` and `defaults` only where the code shows them (a hasAttribute is a
 * boolean, a `=== "vertical"` is that value, Number(getAttribute()) is a
 * number with the `|| 5000` after it as its default).
 */
function readsOf({ file, script }, text) {
  const names = new Set();
  const types = new Map();
  const defaults = new Map();
  const written = new Set();
  if (script) {
    const code = stripJs(text);
    for (const m of code.matchAll(/\.(?:getAttribute|hasAttribute)\(\s*"([^"]+)"/g)) names.add(m[1]);
    for (const m of code.matchAll(/\bdataset\.(luz[A-Za-z0-9]*)/g)) names.add(`data-${kebab(m[1])}`);
    for (const m of code.matchAll(/\[(data-luz-[a-z0-9-]+)[^\]]*\]/g)) names.add(m[1]);
    if (code.includes("data-luz-label-${")) for (const key of labelKeys(code)) names.add(`data-luz-label-${key}`);
    for (const m of code.matchAll(/\.(?:setAttribute|removeAttribute|toggleAttribute)\(\s*"([^"]+)"/g)) written.add(m[1]);
    for (const name of names) {
      const n = escapeRe(name);
      if (new RegExp(`hasAttribute\\(\\s*"${n}"`).test(code) && !new RegExp(`getAttribute\\(\\s*"${n}"`).test(code)) types.set(name, "boolean");
      const value = new RegExp(`getAttribute\\(\\s*"${n}"\\s*\\)\\s*===\\s*"([^"]+)"`).exec(code);
      if (value) types.set(name, `"${value[1]}"`);
      const number = new RegExp(`Number\\([^)]*getAttribute\\(\\s*"${n}"\\s*\\)\\s*\\)(?:\\s*\\|\\|\\s*(\\d+))?`).exec(code);
      if (number) {
        types.set(name, "number");
        if (number[1]) defaults.set(name, number[1]);
      }
    }
  } else {
    const tag = file.split("/").at(-1).replace(/\.css$/, "");
    const code = stripCss(text);
    const values = new Map();
    for (const m of code.matchAll(new RegExp(`(?<![.\\w-])luz-${escapeRe(tag)}\\)?\\[([a-z][\\w-]*)(?:=["']?([^"'\\]]*)["']?)?\\]`, "g"))) {
      names.add(m[1]);
      if (m[2] !== undefined) values.set(m[1], [...(values.get(m[1]) ?? []), m[2]]);
    }
    for (const [name, list] of values) types.set(name, [...new Set(list)].map((v) => `"${v}"`).join(" | "));
  }
  for (const name of [...names]) if (isGlobal(name)) names.delete(name);
  return { names, types, defaults, written };
}

/** The events a script dispatches: `new CustomEvent("x")`, `new Event("x")`. */
function eventsOf(text) {
  return new Set([...stripJs(text).matchAll(/new\s+(?:Custom)?Event\(\s*"([^"]+)"/g)].map((m) => m[1]));
}

/** The tags a script defines, per package: `customElements.define("luz-x"`. */
function definedTags() {
  const out = new Map();
  for (const pkg of PACKAGES) {
    for (const file of walk(`${root}packages/${pkg}/src`).filter((f) => f.endsWith(".js"))) {
      for (const m of stripJs(readFileSync(file, "utf-8")).matchAll(/customElements\.define\(\s*"(luz-[a-z0-9-]+)"/g)) out.set(m[1], pkg);
    }
  }
  return out;
}

/** The tags no script defines, per package: a type selector in components/<tag minus luz->.css. */
function cssOnlyTags(defined) {
  const out = new Map();
  for (const pkg of PACKAGES) {
    for (const file of walk(`${root}packages/${pkg}/src/components`).filter((f) => f.endsWith(".css") && !basename(f).startsWith("_"))) {
      const tag = `luz-${basename(file, ".css")}`;
      const code = stripCss(readFileSync(file, "utf-8"));
      if (new RegExp(`(?<![.\\w#-])${escapeRe(tag)}(?![\\w-])`).test(code) && !defined.has(tag)) out.set(tag, pkg);
    }
  }
  return out;
}

/** The tags of a header comment: { element: {tag, description}, attrs: [...], fires: [...], malformed: [line] }. */
function annotationsOf(text, { script }) {
  const block = script ? /^\s*\/\*\*([\s\S]*?)\*\//.exec(text) : /\/\*([\s\S]*?)\*\//.exec(text);
  const out = { element: [], attrs: [], fires: [], malformed: [] };
  if (!block) return out;
  for (const raw of block[1].split("\n")) {
    const line = raw.replace(/^[\s*]*/, "").trimEnd();
    if (!/^@(?:element|attr|attribute|fires)\b/.test(line)) continue;
    let m;
    if ((m = /^@element\s+(luz-[a-z0-9-]+)\s+-\s+(\S.*)$/.exec(line))) out.element.push({ tag: m[1], description: m[2] });
    else if ((m = /^@attr\s+\{([^}]+)\}\s+(?:\[([\w-]+)=([^\]]*)\]|([\w-]+))\s+-\s+(\S.*)$/.exec(line))) {
      const entry = { name: m[2] ?? m[4], type: m[1], description: m[5] };
      if (m[2] !== undefined) entry.default = m[3];
      out.attrs.push(entry);
    } else if ((m = /^@fires\s+([\w:-]+)\s+\{([^}]+)\}\s+-\s+(\S.*)$/.exec(line))) out.fires.push({ name: m[1], type: m[2], description: m[3] });
    else out.malformed.push(line);
  }
  return out;
}

/* ---- the docs: the page of each tag, and what its <code> names -------------- */

const ENTITIES = { "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&amp;": "&" };
const decode = (text) => text.replace(/&(?:lt|gt|quot|#39|#x27|amp);/g, (e) => ENTITIES[e]);
const codesOf = (html) => [...html.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, "")));

let docs;
/** The page that documents a tag: its front matter `files` names `<tag>`, or its `module` is the script that defines it. */
function pageOf(entry) {
  docs ??= scanSite(`${root}apps/docs`, root);
  const pages = docs.pages.filter(
    (p) => String(p.meta.files ?? "").includes(`<${entry.tag}>`) || (entry.script && p.meta.module === basename(entry.file)),
  );
  return pages;
}

/** Is an attribute named in a <code> of the page? A label is named by its own name or by the family and its key. */
function isNamed(name, codes) {
  const plain = (n) => new RegExp(`(?<![\\w-])${escapeRe(n)}(?![\\w-])`);
  if (codes.some((c) => plain(name).test(c))) return true;
  const key = /^data-luz-label-(.+)$/.exec(name)?.[1];
  return key !== undefined && codes.some((c) => c.includes("data-luz-label-")) && codes.some((c) => c === key || c === `-${key}`);
}

/** The code texts in the first column of the tables of a page. */
function firstColumnCodes(html) {
  const out = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cell = /<td\b[^>]*>([\s\S]*?)<\/td>/.exec(row[1]);
    if (cell) out.push(...codesOf(cell[1]));
  }
  return out;
}

/* ---- tests ------------------------------------------------------------------ */

describe("which tags exist (the scan of the sources agrees with the spec)", () => {
  it("the tags a script defines are timeline in core, and search and consent in site", () => {
    const defined = definedTags();
    expect([...defined].sort()).toEqual(TAGS.filter((t) => t.script).map((t) => [t.tag, t.pkg]).sort());
  });

  it("the tags no script defines are lang-switch, submenu and banner, in site", () => {
    const cssOnly = cssOnlyTags(definedTags());
    expect([...cssOnly].sort()).toEqual(TAGS.filter((t) => !t.script).map((t) => [t.tag, t.pkg]).sort());
  });

  it.each(TAGS)("$tag: its file is in $pkg and exported in dist as $file", ({ pkg, file }) => {
    expect(existsSync(`${root}packages/${pkg}/src/${file}`)).toBe(true);
  });
});

describe("the source tags in the header comment (D5-A), cross-checked with the code", () => {
  it.each(TAGS)("$tag: its file has exactly one @element, and it names this tag", (entry) => {
    const { element, malformed } = annotationsOf(sourceOf(entry), entry);
    expect(malformed, "tags that do not follow the grammar").toEqual([]);
    expect(element.map((e) => e.tag)).toEqual([entry.tag]);
    expect(element[0].description.length).toBeGreaterThan(10);
  });

  it.each(TAGS)("$tag: every attribute the code reads is declared with @attr, and every @attr is read", (entry) => {
    const text = sourceOf(entry);
    const read = [...readsOf(entry, text).names].sort();
    const declared = annotationsOf(text, entry).attrs.map((a) => a.name);
    expect(new Set(declared).size, "an attribute declared twice").toBe(declared.length);
    expect(declared.sort()).toEqual(read);
  });

  it.each(TAGS)("$tag: a declared type and default say what the code does", (entry) => {
    const text = sourceOf(entry);
    const { types, defaults } = readsOf(entry, text);
    for (const attr of annotationsOf(text, entry).attrs) {
      if (types.has(attr.name)) expect(attr.type, attr.name).toBe(types.get(attr.name));
      expect(attr.default, attr.name).toBe(defaults.get(attr.name));
    }
  });

  it.each(TAGS.filter((t) => t.script))("$tag: every event the script dispatches is declared with @fires, and every @fires is dispatched", (entry) => {
    const text = sourceOf(entry);
    expect(annotationsOf(text, entry).fires.map((f) => f.name).sort()).toEqual([...eventsOf(text)].sort());
  });

  it.each(TAGS.filter((t) => !t.script))("$tag: a CSS-only tag declares no event, and its description says no script defines it", (entry) => {
    const { element, fires } = annotationsOf(sourceOf(entry), entry);
    expect(fires).toEqual([]);
    expect(element[0]?.description).toMatch(/^CSS-only: no script defines this tag\./);
  });

  it("timeline reads layout, autoplay, interval and the four labels, and search and consent what the spec lists", () => {
    // The spec's own words, as a sanity check of the scan: the test is not a copy of one list
    const names = (tag) => [...readsOf(TAGS.find((t) => t.tag === tag), sourceOf(TAGS.find((t) => t.tag === tag))).names].sort();
    expect(names("luz-timeline")).toEqual(
      ["autoplay", "data-luz-label-next", "data-luz-label-pause", "data-luz-label-play", "data-luz-label-previous", "interval", "layout"].sort(),
    );
    expect(names("luz-consent")).toEqual(
      ["data-luz-consent", "data-luz-consent-ask", "data-luz-consent-close", "data-luz-consent-days", "data-luz-consent-done", "data-luz-consent-key", "data-luz-consent-open"].sort(),
    );
    expect(names("luz-banner")).toEqual(["tone"]);
    expect(names("luz-lang-switch")).toEqual([]);
    expect(names("luz-submenu")).toEqual([]);
  });
});

describe("the docs name what the manifest declares, and the tables name only what is read", () => {
  it.each(TAGS)("$tag: one docs page documents it", (entry) => {
    expect(pageOf(entry).map((p) => p.route)).toHaveLength(1);
  });

  it.each(TAGS)("$tag: its page names the tag in a <code>", (entry) => {
    const [page] = pageOf(entry);
    expect(codesOf(page.body).some((c) => c.includes(`<${entry.tag}`)), `${page.route} does not name <${entry.tag}>`).toBe(true);
  });

  it.each(TAGS)("$tag: its page names every attribute it reads in a <code>", (entry) => {
    const [page] = pageOf(entry);
    const codes = codesOf(page.body);
    const missing = [...readsOf(entry, sourceOf(entry)).names].filter((name) => !isNamed(name, codes));
    expect(missing, `${page.route} does not name`).toEqual([]);
  });

  it.each(TAGS.filter((t) => t.script))("$tag: its page names every event it dispatches", (entry) => {
    const [page] = pageOf(entry);
    const codes = codesOf(page.body);
    for (const event of eventsOf(sourceOf(entry))) expect(codes.some((c) => c.includes(event)), `${page.route} does not name ${event}`).toBe(true);
  });

  it.each(TAGS)("$tag: a data-luz-* name in the first column of a table of its page is read or written by the code", (entry) => {
    const [page] = pageOf(entry);
    const { names, written } = readsOf(entry, sourceOf(entry));
    const documented = firstColumnCodes(page.body)
      .map((c) => /^(data-luz-[a-z0-9-]+)(?:=.*)?$/.exec(c)?.[1])
      .filter(Boolean);
    const unknown = documented.filter((n) => !names.has(n) && !written.has(n));
    expect(unknown, `${page.route} documents attributes no code reads`).toEqual([]);
  });
});

describe("the generator, from sources (a fixture root)", () => {
  const roots = [];
  afterEach(() => {
    for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  /** A repo root with packages/<name>/package.json, the given src and dist files. */
  function fixtureRoot(name, files) {
    const dir = mkdtempSync(join(tmpdir(), "luz-elements-"));
    roots.push(dir);
    const put = (path, text) => {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    };
    put(`packages/${name}/package.json`, JSON.stringify({ name: `@luz-ds/${name}`, version: "1.2.3", exports: { "./css": "./dist/luz.css" } }));
    put(`packages/${name}/dist/luz.css`, "@layer luz.components { .luz-x { color: red; } }\n");
    for (const [path, text] of Object.entries(files)) put(`packages/${name}/src/${path}`, text);
    return dir;
  }

  const TIMELINE = `/**
 * Fixture: a timeline.
 *
 * @element luz-timeline - A rail of dates around an ordered list.
 * @attr {"vertical"} layout - Every item stays visible down a line.
 * @attr {boolean} autoplay - Opt in to moving on by itself.
 * @attr {number} [interval=5000] - Milliseconds between items, at least 2000.
 * @fires luz:moved {CustomEvent} - The item changed - it carries the new index.
 */
class LuzTimeline extends HTMLElement {
  connectedCallback() {
    const vertical = this.getAttribute("layout") === "vertical";
    const auto = this.hasAttribute("autoplay");
    const interval = Math.max(2000, Number(this.getAttribute("interval")) || 5000);
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    this.setAttribute("data-luz-ready", "");
    this.dispatchEvent(new CustomEvent("luz:moved", { detail: { vertical, auto, interval } }));
  }
}
if (!customElements.get("luz-timeline")) customElements.define("luz-timeline", LuzTimeline);
`;
  const SEARCH = `/**
 * Fixture: search.
 *
 * @element luz-search - A button that opens a dialog with grouped links.
 * @attr {string} data-luz-search-src - The JSON index of the site, on the same origin.
 */
const wire = (host) => {
  const box = host.querySelector("dialog");
  const src = box.dataset.luzSearchSrc;
  return src;
};
if (typeof customElements < "u" && !customElements.get("luz-search")) {
  customElements.define("luz-search", class extends HTMLElement {
    connectedCallback() {
      wire(this);
    }
  });
}
`;
  const SEARCH_CSS = "/* Search. */\n:where(luz-search) {\n\tdisplay: inline-grid;\n}\n";
  const BANNER = `/* ==========================================================================
	 LUZ Site: banner, <luz-banner>.
	 @element luz-banner - CSS-only: no script defines this tag. One announcement above the header.
	 @attr {"warning"} tone - A yellow band; the words say it too.
	 ========================================================================== */

:where(luz-banner) {
	display: block;
}

:where(luz-banner > section) {
	padding: 0;
}

:where(luz-banner)[tone="warning"] {
	background: yellow;
}
`;

  const TIMELINE_DECLARATION = {
    kind: "class",
    name: "LuzTimeline",
    customElement: true,
    tagName: "luz-timeline",
    superclass: { name: "HTMLElement" },
    description: "A rail of dates around an ordered list.",
    attributes: [
      { name: "layout", type: { text: '"vertical"' }, description: "Every item stays visible down a line." },
      { name: "autoplay", type: { text: "boolean" }, description: "Opt in to moving on by itself." },
      { name: "interval", type: { text: "number" }, default: "5000", description: "Milliseconds between items, at least 2000." },
    ],
    events: [{ name: "luz:moved", type: { text: "CustomEvent" }, description: "The item changed - it carries the new index." }],
  };

  it("builds the manifest of the spec from the header tags: shape, order, and a definition export for a script tag", () => {
    const dir = fixtureRoot("core", { "timeline.js": TIMELINE });
    const manifest = buildElementManifest("core", { root: dir });
    expect(Object.keys(manifest)).toEqual(["schemaVersion", "readme", "modules"]);
    expect(manifest).toStrictEqual({
      schemaVersion: "2.1.0",
      readme: "README.md",
      modules: [
        {
          kind: "javascript-module",
          path: "timeline.js",
          declarations: [TIMELINE_DECLARATION],
          exports: [{ kind: "custom-element-definition", name: "luz-timeline", declaration: { name: "LuzTimeline", module: "timeline.js" } }],
        },
      ],
    });
    expect(Object.keys(manifest.modules[0].declarations[0].attributes[2])).toEqual(["name", "type", "default", "description"]);
  });

  it("names the class of an anonymous definition after the tag, reads dataset.luzFooBar as data-luz-foo-bar, and ignores a stylesheet that only styles a defined tag", () => {
    const dir = fixtureRoot("site", { "search.js": SEARCH, "components/search.css": SEARCH_CSS, "components/banner.css": BANNER });
    const manifest = buildElementManifest("site", { root: dir });
    expect(manifest.modules.map((m) => m.path)).toEqual(["components/banner.css", "search.js"]);
    const search = manifest.modules[1];
    expect(search.declarations).toStrictEqual([
      {
        kind: "class",
        name: "LuzSearch",
        customElement: true,
        tagName: "luz-search",
        superclass: { name: "HTMLElement" },
        description: "A button that opens a dialog with grouped links.",
        attributes: [{ name: "data-luz-search-src", type: { text: "string" }, description: "The JSON index of the site, on the same origin." }],
      },
    ]);
    expect(search.exports).toStrictEqual([{ kind: "custom-element-definition", name: "luz-search", declaration: { name: "LuzSearch", module: "search.js" } }]);
  });

  it("declares a CSS-only tag as a custom element with no definition export, and reads the attribute selector written on the tag", () => {
    const dir = fixtureRoot("site", { "components/banner.css": BANNER });
    const [module] = buildElementManifest("site", { root: dir }).modules;
    expect(module).toStrictEqual({
      kind: "javascript-module",
      path: "components/banner.css",
      declarations: [
        {
          kind: "class",
          name: "LuzBanner",
          customElement: true,
          tagName: "luz-banner",
          description: "CSS-only: no script defines this tag. One announcement above the header.",
          attributes: [{ name: "tone", type: { text: '"warning"' }, description: "A yellow band; the words say it too." }],
        },
      ],
    });
    expect(module).not.toHaveProperty("exports");
  });

  it("is null for a package that defines no tag, even when its CSS styles one that another package defines", () => {
    const dir = fixtureRoot("landing", { "components/header.css": ":where(luz-search) { display: block; }\n.luz-landing-header { color: red; }\n" });
    expect(buildElementManifest("landing", { root: dir })).toBeNull();
  });

  it("fails, with the file and the name, on a declared attribute the code does not read", () => {
    const stale = TIMELINE.replace(" * @fires", " * @attr {boolean} ghost - Nothing reads it.\n * @fires");
    const dir = fixtureRoot("core", { "timeline.js": stale });
    expect(() => buildElementManifest("core", { root: dir })).toThrow(/packages\/core\/src\/timeline\.js[\s\S]*ghost|ghost[\s\S]*packages\/core\/src\/timeline\.js/);
  });

  it("fails, with the file and the name, on an attribute the code reads and the header does not declare", () => {
    const silent = TIMELINE.replace("this.hasAttribute(\"autoplay\");", "this.hasAttribute(\"autoplay\") || this.hasAttribute(\"loop\");");
    const dir = fixtureRoot("core", { "timeline.js": silent });
    expect(() => buildElementManifest("core", { root: dir })).toThrow(/packages\/core\/src\/timeline\.js[\s\S]*loop|loop[\s\S]*packages\/core\/src\/timeline\.js/);
  });

  it("fails on a tag a script defines that its header does not name with @element", () => {
    const bare = TIMELINE.replace(" * @element luz-timeline - A rail of dates around an ordered list.\n", "");
    const dir = fixtureRoot("core", { "timeline.js": bare });
    expect(() => buildElementManifest("core", { root: dir })).toThrow(/luz-timeline/);
  });

  it("does not count a global attribute or one the script only writes as an attribute of the tag", () => {
    // TIMELINE reads `role` and writes data-luz-ready: neither is declared, and the build does not fail
    const dir = fixtureRoot("core", { "timeline.js": TIMELINE });
    const names = buildElementManifest("core", { root: dir }).modules[0].declarations[0].attributes.map((a) => a.name);
    expect(names).not.toContain("role");
    expect(names).not.toContain("data-luz-ready");
  });

  it("has no demos without a docs app, and no time or path in it", () => {
    const dir = fixtureRoot("core", { "timeline.js": TIMELINE });
    const text = JSON.stringify(buildElementManifest("core", { root: dir }));
    expect(text).not.toContain("demos");
    expect(text).not.toContain(dir);
  });

  it("writeManifests writes dist/custom-elements.json beside classes.json, byte for byte the same twice, and still returns the class manifest", () => {
    const dir = fixtureRoot("core", { "timeline.js": TIMELINE });
    const returned = writeManifests("core", { root: dir });
    expect(returned.schema).toBe(1);
    expect(returned.package).toBe("@luz-ds/core");
    expect(existsSync(join(dir, "packages/core/dist/classes.json"))).toBe(true);
    const target = join(dir, "packages/core/dist/custom-elements.json");
    expect(existsSync(target)).toBe(true);
    const text = readFileSync(target, "utf-8");
    expect(JSON.parse(text)).toStrictEqual(buildElementManifest("core", { root: dir }));
    expect(text.startsWith('{\n  "schemaVersion": "2.1.0",\n')).toBe(true);
    expect(text.endsWith("}\n")).toBe(true);
    writeManifests("core", { root: dir });
    expect(readFileSync(target, "utf-8")).toBe(text);
  });

  it("writeManifests writes no custom-elements.json for a package with no tag", () => {
    const dir = fixtureRoot("landing", { "components/header.css": ":where(luz-search) { display: block; }\n" });
    writeManifests("landing", { root: dir });
    expect(existsSync(join(dir, "packages/landing/dist/classes.json"))).toBe(true);
    expect(existsSync(join(dir, "packages/landing/dist/custom-elements.json"))).toBe(false);
  });
});

describe("the built packages: custom-elements.json", () => {
  const ALLOWED_DECLARATION = ["kind", "name", "customElement", "tagName", "superclass", "description", "attributes", "events", "demos"];
  const manifestOf = (pkg) => readJson(`packages/${pkg}/dist/custom-elements.json`);
  const declarationsOf = (pkg) => manifestOf(pkg).modules.flatMap((m) => m.declarations.map((d) => ({ module: m, declaration: d })));

  it.each(SHIPPING)("%s: the build has written dist/custom-elements.json, equal to what the generator reads from src/", (pkg) => {
    const path = `packages/${pkg}/dist/custom-elements.json`;
    expect(existsSync(`${root}${path}`), `${path} is not there: run the build`).toBe(true);
    expect(manifestOf(pkg)).toStrictEqual(buildElementManifest(pkg));
  });

  it("the generator is deterministic: two builds give the same bytes", () => {
    for (const pkg of SHIPPING) expect(JSON.stringify(buildElementManifest(pkg))).toBe(JSON.stringify(buildElementManifest(pkg)));
  });

  it.each(PACKAGES.filter((p) => !SHIPPING.includes(p)))("%s: ships no tag, so the generator has nothing to write", (pkg) => {
    expect(buildElementManifest(pkg)).toBeNull();
  });

  it.each(SHIPPING)("%s: Package and JavaScriptModule fields of schema 2.1.0", (pkg) => {
    const manifest = manifestOf(pkg);
    expect(Object.keys(manifest)).toEqual(["schemaVersion", "readme", "modules"]);
    expect(manifest.schemaVersion).toBe("2.1.0");
    expect(manifest.readme).toBe("README.md");
    expect(Array.isArray(manifest.modules) && manifest.modules.length > 0).toBe(true);
    const paths = manifest.modules.map((m) => m.path);
    expect(paths).toEqual([...paths].sort());
    for (const module of manifest.modules) {
      expect(module.kind).toBe("javascript-module");
      expect(typeof module.path).toBe("string");
      expect(existsSync(`${root}packages/${pkg}/dist/${module.path}`), `${module.path} is not in dist/`).toBe(true);
      expect(module.declarations, module.path).toHaveLength(1);
    }
  });

  it.each(SHIPPING)("%s: declares exactly the tags it ships, each once", (pkg) => {
    const tags = declarationsOf(pkg).map(({ declaration }) => declaration.tagName);
    expect([...tags].sort()).toEqual([...tagsOf(pkg)].sort());
  });

  it.each(TAGS)("$tag: ClassDeclaration and CustomElement fields, the class named after the tag", ({ tag, pkg }) => {
    const { declaration } = declarationsOf(pkg).find((d) => d.declaration.tagName === tag);
    expect(declaration.kind).toBe("class");
    expect(declaration.name).toBe(pascal(tag));
    expect(declaration.customElement).toBe(true);
    expect(typeof declaration.description).toBe("string");
    expect(declaration.description.length).toBeGreaterThan(10);
    for (const key of Object.keys(declaration)) expect(ALLOWED_DECLARATION, key).toContain(key);
    // The parts are classes, in classes.json; the light DOM has no slots
    expect(declaration).not.toHaveProperty("slots");
    expect(declaration).not.toHaveProperty("cssParts");
  });

  it.each(TAGS)("$tag: attributes and events are the ones its header tags declare, in that order, with the code's types", (entry) => {
    const { declaration } = declarationsOf(entry.pkg).find((d) => d.declaration.tagName === entry.tag);
    const text = sourceOf(entry);
    const tags = annotationsOf(text, entry);
    const { types, defaults } = readsOf(entry, text);
    const attributes = (declaration.attributes ?? []).map((a) => ({ name: a.name, type: a.type.text, description: a.description, ...(a.default === undefined ? {} : { default: a.default }) }));
    expect(attributes).toStrictEqual(tags.attrs);
    expect((declaration.attributes ?? []).map((a) => a.name).sort()).toEqual([...readsOf(entry, text).names].sort());
    for (const a of declaration.attributes ?? []) {
      expect(Object.keys(a).every((k) => ["name", "type", "default", "description"].includes(k)), a.name).toBe(true);
      expect(typeof a.type.text, a.name).toBe("string");
      expect(a.description.length, a.name).toBeGreaterThan(0);
      if (types.has(a.name)) expect(a.type.text, a.name).toBe(types.get(a.name));
      expect(a.default, a.name).toBe(defaults.get(a.name));
    }
    const events = (declaration.events ?? []).map((e) => ({ name: e.name, type: e.type.text, description: e.description }));
    expect(events).toStrictEqual(tags.fires);
    if (entry.script) expect(events.map((e) => e.name).sort()).toEqual([...eventsOf(text)].sort());
    expect(declaration.description).toBe(tags.element[0].description);
  });

  it.each(TAGS.filter((t) => t.script))("$tag: a script tag extends HTMLElement and has its custom-element-definition export", ({ tag, pkg, file }) => {
    const { module, declaration } = declarationsOf(pkg).find((d) => d.declaration.tagName === tag);
    expect(module.path).toBe(file);
    expect(declaration.superclass).toStrictEqual({ name: "HTMLElement" });
    expect(declaration.description).not.toMatch(/^CSS-only/);
    expect(module.exports).toStrictEqual([{ kind: "custom-element-definition", name: tag, declaration: { name: pascal(tag), module: file } }]);
  });

  it.each(TAGS.filter((t) => !t.script))("$tag: a CSS-only tag is a custom element with no definition export, and says no script defines it (D6-A)", ({ tag, pkg, file }) => {
    const { module, declaration } = declarationsOf(pkg).find((d) => d.declaration.tagName === tag);
    expect(module.path).toBe(file);
    expect(module).not.toHaveProperty("exports");
    expect(declaration.customElement).toBe(true);
    expect(declaration.description).toMatch(/^CSS-only: no script defines this tag\./);
  });

  it.each(TAGS)("$tag: its demo is the docs page that documents it", (entry) => {
    const { declaration } = declarationsOf(entry.pkg).find((d) => d.declaration.tagName === entry.tag);
    const [page] = pageOf(entry);
    expect(declaration.demos).toStrictEqual([{ url: page.route }]);
    expect(page.route).toMatch(/^\/docs\/[a-z0-9/-]+\/$/);
  });

  it.each(SHIPPING)("%s: no absolute path and no time in the file", (pkg) => {
    const text = read(`packages/${pkg}/dist/custom-elements.json`);
    expect(text).not.toContain(root);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe("how it enters the packages (§2.2)", () => {
  it.each(SHIPPING)("%s: exports ./custom-elements.json from dist and names it in the customElements field", (pkg) => {
    const manifest = readJson(`packages/${pkg}/package.json`);
    expect(manifest.exports["./custom-elements.json"]).toBe("./dist/custom-elements.json");
    expect(manifest.customElements).toBe("dist/custom-elements.json");
  });

  it.each(SHIPPING)("%s: pack-files.txt lists dist/custom-elements.json", (pkg) => {
    expect(read(`packages/${pkg}/pack-files.txt`).split("\n")).toContain("dist/custom-elements.json");
  });

  it.each(PACKAGES.filter((p) => !SHIPPING.includes(p)))("%s: ships no tag, so no custom-elements.json, export, field or pack entry", (pkg) => {
    const manifest = readJson(`packages/${pkg}/package.json`);
    expect(manifest.exports).not.toHaveProperty("./custom-elements.json");
    expect(manifest).not.toHaveProperty("customElements");
    expect(read(`packages/${pkg}/pack-files.txt`).split("\n")).not.toContain("dist/custom-elements.json");
  });

  it.each(SHIPPING)("%s: the export and the pack entry point at a file the build wrote", (pkg) => {
    expect(existsSync(`${root}packages/${pkg}/dist/custom-elements.json`)).toBe(true);
  });
});
