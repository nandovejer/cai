/**
 * F5 step 13, the page "Working with AI" and the text around it
 * (.claude/plans/specs/f5-ai-ready.md 6, 7.1, 10 row 13, and the "Review
 * answers" of ux-designer and accessibility-engineer). RL-19 for the page: what
 * an agent is told to read and what the checker reports is held against the
 * generator and the registry of rules, so the page fails the day it stops
 * matching them. The files are read as text; the page is rendered with the
 * generator's own renderPage(); no browser, no build of docs/.
 *
 * THE CONTRACT these tests pin (the spec leaves some names open; the
 * implementer follows them):
 *
 *   apps/docs/pages/get-started/ai.html
 *     front matter   title: Working with AI, area: get-started, order: 10,
 *                    generate: ai, the description of spec 6 verbatim, and
 *                    keywords with llms.txt. Classless styles becomes order 11,
 *                    so `/docs/tokens/` keeps its Previous link.
 *     scripts/docs-site/site.js   `generate: ai` is allowed (a sixth value,
 *                    beside gallery, a-z and snippets) and renderPage() writes
 *                    the two generated tables into their sections.
 *     the h2s        ids and titles, in this order (ux-designer):
 *                      start  Give your agent LUZ
 *                      files  What an agent can read
 *                      check  Check what an agent wrote
 *                      rules  What check blocks and what it warns about
 *                      agent  The accessibility reviewer
 *                      limits What this does not do
 *     start          at most four sentences of prose, a link to #limits and one
 *                    docs-snippet: label "Prompt", copy button
 *                    aria-label="Copy the prompt", data-copy-from the id of the
 *                    code, pre.luz-code-block[data-lang=text] with
 *                    aria-label="Prompt for your agent" and exactly the text of
 *                    the ux answer (PROMPT below).
 *     files          one luz-table (in a luz-table-wrap region, with a caption
 *                    and th scope=col) with the columns File, URL, What it is,
 *                    Made by; one row for each row of aiArtifacts().
 *     check          the command (`npx @luz-ds/check`, never `npx luz-check`),
 *                    every option of USAGE, a table of the exit codes 0, 1, 2
 *                    (first column <code>0</code> ...), a text sample made of
 *                    real lines of the tool, and ONE table of the --json
 *                    fields whose caption says JSON and whose first column is
 *                    the keys buildReport()/finding() write.
 *     rules          two luz-tables, Rule / What it finds / Severity, the first
 *                    of the rules that block and the second of the ones that
 *                    warn; each rule id of messages.js once; the severity is
 *                    the word `block` or `warn` of the registry.
 *     agent          `npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md`,
 *                    the three tools of the published file, read-only, that the
 *                    `>` overwrites a file, and that it does not use assistive
 *                    technology.
 *     limits         a list: at least seven items, covering LIMITS below; it
 *                    links /docs/accessibility/#h-a11y-not-tested and does not
 *                    repeat that statement.
 *     No script and no `on*` attribute in the source; no sentence says a page
 *     is accessible, passes or conforms unless it negates it.
 *
 *   scripts/docs-site/ai.js
 *     aiArtifacts(site, { siteUrl = "" } = {}) -> [{ file, url, what, madeBy }]
 *       in this order: `llms.txt`, `llms-full.txt`, `examples/<area>/<slug>.html`
 *       (the url of the Button example, a real one), then
 *       `manifests/<pkg>/<file>` for each route of manifestAssets(root), in its
 *       order. `url` is the route, or siteUrl + route.slice(1); `what` is one
 *       line of plain text (at most 200 characters); `madeBy` names the script
 *       that writes the file, a path under scripts/ that exists. The page shows
 *       the same rows with siteUrl = SITE_URL, in dev as well: the URL is the
 *       one you paste into an agent.
 *
 *   packages/check/src/messages.js
 *     every `docsUrl()` is a route of the generated site and its fragment an
 *     id on that page (the note of step 8: `/docs/get-started/ai/#rules`).
 *
 * The text around it (spec 7.1, 10 row 13): structure.html has a row for
 * check; contrast.html says in one sentence that luz-check runs the same check;
 * VERSIONING.md names the manifests, luz-check and the public-properties
 * rule (D14-A: declared at root scope); README.md lists @luz-ds/check and has
 * "For AI agents"; AGENTS.md names @luz-ds/check, TOOLS and the AI files;
 * packages/check/README.md says the rules exist; accessibility.html has the
 * bullet of accessibility-engineer Q3 and "Last reviewed on 17 October 2026"
 * (this file is the pin of that date); Node 20 (D14-A) replaces Node 18 in the
 * luz-tokens text.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeEntities, readHtml, tags } from "../scripts/docs-site/html.js";
import { renderPage, scanSite } from "../scripts/docs-site/site.js";
import { TOOLS } from "../scripts/luz-packages.js";
import { SITE_URL } from "../vite.config.js";
import { USAGE } from "../packages/check/src/cli.js";
import { MESSAGES, docsUrl } from "../packages/check/src/messages.js";
import { buildReport, finding } from "../packages/check/src/report.js";
import { wordsOf } from "./helpers/check-run.js";
import { columnOf, linksOf, preOf, readPage, repo, sectionsOf, sentencesOf, tablesOf, textOf } from "./helpers/page-facts.js";

/* ---- The constants the page is held against ----------------------------------- */

