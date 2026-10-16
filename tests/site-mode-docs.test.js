/**
 * The docs that go with <luz-mode> (.claude/plans/luz-home-docs-identity.md
 * section 3.3, F1): the pattern page apps/docs/pages/site/mode.html and the
 * pages that point at it. tests/docs-site.test.js and tests/site-docs.spec.js
 * hold the structure every pattern page has and the attributes against the
 * element manifest; this file holds the content only this element has:
 *   - the table of the six phases (their hours, dark or light), computed from
 *     phaseOf() in mode.js, so the page and the code cannot drift;
 *   - the boot snippet for <head>: at most eight lines, and run in a sandbox it
 *     sets data-theme the way the element will (stored choice, then
 *     prefers-contrast, then prefers-color-scheme), whatever the storage does;
 *   - the two-light theme example, written with the tokens of
 *     packages/core/src/themes/_template.css;
 *   - the links and sections of the pages around it.
 *
 * What the docs-writer must produce, in one list:
 *   - phase table: one <tr> per phase, first cell the phase name (in <code>),
 *     the hours of its start and end as HH:MM, and one cell that says "dark" or
 *     "light" (what data-theme becomes);
 *   - near the boot snippet, a sentence that says it avoids the flash (or the wrong
 *     first paint) of a page that follows a dark system without it; recommended, not required;
 *   - boot snippet: the first inline <script> of a code block that reads
 *     `luz-theme`, 8 non-blank lines or fewer, for by="system";
 *   - two-light example: a code block with [data-light="…"] rules for a dark and
 *     a light phase that set only tokens the template declares.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = "apps/docs/pages";
const MODE_PAGE = `${PAGES}/site/mode.html`;
const ROUTE = "/docs/site/mode/";

/** A page's source; a missing page is the assertion that fails, not an ENOENT. */
const page = (rel) => {
  expect(existsSync(join(repo, rel)), `${rel} exists`).toBe(true);
  return readFileSync(join(repo, rel), "utf-8");
};
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const text = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const frontMatter = (html) =>
  Object.fromEntries(
    [...(/<!--\s*luz:page\n([\s\S]*?)-->/.exec(html)?.[1] ?? "").matchAll(/^(\w+):\s*(.*)$/gm)].map((m) => [m[1], m[2].trim()]),
  );
/** The decoded text of every `pre.luz-code-block` of a page. */
const codeBlocks = (html) =>
  [...html.matchAll(/<pre\b[^>]*\bluz-code-block\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)].map((m) => decode(m[1]));
const rows = (html) => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1])));
const hasLink = (html, route) => new RegExp(`href="${route.replace(/[/]/g, "\\/")}(#[\\w-]*)?"`).test(html);

const PHASES = ["night", "dawn", "morning", "afternoon", "sunset", "dusk"];
const DARK = new Set(["dawn", "dusk", "night"]);

/* ---- The page ---------------------------------------------------------------- */

