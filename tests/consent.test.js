/**
 * Unit tests for packages/site/src/consent.js: reading the stored choice.
 * The banner itself is tested in the browser (tests/site-consent.spec.js).
 */
import { afterEach, describe, expect, it } from "vitest";
import { getConsent } from "../packages/site/src/consent.js";

const items = new Map();
globalThis.localStorage = {
  getItem: (k) => (items.has(k) ? items.get(k) : null),
  setItem: (k, v) => items.set(k, String(v)),
};
const later = Date.now() + 1e9;
const put = (value, key = "luz-consent") => localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));

describe("getConsent", () => {
  afterEach(() => items.clear());

  it("returns the stored choice: what was asked, what was granted, when it expires", () => {
    put({ version: 1, expires: later, asked: ["analytics", "marketing"], granted: ["analytics"], extra: "ignored" });
    expect(getConsent()).toEqual({ asked: ["analytics", "marketing"], granted: ["analytics"], expires: later });
  });

  it("reads another key when given one", () => {
    put({ version: 1, expires: later, asked: ["analytics"], granted: [] }, "luz-consent-demo");
    expect(getConsent()).toBeNull();
    expect(getConsent("luz-consent-demo")).toEqual({ asked: ["analytics"], granted: [], expires: later });
  });

  it.each([
    ["nothing stored", undefined],
    ["not JSON", "{"],
    ["JSON null", "null"],
    ["another version", { version: 2, expires: later, asked: [], granted: [] }],
    ["expired", { version: 1, expires: Date.now() - 1, asked: ["analytics"], granted: [] }],
    ["no list of what was asked", { version: 1, expires: later, granted: [] }],
    ["a name that is not a category", { version: 1, expires: later, asked: ["Analytics"], granted: [] }],
    ["a name of 33 characters", { version: 1, expires: later, asked: ["a".repeat(33)], granted: [] }],
    ["granted what was not asked", { version: 1, expires: later, asked: ["analytics"], granted: ["marketing"] }],
    ["a granted value that is not a string", { version: 1, expires: later, asked: ["analytics"], granted: [1] }],
  ])("returns null when %s", (_, value) => {
    if (value !== undefined) put(value);
    expect(getConsent()).toBeNull();
  });

  it("returns null when storage throws", () => {
    const saved = globalThis.localStorage;
    globalThis.localStorage = { getItem: () => { throw new Error("blocked"); } };
    try {
      expect(getConsent()).toBeNull();
    } finally {
      globalThis.localStorage = saved;
    }
  });
});
