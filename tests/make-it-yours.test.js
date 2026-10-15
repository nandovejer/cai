/**
 * The page "Make it yours" (F4 step 8, spec f4-customisation.md 3.1 and 1.9):
 * `apps/docs/pages/get-started/make-it-yours.html`. What a reader is told must
 * be true of the source, so every claim that can be checked is:
 *
 *   - the nine sections, by h2 id, in order (the page is long: "On this page");
 *   - every `--luz-*` the page names exists (tokens.json, semantic.css, the
 *     core settings), and each section names the ones it is about;
 *   - the presets table is `evalLength` over tokens.json with each preset's
 *     knobs, and agrees with the golden list of tests/helpers/scale-golden.js;
 *   - the CSS it shows parses, passes the repo's stylelint config (no removed
 *     focus ring, no literal duration) and never uses `!important`;
 *   - the sizes demo is inside a <template>: without JavaScript it is not in
 *     the page at all (docs.spec.js allows no `hidden` element in main), and
 *     the table of presets is the whole of the section;
 *   - the way out: links to the pages that own the details.
 *
 * The behaviour of the demo is tests/make-it-yours.spec.js.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import { decodeEntities, readHtml } from "../scripts/docs-site/html.js";
import { evalLength } from "./helpers/design-tokens.js";
import { knownTokens } from "./helpers/known-tokens.js";
import { PRESETS, STEPS } from "./helpers/scale-golden.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repo, path), "utf-8");

const FILE = "apps/docs/pages/get-started/make-it-yours.html";
const SOURCE = read(FILE);
const html = SOURCE.replace(/^<!--[\s\S]*?-->/, "");
const parsed = readHtml(html, FILE);
const tokens = JSON.parse(read("packages/tokens/tokens.json"));

const SECTIONS = ["how", "colour", "fonts", "sizes", "corners", "shadows", "component", "icons", "limits"];
const squash = (s) => s.replace(/\s+/g, " ").trim();
const textOf = (fragment) => squash(decodeEntities(fragment.replace(/<[^>]*>/g, " ")));

/** The html of each h2 section, from its h2 to the next one. */
const sectionHtml = (id) => {
  const starts = [...html.matchAll(/<h2\b[^>]*\bid="([^"]+)"/g)].map((m) => ({ id: m[1], at: m.index }));
  const i = starts.findIndex((s) => s.id === id);
  if (i < 0) return "";
  return html.slice(starts[i].at, starts[i + 1]?.at ?? html.length);
};

/** The CSS blocks of a fragment: `pre` with data-lang="css", as text. */
const cssBlocks = (fragment) =>
  [...fragment.matchAll(/<pre\b[^>]*data-lang="css"[^>]*>([\s\S]*?)<\/pre>/g)].map((m) => decodeEntities(m[1].replace(/<[^>]*>/g, "")));

