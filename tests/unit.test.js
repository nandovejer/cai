/**
 * Unit tests for LUZ Design System utilities
 * Run with: pnpm test:unit
 */

import { describe, it, expect } from "vitest";
import { resolve, dirname } from "path";
import { existsSync, readFileSync } from "fs";
import {
  formatTime,
  isCustomTheme,
  isValidMode,
  calculateProgress,
  escapeHtml,
} from "../packages/core/src/utils.js";

describe("formatTime", () => {
  it("formats seconds into MM:SS", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(125)).toBe("2:05");
    expect(formatTime(3661)).toBe("61:01");
  });

  it("pads single-digit seconds", () => {
    expect(formatTime(1)).toBe("0:01");
    expect(formatTime(9)).toBe("0:09");
    expect(formatTime(61)).toBe("1:01");
  });

  it("handles invalid input", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
    expect(formatTime(-0.1)).toBe("0:00");
  });

  it("handles edge cases", () => {
    expect(formatTime(0.5)).toBe("0:00");
    expect(formatTime(59.9)).toBe("0:59");
    expect(formatTime(60.5)).toBe("1:00");
  });
});

describe("isCustomTheme", () => {
  const customThemes = ["brand", "docs"];

  it("identifies the themes it is given", () => {
    expect(isCustomTheme("brand", customThemes)).toBe(true);
    expect(isCustomTheme("docs", customThemes)).toBe(true);
  });

  it("rejects the base modes and unknown names", () => {
    expect(isCustomTheme("light", customThemes)).toBe(false);
    expect(isCustomTheme("dark", customThemes)).toBe(false);
    expect(isCustomTheme("unknown", customThemes)).toBe(false);
  });

  it("LUZ ships no theme: with no list nothing is a custom theme", () => {
    expect(isCustomTheme("vejer")).toBe(false);
    expect(isCustomTheme("minimalist")).toBe(false);
  });
});

describe("isValidMode", () => {
  const modes = ["light", "dark", "high-contrast"];

  it("validates allowed modes", () => {
    expect(isValidMode("light", modes)).toBe(true);
    expect(isValidMode("dark", modes)).toBe(true);
    expect(isValidMode("high-contrast", modes)).toBe(true);
  });

  it("rejects invalid modes", () => {
    expect(isValidMode("bright", modes)).toBe(false);
    expect(isValidMode("unknown", modes)).toBe(false);
    expect(isValidMode("", modes)).toBe(false);
  });

  it("uses default modes if not provided", () => {
    expect(isValidMode("light")).toBe(true);
    expect(isValidMode("dark")).toBe(true);
    expect(isValidMode("high-contrast")).toBe(true);
  });
});

