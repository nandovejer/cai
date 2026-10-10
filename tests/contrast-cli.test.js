/**
 * CAI — the contrast engine and `cai-tokens check-contrast`
 * (packages/tokens/lib, packages/tokens/bin). The engine is shared with
 * scripts/check-contrast.js and with the docs pages; these tests pin the
 * colour reader, the cascade model and the command's report and exit codes,
 * and that the pairs the docs pages print are pairs the command checks.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PAIRS, expandPairs, formatRatio, parseColor, ratio } from "../packages/tokens/lib/contrast.js";
import { run } from "../packages/tokens/lib/cli.js";
import { site } from "./helpers/docs-site.js";

const tokensPath = fileURLToPath(new URL("../packages/tokens/dist/tokens.css", import.meta.url));
const built = existsSync(tokensPath);

/** Run the command over in-memory files. */
const check = (files, args = []) =>
  run(["check-contrast", ...Object.keys(files), ...args], {
    tokensPath,
    read: (path) => {
      if (path in files) return files[path];
      return readFileSync(path, "utf-8");
    },
  });
const json = (files, args = []) => JSON.parse(check(files, [...args, "--json"]).stdout);

describe("parseColor and ratio", () => {
  it("reads hex, rgb and hsl in both syntaxes, and the three keywords", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("#00000080").a).toBeCloseTo(0.502, 2);
    expect(parseColor("rgb(10 20 30 / 50%)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor("rgba(10, 20, 30, 0.25)").a).toBe(0.25);
    expect(parseColor("hsl(0 100% 50%)")).toMatchObject({ r: 255, g: 0, b: 0 });
    expect(parseColor("transparent").a).toBe(0);
  });

  it("refuses what it cannot measure instead of guessing", () => {
    for (const value of ["rebeccapurple", "color-mix(in srgb, red, blue)", "oklch(0.7 0.1 200)", "var(--x)"]) {
      expect(() => parseColor(value), value).toThrow(/cannot read the colour/);
    }
  });

  it("gives the WCAG ratios: 21:1 for black on white, 1:1 for equal colours", () => {
    expect(ratio(parseColor("#000"), parseColor("#fff"))).toBeCloseTo(21, 5);
    expect(ratio(parseColor("#777"), parseColor("#777"))).toBe(1);
    expect(formatRatio(4.549)).toBe("4.5:1");
  });
});

