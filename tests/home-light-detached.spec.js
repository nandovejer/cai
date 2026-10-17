// @ts-check
/**
 * F8 security audit, hardening L2: a detached <home-light> keeps no timer.
 *
 * apps/landing/light/light.js re-schedules `_tick()` for the next minute on
 * every call, and `_tick()` also writes the sun's custom properties on <html>
 * and (with [favicon]) the tab's icon. disconnectedCallback() clears the two
 * timers once, but `_tick()` is still reachable from a detached element: the
 * `still` and `look` attributes (attributeChangedCallback) and a lazy visual
 * that resolves after the removal (`LOAD[k]().then`) all call it. Each call
 * arms a timer that keeps the element alive and goes on writing to the page
 * every minute, for good.
 *
 * What this file checks, on the home page at a fixed instant (the Playwright
 * clock):
 *   - after the element is removed and `still` is toggled, `look` is changed,
 *     or the visual it was loading arrives, one more minute (and the favicon's
 *     delay) later, no --sun-* / --day-left custom property of <html> and no
 *     favicon href has changed;
 *   - no setTimeout or setInterval called from apps/landing/light/light.js is
 *     made after the removal (the page's timers are wrapped after the clock is
 *     installed, and a call is attributed by its stack).
 *
 * Needs JavaScript and the clock: it runs in `chromium` only.
 */
import { test, expect } from '@playwright/test';
import { NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const SENTINEL = 'detached-sentinel';
const PROPERTIES = ['--sun-alt', '--sun-az', '--sun-x', '--day-left'];
const FAVICON = 'data:image/svg+xml,detached-sentinel';

test.beforeEach(() => {
  test.skip(test.info().project.use.javaScriptEnabled === false, 'needs JavaScript');
});

/**
 * Open the home at 14:00 with the look, and wait until the visual is there. The clock is
 * installed first, then the timer spy, so the spy wraps the clock's setTimeout.
 * @param {import('@playwright/test').Page} page
 * @param {string} look
 */
async function open(page, look) {
  await atTime(page, '14:00');
  await page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__detached = false;
    w.__timersAfterRemoval = [];
    for (const name of ['setTimeout', 'setInterval']) {
      const original = w[name];
      w[name] = function (...args) {
        if (w.__detached && /apps\/landing\/light\/light\.js/.test(new Error().stack ?? '')) w.__timersAfterRemoval.push(`${name}(${String(args[1])})`);
        return original.apply(this, args);
      };
    }
  });
  await page.goto(`/?look=${look}`);
  await expect(page.locator('home-light .home-light__line')).toBeVisible();
  await expect(page.locator('home-light').locator('home-globe, home-city, home-map').filter({ visible: true })).toHaveCount(1);
}

/**
 * Put sentinels where <home-light> writes; with `remove`, take the element out of the page first
 * and keep a reference to it (the page still holds it, as a script that keeps a node would).
 * @param {import('@playwright/test').Page} page
 * @param {boolean} remove
 */
function arm(page, remove) {
  return page.evaluate(
    ([properties, sentinel, favicon, removeIt]) => {
      const w = /** @type {any} */ (window);
      const el = document.querySelector('home-light');
      if (removeIt) {
        w.__held = el;
        el?.remove();
        w.__detached = true;
      }
      w.__timersAfterRemoval = [];
      for (const name of properties) document.documentElement.style.setProperty(name, sentinel);
      for (const link of document.querySelectorAll('link[rel~="icon"]')) /** @type {HTMLLinkElement} */ (link).href = favicon;
    },
    /** @type {[string[], string, string, boolean]} */ ([PROPERTIES, SENTINEL, FAVICON, remove]),
  );
}

/** What the element may not touch once it is removed. */
const written = (page) =>
  page.evaluate(
    ([properties]) => ({
      properties: Object.fromEntries(properties.map((name) => [name, document.documentElement.style.getPropertyValue(name).trim()])),
      icons: [...document.querySelectorAll('link[rel~="icon"]')].map((link) => /** @type {HTMLLinkElement} */ (link).getAttribute('href')),
      timers: /** @type {any} */ (window).__timersAfterRemoval,
    }),
    /** @type {[string[]]} */ ([PROPERTIES]),
  );

/** Let a minute and the favicon's delay go by on the page's clock. */
async function letTimePass(page) {
  await page.clock.fastForward(61_000);
  await page.clock.fastForward(2_000);
}

function expectUntouched(state) {
  expect.soft(state.properties, 'the custom properties of <html> are still the sentinels').toEqual(Object.fromEntries(PROPERTIES.map((name) => [name, SENTINEL])));
  expect.soft(state.icons, 'the favicon href is unchanged').toEqual(state.icons.map(() => FAVICON));
  expect.soft(state.timers, 'no timer was armed from light.js after the removal').toEqual([]);
}

test.describe('control: a <home-light> in the page', () => {
  test('one minute later it has rewritten the custom properties and the favicon', async ({ page }) => {
    await open(page, 'city');
    await arm(page, false);
    await letTimePass(page);
    const state = await written(page);
    expect(state.properties['--sun-alt']).not.toBe(SENTINEL);
    expect(state.icons.some((href) => href !== FAVICON)).toBe(true);
  });
});

test.describe('a <home-light> removed from the page', () => {
  test('toggling [still] on it does not arm a timer or write to <html>', async ({ page }) => {
    await open(page, 'city');
    await arm(page, true);
    await page.evaluate(() => /** @type {any} */ (window).__held.toggleAttribute('still'));
    await letTimePass(page);
    expectUntouched(await written(page));
  });

  test('changing its [look] to a visual not loaded yet does not arm a timer or write to <html>', async ({ page }) => {
    await open(page, 'city');
    await arm(page, true);
    const loaded = page.waitForResponse((response) => /\/apps\/landing\/light\/map\.js/.test(response.url()));
    await page.evaluate(() => /** @type {any} */ (window).__held.setAttribute('look', 'map'));
    await loaded;
    await page.waitForTimeout(500);
    await letTimePass(page);
    expectUntouched(await written(page));
  });

  test('the visual it was still loading arrives after the removal: no timer, no write to <html>', async ({ page }) => {
    let release = () => {};
    const gate = new Promise((resolve) => (release = () => resolve(undefined)));
    await page.route(/\/apps\/landing\/light\/city\.js/, async (route) => {
      await gate;
      await route.continue();
    });
    await atTime(page, '14:00');
    await page.addInitScript(() => {
      const w = /** @type {any} */ (window);
      w.__detached = false;
      w.__timersAfterRemoval = [];
      for (const name of ['setTimeout', 'setInterval']) {
        const original = w[name];
        w[name] = function (...args) {
          if (w.__detached && /apps\/landing\/light\/light\.js/.test(new Error().stack ?? '')) w.__timersAfterRemoval.push(`${name}(${String(args[1])})`);
          return original.apply(this, args);
        };
      }
    });
    await page.goto('/?look=city');
    await expect(page.locator('home-light .home-light__line')).toBeVisible();
    await arm(page, true);
    const loaded = page.waitForResponse((response) => /\/apps\/landing\/light\/city\.js/.test(response.url()));
    release();
    await loaded;
    await page.waitForTimeout(500);
    await letTimePass(page);
    expectUntouched(await written(page));
  });
});
