/**
 * CAI — the DTCG export (packages/tokens/dist/cai-tokens.dtcg.json) says the
 * same as the CSS. Every custom property of dist/tokens.css (primitives and
 * the three base color modes) is in the JSON, under the name rule
 * (--cai-surface-page ↔ surface/page), with the same resolved value in each
 * mode. The CSS side is resolved here on its own (var() chains), not with the
 * generator's parser. Run after `pnpm tokens:build`.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDtcg } from "../scripts/tokens-dtcg.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "packages/tokens/dist");
const built = existsSync(resolve(dist, "cai-tokens.dtcg.json")) && existsSync(resolve(dist, "tokens.css"));
const MODES = { Light: "light", Dark: "dark", "High contrast": "high-contrast" };

/** CSS → [{ selector, decls: Map }] (comments removed). */
function blocks(css) {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    decls: new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, p, v]) => [p, v.trim()])),
  }));
}

/** A CSS colour, canonical: "#rrggbb" or "#rrggbb/alpha". */
function canonColor(css) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return `#${h.toLowerCase()}`;
  }
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/.exec(css);
  if (!m) return css;
  const h = m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  return m[4] === undefined || Number(m[4]) === 1 ? `#${h}` : `#${h}/${Number(m[4])}`;
}

/** A DTCG value, back to the canonical CSS form canon() gives. */
function dtcgToCss(value) {
  if (Array.isArray(value)) return value.map(dtcgToCss).join(", ");
  if (value?.colorSpace === "srgb") {
    const h = value.components.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
    expect(`#${h}`).toBe(value.hex);
    return value.alpha === 1 ? `#${h}` : `#${h}/${value.alpha}`;
  }
  if (value && typeof value === "object" && "unit" in value) return `${value.value}${value.unit}`;
  if (value?.offsetX) return [value.offsetX, value.offsetY, value.blur, value.spread].map(dtcgToCss).join(" ") + ` ${dtcgToCss(value.color)}`;
  return String(value);
}

