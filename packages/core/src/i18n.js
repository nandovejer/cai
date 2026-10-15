/**
 * LUZ Design System — Strings
 * Every string LUZ's JavaScript writes into the page (visible text and
 * accessible names) comes from here, in the language of the element it
 * is written to.
 *
 * Language: the nearest `lang` attribute, then <html lang>. A full tag
 * (es-MX) falls back to its primary subtag, then to English.
 * Precedence: data-luz-label-<key> on the element or an ancestor >
 * dictionary for the resolved language > English.
 *
 * English is here. Every other language LUZ ships is a lazy file beside
 * this one, built from src/i18n/<code>.json; loadLocales() fetches the ones
 * a page uses. The consumer's own languages come from registerLocale().
 *
 * Importing this module has no side effects: nothing is fetched until
 * loadLocales() is called.
 */

const locales = {
  en: {
    play: "Play",
    pause: "Pause",
    mute: "Mute",
    unmute: "Unmute",
    fullscreen: "Enter full screen",
    exitFullscreen: "Exit full screen",
    captions: "Captions",
    captionsOff: "Off",
    loading: "Loading…",
    midiError: "Could not load the MIDI file. Reload the page to try again.",
    timeOf: "{current} of {total}",
    copy: "Copy",
    copied: "Copied",
    copiedStatus: "Copied to clipboard",
    copyFailed: "Copy failed. Select the text and copy it manually.",
    codeExample: "{lang} example",
    copyCode: "Copy code example {n}",
    applyTheme: "Apply theme",
    themeApplied: "Applied",
    changeMode: "Change color mode. Current: {mode}",
    modeChanged: "Color mode: {mode}",
    sortedAsc: "Sorted by {column}, ascending",
    sortedDesc: "Sorted by {column}, descending",
    previous: "Previous",
    next: "Next",
  },
};

// SEC-CHUNK-1: the only files this module loads, each by a literal. A language is one line here.
const files = { es: () => import("./i18n-es.js") };
// Codes whose file was asked for: kept after a failure, so a failed file is not fetched again
const loaded = new Set();
const warned = new Set();

function warnOnce(lang, message) {
  if (warned.has(lang)) return;
  warned.add(lang);
  console.warn(`[luz] ${message}`);
}

/**
 * Add or extend a dictionary. Missing keys fall back to English.
 * @param {string} lang     - BCP 47 tag, e.g. "fr" or "pt-BR"
 * @param {object} messages - { key: "text with {vars}" }
 */
export function registerLocale(lang, messages) {
  const tag = String(lang).toLowerCase();
  // A language tag only (BCP 47 shape): never "__proto__" or "constructor"
  if (!/^[a-z]{2,8}(-[a-z0-9]{1,8})*$/.test(tag)) {
    throw new TypeError(`registerLocale: "${lang}" is not a language tag`);
  }
  locales[tag] = { ...(Object.hasOwn(locales, tag) ? locales[tag] : {}), ...messages };
}

/**
 * Fetch the strings LUZ ships for the languages in use under `root`: <html lang>,
 * the nearest lang of `root`, and any [lang] below it that is not a link or an
 * option (a language switcher names languages, it does not use them). English,
 * a language with no file and one already fetched are skipped. A language named
 * twice is asked for twice: one import, one evaluation.
 * @param {ParentNode} [root=document]
 * @returns {Promise<void[]>|undefined} resolves when every file has loaded or
 *   failed (a failure is a warning, never an exception); undefined when there
 *   is nothing to fetch, so a page in English stays synchronous
 */
export function loadLocales(root = document) {
  const wanted = [getLang(root), ...[...root.querySelectorAll("[lang]:not(a, option)")].map((el) => el.getAttribute("lang"))]
    .map((lang) => lang.toLowerCase().split("-")[0])
    .filter((code) => Object.hasOwn(files, code) && !loaded.has(code));
  if (!wanted.length) return;
  return Promise.all(
    wanted.map((code) => {
      loaded.add(code);
      return files[code]().then(
        // what was registered before wins, what is registered later merges over it
        (m) => {
          locales[code] = { ...m.default, ...locales[code] };
        },
        () => warnOnce(code, `Could not load lang="${code}"; using English.`),
      );
    }),
  );
}

/** Language of `el`: nearest lang attribute, then <html lang>. */
export function getLang(el) {
  return (
    el?.closest?.("[lang]")?.lang ||
    globalThis.document?.documentElement?.lang ||
    ""
  );
}

function dictionaryFor(el) {
  const lang = getLang(el).toLowerCase();
  if (!lang) {
    warnOnce(
      "",
      'No lang attribute; using English. Set <html lang="…"> (WCAG 3.1.1).',
    );
    return locales.en;
  }
  const own = (key) => (Object.hasOwn(locales, key) ? locales[key] : undefined);
  const code = lang.split("-")[0];
  const dict = own(lang) || own(code);
  // A file on its way, or one that failed (and said so), is not "no strings"
  if (!dict && !loaded.has(code)) {
    warnOnce(
      lang,
      `No strings for lang="${lang}"; using English. Use registerLocale(), or loadLocales() if LUZ ships it.`,
    );
  }
  return dict || locales.en;
}

/**
 * Translate `key` for the language of `el`, interpolating {name} vars.
 * @param {string}  key
 * @param {Element} [el]   - where the string will be written
 * @param {object}  [vars] - values for {name} placeholders
 * @returns {string}
 */
export function t(key, el, vars) {
  const attr = "data-luz-label-" + key.replace(/[A-Z]/g, "-$&").toLowerCase();
  const text =
    el?.closest?.(`[${attr}]`)?.getAttribute(attr) ??
    dictionaryFor(el)[key] ??
    locales.en[key] ??
    key;
  return vars
    ? text.replace(/\{(\w+)\}/g, (m, name) => (Object.hasOwn(vars, name) ? vars[name] : m))
    : text;
}
