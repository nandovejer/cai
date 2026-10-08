/**
 * CAI — the red lines of PRINCIPLES.md that can be checked on the sources,
 * without a browser. The browser half is tests/red-lines.spec.js; stylelint
 * (stylelint.config.js) and ESLint (eslint.config.js) cover the CSS and JS
 * rules; scripts/check-*.js cover sizes, contrast tokens and generated files.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf-8");
const SKIP = new Set(["node_modules", "dist", ".git"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}
const filesIn = (dirs, extensions) =>
  dirs.flatMap((dir) => [...walk(resolve(root, dir))]).filter((p) => extensions.includes(extname(p).toLowerCase()));
const rel = (path) => relative(root, path);

const { debt } = JSON.parse(read("tests/fixtures/red-line-debt.json"));
const unregistered = (check, offenders) =>
  offenders.filter((text) => !debt.some((entry) => entry.check === check && text.includes(entry.match)));

/* ---- The debt register itself --------------------------------------------- */

describe("red-line debt register (tests/fixtures/red-line-debt.json)", () => {
  it("names the red line, the check, the match and what to do for every entry", () => {
    for (const entry of debt) {
      expect(entry.rl).toMatch(/^RL-\d+$/);
      expect(["third-party", "focus", "state-cue", "disabled-contrast", "hover-contrast", "token-contrast"]).toContain(entry.check);
      expect(entry.match.length).toBeGreaterThan(5);
      expect(entry.what.length).toBeGreaterThan(20);
    }
  });

  // PRINCIPLES.md, "Migration": a red-line breach is fixed before the next
  // release. CI sets CAI_RELEASE on main and on pull requests into main.
  it.runIf(process.env.CAI_RELEASE === "true")("is empty before a release", () => {
    expect(debt.map((e) => `${e.rl}: ${e.what}`)).toEqual([]);
  });
});

/* ---- RL-1: no runtime dependency ------------------------------------------ */

