/**
 * The docs site's remembered Code / Design tab (apps/docs/view.js): only
 * "code" or "design" is read back from storage, under one cai- key, and
 * storage that is missing, blocked or throwing never breaks the page
 * (PRINCIPLES.md §8, security.md SEC-MISC-1, a11y.md TAB-15).
 */
import { describe, expect, it } from "vitest";
import { VIEW_KEY, readView, saveView } from "../apps/docs/view.js";

const memory = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
};
const throwing = {
  getItem() {
    throw new Error("SecurityError");
  },
  setItem() {
    throw new Error("QuotaExceededError");
  },
};

describe("the remembered docs view", () => {
  it("uses one key with the cai- prefix", () => {
    expect(VIEW_KEY).toBe("cai-docs-view");
  });

  it("reads back code or design only", () => {
    expect(readView(memory({ [VIEW_KEY]: "code" }))).toBe("code");
    expect(readView(memory({ [VIEW_KEY]: "design" }))).toBe("design");
    for (const value of ["Design", "design ", "#design-panel", "<img src=x>", "", "true"]) {
      expect(readView(memory({ [VIEW_KEY]: value })), value).toBeNull();
    }
    expect(readView(memory())).toBeNull();
  });

  it("stores code or design only", () => {
    const storage = memory();
    saveView("design", storage);
    expect(storage.data[VIEW_KEY]).toBe("design");
    saveView("evil", storage);
    expect(storage.data[VIEW_KEY]).toBe("design");
  });

  it("never throws when storage throws or is missing", () => {
    expect(readView(throwing)).toBeNull();
    expect(() => saveView("code", throwing)).not.toThrow();
    expect(readView(undefined)).toBeNull();
    expect(() => saveView("code", undefined)).not.toThrow();
  });
});
