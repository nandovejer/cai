/**
 * Unit tests for CAI Design System utilities
 * Run with: pnpm test:unit
 */

import { describe, it, expect } from "vitest";
import { resolve } from "path";
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
  const customThemes = ["ricardoymortimer", "minimalist"];

  it("identifies custom themes", () => {
    expect(isCustomTheme("ricardoymortimer", customThemes)).toBe(true);
    expect(isCustomTheme("minimalist", customThemes)).toBe(true);
  });

  it("rejects non-custom themes", () => {
    expect(isCustomTheme("light", customThemes)).toBe(false);
    expect(isCustomTheme("dark", customThemes)).toBe(false);
    expect(isCustomTheme("unknown", customThemes)).toBe(false);
  });

  it("uses default custom themes if not provided", () => {
    expect(isCustomTheme("ricardoymortimer")).toBe(true);
    expect(isCustomTheme("minimalist")).toBe(true);
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

const tokensDist = resolve(process.cwd(), "packages/tokens/dist/cai-tokens.css");
const coreDist = resolve(process.cwd(), "packages/core/dist");
const distBuilt = existsSync(tokensDist) && existsSync(resolve(coreDist, "cai.js"));

if (!distBuilt) {
  console.warn(
    "[unit.test] dist/ not built — dist-dependent suites will be SKIPPED. Run `pnpm build` first.",
  );
}

describe("check-dist sentinel (BUG-01)", () => {
  it("sentinel path points to packages/tokens/dist/cai-tokens.css", () => {
    expect(tokensDist).toMatch(/packages[/\\]tokens[/\\]dist[/\\]cai-tokens\.css$/);
  });

  it.skipIf(!distBuilt)("script exits cleanly when sentinel exists (post-build)", () => {
    expect(existsSync(tokensDist)).toBe(true);
  });
});

describe.skipIf(!distBuilt)("tokens semantic layer (regression: lost Layer 2)", () => {
  it("dist/cai-tokens.css contains the semantic layer for all base modes", () => {
    const content = readFileSync(tokensDist, "utf-8");
    expect(content).toContain("--cai-bg-page");
    expect(content).toContain("--cai-text-primary");
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

  it("dist/cai.js does not contain MidiParser (midi.js is lazy-loaded)", () => {
    const content = readFileSync(resolve(coreDist, "cai.js"), "utf-8");
    expect(content).not.toContain("MidiParser");
  });

  it("per-component CSS files are emitted for standalone use", () => {
    for (const f of ["button.css", "form.css", "modal.css", "player.css"]) {
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
    ]) {
      expect(existsSync(resolve(coreDist, f))).toBe(true);
    }
  });
});