describe("apps/docs/pages/site/mode.html", () => {
  it("is a pattern page of the Site area: front matter with the module and the files", () => {
    const meta = frontMatter(page(MODE_PAGE));
    expect(meta).toMatchObject({ area: "site", group: "patterns", module: "mode.js", toc: "h2,h3" });
    expect(meta.title, "title").toBeTruthy();
    expect(meta.description, "description").toBeTruthy();
    expect(meta.files, "files").toMatch(/mode\.css|luz-mode/);
  });

  it("has the table of the six phases: hours computed from phaseOf(), and dark or light", async () => {
    expect(existsSync(join(repo, "packages/site/src/mode.js")), "packages/site/src/mode.js exists").toBe(true);
    const { phaseOf } = await import("../packages/site/src/mode.js");
    const html = page(MODE_PAGE);
    const table = rows(html);
    // Where each phase starts and ends, on the 24-hour circle, read off the function
    const begins = new Map(PHASES.map((p) => [p, new Set()]));
    const ends = new Map(PHASES.map((p) => [p, new Set()]));
    for (let minute = 0; minute < 24 * 60; minute++) {
      const before = phaseOf(((minute + 24 * 60 - 1) % (24 * 60)) / 60);
      const now = phaseOf(minute / 60);
      if (before !== now) {
        begins.get(now).add(minute);
        ends.get(before).add(minute);
      }
    }
    const clock = (minute) => ({ h: Math.floor(minute / 60), m: String(minute % 60).padStart(2, "0") });
    const hour = (minute) => {
      const { h, m } = clock(minute);
      return new RegExp(`(?<![\\d:])0?${h}:${m}(?![\\d:])`);
    };
    for (const phase of PHASES) {
      const row = table.find((cells) => cells[0]?.toLowerCase() === phase);
      expect(row, `a table row whose first cell is "${phase}"`).toBeDefined();
      const line = row.join(" | ");
      for (const minute of [...begins.get(phase), ...ends.get(phase)]) expect(line, `${phase}: ${clock(minute).h}:${clock(minute).m}`).toMatch(hour(minute));
      const mode = DARK.has(phase) ? "dark" : "light";
      expect(row.slice(1).map((c) => c.toLowerCase()), `${phase} is ${mode}`).toContain(mode);
    }
    expect(text(html)).toContain("data-light");
  });

  it("documents the event, with every key of its detail", () => {
    const body = text(page(MODE_PAGE));
    expect(body).toContain("luz-mode:change");
    for (const key of ["mode", "theme", "light", "remembered", "simulated"]) expect(body, `detail.${key}`).toMatch(new RegExp(`\\b${key}\\b`));
  });

  it("documents preview() and the `mode` and `light` properties of the element", () => {
    const body = text(page(MODE_PAGE));
    expect(body).toContain("preview(");
    expect(body).toMatch(/\.mode\b/);
    expect(body).toMatch(/\.light\b/);
  });
});

/* ---- The boot snippet --------------------------------------------------------- */

/** The inline script of the first code block that reads `luz-theme`. */
function bootScript() {
  for (const block of codeBlocks(page(MODE_PAGE))) {
    for (const m of block.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) if (m[1].includes("luz-theme")) return m[1];
  }
  return null;
}

/**
 * Run a script as a <head> script would: a document with only <html>, a
 * storage, matchMedia. Returns what it wrote to data-theme (null: nothing).
 * @param {string} script
 * @param {{ stored?: string, dark?: boolean, contrast?: boolean, throws?: boolean }} [world]
 */
