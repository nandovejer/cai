/**
 * CAI Design System — Strings
 * Every string CAI's JavaScript writes into the page (visible text and
 * accessible names) comes from here, in the language of the element it
 * is written to.
 *
 * Language: the nearest `lang` attribute, then <html lang>. A full tag
 * (es-MX) falls back to its primary subtag (es), then to English.
 * Precedence: data-cai-label-<key> on the element or an ancestor >
 * dictionary for the resolved language > English.
 *
 * Importing this module has no side effects.
 */

const locales = {
  en: {
    play: "Play",
    pause: "Pause",
    mute: "Mute",
    unmute: "Unmute",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit fullscreen",
    loading: "Loading…",
    midiError: "Failed to load MIDI file.",
    timeOf: "{current} of {total}",
    copy: "Copy",
    copied: "Copied",
    copiedStatus: "Copied to clipboard",
    copyFailed: "Copy failed. Select the text and copy it manually.",
    codeExample: "{lang} example",
    copyCode: "Copy code example {n}",
    applyTheme: "Apply theme",
    themeApplied: "Applied",
  },
  es: {
    play: "Reproducir",
    pause: "Pausar",
    mute: "Silenciar",
    unmute: "Activar sonido",
    fullscreen: "Pantalla completa",
    exitFullscreen: "Salir de pantalla completa",
    loading: "Cargando…",
    midiError: "No se pudo cargar el archivo MIDI.",
    timeOf: "{current} de {total}",
    copy: "Copiar",
    copied: "Copiado",
    copiedStatus: "Copiado al portapapeles",
    copyFailed: "No se pudo copiar. Selecciona el texto y cópialo a mano.",
    codeExample: "Ejemplo de {lang}",
    copyCode: "Copiar el ejemplo de código {n}",
    applyTheme: "Aplicar tema",
    themeApplied: "Aplicado",
  },
};

const warned = new Set();

function warnOnce(lang, message) {
  if (warned.has(lang)) return;
  warned.add(lang);
  console.warn(`[cai] ${message}`);
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
      'No lang attribute found; using English. Set <html lang="…"> (WCAG 2.2 SC 3.1.1 Language of Page).',
    );
    return locales.en;
  }
  const own = (key) => (Object.hasOwn(locales, key) ? locales[key] : undefined);
  const dict = own(lang) || own(lang.split("-")[0]);
  if (!dict) {
    warnOnce(
      lang,
      `No strings for lang="${lang}"; using English. Add them with registerLocale().`,
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
  const attr = "data-cai-label-" + key.replace(/[A-Z]/g, "-$&").toLowerCase();
  const text =
    el?.closest?.(`[${attr}]`)?.getAttribute(attr) ??
    dictionaryFor(el)[key] ??
    locales.en[key] ??
    key;
  return vars
    ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m))
    : text;
}
