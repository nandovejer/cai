/**
 * The six lights of the site and the way a test puts a page in one
 * (F2 of .claude/plans/luz-home-docs-identity.md, sections 3.3 and 3.4).
 *
 * With no stored choice the site is in Auto and follows the local hour
 * (apps/site/boot.js before the first paint, <luz-mode by="clock"> after).
 * A test fixes the zone (`test.use({ timezoneId: TIMEZONE })`) and the clock
 * (`atTime`), and names a light by an hour inside its phase.
 */
import { existsSync, readFileSync } from "node:fs";
import { parseColor } from "../../packages/tokens/lib/contrast.js";
import { resolveColor } from "./design-tokens.js";

/** core's key; the site has no key of its own. */
export const KEY = "luz-theme";
export const TIMEZONE = "Europe/Madrid";

/** [light, an hour inside it, the colour mode it belongs to]: dawn, dusk and night are dark. */
export const LIGHTS = [
  ["dawn", "06:00", "dark"],
  ["morning", "09:00", "light"],
  ["afternoon", "14:00", "light"],
  ["sunset", "19:00", "light"],
  ["dusk", "21:00", "dark"],
  ["night", "23:30", "dark"],
];

/**
 * Put the page's clock at `hh:mm` on a June day in Madrid (UTC+2), before it loads.
 * @param {import('@playwright/test').Page} page
 * @param {string} hhmm
 */
export async function atTime(page, hhmm) {
  await page.clock.install({ time: new Date(`2026-06-15T${hhmm}:00+02:00`) });
}

/**
 * Store a choice under core's key once per tab, so a reload keeps what the
 * page then stores. Call before the first goto.
 * @param {import('@playwright/test').Page} page
 * @param {string} value
 */
export async function seedMode(page, value) {
  await page.addInitScript(
    ([key, mode]) => {
      if (!sessionStorage.getItem("luz-seeded")) {
        localStorage.setItem(key, mode);
        sessionStorage.setItem("luz-seeded", "1");
      }
    },
    [KEY, value],
  );
}

/** What a computed colour must be for Vejer's token in a mode: [r, g, b, a] as the browser serialises it. */
export function vejer(mode, token) {
  const { r, g, b, a } = parseColor(resolveColor(mode, token));
  return [r, g, b, a].map((v, i) => (i === 3 ? Math.round(v * 1000) / 1000 : Math.round(v)));
}

/** The `rgb()` / `rgba()` text of a computed colour as [r, g, b, a]. */
export function channels(text) {
  const parts = text.match(/\(([^)]+)\)/)?.[1].split(/[\s,/]+/).filter(Boolean).map(Number) ?? [];
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

/** The computed colour of a token on an element, through a probe child (so var() chains and @property are resolved). */
export function colorOf(locator, token) {
  return locator.evaluate((el, name) => {
    const probe = document.createElement("span");
    probe.style.cssText = `color: var(${name}); position: absolute; visibility: hidden`;
    el.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);
}

/**
 * `test.use({ storageState: NO_CHOICE })`: a test of Auto starts with nothing stored, whatever
 * state the project gives (a project may store the light, so the suites that open a page with
 * no choice do not follow the real clock: see the report of F2).
 */
export const NO_CHOICE = { cookies: [], origins: [] };

/**
 * The colour a token has in the block of a light in apps/site/theme-light.css,
 * as [r, g, b, a] like `vejer()`. The literal of the file, so a page that
 * leaves the stylesheet out is told apart from one that links it.
 */
export function lightToken(light, token) {
  const file = new URL("../../apps/site/theme-light.css", import.meta.url);
  if (!existsSync(file)) throw new Error("apps/site/theme-light.css does not exist");
  const css = readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selector.includes(`[data-light="${light}"]`)) continue;
    const value = body.match(new RegExp(`${token}\\s*:\\s*([^;]+);`))?.[1].trim();
    if (!value) throw new Error(`${token} is not in the block of ${light}`);
    const { r, g, b, a } = parseColor(value);
    return [r, g, b, a].map((v, i) => (i === 3 ? Math.round(v * 1000) / 1000 : Math.round(v)));
  }
  throw new Error(`no block for ${light} in apps/site/theme-light.css`);
}
