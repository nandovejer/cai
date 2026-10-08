/**
 * Unit tests for packages/core/src/i18n.js
 * Run with: pnpm test:unit
 *
 * The suite runs in Node: a minimal element stub stands in for the DOM
 * (closest() over a parent chain, lang and data-* attributes).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/** Element stub: { lang?, attrs?, parent? } with closest() for [lang] / [attr]. */
function el({ lang, attrs = {}, parent = null } = {}) {
  const node = {
    lang: lang ?? "",
    parent,
    hasAttr(name) {
      return name === "lang" ? lang !== undefined : name in attrs;
    },
    getAttribute(name) {
      return name === "lang" ? lang : attrs[name] ?? null;
    },
    closest(selector) {
      const name = selector.slice(1, -1);
      for (let n = node; n; n = n.parent) if (n.hasAttr(name)) return n;
      return null;
    },
  };
  return node;
}

let i18n;
let warn;

beforeEach(async () => {
  vi.resetModules(); // fresh dictionaries and warn-once state per test
  i18n = await import("../packages/core/src/i18n.js");
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  globalThis.document = { documentElement: { lang: "" } };
});

afterEach(() => {
  warn.mockRestore();
  delete globalThis.document;
});

describe("i18n — importing", () => {
  it("has no side effects", () => {
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("i18n — language resolution", () => {
  it("uses the nearest lang attribute", () => {
    document.documentElement.lang = "en";
    const section = el({ lang: "es" });
    const button = el({ parent: el({ parent: section }) });
    expect(i18n.getLang(button)).toBe("es");
    expect(i18n.t("pause", button)).toBe("Pausar");
  });

  it("falls back to <html lang>", () => {
    document.documentElement.lang = "es";
    expect(i18n.t("play", el())).toBe("Reproducir");
    expect(i18n.t("play")).toBe("Reproducir");
  });

  it("falls back from a full tag to its primary subtag", () => {
    expect(i18n.t("mute", el({ lang: "es-ES" }))).toBe("Silenciar");
    expect(i18n.t("mute", el({ lang: "ES-mx" }))).toBe("Silenciar");
  });

  it("uses English and warns once, citing WCAG 3.1.1, when there is no lang", () => {
    expect(i18n.t("pause", el())).toBe("Pause");
    expect(i18n.t("copy", el())).toBe("Copy");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/3\.1\.1/);
    expect(warn.mock.calls[0][0]).toMatch(/<html lang/);
  });

  it("uses English and warns once per unknown language", () => {
    expect(i18n.t("pause", el({ lang: "fr" }))).toBe("Pause");
    i18n.t("play", el({ lang: "fr" }));
    i18n.t("play", el({ lang: "de" }));
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("gives each fragment of a multilingual page its own strings", () => {
    document.documentElement.lang = "en";
    const es = el({ lang: "es" });
    expect(i18n.t("copy", el({ parent: es }))).toBe("Copiar");
    expect(i18n.t("copy", el())).toBe("Copy");
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("i18n — data-cai-label override", () => {
  it("wins over the dictionary, on the element or an ancestor", () => {
    document.documentElement.lang = "es";
    const root = el({ attrs: { "data-cai-label-pause": "Detener" } });
    expect(i18n.t("pause", root)).toBe("Detener");
    expect(i18n.t("pause", el({ parent: root }))).toBe("Detener");
    expect(i18n.t("play", root)).toBe("Reproducir");
  });

  it("maps camelCase keys to kebab-case attributes", () => {
    const root = el({ lang: "en", attrs: { "data-cai-label-exit-fullscreen": "Leave" } });
    expect(i18n.t("exitFullscreen", root)).toBe("Leave");
  });
});

describe("i18n — interpolation", () => {
  it("replaces {name} placeholders", () => {
    const en = el({ lang: "en" });
    const es = el({ lang: "es" });
    expect(i18n.t("copyCode", en, { n: 3 })).toBe("Copy code example 3");
    expect(i18n.t("copyCode", es, { n: 3 })).toBe("Copiar el ejemplo de código 3");
    expect(i18n.t("codeExample", es, { lang: "CSS" })).toBe("Ejemplo de CSS");
    expect(i18n.t("timeOf", en, { current: "0:05", total: "1:00" })).toBe("0:05 of 1:00");
  });

  it("leaves unknown placeholders as they are", () => {
    expect(i18n.t("copyCode", el({ lang: "en" }), {})).toBe("Copy code example {n}");
  });
});

describe("i18n — registerLocale", () => {
  it("adds a language, falling back to English for missing keys", () => {
    i18n.registerLocale("fr", { play: "Lire" });
    const fr = el({ lang: "fr-CA" });
    expect(i18n.t("play", fr)).toBe("Lire");
    expect(i18n.t("mute", fr)).toBe("Mute");
    expect(warn).not.toHaveBeenCalled();
  });

  it("extends an existing language and matches tags case-insensitively", () => {
    i18n.registerLocale("es", { copied: "¡Copiado!" });
    i18n.registerLocale("pt-BR", { copy: "Copiar" });
    expect(i18n.t("copied", el({ lang: "es" }))).toBe("¡Copiado!");
    expect(i18n.t("pause", el({ lang: "es" }))).toBe("Pausar");
    expect(i18n.t("copy", el({ lang: "pt-br" }))).toBe("Copiar");
  });
});

describe("i18n — dictionaries", () => {
  it("es translates every key (none falls back to English)", () => {
    const keys = [
      "play", "pause", "mute", "unmute", "fullscreen", "exitFullscreen",
      "loading", "midiError", "timeOf", "copy", "copied", "copiedStatus",
      "copyFailed", "codeExample", "copyCode", "applyTheme", "themeApplied",
    ];
    for (const key of keys) {
      expect(i18n.t(key, el({ lang: "es" })), key).not.toBe(i18n.t(key, el({ lang: "en" })));
    }
  });
});
