/**
 * CAI site — the languages of the home page. Development tooling only.
 *
 * The home page (apps/landing/index.html) is one template; its text lives in
 * one flat catalog per language, apps/landing/i18n/<code>.json, and the
 * languages in the registry apps/landing/i18n/locales.json:
 *
 *   [{ "code": "en", "name": "English", "dir": "ltr", "route": "/" }, …]
 *
 * The first language is the default: its route is "/", its catalog is the
 * reference every other catalog must match key for key, and it is the one
 * the documentation pages (English only) render the shared partials with.
 * Every other language is served at "/<code>/".
 *
 * In the templates (the landing, layouts and partials):
 *   {{t:key}}     the text of `key`, HTML-escaped
 *   {{html:key}}  the text of `key` as trusted, build-time HTML: only
 *                 <a href>, <code>, <span>, <strong> and <em>, with the
 *                 attributes class, href, lang and data-count (INLINE_HTML)
 *
 * Mistakes fail the build with file:line: a key used but missing (site.js,
 * expand), a key missing from a catalog or not in the default one, and a
 * key no template uses (unusedKeys).
 */
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { HtmlError, tags } from "./html.js";

/** A catalog key: lowercase words joined by "." or "-" ("hero.title"). */
export const KEY = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
/** A language tag of the registry: "es", "ar", "pt-br". */
const CODE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;

/** What {{html:key}} may contain: inline elements and these attributes only. */
export const INLINE_HTML = {
  tags: new Set(["a", "code", "span", "strong", "em"]),
  attrs: new Set(["class", "href", "lang", "data-count"]),
};

/** Line of `"key":` in a JSON source, for messages (1 when not found). */
export function lineOfKey(source, key) {
  const at = source.indexOf(`${JSON.stringify(key)}:`);
  return at === -1 ? 1 : source.slice(0, at).split("\n").length;
}

/**
 * Check the registry and the catalogs. `read(abs)` returns a file's text
 * (readInside in site.js). Returns { dir, locales: [{ code, name, dir,
 * route, file, strings, source }], byCode: Map, default } or null when there
 * is no registry (a site without a translated home page).
 */
