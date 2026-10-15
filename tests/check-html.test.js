/**
 * F5 step 1, the tokenizer's new home (.claude/plans/specs/f5-ai-ready.md
 * §5.2, §8 "Parsing cost", §10 row 1; decisions D12 and F-8).
 *
 * `tags()`, `decodeEntities()` and `HtmlError` move unchanged from
 * scripts/docs-site/html.js to packages/check/src/html.js, which gains:
 *
 *   - `tags(html, file, { lenient: true })`: a consumer's file is never
 *     thrown at. A duplicate attribute keeps the first value and is listed in
 *     `tag.problems`; an unclosed comment, start tag or raw-text element ends
 *     the stream with one `{ type: "error", line, column, message }` token.
 *     The default stays strict, as the docs generator needs it.
 *   - one `toLowerCase()` per document, not one per <script> (F-8): 1 MiB of
 *     `<script></script>` tokenises in under a second.
 *   - `scan(html, file)`: the records the rules read, in document order,
 *     lenient, with 1-based line and column on every element and attribute.
 *
 * scripts/docs-site/html.js then imports the tokenizer (one home, no copy)
 * and keeps `readHtml()`. The strict cases of tests/docs-site.test.js are
 * untouched; the strict cases below only pin that moving them changed nothing.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as docs from "../scripts/docs-site/html.js";
import { HtmlError, decodeEntities, scan, tags } from "../packages/check/src/html.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const ONE_SECOND = 1000;

/** How many records an iterable yields. */
function count(iterable) {
  let n = 0;
  for (const record of iterable) if (record) n++;
  return n;
}

/** Run `fn`, return how long it took in ms. */
function timed(fn) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe("strict mode: the tokenizer behaves as it did in scripts/docs-site", () => {
  it("yields start and end tags with name, attributes, line, index and end", () => {
    const html = '<p class="a" id=b data-x=\'&amp;\' hidden>x</p>';
    const [start, end] = [...tags(html, "f.html")];
    expect(start).toMatchObject({ type: "start", name: "p", selfClosing: false, line: 1, index: 0, end: 40 });
    expect([...start.attrs]).toEqual([
      ["class", "a"],
      ["id", "b"],
      ["data-x", "&"],
      ["hidden", ""],
    ]);
    expect(end).toMatchObject({ type: "end", name: "p", line: 1 });
  });

  it("lowercases names, counts lines and skips text, comments and the doctype", () => {
    const html = "<!DOCTYPE html>\n<!-- <b> -->\ntext < 3 <P\n  CLASS=x>\n</P>";
    const out = [...tags(html, "f.html")];
    expect(out.map((t) => [t.type, t.name, t.line])).toEqual([
      ["start", "p", 3],
      ["end", "p", 5],
    ]);
    expect(out[0].attrs.get("class")).toBe("x");
  });

  it("skips the content of script, style, textarea and title", () => {
    const html = "<script>if (a < b) { x('<p>') }</script><style>.a > .b {}</style><title><i></title><p>";
    expect([...tags(html, "f.html")].filter((t) => t.type === "start").map((t) => t.name)).toEqual(["script", "style", "title", "p"]);
  });

  it("closes a raw-text element at its end tag in any case", () => {
    const html = '<script>var a = "<p>";</SCRIPT><p id="after">';
    const names = [...tags(html, "f.html")].map((t) => `${t.type}:${t.name}`);
    expect(names).toEqual(["start:script", "end:script", "start:p"]);
  });

  it("marks a self-closing tag", () => {
    const [tag] = [...tags('<svg><path d="M0 0"/></svg>', "f.html")].filter((t) => t.name === "path");
    expect(tag.selfClosing).toBe(true);
  });

  it("throws an HtmlError with file and line on a duplicate attribute", () => {
    expect.assertions(5);
    try {
      void [...tags('<p>\n<a class="x"\n class="y">', "page.html")];
    } catch (error) {
      expect(error).toBeInstanceOf(HtmlError);
      expect(error.file).toBe("page.html");
      expect(error.line).toBe(2);
      expect(error.message).toMatch(/^page\.html:2: /);
      expect(error.message).toMatch(/"class" twice/);
    }
  });

  it("throws on an unclosed comment, an unclosed start tag and an unclosed raw-text element", () => {
    expect(() => [...tags("<p>\n<!-- never", "f.html")]).toThrow(/^f\.html:2: comment is never closed/);
    expect(() => [...tags('<p>\n<a href="x"', "f.html")]).toThrow(/^f\.html:2: <a> start tag is never closed/);
    expect(() => [...tags("<p>\n<script>var a;", "f.html")]).toThrow(/^f\.html:2: <script> is never closed/);
  });

  it("is strict by default and with lenient: false", () => {
    expect(() => [...tags("<!-- x", "f.html")]).toThrow(HtmlError);
    expect(() => [...tags("<!-- x", "f.html", { lenient: false })]).toThrow(HtmlError);
  });
});