/** A CSS value, canonical (colours, shadow layers, font stacks, 0 → 0px). */
function canon(css) {
  if (/^-?[\d.]+(px|rem)$/.test(css)) return css.replace(/^(-?)0+(\d)/, "$1$2");
  const parts = css.split(/,(?![^(]*\))/).map((s) => s.trim());
  if (parts.length > 1 && parts.every((p) => /^[\d\s.px-]+(rgba?\(|#)/.test(p))) {
    return parts.map(canon).join(", ");
  }
  const shadow = /^((?:-?[\d.]+(?:px)?\s+){1,3}(?:-?[\d.]+(?:px)?)?)\s*(rgba?\([^)]*\)|#[0-9a-f]{3,6})$/i.exec(css);
  if (shadow) {
    const lengths = shadow[1].trim().split(/\s+/).map((l) => (l === "0" ? "0px" : l));
    while (lengths.length < 4) lengths.push("0px");
    return `${lengths.join(" ")} ${canonColor(shadow[2])}`;
  }
  if (parts.length > 1 || /^["']/.test(css)) return parts.map((f) => f.replace(/^["']|["']$/g, "")).join(", ");
  return canonColor(css);
}

/** Path of a custom property under the name rule. */
function pathOf(prop) {
  const name = prop.slice("--cai-".length);
  const cut = name.indexOf("-");
  return cut === -1 ? [name] : [name.slice(0, cut), name.slice(cut + 1)];
}

function at(json, path) {
  let node = json;
  for (const key of path) node = node?.[key];
  return node && !node.$type && node.$root ? node.$root : node;
}

/** Resolve a DTCG value in a mode: follow `{a.b.c}` aliases (in that mode). */
function resolveDtcg(json, value, mode) {
  for (let hops = 0; typeof value === "string" && /^\{.+\}$/.test(value); hops++) {
    expect(hops).toBeLessThan(10);
    const token = at(json, value.slice(1, -1).split("."));
    expect(token, `alias ${value}`).toBeTruthy();
    value = token.$extensions?.mode?.[mode] ?? token.$value;
  }
  return value;
}

describe.skipIf(!built)("DTCG export (packages/tokens/dist/cai-tokens.dtcg.json)", () => {
  const json = built ? JSON.parse(readFileSync(resolve(dist, "cai-tokens.dtcg.json"), "utf-8")) : {};
  const css = built ? blocks(readFileSync(resolve(dist, "tokens.css"), "utf-8")) : [];
  const primitives = css.find((b) => b.selector === ":root")?.decls ?? new Map();
  const modeDecls = (theme) => css.find((b) => b.selector.split(",").some((s) => s.trim() === `[data-theme="${theme}"]`))?.decls;

  /** Resolve var() chains: inside the mode first, then the primitives. */
  function resolveCss(value, decls) {
    for (let hops = 0; /^var\(/.test(value); hops++) {
      expect(hops).toBeLessThan(10);
      const ref = /^var\((--cai-[\w-]+)\)$/.exec(value)[1];
      value = decls.get(ref) ?? primitives.get(ref);
      expect(value, ref).toBeDefined();
    }
    return value;
  }

  it("is what the generator makes from the sources (reproducible)", () => {
    const tokens = JSON.parse(readFileSync(resolve(root, "packages/tokens/tokens.json"), "utf-8"));
    const semantic = readFileSync(resolve(root, "packages/tokens/src/semantic.css"), "utf-8");
    expect(json).toEqual(buildDtcg(tokens, semantic));
  });

  it("has every primitive, with the CSS value", () => {
    expect(primitives.size).toBeGreaterThan(50);
    for (const [prop, value] of primitives) {
      const token = at(json.primitives, pathOf(prop));
      expect(token, prop).toBeTruthy();
      expect(dtcgToCss(token.$value), prop).toBe(canon(value));
    }
  });

  it("has every semantic token in Light, Dark and High contrast, with the same resolved value", () => {
    const light = modeDecls("light");
    expect(light?.size).toBeGreaterThan(40);
    for (const [mode, theme] of Object.entries(MODES)) {
      const decls = modeDecls(theme);
      expect([...decls.keys()].sort(), theme).toEqual([...light.keys()].sort());
      for (const [prop, value] of decls) {
        const token = at(json.semantic, pathOf(prop));
        expect(token, prop).toBeTruthy();
        expect(token.$type, prop).toBe("color");
        const raw = token.$extensions?.mode?.[mode];
        expect(raw, `${prop} ${mode}`).toBeDefined();
        expect(dtcgToCss(resolveDtcg(json, raw, mode)), `${prop} in ${mode}`).toBe(canon(resolveCss(value, decls)));
      }
    }
  });

  it("keeps the aliases the CSS has, and $value is the Light mode", () => {
    for (const [prop, value] of modeDecls("light")) {
      const token = at(json.semantic, pathOf(prop));
      expect(token.$value, prop).toEqual(token.$extensions.mode.Light);
      const ref = /^var\((--cai-[\w-]+)\)$/.exec(value)?.[1];
      if (ref) {
        const collection = primitives.has(ref) ? "primitives" : "semantic";
        expect(at(json, token.$value.slice(1, -1).split(".")), prop).toBe(at(json[collection], pathOf(ref)));
      } else {
        expect(token.$value.colorSpace, prop).toBe("srgb");
      }
    }
  });

  it("declares the two collections and their modes", () => {
    expect(json.primitives.$extensions["com.cai-ds"]).toEqual({ collection: "CAI primitives", modes: ["Value"] });
    expect(json.semantic.$extensions["com.cai-ds"]).toEqual({ collection: "CAI semantic", modes: MODES });
  });

  it("is published as @cai-ds/tokens/dtcg", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "packages/tokens/package.json"), "utf-8"));
    expect(pkg.exports["./dtcg"]).toBe("./dist/cai-tokens.dtcg.json");
  });
});