const ROUTE = "/docs/get-started/ai/";
const PAGE_FILE = "apps/docs/pages/get-started/ai.html";
const IDS = ["start", "files", "check", "rules", "agent", "limits"];
const TITLES = {
  start: "Give your agent LUZ",
  files: "What an agent can read",
  check: "Check what an agent wrote",
  rules: "What check blocks and what it warns about",
  agent: "The accessibility reviewer",
  limits: "What this does not do",
};
const DESCRIPTION = "What an AI coding agent can read, how to check what it wrote, and the accessibility reviewer you can give it.";
const PROMPT =
  `Use LUZ for the markup. Read ${SITE_URL}llms.txt first and use only the classes in each package's classes.json. ` +
  "After you write HTML or CSS, run `npx @luz-ds/check` on the files and fix every finding before you answer.";
const AGENT_COMMAND = "npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md";
const NOT_TESTED = "/docs/accessibility/#h-a11y-not-tested";
const STATEMENT_BULLET =
  "The accessibility reviewer that @luz-ds/check prints, and luz-check itself. They read source files and give advice; " +
  "they do not open a page, measure on screen or use assistive technology. A run with no findings does not mean a page is accessible.";
const LAST_REVIEWED = "Last reviewed on 17 October 2026.";

const squash = (s) => s.replace(/\s+/g, " ").trim();
const read = (path) => readFileSync(join(repo, path), "utf-8");

/* ---- The page, rendered by the generator ---------------------------------------- */

let scanned = null;
const siteOf = () => (scanned ??= scanSite(join(repo, "apps/docs"), repo));

/** The page of the site, or a failure that says the page is not there. */
function pageOf(route = ROUTE) {
  if (!existsSync(join(repo, PAGE_FILE)) && route === ROUTE) throw new Error(`${PAGE_FILE} does not exist: the page "Working with AI" is not written yet`);
  const page = siteOf().byRoute.get(route);
  if (!page) throw new Error(`${route} is not a page of the site`);
  return page;
}

const renderedCache = new Map();
/** The page as the generator writes it, from its first `<main>` to the end of its content (Previous / Next left out). */
function contentOf(route = ROUTE) {
  if (!renderedCache.has(route)) {
    const html = renderPage(pageOf(route), siteOf());
    const start = html.indexOf("<main");
    if (start === -1) throw new Error(`${route}: the rendered page has no <main>`);
    const end = html.search(/<nav class="docs-end"|<\/main>/);
    renderedCache.set(route, html.slice(html.indexOf(">", start) + 1, end));
  }
  return renderedCache.get(route);
}

const sections = () => sectionsOf(contentOf());

/** How many scrollable labelled regions (focusable), luz-tables, captions and column headers a piece of markup has. */
function tableParts(html) {
  const found = [...tags(html, ROUTE)].filter((t) => t.type === "start");
  const has = (t, cls) => (t.attrs.get("class") ?? "").split(/\s+/).includes(cls);
  return {
    wraps: found.filter((t) => t.name === "div" && has(t, "luz-table-wrap") && t.attrs.get("role") === "region" && t.attrs.get("tabindex") === "0" && (t.attrs.get("aria-label") ?? "") !== "").length,
    tables: found.filter((t) => t.name === "table" && has(t, "luz-table")).length,
    captions: found.filter((t) => t.name === "caption").length,
    columnHeaders: found.filter((t) => t.name === "th" && t.attrs.get("scope") === "col").length,
  };
}
function section(id) {
  const s = sections().get(id);
  if (!s) throw new Error(`${ROUTE} has no <h2 id="${id}"> (its h2 ids: ${[...sections().keys()].join(", ") || "none"})`);
  return s.html;
}

/* ---- The registry the page is held against -------------------------------------- */

const RULE_IDS = [...new Set(Object.keys(MESSAGES).map((key) => key.split(":")[0]))].sort();
const severityOf = (id) => MESSAGES[id].severity;
const BLOCKS = RULE_IDS.filter((id) => severityOf(id) === "block");
const WARNS = RULE_IDS.filter((id) => severityOf(id) === "warn");

/** The keys the --json report writes: the top level, `summary`, and one finding (with its optional `details`). */
function reportKeys() {
  const report = buildReport({
    version: "0.0.0",
    manifests: [{ package: "@luz-ds/core", version: "0.0.0", source: "bundled" }],
    skipped: [{ file: "a.html", reason: "symlink" }],
  });
  const sample = finding("theme/contrast", { file: "theme.css", vars: MESSAGES["theme/contrast"].sample, details: {} });
  return {
    top: Object.keys(report),
    summary: Object.keys(report.summary),
    config: Object.keys(report.config),
    manifest: Object.keys(report.manifests[0]),
    skipped: Object.keys(report.skipped[0]),
    finding: Object.keys(sample),
  };
}

const FLAGS = [...new Set(USAGE.match(/--[a-z]+/g))];

/* ---- Front matter and place in the reading order ------------------------------- */

describe("the page: front matter and its place", () => {
  it("is Working with AI, in Get started, generated by `ai`, with the spec's description", () => {
    const { meta } = pageOf();
    expect(meta.title).toBe("Working with AI");
    expect(meta.area).toBe("get-started");
    expect(meta.generate).toBe("ai");
    expect(meta.description).toBe(DESCRIPTION);
    expect(meta.keywords).toContain("llms.txt");
  });

  it("is order 10, and Classless styles is order 11", () => {
    expect(pageOf().meta.order).toBe("10");
    expect(pageOf("/docs/get-started/classless/").meta.order).toBe("11");
  });

  it("comes after Print styles and before Classless styles in the reading order", () => {
    const order = siteOf().pages.filter((p) => p.meta.area === "get-started").sort((a, b) => Number(a.meta.order) - Number(b.meta.order));
    const routes = order.map((p) => p.route);
    expect(routes.indexOf(ROUTE)).toBe(routes.indexOf("/docs/get-started/print/") + 1);
    expect(routes.indexOf("/docs/get-started/classless/")).toBe(routes.indexOf(ROUTE) + 1);
  });

  it("has no script and no event handler in its source: it works as it is without JavaScript", () => {
    pageOf();
    const source = read(PAGE_FILE);
    expect(source).not.toMatch(/<script\b/i);
    expect(source).not.toMatch(/\son[a-z]+\s*=/i);
  });
});

