/**
 * LUZ — the size knobs (F4, step 1): `--luz-type-base`, `--luz-type-ratio`
 * and `--luz-space-unit`, and the scales computed from them.
 *
 * The golden lists are literals (tests/helpers/scale-golden.js): today's
 * nine type sizes and ten space steps. A deliberate change to the scale
 * edits them and carries a changeset; an accidental one fails here. The
 * formulas are evaluated with `evalLength` (tests/helpers/design-tokens.js),
 * from tokens.json (the source) and from the built CSS (what ships), so the
 * chain is proved in code and not only in a browser.
 *
 * Run after `pnpm tokens:build` (the built files are read).
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDtcg } from "../scripts/tokens-dtcg.js";
import { evalLength } from "./helpers/design-tokens.js";
import {
  PRESETS,
  SPACE_PX_AT_3PX_UNIT,
  SPACE_PX_AT_DEFAULTS,
  SPACE_STEPS,
  STEPS,
  TEXT_AT_DEFAULTS,
  TEXT_PX_AT_DEFAULTS,
  TEXT_PX_AT_ROOT_125,
  TEXT_PX_PLAIN_CHAIN,
} from "./helpers/scale-golden.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf-8");
const tokens = JSON.parse(read("packages/tokens/tokens.json"));
const semantic = read("packages/tokens/src/semantic.css");

const KNOBS = ["--luz-type-base", "--luz-type-ratio", "--luz-space-unit"];
const DERIVED_TEXT = STEPS.map((s) => `text-${s}`);
const ABOVE_OR_BELOW = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"].map((s) => `text-${s}`);

/** tokens.json → the scope the chain reads: `--luz-…` → expression. `rounded` takes `fromRounded` where a token has one. */
function sourceScope({ rounded }) {
  const scope = {};
  for (const [key, t] of Object.entries(tokens.typography)) scope[`--luz-${key}`] = (rounded && t.fromRounded) || t.from || t.value;
  for (const [key, t] of Object.entries(tokens.spacing)) scope[`--luz-space-${key}`] = t.from || t.value;
  return scope;
}

/** A built stylesheet → the `--luz-*` declarations of the plain chain and, over them, the @supports (round()) block. */
function builtScopes(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const supports = /@supports\s*\(\s*width\s*:\s*round\(\s*1px\s*,\s*1px\s*\)\s*\)\s*\{\s*:root\s*\{([^{}]*)\}/.exec(clean);
  const declarations = (text) => Object.fromEntries([...text.matchAll(/(--luz-[\w-]+)\s*:\s*([^;}]+)/g)].map(([, name, value]) => [name, value.trim()]));
  const plain = declarations(supports ? clean.replace(supports[0], "") : clean);
  return { plain, rounded: { ...plain, ...(supports ? declarations(supports[1]) : {}) }, hasSupports: !!supports };
}

const px = (scope, name, knobs = {}, rootPx = 16) => evalLength(`var(${name})`, { ...scope, ...knobs }, rootPx);
const textPx = (scope, knobs, rootPx) => STEPS.map((s) => px(scope, `--luz-text-${s}`, knobs, rootPx));
const spacePx = (scope, knobs, rootPx) => SPACE_STEPS.map((s) => px(scope, `--luz-space-${s}`, knobs, rootPx));
const close = (actual, expected) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 6));
};