describe("decodeEntities", () => {
  it("decodes the named basics and numeric references, case-insensitively", () => {
    expect(decodeEntities("&amp; &lt;&gt; &quot;&apos; &#65; &#x42; &AMP;")).toBe("& <> \"' A B &");
  });

  it("turns &nbsp; into U+00A0", () => {
    expect(decodeEntities("a&nbsp;b")).toBe("a b");
  });

  it("leaves what it does not know, and a code point out of range, as written", () => {
    expect(decodeEntities("&bogus; &#x110000; &amp")).toBe("&bogus; &#x110000; &amp");
  });

  it("decodes attribute values in both modes", () => {
    const html = '<a href="/a?x=1&amp;y=2" title=\'&#x41;&quot;\'>';
    for (const options of [undefined, { lenient: true }]) {
      const [tag] = [...tags(html, "f.html", options)];
      expect(tag.attrs.get("href")).toBe("/a?x=1&y=2");
      expect(tag.attrs.get("title")).toBe('A"');
    }
  });
});

describe("lenient mode: a consumer's file is reported, never thrown at", () => {
  it("keeps the first of a duplicate attribute and lists the problem on the tag", () => {
    const [tag] = [...tags('<p>\n<a class="x"\n  class="y" id="z">', "f.html", { lenient: true })].filter((t) => t.name === "a");
    expect(tag.type).toBe("start");
    expect(tag.attrs.get("class")).toBe("x");
    expect(tag.attrs.get("id")).toBe("z");
    expect(tag.problems).toHaveLength(1);
    expect(tag.problems[0]).toMatchObject({ code: "duplicate-attribute", name: "class", line: 3, column: 3 });
  });

  it("reports an unclosed comment as an error token with line and column, and stops", () => {
    const out = [...tags("<p>a</p>\n  <!-- never closed\n<div>", "f.html", { lenient: true })];
    expect(out.map((t) => `${t.type}:${t.name ?? ""}`)).toEqual(["start:p", "end:p", "error:"]);
    expect(out[2]).toMatchObject({ type: "error", line: 2, column: 3 });
    expect(out[2].message).toMatch(/comment is never closed/);
  });

  it("reports an unclosed start tag as an error token at the tag, and stops", () => {
    const out = [...tags('<div>\n<p class="a"\n', "f.html", { lenient: true })];
    expect(out.map((t) => t.type)).toEqual(["start", "error"]);
    expect(out[1]).toMatchObject({ type: "error", line: 2, column: 1 });
    expect(out[1].message).toMatch(/start tag is never closed/);
  });

  it("reports an unclosed raw-text element as an error token", () => {
    const out = [...tags("<p>\n<style>.a { color: red }", "f.html", { lenient: true })];
    expect(out.at(-1)).toMatchObject({ type: "error", line: 2, column: 1 });
    expect(out.at(-1).message).toMatch(/never closed/);
  });

  it("never throws on malformed input", () => {
    const inputs = ["<", "<a", "<a ", '<a href="', "<!--", "<!", "<?xml", "</", "</a", "<a/", "<script", "<a b=c d=", "\u0000<p\u0000>", "<<<>>>"];
    for (const input of inputs) expect(() => [...tags(input, "f.html", { lenient: true })], JSON.stringify(input)).not.toThrow();
  });

  it("is the same as strict mode on a well-formed document", () => {
    const html = '<!DOCTYPE html>\n<html lang="en">\n<head><title>t</title><style>.a{}</style></head>\n<body><p id="a">x &amp; y<br></p></body>\n</html>';
    const strip = (t) => Object.fromEntries(Object.entries(t).filter(([key]) => key !== "problems"));
    expect([...tags(html, "f.html", { lenient: true })].map(strip)).toEqual([...tags(html, "f.html")].map(strip));
  });
});

