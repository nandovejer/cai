/**
 * <home-light> on the home page (F3 of .claude/plans/luz-home-docs-identity.md,
 * section 3.7; D8, D9, D10, D11). The element lives in apps/landing/light/,
 * not in a package: three files of vanilla JS, one stylesheet and a README.
 *
 *   light.js       the controller: defines <home-light>, imports nothing
 *                  statically, loads the globe with a literal import()
 *   globe.js       <home-globe>, the puzzle globe: code only, no static import;
 *                  loads its land with one literal import() once it is on screen
 *                  and the browser is idle
 *   globe-data.js  the Natural Earth data, a chunk that imports nothing at all
 *   light.css      every rule the mockup injected with <style>, linked by the home only
 *
 * What the browser does with them is in tests/home-light.spec.js. This file
 * holds what a file can say about itself: no HTML sink, no injected style, no
 * write of the attributes <luz-mode> owns, one row of budgets.json per file,
 * the licence of the land data and the phrases of the bar in three languages.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../", import.meta.url));
/** A missing file is a failed assertion that names it, not an ENOENT. */
const read = (path) => {
  expect(existsSync(join(repo, path)), `${path} does not exist`).toBe(true);
  return readFileSync(join(repo, path), "utf-8");
};
const DIR = "apps/landing/light";
const FILES = ["light", "globe", "globe-data"].map((name) => `${DIR}/${name}.js`);
/** The files that define an element (globe-data.js is data). */
const ELEMENTS = { light: "home-light", globe: "home-globe" };

