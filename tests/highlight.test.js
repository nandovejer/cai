/**
 * CAI — syntax highlight: one pass, every piece escaped once, no rule
 * matching inside markup another rule added.
 * Run with: pnpm test:unit
 */
import { describe, it, expect } from "vitest";
import { highlightBlock } from "../packages/core/src/highlight.js";

function block(lang, text) {
  const code = { textContent: text, innerHTML: "" };
  const pre = { dataset: { lang }, querySelector: () => code };
  highlightBlock(pre);
  return code.innerHTML;
}

// Text a browser would show: tags removed, entities decoded
const visible = (html) =>
  html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");

describe("highlightBlock", () => {
  it("JS: a comment is not re-tokenised (no keyword inside the span markup)", () => {
    const html = block("js", "// a class comment\nconst x = new Foo();");
    expect(html).not.toMatch(/<span class="<span/);
    expect(html).toContain('<span class="tok-comment">// a class comment</span>');
    expect(html).toContain('<span class="tok-keyword">const</span>');
    expect(visible(html)).toBe("// a class comment\nconst x = new Foo();");
  });

  it("JS: keywords match whole words only", () => {
    const html = block("js", "classify(); newer = 1;");
    expect(html).not.toContain("tok-keyword");
  });

  it("HTML: markup is escaped once and attributes are marked", () => {
    const html = block("html", '<a class="x" href="#">Hi & bye</a>');
    expect(html).toContain('<span class="tok-tag">&lt;a</span>');
    expect(html).toContain('<span class="tok-attr">class</span>');
    expect(html).not.toContain("&amp;lt;");
    expect(visible(html)).toBe('<a class="x" href="#">Hi & bye</a>');
  });

  it("CSS: comments, custom properties and colours", () => {
    const html = block("css", "/* var */\n:root { --cai-x: #fff; color: var(--cai-x); }");
    expect(html).toContain('<span class="tok-comment">/* var */</span>');
    expect(html).toContain('<span class="tok-property">--cai-x</span>');
    expect(html).toContain('<span class="tok-string">#fff</span>');
  });

  it("never lets code become markup", () => {
    const html = block("js", 'const s = "<img src=x onerror=alert(1)>";');
    expect(html).not.toMatch(/<img/);
  });
});