/* ---- The six sections ----------------------------------------------------------- */

describe("the page: six h2, in the order and with the titles of the ux answer", () => {
  it("has the h2 ids start, files, check, rules, agent and limits, in that order", () => {
    expect([...sections().keys()]).toEqual(IDS);
  });

  it("has these titles", () => {
    for (const id of IDS) expect(sections().get(id).title, id).toBe(TITLES[id]);
  });

  it("has each of them as an id of the rendered page, once", () => {
    const html = renderPage(pageOf(), siteOf());
    const { ids } = readHtml(html, ROUTE);
    for (const id of IDS) expect(ids.has(id), `#${id}`).toBe(true);
  });
});

describe("start: Give your agent LUZ", () => {
  const snippetOf = () => {
    const html = section("start");
    const found = [...tags(html, ROUTE)].filter((t) => t.type === "start");
    return { html, found };
  };

  it("says what it is in a few sentences and links the limits", () => {
    const { html } = snippetOf();
    const prose = textOf(html.replace(/<div class="docs-snippet">[\s\S]*?<\/pre>\s*<\/div>/, " ").replace(/<h2\b[\s\S]*?<\/h2>/, " "));
    const sentences = sentencesOf(prose);
    expect(sentences.length, prose).toBeGreaterThanOrEqual(2);
    expect(sentences.length, prose).toBeLessThanOrEqual(4);
    expect(linksOf(html).map((l) => l.href)).toContain("#limits");
  });

  it("is a docs-snippet labelled Prompt, with a button named Copy the prompt", () => {
    const { html, found } = snippetOf();
    expect(found.some((t) => t.name === "div" && /(^|\s)docs-snippet(\s|$)/.test(t.attrs.get("class") ?? "")), "a div.docs-snippet").toBe(true);
    expect(textOf(/<span class="docs-snippet__lang">([\s\S]*?)<\/span>/.exec(html)?.[1] ?? "")).toBe("Prompt");
    const button = found.find((t) => t.name === "button");
    expect(button, "a copy button").toBeTruthy();
    expect(button.attrs.get("aria-label")).toBe("Copy the prompt");
    expect(button.attrs.get("class") ?? "").toContain("luz-copy-btn");
    expect(button.attrs.get("type")).toBe("button");
  });

  it("holds the prompt in a pre.luz-code-block of data-lang text, a labelled region, that the button copies", () => {
    const { found } = snippetOf();
    const pre = found.find((t) => t.name === "pre");
    expect(pre, "a pre").toBeTruthy();
    expect(pre.attrs.get("class") ?? "").toContain("luz-code-block");
    expect(pre.attrs.get("data-lang")).toBe("text");
    expect(pre.attrs.get("aria-label")).toBe("Prompt for your agent");
    expect(pre.attrs.get("role")).toBe("region");
    expect(pre.attrs.get("tabindex")).toBe("0");
    const code = found.find((t) => t.name === "code" && t.attrs.has("id"));
    expect(code, "a <code id>").toBeTruthy();
    expect(found.find((t) => t.name === "button").attrs.get("data-copy-from")).toBe(code.attrs.get("id"));
  });

  it("is the prompt of the ux answer, runnable as written: the public llms.txt URL and the npx command", () => {
    const [text] = preOf(section("start"));
    expect(squash(text)).toBe(PROMPT);
  });

  it("does not tell the agent to go on until the check passes", () => {
    const [text] = preOf(section("start"));
    expect(text).not.toMatch(/until|passes|pass\b/i);
  });
});

/* ---- files: the generated table ------------------------------------------------- */