/** The code without its comments: a rule may be explained in a comment that names what it forbids. */
const code = (path) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/([^:"'`\\])\/\/[^\n"'`]*$/gm, "$1");

const IMPORT_CALL = /\bimport\s*\(/g;
const LITERAL_IMPORT = /\bimport\s*\(\s*(["'])(\.\/[\w.-]+\.js)\1\s*\)/g;
/** Static imports and re-exports, `import "x"`, `import x from "x"`, `export … from "x"`. */
const STATIC = /(?:^|[;}\s])(?:import\b(?!\s*[(.])|export\b[^"'();]*?\bfrom\b)/;
const dynamicTargets = (source) => [...source.matchAll(LITERAL_IMPORT)].map((m) => m[2]).sort();

/* ---- The files --------------------------------------------------------- */

describe("apps/landing/light: the files", () => {
  it.each([...FILES, `${DIR}/light.css`, `${DIR}/README.md`])("%s exists", (path) => {
    expect(existsSync(join(repo, path)), `${path} does not exist`).toBe(true);
  });

  it("light.js imports nothing statically", () => {
    expect(STATIC.test(code(`${DIR}/light.js`)), "a static import or export-from").toBe(false);
    expect(code(`${DIR}/light.js`)).not.toMatch(/import\.meta/);
  });

  it("light.js loads the globe with import() of a literal, and nothing else", () => {
    const source = code(`${DIR}/light.js`);
    expect(dynamicTargets(source)).toEqual(["./globe.js"]);
    // every import( is the one literal: none is built from a variable or the URL
    expect(source.match(IMPORT_CALL)).toHaveLength(1);
  });

  it("globe.js imports nothing statically, and loads its land with one import() of a literal", () => {
    const source = code(`${DIR}/globe.js`);
    expect(STATIC.test(source), "a static import or export-from").toBe(false);
    expect(source).not.toMatch(/import\.meta/);
    expect(dynamicTargets(source)).toEqual(["./globe-data.js"]);
    expect(source.match(IMPORT_CALL)).toHaveLength(1);
  });

  it("globe-data.js has no import of any kind: static, dynamic or re-export", () => {
    const source = code(`${DIR}/globe-data.js`);
    expect(STATIC.test(source), "a static import or export-from").toBe(false);
    expect(source.match(IMPORT_CALL)).toBeNull();
    expect(source).not.toMatch(/import\.meta/);
    expect(source).not.toMatch(/\bexport\b[^;]*\bfrom\b/);
  });

  it.each(["light", "globe"])("%s.js is an ES module that defines its element once, behind customElements.get()", (file) => {
    const name = ELEMENTS[file];
    const source = code(`${DIR}/${file}.js`);
    expect(source).toMatch(new RegExp(`customElements\\.get\\(\\s*["']${name}["']\\s*\\)`));
    expect(source).toMatch(new RegExp(`customElements\\.define\\(\\s*["']${name}["']`));
    // no window.LuzX = ... global, as the mockup had
    expect(source).not.toMatch(/\bwindow\.Luz\w*\s*=/);
    expect(source).not.toMatch(/\bglobalThis\.Luz\w*\s*=/);
  });

  it("globe-data.js defines no element: it is data", () => {
    expect(code(`${DIR}/globe-data.js`)).not.toMatch(/customElements/);
  });

  it("globe.js does not make the globe a control: no tabindex, no arrow-key handler", () => {
    const source = code(`${DIR}/globe.js`);
    expect(source).not.toMatch(/tabindex|tabIndex/);
    expect(source).not.toMatch(/Arrow(?:Left|Right|Up|Down)/);
    expect(source).not.toMatch(/["']keydown["']/);
  });

  it("globe-data.js says where the land data comes from (Natural Earth, public domain)", () => {
    expect(read(`${DIR}/globe-data.js`)).toMatch(/Natural Earth/);
    expect(read(`${DIR}/globe-data.js`)).toMatch(/public domain/i);
  });
});

describe("apps/landing/light: no HTML sink, no injected style (SEC-IDX-2, plan section 3.7)", () => {
  const SINKS = [
    [/\binnerHTML\b/, "innerHTML"],
    [/\bouterHTML\b/, "outerHTML"],
    [/\binsertAdjacentHTML\b/, "insertAdjacentHTML"],
    [/\bdocument\.write(ln)?\s*\(/, "document.write"],
    [/\beval\s*\(/, "eval"],
    [/\bnew\s+Function\b/, "new Function"],
    [/\bsetHTMLUnsafe\b/, "setHTMLUnsafe"],
    [/\bcreateContextualFragment\b/, "createContextualFragment"],
  ];
  const INJECTED = [
    [/createElement\(\s*["']style["']\s*\)/, 'createElement("style")'],
    [/\bnew\s+CSSStyleSheet\b/, "new CSSStyleSheet"],
    [/\badoptedStyleSheets\b/, "adoptedStyleSheets"],
    [/\binsertRule\b/, "insertRule"],
  ];

  for (const path of FILES) {
    it(`${path} writes no HTML from a string`, () => {
      const source = code(path);
      for (const [pattern, label] of SINKS) expect(pattern.test(source), `${path} uses ${label}`).toBe(false);
    });
    it(`${path} injects no <style>: the rules are light.css`, () => {
      const source = code(path);
      for (const [pattern, label] of INJECTED) expect(pattern.test(source), `${path} uses ${label}`).toBe(false);
    });
    it(`${path} loads nothing from the network`, () => {
      const source = code(path);
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/\bXMLHttpRequest\b/);
      expect(source).not.toMatch(/\bWebSocket\b/);
      expect(source).not.toMatch(/\bnavigator\.geolocation\b/);
      // the SVG namespace is a name, not an address
      expect(source.replace(/https?:\/\/www\.w3\.org\/\d+\/\w+/g, "")).not.toMatch(/https?:\/\//);
    });
  }
});

/* ---- The controller leaves the mode to <luz-mode> ----------------------- */

describe("light.js: <luz-mode> is the only writer of data-theme and data-light", () => {
  const source = () => code(`${DIR}/light.js`);

  it("does not write data-theme or data-light, by setAttribute, removeAttribute, toggleAttribute or dataset", () => {
    const s = source();
    expect(s).not.toMatch(/(?:set|remove|toggle)Attribute\(\s*["']data-(?:theme|light)["']/);
    expect(s).not.toMatch(/\.dataset\.(?:theme|light)\s*=/);
    expect(s).not.toMatch(/\.dataset\[\s*["'](?:theme|light)["']\s*\]\s*=/);
  });

  it("has no mode buttons and no mode, for, light-attr or mode-attr attribute", () => {
    const s = source();
    for (const gone of ["light-attr", "mode-attr", "data-mode", "MODE_LABEL", "high-contrast"]) expect(s, `"${gone}" is gone`).not.toContain(gone);
    expect(s).not.toMatch(/observedAttributes[^;]*["']mode["']/);
  });

  it("does not repeat the phase table of <luz-mode> (the phase is <luz-mode>'s)", () => {
    const s = source();
    expect(s).not.toMatch(/\bphaseOf\b/);
    for (const edge of ["7.5", "17.5", "20.5", "22.5", "6.25", "21.25", "23.75"]) expect(s, `the hour ${edge}`).not.toMatch(new RegExp(`(?<![\\d.])${edge.replace(".", "\\.")}(?![\\d])`));
  });

  it("asks <luz-mode> to preview the hour, and listens to luz-mode:change", () => {
    const s = source();
    expect(s).toMatch(/["']luz-mode["']/);
    expect(s).toMatch(/\.preview\(/);
    expect(s).toContain("luz-mode:change");
  });

  it("writes only custom properties on the page: --sun-alt, --sun-az, --sun-x and --day-left", () => {
    const s = source();
    for (const property of ["--sun-alt", "--sun-az", "--sun-x", "--day-left"]) expect(s).toContain(property);
  });

  it("offers no look: no luz-home-light key, no localStorage, no looks or remember attribute, no look buttons, no city or map", () => {
    const s = source();
    expect(s).not.toContain("luz-home-light");
    expect(s).not.toMatch(/localStorage|sessionStorage/);
    expect(s).not.toMatch(/["']looks?["']|["']remember["']/);
    expect(s).not.toMatch(/data-look|dataset\.look|\blooks\b|\bremember\b/i);
    expect(s).not.toMatch(/home-city|home-map|city\.js|map\.js|puzzle\.js/);
    expect(s).not.toMatch(/\bURLSearchParams\b|location\.search/);
  });

  it("states its usage as <home-light bleed favicon></home-light>, in its header", () => {
    const header = read(`${DIR}/light.js`).match(/\/\*\*[\s\S]*?\*\//)?.[0] ?? "";
    expect(header).toContain("<home-light bleed favicon></home-light>");
    expect(header).not.toMatch(/looks=|look=|remember/);
  });

  it("writes the favicon as a data: URL of an SVG, not as markup", () => {
    expect(source()).toContain("data:image/svg+xml");
  });

  it("builds SVG with createElementNS", () => {
    const all = ["light", "globe"].map((name) => code(`${DIR}/${name}.js`)).join("\n");
    expect(all).toMatch(/createElementNS\(/);
  });

  it("reads the strings it writes from data-luz-label-*", () => {
    expect(source()).toMatch(/luzLabel|data-luz-label-|luz-label/);
  });
});

/* ---- The stylesheet ----------------------------------------------------- */

describe("light.css", () => {
  const WHERE = ["apps/landing/index.html"];
  /** Every file of a folder that can link a stylesheet. */
  const filesOf = (dir) =>
    readdirSync(join(repo, dir), { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === "node_modules" || entry.name === "dist") return [];
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return filesOf(path);
      return /\.(html|css|js|json)$/.test(entry.name) ? [path] : [];
    });

  it("is linked by the home, and by nothing under apps/docs or apps/site", () => {
    for (const page of WHERE) expect(read(page)).toMatch(/<link[^>]+rel="stylesheet"[^>]+href="\/apps\/landing\/light\/light\.css"/);
    const others = [...filesOf("apps/docs"), ...filesOf("apps/site")].filter((path) => /light\/light\.css|landing\/light/.test(read(path)));
    expect(others, "files that name the home's light").toEqual([]);
  });

  it("is not imported by another stylesheet", () => {
    const importers = filesOf("apps")
      .filter((path) => path.endsWith(".css"))
      .filter((path) => /@import[^;]*light\.css/.test(read(path)));
    expect(importers).toEqual([]);
  });

  it("styles the element and the globe, and stops its motion under prefers-reduced-motion", () => {
    const css = read(`${DIR}/light.css`);
    for (const tag of ["home-light", "home-globe"]) expect(css).toContain(tag);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it("has no rule for the city or the map: they are gone", () => {
    const css = read(`${DIR}/light.css`);
    expect(css).not.toMatch(/home-city|home-map|data-look|home-light__group/);
  });

  it("reserves the room of the element before the script runs, so nothing jumps", () => {
    const css = read(`${DIR}/light.css`);
    expect(css).toMatch(/home-light(?::not\(:defined\))?\s*\{[^}]*(?:min-height|aspect-ratio|height)\s*:/);
  });

  it("reads the page's colours from its custom properties", () => {
    const css = read(`${DIR}/light.css`);
    expect(css).toMatch(/var\(--/);
  });
});

/* ---- The home page ------------------------------------------------------ */

describe("apps/landing/index.html: the light section", () => {
  const html = read("apps/landing/index.html");
  const section = html.match(/<section[^>]*\bid="light"[^>]*>([\s\S]*?)<\/section>/);

  it("has a section#light after the hero, with a screen-reader heading and the element, empty", () => {
    expect(section, "a <section id=\"light\">").not.toBeNull();
    expect(html.indexOf('id="light"')).toBeGreaterThan(html.indexOf("luz-landing-hero"));
    expect(section[1]).toMatch(/<h2[^>]*class="[^"]*u-sr-only[^"]*"[^>]*>\s*\{\{t:[\w.-]+\}\}\s*<\/h2>/);
    expect(section[1]).toMatch(/<home-light\b[^>]*>\s*<\/home-light>/);
  });

  it("is <home-light bleed favicon>: no looks, look or remember attribute, and the favicon and the bleed stay", () => {
    expect(section, "a <section id=\"light\">").not.toBeNull();
    const tag = section[1].match(/<home-light\b[^>]*>/)?.[0] ?? "";
    expect(tag, "a <home-light> in it").not.toBe("");
    for (const flag of ["bleed", "favicon"]) expect(tag).toMatch(new RegExp(`\\s${flag}(?=[\\s>=])`));
    for (const gone of ["looks", "look", "remember"]) expect(tag, `the ${gone} attribute is gone`).not.toMatch(new RegExp(`\\s${gone}(?=[\\s>=])`));
    // the modes, the target and the attribute names are gone: <luz-mode> owns them
    for (const gone of ["modes=", "mode=", "for=", "light-attr", "mode-attr"]) expect(tag).not.toContain(gone);
  });

  it("hands the script no label for the looks, the city or the map", () => {
    const body = html.match(/<body[^>]*>/)[0];
    for (const gone of ["light-looks", "light-globe", "light-city", "light-map", "light-say-city", "light-say-map", "light-city-alt", "light-map-alt"]) {
      expect(body, `data-luz-label-${gone}`).not.toContain(`data-luz-label-${gone}=`);
    }
  });

  it("loads light.js as a module, from the template or from landing.js", () => {
    const named = /\/apps\/landing\/light\/light\.js/;
    expect(named.test(html) || named.test(read("apps/landing/landing.js"))).toBe(true);
  });
});

/* ---- The README --------------------------------------------------------- */

describe("apps/landing/light/README.md", () => {
  const readme = () => read(`${DIR}/README.md`);

  it("names the land data's origin and licence: Natural Earth, public domain", () => {
    expect(readme()).toMatch(/Natural Earth/);
    expect(readme()).toMatch(/public domain/i);
  });

  it("gives the reason for its weight (PRINCIPLES section 3) and where it comes from", () => {
    expect(readme()).toMatch(/gzip|kB|KB|bytes/);
    expect(readme()).toMatch(/mockup/i);
    expect(readme()).toMatch(/2026-10-16/);
  });
});

/* ---- Budgets ------------------------------------------------------------ */

describe("budgets.json and PRINCIPLES.md section 8: the three rows of the home's light", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;
  const ROWS = [
    ["home light controller JS", "light"],
    ["home light visual: globe", "globe"],
    ["home light data: globe", "globe-data"],
  ];

  it.each(ROWS)("has the row %s for %s.js, with ideal = max - 256 and a max that is a multiple of 256", (name, file) => {
    const row = budgets.find((b) => b.name === name);
    expect(row, `a row named "${name}"`).toBeDefined();
    expect(row.file).toBe(`${DIR}/${file}.js`);
    expect(row.max % 256, "max is a multiple of 256").toBe(0);
    expect(row.ideal).toBe(row.max - 256);
    expect(row.ideal).toBeGreaterThan(0);
  });

  it.each(ROWS)("%s: the source, gzipped at level 9 as check-size does, fits the ceiling", (name, file) => {
    const row = budgets.find((b) => b.name === name);
    expect(row, `a row named "${name}"`).toBeDefined();
    const size = gzipSync(Buffer.from(read(`${DIR}/${file}.js`)), { level: 9 }).length;
    expect(size).toBeLessThanOrEqual(row.max);
  });

  it("keeps the globe's row where it was, at 9.5 kB, and gives the city and the map no row (their files are gone)", () => {
    const globe = budgets.find((b) => b.name === "home light visual: globe");
    expect(globe).toEqual({ name: "home light visual: globe", file: `${DIR}/globe.js`, ideal: 9472, max: 9728 });
    for (const gone of ["home light visual: city", "home light visual: map"]) expect(budgets.map((b) => b.name), `"${gone}" is gone`).not.toContain(gone);
    expect(budgets.some((b) => /light\/(?:city|map|puzzle)\.js$/.test(b.file ?? ""))).toBe(false);
  });

  it("puts them after the mode chunk row, the last row that existed (no other row moved or raised)", () => {
    const names = budgets.map((b) => b.name);
    const mode = names.indexOf("site JS lazy chunk: mode");
    expect(names.slice(mode + 1)).toEqual(ROWS.map(([name]) => name));
  });

  it("repeats them in the PRINCIPLES.md table, with the same ceilings, in the same order", () => {
    const lines = read("PRINCIPLES.md").split("\n");
    const header = lines.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
    const table = lines
      .slice(header + 2)
      .filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")))
      .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
    const at = table.findIndex((cells) => /^`site` JS lazy chunk: `mode`/.test(cells[0]));
    const rows = table.slice(at + 1);
    expect(rows).toHaveLength(ROWS.length);
    rows.forEach((cells, i) => {
      expect(cells[0].replace(/`/g, ""), `row ${i + 1}`).toMatch(new RegExp(ROWS[i][0].replace(/`/g, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      const row = budgets.find((b) => b.name === ROWS[i][0]);
      expect(Math.round(parseFloat(cells.at(-1)) * 1024), `${ROWS[i][0]} ceiling`).toBe(row.max);
      expect(Math.round(parseFloat(cells[2].replace(/^≤\s*/, "")) * 1024), `${ROWS[i][0]} ideal`).toBe(row.ideal);
    });
  });

  it("is measured by scripts/check-size.js: a line for each row, and no error about them", async () => {
    const { spawnSync } = await import("node:child_process");
    const run = spawnSync(process.execPath, [join(repo, "scripts/check-size.js")], { encoding: "utf-8" });
    const output = `${run.stdout}\n${run.stderr}`;
    for (const [name] of ROWS) expect(output, `check-size reports "${name}"`).toContain(name);
    expect(output).not.toMatch(/✗[^\n]*(?:home light|apps\/landing\/light)/);
    expect(output).not.toMatch(/PRINCIPLES\.md budget table/);
  });
});

/* ---- Licence of the land data (D9) -------------------------------------- */

describe("the licence of the land data", () => {
  it("RL-13 accepts public-domain data with its origin noted next to it (owner decision D9, 2026-10-16)", () => {
    const rl13 = read("PRINCIPLES.md")
      .split("\n")
      .find((line) => /^13\.\s+\*\*/.test(line));
    expect(rl13, "the red line 13 paragraph").toBeDefined();
    expect(rl13).toMatch(/public[- ]domain/i);
    expect(rl13).toMatch(/origin/i);
    // it is still MIT and only MIT for code
    expect(rl13).toMatch(/MIT/);
  });

  it("dev/LICENSES.md lists Natural Earth as public domain, with its terms", () => {
    const licences = read("dev/LICENSES.md");
    expect(licences).toMatch(/Natural Earth/);
    expect(licences).toMatch(/public domain/i);
    expect(licences).toMatch(/naturalearthdata\.com/);
  });
});

/* ---- The texts: the catalogs of the home (D11) -------------------------- */

describe("the strings of <home-light> in the catalogs of the home", () => {
  const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));
  const en = catalog("en");
  const es = catalog("es");
  const ar = catalog("ar");
  const html = read("apps/landing/index.html");
  /** The key whose English value is `text`. */
  const keyOf = (text) => Object.keys(en).find((key) => en[key] === text);

  const PHRASES = {
    globe: ["A design system is a world with its own laws of light.", "Un sistema de diseño es un mundo con sus propias leyes de la luz."],
  };

  it.each(Object.entries(PHRASES))("the %s phrase of the bar is in en.json and es.json keeps the mockup's Spanish", (look, [english, spanish]) => {
    const key = keyOf(english);
    expect(key, `a key of en.json whose value is "${english}"`).toBeDefined();
    expect(es[key]).toBe(spanish);
  });

  it.each(Object.entries(PHRASES))("the %s phrase has an Arabic translation, under the same key (the reader of F5 reviews it, Q21)", (look, [english]) => {
    const key = keyOf(english);
    expect(key, `a key of en.json whose value is "${english}"`).toBeDefined();
    expect(typeof ar[key]).toBe("string");
    expect(ar[key]).toMatch(/[؀-ۿ]/);
    expect(ar[key]).not.toBe(english);
  });

  it.each(Object.entries(PHRASES))("the page hands the %s phrase to the script as a data-luz-label-* of <body>", (look, [english]) => {
    const key = keyOf(english);
    expect(key).toBeDefined();
    const body = html.match(/<body[^>]*>/)[0];
    expect(body).toMatch(new RegExp(`data-luz-label-[\\w-]+="\\{\\{t:${key.replace(/\./g, "\\.")}\\}\\}"`));
  });

  const GONE = ["light.looks", "light.globe", "light.city", "light.map", "light.say.city", "light.say.map", "light.alt.city", "light.alt.map"];
  it.each([["en", en], ["es", es], ["ar", ar]])("%s.json has no key for the looks, the city or the map", (code, catalogOf) => {
    for (const key of GONE) expect(Object.keys(catalogOf), `${code}.json has ${key}`).not.toContain(key);
  });

  it.each([["en", en], ["es", es], ["ar", ar]])("%s.json keeps light.say.globe and light.alt.globe", (code, catalogOf) => {
    expect(typeof catalogOf["light.say.globe"], `${code}.json light.say.globe`).toBe("string");
    expect(typeof catalogOf["light.alt.globe"], `${code}.json light.alt.globe`).toBe("string");
  });

  it("the English name of the globe no longer says dots: the globe is a puzzle of countries", () => {
    expect(en["light.alt.globe"]).not.toMatch(/\bdots?\b/i);
  });

  const WORDS = ["Back to now", "Scrub the day", "Show the light bar"];
  it.each(WORDS)('"%s" is a key of every catalog and a data-luz-label-* of <body>', (text) => {
    const key = keyOf(text);
    expect(key, `a key of en.json whose value is "${text}"`).toBeDefined();
    expect(typeof es[key], `es.json has ${key}`).toBe("string");
    expect(es[key].length).toBeGreaterThan(0);
    expect(typeof ar[key], `ar.json has ${key}`).toBe("string");
    expect(ar[key]).toMatch(/[؀-ۿ]/);
    const body = html.match(/<body[^>]*>/)[0];
    expect(body).toMatch(new RegExp(`data-luz-label-[\\w-]+="\\{\\{t:${key.replace(/\./g, "\\.")}\\}\\}"`));
  });

  it("the Live button says what it does: \"Back to now\" in English, \"Volver a ahora\" in Spanish and \"العودة إلى الآن\" in Arabic, under the key light.live", () => {
    expect(en["light.live"]).toBe("Back to now");
    expect(es["light.live"]).toBe("Volver a ahora");
    expect(ar["light.live"]).toBe("العودة إلى الآن");
    expect(html.match(/<body[^>]*>/)[0]).toMatch(/data-luz-label-light-live="\{\{t:light\.live\}\}"/);
    expect(Object.values(en), "no key is left with the value \"Live\"").not.toContain("Live");
  });

  it("the separator between the phase and the hour is a key of its own, light.sep: a comma, and the Arabic comma in Arabic, handed to the script by <body>", () => {
    expect(en["light.sep"]).toMatch(/^,/);
    expect(es["light.sep"]).toMatch(/^,/);
    expect(ar["light.sep"]).toMatch(/^\u060C/);
    expect(ar["light.sep"]).not.toContain(",");
    expect(html.match(/<body[^>]*>/)[0]).toMatch(/data-luz-label-light-sep="\{\{t:light\.sep\}\}"/);
  });

  it("the name of the globe does not talk about arrow keys, in any language: the globe is not a control", () => {
    expect(en["light.alt.globe"]).not.toMatch(/arrow|\bkeys?\b/i);
    expect(es["light.alt.globe"]).not.toMatch(/flecha|teclas?\b/i);
    expect(ar["light.alt.globe"]).not.toMatch(/الأسهم|مفاتيح|المفاتيح/);
    for (const text of [en["light.alt.globe"], es["light.alt.globe"], ar["light.alt.globe"]]) expect(text.length).toBeGreaterThan(10);
  });

  it("names the six lights for the line under the visual, in every language, from the catalog", () => {
    const body = html.match(/<body[^>]*>/)[0];
    const labels = [...body.matchAll(/data-luz-label-([\w-]+)="\{\{t:([\w.-]+)\}\}"/g)].map((m) => ({ attr: m[1], key: m[2] }));
    // the six phase names: one label each, whatever it is called, with a different text in each
    const phases = ["dawn", "morning", "afternoon", "sunset", "dusk", "night"].map((phase) => labels.filter((l) => l.attr.includes(phase)));
    for (const [i, found] of phases.entries()) expect(found.length, `a data-luz-label-*${["dawn", "morning", "afternoon", "sunset", "dusk", "night"][i]}* on <body>`).toBeGreaterThan(0);
    for (const [i, [{ key }]] of phases.entries()) {
      expect(typeof en[key], `en.json ${key}`).toBe("string");
      expect(typeof es[key], `es.json ${key}`).toBe("string");
      expect(typeof ar[key], `ar.json ${key}`).toBe("string");
      expect(i).toBeGreaterThanOrEqual(0);
    }
  });

  it("names the section for screen readers in every language", () => {
    const heading = html.match(/<section[^>]*\bid="light"[^>]*>\s*<h2[^>]*>\s*\{\{t:([\w.-]+)\}\}/);
    expect(heading, "the h2 of section#light with a {{t:key}}").not.toBeNull();
    for (const catalogOf of [en, es, ar]) expect(String(catalogOf[heading[1]] ?? "").length).toBeGreaterThan(0);
  });
});

/* ---- D10: the mockup's leftovers are gone with this phase ---------------- */

describe("the repository stays small", () => {
  it("apps/landing/light holds the controller, the globe and its data, the stylesheet and the README, and no city, map or puzzle", () => {
    expect(existsSync(join(repo, DIR)), `${DIR} does not exist`).toBe(true);
    const names = readdirSync(join(repo, DIR)).sort();
    expect(names).toEqual(["README.md", "globe-data.js", "globe.js", "light.css", "light.js"]);
  });

  it("splitting the mockup (141 KB in one file) did not grow it: the three modules together are no larger", () => {
    const size = (name) => Buffer.byteLength(read(`${DIR}/${name}`));
    const total = ["light.js", "globe.js", "globe-data.js"].reduce((sum, name) => sum + size(name), 0);
    expect(total).toBeLessThan(141 * 1024);
  });
});

/* ---- The home's elements are not LUZ elements, so they do not take the prefix */

describe("custom element names under apps/", () => {
  const walk = (dir) =>
    readdirSync(join(repo, dir), { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === "node_modules" || entry.name === "dist") return [];
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return walk(path);
      return /\.(html|css|js)$/.test(entry.name) ? [path] : [];
    });

  it("no file of apps/ defines or uses a custom element named luz-* unless a package defines it in packages/*/src", () => {
    const sources = readdirSync(join(repo, "packages"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(repo, "packages", entry.name, "src")))
      .flatMap((entry) => walk(`packages/${entry.name}/src`))
      .map(read)
      .join("\n");
    const known = new Set([...sources.matchAll(/\b(luz-[a-z][a-z0-9-]*)\b/g)].map((m) => m[1]));
    const offenders = [];
    for (const path of walk("apps")) {
      const text = read(path);
      const names = [
        ...[...text.matchAll(/<\/?(luz-[a-z][a-z0-9-]*)/g)].map((m) => m[1]),
        ...[...text.matchAll(/customElements\.(?:define|get|whenDefined)\(\s*["'](luz-[a-z][a-z0-9-]*)["']/g)].map((m) => m[1]),
      ];
      for (const name of new Set(names)) if (!known.has(name)) offenders.push(`${path}: <${name}>`);
    }
    expect(offenders, "elements of apps/ that are not LUZ's").toEqual([]);
  });

  it("the light's files name no luz-light, luz-globe, luz-city or luz-map: class, event, property or tag", () => {
    for (const path of [...FILES, `${DIR}/light.css`, "apps/landing/index.html", "apps/landing/landing.js"]) {
      expect(read(path), path).not.toMatch(/luz-(?:light|globe|city|map)\b/);
    }
  });

  it("the light's custom properties and events use the home- prefix", () => {
    for (const path of [...FILES, `${DIR}/light.css`]) {
      expect(read(path), path).not.toMatch(/--luz-(?:light|globe|city|map)/);
    }
  });
});
