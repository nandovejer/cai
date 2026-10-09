/**
 * Unit tests for packages/platform/src/search.js: reading and checking the
 * index, matching, and the shortcut filter. The DOM half (rendering, keys,
 * focus, fetch) is tests/search.spec.js.
 * Security: .claude/plans/docs-redesign/security.md SEC-IDX-3/4/6/7/8/12.
 * Run with: pnpm test:unit
 */
import { describe, it, expect } from "vitest";
import { fold, isShortcut, parseIndex, readIndex, safeUrl, search } from "../packages/platform/src/search.js";

const BASE = "https://example.org/docs/search-index.json";
const index = (lists) => ({ version: 1, pages: [], ...lists });

describe("links (SEC-IDX-3, SEC-IDX-4)", () => {
  it("keeps http and https URLs, resolved against the index", () => {
    expect(safeUrl("components/button/", BASE).href).toBe("https://example.org/docs/components/button/");
    expect(safeUrl("components/button/#how", BASE).href).toBe("https://example.org/docs/components/button/#how");
    expect(safeUrl("./", BASE).href).toBe("https://example.org/docs/");
  });

  it("drops every other scheme, however it is written", () => {
    for (const raw of ["javascript:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)", "JaVaScRiPt:x", "data:text/html,<b>", "vbscript:x", "blob:https://example.org/x", "file:///etc/passwd", "about:blank"]) {
      expect(safeUrl(raw, BASE), JSON.stringify(raw)).toBeFalsy();
    }
  });

  it("drops what is not a URL instead of throwing", () => {
    expect(safeUrl("http://[bad", BASE)).toBeFalsy();
    expect(safeUrl("x", "not a base")).toBeFalsy();
  });

  it("lets other hosts through as plain links: the format allows them (SEC-IDX-5)", () => {
    expect(safeUrl("//evil.example/", BASE).href).toBe("https://evil.example/");
    expect(safeUrl("/\\evil.example/", BASE).href).toBe("https://evil.example/");
  });

  it("a fragment that looks like a scheme stays a fragment of the page", () => {
    expect(safeUrl("#javascript:alert(1)", BASE).href).toBe("https://example.org/docs/search-index.json#javascript:alert(1)");
    const [result] = readIndex(index({ sections: [["X", "javascript:alert(1)"], ["Y", "a/#javascript:alert(1)"]] }), BASE);
    expect(result.href).toBe("https://example.org/docs/a/#javascript:alert(1)");
  });
});

describe("reading the index (SEC-IDX-6, SEC-IDX-7, SEC-IDX-8)", () => {
  it("reads the three groups, with meta and lang", () => {
    const results = readIndex(
      index({
        pages: [["Button", "components/button/", "Components"]],
        sections: [["When to use, Button › Design", "components/button/#when"]],
        elements: [["<table> element, Tables", "html/tables/#el-table", null, "en"]],
      }),
      BASE,
    );
    expect(results.map((r) => [r.g, r.text, r.meta, r.href, r.lang])).toEqual([
      [0, "Button", "Components", "https://example.org/docs/components/button/", false],
      [1, "When to use, Button › Design", false, "https://example.org/docs/components/button/#when", false],
      [2, "<table> element, Tables", false, "https://example.org/docs/html/tables/#el-table", "en"],
    ]);
  });

  it("is unavailable unless it is an object with version 1 and a list of pages", () => {
    for (const data of [null, [], "x", {}, { version: "1", pages: [] }, { version: 2, pages: [] }, { version: 1, pages: {} }, { version: 1 }]) {
      expect(readIndex(data, BASE), JSON.stringify(data)).toBeNull();
    }
    expect(readIndex({ version: 1, pages: [] }, BASE)).toEqual([]);
  });

  it("skips a malformed item and keeps the rest", () => {
    const results = readIndex(
      index({ pages: [null, 1, "Button", {}, { title: "A", url: "a/" }, [1, "a/"], ["A"], ["A", 2], ["Kept", "kept/"]], sections: "x", elements: {} }),
      BASE,
    );
    expect(results.map((r) => r.text)).toEqual(["Kept"]);
  });

  it("ignores a meta or lang that is not a plain value, and a lang that is not a language tag", () => {
    const results = readIndex(index({ pages: [["A", "a/", { x: 1 }, "en-GB"], ["B", "b/", "Area", "en\" onmouseover=\"x"], ["C", "c/", "Area", "x-"]] }), BASE);
    expect(results.map((r) => [r.meta, r.lang])).toEqual([[false, "en-GB"], ["Area", false], ["Area", false]]);
  });

  it("does not let __proto__ reach any object", () => {
    const results = parseIndex('{"__proto__": {"x": 1}, "version": 1, "pages": [["A", "a/"]]}', BASE);
    expect(results).toHaveLength(1);
    expect({}.x).toBeUndefined();
    expect(Object.prototype.x).toBeUndefined();
  });

  it("refuses a body over 1,000,000 characters, or one that is not JSON", () => {
    const big = JSON.stringify(index({ pages: [["A", "a/", "x".repeat(2_000_000)]] }));
    expect(parseIndex(big, BASE)).toBeNull();
    expect(parseIndex("{", BASE)).toBeNull();
    expect(parseIndex(null, BASE)).toBeNull();
    expect(parseIndex('{"version":1,"pages":[["A","a/"]]}', BASE)).toHaveLength(1);
  });

  it("keeps 10,000 results at most and 300 characters of each text", () => {
    const pages = Array.from({ length: 12_000 }, (_, i) => [`Page ${i} ${"x".repeat(400)}`, `p${i}/`, "y".repeat(400)]);
    const results = readIndex(index({ pages }), BASE);
    expect(results).toHaveLength(10_000);
    expect(results[0].text).toHaveLength(300);
    expect(results[0].meta).toHaveLength(300);
  });
});

