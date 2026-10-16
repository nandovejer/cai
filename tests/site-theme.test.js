/**
 * apps/site/theme-light.css: the four lights of the site (F2 of
 * .claude/plans/luz-home-docs-identity.md, sections 3.3 and 3.4).
 *
 * Afternoon and night are Vejer itself (light and dark): they have no block.
 * Only four lights override tokens, each over the mode it belongs to, and
 * the high contrast mode is never overridden:
 *
 *   :root[data-theme="light"][data-light="morning"]   over light
 *   :root[data-theme="light"][data-light="sunset"]    over light
 *   :root[data-theme="dark"][data-light="dawn"]       over dark
 *   :root[data-theme="dark"][data-light="dusk"]       over dark
 *
 * Each block is complete, like a theme: the colour tokens of
 * packages/core/src/themes/_template.css and color-scheme, in literal
 * colours. Every pair of pairsFor() (packages/tokens/lib/contrast.js) passes
 * in each block layered over its base mode, measured the way
 * scripts/check-contrast.js measures a theme. The light cross-fades: the
 * colour tokens are registered with @property (the Vejer light value is the
 * initial value) and transition on :root, only when motion is welcome.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createResolver, measure, pairsFor, parseColor } from "../packages/tokens/lib/contrast.js";
import { resolveColor } from "./helpers/design-tokens.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const FILE = "apps/site/theme-light.css";

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const squash = (text) => text.replace(/\s+/g, " ").trim();
/** The declarations of a body: { "--luz-x": "value", "color-scheme": "dark", ... }. */
const declarations = (body) => Object.fromEntries([...body.matchAll(/(--[\w-]+|[a-z-]+)\s*:\s*([^;{}]+?)\s*(?:;|$)/g)].map((m) => [m[1], squash(m[2])]));

/**
 * The items of a stylesheet: { selector, props } for a rule, { at, prelude, items } for a
 * conditional group (@media), { at: "property", name, props } for @property.
 */
function parse(css) {
  const text = strip(css);
  const items = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    const semi = text.indexOf(";", i);
    if (open === -1) break;
    if (semi !== -1 && semi < open) {
      i = semi + 1;
      continue;
    }
    const prelude = squash(text.slice(i, open));
    let depth = 1;
    let j = open + 1;
    while (depth && j < text.length) {
      depth += text[j] === "{" ? 1 : text[j] === "}" ? -1 : 0;
      j++;
    }
    const inner = text.slice(open + 1, j - 1);
    if (prelude.startsWith("@property")) items.push({ at: "property", name: prelude.slice("@property".length).trim(), props: declarations(inner) });
    else if (prelude.startsWith("@")) items.push({ at: prelude.split(/\s/)[0].slice(1), prelude, items: parse(inner) });
    else items.push({ selector: prelude, props: declarations(inner) });
    i = j;
  }
  return items;
}

const exists = () => {
  expect(existsSync(join(repo, FILE)), `${FILE} exists`).toBe(true);
};
const items = () => {
  exists();
  return parse(read(FILE));
};
const rules = () => items().filter((x) => x.selector !== undefined);
const properties = () => items().filter((x) => x.at === "property");
const motion = () => items().filter((x) => x.at === "media");

const LIGHTS = [
  ["morning", "light", ':root[data-theme="light"][data-light="morning"]'],
  ["sunset", "light", ':root[data-theme="light"][data-light="sunset"]'],
  ["dawn", "dark", ':root[data-theme="dark"][data-light="dawn"]'],
  ["dusk", "dark", ':root[data-theme="dark"][data-light="dusk"]'],
];
const block = (selector) => rules().find((r) => r.selector === selector);

/* ---- The tokens of the template and of the base modes -------------------- */

const colours = (names) => names.filter((n) => !n.startsWith("--luz-shadow-")).sort();
const template = (() => {
  const css = strip(read("packages/core/src/themes/_template.css"));
  const light = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, selector]) => squash(selector).startsWith('[data-theme="my-brand"],'));
  return colours(Object.keys(declarations(light[2])));
})();
/**
 * The status colours (--luz-color-*: success, danger, warning, info, teal, purple, code) keep
 * Vejer's values in every light: RL-15 (tests/red-lines.test.js, "no app redefines a status
 * colour") forbids an app to declare one. A block is complete over every other colour token.
 */
const STATUS = /^--luz-color-/;
const own = template.filter((name) => !STATUS.test(name));

