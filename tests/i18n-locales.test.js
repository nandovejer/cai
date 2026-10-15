/**
 * F6, the languages of core (.claude/plans/specs/f6-languages.md, with its
 * "Review answers (2026-10-15)", which are binding). English stays in the
 * entry, in packages/core/src/i18n.js; every other language is a JSON file,
 * packages/core/src/i18n/<code>.json, that scripts/build-core.js validates
 * and emits as the lazy chunk dist/i18n-<code>.js. The module a page runs is
 * never bytes a contributor wrote. The source is read as text; nothing is
 * built here (tests/i18n-build.test.js builds a copy).
 *
 *   - en: 25 keys, with `previous` and `next` (F-5)
 *   - the entry carries no Spanish and no language object but English
 *   - every language file: the schema of the review (keys, strings,
 *     placeholders, length, characters, no address), a $header that names a
 *     GitHub handle, isolates in a right-to-left language
 *   - the `files` map of i18n.js and the folder name the same languages
 *   - the timeline's own four strings cannot drift from the dictionary (EX-010)
 *   - the owners: CODEOWNERS has a line of its own for packages/core/src/i18n*
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RTL, coreSrc, enDictionary, languageFiles, languageProblems, languagesDir, objectAfter, placeholdersOf, readCore, repo } from "./helpers/i18n-source.js";

const entry = readCore("i18n.js");
const en = enDictionary(entry);
const codes = languageFiles();

const EN_KEYS = [
  "play", "pause", "mute", "unmute", "fullscreen", "exitFullscreen", "captions", "captionsOff", "loading", "midiError",
  "timeOf", "copy", "copied", "copiedStatus", "copyFailed", "codeExample", "copyCode", "applyTheme", "themeApplied",
  "changeMode", "modeChanged", "sortedAsc", "sortedDesc", "previous", "next",
];

const readLanguage = (code) => {
  const file = join(languagesDir, `${code}.json`);
  expect(existsSync(file), `packages/core/src/i18n/${code}.json exists`).toBe(true);
  return JSON.parse(readFileSync(file, "utf-8"));
};

describe("English, in the entry", () => {
  it("has the 25 keys of the README, previous and next included (the timeline asks for them)", () => {
    expect(Object.keys(en).sort()).toEqual([...EN_KEYS].sort());
    expect(en.previous).toBe("Previous");
    expect(en.next).toBe("Next");
  });

  it("is the only language object in i18n.js, and no Spanish word is left in it", () => {
    expect(/\bes\s*:\s*\{/.test(entry), "i18n.js still has an `es: {` object").toBe(false);
    const es = readLanguage("es");
    for (const [key, value] of Object.entries(es)) {
      if (key === "$header") continue;
      if (value === en[key]) continue;
      expect(entry.includes(value), `the Spanish value of "${key}" is still in i18n.js`).toBe(false);
    }
  });

  it("loads a language by a literal import() of a sibling file, one per language of the folder (SEC-CHUNK-1)", () => {
    const calls = entry.match(/\bimport\s*\(/g) ?? [];
    const literals = [...entry.matchAll(/\bimport\s*\(\s*(["'])\.\/i18n-([a-z]{2,3})\.js\1\s*\)/g)].map((m) => m[2]);
    expect(calls, "every import() of i18n.js is a literal of the form ./i18n-<code>.js").toHaveLength(literals.length);
    expect(literals.length).toBeGreaterThan(0);
    expect([...literals].sort()).toEqual(codes);
    expect(entry).toMatch(/export\s+(?:async\s+)?function\s+loadLocales\b/);
  });

  it("does not let a contributor write the module: no src/i18n-<code>.js, the language is JSON", () => {
    const written = readdirSync(coreSrc).filter((f) => /^i18n-[\w-]+\.js$/.test(f));
    expect(written).toEqual([]);
  });
});

describe.each(codes.length ? codes : ["es"])("packages/core/src/i18n/%s.json", (code) => {
  const dict = () => readLanguage(code);

  it("is valid against the schema: the keys of en, string values, the same placeholders, bounded, no address", () => {
    expect(languageProblems(dict(), en, { code })).toEqual([]);
  });

  it("is plain JSON: no BOM, no comment, one top-level object", () => {
    const text = readFileSync(join(languagesDir, `${code}.json`), "utf-8");
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(text.trimStart().startsWith("{")).toBe(true);
  });

  it("has a key for each of the 25 keys of English, none empty", () => {
    const own = Object.keys(dict()).filter((k) => k !== "$header");
    expect(own.sort()).toEqual([...EN_KEYS].sort());
    for (const key of own) expect(dict()[key].trim(), key).not.toBe("");
  });

  it("translates every key: none is the English text (the 23 of before and the two new ones)", () => {
    const d = dict();
    const same = EN_KEYS.filter((key) => d[key] === en[key]);
    // a word that is the same in both languages is the contributor's call, never most of the file
    expect(same.length, `kept in English: ${same}`).toBeLessThanOrEqual(2);
  });

  it("keeps the placeholders of English in every value", () => {
    const d = dict();
    for (const key of EN_KEYS) expect(placeholdersOf(d[key]), key).toEqual(placeholdersOf(en[key]));
  });
});

describe("the checker that the build and this file use", () => {
  // Its own small English: these cases test the checker, not the dictionary
  const EN = { play: "Play", copyCode: "Copy code example {n}", sortedAsc: "Sorted by {column}, ascending" };
  const base = { ...EN };
  const make = (patch) => ({ ...base, ...patch });

  it("passes English itself, with a $header that names a handle", () => {
    expect(languageProblems(base, EN)).toEqual([]);
    expect(languageProblems({ $header: { language: "Español", tag: "es", author: "nandovejer", reviewer: "a-reader" }, ...base }, EN)).toEqual([]);
  });

  it.each([
    ["a missing key", () => ({ play: "Play", copyCode: EN.copyCode }), /missing key "sortedAsc"/],
    ["an extra key", () => make({ extra: "x" }), /extra key "extra"/],
    ["a number", () => make({ play: 7 }), /"play" is not a string/],
    ["an empty value", () => make({ play: " " }), /"play" is empty/],
    ["a changed placeholder", () => make({ copyCode: "Copiar {m}" }), /placeholders/],
    ["a dropped placeholder", () => make({ copyCode: "Copiar" }), /placeholders/],
    ["a value over 3x + 40", () => make({ play: "x".repeat(3 * EN.play.length + 41) }), /over 3 x English/],
    ["a raw line separator", () => make({ play: "a\u2028b" }), /separator/],
    ["a bidi override", () => make({ play: "a\u202Eb" }), /bidi override/],
    ["a URL", () => make({ play: "see http://x.test" }), /URL/],
    ["a web address", () => make({ play: "WWW.x.test" }), /web address/],
    ["an at sign", () => make({ play: "me@x.test" }), /"@"/],
    ["markup", () => make({ play: "<b>x</b>" }), /markup/],
    ["a header with an e-mail", () => make({ $header: { author: "me@x.test" } }), /address/],
    ["a header with a name that is not a handle", () => make({ $header: { author: "Not A Handle" } }), /not a GitHub handle/],
  ])("reports %s", (_, bad, pattern) => {
    expect(languageProblems(bad(), EN).join("\n")).toMatch(pattern);
  });

  it("allows the isolates U+2066 to U+2069, and in a right-to-left language requires them around {column}", () => {
    const wrapped = make({ sortedAsc: "\u2068{column}\u2069 ..." });
    expect(languageProblems(wrapped, EN, { code: "es" })).toEqual([]);
    expect(languageProblems(wrapped, EN, { code: "ar" })).toEqual([]);
    expect(languageProblems(make({ sortedAsc: "{column} ..." }), EN, { code: "es" })).toEqual([]);
    expect(languageProblems(make({ sortedAsc: "{column} ..." }), EN, { code: "ar" }).join("\n")).toMatch(/isolate/);
    expect(RTL.has("ar") && RTL.has("he") && RTL.has("fa")).toBe(true);
  });
});

describe("the timeline's own four strings (EX-010) cannot drift from the dictionary", () => {
  const timeline = readCore("timeline.js");
  const own = (lang) => objectAfter(timeline.slice(timeline.indexOf("const strings")), new RegExp(`\\b${lang}\\s*:\\s*\\{`));

  it("English: play, pause, previous and next equal en", () => {
    const strings = own("en");
    for (const key of ["play", "pause", "previous", "next"]) expect(strings[key], key).toBe(en[key]);
  });

  it("Spanish: play, pause, previous and next equal the Spanish file", () => {
    const strings = own("es");
    const es = readLanguage("es");
    for (const key of ["play", "pause", "previous", "next"]) expect(strings[key], key).toBe(es[key]);
  });
});

describe("the owners of the languages (security review: a language file runs on every page that declares it)", () => {
  const lines = readFileSync(join(repo, ".github/CODEOWNERS"), "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(/\s+/));

  /** gitignore-style: `*` is a name part, a pattern also covers what is inside a directory it names. */
  const matches = (pattern, path) => {
    const body = pattern.replace(/^\//, "").replace(/\/$/, "");
    const escaped = body.replace(/[.+^$(){}|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
    return new RegExp("^" + escaped + "(?:/.*)?$").test(path);
  };
  /** The line that wins for a path: the last one that matches (CODEOWNERS precedence). */
  const ownerLine = (path) => lines.filter(([pattern]) => matches(pattern, path)).at(-1);

  it.each(["packages/core/src/i18n.js", "packages/core/src/i18n/es.json"])("%s has a CODEOWNERS line of its own that wins over packages/core/", (path) => {
    const winner = ownerLine(path);
    expect(winner, `no line owns ${path}`).toBeTruthy();
    expect(winner[0], "the line that wins is the one for the languages").toMatch(/i18n/);
    expect(winner.slice(1).every((owner) => /^@/.test(owner))).toBe(true);
    expect(winner.length).toBeGreaterThan(1);
  });
});