describe("matching", () => {
  const results = readIndex(
    index({
      pages: [["Tables", "html/tables/"], ["Tabs", "components/tabs/"], ["Table", "components/table/"], ["Écran d’accueil", "fr/"], ["Data table", "data/"]],
      sections: [["When to use, Tabs › Design", "components/tabs/#when"], ["Keyboard and ARIA, Button › Code", "components/button/#keyboard"]],
      elements: [["<table> element, Tables", "html/tables/#el-table"]],
    }),
    BASE,
  );
  const names = (groups) => groups.map((g) => g.map((r) => r.text));

  it("folds case, accents and punctuation", () => {
    expect(fold("  Écran  D’Accueil!  ")).toBe("ecran d accueil");
    expect(names(search(results, "ECRAN"))[0]).toEqual(["Écran d’accueil"]);
    expect(names(search(results, "<table>"))[2]).toEqual(["<table> element, Tables"]);
  });

  it("needs every word, in any order, and finds a section by its page", () => {
    expect(names(search(results, "button keyboard"))).toEqual([[], ["Keyboard and ARIA, Button › Code"], []]);
    expect(names(search(results, "aria button"))[1]).toEqual(["Keyboard and ARIA, Button › Code"]);
    expect(names(search(results, "button zebra"))).toEqual([[], [], []]);
  });

  it("puts the exact name first, then the names that start with the query", () => {
    expect(names(search(results, "table"))[0]).toEqual(["Table", "Tables", "Data table"]);
    expect(names(search(results, "tab"))[0]).toEqual(["Tabs", "Table", "Tables", "Data table"]);
  });

  it("finds nothing for an empty query, and reads 8 words at most", () => {
    expect(names(search(results, "   "))).toEqual([[], [], []]);
    expect(names(search(results, "table a b c d e f g zebra"))[0]).toEqual([]);
    expect(names(search(results, "table table table table table table table table zebra"))[0]).toEqual(["Table", "Tables", "Data table"]);
  });
});

describe("the shortcut (PRINCIPLES.md §3, a11y.md SRCH-6/8, SEC-MISC-6/7)", () => {
  const key = (props) => ({ key: "k", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: false, defaultPrevented: false, target: { localName: "body" }, ...props });

  it("is Ctrl+K or ⌘K", () => {
    expect(isShortcut(key({ ctrlKey: true }))).toBe(true);
    expect(isShortcut(key({ metaKey: true }))).toBe(true);
    expect(isShortcut(key({ ctrlKey: true, key: "K" }))).toBe(true);
    expect(isShortcut(key({ ctrlKey: true, target: { localName: "input" } }))).toBe(true);
  });

  it("never a single key, nor with Alt or Shift", () => {
    for (const k of ["k", "/", "s"]) expect(isShortcut(key({ key: k })), k).toBe(false);
    expect(isShortcut(key({ ctrlKey: true, altKey: true }))).toBe(false);
    expect(isShortcut(key({ ctrlKey: true, shiftKey: true, key: "K" }))).toBe(false);
    expect(isShortcut(key({ ctrlKey: true, key: "j" }))).toBe(false);
  });

  it("lets the key through during IME composition, once handled, and in editors", () => {
    expect(isShortcut(key({ ctrlKey: true, isComposing: true }))).toBe(false);
    expect(isShortcut(key({ ctrlKey: true, defaultPrevented: true }))).toBe(false);
    expect(isShortcut(key({ ctrlKey: true, target: { localName: "textarea" } }))).toBe(false);
    expect(isShortcut(key({ ctrlKey: true, target: { localName: "div", isContentEditable: true } }))).toBe(false);
  });
});
