/**
 * F6 step 3: how a language gets from JSON to a lazy chunk
 * (.claude/plans/specs/f6-languages.md, "Review answers (2026-10-15)").
 *
 * scripts/build-core.js runs in a copy of the repository (the script reads
 * everything relative to its own location, so nothing under packages/core/dist
 * is touched):
 *
 *   - packages/core/src/i18n/<code>.json is the source, validated against the
 *     schema of the security review; a file that breaks it fails the build,
 *     naming the file and the key
 *   - dist/i18n-<code>.js is exactly `export default {…}` of the JSON, written
 *     with JSON.stringify, with no import; dist/i18n-<code>.min.js beside it
 *   - the entry (luz.js, luz.min.js) and the standalone module (i18n.js,
 *     i18n.min.js) load it by a literal specifier, and the minified ones the
 *     minified chunk; neither carries a word of the language
 *   - nothing a contributor wrote runs: $header, if the file has one, is not in
 *     the module
 */
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { copyOfCore } from "./helpers/core-build-copy.js";
import { enDictionary, languageProblems } from "./helpers/i18n-source.js";

const ES_JSON = "packages/core/src/i18n/es.json";
/** The strings of a language file: its keys, without the optional $header that never reaches the module. */
const stringsOf = (dict) => Object.fromEntries(Object.entries(dict).filter(([key]) => key !== "$header"));
let tree;
let en;

beforeAll(() => {
  tree = copyOfCore();
  en = enDictionary(tree.read("packages/core/src/i18n.js"));
});

/** The text of es.json as the repository has it, or a failure that says it is missing. */
const esText = () => {
  expect(tree.exists(ES_JSON), "packages/core/src/i18n/es.json exists").toBe(true);
  return tree.read(ES_JSON);
};

afterAll(() => tree?.remove());

/** Build with `es.json` changed by `edit(object)` (or replaced by text); the file is restored after. */
function buildWith(edit) {
  const original = esText();
  const dict = JSON.parse(original);
  const next = typeof edit === "function" ? edit(dict) ?? dict : edit;
  tree.write(ES_JSON, typeof next === "string" ? next : `${JSON.stringify(next, null, 2)}\n`);
  try {
    return tree.build();
  } finally {
    tree.write(ES_JSON, original);
  }
}

const importBuilt = (path) => import(/* @vite-ignore */ `${pathToFileURL(tree.at(path)).href}?${Math.random()}`);

describe("a valid dictionary", () => {
  let result;
  beforeAll(() => {
    result = tree.build();
  });

  it("builds", () => {
    expect(result.output).not.toMatch(/✗|Error/);
    expect(result.status).toBe(0);
  });

  it("emits dist/i18n-es.js and dist/i18n-es.min.js", () => {
    expect(tree.exists("packages/core/dist/i18n-es.js")).toBe(true);
    expect(tree.exists("packages/core/dist/i18n-es.min.js")).toBe(true);
  });

  it("writes the module as `export default` of the JSON, written with JSON.stringify, and nothing else", () => {
    const text = tree.read("packages/core/dist/i18n-es.js");
    const match = /^export default (\{[\s\S]*\});?\s*$/.exec(text.trim());
    expect(match, "dist/i18n-es.js is exactly `export default {…}`").not.toBeNull();
    const parsed = JSON.parse(match[1]);
    expect(parsed).toEqual(stringsOf(JSON.parse(esText())));
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(en).sort());
    expect(/\bimport\b/.test(text), "dist/i18n-es.js has an import").toBe(false);
  });

  it("the minified module has the same strings, and imports nothing", async () => {
    const expected = stringsOf(JSON.parse(esText()));
    const min = tree.read("packages/core/dist/i18n-es.min.js");
    expect(/\bimport\b/.test(min), "dist/i18n-es.min.js has an import").toBe(false);
    expect((await importBuilt("packages/core/dist/i18n-es.min.js")).default).toEqual(expected);
  });

  it("the entry and the standalone module load it by a literal specifier, the minified ones the minified file", () => {
    const loads = (file, chunk) => new RegExp(`import\\(\\s*["']\\./${chunk}["']\\s*\\)`).test(tree.read(`packages/core/dist/${file}`));
    expect(loads("luz.js", "i18n-es\\.js"), "luz.js imports ./i18n-es.js").toBe(true);
    expect(loads("i18n.js", "i18n-es\\.js"), "i18n.js imports ./i18n-es.js").toBe(true);
    expect(loads("luz.min.js", "i18n-es\\.min\\.js"), "luz.min.js imports ./i18n-es.min.js").toBe(true);
    expect(loads("i18n.min.js", "i18n-es\\.min\\.js"), "i18n.min.js imports ./i18n-es.min.js").toBe(true);
  });

  it("no file of the entry carries a word of Spanish", () => {
    const es = stringsOf(JSON.parse(esText()));
    for (const file of ["luz.js", "luz.min.js", "i18n.js", "i18n.min.js"]) {
      const text = tree.read(`packages/core/dist/${file}`);
      for (const [key, value] of Object.entries(es)) {
        if (value !== en[key]) expect(text.includes(value), `${file} has the Spanish "${key}"`).toBe(false);
      }
    }
  });

  it("the entry exports loadLocales", () => {
    const exported = (file, re) => re.test(tree.read(`packages/core/dist/${file}`));
    expect(exported("luz.js", /export\s*\{[^}]*\bloadLocales\b[^}]*\}/), "luz.js exports loadLocales").toBe(true);
    expect(exported("i18n.js", /export\s+(?:async\s+)?function\s+loadLocales\b/), "i18n.js exports loadLocales").toBe(true);
  });

  it("the shipped file passes the same checker as the source", () => {
    expect(languageProblems(JSON.parse(esText()), en, { code: "es" })).toEqual([]);
  });
});