describe("evalLength", () => {
  it("evaluates rem and px against the root size", () => {
    expect(evalLength("1.25rem")).toBe(20);
    expect(evalLength("1.25rem", {}, 20)).toBe(25);
    expect(evalLength("14px")).toBe(14);
    expect(evalLength(".875rem")).toBe(14);
  });

  it("evaluates calc with the four operators, parentheses and a unitless number", () => {
    expect(evalLength("calc((14px + 16px) / 2)")).toBe(15);
    expect(evalLength("calc(1rem * 1.25)")).toBe(20);
    expect(evalLength("calc(2rem - 4px)")).toBe(28);
    expect(evalLength("calc(var(--a) * 3)", { "--a": "0.25rem" })).toBe(12);
  });

  it("evaluates max and min", () => {
    expect(evalLength("max(0.875rem, 12.8px)")).toBe(14);
    expect(evalLength("min(1rem, 12px, 20px)")).toBe(12);
  });

  it("rounds to the nearest step and sends a tie up, like CSS round()", () => {
    expect(evalLength("round(31.25px, 1px)")).toBe(31);
    expect(evalLength("round(38.75px, 1px)")).toBe(39);
    expect(evalLength("round(22.5px, 1px)")).toBe(23);
    expect(evalLength("round(calc(1.25rem * 1.25), 0.0625rem)")).toBe(25);
    expect(evalLength("round(17.5px, 1.25px)")).toBeCloseTo(17.5, 9);
  });

  it("follows var() chains, uses a fallback only when the name is missing, and refuses a loop or an unknown name", () => {
    expect(evalLength("var(--b)", { "--a": "2rem", "--b": "calc(var(--a) / 2)" })).toBe(16);
    expect(evalLength("var(--missing, 10px)")).toBe(10);
    expect(evalLength("var(--a, 10px)", { "--a": "4px" })).toBe(4);
    expect(() => evalLength("var(--missing)")).toThrow(/not defined/);
    expect(() => evalLength("var(--a)", { "--a": "var(--a)" })).toThrow(/itself/);
  });
});

describe("tokens.json: the three knobs", () => {
  it("has --luz-type-base at 1rem, a length in rem", () => {
    expect(tokens.typography["type-base"]?.value).toBe("1rem");
  });

  it("has --luz-type-ratio at 1.25, typed as a number so DTCG tools read it as one", () => {
    expect(tokens.typography["type-ratio"]).toMatchObject({ value: "1.25", type: "number" });
  });

  it("has --luz-space-unit at 0.25rem, so spacing follows the reader's font size", () => {
    expect(tokens.spacing.unit?.value).toBe("0.25rem");
  });
});