describe("cost: one pass, no quadratic spot (F-8, security 'Parsing cost')", () => {
  it("tokenises 5 000 empty <script> elements in under a second", () => {
    const html = "<script></script>".repeat(5000);
    let total = 0;
    const ms = timed(() => {
      total = count(tags(html, "f.html"));
    });
    expect(total).toBe(10000);
    expect(ms).toBeLessThan(ONE_SECOND);
  });

  it("tokenises 1 MiB of <script></script> in under a second, strict and lenient", () => {
    const html = "<script></script>".repeat(Math.ceil((1024 * 1024) / "<script></script>".length));
    expect(html.length).toBeGreaterThanOrEqual(1024 * 1024);
    for (const options of [undefined, { lenient: true }]) {
      let total = 0;
      const ms = timed(() => {
        total = count(tags(html, "f.html", options));
      });
      expect(total).toBe((html.length / "<script></script>".length) * 2);
      expect(ms, `lenient: ${Boolean(options)}`).toBeLessThan(ONE_SECOND);
    }
  });

  it("scans 1 MiB of <script></script> in under a second", () => {
    const html = "<script></script>".repeat(Math.ceil((1024 * 1024) / "<script></script>".length));
    let total = 0;
    const ms = timed(() => {
      total = count(scan(html, "f.html"));
    });
    expect(total).toBe(html.length / "<script></script>".length);
    expect(ms).toBeLessThan(ONE_SECOND);
  });

  it("reads 1 MiB of tags with a duplicate attribute in under a second", () => {
    const html = "<i a b a>".repeat(Math.ceil((1024 * 1024) / 9));
    let total = 0;
    const ms = timed(() => {
      for (const t of tags(html, "f.html", { lenient: true })) if (t.problems?.length) total++;
    });
    expect(total).toBe(html.length / 9);
    expect(ms).toBeLessThan(ONE_SECOND);
  });
});