const namesIn = (fragment) => new Set(fragment.match(/--luz-[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? []);

describe("make-it-yours: structure", () => {
  it("has nine h2, in this order, each with its id (a nine-entry 'On this page')", () => {
    const h2 = parsed.headings.filter((h) => h.level === 2 && !h.specimen).map((h) => h.id);
    expect(h2).toEqual(SECTIONS);
  });

  it("is not the placeholder any more", () => {
    expect(html).not.toMatch(/This page is being written/);
  });

  it("every h2 has text, and the page has no h1 of its own (the generator writes it)", () => {
    for (const h of parsed.headings.filter((x) => x.level === 2 && !x.specimen)) expect(h.text, h.id).not.toBe("");
    expect(parsed.headings.filter((h) => h.level === 1)).toEqual([]);
  });
});

describe("make-it-yours: every token it names exists", () => {
  it("no `--luz-*` on the page, in prose or in code, that the source does not declare", () => {
    const known = knownTokens();
    expect([...namesIn(html)].filter((n) => !known.has(n))).toEqual([]);
  });

  const BY_SECTION = {
    how: [],
    fonts: ["--luz-font-body", "--luz-font-heading", "--luz-font-sans", "--luz-font-serif", "--luz-font-mono"],
    sizes: ["--luz-type-base", "--luz-type-ratio", "--luz-space-unit"],
    corners: Object.keys(tokens.radius).map((k) => `--luz-radius-${k}`),
    shadows: ["--luz-shadow-sm", "--luz-shadow-md", "--luz-shadow-lg"],
  };
  for (const [id, wanted] of Object.entries(BY_SECTION)) {
    if (!wanted.length) continue;
    it(`${id} names ${wanted.join(", ")}`, () => {
      const named = namesIn(sectionHtml(id));
      expect(wanted.filter((n) => !named.has(n))).toEqual([]);
    });
  }

  it("the section on corners says --luz-radius-md is the ceiling", () => {
    expect(textOf(sectionHtml("corners"))).toMatch(/--luz-radius-md[^.]*(ceiling|no rectangle is rounder|rounder)/i);
  });
});

describe("make-it-yours: the CSS it shows", () => {
  const blocks = cssBlocks(html);

  it("shows CSS in how, fonts, sizes, corners, shadows and component", () => {
    for (const id of ["how", "fonts", "sizes", "corners", "shadows", "component"]) {
      expect(cssBlocks(sectionHtml(id)).length, `a CSS block in ${id}`).toBeGreaterThan(0);
    }
  });

  it("every block is valid CSS and passes the repo's stylelint config", async () => {
    expect(blocks.length).toBeGreaterThan(0);
    for (const code of blocks) {
      const result = await stylelint.lint({ code, codeFilename: resolve(repo, "tests/make-it-yours-snippet.css"), configFile: resolve(repo, "stylelint.config.js") });
      const [{ warnings }] = result.results;
      expect(warnings.map((w) => `${w.rule}: ${w.text}`), code).toEqual([]);
    }
  });

  it("no block, and no style attribute, uses !important (a token or a rule outside a layer wins without it)", () => {
    for (const code of blocks) expect(code).not.toMatch(/!\s*important/i);
    expect(html).not.toMatch(/style="[^"]*!\s*important/i);
  });

  it("how: a token written on :root, outside any @layer", () => {
    const [first] = cssBlocks(sectionHtml("how"));
    expect(first, "the first block of how").toBeTruthy();
    expect(first).toMatch(/:root\s*\{[^}]*--luz-[\w-]+\s*:/);
    expect(first, "not inside a layer").not.toMatch(/@layer[^;{]*\{/);
  });

  it("component: the layer order statement and a rule of one component", () => {
    const text = cssBlocks(sectionHtml("component")).join("\n");
    expect(text).toMatch(/@layer\s+reset\s*,\s*luz\s*,\s*app\s*;/);
    expect(text).toMatch(/\.luz-btn\s*\{/);
  });

  it("sizes: the body counter-example (a knob on body changes nothing) and the rem warning", () => {
    const section = sectionHtml("sizes");
    expect(textOf(section)).toMatch(/\bbody\b/);
    expect(cssBlocks(section).join("\n")).toMatch(/body\s*\{[^}]*--luz-type-base/);
    expect(textOf(section)).toMatch(/\brem\b/);
    expect(textOf(section)).toMatch(/\bpx\b/);
  });

  it("sizes: states the ranges LUZ is tested at (spec 1.9)", () => {
    const text = textOf(sectionHtml("sizes"));
    for (const range of ["0.875rem", "1.25rem", "1.125", "1.5", "0.1875rem", "0.3125rem"]) expect(text, range).toContain(range);
  });

  it("shadows: dark mode redraws them, and the page says where to set them per mode", () => {
    const section = sectionHtml("shadows");
    expect(`${textOf(section)} ${cssBlocks(section).join("\n")}`).toMatch(/\[data-theme="dark"\]/);
  });

  it("fonts: tokens.css (without @font-face) is the file to load", () => {
    expect(textOf(sectionHtml("fonts"))).toContain("tokens.css");
  });
});

describe("make-it-yours: the presets table is the arithmetic of tokens.json", () => {
  const entries = [
    ...Object.entries(tokens.typography).map(([key, t]) => [`--luz-${key}`, t]),
  ];
  const base = Object.fromEntries(entries.map(([name, t]) => [name, t.fromRounded ?? t.from ?? t.value]));

  // Knobs per row, in the order of the spec (3.1) and of PRESETS in the golden list
  const ROWS = [
    ["Default", {}],
    ["Larger text", { "--luz-type-base": "1.125rem" }],
    ["Tighter steps", { "--luz-type-ratio": "1.2" }],
    ["Small base", { "--luz-type-base": "0.875rem" }],
    ["Large and wide", { "--luz-type-base": "1.25rem", "--luz-type-ratio": "1.333" }],
  ];
  const table = [...html.matchAll(/<table[\s\S]*?<\/table>/g)]
    .map(([t]) => ({
      caption: textOf(t.match(/<caption[^>]*>([\s\S]*?)<\/caption>/)?.[1] ?? ""),
      head: [...(t.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? "").matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => textOf(m[1])),
      rows: [...(t.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? "").matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => textOf(m[1]))),
    }))
    .find((t) => t.caption === "Type sizes at 16px root");

  it("is there, with the caption 'Type sizes at 16px root' and the nine steps as columns", () => {
    expect(table, "a table captioned 'Type sizes at 16px root'").toBeTruthy();
    const steps = table.head.slice(-STEPS.length).map((h) => h.replace(/^(--luz-)?(text-)?/, ""));
    expect(steps).toEqual(STEPS);
  });

  it("has the five presets, in order, named as the spec names them", () => {
    expect(table.rows.map((r) => ROWS.find(([name]) => r[0].startsWith(name))?.[0])).toEqual(ROWS.map(([name]) => name));
  });

  ROWS.forEach(([name, knobs], i) => {
    it(`${name}: the nine sizes are the chain at its knobs, and the row says the knobs`, () => {
      const scope = { ...base, ...knobs };
      const expected = STEPS.map((s) => evalLength(`var(--luz-text-${s})`, scope, 16));
      // The evaluator agrees with the golden list (a literal, on purpose)
      expect(expected, "tests/helpers/scale-golden.js").toEqual(PRESETS[i].px);
      const row = table.rows[i];
      const shown = row.slice(-STEPS.length).map((c) => parseFloat(c));
      expect(shown, `${name}: ${row.join(" | ")}`).toEqual(expected);
      for (const value of Object.values(knobs)) expect(row.join(" "), `${name} says ${value}`).toContain(value);
    });
  });
});

describe("make-it-yours: the sizes demo is a template, and nothing else is a dead control", () => {
  const section = sectionHtml("sizes");
  const template = section.match(/<template\b[^>]*>([\s\S]*?)<\/template>/)?.[1] ?? "";
  const inputs = [...template.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]).filter((t) => /type="range"/.test(t));
  const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

  // spec 1.9 and 3.1: the ranges LUZ is tested at, and the step of the slider
  const RANGES = [
    { min: "0.875", max: "1.25", step: "0.0625", value: parseFloat(tokens.typography["type-base"].value) },
    { min: "1.125", max: "1.5", step: "0.025", value: parseFloat(tokens.typography["type-ratio"].value) },
  ];

  it("sits in a <template> of the sizes section, so it is not in the DOM without JavaScript", () => {
    expect(template, "a <template> in #sizes").toContain("<form");
  });

  it("has two range inputs at the tested ranges, starting at the defaults", () => {
    expect(inputs).toHaveLength(2);
    RANGES.forEach((range, i) => {
      expect(attr(inputs[i], "min"), `range ${i} min`).toBe(range.min);
      expect(attr(inputs[i], "max"), `range ${i} max`).toBe(range.max);
      expect(attr(inputs[i], "step"), `range ${i} step`).toBe(range.step);
      expect(Number(attr(inputs[i], "value")), `range ${i} value`).toBe(range.value);
    });
  });

  it("is a docs-example specimen with a native reset button", () => {
    const form = template.match(/<form\b[^>]*>/)?.[0] ?? "";
    expect(form).toMatch(/class="[^"]*\bdocs-example\b/);
    expect(form).toContain("data-docs-specimen");
    expect(template).toMatch(/<button\b[^>]*type="reset"/);
  });

  it("every range has a label and an <output> for its value", () => {
    for (const input of inputs) {
      const id = attr(input, "id");
      expect(id, "an id").toBeTruthy();
      expect(template, `a label for ${id}`).toMatch(new RegExp(`<label\\b[^>]*for="${id}"`));
      const out = attr(input, "data-output");
      expect(out, "data-output names the <output>").toBeTruthy();
      expect(template, `<output id="${out}">`).toMatch(new RegExp(`<output\\b[^>]*id="${out}"`));
    }
  });

  it("no range input is outside the template (it would be a control of nothing without JavaScript)", () => {
    const outside = html.replace(/<template\b[\s\S]*?<\/template>/g, "");
    expect(outside).not.toMatch(/type="range"/);
    expect(outside).not.toMatch(/type="reset"/);
  });
});

describe("make-it-yours: where the details live", () => {
  const hrefs = parsed.links.map((l) => l.href);

  it("colour links to Make your own theme and to the contrast check", () => {
    const links = [...sectionHtml("colour").matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(links).toContain("/docs/tokens/themes/");
    expect(links).toContain("/docs/tokens/contrast/");
  });

  it("how and component link to Cascade layers", () => {
    for (const id of ["how", "component"]) {
      const links = [...sectionHtml(id).matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/#.*$/, ""));
      expect(links, id).toContain("/docs/get-started/layers/");
    }
  });

  it("every internal link is root-absolute and ends in a slash", () => {
    for (const href of hrefs.filter((h) => h.startsWith("/"))) expect(href, href).toMatch(/\/(#[\w-]+)?$/);
  });

  it("limits is a list", () => {
    expect(sectionHtml("limits")).toMatch(/<(ul|ol)\b/);
  });
});