function boot(script, { stored, dark = false, contrast = false, throws = false } = {}) {
  const attrs = new Map();
  const attr = (prop) => `data-${prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
  const root = {
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    hasAttribute: (k) => attrs.has(k),
    removeAttribute: (k) => attrs.delete(k),
    dataset: new Proxy({}, { set: (_, p, v) => (attrs.set(attr(String(p)), String(v)), true), get: (_, p) => attrs.get(attr(String(p))) }),
  };
  const localStorage = {
    getItem: (k) => {
      if (throws) throw new Error("SecurityError");
      return k === "luz-theme" && stored !== undefined ? stored : null;
    },
    setItem: () => {},
    removeItem: () => {},
  };
  const matchMedia = (query) => {
    const q = query.replace(/\s/g, "");
    return { media: query, matches: q.includes("prefers-contrast:more") ? contrast : q.includes("prefers-color-scheme:dark") ? dark : false, addEventListener() {}, addListener() {} };
  };
  const context = { document: { documentElement: root }, localStorage, matchMedia, location: { search: "" } };
  context.window = context;
  runInNewContext(script, context);
  return attrs.get("data-theme") ?? null;
}

describe("the boot snippet for <head> on the docs page", () => {
  it("says what the snippet is for: it avoids the flash of the wrong mode on the first paint", () => {
    const html = page(MODE_PAGE);
    const at = html.search(/<script(?![^>]*\ssrc=)[^>]*>(?:(?!<\/script>)[\s\S])*luz-theme/);
    const code = at >= 0 ? at : html.indexOf("luz-theme");
    expect(code, "the snippet is on the page").toBeGreaterThanOrEqual(0);
    // The words sit near the snippet: within a screen of text either side of it
    const near = text(html.slice(Math.max(0, code - 2500), code + 2500));
    expect(near).toMatch(/\bflash(es)?\b|first paint/i);
  });

  const script = () => {
    const found = bootScript();
    expect(found, "an inline <script> in a code block of site/mode.html that reads `luz-theme`").not.toBeNull();
    return found;
  };

  it("is eight lines or fewer", () => {
    const lines = script().split("\n").filter((l) => l.trim());
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(8);
  });

  it("follows the system when nothing is stored: light, dark, and high contrast over dark", () => {
    const s = script();
    expect([null, "light"]).toContain(boot(s));
    expect(boot(s, { dark: true })).toBe("dark");
    expect(boot(s, { contrast: true })).toBe("high-contrast");
    expect(boot(s, { contrast: true, dark: true })).toBe("high-contrast");
  });

  it("applies a stored mode over the system", () => {
    const s = script();
    expect(boot(s, { stored: "dark" })).toBe("dark");
    expect(boot(s, { stored: "high-contrast" })).toBe("high-contrast");
    expect(boot(s, { stored: "light", dark: true })).toBe("light");
  });

  it("ignores a stored value that is no mode", () => {
    const s = script();
    for (const bad of ["banana", "auto", "", "Dark"]) expect([null, "light"], JSON.stringify(bad)).toContain(boot(s, { stored: bad }));
    expect(boot(s, { stored: "banana", dark: true })).toBe("dark");
  });

  it("does not throw when the storage does, and still follows the system", () => {
    const s = script();
    expect(() => boot(s, { throws: true })).not.toThrow();
    expect(boot(s, { throws: true, dark: true })).toBe("dark");
  });
});

/* ---- The two-light theme example ---------------------------------------------- */

describe("the two-light theme example on the docs page", () => {
  const example = () => {
    const found = codeBlocks(page(MODE_PAGE)).find((block) => /\[data-light=/.test(block) && /--luz-[\w-]+\s*:/.test(block));
    expect(found, "a code block with [data-light=…] rules that set --luz-* tokens").toBeDefined();
    return found;
  };

  it("has a rule for a dark phase and one for a light phase, under a data-theme of its own", () => {
    const block = example();
    const named = [...block.matchAll(/\[data-light=["']?(\w+)["']?\]/g)].map((m) => m[1]);
    expect(named.filter((p) => DARK.has(p)), "a dark phase").not.toHaveLength(0);
    expect(named.filter((p) => PHASES.includes(p) && !DARK.has(p)), "a light phase").not.toHaveLength(0);
    expect(named.filter((p) => !PHASES.includes(p)), "names that are no phase").toEqual([]);
    expect(block).toMatch(/\[data-theme=/);
  });

  it("sets only tokens that packages/core/src/themes/_template.css declares", () => {
    const declared = new Set([...readFileSync(join(repo, "packages/core/src/themes/_template.css"), "utf-8").matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]));
    const set = [...example().matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]);
    expect(set.length).toBeGreaterThan(0);
    expect(set.filter((name) => !declared.has(name)), "tokens the template does not declare").toEqual([]);
  });
});

/* ---- The pages around it -------------------------------------------------------- */

describe("the pages that point at <luz-mode>", () => {
  it("components/mode-switcher.html links to the page: the radios with an Auto state are this element", () => {
    expect(hasLink(page(`${PAGES}/components/mode-switcher.html`), ROUTE)).toBe(true);
  });

  it("tokens/modes.html has the section \"Following the system or the clock\", with a link to the page", () => {
    const html = page(`${PAGES}/tokens/modes.html`);
    const heading = /<h2\b[^>]*\bid="([\w-]+)"[^>]*>\s*Following the system or the clock\s*<\/h2>/.exec(html);
    expect(heading, 'an <h2 id="…">Following the system or the clock</h2>').not.toBeNull();
    expect(hasLink(html.slice(heading.index), ROUTE), "a link to /docs/site/mode/ after the heading").toBe(true);
  });

  it("accessibility.html states the Auto radio and the element", () => {
    const body = text(page(`${PAGES}/accessibility.html`));
    expect(body).toContain("luz-mode");
    expect(body).toMatch(/\bAuto\b/);
  });

  it("get-started/javascript.html lists the chunk and links to its page", () => {
    const html = page(`${PAGES}/get-started/javascript.html`);
    expect(text(html)).toMatch(/\bmode(\.min)?\.js\b/);
    expect(hasLink(html, ROUTE)).toBe(true);
  });
});