const primitives = {};
for (const [family, steps] of Object.entries(JSON.parse(read("packages/tokens/tokens.json")).color)) {
  for (const [step, { value }] of Object.entries(steps)) primitives[`--luz-${family}-${step}`] = value;
}
const base = {};
for (const [, selector, body] of strip(read("packages/tokens/src/semantic.css")).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  for (const s of selector.split(",").map(squash)) {
    const name = s.match(/^\[data-theme="([\w-]+)"\]$/)?.[1];
    if (["light", "dark"].includes(name)) base[name] = { ...base[name], ...declarations(body) };
  }
}

/* ---- The four blocks ------------------------------------------------------ */

describe("theme-light.css has the four lights and nothing else", () => {
  it("has exactly the four blocks, over light and over dark", () => {
    expect(rules().map((r) => r.selector).sort()).toEqual(LIGHTS.map(([, , selector]) => selector).sort());
  });

  it("overrides neither the high contrast mode nor afternoon and night, which are Vejer itself", () => {
    const css = strip((exists(), read(FILE)));
    expect(css).not.toMatch(/high-contrast/);
    expect(css).not.toMatch(/data-light="(?:afternoon|night)"/);
  });

  it.each(LIGHTS)("%s declares the colour tokens the theme template declares, except the status colours, and color-scheme: %s", (light, mode, selector) => {
    const found = block(selector);
    expect(found, `a block for ${selector}`).toBeTruthy();
    const { "color-scheme": scheme, ...tokens } = found.props;
    expect(colours(Object.keys(tokens))).toEqual(own);
    expect(scheme).toBe(mode);
  });

  it.each(LIGHTS)("%s declares no --luz-color-* token: the status colours keep Vejer's values (RL-15)", (light, mode, selector) => {
    const found = block(selector);
    expect(found, `a block for ${selector}`).toBeTruthy();
    expect(Object.keys(found.props).filter((name) => STATUS.test(name))).toEqual([]);
  });

  it.each(LIGHTS)("%s is written in literal colours, as a theme is", (light, mode, selector) => {
    const found = block(selector);
    expect(found, `a block for ${selector}`).toBeTruthy();
    for (const [name, value] of Object.entries(found.props)) {
      if (name === "color-scheme") continue;
      expect(() => parseColor(value), `${selector} ${name}: ${value}`).not.toThrow();
    }
  });
});

/* ---- Contrast -------------------------------------------------------------- */

describe("every contrast pair passes in each light, layered over its base mode", () => {
  it.each(LIGHTS)("%s over %s", (light, mode, selector) => {
    const found = block(selector);
    expect(found, `a block for ${selector}`).toBeTruthy();
    const values = { ...primitives, ...base.light, ...(mode === "dark" ? base.dark : {}), ...found.props };
    const { results, unreadable } = measure(createResolver(values), pairsFor(mode));
    expect(unreadable.map((u) => `${u.foreground} on ${u.background}: ${u.reason}`)).toEqual([]);
    expect(results.length).toBeGreaterThan(50);
    const failing = results.filter((r) => !r.ok && !r.advisory).map((r) => `${r.foreground} on ${r.background} is ${r.ratio.toFixed(2)}:1 (needs ${r.minimum}:1)`);
    expect(failing, `${light}`).toEqual([]);
  });

});

/**
 * scripts/check-contrast.js in a copy of the repository's layout: its own file, the packages
 * linked, and the stylesheet of the lights as given, so the script under test is the real one.
 */