describe("files: What an agent can read", () => {
  const tableOf = () => {
    const table = tablesOf(section("files")).find((t) => t.rows.length > 0);
    if (!table) throw new Error("#files has no table with rows");
    return table;
  };

  it("is a luz-table in a scrollable labelled region, with a caption and column headers", () => {
    expect(tableParts(section("files"))).toEqual({ wraps: 1, tables: 1, captions: 1, columnHeaders: 4 });
  });

  it("has the columns File, URL, What it is and Made by", () => {
    const { headers } = tableOf();
    expect(headers.length).toBe(4);
    expect(headers[0]).toMatch(/^file$/i);
    expect(headers[1]).toMatch(/^url$/i);
    expect(headers[2]).toMatch(/what/i);
    expect(headers[3]).toMatch(/made|written|generated/i);
  });

  it("has one row for each row of aiArtifacts(), in its order, with the public URL", async () => {
    const { aiArtifacts } = await import("../scripts/docs-site/ai.js");
    const rows = aiArtifacts(siteOf(), { siteUrl: SITE_URL });
    const table = tableOf();
    expect(table.rows.map((r) => r.cells.map((c) => c.text))).toEqual(rows.map((r) => [r.file, r.url, r.what, r.madeBy]));
  });

  it("writes the public URL of every file: never localhost, never relative", () => {
    for (const row of tableOf().rows) expect(row.cells[1].text, row.cells[0].text).toMatch(new RegExp(`^${SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  it("names a file once", () => {
    const names = tableOf().rows.map((r) => r.cells[0].text);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("aiArtifacts(site): the rows of that table", () => {
  const load = async () => {
    const ai = await import("../scripts/docs-site/ai.js");
    if (typeof ai.aiArtifacts !== "function") throw new Error("scripts/docs-site/ai.js does not export aiArtifacts");
    return ai;
  };

  it("is an array of { file, url, what, madeBy }, each a non-empty line of plain text", async () => {
    const { aiArtifacts } = await load();
    const rows = aiArtifacts(siteOf());
    expect(rows.length).toBeGreaterThan(4);
    for (const row of rows) {
      expect(Object.keys(row).sort(), row.file).toEqual(["file", "madeBy", "url", "what"]);
      for (const key of ["file", "url", "what", "madeBy"]) {
        expect(typeof row[key], `${row.file}.${key}`).toBe("string");
        expect(row[key].trim(), `${row.file}.${key}`).not.toBe("");
        expect(row[key], `${row.file}.${key}`).not.toMatch(/[\n{}]/);
      }
      // `file` of the examples is a pattern, `examples/<area>/<slug>.html`; nothing else has a tag in it
      for (const key of ["url", "what", "madeBy"]) expect(row[key], `${row.file}.${key}`).not.toMatch(/[<>]/);
      expect(row.what.length, row.file).toBeLessThanOrEqual(200);
    }
  });

  it("lists llms.txt, llms-full.txt, one example and the manifests of every package, in this order", async () => {
    const { aiArtifacts, manifestAssets } = await load();
    const rows = aiArtifacts(siteOf());
    const head = rows.slice(0, 3).map((r) => r.file);
    expect(head).toEqual(["llms.txt", "llms-full.txt", "examples/<area>/<slug>.html"]);
    const manifests = manifestAssets(repo).map((a) => a.route.slice(1));
    expect(rows.slice(3).map((r) => r.file)).toEqual(manifests);
  });

  it("gives the route with no site URL, and the absolute URL with one", async () => {
    const { aiArtifacts, AI_ROUTES } = await load();
    const dev = aiArtifacts(siteOf());
    const live = aiArtifacts(siteOf(), { siteUrl: SITE_URL });
    expect(dev[0].url).toBe(AI_ROUTES.llms);
    expect(dev[1].url).toBe(AI_ROUTES.llmsFull);
    expect(live[0].url).toBe(`${SITE_URL}llms.txt`);
    expect(live[1].url).toBe(`${SITE_URL}llms-full.txt`);
    expect(live.map((r) => r.url)).toEqual(dev.map((r) => `${SITE_URL}${r.url.slice(1)}`));
  });

  it("points the example row at a real example: the page of Button", async () => {
    const { aiArtifacts, exampleDocuments } = await load();
    const example = aiArtifacts(siteOf())[2];
    expect(example.url).toBe("/examples/components/button.html");
    const documents = exampleDocuments(siteOf(), { csp: "default-src 'self'", versions: { core: "0.0.0" } });
    expect(documents.map((d) => d.route)).toContain(example.url);
  });

  it("points every manifest row at the route manifestAssets() copies", async () => {
    const { aiArtifacts, manifestAssets } = await load();
    const routes = new Set(manifestAssets(repo).map((a) => a.route));
    for (const row of aiArtifacts(siteOf()).filter((r) => r.file.startsWith("manifests/"))) expect(routes.has(row.url), row.url).toBe(true);
  });

  it("names, for each file, a script that exists and writes it", async () => {
    const { aiArtifacts } = await load();
    for (const row of aiArtifacts(siteOf())) {
      const path = /scripts\/[\w./-]+\.js/.exec(row.madeBy)?.[0];
      expect(path, `${row.file}: madeBy names a script under scripts/ ("${row.madeBy}")`).toBeTruthy();
      expect(existsSync(join(repo, path)), `${row.file}: ${path} exists`).toBe(true);
    }
  });

  it("is the same twice and leaves the site as it found it", async () => {
    const { aiArtifacts } = await load();
    const before = JSON.stringify([...siteOf().byRoute.keys()]);
    expect(aiArtifacts(siteOf(), { siteUrl: SITE_URL })).toEqual(aiArtifacts(siteOf(), { siteUrl: SITE_URL }));
    expect(JSON.stringify([...siteOf().byRoute.keys()])).toBe(before);
  });

  it("names nothing private", async () => {
    const { aiArtifacts } = await load();
    expect(JSON.stringify(aiArtifacts(siteOf(), { siteUrl: SITE_URL }))).not.toMatch(/\.claude|\/home\/|OWNER|localhost|[\w.-]+@[\w-]+\.[a-z]{2,}/);
  });
});

/* ---- check: the command, the exit codes, a real sample, the JSON fields ---------- */

describe("check: Check what an agent wrote", () => {
  const codeText = () => `${textOf(section("check"))}\n${preOf(section("check")).join("\n")}`;

  it("shows the command as npx @luz-ds/check, with the scope", () => {
    expect(preOf(section("check")).join("\n")).toContain("npx @luz-ds/check");
  });

  it("names every option of luz-check --help, and no option it does not have", () => {
    const text = codeText();
    for (const flag of FLAGS) expect(text, flag).toContain(flag);
    // The whole page: every `--word` that is not a LUZ token is an option of the tool
    const page = `${textOf(contentOf())}\n${preOf(contentOf()).join("\n")}`;
    const used = [...new Set(page.match(/(?<![\w-])--[a-z][a-z-]*/g) ?? [])].filter((flag) => !flag.startsWith("--luz-"));
    const known = new Set(FLAGS);
    for (const flag of used) expect(known.has(flag), `${flag} is not an option of luz-check`).toBe(true);
  });

  it("has a table of the three exit codes, 0, 1 and 2, each with its meaning", () => {
    const table = tablesOf(section("check")).find((t) => t.rows.length === 3 && t.rows.every((r) => /^[012]$/.test(r.cells[0].codes[0] ?? r.cells[0].text)));
    expect(table, "a table whose first column is 0, 1 and 2").toBeTruthy();
    const rows = Object.fromEntries(table.rows.map((r) => [r.cells[0].codes[0] ?? r.cells[0].text, r.cells.slice(1).map((c) => c.text).join(" ")]));
    expect(Object.keys(rows)).toEqual(["0", "1", "2"]);
    expect(rows[0]).toMatch(/nothing (blocks|is blocking)|no (blocking )?finding/i);
    expect(rows[1]).toMatch(/block/i);
    expect(rows[1]).toMatch(/--strict|warning/i);
    expect(rows[2]).toMatch(/usage|used wrongly|cannot be read|nothing to read|no file/i);
  });

  it("shows a text sample whose findings are lines the tool really prints", () => {
    const sample = preOf(section("check")).find((text) => /^[✗!] /m.test(text) && /blocking and/.test(text));
    expect(sample, "a code block with findings and the summary line").toBeTruthy();
    const lines = sample.split("\n").filter((l) => l.trim() !== "");
    const findings = lines.filter((l) => /^[✗!] \S/.test(l) && !/blocking and/.test(l));
    expect(findings.length, "at least one finding line").toBeGreaterThan(0);
    for (const line of findings) {
      const match = /^([✗!]) (\S+?)(?::\d+(?::\d+)?)? ([a-z0-9]+\/[a-z0-9-]+) {2}(.+)$/.exec(line);
      expect(match, `"${line}" is mark, path:line:column, rule id, two spaces, message`).toBeTruthy();
      const [, mark, , rule, text] = match;
      expect(RULE_IDS, line).toContain(rule);
      expect(mark === "✗" ? "block" : "warn", line).toBe(severityOf(rule));
      expect(wordsOf(rule, text), `"${text}" is not the rendering of a message of ${rule}`).toBe(true);
    }
    // what follows a finding: the lines of its overrides, as the report writes them
    for (const line of lines.filter((l) => /^ {2,}\S/.test(l))) expect(line, line).toMatch(/^ {4}--luz-[a-z0-9-]+: #[0-9a-f]{6} is set in \S+:\d+$/);
    const summary = lines.filter((l) => /blocking and/.test(l));
    expect(summary.length).toBe(1);
    expect(summary[0]).toMatch(/^[✓✗] \d+ blocking and \d+ warnings? in \d+ files?/);
    expect(sample).not.toMatch(/accessible|passes|conforms/i);
  });

  it("has one table of the --json fields, equal to the keys the report writes", () => {
    const table = tablesOf(section("check")).find((t) => /json/i.test(t.caption));
    expect(table, "a table whose caption says JSON").toBeTruthy();
    const keys = reportKeys();
    const wanted = new Set(Object.values(keys).flat());
    // `summary.blocking` and `findings[].rule` are written by their last part
    const written = table.rows.map((r) => (r.cells[0].codes[0] ?? r.cells[0].text).replace(/\[\]/g, "").split(".").at(-1));
    expect(new Set(written)).toEqual(wanted);
    for (const row of table.rows) expect(row.cells.length, row.cells[0].text).toBeGreaterThanOrEqual(2);
  });

});

/* ---- rules: the generated tables ------------------------------------------------- */

describe("rules: What check blocks and what it warns about", () => {
  const tables = () => tablesOf(section("rules")).filter((t) => t.rows.length > 0);
  const idsOf = (table) => table.rows.map((r) => r.cells[0].codes[0] ?? r.cells[0].text);

  it("has the registry's ids, so the registry has rules to list", () => {
    expect(BLOCKS.length).toBeGreaterThan(5);
    expect(WARNS.length).toBeGreaterThan(10);
    for (const id of RULE_IDS) expect(Object.hasOwn(MESSAGES, id), `${id} has a base message (its severity)`).toBe(true);
    for (const id of RULE_IDS) expect(docsUrl(id), id).toMatch(/^https:\/\//);
  });

  it("is two luz-tables in labelled regions with a caption, Rule / What it finds / Severity", () => {
    expect(tableParts(section("rules"))).toEqual({ wraps: 2, tables: 2, captions: 2, columnHeaders: 6 });
    for (const table of tables()) {
      expect(table.caption, "a caption").not.toBe("");
      expect(table.headers.length).toBe(3);
      expect(table.headers[0]).toMatch(/rule/i);
      expect(table.headers[1]).toMatch(/finds|fires|when|what/i);
      expect(table.headers[2]).toMatch(/severity/i);
    }
  });

  it("lists the rules that block first, and the rules that warn second, each id once, sorted", () => {
    const [blocks, warns] = tables();
    expect(idsOf(blocks)).toEqual(BLOCKS);
    expect(idsOf(warns)).toEqual(WARNS);
    const all = [...idsOf(blocks), ...idsOf(warns)];
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(RULE_IDS);
  });

  it("writes each severity as the registry does, `block` or `warn`", () => {
    for (const table of tables()) {
      for (const row of table.rows) {
        const id = row.cells[0].codes[0] ?? row.cells[0].text;
        expect(row.cells.at(-1).text.toLowerCase(), id).toBe(severityOf(id));
      }
    }
  });

  it("says in one line what each rule finds: a sentence, unique, with no placeholder left", () => {
    const seen = new Set();
    for (const table of tables()) {
      for (const row of table.rows) {
        const id = row.cells[0].codes[0] ?? row.cells[0].text;
        const finds = row.cells[1].text;
        expect(finds.length, id).toBeGreaterThanOrEqual(20);
        expect(finds.length, id).toBeLessThanOrEqual(240);
        expect(finds, id).not.toMatch(/\{[A-Za-z]+\}/);
        expect(seen.has(finds), `${id}: the same text as another rule`).toBe(false);
        seen.add(finds);
      }
    }
  });

  it("names, in <code>, only rule ids of the registry anywhere on the page", () => {
    const named = [...contentOf().matchAll(/<code\b[^>]*>([^<]*)<\/code>/g)].map((m) => decodeEntities(m[1]).trim()).filter((t) => /^[a-z0-9]+\/[a-z0-9-]+$/.test(t));
    expect(named.length).toBeGreaterThan(0);
    for (const id of named) expect(RULE_IDS, `${id} is not a rule of messages.js`).toContain(id);
  });

  it("is where the findings point: #rules is an id of this page, for every rule whose docs is the page", () => {
    const pointing = RULE_IDS.filter((id) => docsUrl(id) === `${SITE_URL}docs/get-started/ai/#rules`);
    expect(pointing.length).toBeGreaterThan(0);
    expect(sections().has("rules")).toBe(true);
  });
});

/* ---- agent ----------------------------------------------------------------------- */

describe("agent: The accessibility reviewer", () => {
  const published = () => {
    const file = join(repo, "tests/fixtures/check/agent.md");
    if (!existsSync(file)) throw new Error("tests/fixtures/check/agent.md (the snapshot of the published agent) does not exist");
    const front = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(file, "utf-8"))[1];
    return Object.fromEntries(front.split("\n").map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1).trim()]));
  };

  it("gives the command that copies it, exactly", () => {
    expect(preOf(section("agent")).map(squash)).toContain(AGENT_COMMAND);
  });

  it("names each tool the published file has, and says it is read-only", () => {
    const text = textOf(section("agent"));
    for (const tool of published().tools.split(",").map((t) => t.trim())) expect(text, tool).toContain(tool);
    expect(text).toMatch(/read-only|writes nothing|does not write/i);
  });

  it("says that the `>` overwrites a file that is there", () => {
    expect(textOf(section("agent"))).toMatch(/overwrit/i);
  });

  it("says it gives advice from reading source and does not use assistive technology", () => {
    const text = textOf(section("agent"));
    expect(text).toMatch(/assistive technology/i);
    expect(text).toMatch(/advice|suggestion|advis/i);
  });
});