describe("RL-1: no runtime dependency", () => {
  const manifests = ["package.json", ...["packages", "apps"].flatMap((dir) =>
    readdirSync(resolve(root, dir))
      .map((name) => `${dir}/${name}/package.json`)
      .filter((path) => existsSync(resolve(root, path))),
  )];

  it.each(manifests)("%s has no dependencies", (path) => {
    const manifest = JSON.parse(read(path));
    for (const field of ["dependencies", "optionalDependencies", "bundleDependencies", "bundledDependencies"]) {
      const names = Object.keys(manifest[field] ?? {}).map((key) => (Array.isArray(manifest[field]) ? manifest[field][key] : key));
      // A private app consumes the three packages; nothing else ships to a page
      const allowed = path.startsWith("apps/") && field === "dependencies" ? (name) => name.startsWith("@cai-ds/") : () => false;
      expect(names.filter((name) => !allowed(name)), `${path} ${field}`).toEqual([]);
    }
    // The layers require each other, and nothing else
    for (const name of Object.keys(manifest.peerDependencies ?? {})) {
      expect(name, `${path} peerDependencies`).toMatch(/^@cai-ds\//);
    }
  });
});

/* ---- RL-8: one switch for reduced motion ---------------------------------- */

describe("RL-8: every duration token is zeroed under prefers-reduced-motion", () => {
  const settings = read("packages/core/src/settings/_settings.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const reduce = settings.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const declared = [...new Set([...settings.matchAll(/(--cai-duration-[\w-]+)\s*:/g)].map((m) => m[1]))];

  it("declares durations and a reduce block", () => {
    expect(declared.length).toBeGreaterThan(2);
    expect(reduce).not.toBe("");
  });

  it.each(declared)("%s is 0 in the reduce block", (token) => {
    expect(reduce).toMatch(new RegExp(`${token}\\s*:\\s*0m?s\\s*;`));
  });

  it("no other file redefines a duration token (it would escape the switch)", () => {
    const offenders = filesIn(["packages", "apps"], [".css", ".html"])
      .filter((p) => !p.endsWith("_settings.css"))
      .filter((p) => /--cai-duration-[\w-]+\s*:/.test(readFileSync(p, "utf-8")))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});

/* ---- RL-12: no third-party request ---------------------------------------- */

describe("RL-12: no third-party URL in a place that loads it", () => {
  const EXTERNAL = /^\s*(https?:)?\/\//i;
  const LOADING_TAGS = /<(img|source|track|video|audio|script|iframe|embed|object|input|use|image|link)\b[^>]*>/gi;
  const LOADING_ATTRS = /\s(src|srcset|poster|data|href|xlink:href|imagesrcset)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  const FETCHING_RELS = /\b(stylesheet|preload|modulepreload|prefetch|preconnect|dns-prefetch|icon|manifest|apple-touch-icon)\b/i;

  /** Markup that is shown as code is text, not a request. */
  const live = (html) =>
    html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(pre|code|template|textarea)\b[\s\S]*?<\/\1>/gi, "");

  const cssUrls = (css) =>
    [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/g)].map((m) => m[1] ?? m[2]);

  const offenders = [];
  for (const path of filesIn(["apps", "packages"], [".html"])) {
    const html = live(readFileSync(path, "utf-8"));
    for (const [tag] of html.matchAll(LOADING_TAGS)) {
      if (/^<link\b/i.test(tag) && !FETCHING_RELS.test(tag.match(/\brel\s*=\s*["']([^"']*)/i)?.[1] ?? "")) continue;
      for (const m of tag.matchAll(LOADING_ATTRS)) {
        const values = (m[3] ?? m[4]).split(",").map((v) => v.trim().split(/\s+/)[0]);
        for (const value of values) if (EXTERNAL.test(value)) offenders.push(`${rel(path)}: ${value}`);
      }
    }
    for (const [, style] of html.matchAll(/style\s*=\s*"([^"]*)"/gi)) {
      for (const url of cssUrls(style)) if (EXTERNAL.test(url)) offenders.push(`${rel(path)}: ${url}`);
    }
    for (const [, css] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      for (const url of cssUrls(css)) if (EXTERNAL.test(url)) offenders.push(`${rel(path)}: ${url}`);
    }
  }
  for (const path of filesIn(["apps", "packages"], [".css"])) {
    for (const url of cssUrls(readFileSync(path, "utf-8").replace(/\/\*[\s\S]*?\*\//g, ""))) {
      if (EXTERNAL.test(url)) offenders.push(`${rel(path)}: ${url}`);
    }
  }

  it("in the HTML and CSS of the packages and the apps", () => {
    expect(unregistered("third-party", offenders)).toEqual([]);
  });
});

/* ---- RL-13: bundled fonts are MIT only ------------------------------------ */

describe("RL-13: every bundled font has an MIT-only licence next to it", () => {
  const FONT = [".woff2", ".woff", ".ttf", ".otf", ".eot"];
  const MIT = /Permission is hereby granted, free of charge/;
  const OTHER = /Open Font License|\bOFL\b|Apache License|GNU (Lesser )?General Public|Creative Commons|Ubuntu Font Licen[cs]e|Bitstream|\bdual[- ]licen[cs]ed\b|either (the )?licen[cs]e/i;
  const fonts = filesIn(["packages", "apps"], FONT);

  /** LICENSE-<Name>.txt in the font's folder or a parent, <Name> a prefix of the file name. */
  const licenceOf = (font) => {
    const stem = basename(font).replace(/[-_.].*$/, "").toLowerCase();
    for (let dir = dirname(font); dir.startsWith(root) && dir !== root; dir = dirname(dir)) {
      const match = readdirSync(dir).find((name) => {
        const m = name.match(/^LICENSE-(.+)\.txt$/i);
        return m && stem.startsWith(m[1].toLowerCase());
      });
      if (match) return join(dir, match);
    }
    return null;
  };

  it.each(fonts.map(rel))("%s", (font) => {
    const licence = licenceOf(resolve(root, font));
    expect(licence, `no LICENSE-<Font>.txt for ${font}`).not.toBeNull();
    const text = readFileSync(licence, "utf-8");
    expect(text, `${rel(licence)} is not the MIT licence`).toMatch(MIT);
    expect(text.match(OTHER)?.[0], `${rel(licence)} names another licence`).toBeUndefined();
  });
});

/* ---- RL-15: no new status colour, no new meaning --------------------------- */

describe("RL-15: status colours keep their set and their meaning", () => {
  // Changing either list changes the meaning of colour: it needs its own
  // changeset and the maintainer's approval (PRINCIPLES.md §6).
  const COLOR_TOKENS = [
    "--cai-color-code", "--cai-color-danger", "--cai-color-danger-bg", "--cai-color-danger-fill",
    "--cai-color-info", "--cai-color-info-bg", "--cai-color-purple", "--cai-color-purple-bg",
    "--cai-color-success", "--cai-color-success-bg", "--cai-color-teal", "--cai-color-teal-bg",
    "--cai-color-warning", "--cai-color-warning-accent", "--cai-color-warning-bg",
  ];
  // Modifier → the status it means. Hue names map to their one meaning.
  const MEANING = {
    success: "success", green: "success",
    danger: "danger", error: "danger", red: "danger",
    warning: "warning", yellow: "warning",
    info: "info", blue: "info",
    teal: "teal", purple: "purple",
  };
  const STATUS_BLOCKS = /\.cai-(alert|tag|badge|toast|btn|input|progress|meter|platform-[\w-]+)--([a-z]+)\b/g;

  const css = filesIn(["packages"], [".css"]).map((p) => [rel(p), readFileSync(p, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "")]);

  it("no new --cai-color-* token, in the base modes or the custom themes", () => {
    const declared = new Set(css.flatMap(([, text]) => [...text.matchAll(/(--cai-color-[\w-]+)\s*:/g)].map((m) => m[1])));
    expect([...declared].filter((name) => !COLOR_TOKENS.includes(name))).toEqual([]);
  });

  it("no app redefines a status colour", () => {
    const offenders = filesIn(["apps"], [".css", ".html"])
      .filter((p) => /--cai-color-[\w-]+\s*:/.test(readFileSync(p, "utf-8")))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("a status modifier only uses the colour of its own meaning", () => {
    const offenders = [];
    for (const [file, text] of css) {
      for (const [, selector, body] of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const meanings = new Set([...selector.matchAll(STATUS_BLOCKS)].map((m) => MEANING[m[2]]).filter(Boolean));
        if (meanings.size !== 1) continue;
        const [meaning] = meanings;
        for (const [, used] of body.matchAll(/--cai-color-(success|danger|warning|info|teal|purple)\b/g)) {
          if (used !== meaning) offenders.push(`${file}: ${selector.trim()} (${meaning}) uses --cai-color-${used}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
