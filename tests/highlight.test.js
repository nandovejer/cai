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
    expect(html).toContain('<span class="tok-name">&lt;a</span>');
    expect(html).toContain('<span class="tok-property">class</span>');
    expect(html).not.toContain("&amp;lt;");
    expect(visible(html)).toBe('<a class="x" href="#">Hi & bye</a>');
  });

  it("CSS: comments, custom properties and colours", () => {
    const html = block("css", "/* var */\n:root { --cai-x: #fff; color: var(--cai-x); }");
    expect(html).toContain('<span class="tok-comment">/* var */</span>');
    expect(html).toContain('<span class="tok-property">--cai-x</span>');
    expect(html).toContain('<span class="tok-literal">#fff</span>');
    expect(html).toContain('<span class="tok-name">:root </span>');
    expect(html).toContain('<span class="tok-property">color</span>');
    expect(html).toContain('<span class="tok-name">var</span>');
  });

  it("CSS: at-rules, media features, numbers with units, selectors with pseudo-classes", () => {
    const html = block("css", "@media (min-width: 48rem) {\n  a:hover { padding: 0.5rem 10%; }\n}");
    expect(html).toContain('<span class="tok-keyword">@media</span>');
    expect(html).toContain('<span class="tok-property">min-width</span>');
    expect(html).toContain('<span class="tok-literal">48rem</span>');
    expect(html).toContain('<span class="tok-name">  a:hover </span>');
    expect(html).toContain('<span class="tok-property">padding</span>');
    expect(html).toContain('<span class="tok-literal">10%</span>');
    expect(html).not.toContain('<span class="tok-property">a</span>');
  });

  it("HTML: boolean attributes, doctype and entities, but never text content", () => {
    const html = block("html", '<!doctype html>\n<button type="button" disabled>Save &amp; close now</button>');
    expect(html).toContain('<span class="tok-keyword">&lt;!doctype html&gt;</span>');
    expect(html).toContain('<span class="tok-property">disabled</span>');
    expect(html).toContain('<span class="tok-literal">&amp;amp;</span>');
    expect(html).not.toContain('<span class="tok-property">close</span>');
  });

  it("JS: literals and function names; keywords are not names", () => {
    const html = block("js", "if (ready) load(42, true);");
    expect(html).toContain('<span class="tok-keyword">if</span>');
    expect(html).toContain('<span class="tok-name">load</span>');
    expect(html).toContain('<span class="tok-literal">42</span>');
    expect(html).toContain('<span class="tok-literal">true</span>');
  });

  it("JSON: keys are properties, values are strings and literals", () => {
    const html = block("json", '{ "name": "cai", "private": true, "size": 3 }');
    expect(html).toContain('<span class="tok-property">&quot;name&quot;</span>');
    expect(html).toContain('<span class="tok-string">&quot;cai&quot;</span>');
    expect(html).toContain('<span class="tok-literal">true</span>');
    expect(html).toContain('<span class="tok-literal">3</span>');
  });

  it("shell: commands, flags, variables and comments", () => {
    const html = block("bash", "# Checks\npnpm lint:css && npx playwright test --project=chromium $CI");
    expect(html).toContain('<span class="tok-comment"># Checks</span>');
    expect(html).toContain('<span class="tok-name">pnpm</span>');
    expect(html).toContain('<span class="tok-name">npx</span>');
    expect(html).toContain('<span class="tok-property">--project</span>');
    expect(html).toContain('<span class="tok-property">$CI</span>');
    expect(html).not.toContain('<span class="tok-name">lint:css</span>');
  });

  it("never lets code become markup", () => {
    const html = block("js", 'const s = "<img src=x onerror=alert(1)>";');
    expect(html).not.toMatch(/<img/);
  });
});
