/**
 * The token pages of the size scales (F4 step 7, spec f4-customisation.md
 * 1.10 "The token pages", decision D5): the values stay typed in the HTML,
 * and this test recomputes every one from packages/tokens/tokens.json with
 * `evalLength` and fails on drift (the repo's contrast pattern, HUB-8).
 *
 *   tokens/typography.html   the scale table: Token, Formula, Value, At 16px
 *                            root; the two knobs and --luz-text-body listed
 *   tokens/spacing.html      each step with its multiplier ("unit × 4") and
 *                            its px; --luz-space-unit listed
 *   tokens/themes.html and packages/core/src/themes/_template.css
 *                            name the three knobs (they are not in a theme)
 *
 * Nothing here types a size: the numbers come from tokens.json and from the
 * evaluator that tests/type-space-scale.test.js also uses.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeEntities, readHtml } from "../scripts/docs-site/html.js";
import { evalLength } from "./helpers/design-tokens.js";
import { knownTokens } from "./helpers/known-tokens.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repo, path), "utf-8");
const tokens = JSON.parse(read("packages/tokens/tokens.json"));

const KNOBS = ["--luz-type-base", "--luz-type-ratio", "--luz-space-unit"];

/* ---- The source, as evaluator scopes --------------------------------------- */

const entries = [
  ...Object.entries(tokens.typography).map(([key, t]) => [`--luz-${key}`, t]),
  ...Object.entries(tokens.spacing).map(([key, t]) => [`--luz-space-${key}`, t]),
];
/** What the browser resolves with round() (the supports block): the rounded form, else the plain one. */
const roundedScope = Object.fromEntries(entries.map(([name, t]) => [name, t.fromRounded ?? t.from ?? t.value]));
/** The plain chain, for a browser without round(). */
const plainScope = Object.fromEntries(entries.map(([name, t]) => [name, t.from ?? t.value]));

const textSteps = Object.keys(tokens.typography).filter((k) => k.startsWith("text-"));
const spaceSteps = Object.keys(tokens.spacing).filter((k) => k !== "unit");

const px = (n) => `${Number.isInteger(n) ? n : Number(n.toFixed(4))}px`;
const squash = (s) => s.replace(/\s+/g, " ").trim();

/* ---- Reading the page ---------------------------------------------------------- */

const pageBody = (file) => {
  const html = read(`apps/docs/pages/${file}`);
  readHtml(html, file); // fails on a mis-nested tag
  return html;
};

const textOf = (html) => squash(decodeEntities(html.replace(/<[^>]*>/g, " ")));

/** The tables of a page: caption, header cells, and the cells of each body row, as text. */
function tablesOf(html) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map(([table]) => {
    const cells = (row) => [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => textOf(m[1]));
    const head = table.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? "";
    const body = table.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? table;
    return {
      caption: textOf(table.match(/<caption[^>]*>([\s\S]*?)<\/caption>/)?.[1] ?? ""),
      head: cells(head),
      rows: [...body.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((m) => cells(m[0])),
    };
  });
}

/**
 * The text of every list item, table row or paragraph that holds a `<code>`
 * with exactly this name: where a page says something about a token.
 */
function aboutToken(html, name) {
  const out = [];
  for (const [block] of html.matchAll(/<(li|tr|p)\b[\s\S]*?<\/\1>/g)) {
    const codes = [...block.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)].map((m) => textOf(m[1]));
    if (codes.includes(name)) out.push(textOf(block));
  }
  return out;
}

/* ---- tokens/typography.html ---------------------------------------------------- */