describe("a dictionary that breaks the schema fails the build, naming the file and the key", () => {
  it.each([
    ["an extra key", (d) => ({ ...d, extra: "x" }), "extra"],
    ["a missing key", (d) => Object.fromEntries(Object.entries(d).filter(([key]) => key !== "copy")), "copy"],
    ["a value that is not a string", (d) => ({ ...d, copy: 7 }), "copy"],
    ["a null value", (d) => ({ ...d, copy: null }), "copy"],
    ["a nested object", (d) => ({ ...d, copy: { text: "Copiar" } }), "copy"],
    ["a value that is empty", (d) => ({ ...d, copy: "  " }), "copy"],
    ["a changed placeholder", (d) => ({ ...d, copyCode: "Copiar el ejemplo {m}" }), "copyCode"],
    ["a dropped placeholder", (d) => ({ ...d, copyCode: "Copiar el ejemplo" }), "copyCode"],
    ["an added placeholder", (d) => ({ ...d, copy: "Copiar {n}" }), "copy"],
    ["a value over 3 x English + 40", (d) => ({ ...d, copy: "x".repeat(3 * "Copy".length + 41) }), "copy"],
    ["a raw U+2028", (d) => ({ ...d, copy: "Copiar\u2028" }), "copy"],
    ["a raw U+2029", (d) => ({ ...d, copy: "Copiar\u2029" }), "copy"],
    ["a raw bidi override U+202E", (d) => ({ ...d, copy: "Copiar\u202E" }), "copy"],
    ["an escaped bidi override \\u202e", () => esText().replace(/"copy":\s*"[^"]*"/, '"copy": "Copiar\\u202e"'), "copy"],
    ["an escaped U+2028", () => esText().replace(/"copy":\s*"[^"]*"/, '"copy": "Copiar\\u2028"'), "copy"],
    ["a URL", (d) => ({ ...d, copy: "Copiar https://x.test" }), "copy"],
    ["a bare ://", (d) => ({ ...d, copy: "Copiar ://x" }), "copy"],
    ["a www address", (d) => ({ ...d, copy: "Copiar www.x.test" }), "copy"],
    ["an at sign", (d) => ({ ...d, copy: "Copiar a@b" }), "copy"],
    // $header goes after ...d: a $header already in es.json must not win over the one under test
    ["a header that names an e-mail", (d) => ({ ...d, $header: { author: "someone@example.com" } }), "header"],
    ["a header that names an e-mail as its reviewer", (d) => ({ ...d, $header: { author: "nandovejer", reviewer: "a@b.test" } }), "header"],
    ["a header whose author is not a GitHub handle", (d) => ({ ...d, $header: { author: "Not A Handle" } }), "header"],
    ["a header that is not an object", (d) => ({ ...d, $header: "nandovejer" }), "header"],
    ["a header with a value that is not a string", (d) => ({ ...d, $header: { author: 7 } }), "header"],
    ["text that is not JSON", () => "export default {};", ""],
    ["a JSON array", () => "[]", ""],
  ])("%s", (_, edit, key) => {
    const { status, output } = buildWith(edit);
    expect(status, output).not.toBe(0);
    expect(output).toMatch(/es\.json/);
    if (key) expect(output).toContain(key);
  });

  it("builds again once the file is valid (the copy is restored between cases)", () => {
    expect(buildWith((d) => d).status).toBe(0);
  });
});

describe("$header, when a language file has one", () => {
  const HEADER = { language: "Español", tag: "es", author: "nandovejer", reviewer: "a-reader" };
  const stripped = stringsOf;

  it("is validated (a GitHub handle, never an address) and stripped: the built module has the strings only", async () => {
    // Whatever es.json has (with or without a header of its own), the copy is built with a valid one
    const { status, output } = buildWith((d) => ({ ...stripped(d), $header: HEADER }));
    expect(status, output).toBe(0);
    const text = tree.read("packages/core/dist/i18n-es.js");
    for (const word of ["$header", HEADER.author, HEADER.reviewer]) {
      expect(text.includes(word), `dist/i18n-es.js carries "${word}"`).toBe(false);
    }
    expect((await importBuilt("packages/core/dist/i18n-es.js")).default).toEqual(stringsOf(JSON.parse(esText())));
    const min = tree.read("packages/core/dist/i18n-es.min.js");
    expect(min.includes("$header"), "dist/i18n-es.min.js carries $header").toBe(false);
  });

  it("is optional: the file without one builds and has no $header in the module", () => {
    const { status, output } = buildWith((d) => stripped(d));
    expect(status, output).toBe(0);
    expect(tree.read("packages/core/dist/i18n-es.js")).not.toContain("$header");
  });
});

describe("what the schema allows", () => {
  it("the isolates U+2066 to U+2069 around a placeholder", () => {
    const isolated = "Ordenado por \u2068{column}\u2069, ascendente";
    const { status, output } = buildWith((d) => ({ ...d, sortedAsc: isolated }));
    expect(status, output).toBe(0);
  });
});
