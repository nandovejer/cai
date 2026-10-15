/**
 * Unit tests for packages/core/src/i18n.js
 * Run with: pnpm test:unit
 *
 * The suite runs in Node: a minimal element stub stands in for the DOM
 * (closest() over a parent chain, lang and data-* attributes, and a
 * querySelectorAll over the children it was given).
 *
 * F6 (.claude/plans/specs/f6-languages.md, "Review answers"): English is the
 * only dictionary in the module; every other language LUZ ships is a lazy
 * file beside it, fetched by loadLocales(root). The module is copied, as
 * dist/i18n.js is, into a folder of its own with a language file next to it
 * that the test writes (the Spanish strings of before, one that throws, or
 * none), so what loads is exactly what a page loads: a literal
 * import("./i18n-es.js") of a sibling. How the real file is built from
 * src/i18n/es.json is the build's test (tests/i18n-build.test.js); what it
 * holds is tests/i18n-locales.test.js.
 */

import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const SOURCE = fileURLToPath(new URL("../packages/core/src/i18n.js", import.meta.url));

/** The Spanish strings of before F6, plus the two keys F6 adds. */
const ES = {
  play: "Reproducir",
  pause: "Pausar",
  mute: "Silenciar",
  unmute: "Activar sonido",
  fullscreen: "Ver a pantalla completa",
  exitFullscreen: "Salir de pantalla completa",
  captions: "Subtítulos",
  captionsOff: "Desactivados",
  loading: "Cargando…",
  midiError: "No se pudo cargar el archivo MIDI. Recarga la página para intentarlo de nuevo.",
  timeOf: "{current} de {total}",
  copy: "Copiar",
  copied: "Copiado",
  copiedStatus: "Copiado al portapapeles",
  copyFailed: "No se pudo copiar. Selecciona el texto y cópialo a mano.",
  codeExample: "Ejemplo de {lang}",
  copyCode: "Copiar el ejemplo de código {n}",
  applyTheme: "Aplicar tema",
  themeApplied: "Aplicado",
  changeMode: "Cambiar el modo de color. Actual: {mode}",
  modeChanged: "Modo de color: {mode}",
  sortedAsc: "Ordenado por {column}, ascendente",
  sortedDesc: "Ordenado por {column}, descendente",
  previous: "Anterior",
  next: "Siguiente",
};

/** Rows the stub's querySelectorAll() understands: `[lang]` with any number of `:not(a, option)`. */
function select(nodes, selector) {
  const m = /^\[lang\]((?::not\([^)]*\))*)$/.exec(String(selector).trim());
  if (!m) throw new Error(`the test stub understands "[lang]" and "[lang]:not(a, option)", not "${selector}"`);
  const skip = [...m[1].matchAll(/:not\(([^)]*)\)/g)].flatMap((n) => n[1].split(",")).map((s) => s.trim().toUpperCase());
  return nodes.filter((node) => node.hasAttr("lang") && !skip.includes(node.tagName));
}

/** Element stub: { lang?, attrs?, parent?, tag?, children? } with closest() for [lang] / [attr]. */
function el({ lang, attrs = {}, parent = null, tag = "DIV", children = [] } = {}) {
  const node = {
    lang: lang ?? "",
    tagName: tag,
    parent,
    hasAttr(name) {
      return name === "lang" ? lang !== undefined : name in attrs;
    },
    getAttribute(name) {
      return name === "lang" ? (lang ?? null) : (attrs[name] ?? null);
    },
    closest(selector) {
      const name = selector.slice(1, -1);
      for (let n = node; n; n = n.parent) if (n.hasAttr(name)) return n;
      return null;
    },
    querySelectorAll(selector) {
      return select(children, selector);
    },
  };
  return node;
}

const dirs = [];
let i18n;
let warn;

/**
 * Import a fresh copy of i18n.js with its language file beside it.
 * `es`: the strings written to i18n-es.js; `throws`: a file that fails while it evaluates;
 * `missing`: no file at all. Every evaluation of the file counts in `loads()`.
 */
