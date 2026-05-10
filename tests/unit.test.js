/**
 * Unit tests for CAI Design System utilities
 * Run with: pnpm test:unit
 */

import { describe, it, expect } from "vitest";
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