describe("calculateProgress", () => {
  it("calculates progress percentage", () => {
    expect(calculateProgress(0, 100)).toBe(0);
    expect(calculateProgress(50, 100)).toBe(50);
    expect(calculateProgress(100, 100)).toBe(100);
  });

  it("handles partial progress", () => {
    expect(calculateProgress(30, 120)).toBe(25);
    expect(calculateProgress(45, 90)).toBe(50);
  });

  it("clamps to 0-100 range", () => {
    expect(calculateProgress(-10, 100)).toBe(0);
    expect(calculateProgress(150, 100)).toBe(100);
  });

  it("handles invalid input", () => {
    expect(calculateProgress(NaN, 100)).toBe(0);
    expect(calculateProgress(50, 0)).toBe(0);
    expect(calculateProgress(0, NaN)).toBe(0);
  });

  it("handles zero duration", () => {
    expect(calculateProgress(10, 0)).toBe(0);
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("handles complex HTML", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("handles ampersands correctly", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("preserves normal text", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
    expect(escapeHtml("123")).toBe("123");
  });

  it("handles empty strings", () => {
    expect(escapeHtml("")).toBe("");
  });
});

const tokensDist = resolve(process.cwd(), "packages/tokens/dist/luz-tokens.css");
const coreDist = resolve(process.cwd(), "packages/core/dist");
const distBuilt = existsSync(tokensDist) && existsSync(resolve(coreDist, "luz.js"));

if (!distBuilt) {
  console.warn(
    "[unit.test] dist/ not built — dist-dependent suites will be SKIPPED. Run `pnpm build` first.",
  );
}

describe("check-dist sentinel (BUG-01)", () => {
  it("sentinel path points to packages/tokens/dist/luz-tokens.css", () => {
    expect(tokensDist).toMatch(/packages[/\\]tokens[/\\]dist[/\\]luz-tokens\.css$/);
  });

  it.skipIf(!distBuilt)("script exits cleanly when sentinel exists (post-build)", () => {
    expect(existsSync(tokensDist)).toBe(true);
  });
});

describe.skipIf(!distBuilt)("tokens semantic layer (regression: lost Layer 2)", () => {
  it("dist/luz-tokens.css contains the semantic layer for all base modes", () => {
    const content = readFileSync(tokensDist, "utf-8");
    expect(content).toContain("--luz-surface-page");
    expect(content).toContain("--luz-text-primary");
    expect(content).toContain('[data-theme="light"]');
    expect(content).toContain('[data-theme="dark"]');
    expect(content).toContain('[data-theme="high-contrast"]');
    expect(content).not.toContain("Semantic layer not found");
  });
});

describe.skipIf(!distBuilt)("dist build artifacts (BUG-02)", () => {
  it("dist/midi.js exists as an independent chunk after build", () => {
    expect(existsSync(resolve(coreDist, "midi.js"))).toBe(true);
  });

  it("dist/luz.js does not contain MidiParser (midi.js is lazy-loaded)", () => {
    const content = readFileSync(resolve(coreDist, "luz.js"), "utf-8");
    expect(content).not.toContain("MidiParser");
  });

  it("dist/table-sort.js is a chunk of its own with no import, and luz.js does not contain its code", () => {
    const chunk = readFileSync(resolve(coreDist, "table-sort.js"), "utf-8");
    expect(chunk).toContain("initTableSort");
    expect(chunk).not.toMatch(/^\s*import\b/m);
    const entry = readFileSync(resolve(coreDist, "luz.js"), "utf-8");
    expect(entry).not.toContain("Intl.Collator");
    expect(entry).toMatch(/import\(["']\.\/table-sort\.js["']\)/);
    // The minified entry loads the minified chunk, the one that is budgeted
    expect(readFileSync(resolve(coreDist, "luz.min.js"), "utf-8")).toContain("./table-sort.min.js");
    expect(existsSync(resolve(coreDist, "table-sort.min.js"))).toBe(true);
  });

  it("per-component CSS files are emitted for standalone use", () => {
    for (const f of ["button.css", "form.css", "meter.css", "modal.css", "player.css"]) {
      expect(existsSync(resolve(coreDist, "components", f))).toBe(true);
    }
  });

  it("individual JS modules are emitted (granular exports)", () => {
    for (const f of [
      "utils.js",
      "theme.js",
      "sidebar.js",
      "clipboard.js",
      "modal.js",
      "highlight.js",
      "player.js",
      "tabs.js",
    ]) {
      expect(existsSync(resolve(coreDist, f))).toBe(true);
    }
  });

  it("dist/base.css carries the settings the components depend on", () => {
    const content = readFileSync(resolve(coreDist, "base.css"), "utf-8");
    expect(content).toContain("--luz-z-modal");
    expect(content).toContain("--luz-duration-base");
  });

  it("core ships no docs-app selectors", () => {
    for (const f of ["luz.js", "luz.css", "classless.css", "print.css"]) {
      expect(readFileSync(resolve(coreDist, f), "utf-8")).not.toMatch(/\.docs-|#demo-form/);
    }
  });
});

describe.skipIf(!distBuilt)("dist: English in the entry, every other language a lazy file (F6)", () => {
  const text = (name) => readFileSync(resolve(coreDist, name), "utf-8");
  const source = resolve(process.cwd(), "packages/core/src/i18n/es.json");
  const loads = (file, target) => new RegExp(`import\\(\\s*["']\\./${target}["']\\s*\\)`).test(text(file));

  it("dist/i18n-es.js and dist/i18n-es.min.js exist, and the unminified one is `export default` of the JSON, with no import", () => {
    expect(existsSync(resolve(coreDist, "i18n-es.js"))).toBe(true);
    expect(existsSync(resolve(coreDist, "i18n-es.min.js"))).toBe(true);
    const chunk = text("i18n-es.js");
    expect(/^\s*export default \{[\s\S]*\};?\s*$/.test(chunk), "dist/i18n-es.js is exactly `export default {…}`").toBe(true);
    expect(/\bimport\b/.test(chunk), "dist/i18n-es.js has an import").toBe(false);
    const body = chunk.trim().replace(/^export default /, "").replace(/;$/, "");
    const expected = JSON.parse(readFileSync(source, "utf-8"));
    delete expected.$header;
    expect(JSON.parse(body)).toEqual(expected);
  });

  it("neither the entry nor the standalone module carries a Spanish string", () => {
    const files = ["luz.js", "luz.min.js", "i18n.js", "i18n.min.js"];
    for (const file of files) expect(text(file).includes("Reproducir"), `${file} has "Reproducir"`).toBe(false);
    const es = JSON.parse(readFileSync(source, "utf-8"));
    delete es.$header;
    for (const file of files) {
      for (const [key, value] of Object.entries(es)) {
        if (/\P{ASCII}|\s/u.test(value)) expect(text(file).includes(value), `${file} has the Spanish "${key}"`).toBe(false);
      }
    }
  });

  it("luz.js and i18n.js import ./i18n-es.js by a literal; the minified files import ./i18n-es.min.js", () => {
    expect(loads("luz.js", "i18n-es\\.js")).toBe(true);
    expect(loads("i18n.js", "i18n-es\\.js")).toBe(true);
    expect(text("luz.min.js")).toContain("./i18n-es.min.js");
    expect(text("i18n.min.js")).toContain("./i18n-es.min.js");
    expect(loads("luz.min.js", "i18n-es\\.min\\.js")).toBe(true);
    expect(loads("i18n.min.js", "i18n-es\\.min\\.js")).toBe(true);
  });

  it("the entry and the standalone module both export loadLocales", () => {
    expect(/export\s*\{[^}]*\bloadLocales\b[^}]*\}/.test(text("luz.js")), "luz.js").toBe(true);
    expect(/export\s+(?:async\s+)?function\s+loadLocales\b/.test(text("i18n.js")), "i18n.js").toBe(true);
  });
});

describe.skipIf(!distBuilt)("published CSS only references files that ship", () => {
  const cssFiles = [
    tokensDist,
    resolve(process.cwd(), "packages/tokens/dist/fonts.css"),
  ];

  it.each(cssFiles)("every url() in %s resolves inside dist", (cssFile) => {
    const urls = [...readFileSync(cssFile, "utf-8").matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)]
      .map((m) => m[1])
      .filter((u) => !/^(data:|https?:)/.test(u));
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(existsSync(resolve(dirname(cssFile), u)), `${u} (from ${cssFile})`).toBe(true);
    }
  });
});