/* ---- limits ---------------------------------------------------------------------- */

describe("limits: What this does not do", () => {
  const items = () => [...section("limits").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => ({ html: m[1], text: textOf(m[1]) }));

  /** What each limit says, as tests of the text of one list item. */
  const LIMITS = {
    "it does not run a browser": (t) => /\bbrowser\b/i.test(t) && /\b(not|no|never)\b/i.test(t),
    "contrast is measured for your tokens only": (t) => /contrast/i.test(t) && /\btokens?\b/i.test(t) && /\b(only|not)\b/i.test(t),
    "a class built at run time is not seen": (t) => /\bclass(es)?\b/i.test(t) && /(run ?time|dynamic|concatenat|assembled|built (in|at|by))/i.test(t) && /\b(not|never)\b/i.test(t),
    "it does not replace testing with a screen reader": (t) => /screen reader|assistive technolog/i.test(t) && /\b(not|no)\b/i.test(t) && /(replace|instead of|stand in for|testing|test)/i.test(t),
    "it does not call a network": (t) => /network|offline|internet/i.test(t) && /\b(not|no|never)\b/i.test(t),
    "discovery by llms.txt is by link, because the site is not at a host root": (t) => /llms\.txt/i.test(t) && /\blink\b/i.test(t) && /\b(host|domain|root)\b/i.test(t),
    "exit 0 is not an accessibility result": (t) => /\b(exit(?: code)? 0|zero)\b/i.test(t) && /accessib/i.test(t) && /\b(not|no)\b/i.test(t),
    "the messages are in English": (t) => /\bEnglish\b/.test(t) && /message/i.test(t),
  };

  it("is a list of at least seven items", () => {
    expect(items().length).toBeGreaterThanOrEqual(7);
  });

  for (const [name, test] of Object.entries(LIMITS)) {
    it(`says that ${name}`, () => {
      expect(items().some((i) => test(i.text)), `no list item of #limits says it: ${items().map((i) => i.text.slice(0, 50)).join(" | ")}`).toBe(true);
    });
  }

  it("says that names, labels, alt text, headings and language are not checked, in one sentence", () => {
    const sentences = sentencesOf(textOf(contentOf()));
    const hit = sentences.find((s) => /names?\W+labels?\W+alt text\W+headings?\W+(and\W+)?(the\W+)?language/i.test(s));
    expect(hit, "a sentence that lists names, labels, alt text, headings and language").toBeTruthy();
    expect(hit).toMatch(/\b(not|no|never|nothing)\b/i);
  });

  it("links the accessibility statement's list of what has not been tested, instead of repeating it", () => {
    expect(linksOf(section("limits")).map((l) => l.href)).toContain(NOT_TESTED);
    const page = readPage("accessibility.html");
    expect(page.body).toContain('id="h-a11y-not-tested"');
    const text = textOf(contentOf());
    for (const repeated of ["NVDA", "JAWS", "VoiceOver", "measure on screen", "Research with disabled people"]) expect(text, repeated).not.toContain(repeated);
  });
});