describe("tokens.json: the type scale at the defaults is the scale LUZ always had", () => {
  it("keeps every step's resolved value as a plain rem length (the golden list)", () => {
    for (const step of STEPS) expect(tokens.typography[`text-${step}`].value, `text-${step}`).toBe(TEXT_AT_DEFAULTS[step]);
  });

  it("gives every step a chain formula (`from`) that is not a literal", () => {
    for (const key of DERIVED_TEXT) expect(tokens.typography[key].from ?? "(no from)", key).toMatch(/var\(--luz-/);
    expect(tokens.typography["text-base"].from).toBe("var(--luz-type-base)");
  });

  it("gives every step but the base a rounded form (`fromRounded`) with round(), and the plain form none", () => {
    for (const key of ABOVE_OR_BELOW) {
      expect(tokens.typography[key].fromRounded ?? "(no fromRounded)", key).toMatch(/round\(/);
      expect(tokens.typography[key].from ?? "", key).not.toMatch(/round\(/);
    }
  });

  it("rounds to 1/16 rem and keeps the two floors outside round()", () => {
    for (const key of ABOVE_OR_BELOW) expect(tokens.typography[key].fromRounded ?? "(no fromRounded)", key).toMatch(/round\([\s\S]*,\s*0?\.0625rem\)/);
    expect(tokens.typography["text-sm"].fromRounded ?? "(no fromRounded)").toMatch(/^max\(\s*0?\.875rem\s*,\s*round\(/);
    expect(tokens.typography["text-xs"].fromRounded ?? "(no fromRounded)").toMatch(/^max\(\s*0?\.75rem\s*,\s*round\(/);
  });

  it("the rounded chain evaluates to the golden px at the defaults, and equals each token's value", () => {
    const scope = sourceScope({ rounded: true });
    close(textPx(scope), TEXT_PX_AT_DEFAULTS);
    for (const step of STEPS) {
      expect(px(scope, `--luz-text-${step}`), step).toBeCloseTo(evalLength(tokens.typography[`text-${step}`].value), 6);
    }
  });

  it("the plain chain (a browser without round()) is the golden list, but 31.25, 39.0625 and 48.828125px for 2xl, 3xl and 4xl", () => {
    close(textPx(sourceScope({ rounded: false })), TEXT_PX_PLAIN_CHAIN);
  });

  it("every preset of the docs gives its sizes, at a 16px root", () => {
    const scope = sourceScope({ rounded: true });
    for (const { name, knobs, px: expected } of PRESETS) {
      expect(textPx(scope, knobs).map((n) => Math.round(n * 100) / 100), name).toEqual(expected);
    }
  });

  it("a reader's 20px root gives today's scale times 1.25", () => {
    close(textPx(sourceScope({ rounded: true }), {}, 20), TEXT_PX_AT_ROOT_125);
  });
});

describe("tokens.json: the space scale", () => {
  it("is a multiple of --luz-space-unit, step by step (the multipliers of the spacing page)", () => {
    const multipliers = { "3xs": 0.5, "2xs": 1, xs: 2, sm: 3, md: 4, lg: 6, xl: 8, "2xl": 12, "3xl": 16, "4xl": 24 };
    for (const [step, n] of Object.entries(multipliers)) {
      const from = tokens.spacing[step].from ?? "(no from)";
      expect(from, step).toContain("var(--luz-space-unit)");
      expect(evalLength(from, { "--luz-space-unit": "10px" }), step).toBe(10 * n);
    }
  });

  it("is the golden px at the defaults, and equals each token's resolved value", () => {
    const scope = sourceScope({ rounded: true });
    close(spacePx(scope), SPACE_PX_AT_DEFAULTS);
    for (const step of SPACE_STEPS) expect(evalLength(tokens.spacing[step].value), step).toBeCloseTo(px(scope, `--luz-space-${step}`), 6);
  });

  it("follows the unit: 0.1875rem gives 1.5, 3, 6 … 72px", () => {
    close(spacePx(sourceScope({ rounded: true }), { "--luz-space-unit": "0.1875rem" }), SPACE_PX_AT_3PX_UNIT);
  });

  it("follows the reader's font size: a 20px root gives 5px for the unit", () => {
    expect(px(sourceScope({ rounded: true }), "--luz-space-md", {}, 20)).toBe(20);
  });
});

describe("the built CSS (dist) carries the chain and the knobs", () => {
  const files = ["luz-tokens.css", "tokens.css", "luz-tokens.min.css", "tokens.min.css"];

  for (const file of files) {
    describe(file, () => {
      const css = read(`packages/tokens/dist/${file}`);
      const { plain, rounded, hasSupports } = builtScopes(css);

      it("declares the three knobs at their defaults", () => {
        expect(plain["--luz-type-base"], "--luz-type-base").toBeDefined();
        expect(evalLength(plain["--luz-type-base"])).toBe(16);
        expect(Number(plain["--luz-type-ratio"])).toBe(1.25);
        expect(evalLength(plain["--luz-space-unit"])).toBe(4);
      });

      it("keeps round() in an @supports block, in the same layer, after the plain chain", () => {
        expect(hasSupports, "@supports (width: round(1px, 1px)) { :root { … } }").toBe(true);
        expect(css.indexOf("@supports")).toBeGreaterThan(css.indexOf("--luz-text-lg"));
        expect(css.match(/round\(/g)?.length ?? 0).toBeGreaterThanOrEqual(1 + ABOVE_OR_BELOW.length);
        const layerOpen = css.search(/@layer\s+luz\.tokens\s*\{/);
        expect(layerOpen, "the chain is inside @layer luz.tokens").toBeGreaterThan(-1);
        expect(css.indexOf("@supports"), "the @supports block is inside it").toBeGreaterThan(layerOpen);
      });

      it("keeps the midpoint of --luz-text-md and the floors through the minifier", () => {
        expect(plain["--luz-text-md"].replace(/\s/g, "")).toMatch(/\/2\)?$/);
        expect(plain["--luz-text-sm"]).toMatch(/max\(/);
        expect(plain["--luz-text-xs"]).toMatch(/max\(/);
      });

      it("evaluates to the golden list with round(), and without it to the plain chain", () => {
        close(textPx(rounded), TEXT_PX_AT_DEFAULTS);
        close(textPx(plain), TEXT_PX_PLAIN_CHAIN);
        close(spacePx(rounded), SPACE_PX_AT_DEFAULTS);
      });

      it("re-scales when a knob is set after it, as a consumer's :root does", () => {
        for (const { name, knobs, px: expected } of PRESETS) {
          expect(textPx(rounded, knobs).map((n) => Math.round(n * 100) / 100), name).toEqual(expected);
        }
        close(spacePx(rounded, { "--luz-space-unit": "0.1875rem" }), SPACE_PX_AT_3PX_UNIT);
      });

      it("reads a knob only inside the --luz-text-* and --luz-space-* declarations", () => {
        const readers = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--luz-[\w-]+)\s*:\s*([^;}]*var\(\s*--luz-(?:type-base|type-ratio|space-unit)[^;}]*)/g)].map(([, name]) => name);
        expect(readers.length).toBeGreaterThan(0);
        expect(readers.filter((name) => !/^--luz-(text|space)-/.test(name))).toEqual([]);
      });
    });
  }
});

describe("no component reads a knob (components read the derived tokens only)", () => {
  /** Every .css under a packages/<name>/src, comments removed. */
  function stylesheets(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) out.push(...stylesheets(path));
      else if (entry.endsWith(".css")) out.push(path);
    }
    return out;
  }

  const packages = readdirSync(resolve(root, "packages")).filter((p) => statSync(resolve(root, "packages", p)).isDirectory());

  it("has stylesheets to read in every package that ships CSS", () => {
    const counts = packages.map((p) => {
      try { return stylesheets(resolve(root, "packages", p, "src")).length; } catch { return 0; }
    });
    expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(50);
  });

  it("no rule in packages/*/src has var(--luz-type-base), var(--luz-type-ratio) or var(--luz-space-unit)", () => {
    const offenders = [];
    for (const p of packages) {
      let files = [];
      try { files = stylesheets(resolve(root, "packages", p, "src")); } catch { continue; }
      for (const file of files) {
        const css = readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
        for (const knob of KNOBS) if (new RegExp(`var\\(\\s*${knob}\\b`).test(css)) offenders.push(`${file.slice(root.length + 1)} reads ${knob}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the DTCG export", () => {
  const dtcg = buildDtcg(tokens, semantic);
  const extension = (token) => token?.$extensions?.["com.luz-ds"];

  it("exports --luz-type-ratio as a DTCG number", () => {
    expect(dtcg.primitives.type?.ratio).toMatchObject({ $type: "number", $value: 1.25 });
  });

  it("exports the two length knobs as dimensions", () => {
    expect(dtcg.primitives.type?.base).toMatchObject({ $type: "dimension", $value: { value: 1, unit: "rem" } });
    expect(dtcg.primitives.space?.unit).toMatchObject({ $type: "dimension", $value: { value: 0.25, unit: "rem" } });
  });

  it("keeps a derived token's resolved $value, and shows its plain chain as an extension", () => {
    for (const step of STEPS) {
      const token = dtcg.primitives.text[step];
      expect(token.$type, step).toBe("dimension");
      expect(token.$value, step).toEqual({ value: Number(TEXT_AT_DEFAULTS[step].replace("rem", "")), unit: "rem" });
      expect(extension(token)?.from ?? "(no from extension)", step).toMatch(/var\(--luz-/);
      expect(extension(token)?.from, step).toBe(tokens.typography[`text-${step}`].from);
    }
    for (const step of SPACE_STEPS) {
      expect(extension(dtcg.primitives.space[step])?.from ?? "(no from extension)", step).toMatch(/var\(--luz-space-unit\)/);
      expect(extension(dtcg.primitives.space[step])?.from, step).toBe(tokens.spacing[step].from);
    }
  });
});
