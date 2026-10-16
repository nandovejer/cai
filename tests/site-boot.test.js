/**
 * apps/site/boot.js: the colour mode and the light before the first paint
 * (F2 of .claude/plans/luz-home-docs-identity.md, section 3.4; EX-009). The
 * browser side (the first frame, the six lights on the real pages) is in
 * tests/site-boot.spec.js; here the script runs in a sandbox with a fake
 * <html>, storage, media queries and clock.
 *
 * The rules, in order:
 *   1. a stored choice under core's "luz-theme" key (light, dark or
 *      high-contrast) is that mode, with its light pinned: light is the
 *      afternoon, dark and high contrast are the night;
 *   2. else prefers-contrast: more is the high contrast mode, at night;
 *   3. else the phase of the local hour (the boundaries of phaseOf in
 *      packages/site/src/mode.js) is data-light, and dawn, dusk and night
 *      are dark, the others light. The system's colour scheme is not read.
 * Storage may throw. The script is classic (no import) and writes nothing.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { phaseOf } from "../packages/site/src/mode.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const BOOT = "apps/site/boot.js";
const exists = () => expect(existsSync(join(repo, BOOT)), `${BOOT} exists`).toBe(true);
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");

const DARK = ["dawn", "dusk", "night"];
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

let script;
/** Run boot.js once and return what it wrote on <html> and what it asked of the browser. */
function run({ stored, hour = 14, minute = 0, contrastMore = false, schemeDark = false, storage = "works" } = {}) {
  exists();
  script ??= new vm.Script(read(BOOT), { filename: BOOT });
  const attrs = new Map();
  const dataset = new Proxy({}, { set: (_, k, v) => (attrs.set(`data-${kebab(String(k))}`, String(v)), true), get: (_, k) => attrs.get(`data-${kebab(String(k))}`) });
  const html = {
    dataset,
    setAttribute: (k, v) => void attrs.set(k, String(v)),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    hasAttribute: (k) => attrs.has(k),
    removeAttribute: (k) => void attrs.delete(k),
  };
  const reads = [];
  const writes = [];
  const fixed = new Date(2026, 5, 15, hour, minute, 0).getTime();
  const ctx = {
    document: { documentElement: html },
    matchMedia: (query) => ({
      media: query,
      matches: (contrastMore && /prefers-contrast:\s*more/.test(query)) || (schemeDark && /prefers-color-scheme:\s*dark/.test(query)),
      addEventListener() {},
      addListener() {},
    }),
    Date: class extends Date {
      constructor(...args) {
        if (args.length) super(...args);
        else super(fixed);
      }
      static now() {
        return fixed;
      }
    },
  };
  if (storage === "works") {
    const value = (k) => (k === "luz-theme" && stored !== undefined ? stored : null);
    const methods = {
      getItem: (k) => (reads.push(k), value(k)),
      setItem: (k) => void writes.push(k),
      removeItem: (k) => void writes.push(k),
    };
    // localStorage["luz-theme"] reads the key as well as localStorage.getItem("luz-theme")
    ctx.localStorage = new Proxy(methods, { get: (target, k) => (k in target ? target[k] : typeof k === "string" ? (reads.push(k), value(k)) : undefined) });
  } else if (storage === "getItem throws") {
    ctx.localStorage = {
      getItem() {
        throw new DOMException("denied", "SecurityError");
      },
    };
  } else {
    Object.defineProperty(ctx, "localStorage", {
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
  }
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  script.runInContext(ctx);
  return { theme: attrs.get("data-theme") ?? null, light: attrs.get("data-light") ?? null, reads, writes };
}

describe("boot.js is a classic script that carries the exception", () => {
  it("has no import and no export, and names EX-009", () => {
    exists();
    const source = read(BOOT);
    expect(code(source)).not.toMatch(/\b(?:import|export)\b/);
    expect(source).toContain("EX-009");
  });

  it("is the file EXCEPTIONS.md EX-009 names, and apps/landing/theme-boot.js is not", () => {
    const row = read("EXCEPTIONS.md")
      .split("\n")
      .find((line) => line.startsWith("| EX-009"));
    expect(row).toContain("apps/site/boot.js");
    expect(row).not.toContain("theme-boot");
  });

  it("is read by the pages that carry it as the key of core: luz-theme, never luz-site-mode", () => {
    exists();
    expect(code(read(BOOT))).toContain("luz-theme");
    expect(code(read(BOOT))).not.toContain("luz-site-mode");
  });
});

describe("a stored choice wins, with its light pinned", () => {
  it.each([
    ["light", "light", "afternoon"],
    ["dark", "dark", "night"],
    ["high-contrast", "high-contrast", "night"],
  ])("%s is %s, light %s, at any hour", (stored, theme, light) => {
    for (const hour of [3, 6, 9, 14, 19, 21, 23]) {
      expect(run({ stored, hour }), `${stored} at ${hour}h`).toMatchObject({ theme, light });
    }
  });

  it("wins over prefers-contrast: more and over the system's dark scheme", () => {
    expect(run({ stored: "light", hour: 23, contrastMore: true, schemeDark: true })).toMatchObject({ theme: "light", light: "afternoon" });
    expect(run({ stored: "dark", hour: 10, schemeDark: false })).toMatchObject({ theme: "dark", light: "night" });
  });

  it("reads core's key and nothing else, and writes nothing", () => {
    const { reads, writes } = run({ stored: "dark" });
    expect(reads.length).toBeGreaterThan(0);
    expect([...new Set(reads)]).toEqual(["luz-theme"]);
    expect(writes).toEqual([]);
  });
});

describe("a stored value that is not a mode is not a choice", () => {
  it.each(["auto", "Dark", "purple", "", " dark", "dark ", "midnight", "1", "null", "undefined", "[object Object]", "__proto__", "light,dark"])("%j falls through to the clock", (stored) => {
    expect(run({ stored, hour: 9 })).toMatchObject({ theme: "light", light: "morning" });
    expect(run({ stored, hour: 21, minute: 30 })).toMatchObject({ theme: "dark", light: "dusk" });
  });

  it("falls through to prefers-contrast: more as well", () => {
    expect(run({ stored: "auto", hour: 9, contrastMore: true })).toMatchObject({ theme: "high-contrast", light: "night" });
  });

  it("the old key is not read: a value under luz-site-mode changes nothing", () => {
    expect(run({ hour: 9 }).reads).not.toContain("luz-site-mode");
  });
});

describe("with no choice", () => {
  it("prefers-contrast: more is the high contrast mode, at night, at any hour", () => {
    for (const hour of [4, 6, 9, 14, 19, 21, 23]) {
      expect(run({ hour, contrastMore: true }), `${hour}h`).toMatchObject({ theme: "high-contrast", light: "night" });
    }
  });

  it("the light is the phase of the local hour at every minute of the day, and dawn, dusk and night are dark", () => {
    const wrong = [];
    for (let minute = 0; minute < 24 * 60; minute++) {
      const hour = Math.floor(minute / 60);
      const got = run({ hour, minute: minute % 60 });
      const light = phaseOf(minute / 60);
      const theme = DARK.includes(light) ? "dark" : "light";
      if (got.light !== light || got.theme !== theme) wrong.push(`${String(hour).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")} ${got.theme}/${got.light}, wanted ${theme}/${light}`);
    }
    expect(wrong.slice(0, 10)).toEqual([]);
  });

  it("turns at the minute: 04:59 night, 05:00 dawn, 07:30 morning, 20:30 dusk, 22:30 night", () => {
    const at = (hour, minute) => run({ hour, minute }).light;
    expect([at(4, 59), at(5, 0), at(7, 29), at(7, 30), at(20, 29), at(20, 30), at(22, 29), at(22, 30)]).toEqual(["night", "dawn", "dawn", "morning", "sunset", "dusk", "dusk", "night"]);
  });

  it("does not read the system's colour scheme: the clock decides", () => {
    expect(run({ hour: 14, schemeDark: true })).toMatchObject({ theme: "light", light: "afternoon" });
    expect(run({ hour: 23, schemeDark: false })).toMatchObject({ theme: "dark", light: "night" });
  });

  it("writes nothing to storage", () => {
    expect(run({ hour: 9 }).writes).toEqual([]);
  });
});

describe("storage that throws (a sandboxed frame)", () => {
  it.each(["getItem throws", "localStorage throws"])("%s: the clock decides, and the script does not throw", (storage) => {
    expect(run({ storage, hour: 9 })).toMatchObject({ theme: "light", light: "morning" });
    expect(run({ storage, hour: 23 })).toMatchObject({ theme: "dark", light: "night" });
    expect(run({ storage, hour: 9, contrastMore: true })).toMatchObject({ theme: "high-contrast", light: "night" });
  });
});

/* ---- Where it is loaded from ----------------------------------------------- */

describe("the pages load it from apps/site, in <head>, as a classic script", () => {
  const SRC = '<script src="/apps/site/boot.js"></script>';
  it.each(["apps/docs/_layouts/page.html", "apps/landing/index.html"])("%s", (file) => {
    const html = read(file);
    expect(html).toContain(SRC);
    expect(html.indexOf(SRC), "in <head>").toBeLessThan(html.indexOf("</head>"));
    expect(html).not.toContain("theme-boot");
  });

  it("the not-found page keeps its promise of no script", () => {
    expect(read("apps/docs/_layouts/not-found.html")).not.toMatch(/<script/);
  });

  it("the Pages build emits it unhashed, as boot.js", () => {
    const plugin = read("scripts/docs-site/plugin.js");
    expect(plugin).toMatch(/THEME_BOOT\s*=\s*\{\s*src:\s*"\/apps\/site\/boot\.js",\s*out:\s*"boot\.js"\s*\}/);
    expect(plugin).not.toContain("theme-boot");
  });

  it("the favicons are apps/site/assets", () => {
    for (const file of ["apps/docs/_layouts/page.html", "apps/docs/_layouts/not-found.html", "apps/landing/index.html"]) {
      expect(read(file), file).toContain('href="/apps/site/assets/favicon.ico"');
      expect(read(file), file).not.toContain("apps/landing/assets");
    }
  });
});

describe("the old key and the old paths are gone from the apps", () => {
  it("no file of apps/ or scripts/ names luz-site-mode, theme-boot or the old site-header files", () => {
    const hits = [];
    const walk = (dir) => {
      for (const entry of readdirSync(join(repo, dir))) {
        if (entry === "node_modules" || entry === "dist") continue;
        const rel = `${dir}/${entry}`;
        if (statSync(join(repo, rel)).isDirectory()) walk(rel);
        else if (/\.(html|js|css|json)$/.test(entry)) {
          read(rel)
            .split("\n")
            .forEach((line, i) => {
              if (/luz-site-mode|theme-boot|apps\/docs\/site-header|\.\/site-header\.(?:js|css)/.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 80)}`);
            });
        }
      }
    };
    walk("apps");
    walk("scripts");
    expect(hits).toEqual([]);
  });
});

describe("the texts that say how the site follows the clock", () => {
  it("AGENTS.md says where the header and the shared partials are, and no longer names the old files", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("apps/site/header.js");
    expect(agents).not.toContain("apps/docs/site-header");
    // "the landing includes the shared partials from apps/site/_partials"
    expect(agents).toMatch(/apps\/site\/_partials/);
    expect(agents).not.toMatch(/apps\/docs\/_partials\/(?:header|site-links|footer)\.html/);
  });

  it("dev/STRUCTURE.md lists apps/site and what is in it", () => {
    const structure = read("dev/STRUCTURE.md");
    for (const name of ["apps/site", "boot.js", "theme-light.css", "header.js", "header.css", "_partials"]) expect(structure, name).toContain(name);
  });

  it("EX-009 names apps/site/boot.js and says that it also sets data-light", () => {
    const row = read("EXCEPTIONS.md")
      .split("\n")
      .find((line) => line.startsWith("| EX-009"));
    expect(row).toContain("apps/site/boot.js");
    expect(row).toContain("data-light");
    expect(row).not.toContain("apps/docs/site-header");
  });

  it("the accessibility statement says that the site follows the clock in Auto, dark from 20:30 to 07:30, and that its four lights meet the same contrast", () => {
    const page = read("apps/docs/pages/accessibility.html");
    expect(page).toMatch(/\bAuto\b/);
    expect(page).toContain("20:30");
    expect(page).toContain("07:30");
    // In the same item: the four lights and the contrast they meet
    const items = page.split(/<\/li>|<\/p>/);
    expect(items.some((item) => /four lights/i.test(item) && /contrast/i.test(item)), "an item that says the four lights meet the contrast").toBe(true);
    // The clock and the Auto radio about the site itself (not only about <luz-mode>)
    expect(items.some((item) => /20:30/.test(item) && /\bAuto\b/.test(item) && /\bsite\b/i.test(item)), "an item that says the site follows the clock in Auto").toBe(true);
  });
});