async function load({ es = ES, throws = false, missing = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "luz-i18n-"));
  dirs.push(dir);
  cpSync(SOURCE, join(dir, "i18n.js"));
  if (!missing) {
    const count = "globalThis.__luzLanguageFiles = (globalThis.__luzLanguageFiles ?? 0) + 1;\n";
    writeFileSync(join(dir, "i18n-es.js"), throws ? `${count}throw new Error("the file is broken");\n` : `${count}export default ${JSON.stringify(es)};\n`);
  }
  return import(/* @vite-ignore */ pathToFileURL(join(dir, "i18n.js")).href);
}

const fileLoads = () => globalThis.__luzLanguageFiles ?? 0;

beforeEach(() => {
  delete globalThis.__luzLanguageFiles;
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  globalThis.document = { documentElement: { lang: "" }, querySelectorAll: () => [] };
});

afterEach(async () => {
  warn.mockRestore();
  delete globalThis.document;
  delete globalThis.__luzLanguageFiles;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const page = (nodes) => {
  document.querySelectorAll = (selector) => select(nodes, selector);
};

describe("i18n — importing", () => {
  it("has no side effects: nothing is fetched, nothing is written to the console", async () => {
    i18n = await load();
    expect(warn).not.toHaveBeenCalled();
    expect(fileLoads()).toBe(0);
  });

  it("exports loadLocales next to t, getLang and registerLocale", async () => {
    i18n = await load();
    expect(Object.keys(i18n).sort()).toEqual(["getLang", "loadLocales", "registerLocale", "t"]);
  });
});

describe("i18n — language resolution", () => {
  it("uses the nearest lang attribute", async () => {
    i18n = await load();
    document.documentElement.lang = "en";
    const section = el({ lang: "es" });
    const button = el({ parent: el({ parent: section }) });
    await i18n.loadLocales(section);
    expect(i18n.getLang(button)).toBe("es");
    expect(i18n.t("pause", button)).toBe("Pausar");
  });

  it("falls back to <html lang>", async () => {
    i18n = await load();
    document.documentElement.lang = "es";
    await i18n.loadLocales();
    expect(i18n.t("play", el())).toBe("Reproducir");
    expect(i18n.t("play")).toBe("Reproducir");
  });

  it("falls back from a full tag to its primary subtag, in any case", async () => {
    i18n = await load();
    const spain = el({ lang: "es-ES" });
    const mexico = el({ lang: "ES-mx" });
    await i18n.loadLocales(spain);
    expect(i18n.t("mute", spain)).toBe("Silenciar");
    expect(i18n.t("mute", mexico)).toBe("Silenciar");
    expect(warn).not.toHaveBeenCalled();
  });

  it("fetches the primary language of ES-mx on its own", async () => {
    i18n = await load();
    await i18n.loadLocales(el({ lang: "ES-mx" }));
    expect(fileLoads()).toBe(1);
  });

  it("uses English and warns once, citing WCAG 3.1.1, when there is no lang", async () => {
    i18n = await load();
    expect(i18n.t("pause", el())).toBe("Pause");
    expect(i18n.t("copy", el())).toBe("Copy");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/3\.1\.1/);
    expect(warn.mock.calls[0][0]).toMatch(/<html lang/);
  });

  it("uses English and warns once per language LUZ does not ship, and says loadLocales() exists", async () => {
    i18n = await load();
    expect(i18n.t("pause", el({ lang: "fr" }))).toBe("Pause");
    i18n.t("play", el({ lang: "fr" }));
    i18n.t("play", el({ lang: "de" }));
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toMatch(/^\[luz\]/);
    expect(warn.mock.calls[0][0]).toContain('"fr"');
    expect(warn.mock.calls[0][0]).toContain("registerLocale()");
    expect(warn.mock.calls[0][0]).toContain("loadLocales()");
  });

  it("gives each fragment of a multilingual page its own strings", async () => {
    i18n = await load();
    document.documentElement.lang = "en";
    const child = el({ tag: "P" });
    const es = el({ lang: "es", children: [child] });
    child.parent = es;
    await i18n.loadLocales(es);
    expect(i18n.t("copy", child)).toBe("Copiar");
    expect(i18n.t("copy", el())).toBe("Copy");
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not ship Spanish in the module: until loadLocales() the strings are English, and nothing throws", async () => {
    i18n = await load();
    document.documentElement.lang = "es";
    expect(i18n.t("play", el({ lang: "es" }))).toBe("Play");
    expect(i18n.t("copyCode", el({ lang: "es" }), { n: 2 })).toBe("Copy code example 2");
  });

  it("t() answers at once with a string, before and after the language arrives", async () => {
    i18n = await load();
    const es = el({ lang: "es" });
    const before = i18n.t("play", es);
    expect(typeof before).toBe("string");
    await i18n.loadLocales(es);
    const after = i18n.t("play", es);
    expect(typeof after).toBe("string");
    expect([before, after]).toEqual(["Play", "Reproducir"]);
  });
});

describe("i18n — data-luz-label override", () => {
  it("wins over the dictionary, on the element or an ancestor", async () => {
    i18n = await load();
    document.documentElement.lang = "es";
    await i18n.loadLocales();
    const root = el({ attrs: { "data-luz-label-pause": "Detener" } });
    expect(i18n.t("pause", root)).toBe("Detener");
    expect(i18n.t("pause", el({ parent: root }))).toBe("Detener");
    expect(i18n.t("play", root)).toBe("Reproducir");
  });

  it("maps camelCase keys to kebab-case attributes", async () => {
    i18n = await load();
    const root = el({ lang: "en", attrs: { "data-luz-label-exit-fullscreen": "Leave" } });
    expect(i18n.t("exitFullscreen", root)).toBe("Leave");
  });

  it("wins over a language that loaded", async () => {
    i18n = await load();
    const root = el({ lang: "es", attrs: { "data-luz-label-copied": "¡Hecho!" } });
    await i18n.loadLocales(root);
    expect(i18n.t("copied", root)).toBe("¡Hecho!");
    expect(i18n.t("copy", root)).toBe("Copiar");
  });
});

describe("i18n — interpolation", () => {
  it("replaces {name} placeholders", async () => {
    i18n = await load();
    const en = el({ lang: "en" });
    const es = el({ lang: "es" });
    await i18n.loadLocales(es);
    expect(i18n.t("copyCode", en, { n: 3 })).toBe("Copy code example 3");
    expect(i18n.t("copyCode", es, { n: 3 })).toBe("Copiar el ejemplo de código 3");
    expect(i18n.t("codeExample", es, { lang: "CSS" })).toBe("Ejemplo de CSS");
    expect(i18n.t("timeOf", en, { current: "0:05", total: "1:00" })).toBe("0:05 of 1:00");
  });

  it("leaves unknown placeholders as they are", async () => {
    i18n = await load();
    expect(i18n.t("copyCode", el({ lang: "en" }), {})).toBe("Copy code example {n}");
  });
});

describe("i18n — registerLocale", () => {
  it("adds a language, falling back to English for missing keys", async () => {
    i18n = await load();
    i18n.registerLocale("fr", { play: "Lire" });
    const fr = el({ lang: "fr-CA" });
    expect(i18n.t("play", fr)).toBe("Lire");
    expect(i18n.t("mute", fr)).toBe("Mute");
    expect(warn).not.toHaveBeenCalled();
  });

  it("extends an existing language and matches tags case-insensitively", async () => {
    i18n = await load();
    i18n.registerLocale("es", { copied: "¡Copiado!" });
    i18n.registerLocale("pt-BR", { copy: "Copiar" });
    await i18n.loadLocales(el({ lang: "es" }));
    expect(i18n.t("copied", el({ lang: "es" }))).toBe("¡Copiado!");
    expect(i18n.t("pause", el({ lang: "es" }))).toBe("Pausar");
    expect(i18n.t("copy", el({ lang: "pt-br" }))).toBe("Copiar");
  });

  it("a language registered after the file arrived still wins for its keys", async () => {
    i18n = await load();
    await i18n.loadLocales(el({ lang: "es" }));
    i18n.registerLocale("es", { copied: "¡Copiado!" });
    expect(i18n.t("copied", el({ lang: "es" }))).toBe("¡Copiado!");
    expect(i18n.t("copy", el({ lang: "es" }))).toBe("Copiar");
  });

  it("a language registered before the file arrives is not overwritten by it, and the file supplies the rest", async () => {
    i18n = await load();
    i18n.registerLocale("es", { copied: "¡Copiado!" });
    // registered is not loaded: the file is still fetched, and merged under what was registered
    await i18n.loadLocales(el({ lang: "es" }));
    expect(fileLoads()).toBe(1);
    expect(i18n.t("copied", el({ lang: "es" }))).toBe("¡Copiado!");
    expect(i18n.t("pause", el({ lang: "es" }))).toBe("Pausar");
  });

  it("a key the file lacks falls back to English, not to the key", async () => {
    i18n = await load({ es: { play: "Reproducir" } });
    const es = el({ lang: "es" });
    await i18n.loadLocales(es);
    expect(i18n.t("play", es)).toBe("Reproducir");
    expect(i18n.t("mute", es)).toBe("Mute");
  });
});

describe("i18n — loadLocales(root)", () => {
  it("returns undefined and fetches nothing on a page in English", async () => {
    i18n = await load();
    document.documentElement.lang = "en";
    page([]);
    expect(i18n.loadLocales()).toBeUndefined();
    expect(fileLoads()).toBe(0);
  });

  it("fetches the language of <html lang>", async () => {
    i18n = await load();
    document.documentElement.lang = "es-MX";
    page([]);
    await i18n.loadLocales();
    expect(fileLoads()).toBe(1);
    expect(i18n.t("play", el({ lang: "es-MX" }))).toBe("Reproducir");
  });

  it("fetches the language of a root that sits inside a lang", async () => {
    i18n = await load();
    document.documentElement.lang = "en";
    const root = el({ parent: el({ lang: "es" }) });
    await i18n.loadLocales(root);
    expect(fileLoads()).toBe(1);
  });

  it("does not fetch for a link or an option that only names a language", async () => {
    i18n = await load();
    document.documentElement.lang = "en";
    page([el({ lang: "es", tag: "A", attrs: { hreflang: "es" } }), el({ lang: "es", tag: "OPTION" })]);
    expect(i18n.loadLocales()).toBeUndefined();
    expect(fileLoads()).toBe(0);
    // the same, under a root other than the document
    const root = el({ children: [el({ lang: "es", tag: "A" }), el({ lang: "es", tag: "OPTION" })] });
    expect(i18n.loadLocales(root)).toBeUndefined();
    expect(fileLoads()).toBe(0);
  });

  it("fetches a language once for a fragment, however many times it is asked", async () => {
    i18n = await load();
    document.documentElement.lang = "en";
    page([el({ lang: "es", tag: "DIV" })]);
    const first = i18n.loadLocales();
    expect(first).toBeDefined();
    await first;
    expect(i18n.loadLocales()).toBeUndefined();
    expect(i18n.loadLocales()).toBeUndefined();
    expect(fileLoads()).toBe(1);
  });

  it("fetches nothing for a language with no file, and says so once when it is used", async () => {
    i18n = await load();
    document.documentElement.lang = "en";
    const fr = el({ lang: "fr" });
    page([fr]);
    expect(i18n.loadLocales()).toBeUndefined();
    expect(fileLoads()).toBe(0);
    i18n.t("play", fr);
    i18n.t("pause", fr);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it.each([["", "an empty lang"], ["en_US", "a malformed tag"], ["__proto__", "__proto__"], ["constructor", "constructor"], ["toString", "toString"], ["es_ES", "a tag with an underscore"]])(
    "does not throw, and fetches nothing, for lang=%j (%s)",
    async (lang) => {
      i18n = await load();
      document.documentElement.lang = "en";
      page([el({ lang })]);
      expect(() => i18n.loadLocales()).not.toThrow();
      expect(i18n.loadLocales()).toBeUndefined();
      expect(fileLoads()).toBe(0);
      expect(() => i18n.t("play", el({ lang }))).not.toThrow();
    },
  );

  it("always resolves, and warns once, when the file throws while it evaluates", async () => {
    i18n = await load({ throws: true });
    const es = el({ lang: "es" });
    await expect(i18n.loadLocales(es)).resolves.not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^\[luz\]/);
    expect(warn.mock.calls[0][0]).toContain("es");
    expect(warn.mock.calls[0][0]).toMatch(/English/);
    // English, with no second warning from the lookup, and no retry
    expect(i18n.t("play", es)).toBe("Play");
    expect(i18n.t("copy", es)).toBe("Copy");
    expect(i18n.loadLocales(es)).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("always resolves, and warns once, when the file is not there", async () => {
    i18n = await load({ missing: true });
    const es = el({ lang: "es" });
    await expect(i18n.loadLocales(es)).resolves.not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(i18n.t("play", es)).toBe("Play");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn that a language has no strings while its file is on the way", async () => {
    i18n = await load();
    const es = el({ lang: "es" });
    const pending = i18n.loadLocales(es);
    expect(i18n.t("copy", es)).toBe("Copy");
    expect(warn).not.toHaveBeenCalled();
    await pending;
    expect(i18n.t("copy", es)).toBe("Copiar");
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("i18n — table sort", () => {
  it("names the column in both directions, in English and Spanish, with {column}", async () => {
    i18n = await load();
    const column = { column: "Parcels" };
    const es = el({ lang: "es" });
    await i18n.loadLocales(es);
    expect(i18n.t("sortedAsc", el({ lang: "en" }), column)).toBe("Sorted by Parcels, ascending");
    expect(i18n.t("sortedDesc", el({ lang: "en" }), column)).toBe("Sorted by Parcels, descending");
    expect(i18n.t("sortedAsc", es, column)).toBe("Ordenado por Parcels, ascendente");
    expect(i18n.t("sortedDesc", es, column)).toBe("Ordenado por Parcels, descendente");
  });

  it("the key becomes the attribute that overrides it", async () => {
    i18n = await load();
    const table = el({ lang: "en", attrs: { "data-luz-label-sorted-asc": "Par {column}, croissant" } });
    expect(i18n.t("sortedAsc", table, { column: "Colis" })).toBe("Par Colis, croissant");
  });
});

describe("i18n — the timeline's two keys", () => {
  it("has previous and next in English and, once loaded, in Spanish", async () => {
    i18n = await load();
    const es = el({ lang: "es" });
    expect(i18n.t("previous", el({ lang: "en" }))).toBe("Previous");
    expect(i18n.t("next", el({ lang: "en" }))).toBe("Next");
    await i18n.loadLocales(es);
    expect(i18n.t("previous", es)).toBe("Anterior");
    expect(i18n.t("next", es)).toBe("Siguiente");
  });
});

describe("registerLocale rejects what is not a language tag", () => {
  it("throws on __proto__ and constructor, and leaves the prototype alone", async () => {
    i18n = await load();
    expect(() => i18n.registerLocale("__proto__", { play: "x" })).toThrow(TypeError);
    expect(() => i18n.registerLocale("constructor", { play: "x" })).toThrow(TypeError);
    expect({}.play).toBeUndefined();
    expect(() => i18n.registerLocale("pt-BR", { play: "Reproduzir" })).not.toThrow();
  });
});