export function loadLocales(i18nDir, repoRoot, read) {
  const registryAbs = join(i18nDir, "locales.json");
  if (!existsSync(registryAbs)) return null;
  const rel = (p) => relative(repoRoot, p).split(sep).join("/");
  const registryFile = rel(registryAbs);
  let list;
  try {
    list = JSON.parse(read(registryAbs));
  } catch (error) {
    throw new Error(`${registryFile}: ${error.message}`);
  }
  if (!Array.isArray(list) || !list.length) throw new Error(`${registryFile}: a list of { code, name, dir, route }, the default language first`);

  const locales = [];
  const byCode = new Map();
  list.forEach((entry, i) => {
    const where = `${registryFile}: language ${i + 1}`;
    const { code, name, dir, route } = entry ?? {};
    if (Object.keys(entry ?? {}).sort().join() !== "code,dir,name,route") throw new Error(`${where}: has exactly code, name, dir and route`);
    if (typeof code !== "string" || !CODE.test(code)) throw new Error(`${where}: code "${code}" is not a lowercase language tag`);
    if (byCode.has(code)) throw new Error(`${where}: "${code}" is listed twice`);
    if (typeof name !== "string" || !name.trim()) throw new Error(`${where}: name is the language's name in that language`);
    if (dir !== "ltr" && dir !== "rtl") throw new Error(`${where}: dir is "ltr" or "rtl"`);
    const expected = i === 0 ? "/" : `/${code}/`;
    if (route !== expected) throw new Error(`${where}: route is "${expected}"`);

    const catalogAbs = join(i18nDir, `${code}.json`);
    const file = rel(catalogAbs);
    if (!existsSync(catalogAbs)) throw new Error(`${file}: missing (the catalog of "${code}" in ${registryFile})`);
    const source = read(catalogAbs);
    let strings;
    try {
      strings = JSON.parse(source);
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
    if (!strings || typeof strings !== "object" || Array.isArray(strings)) throw new Error(`${file}: a flat object of "key": "text"`);
    for (const [key, value] of Object.entries(strings)) {
      const at = `${file}:${lineOfKey(source, key)}`;
      if (!KEY.test(key)) throw new Error(`${at}: "${key}" is not a valid key (lowercase words joined by "." or "-")`);
      if (typeof value !== "string" || !value.trim()) throw new Error(`${at}: "${key}" is not a non-empty string`);
    }
    const locale = { code, name, dir, route, file, strings, source };
    locales.push(locale);
    byCode.set(code, locale);
  });

  // Every catalog has the default one's keys, and no other
  const [reference, ...others] = locales;
  for (const locale of others) {
    for (const key of Object.keys(reference.strings)) {
      if (!Object.hasOwn(locale.strings, key)) {
        throw new Error(`${locale.file}: missing "${key}" (${reference.file}:${lineOfKey(reference.source, key)})`);
      }
    }
    for (const key of Object.keys(locale.strings)) {
      if (!Object.hasOwn(reference.strings, key)) {
        throw new Error(`${locale.file}:${lineOfKey(locale.source, key)}: "${key}" is not in ${reference.file}`);
      }
    }
  }
  return { dir: i18nDir, locales, byCode, default: reference };
}

/**
 * The text of `key` in a locale, for a use at `where` ("file:line").
 * `used` (a Set) records the key, for unusedKeys().
 */
export function lookup(locale, key, where, used) {
  if (!KEY.test(key)) throw new Error(`${where}: "${key}" is not a valid catalog key`);
  if (!Object.hasOwn(locale.strings, key)) throw new Error(`${where}: "${key}" is not in ${locale.file}`);
  used?.add(key);
  return locale.strings[key];
}

/** Refuse anything in an {{html:key}} value but the inline elements of INLINE_HTML. */
export function assertInlineHtml(html, file) {
  for (const tag of tags(html, file)) {
    if (tag.type === "end" && INLINE_HTML.tags.has(tag.name)) continue;
    if (tag.type !== "start" || !INLINE_HTML.tags.has(tag.name)) {
      throw new HtmlError(file, 1, `only ${[...INLINE_HTML.tags].map((t) => `<${t}>`).join(", ")} are allowed in a catalog's HTML`);
    }
    for (const [name, value] of tag.attrs) {
      if (!INLINE_HTML.attrs.has(name)) throw new HtmlError(file, 1, `${name}="${value}" is not allowed in a catalog's HTML`);
      if (name === "href" && !/^(\/(?!\/)|#|https:\/\/)/.test(value)) {
        throw new HtmlError(file, 1, `href="${value}" in a catalog's HTML is a root-absolute, #fragment or https: URL`);
      }
    }
  }
  return html;
}

/** Keys of the default catalog that no template used: ["file:line: …"]. */
export function unusedKeys(i18n, used) {
  const reference = i18n.default;
  return Object.keys(reference.strings)
    .filter((key) => !used.has(key))
    .map((key) => `${reference.file}:${lineOfKey(reference.source, key)}: "${key}" is used by no template`);
}

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** An https URL of a site's root, ending in "/": "https://<user>.github.io/<repo>/". */
export const SITE_URL = /^https:\/\/[a-z0-9.-]+(\/[A-Za-z0-9._-]+)*\/$/;

/**
 * For the <head> of each home page: <link rel="canonical"> to itself, a
 * <link rel="alternate"> for every language, and x-default to the default
 * one. With `siteUrl` (the published site's root, SITE_URL in
 * vite.config.js: the pages build) the URLs are absolute, as search
 * engines ask; without it (dev) they are root-absolute.
 */
export function renderAlternates(i18n, current = i18n.default, siteUrl = "") {
  if (siteUrl && !SITE_URL.test(siteUrl)) throw new Error(`siteUrl must be an https URL ending in "/", got ${siteUrl}`);
  const url = (route) => esc(siteUrl ? siteUrl + route.slice(1) : route);
  return [
    `<link rel="canonical" href="${url(current.route)}">`,
    ...i18n.locales.map((l) => `<link rel="alternate" hreflang="${esc(l.code)}" href="${url(l.route)}">`),
    `<link rel="alternate" hreflang="x-default" href="${url(i18n.default.route)}">`,
  ].join("\n  ");
}

/** The globe of the language switcher's button (decorative). */
const GLOBE =
  '<svg class="cai-platform-lang-switcher__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>';

/**
 * The language switcher of @cai-ds/platform for the page in `current`: a
 * button that opens a native popover with one link per language, each name
 * in its own language (lang, hreflang), the current one marked
 * aria-current="page". No script. `label` is "Language" in the page's
 * language: the button shows the current language's name, and its
 * accessible name is "<label>: <name>", so it says what the button is and
 * still contains the visible text (WCAG 2.5.3). Below 360px the name is
 * clipped and the globe shows alone; the name stays in the accessible one.
 */
export function renderSwitcher(i18n, current, label) {
  const items = i18n.locales.map((l) => {
    const mark = l.code === current.code ? ' aria-current="page"' : "";
    return `      <li><a class="cai-platform-lang-switcher__link" href="${esc(l.route)}" hreflang="${esc(l.code)}" lang="${esc(l.code)}"${mark}>${esc(l.name)}</a></li>`;
  });
  return [
    '<div class="cai-platform-lang-switcher">',
    `  <button class="cai-platform-lang-switcher__button" type="button" popovertarget="cai-lang-menu">${GLOBE}<span class="u-sr-only">${esc(label)}: </span><span class="cai-platform-lang-switcher__name">${esc(current.name)}</span></button>`,
    '  <nav class="cai-platform-lang-switcher__menu" id="cai-lang-menu" popover aria-labelledby="cai-lang-title">',
    `    <p class="cai-platform-lang-switcher__title" id="cai-lang-title">${esc(label)}</p>`,
    '    <ul class="cai-platform-lang-switcher__list">',
    ...items,
    "    </ul>",
    "  </nav>",
    "</div>",
  ].join("\n");
}

/**
 * On a page that is not in the default language: every link to the
 * (English-only) documentation says so with hreflang, unless it has one.
 */
export function markDocsLinks(html, docsRoute, lang) {
  return html.replace(/<a\b([^>]*?)\shref="([^"]*)"([^>]*)>/g, (whole, before, href, after) =>
    href.startsWith(docsRoute) && !/\shreflang=/.test(before + after) ? `<a${before} href="${href}" hreflang="${lang}"${after}>` : whole,
  );
}