function runCheckContrast(css) {
  const dir = mkdtempSync(join(tmpdir(), "luz-check-contrast-"));
  try {
    mkdirSync(join(dir, "scripts"));
    mkdirSync(join(dir, "tests/fixtures"), { recursive: true });
    mkdirSync(join(dir, "apps/site"), { recursive: true });
    writeFileSync(join(dir, "package.json"), '{"type":"module"}');
    copyFileSync(join(repo, "scripts/check-contrast.js"), join(dir, "scripts/check-contrast.js"));
    copyFileSync(join(repo, "tests/fixtures/red-line-debt.json"), join(dir, "tests/fixtures/red-line-debt.json"));
    symlinkSync(join(repo, "packages"), join(dir, "packages"));
    writeFileSync(join(dir, "apps/site/theme-light.css"), css);
    const done = spawnSync(process.execPath, ["scripts/check-contrast.js"], { cwd: dir, encoding: "utf-8" });
    return { code: done.status, output: `${done.stdout}${done.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("scripts/check-contrast.js reads the lights and fails the build on a pair that does not pass", () => {
  it("passes the lights of the repository", () => {
    exists();
    const done = runCheckContrast(read(FILE));
    expect(done.output).not.toMatch(/✗/);
    expect(done.code).toBe(0);
  });

  it.each(LIGHTS)("fails, and names %s, when the text of that light meets the page of that light at 1:1", (light, mode, selector) => {
    exists();
    // The text takes the colour of the page, in that block only
    const css = strip(read(FILE));
    const surface = block(selector).props["--luz-surface-page"];
    const start = css.indexOf(`[data-light="${light}"]`);
    expect(start, `${selector} in the file`).toBeGreaterThanOrEqual(0);
    const end = css.indexOf("}", start);
    const body = css.slice(start, end).replace(/(--luz-text-primary\s*:\s*)[^;]+;/, `$1${surface};`);
    const broken = css.slice(0, start) + body + css.slice(end);
    expect(broken).not.toBe(css);
    const done = runCheckContrast(broken);
    expect(done.code, done.output).toBe(1);
    expect(done.output).toContain(light);
  });
});

/* ---- The cross-fade -------------------------------------------------------- */

const same = (a, b) => {
  const [x, y] = [parseColor(a), parseColor(b)];
  return ["r", "g", "b", "a"].every((k) => Math.abs(x[k] - y[k]) < 0.5 / (k === "a" ? 255 : 1));
};
/**
 * The colour tokens whose value is not the same in every state the page can be in: the three
 * modes of Vejer and the four lights. A transition on :root fades every one of them on every
 * switch, so every one is registered: a registered token interpolates, an unregistered one
 * jumps, and a fade where half of the page jumps is worse than none.
 */
const fading = () => {
  const names = new Set();
  for (const name of template) {
    const states = ["light", "dark", "high-contrast"].map((mode) => resolveColor(mode, name));
    for (const [, , selector] of LIGHTS) {
      const value = block(selector)?.props[name];
      if (value) states.push(value);
    }
    if (states.some((value) => !same(value, states[0]))) names.add(name);
  }
  return [...names].sort();
};

describe("the light cross-fades", () => {
  it("registers every colour token that is not the same in every mode and light with @property: <color>, inherits, the Vejer light value as its initial value", () => {
    const registered = properties();
    const needed = fading();
    expect(needed.length, "the modes and the lights change many tokens").toBeGreaterThan(40);
    expect(registered.map((p) => p.name).sort()).toEqual(expect.arrayContaining(needed));
    for (const { name, props } of registered) {
      expect(props.syntax, `${name} syntax`).toMatch(/^["']<color>["']$/);
      expect(props.inherits, `${name} inherits`).toBe("true");
      expect(props["initial-value"], `${name} initial-value`).toBeTruthy();
      expect(same(props["initial-value"], resolveColor("light", name)), `${name}: ${props["initial-value"]} is Vejer's light ${resolveColor("light", name)}`).toBe(true);
    }
  });

  it("transitions those tokens on :root over 1.4s", () => {
    const registered = properties().map((p) => p.name);
    const groups = motion().flatMap((m) => m.items.filter((r) => r.selector === ":root"));
    expect(groups.length, "a :root rule in the motion media query").toBeGreaterThan(0);
    const text = groups.map((g) => [g.props.transition, g.props["transition-property"], g.props["transition-duration"]].join(" ")).join(" ");
    for (const name of registered) expect(text, name).toContain(name);
    expect(text).toMatch(/\b1\.4s\b|\b1400ms\b/);
  });

  it("transitions only when motion is welcome: nowhere outside prefers-reduced-motion: no-preference", () => {
    const welcome = (prelude) => prelude.replace(/\s+/g, "").toLowerCase() === "@media(prefers-reduced-motion:no-preference)";
    const moves = (x) => Object.keys(x.props ?? {}).some((n) => n.startsWith("transition") || n.startsWith("animation"));
    const inside = motion().filter((group) => welcome(group.prelude));
    expect(inside.length, "a (prefers-reduced-motion: no-preference) group").toBeGreaterThan(0);
    // Any other conditional group (forced-colors, say) may exist, but it does not move anything
    for (const group of motion().filter((g) => !welcome(g.prelude))) expect(group.items.filter(moves).map((x) => x.selector), group.prelude).toEqual([]);
    const outside = [...rules(), ...properties()].filter(moves);
    expect(outside.map((x) => x.selector ?? x.name)).toEqual([]);
  });
});

/* ---- Where it is linked ------------------------------------------------------ */

describe("the pages that are in a light link its stylesheet", () => {
  // Unlayered: it wins over the layers whatever its place among the links, so only its presence is checked
  it.each(["apps/docs/_layouts/page.html", "apps/landing/index.html"])("%s links /apps/site/theme-light.css", (file) => {
    expect(/<link\b[^>]*rel="stylesheet"[^>]*href="\/apps\/site\/theme-light\.css"/.test(read(file)), `${file} links the stylesheet`).toBe(true);
  });

  it("the 404 page, which has no script and so no light, does not", () => {
    expect(read("apps/docs/_layouts/not-found.html").includes("theme-light.css")).toBe(false);
  });
});