describe("scan(): the records the rules read", () => {
  const records = (html) => [...scan(html, "f.html")];

  it("yields one element record per start tag, in document order, with 1-based line and column", () => {
    const out = records('<main>\n  <p class="a">x</p>\n    <img src="i.png" alt="">\n</main>');
    expect(out.map((r) => [r.type, r.name, r.line, r.column])).toEqual([
      ["element", "main", 1, 1],
      ["element", "p", 2, 3],
      ["element", "img", 3, 5],
    ]);
  });

  it("gives every attribute its decoded value and its own line and column, lowercased, first duplicate wins", () => {
    const [el] = records('<div\n  CLASS="luz-btn &amp; x"\n  data-a=1 hidden class="dup">');
    expect(el.attrs).toBeInstanceOf(Map);
    expect(el.attrs.get("class")).toEqual({ value: "luz-btn & x", line: 2, column: 3 });
    expect(el.attrs.get("data-a")).toEqual({ value: "1", line: 3, column: 3 });
    expect(el.attrs.get("hidden")).toEqual({ value: "", line: 3, column: 12 });
    expect([...el.attrs.keys()]).toEqual(["class", "data-a", "hidden"]);
  });

  it("lists the open ancestors, outermost first, of each element", () => {
    const out = records('<body><main><section><p class="x">a</p></section><div></div></main></body>');
    const chain = Object.fromEntries(out.map((r) => [r.name, r.parentChain]));
    expect(chain).toEqual({ body: [], main: ["body"], section: ["body", "main"], p: ["body", "main", "section"], div: ["body", "main"] });
  });

  it("does not make a void element an ancestor", () => {
    const out = records("<p><img src=a><br><span></span></p>");
    expect(out.find((r) => r.name === "span").parentChain).toEqual(["p"]);
  });

  it("is best effort: an end tag pops to its element, a stray end tag is ignored, implied end tags are not modelled", () => {
    const out = records("</div><ul><li>a<li>b</ul><p>c</p>");
    expect(out.find((r) => r.name === "ul").parentChain).toEqual([]);
    expect(out.find((r) => r.name === "p").parentChain).toEqual([]);
  });

  it("marks a self-closing element", () => {
    const out = records('<svg><path d="M0 0"/></svg><br><img src="a">');
    expect(out.map((r) => [r.name, r.selfClosing])).toEqual([
      ["svg", false],
      ["path", true],
      ["br", false],
      ["img", false],
    ]);
  });

  it("gives a <style> its text as written, and does not read markup inside it", () => {
    const out = records('<style media="screen">.a > .b { content: "<p>" }</style><p>');
    expect(out.map((r) => r.name)).toEqual(["style", "p"]);
    expect(out[0].text).toBe('.a > .b { content: "<p>" }');
    expect(out[0].attrs.get("media").value).toBe("screen");
  });

  it("gives a <link> its attributes", () => {
    const [link] = records('<link rel="stylesheet" href="/node_modules/@luz-ds/core/dist/luz.css">');
    expect(link).toMatchObject({ type: "element", name: "link" });
    expect(link.attrs.get("rel").value).toBe("stylesheet");
    expect(link.attrs.get("href").value).toBe("/node_modules/@luz-ds/core/dist/luz.css");
  });

  it("ends with an error record, and does not throw, on an unclosed comment or start tag", () => {
    const comment = records("<p>\n<!-- x");
    expect(comment.map((r) => r.type)).toEqual(["element", "error"]);
    expect(comment[1]).toMatchObject({ line: 2, column: 1 });
    const tag = records('<p>\n<a href="x"');
    expect(tag.map((r) => r.type)).toEqual(["element", "error"]);
    expect(tag[1]).toMatchObject({ line: 2, column: 1 });
    expect(typeof tag[1].message).toBe("string");
  });

  it("keeps the first of a duplicate attribute and does not throw", () => {
    const [el] = records('<a class="x" class="y">');
    expect(el.attrs.get("class").value).toBe("x");
  });
});

describe("one tokenizer: the docs generator imports it", () => {
  const fixture = '<!DOCTYPE html>\n<html lang="en">\n<head><title>t</title><style>.a{}</style></head>\n<body>\n<!-- c -->\n<p id="a" class="luz-btn">x &amp; y<br></p>\n<svg><path d="M0 0"/></svg>\n</body>\n</html>';

  it("scripts/docs-site/html.js re-exports the very functions and class of the package", () => {
    expect(docs.tags).toBe(tags);
    expect(docs.decodeEntities).toBe(decodeEntities);
    expect(docs.HtmlError).toBe(HtmlError);
  });

  it("gives identical tokens for the same fixture", () => {
    expect([...docs.tags(fixture, "f.html")]).toEqual([...tags(fixture, "f.html")]);
  });

  it("readHtml still throws the package's HtmlError, with file and line", () => {
    expect.assertions(3);
    try {
      docs.readHtml('<div>\n<a class="x" class="y"></a></div>', "page.html");
    } catch (error) {
      expect(error).toBeInstanceOf(HtmlError);
      expect(error.file).toBe("page.html");
      expect(error.line).toBe(2);
    }
  });

  it("has no tokenizer of its own left in scripts/docs-site/html.js", () => {
    const source = readFileSync(`${root}scripts/docs-site/html.js`, "utf-8");
    expect(source).toMatch(/from\s+["']\.\.\/\.\.\/packages\/check\/src\/html\.js["']/);
    expect(source).not.toMatch(/function\*\s*tags\b/);
    expect(source).not.toMatch(/class\s+HtmlError\b/);
    expect(source).not.toMatch(/function\s+decodeEntities\b/);
  });
});