/* ---- Wording of the whole page ---------------------------------------------------- */

describe("the page: wording", () => {
  const everything = () => `${textOf(contentOf())}\n${preOf(contentOf()).join("\n")}`;

  it("says npx @luz-ds/check, never npx luz-check, and names luz-check only as the command", () => {
    expect(everything()).toContain("npx @luz-ds/check");
    expect(everything()).not.toMatch(/npx\s+luz-check/);
  });

  it("claims no conformance: accessible, passes and conforms only in a sentence that negates them", () => {
    const sentences = sentencesOf(textOf(contentOf()));
    for (const sentence of sentences) {
      if (!/\b(accessible|passes|passed|conforms?|conformant|compliant|complies|complying)\b/i.test(sentence)) continue;
      expect(sentence, `claims conformance: "${sentence}"`).toMatch(/\b(not|no|never|cannot|can't|without|neither|nor|n't)\b/i);
    }
  });

  it("links only to routes of the site, to files the build emits, or to other hosts", async () => {
    const { AI_ROUTES, manifestAssets, exampleDocuments } = await import("../scripts/docs-site/ai.js");
    const emitted = new Set([
      AI_ROUTES.llms,
      AI_ROUTES.llmsFull,
      ...manifestAssets(repo).map((a) => a.route),
      ...exampleDocuments(siteOf(), { csp: "default-src 'self'", versions: { core: "0.0.0" } }).map((d) => d.route),
    ]);
    const urls = new Set();
    for (const link of linksOf(contentOf())) urls.add(link.href);
    for (const text of [textOf(contentOf()), ...preOf(contentOf())]) for (const m of text.matchAll(/https?:\/\/[^\s)'"`<>]+/g)) urls.add(m[0].replace(/[.,;]+$/, ""));
    let seen = 0;
    for (const raw of urls) {
      let path;
      if (raw.startsWith(SITE_URL)) path = `/${raw.slice(SITE_URL.length)}`;
      else if (raw.startsWith("/") && !raw.startsWith("//")) path = raw;
      else continue;
      seen += 1;
      const [route, hash = ""] = path.split("#");
      const ok = emitted.has(route) || siteOf().byRoute.has(route);
      expect(ok, `${raw} is neither a route of the site nor a file the build emits`).toBe(true);
      if (hash && siteOf().byRoute.has(route)) {
        const ids = readHtml(renderPage(siteOf().byRoute.get(route), siteOf()), route).ids;
        expect(ids.has(decodeURIComponent(hash)), `${raw}: #${hash} is not an id on ${route}`).toBe(true);
      }
    }
    expect(seen, "the page links its own files").toBeGreaterThan(3);
  });
});

/* ---- Every docs URL of the checker ------------------------------------------------ */

describe("packages/check/src/messages.js: docsUrl", () => {
  it("is a route of the generated site and a fragment that is an id on it, for every rule", () => {
    const seen = new Set();
    for (const id of RULE_IDS) {
      const url = docsUrl(id);
      expect(url.startsWith(SITE_URL), `${id}: ${url}`).toBe(true);
      const [route, hash = ""] = `/${url.slice(SITE_URL.length)}`.split("#");
      const page = siteOf().byRoute.get(route);
      expect(page, `${id}: ${route} is not a page of the site`).toBeTruthy();
      if (hash === "") continue;
      const key = `${route}#${hash}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ids = readHtml(renderPage(page, siteOf()), route).ids;
      expect(ids.has(hash), `${id}: #${hash} is not an id on ${route}`).toBe(true);
    }
  });
});

/* ---- The text around the page ----------------------------------------------------- */

describe("get-started/structure.html: a row for check", () => {
  it("lists @luz-ds/check as a tool in the table of what each package needs, with a link to the page", () => {
    const page = readPage("get-started/structure.html");
    const needs = sectionsOf(page.body).get("needs-title") ?? { html: page.body };
    const [table] = tablesOf(needs.html);
    expect(table, "the table of what each package needs").toBeTruthy();
    const col = columnOf(table, /^package$/i);
    expect(col, "a Package column").toBeGreaterThanOrEqual(0);
    const row = table.rows.find((r) => r.cells[col].text.toLowerCase() === "check");
    expect(row, "a row whose package is check").toBeTruthy();
    const text = row.cells.map((c) => c.text).join(" ");
    expect(text).toMatch(/\btools?\b/i);
    expect(row.cells.flatMap((c) => c.codes).some((c) => /luz-check|@luz-ds\/check/.test(c))).toBe(true);
    expect(row.cells.flatMap((c) => c.links).map((l) => l.href)).toContain(ROUTE);
  });

  it("says that check is a tool with no CSS, outside the chain of layers", () => {
    const text = textOf(readPage("get-started/structure.html").body);
    expect(text).toContain("@luz-ds/check");
    expect(text).toMatch(/\b(no CSS|no layer|not a layer|dev tool|a tool)\b/i);
  });
});

describe("tokens/contrast.html: luz-check runs the same check", () => {
  const page = readPage("tokens/contrast.html");

  it("says in one sentence that luz-check runs the same check, with the HTML rules", () => {
    const sentences = sentencesOf(textOf(page.body));
    const hit = sentences.filter((s) => /luz-check/.test(s) && /\bsame\b/i.test(s));
    expect(hit.length, "a sentence with luz-check and the same check").toBeGreaterThan(0);
    expect(hit.some((s) => /rules|HTML|markup/i.test(s)), hit.join(" | ")).toBe(true);
  });

  it("says Node 20, which is what @luz-ds/check requires (D14-A), not Node 18", () => {
    const text = textOf(page.body);
    expect(text).toMatch(/Node 20/);
    expect(text).not.toMatch(/Node 18/);
  });
});

describe("packages/tokens/README.md: the Node of luz-tokens", () => {
  it("says Node 20 or later, as the root and @luz-ds/check do (D14-A)", () => {
    const text = read("packages/tokens/README.md");
    expect(text).toMatch(/Node 20 or later/);
    expect(text).not.toMatch(/Node 18/);
  });
});

describe("VERSIONING.md: what is public", () => {
  const block = () => read("VERSIONING.md").split(/^## What is public API\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  const rows = () => block().split("\n").filter((l) => /^\|\s*\*\*/.test(l));
  const rowOf = (name) => rows().find((l) => l.replace(/^\|\s*/, "").startsWith(`**${name}**`));

  it("says a property is public when it is declared at root scope, in any package", () => {
    const tokens = rowOf("Tokens");
    expect(tokens, "a Tokens row").toBeTruthy();
    const [, , pub] = tokens.split("|").map((c) => c.trim());
    expect(pub).toMatch(/\broot\b/i);
    expect(pub).toMatch(/declared/i);
    expect(pub).not.toContain("custom property in `dist/tokens.css`");
  });

  it("keeps component custom properties out of it", () => {
    const [, , , notPublic] = rowOf("Tokens").split("|").map((c) => c.trim());
    expect(notPublic).toMatch(/--luz-seek/);
  });

  it("names the manifests, classes.json and custom-elements.json, and their schema", () => {
    const row = rows().find((l) => l.includes("classes.json") && l.includes("custom-elements.json"));
    expect(row, "a row that names both manifests").toBeTruthy();
    expect(row).toMatch(/schema/i);
  });

  it("names luz-check: its arguments, its exit codes and its --json shape", () => {
    const row = rows().find((l) => l.includes("luz-check"));
    expect(row, "a row that names luz-check").toBeTruthy();
    expect(row).toMatch(/exit codes?/i);
    expect(row).toMatch(/--json/);
    expect(row).toMatch(/arguments?/i);
  });

  it("keeps the first column of the table the four surfaces the how-to-read page names, and more", () => {
    const names = rows().map((l) => /^\|\s*\*\*([^*]+)\*\*/.exec(l)[1]);
    for (const surface of ["Tokens", "Classes", "Attributes", "Packages"]) expect(names).toContain(surface);
  });
});

describe("README.md: for people and for agents", () => {
  const readme = () => read("README.md");

  it("lists @luz-ds/check among the packages, as a tool", () => {
    const line = readme().split("\n").find((l) => /^- \[`@luz-ds\/check`\]\(\.\/packages\/check\)/.test(l));
    expect(line, "a list item for @luz-ds/check linking ./packages/check").toBeTruthy();
    expect(line).toMatch(/\btool\b|command|check/i);
  });

  it('has a "For AI agents" heading that links Working with AI and names the files an agent reads', () => {
    const [, after] = readme().split(/^#{2,3} For AI agents\s*$/m);
    expect(after, 'a "For AI agents" heading').toBeTruthy();
    const body = after.split(/^#{1,3} /m)[0];
    expect(body).toContain(`${SITE_URL}docs/get-started/ai/`);
    expect(body).toContain("llms.txt");
    expect(body).toContain("npx @luz-ds/check");
  });
});

describe("AGENTS.md: the tool and the AI files", () => {
  const agents = () => read("AGENTS.md");

  it("names @luz-ds/check and TOOLS of scripts/luz-packages.js", () => {
    expect(agents()).toContain("@luz-ds/check");
    expect(agents()).toMatch(/\bTOOLS\b/);
    expect(TOOLS).toContain("check");
  });

  it("names the AI files the generator writes and the manifests", () => {
    for (const name of ["llms.txt", "llms-full.txt", "classes.json", "custom-elements.json"]) expect(agents(), name).toContain(name);
    expect(agents()).toContain("scripts/docs-site/ai.js");
  });

  it("says what the page Working with AI is", () => {
    expect(agents()).toMatch(/get-started\/ai|Working with AI/);
  });
});

describe(".github/CODEOWNERS", () => {
  it("covers packages/check/ and its build script", () => {
    const text = read(".github/CODEOWNERS");
    expect(text).toMatch(/^packages\/check\/\s+@\S+/m);
    expect(text).toMatch(/^scripts\/build-check\.js\s+@\S+/m);
  });
});

describe("packages/check/README.md", () => {
  const text = () => read("packages/check/README.md");

  it("no longer says the rules arrive before the first release: they are in this version", () => {
    expect(text()).not.toMatch(/arrive before the first release/i);
    expect(text()).not.toMatch(/\bare not (in|part of) this version\b/i);
  });

  it("says which rules there are: the ids of a family it names are real ones", () => {
    expect(text()).toContain("theme/contrast");
    const ids = text().match(/`((?:parse|class|element|load|misuse|theme|a11y|attr|css|file)\/[a-z0-9-]+)`/g)?.map((m) => m.slice(1, -1)) ?? [];
    for (const id of ids) {
      expect(RULE_IDS, `${id} is not a rule of messages.js`).toContain(id);
    }
  });

  it("points at the page for the list of rules", () => {
    expect(text()).toContain(`${SITE_URL}docs/get-started/ai/`);
  });
});

describe("accessibility.html: the statement covers the tool and the agent", () => {
  const page = () => readPage("accessibility.html");

  it("has a bullet in What has not been tested, in the words of the accessibility engineer", () => {
    const block = sectionsOf(page().body).get("h-a11y-not-tested");
    expect(block, "the section h-a11y-not-tested").toBeTruthy();
    const items = [...block.html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]));
    expect(items).toContain(STATEMENT_BULLET);
  });

  it("does not put it among the known issues", () => {
    const known = sectionsOf(page().body).get("h-a11y-known");
    expect(known).toBeTruthy();
    expect(textOf(known.html)).not.toContain("@luz-ds/check");
  });

  it("is last reviewed on 17 October 2026, in the lead and in the description of the front matter", () => {
    const { source, body } = page();
    expect(source).toContain(`description: LUZ aims for WCAG 2.2 level AA. What is checked on every change, what has not been tested, and the known issues. ${LAST_REVIEWED}`);
    expect(textOf(body)).toContain(`and the known issues. ${LAST_REVIEWED}`);
    expect(source).not.toContain("Last reviewed on 14 October 2026");
    expect(source).not.toContain("Last reviewed on 15 October 2026");
  });
});