describe.skipIf(!built)("cai-tokens check-contrast", () => {
  it("passes CAI's own tokens, with nothing overridden", () => {
    const report = json({ "empty.css": "" });
    expect(report.ok).toBe(true);
    expect(report.modes).toEqual(["light", "dark", "high-contrast"]);
    expect(report.checked).toBeGreaterThan(300);
    expect(check({ "empty.css": "" }).code).toBe(0);
  });

  it("fails a text pair below 4.5:1, says where the colour was set, and exits 1", () => {
    const css = ":root {\n  --cai-text-secondary: #999;\n}\n";
    const result = check({ "my.css": css });
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/✗ .*light.*--cai-text-secondary on surface-page is 2\.8:1, needs 4\.5:1 \(text\)/);
    expect(result.stdout).toContain("--cai-text-secondary: #999 is set in my.css:2");
    const report = json({ "my.css": css });
    expect(report.ok).toBe(false);
    const f = report.failures.find((x) => x.mode === "light" && x.background === "surface-page");
    expect(f).toMatchObject({ foreground: "--cai-text-secondary", minimum: 4.5, kind: "text" });
    expect(f.overrides).toEqual([{ token: "--cai-text-secondary", value: "#999", file: "my.css", line: 2 }]);
  });

  it("holds a focus ring and a field border to 3:1, as UI components", () => {
    const report = json({ "my.css": ":root { --cai-focus-ring: #eee; --cai-input-border: #ddd; }" });
    const kinds = new Set(report.failures.map((f) => f.kind));
    expect(kinds).toEqual(new Set(["ui"]));
    expect(report.failures.every((f) => f.minimum === 3)).toBe(true);
  });

  it("applies [data-theme] blocks to their own mode only", () => {
    const report = json({ "my.css": '[data-theme="dark"] { --cai-text-primary: #555; }' });
    const modes = new Set(report.failures.map((f) => f.mode));
    expect(modes).toEqual(new Set(["dark"]));
  });

  it("lets a later :root win over CAI's dark block at equal specificity, as the browser does", () => {
    // #555 is fine on the light page and unreadable on the dark one
    const report = json({ "my.css": ":root { --cai-text-primary: #555; }" });
    expect(new Set(report.failures.map((f) => f.mode))).toEqual(new Set(["dark"]));
  });

  it("lets a more specific selector win over a later one", () => {
    const css = ':root[data-theme="dark"] { --cai-text-primary: #fff; }\n[data-theme="dark"] { --cai-text-primary: #555; }';
    expect(json({ "my.css": css }).ok).toBe(true);
  });

  it("reads prefers-color-scheme as the dark and light modes", () => {
    const css = "@media (prefers-color-scheme: dark) { :root { --cai-text-primary: #555; } }";
    expect(new Set(json({ "my.css": css }).failures.map((f) => f.mode))).toEqual(new Set(["dark"]));
  });

  it("checks a custom theme and its three modes, from the light values", () => {
    const css = '[data-theme="brand"] { --cai-surface-page: #fffff0; --cai-brand-primary: #6fa8ff; }';
    const report = json({ "my.css": css });
    expect(report.modes).toEqual(["light", "dark", "high-contrast", "brand", "brand/light", "brand/dark", "brand/high-contrast"]);
    expect(report.failures.some((f) => f.mode === "brand" && f.foreground === "--cai-brand-primary")).toBe(true);
  });

  it("resolves var() chains and their fallbacks", () => {
    const css = ":root { --my-grey: #999; --cai-text-secondary: var(--my-grey); }";
    expect(json({ "my.css": css }).ok).toBe(false);
  });

  it("counts a colour it cannot read as a failure, and names the override", () => {
    const css = ":root { --cai-text-primary: color-mix(in srgb, red, blue); }";
    const result = check({ "my.css": css });
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("was not measured");
    expect(result.stdout).toContain("--cai-text-primary: color-mix(in srgb, red, blue) is set in my.css:1");
    expect(json({ "my.css": css }).unreadable.length).toBeGreaterThan(0);
  });

  it("lists what it did not read, and leaves it out of the verdict", () => {
    const css = ".card { --cai-text-primary: #000; }\n@media (min-width: 40em) { :root { --cai-text-primary: #000; } }";
    const report = json({ "my.css": css });
    expect(report.ok).toBe(true);
    expect(report.ignored.map((i) => i.reason).join("\n")).toMatch(/only html, :root/);
    expect(report.ignored.map((i) => i.reason).join("\n")).toMatch(/min-width/);
  });

  it("ignores comments and keeps line numbers", () => {
    const css = "/* a\n   comment */\n:root {\n  /* --cai-text-primary: #fff; */\n  --cai-text-secondary: #aaa;\n}";
    const report = json({ "my.css": css });
    expect(report.failures[0].overrides[0]).toMatchObject({ token: "--cai-text-secondary", line: 5 });
  });

  it("exits 2 for a missing file, an unknown command or option, and no file", () => {
    expect(check({}, []).code).toBe(2);
    expect(run(["check-contrast", "nope.css"], { tokensPath, read: () => { throw new Error("cannot read nope.css: no such file"); } })).toMatchObject({ code: 2 });
    expect(run(["frobnicate"], { tokensPath, read: () => "" }).code).toBe(2);
    expect(run(["check-contrast", "x.css", "--wat"], { tokensPath, read: () => "" }).code).toBe(2);
    expect(run(["--help"], { tokensPath, read: () => "" }).code).toBe(0);
  });
});

describe("the pairs the docs pages print", () => {
  it("are all pairs the command checks, at least as strictly", () => {
    const known = new Map(expandPairs(PAIRS).map((p) => [`${p.fg}|${p.bg}`, p.min]));
    const missing = [];
    for (const page of site.pages) {
      if (page.meta.area !== "components" && page.meta.group !== "patterns") continue;
      for (const [row] of page.body.matchAll(/<tr><td data-label="Part">[\s\S]*?<\/tr>/g)) {
        const cells = [...row.matchAll(/<td data-label="[^"]+"><div>([\s\S]*?)<\/div><\/td>/g)].map((m) => m[1]);
        if (cells.length < 6) continue;
        const tokens = [...cells[1].matchAll(/<code>--cai-([\w-]+)<\/code>/g)].map((m) => m[1]);
        const [fg, ...bg] = tokens;
        const min = Number(cells.at(-1).replace(":1", ""));
        const key = `${fg}|${bg.join(" > ")}`;
        // The command may hold a pair to more than the page needs (an icon
        // is 3:1 on the page, and the command keeps its text to 4.5:1)
        if (!(known.get(key) >= min)) missing.push(`${page.file}: ${key} needs ${min}:1`);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