describe("tokens/typography.html", () => {
  const html = pageBody("tokens/typography.html");
  const scale = tablesOf(html).find((t) => t.caption === "Font-size tokens");

  it("has the scale table, with a Formula column between the token and its value", () => {
    expect(scale, "table with the caption 'Font-size tokens'").toBeTruthy();
    const head = scale.head;
    const at = (name) => head.indexOf(name);
    expect(at("Token"), `header ${JSON.stringify(head)}`).toBeGreaterThanOrEqual(0);
    expect(at("Formula"), `header ${JSON.stringify(head)}`).toBeGreaterThan(at("Token"));
    expect(at("Value")).toBeGreaterThan(at("Formula"));
    expect(at("At 16px root")).toBeGreaterThan(at("Value"));
  });

  it("lists every text step of tokens.json, and no other, in order", () => {
    const col = scale.head.indexOf("Token");
    expect(scale.rows.map((r) => r[col])).toEqual(textSteps.map((k) => `--luz-${k}`));
  });

  for (const key of textSteps) {
    it(`--luz-${key}: the page shows its formula, its value and its pixels, and they agree with each other`, () => {
      const [token, formula, value, at16] = ["Token", "Formula", "Value", "At 16px root"].map((h) => scale.head.indexOf(h));
      expect(formula, `the Formula column is missing from ${JSON.stringify(scale.head)}`).toBeGreaterThanOrEqual(0);
      const row = scale.rows.find((r) => r[token] === `--luz-${key}`);
      expect(row, `a row for --luz-${key}`).toBeTruthy();
      const t = tokens.typography[key];
      expect(squash(row[formula]), "Formula is the `from` of tokens.json").toBe(squash(t.from));
      expect(row[value], "Value is the `value` of tokens.json").toBe(t.value);
      const resolved = evalLength(t.value, {});
      expect(row[at16], "At 16px root is the value in px").toBe(px(resolved));
      // The formula, evaluated at the defaults, gives that value (with round() where it exists)
      expect(evalLength(t.fromRounded ?? t.from, roundedScope), "formula at the defaults").toBeCloseTo(resolved, 6);
    });
  }

  it("the plain chain (no round()) stays within a quarter pixel of the value", () => {
    for (const key of textSteps) {
      expect(Math.abs(evalLength(`var(--luz-${key})`, plainScope) - evalLength(tokens.typography[key].value, {})), key).toBeLessThanOrEqual(0.25);
    }
  });

  it("the specimen list repeats value and pixels as the table says them", () => {
    const items = [...html.matchAll(/<li class="docs-scale">[\s\S]*?<\/li>/g)].map(([li]) => textOf(li));
    for (const key of textSteps) {
      const item = items.find((i) => i.startsWith(`--luz-${key} `));
      expect(item, `a specimen for --luz-${key}`).toBeTruthy();
      expect(item).toContain(`${tokens.typography[key].value} · ${px(evalLength(tokens.typography[key].value, {}))}`);
    }
  });

  it("names the two knobs with their defaults", () => {
    for (const name of ["--luz-type-base", "--luz-type-ratio"]) {
      const about = aboutToken(html, name);
      expect(about.length, `${name} is named in a list item, row or paragraph`).toBeGreaterThan(0);
      const key = name.replace("--luz-", "");
      const shown = key === "type-base" ? [tokens.typography[key].value, px(evalLength(tokens.typography[key].value, {}))] : [tokens.typography[key].value];
      expect(about.some((text) => shown.every((s) => text.includes(s))), `${name} with ${shown.join(" and ")}`).toBe(true);
    }
  });

  it("says --luz-text-body: its formula is the core setting's, and its default is the body size", () => {
    const about = aboutToken(html, "--luz-text-body");
    expect(about.length).toBeGreaterThan(0);
    const settings = read("packages/core/src/settings/_settings.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const formula = squash(settings.match(/--luz-text-body\s*:\s*([^;]+);/)[1]);
    const body = px(evalLength(formula, roundedScope));
    expect(about.some((text) => text.includes(formula) && text.includes(body)), `a line with "${formula}" and ${body}`).toBe(true);
  });

  it("does not repeat the three sentences that were wrong", () => {
    const text = textOf(html);
    expect(text).not.toMatch(/rounded to whole pixels/i);
    expect(text).not.toMatch(/line height of 1\.5/i);
    expect(text).toMatch(/1\/16 rem/);
  });

  it("names every --luz-text-* and --luz-type-* token of the source and none that is not there", () => {
    const named = new Set([...html.matchAll(/--luz-(?:text|type)-[a-z0-9-]+/g)].map((m) => m[0]));
    const known = knownTokens();
    expect([...named].filter((n) => !known.has(n)), "named but not declared").toEqual([]);
    const wanted = [...Object.keys(tokens.typography).filter((k) => /^(text|type)-/.test(k)).map((k) => `--luz-${k}`), "--luz-text-body", "--luz-text-control"];
    expect(wanted.filter((n) => !named.has(n)), "declared but not on the page").toEqual([]);
  });
});

/* ---- tokens/spacing.html ------------------------------------------------------- */

describe("tokens/spacing.html", () => {
  const html = pageBody("tokens/spacing.html");

  for (const key of spaceSteps) {
    it(`--luz-space-${key}: the page shows its multiplier of the unit and its pixels, and they agree`, () => {
      const t = tokens.spacing[key];
      // The step's value in units: evaluate its formula with a unit of 1px
      const multiplier = evalLength(t.from, { ...roundedScope, "--luz-space-unit": "1px" });
      const inPx = evalLength(t.value, {});
      expect(evalLength(t.from, roundedScope), "formula at the defaults").toBeCloseTo(inPx, 6);
      const spelled = multiplier === 0.5 ? ["½", "0.5"] : [String(multiplier)];
      const about = aboutToken(html, `--luz-space-${key}`);
      expect(about.length, `--luz-space-${key} is named`).toBeGreaterThan(0);
      const ok = about.some((text) => text.includes(px(inPx)) && spelled.some((m) => text.includes(`unit × ${m}`)));
      expect(ok, `a line with "unit × ${spelled[0]}" and ${px(inPx)}; found ${JSON.stringify(about)}`).toBe(true);
    });
  }

  it("names --luz-space-unit with its default and its pixels", () => {
    const t = tokens.spacing.unit;
    const about = aboutToken(html, "--luz-space-unit");
    expect(about.length, "--luz-space-unit is named").toBeGreaterThan(0);
    expect(about.some((text) => text.includes(t.value) && text.includes(px(evalLength(t.value, {})))), JSON.stringify(about)).toBe(true);
  });

  it("names every --luz-space-* token of the source and none that is not there", () => {
    const named = new Set([...html.matchAll(/--luz-space-[a-z0-9-]+/g)].map((m) => m[0]));
    expect([...named].filter((n) => !knownTokens().has(n)), "named but not declared").toEqual([]);
    expect(Object.keys(tokens.spacing).map((k) => `--luz-space-${k}`).filter((n) => !named.has(n)), "declared but not on the page").toEqual([]);
  });

  it("every multiple of the unit is whole, so the scale stays on the grid", () => {
    for (const key of spaceSteps) {
      const m = evalLength(tokens.spacing[key].from, { ...roundedScope, "--luz-space-unit": "1px" });
      expect(Number.isInteger(m * 2), `${key}: ${m}`).toBe(true);
    }
  });
});

/* ---- Where the knobs are stated ------------------------------------------------ */

describe("the knobs are named where a reader looks for them", () => {
  const SOURCES = {
    "the themes page (apps/docs/pages/tokens/themes.html)": "apps/docs/pages/tokens/themes.html",
    "the theme template (packages/core/src/themes/_template.css)": "packages/core/src/themes/_template.css",
    "the tokens README (packages/tokens/README.md)": "packages/tokens/README.md",
    "VERSIONING.md (the knobs are public tokens)": "VERSIONING.md",
    "AGENTS.md (the recipe for a type or space scale)": "AGENTS.md",
  };
  for (const [label, file] of Object.entries(SOURCES)) {
    it(`${label} names ${KNOBS.join(", ")}`, () => {
      const text = read(file);
      expect(KNOBS.filter((k) => !text.includes(k))).toEqual([]);
    });
  }

  it("the template names them in a comment only: its three blocks hold semantic tokens, never a knob", () => {
    const css = read("packages/core/src/themes/_template.css");
    const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const knob of KNOBS) expect(code, `${knob} outside a comment`).not.toContain(knob);
  });

  it("dev/QUICK-REFERENCE.md names no token that does not exist, and the knobs", () => {
    const text = read("dev/QUICK-REFERENCE.md");
    const known = knownTokens();
    const named = [...new Set(text.match(/--luz-[a-z0-9]+(?:-[a-z0-9]+)*(?![\w-])/g) ?? [])];
    // `--luz-surface-` style prefixes end in a dash and are not matched above
    expect(named.filter((n) => !known.has(n))).toEqual([]);
    expect(KNOBS.filter((k) => !text.includes(k))).toEqual([]);
  });
});
