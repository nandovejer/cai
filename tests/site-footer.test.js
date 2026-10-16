/**
 * The footer of the home page and of the docs, as text (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4). The browser half
 * (the radios, the icons, the cycle button, the stored key) is
 * tests/site-footer.spec.js.
 *
 *   - The home page's Auto label is a key of the catalogs, so /es/ and /ar/
 *     say it in their own language (in the three catalogs, and in Arabic not
 *     in Latin letters); the docs are English and write it as text.
 *   - The 404 page keeps its promise of no script, so it has no colour mode
 *     switcher and no <luz-mode>: its footer is the links alone.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));

/** The label of the radio with value="auto" in a footer. */
const autoLabel = (html) => html.match(/<label\b[^>]*>(?:(?!<\/label>)[\s\S])*?\bvalue="auto"[\s\S]*?<\/label>/)?.[0] ?? "";

describe("the Auto label of the home page comes from the catalog", () => {
  const label = autoLabel(read("apps/landing/index.html"));
  const key = label.match(/\{\{t:([\w.-]+)\}\}/)?.[1];

  it("is the first radio of the footer, and its text is a {{t:…}} key, not typed English", () => {
    expect(label, "a label with the radio value=auto").not.toBe("");
    expect(key, "a {{t:key}} in the Auto label").toBeTruthy();
    const html = read("apps/landing/index.html");
    const radios = [...html.matchAll(/<input\b[^>]*type="radio"[^>]*name="luz-theme"[^>]*>/g)].map((m) => m[0].match(/value="([^"]+)"/)?.[1]);
    expect(radios[0]).toBe("auto");
    expect(label.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").trim()).toBe(`{{t:${key}}}`);
  });

  it("is a key of the three catalogs, English says Auto and Arabic says it in Arabic", () => {
    expect(key).toBeTruthy();
    for (const code of ["en", "es", "ar"]) expect(catalog(code)[key], `${code} has ${key}`).toEqual(expect.any(String));
    expect(catalog("en")[key]).toBe("Auto");
    expect(catalog("es")[key].trim().length).toBeGreaterThan(0);
    expect(catalog("ar")[key]).toMatch(/[؀-ۿ]/);
    expect(catalog("ar")[key]).not.toBe("Auto");
  });

  it("the shared footer of the docs writes it in English, first of the four radios", () => {
    const footer = read("apps/site/_partials/footer.html");
    expect(autoLabel(footer).replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").trim()).toBe("Auto");
  });
});

describe("the 404 page has no switcher: its button would need the script", () => {
  it("is the links alone: no <luz-mode>, no mode radios, no cycle button, no script", () => {
    const html = read("apps/docs/_layouts/not-found.html");
    expect(html.includes("<luz-mode")).toBe(false);
    expect(html.includes('name="luz-theme"')).toBe(false);
    expect(html.includes("luz-mode-cycle")).toBe(false);
    expect(/<script/.test(html)).toBe(false);
    expect(html).toContain("footer-links");
  });
});
