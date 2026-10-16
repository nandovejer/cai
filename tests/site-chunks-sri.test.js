/**
 * SEC-CHUNK-4, M1 of the Safari and Firefox reviews (2026-10-16): a
 * `<link rel="modulepreload" integrity>` is NOT a guard outside Chromium. In
 * WebKit 26.6 the later import() runs the tampered file from the preload
 * unverified; in Firefox 155 the preload fails and import() fetches the file
 * again, without integrity, and runs it. What blocks a tampered chunk in all
 * three engines is an import map with an `integrity` section, before any module
 * script. The documentation says so:
 *
 *   SECURITY.md, packages/site/README.md, packages/core/README.md and
 *   apps/docs/pages/get-started/index.html
 *     - no longer claim that the preload's verdict is what the import uses, or
 *       that a wrong hash "never runs" there
 *     - show `<script type="importmap">{"integrity": {<chunk URL>: "sha384-…"}}</script>`
 *       in a code block, before the first `type="module"` script of that block,
 *       listing the chunk URLs of the file (jsDelivr URLs of @luz-ds/<pkg>@<version>/dist/<file>)
 *     - call modulepreload a performance hint
 *
 * The generated page "Choose your snippet" is checked in tests/docs-snippets.test.js,
 * the language section of javascript.html in tests/i18n-docs.test.js, and the
 * behaviour in tests/site-loader.spec.js (import map in every engine).
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&");

/** Fenced code blocks of a markdown file. */
const fenced = (text) => [...text.matchAll(/```[\w-]*\n([\s\S]*?)```/g)].map((m) => m[1]);
/** `<pre><code>` blocks of a docs page, decoded. */
const preBlocks = (html) => [...html.matchAll(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)].map((m) => unescape(m[1].replace(/<[^>]+>/g, "")));

const DOCS = [
  { name: "SECURITY.md", text: () => read("SECURITY.md"), blocks: (t) => fenced(t), chunks: ["midi.min.js", "table-sort.min.js", "timeline.min.js", "i18n-es.min.js", "search.min.js", "consent.min.js", "mode.min.js"] },
  { name: "packages/site/README.md", text: () => read("packages/site/README.md"), blocks: (t) => fenced(t), chunks: ["search.min.js", "consent.min.js", "mode.min.js"] },
  { name: "packages/core/README.md", text: () => read("packages/core/README.md"), blocks: (t) => fenced(t), chunks: ["i18n-es.min.js"] },
  { name: "apps/docs/pages/get-started/index.html", text: () => read("apps/docs/pages/get-started/index.html"), blocks: (t) => preBlocks(t), chunks: ["search.min.js", "consent.min.js", "mode.min.js"] },
];

/** The block that holds the import map: its text and the parsed map. */
function importMapOf(blocks) {
  const block = blocks.find((b) => /<script\s+type="importmap"/.test(b));
  if (!block) return null;
  const json = /<script\s+type="importmap"\s*>([\s\S]*?)<\/script>/.exec(block)?.[1];
  return { block, map: json ? JSON.parse(json) : null };
}

describe.each(DOCS)("$name documents the import map as the way to check a lazy chunk", ({ text, blocks, chunks }) => {
  it("does not claim that the preload's verdict is what the import uses, or that a wrong hash never runs", () => {
    expect(text()).not.toMatch(/never runs/i);
    expect(text()).not.toMatch(/uses? (that|the|its) (preload'?s? )?(verdict|result)/i);
    expect(text()).not.toMatch(/instead of fetching the file again/i);
  });

  it("shows a <script type=\"importmap\"> with an integrity section, as valid JSON", () => {
    const found = importMapOf(blocks(text()));
    expect(found, "a code block with <script type=\"importmap\">").not.toBeNull();
    expect(found.map, "JSON inside the importmap element").not.toBeNull();
    expect(Object.keys(found.map)).toContain("integrity");
  });

  it("lists the chunk URLs of this file, each with a sha384 hash", () => {
    const { map } = importMapOf(blocks(text())) ?? { map: { integrity: {} } };
    for (const file of chunks) {
      const url = Object.keys(map.integrity ?? {}).find((u) => new RegExp(`^https://cdn\\.jsdelivr\\.net/npm/@luz-ds/(core|site)@[^/]+/dist/${file.replace(".", "\\.")}$`).test(u));
      expect(url, `${file} in the integrity section`).toBeTruthy();
      expect(map.integrity[url], file).toMatch(/^sha384-/);
    }
  });

  it("puts the import map before the first module script of its block (an import map after one is ignored)", () => {
    const { block } = importMapOf(blocks(text())) ?? { block: "" };
    expect(block).not.toBe("");
    const first = block.search(/<script\b[^>]*type="module"/);
    expect(block.indexOf('type="importmap"')).toBeGreaterThanOrEqual(0);
    if (first >= 0) expect(block.indexOf('type="importmap"')).toBeLessThan(first);
  });

  it("calls an import map the way to check a chunk, and modulepreload a performance hint", () => {
    expect(text()).toMatch(/import map/i);
    expect(text()).toMatch(/performance hint/i);
  });
});

describe("SECURITY.md and the READMEs name the browsers", () => {
  it("SECURITY.md says that modulepreload with integrity does not block a bad file in WebKit (Safari) and Firefox", () => {
    const t = read("SECURITY.md").replace(/\s+/g, " ");
    expect(t).toMatch(/Safari/);
    expect(t).toMatch(/Firefox/);
    expect(t).toMatch(/modulepreload[^.]*(not|n't|does not)[^.]*(block|guard|protect|check)/i);
  });

  it("SECURITY.md keeps self-hosting and npm as the safe options for browsers without import map integrity", () => {
    const t = read("SECURITY.md");
    expect(t).toMatch(/Self-hosting/i);
    expect(t).toMatch(/npm/);
  });
});
