// @ts-check
/**
 * <luz-mode> of @luz-ds/site (.claude/plans/luz-home-docs-identity.md section 3.3, F1):
 * the color mode switcher with an "Auto" state, wrapped around core's radios.
 * Its module, mode.js, is loaded on its own as dist/mode.min.js by
 * tests/fixtures/site-mode.html (the loader is checked in
 * tests/site-loader.spec.js); tests/fixtures/site-mode-luz.html adds core's
 * luz.js before it, as a real page has it. The query string authors the page:
 * ?by=clock&remember&for=target&light-attr=data-sky&boot=dark&themes=brand&mode=dark
 *
 * What the element does: auto follows prefers-color-scheme and
 * prefers-contrast (by="system", the default) or the phase of the day from
 * the local wall-clock (by="clock", which also writes data-light); a chosen
 * mode is applied and, with `remember`, stored under core's `luz-theme` (auto
 * is the absence of the key); `mode`, `light` and `preview()` on the element;
 * `luz-mode:change`. The pure phase function and the file rules are in
 * tests/site-mode.test.js.
 *
 * Without JavaScript the radios change the mode through tokens' :root:has(),
 * and the `auto` radio leaves the page light. That block switches JavaScript
 * off for itself, so it runs in the chromium project (this file is not in the
 * chromium-nojs testMatch of playwright.config.js); every other test needs
 * JavaScript and skips itself where it is off.
 *
 * tests/fixtures/site-loader-mode-luz.html is the real loading path: luz.js,
 * the boot snippet in <head> and site.min.js, which loads mode.min.js on idle.
 * Every fixture is lang="en": core's cycle button takes its name from the
 * language of the page, and in English core's two boot waves run in one task,
 * so "Current: Auto" is there when the chunk has upgraded the element.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/site-mode.html';
const WITH_LUZ = '/tests/fixtures/site-mode-luz.html';
const LOADED = '/tests/fixtures/site-loader-mode-luz.html';
const KEY = 'luz-theme';

// A fixed zone, so "the local hour" is the same on every machine
test.use({ timezoneId: 'Europe/Madrid' });

/** An ISO time at `hh:mm[:ss]` on a June day in Madrid (UTC+2). */
const at = (hhmm) => `2026-06-15T${hhmm.length === 5 ? `${hhmm}:00` : hhmm}+02:00`;

/**
 * Open the fixture and wait for <luz-mode> to be defined and to have fired its
 * first luz-mode:change, so a missing chunk fails here, as a timeout of the poll.
 * @param {import('@playwright/test').Page} page
 * @param {string} query the query string that authors the page
 * @param {{ fixture?: string, time?: string, scheme?: 'light'|'dark', contrast?: 'more'|'no-preference', stored?: string, throwingStorage?: boolean }} [options]
 */
async function open(page, query = '', { fixture = FIXTURE, time, scheme = 'light', contrast = 'no-preference', stored, throwingStorage = false } = {}) {
  if (time) await page.clock.install({ time });
  await page.emulateMedia({ colorScheme: scheme, contrast });
  await page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__changes = [];
    w.__theme = [];
    w.__themeFirst = false;
    w.__intervals = 0;
    w.__timeouts = [];
    document.addEventListener('luz-mode:change', (e) => w.__changes.push({ ...(/** @type {CustomEvent} */ (e)).detail }));
    // Every value data-theme takes on <html>, from the first script on: each write is
    // read from the next record's oldValue (two writes in one task are two values), and
    // the last one from the attribute. The first record's oldValue is the attribute
    // before the page wrote it, which is no value of the page.
    const drain = (/** @type {MutationRecord[]} */ records) => {
      for (const r of records) {
        if (r.target !== document.documentElement) continue;
        if (w.__themeFirst || r.oldValue !== null) w.__theme.push(r.oldValue);
        w.__themeFirst = true;
      }
    };
    const observer = new MutationObserver(drain);
    observer.observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'], attributeOldValue: true });
    w.__themeHistory = () => {
      drain(observer.takeRecords());
      return [...w.__theme, document.documentElement.getAttribute('data-theme')];
    };
    // The timers the page asks for, on top of Playwright's clock when it is installed.
    // The dev server's own client (/@vite/client) keeps a socket alive with timers: not the page's.
    const timeout = window.setTimeout;
    const interval = window.setInterval;
    const pages = () => !/\/@vite\//.test(new Error().stack ?? '');
    window.setTimeout = (fn, ms, ...rest) => {
      if (pages()) w.__timeouts.push(ms ?? 0);
      return timeout.call(window, fn, ms, ...rest);
    };
    window.setInterval = (fn, ms, ...rest) => {
      if (pages()) w.__intervals++;
      return interval.call(window, fn, ms, ...rest);
    };
  });
  if (stored !== undefined) {
    await page.addInitScript(([k, v]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(k, v);
        sessionStorage.setItem('seeded', '1');
      }
    }, [KEY, stored]);
  }
  if (throwingStorage) {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });
    });
  }
  await page.goto(`${fixture}${query ? `?${query}` : ''}`);
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
  await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__changes.length)).toBeGreaterThan(0);
}

/** What the page says about the mode now. */
const state = (page, target = 'html') =>
  page.evaluate((selector) => {
    const root = selector === 'html' ? document.documentElement : document.querySelector(selector);
    const el = /** @type {any} */ (document.getElementById('mode'));
    return {
      theme: root?.getAttribute('data-theme') ?? null,
      light: root?.getAttribute('data-light') ?? null,
      mode: el.mode,
      checked: document.querySelector('input[name="luz-theme"]:checked')?.getAttribute('value') ?? null,
    };
  }, target);

const choose = (page, label) => page.locator('#mode label', { hasText: new RegExp(`^${label}$`) }).click();
const stored = (page) => page.evaluate((k) => localStorage.getItem(k), KEY);
const events = (page) => page.evaluate(() => /** @type {any} */ (window).__changes);
const preview = (page, x) => page.evaluate((v) => /** @type {any} */ (document.getElementById('mode')).preview(v), x);
const light = (page) => page.evaluate(() => /** @type {any} */ (document.getElementById('mode')).light);
/** Every value data-theme took on <html>, in order, the last one included. */
const themeHistory = (page) => page.evaluate(() => /** @type {any} */ (window).__themeHistory());
/** The sleep that lets a media-query `change` event, dispatched at the next rendering step, reach the page. */
const settle = (page) => page.waitForTimeout(150);

/* ---- Without JavaScript ------------------------------------------------- */

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the four radios show, auto is checked and the page is light', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.locator('#mode legend')).toBeVisible();
    for (const label of ['Auto', 'Light', 'Dark', 'High contrast']) await expect(page.locator('#mode label', { hasText: new RegExp(`^${label}$`) })).toBeVisible();
    await expect(page.locator('#mode input[value="auto"]')).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBeNull();
  });

  test('a radio changes the mode through the tokens, and auto leaves the page light', async ({ page }) => {
    await page.goto(FIXTURE);
    const surface = () => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--luz-surface-page').trim());
    const lightSurface = await surface();
    expect(lightSurface).not.toBe('');
    await choose(page, 'Dark');
    const dark = await surface();
    expect(dark).not.toBe(lightSurface);
    await choose(page, 'High contrast');
    const contrast = await surface();
    expect(contrast).not.toBe(lightSurface);
    expect(contrast).not.toBe(dark);
    await choose(page, 'Light');
    expect(await surface()).toBe(lightSurface);
    await choose(page, 'Dark');
    await choose(page, 'Auto');
    expect(await surface()).toBe(lightSurface);
  });
});

test.describe('<luz-mode>', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  /* ---- by="system" (the default) ---------------------------------------- */

  test.describe('auto, following the system', () => {
    test('is light with no preference, checks the auto radio and writes no light attribute', async ({ page }) => {
      await open(page);
      expect(await state(page)).toEqual({ theme: 'light', light: null, mode: 'auto', checked: 'auto' });
    });

    test('follows prefers-color-scheme: dark', async ({ page }) => {
      await open(page, '', { scheme: 'dark' });
      expect(await state(page)).toMatchObject({ theme: 'dark', light: null, mode: 'auto', checked: 'auto' });
    });

    test('follows prefers-contrast: more, and it wins over dark', async ({ page }) => {
      await open(page, '', { contrast: 'more' });
      expect(await state(page)).toMatchObject({ theme: 'high-contrast', mode: 'auto' });
      await page.emulateMedia({ colorScheme: 'dark', contrast: 'more' });
      await expect.poll(() => state(page)).toMatchObject({ theme: 'high-contrast', mode: 'auto' });
    });

    test('follows a change of the system after load, in both queries', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Playwright Firefox does not fire the MediaQueryList change event for contrast emulation');
      await open(page);
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', light: null, mode: 'auto' });
      await page.emulateMedia({ contrast: 'more' });
      await expect.poll(() => state(page)).toMatchObject({ theme: 'high-contrast' });
      await page.emulateMedia({ contrast: 'no-preference' });
      await expect.poll(() => state(page)).toMatchObject({ theme: 'dark' });
      await page.emulateMedia({ colorScheme: 'light' });
      await expect.poll(() => state(page)).toMatchObject({ theme: 'light', light: null });
    });

    test('a fixed mode ignores the system', async ({ page }) => {
      await open(page, '', { scheme: 'dark' });
      await choose(page, 'Light');
      expect(await state(page)).toMatchObject({ theme: 'light', mode: 'light', checked: 'light', light: null });
      await page.emulateMedia({ colorScheme: 'light', contrast: 'more' });
      await settle(page);
      await page.emulateMedia({ colorScheme: 'dark' });
      await settle(page);
      expect(await state(page)).toMatchObject({ theme: 'light', mode: 'light' });
      expect((await themeHistory(page)).filter((v) => v !== 'light' && v !== 'dark')).toEqual([]);
    });

    test('auto, after a fixed mode, follows the system as it is now, not as it was', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Playwright Firefox does not fire the MediaQueryList change event for contrast emulation');
      await open(page, '');
      await choose(page, 'Light');
      await page.emulateMedia({ colorScheme: 'dark' });
      await settle(page);
      expect(await state(page)).toMatchObject({ theme: 'light', mode: 'light' });
      await choose(page, 'Auto');
      expect(await state(page)).toEqual({ theme: 'dark', light: null, mode: 'auto', checked: 'auto' });
      await page.emulateMedia({ contrast: 'more' });
      await expect.poll(() => state(page)).toMatchObject({ theme: 'high-contrast', mode: 'auto' });
    });

    test('with `for`, the theme of the system lands on that element and <html> stays as it was', async ({ page }) => {
      await open(page, 'for=target', { scheme: 'dark' });
      expect(await state(page, '#target')).toMatchObject({ theme: 'dark', light: null, mode: 'auto' });
      expect(await state(page)).toMatchObject({ theme: null, light: null });
      await page.emulateMedia({ colorScheme: 'light' });
      await expect.poll(() => state(page, '#target')).toMatchObject({ theme: 'light' });
      expect(await state(page)).toMatchObject({ theme: null, light: null });
    });
  });

  /* ---- by="clock" ------------------------------------------------------- */

  test.describe('auto, following the clock', () => {
    // [local time, phase, data-theme]; the boundaries of the spec: 5, 7.5, 12, 17.5, 20.5, 22.5
    const PHASES = [
      ['00:00', 'night', 'dark'],
      ['04:59', 'night', 'dark'],
      ['05:00', 'dawn', 'dark'],
      ['07:29', 'dawn', 'dark'],
      ['07:30', 'morning', 'light'],
      ['11:59', 'morning', 'light'],
      ['12:00', 'afternoon', 'light'],
      ['17:29', 'afternoon', 'light'],
      ['17:30', 'sunset', 'light'],
      ['20:29', 'sunset', 'light'],
      ['20:30', 'dusk', 'dark'],
      ['22:29', 'dusk', 'dark'],
      ['22:30', 'night', 'dark'],
      ['23:59', 'night', 'dark'],
    ];
    for (const [time, phase, theme] of PHASES) {
      test(`at ${time} the phase is ${phase}: data-theme ${theme}, data-light ${phase}`, async ({ page }) => {
        await open(page, 'by=clock', { time: at(time) });
        expect(await state(page)).toEqual({ theme, light: phase, mode: 'auto', checked: 'auto' });
        expect(await light(page)).toBe(phase);
      });
    }

    test('reads the hour of the local zone, not UTC', async ({ browser }) => {
      const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' });
      const page = await context.newPage();
      // 00:30 UTC is 09:30 in Tokyo (morning, light); in UTC it would be night
      await open(page, 'by=clock', { time: '2026-06-15T00:30:00Z' });
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'morning' });
      await context.close();
    });

    test('prefers-contrast: more wins over the phase', async ({ page }) => {
      await open(page, 'by=clock', { time: at('12:30'), contrast: 'more' });
      expect(await state(page)).toMatchObject({ theme: 'high-contrast', mode: 'auto' });
    });

    test('ignores prefers-color-scheme: the phase decides', async ({ page }) => {
      await open(page, 'by=clock', { time: at('12:30'), scheme: 'dark' });
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'afternoon' });
    });

    test('prefers-contrast: more wins over the phase when it changes after load, and the phase comes back', async ({ page, browserName }) => {
      test.skip(browserName === 'firefox', 'Playwright Firefox does not fire the MediaQueryList change event for contrast emulation');
      await open(page, 'by=clock', { time: at('12:30') });
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'afternoon' });
      await page.emulateMedia({ contrast: 'more' });
      await expect.poll(() => state(page)).toMatchObject({ theme: 'high-contrast', mode: 'auto' });
      await page.emulateMedia({ contrast: 'no-preference' });
      await expect.poll(() => state(page)).toMatchObject({ theme: 'light', light: 'afternoon', mode: 'auto' });
    });

    test('re-evaluates when the next minute begins', async ({ page }) => {
      await open(page, 'by=clock', { time: at('04:59:30') });
      expect(await state(page)).toMatchObject({ theme: 'dark', light: 'night' });
      await page.clock.runFor(31_000); // 05:00:01
      await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', light: 'dawn' });
      await page.clock.runFor(60_000 * 151); // 07:31:01, a minute clear of the 7.5 boundary
      await expect.poll(() => state(page)).toMatchObject({ theme: 'light', light: 'morning' });
    });

    test('a minute that does not change the phase leaves a data-theme set by hand alone', async ({ page }) => {
      await open(page, 'by=clock', { time: at('14:00') });
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'afternoon', mode: 'auto' });
      // Something else (a picker, a tool, a test) sets the theme on <html> by hand
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.clock.runFor(61_000); // 14:01:01, still afternoon: the tick ran and had nothing to write
      await page.waitForTimeout(100);
      expect(await state(page)).toMatchObject({ theme: 'dark', light: 'afternoon' });
    });

    test('a minute that changes the phase writes the new phase: its light and its theme, over a data-theme set by hand', async ({ page }) => {
      await open(page, 'by=clock', { time: at('17:29') });
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'afternoon' });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.clock.runFor(61_000); // 17:30:01, sunset
      await expect.poll(() => state(page)).toMatchObject({ theme: 'light', light: 'sunset', mode: 'auto' });
    });

    test('waits for the next minute with one timeout, not a busy interval, and a minute that changes nothing fires nothing', async ({ page }) => {
      await open(page, 'by=clock', { time: at('09:30:20') });
      const timers = () => page.evaluate(() => ({ intervals: /** @type {any} */ (window).__intervals, timeouts: /** @type {number[]} */ ([.../** @type {any} */ (window).__timeouts]) }));
      const first = await timers();
      expect(first.intervals, 'setInterval calls').toBe(0);
      // 40 s to 09:31:00, less the little real time the page took to load
      expect(first.timeouts.filter((ms) => ms > 30_000 && ms <= 41_000), `timeouts ${JSON.stringify(first.timeouts)}`).not.toHaveLength(0);
      const count = (await events(page)).length;
      await page.clock.runFor(60_000); // 09:31, still morning
      await page.waitForTimeout(100);
      expect((await events(page)).length).toBe(count);
      const after = await timers();
      expect(after.intervals).toBe(0);
      expect(after.timeouts.length, `timeouts ${JSON.stringify(after.timeouts)}`).toBeLessThanOrEqual(6);
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'morning' });
    });

    test('re-evaluates when the tab becomes visible again', async ({ page }) => {
      await open(page, 'by=clock', { time: at('09:30') });
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'morning' });
      await page.clock.setSystemTime(at('21:00'));
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', light: 'dusk' });
    });

    test('writes the attributes on the element that `for` names, and leaves <html> alone', async ({ page }) => {
      await open(page, 'by=clock&for=target', { time: at('09:30') });
      expect(await state(page, '#target')).toMatchObject({ theme: 'light', light: 'morning' });
      expect(await state(page)).toMatchObject({ theme: null, light: null });
    });

    test('writes the light under the attribute that `light-attr` names', async ({ page }) => {
      await open(page, 'by=clock&light-attr=data-sky', { time: at('09:30') });
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-sky'))).toBe('morning');
      expect(await page.evaluate(() => document.documentElement.hasAttribute('data-light'))).toBe(false);
    });

    test('a `for` that names no element falls back to <html>', async ({ page }) => {
      await open(page, 'by=clock&for=no-such-id', { time: at('09:30') });
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'morning' });
      expect(await state(page, '#target')).toMatchObject({ theme: null, light: null });
    });

    test('a fixed mode with `for` pins theme and light on that element, <html> stays as it was', async ({ page }) => {
      await open(page, 'by=clock&for=target', { time: at('09:30') });
      await choose(page, 'Dark');
      expect(await state(page, '#target')).toEqual({ theme: 'dark', light: 'night', mode: 'dark', checked: 'dark' });
      expect(await state(page)).toMatchObject({ theme: null, light: null });
      await choose(page, 'Light');
      expect(await state(page, '#target')).toMatchObject({ theme: 'light', light: 'afternoon' });
      expect(await state(page)).toMatchObject({ theme: null, light: null });
    });
  });

  /* ---- Choosing a mode -------------------------------------------------- */

  test.describe('a chosen mode', () => {
    test('dark with the clock stores luz-theme and pins the light to night', async ({ page }) => {
      await open(page, 'by=clock&remember', { time: at('09:30') });
      await choose(page, 'Dark');
      expect(await state(page)).toEqual({ theme: 'dark', light: 'night', mode: 'dark', checked: 'dark' });
      expect(await light(page)).toBe('night');
      expect(await stored(page)).toBe('dark');
    });

    test('light with the clock pins the light to afternoon, high contrast to night, in the attribute and in the getter', async ({ page }) => {
      await open(page, 'by=clock&remember', { time: at('23:00') });
      await choose(page, 'Light');
      expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon', mode: 'light', checked: 'light' });
      expect(await light(page)).toBe('afternoon');
      expect(await stored(page)).toBe('light');
      await choose(page, 'High contrast');
      expect(await state(page)).toEqual({ theme: 'high-contrast', light: 'night', mode: 'high-contrast', checked: 'high-contrast' });
      expect(await light(page)).toBe('night');
      expect(await stored(page)).toBe('high-contrast');
    });

    test('a fixed mode holds while the minutes pass', async ({ page }) => {
      await open(page, 'by=clock', { time: at('09:30') });
      await choose(page, 'Light');
      await page.clock.runFor(60_000 * 600); // 19:30 the same day
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'afternoon' });
      expect(await light(page)).toBe('afternoon');
    });

    test('auto removes the key and goes back to the clock', async ({ page }) => {
      await open(page, 'by=clock&remember', { time: at('09:30') });
      await choose(page, 'Dark');
      expect(await stored(page)).toBe('dark');
      await choose(page, 'Auto');
      expect(await stored(page)).toBeNull();
      expect(await state(page)).toEqual({ theme: 'light', light: 'morning', mode: 'auto', checked: 'auto' });
    });

    test('with the system, dark applies, writes no light, and auto goes back to the system', async ({ page }) => {
      await open(page, 'remember');
      await choose(page, 'Dark');
      expect(await state(page)).toEqual({ theme: 'dark', light: null, mode: 'dark', checked: 'dark' });
      expect(await stored(page)).toBe('dark');
      await choose(page, 'Auto');
      expect(await stored(page)).toBeNull();
      expect(await state(page)).toEqual({ theme: 'light', light: null, mode: 'auto', checked: 'auto' });
    });

    test('without `remember` nothing is stored, whatever is chosen', async ({ page }) => {
      await open(page, 'by=clock', { time: at('09:30') });
      await choose(page, 'Dark');
      await choose(page, 'High contrast');
      await choose(page, 'Auto');
      expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('luz')))).toEqual([]);
    });
  });

  /* ---- The stored choice ------------------------------------------------ */

  test.describe('the stored choice', () => {
    test('is applied on load, checks its radio and pins the light', async ({ page }) => {
      await open(page, 'by=clock&remember', { time: at('09:30'), stored: 'dark' });
      expect(await state(page)).toEqual({ theme: 'dark', light: 'night', mode: 'dark', checked: 'dark' });
      expect(await light(page)).toBe('night');
      expect(await stored(page)).toBe('dark');
    });

    test('is ignored without `remember`: the key is not read, the page is in auto', async ({ page }) => {
      await open(page, '', { stored: 'dark' });
      expect(await state(page)).toEqual({ theme: 'light', light: null, mode: 'auto', checked: 'auto' });
    });

    test('is applied on load with the system too', async ({ page }) => {
      await open(page, 'remember', { stored: 'high-contrast' });
      expect(await state(page)).toEqual({ theme: 'high-contrast', light: null, mode: 'high-contrast', checked: 'high-contrast' });
    });

    for (const bad of ['banana', 'auto', '', 'Dark', '{"a":1}', '__proto__', 'light dark']) {
      test(`${JSON.stringify(bad)} is not a mode: it is ignored and the page is in auto`, async ({ page }) => {
        await open(page, 'by=clock&remember', { time: at('09:30'), stored: bad });
        expect(await state(page)).toEqual({ theme: 'light', light: 'morning', mode: 'auto', checked: 'auto' });
      });
    }

    for (const [by, query] of [['by the system', ''], ['by the clock', '&by=clock']]) {
      test(`a custom theme of data-luz-themes is left alone, ${by}: theme, data-mode, data-light and the key stay, no radio but auto is checked`, async ({ page }) => {
        await open(page, `remember&themes=brand&boot=brand&mode=dark${query}`, { stored: 'brand', scheme: 'dark', time: at('09:30') });
        const html = () => page.evaluate(() => ({
          theme: document.documentElement.getAttribute('data-theme'),
          mode: document.documentElement.getAttribute('data-mode'),
          light: document.documentElement.getAttribute('data-light'),
        }));
        const radios = () => page.evaluate(() => [...document.querySelectorAll('#mode input[name="luz-theme"]:checked')].map((e) => /** @type {HTMLInputElement} */ (e).value));
        expect(await html()).toEqual({ theme: 'brand', mode: 'dark', light: null });
        expect(await radios()).not.toContain('light');
        expect(await radios()).not.toContain('dark');
        expect(await radios()).not.toContain('high-contrast');
        await page.emulateMedia({ colorScheme: 'light', contrast: 'more' });
        await settle(page);
        await page.clock.runFor(120_000); // two minutes of the clock
        expect(await html()).toEqual({ theme: 'brand', mode: 'dark', light: null });
        expect(await stored(page)).toBe('brand');
        // Not one write of another value, not even for an instant
        expect(new Set(await themeHistory(page))).toEqual(new Set(['brand']));
      });
    }

    test('a storage that throws does not stop the element', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await open(page, 'by=clock&remember', { time: at('09:30'), throwingStorage: true });
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'morning', mode: 'auto' });
      await choose(page, 'Dark');
      expect(await state(page)).toEqual({ theme: 'dark', light: 'night', mode: 'dark', checked: 'dark' });
      expect(errors).toEqual([]);
    });
  });

  /* ---- The element's API ------------------------------------------------ */

  test.describe('mode, light and preview()', () => {
    test('`mode` sets the mode, checks the radio and stores with `remember`; an invalid value is ignored', async ({ page }) => {
      await open(page, 'by=clock&remember', { time: at('09:30') });
      await page.evaluate(() => { /** @type {any} */ (document.getElementById('mode')).mode = 'dark'; });
      expect(await state(page)).toEqual({ theme: 'dark', light: 'night', mode: 'dark', checked: 'dark' });
      expect(await stored(page)).toBe('dark');
      for (const bad of ['banana', '', null, 3]) {
        await page.evaluate((v) => { /** @type {any} */ (document.getElementById('mode')).mode = v; }, bad);
        expect(await state(page), `mode = ${JSON.stringify(bad)}`).toMatchObject({ theme: 'dark', mode: 'dark' });
      }
      await page.evaluate(() => { /** @type {any} */ (document.getElementById('mode')).mode = 'auto'; });
      expect(await state(page)).toEqual({ theme: 'light', light: 'morning', mode: 'auto', checked: 'auto' });
      expect(await stored(page)).toBeNull();
    });

    test('`light` is the current phase with the clock', async ({ page }) => {
      await open(page, 'by=clock', { time: at('14:00') });
      expect(await light(page)).toBe('afternoon');
    });

    test('`light` is null with the system', async ({ page }) => {
      await open(page);
      expect(await light(page)).toBeNull();
    });

    test('preview("dawn") moves data-light and, in auto, the mode; preview(null) goes back to now', async ({ page }) => {
      await open(page, 'by=clock', { time: at('14:00') });
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'afternoon' });
      expect(await preview(page, 'dawn')).toBe(true);
      expect(await state(page)).toMatchObject({ theme: 'dark', light: 'dawn', mode: 'auto' });
      expect(await light(page)).toBe('dawn');
      expect(await preview(page, null)).not.toBe(false);
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'afternoon' });
      expect(await light(page)).toBe('afternoon');
    });

    test('preview(hour) takes an hour from 0 to 24, and the phase names have their own hour', async ({ page }) => {
      await open(page, 'by=clock', { time: at('14:00') });
      const cases = [
        [9.5, 'morning', 'light'],
        [21.25, 'dusk', 'dark'],
        [5, 'dawn', 'dark'],
        [4.99, 'night', 'dark'],
        [17.5, 'sunset', 'light'],
        [0, 'night', 'dark'],
        ['morning', 'morning', 'light'],
        ['afternoon', 'afternoon', 'light'],
        ['sunset', 'sunset', 'light'],
        ['dusk', 'dusk', 'dark'],
        ['night', 'night', 'dark'],
      ];
      for (const [x, phase, theme] of cases) {
        expect(await preview(page, x), `preview(${x})`).toBe(true);
        expect(await state(page), `preview(${x})`).toMatchObject({ theme, light: phase });
      }
    });

    test('a fixed mode keeps its data-theme under a preview: the light follows the previewed hour, and null returns it to the pinned one', async ({ page }) => {
      await open(page, 'by=clock', { time: at('14:00') });
      // [button, mode, pinned light, previewed phase, the phase a dark/light previewed hour would give]
      const cases = [
        ['Dark', 'dark', 'night', 'morning'],
        ['Light', 'light', 'afternoon', 'night'],
        ['High contrast', 'high-contrast', 'night', 'afternoon'],
      ];
      for (const [label, mode, pinned, previewed] of cases) {
        await choose(page, label);
        expect(await state(page), `${mode} chosen`).toEqual({ theme: mode, light: pinned, mode, checked: mode });
        expect(await preview(page, previewed), `preview(${previewed}) under ${mode}`).toBe(true);
        expect(await state(page), `${mode} under preview(${previewed})`).toEqual({ theme: mode, light: previewed, mode, checked: mode });
        expect(await light(page)).toBe(previewed);
        expect((await events(page)).at(-1), 'the event of the preview').toMatchObject({ mode, theme: mode, light: previewed, simulated: true });
        await preview(page, 9.5); // an hour, too: morning
        expect(await state(page), `${mode} under preview(9.5)`).toMatchObject({ theme: mode, light: 'morning' });
        expect(await preview(page, null), 'preview(null)').not.toBe(false);
        expect(await state(page), `${mode} after preview(null)`).toEqual({ theme: mode, light: pinned, mode, checked: mode });
        expect(await light(page)).toBe(pinned);
        expect((await events(page)).at(-1), 'the event of the release').toMatchObject({ mode, theme: mode, light: pinned, simulated: false });
      }
    });

    test('a preview holds while the minutes pass, and null releases it', async ({ page }) => {
      await open(page, 'by=clock', { time: at('14:00') });
      await preview(page, 'night');
      await page.clock.runFor(60_000 * 5);
      expect(await state(page)).toMatchObject({ theme: 'dark', light: 'night' });
      await preview(page, null);
      expect(await state(page)).toMatchObject({ theme: 'light', light: 'afternoon' });
    });

    test('preview() with `for` moves the light and the theme of that element, not <html>', async ({ page }) => {
      await open(page, 'by=clock&for=target', { time: at('14:00') });
      expect(await preview(page, 'dusk')).toBe(true);
      expect(await state(page, '#target')).toMatchObject({ theme: 'dark', light: 'dusk', mode: 'auto' });
      expect(await state(page)).toMatchObject({ theme: null, light: null });
      await preview(page, null);
      expect(await state(page, '#target')).toMatchObject({ theme: 'light', light: 'afternoon' });
      expect(await state(page)).toMatchObject({ theme: null, light: null });
    });

    test('with the system, preview() does nothing and returns false', async ({ page }) => {
      await open(page, '');
      expect(await preview(page, 'night')).toBe(false);
      expect(await state(page)).toEqual({ theme: 'light', light: null, mode: 'auto', checked: 'auto' });
    });
  });

  /* ---- The event -------------------------------------------------------- */

  test.describe('luz-mode:change', () => {
    test('fires once after the upgrade, bubbling, with { mode, theme, light, remembered, simulated }', async ({ page }) => {
      await open(page, '', { scheme: 'dark' });
      await page.waitForTimeout(200);
      const all = await events(page);
      expect(all).toHaveLength(1);
      expect(Object.keys(all[0]).sort()).toEqual(['light', 'mode', 'remembered', 'simulated', 'theme']);
      expect(all[0]).toEqual({ mode: 'auto', theme: 'dark', light: null, remembered: false, simulated: false });
    });

    test('fires on every change: a choice, the system and a preview', async ({ page }) => {
      await open(page, 'by=clock&remember', { time: at('09:30') });
      await page.waitForTimeout(100);
      // One event per step, no more: the count grows by exactly one
      const step = async (action, count) => {
        await action();
        await page.waitForTimeout(100);
        const all = await events(page);
        expect(all, 'events after the step').toHaveLength(count);
        return all.at(-1);
      };
      expect((await events(page))).toHaveLength(1);
      expect((await events(page)).at(-1)).toMatchObject({ mode: 'auto', theme: 'light', light: 'morning', simulated: false });
      expect(await step(() => choose(page, 'Dark'), 2)).toEqual({ mode: 'dark', theme: 'dark', light: 'night', remembered: true, simulated: false });
      // Auto stores nothing, even with `remember`
      expect(await step(() => choose(page, 'Auto'), 3)).toEqual({ mode: 'auto', theme: 'light', light: 'morning', remembered: false, simulated: false });
      expect(await step(() => preview(page, 'dusk'), 4)).toEqual({ mode: 'auto', theme: 'dark', light: 'dusk', remembered: false, simulated: true });
      expect(await step(() => preview(page, null), 5)).toEqual({ mode: 'auto', theme: 'light', light: 'morning', remembered: false, simulated: false });
      expect(await step(() => page.evaluate(() => { /** @type {any} */ (document.getElementById('mode')).mode = 'light'; }), 6)).toEqual({ mode: 'light', theme: 'light', light: 'afternoon', remembered: true, simulated: false });
    });

    test('without `remember` a choice says remembered: false', async ({ page }) => {
      await open(page, '');
      await choose(page, 'High contrast');
      expect((await events(page)).at(-1)).toEqual({ mode: 'high-contrast', theme: 'high-contrast', light: null, remembered: false, simulated: false });
    });

    test('`remembered` is true only while a fixed mode is stored: with `remember` and a stored mode on load', async ({ page }) => {
      await open(page, 'remember', { stored: 'dark' });
      expect((await events(page)).at(0)).toEqual({ mode: 'dark', theme: 'dark', light: null, remembered: true, simulated: false });
    });

    test('`remembered` is false in auto with `remember` and nothing stored, and a choice then a return to auto turns it true then false', async ({ page }) => {
      await open(page, 'remember');
      expect((await events(page)).at(0)).toMatchObject({ mode: 'auto', remembered: false });
      await choose(page, 'High contrast');
      expect((await events(page)).at(-1)).toMatchObject({ mode: 'high-contrast', remembered: true });
      expect(await stored(page)).toBe('high-contrast');
      await choose(page, 'Auto');
      expect((await events(page)).at(-1)).toMatchObject({ mode: 'auto', remembered: false });
      expect(await stored(page)).toBeNull();
    });

    test('`remembered` is false without `remember`, even when a mode is stored under the key', async ({ page }) => {
      await open(page, '', { stored: 'dark' });
      expect((await events(page)).at(0)).toEqual({ mode: 'auto', theme: 'light', light: null, remembered: false, simulated: false });
    });

    test('fires when the system changes while in auto', async ({ page }) => {
      await open(page, '');
      const before = (await events(page)).length;
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect.poll(async () => (await events(page)).length).toBeGreaterThan(before);
      expect((await events(page)).at(-1)).toMatchObject({ mode: 'auto', theme: 'dark' });
    });
  });

  /* ---- Accessibility ---------------------------------------------------- */

  for (const mode of ['Auto', 'Light', 'Dark', 'High contrast']) {
    test(`axe finds nothing serious with ${mode} chosen`, async ({ page }) => {
      await open(page, 'by=clock', { time: at('09:30') });
      await choose(page, mode);
      // Not inside the 1.4 s colour fade: axe would sample a colour mid-transition
      await faded(page);
      const found = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze())
        .violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')).map((v) => v.id);
      expect(found).toEqual([]);
    });
  }

  test('the four radios are one group named by its legend, with the auto radio first', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('group', { name: 'Color mode' })).toHaveCount(1);
    expect(await page.locator('#mode input[name="luz-theme"]').evaluateAll((els) => els.map((e) => /** @type {HTMLInputElement} */ (e).value))).toEqual(['auto', 'light', 'dark', 'high-contrast']);
  });

  test('adds no button of its own: without luz.js the four radios show, with JavaScript on', async ({ page }) => {
    await open(page);
    await expect(page.locator('#mode .luz-mode-cycle')).toHaveCount(0);
    await expect(page.locator('#mode button')).toHaveCount(0);
    for (const label of ['Auto', 'Light', 'Dark', 'High contrast']) await expect(page.locator('#mode label', { hasText: new RegExp(`^${label}$`) })).toBeVisible();
  });

  test('writes no text of its own: the markup keeps the four labels it was given', async ({ page }) => {
    await open(page);
    const before = await page.locator('#mode').innerHTML();
    await choose(page, 'Dark');
    await page.waitForTimeout(100);
    const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(text(await page.locator('#mode').innerHTML())).toBe(text(before));
  });
});

/* ---- Together with core's luz.js ---------------------------------------- */

test.describe('<luz-mode> on a page that also loads luz.js', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  const history = themeHistory;
  const settled = async (page) => {
    await page.waitForLoadState('load');
    await page.waitForTimeout(200);
  };

  test('system dark, served dark: data-theme only ever takes "dark", and the auto radio stays checked', async ({ page }) => {
    await open(page, 'boot=dark', { fixture: WITH_LUZ, scheme: 'dark' });
    await settled(page);
    expect(new Set(await history(page))).toEqual(new Set(['dark']));
    expect(await state(page)).toEqual({ theme: 'dark', light: null, mode: 'auto', checked: 'auto' });
  });

  test('system light, served light: data-theme only ever takes "light", and the auto radio stays checked', async ({ page }) => {
    await open(page, 'boot=light', { fixture: WITH_LUZ });
    await settled(page);
    expect(new Set(await history(page))).toEqual(new Set(['light']));
    expect(await state(page)).toEqual({ theme: 'light', light: null, mode: 'auto', checked: 'auto' });
  });

  test('a stored dark: core and the element agree, data-theme only ever takes "dark" and the dark radio is checked', async ({ page }) => {
    await open(page, 'boot=dark&remember', { fixture: WITH_LUZ, stored: 'dark' });
    await settled(page);
    expect(new Set(await history(page))).toEqual(new Set(['dark']));
    expect(await state(page)).toEqual({ theme: 'dark', light: null, mode: 'dark', checked: 'dark' });
    expect(await stored(page)).toBe('dark');
  });

  test('a stored dark with the clock: the light is pinned to night, still one theme value', async ({ page }) => {
    await open(page, 'boot=dark&by=clock&remember', { fixture: WITH_LUZ, stored: 'dark', time: at('09:30') });
    await settled(page);
    expect(new Set(await history(page))).toEqual(new Set(['dark']));
    expect(await state(page)).toEqual({ theme: 'dark', light: 'night', mode: 'dark', checked: 'dark' });
  });

  test('the real loading path (luz.js, the boot snippet, site.min.js loading the chunk on idle): data-theme only ever takes "dark", the auto radio stays checked', async ({ page }) => {
    await open(page, 'boot=dark', { fixture: LOADED, scheme: 'dark' });
    await settled(page);
    expect(new Set(await history(page))).toEqual(new Set(['dark']));
    expect(await state(page)).toEqual({ theme: 'dark', light: null, mode: 'auto', checked: 'auto' });
  });

  test('the real loading path with a stored dark: one value for data-theme, and the dark radio is checked', async ({ page }) => {
    await open(page, 'boot=dark&remember&by=clock', { fixture: LOADED, stored: 'dark', time: at('09:30') });
    await settled(page);
    expect(new Set(await history(page))).toEqual(new Set(['dark']));
    expect(await state(page)).toEqual({ theme: 'dark', light: 'night', mode: 'dark', checked: 'dark' });
  });

  test('a storage that throws does not stop the element or core, and a choice still applies', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page, 'boot=light&remember', { fixture: WITH_LUZ, throwingStorage: true });
    await settled(page);
    expect(await state(page)).toEqual({ theme: 'light', light: null, mode: 'auto', checked: 'auto' });
    await page.locator('#mode .luz-mode-cycle').click(); // auto -> light
    await page.locator('#mode .luz-mode-cycle').click(); // light -> dark
    await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', mode: 'dark', checked: 'dark' });
    expect(errors).toEqual([]);
  });

  test('the auto radio is the one checked after core unchecks it on load (no radio is left unchecked)', async ({ page }) => {
    await open(page, 'boot=light', { fixture: WITH_LUZ });
    await settled(page);
    expect(await page.locator('#mode input[name="luz-theme"]:checked').count()).toBe(1);
    expect(await page.locator('#mode input[value="auto"]').isChecked()).toBe(true);
  });

  test('choosing a mode agrees with core: one value for data-theme, the same one in the key', async ({ page }) => {
    await open(page, 'boot=light&remember', { fixture: WITH_LUZ });
    await page.evaluate(() => { /** @type {any} */ (window).__themeHistory(); /** @type {any} */ (window).__theme.length = 0; });
    await page.locator('#mode .luz-mode-cycle').click(); // auto -> light
    await page.locator('#mode .luz-mode-cycle').click(); // light -> dark
    await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', mode: 'dark', checked: 'dark' });
    expect(await stored(page)).toBe('dark');
    expect((await history(page)).filter((v) => !['light', 'dark'].includes(v))).toEqual([]);
  });

  test('without `remember` a choice removes the key core writes: a reload starts in auto, with no transient wrong value', async ({ page }) => {
    await open(page, 'boot=dark', { fixture: WITH_LUZ, scheme: 'dark' });
    await settled(page);
    await page.locator('#mode .luz-mode-cycle').click(); // auto -> light
    await expect.poll(() => state(page)).toMatchObject({ theme: 'light', mode: 'light', checked: 'light' });
    await expect.poll(() => stored(page), 'core writes the key, the element takes it away').toBeNull();
    await page.locator('#mode .luz-mode-cycle').click(); // light -> dark
    await expect.poll(() => state(page)).toMatchObject({ theme: 'dark', mode: 'dark', checked: 'dark' });
    await page.locator('#mode .luz-mode-cycle').click(); // dark -> high contrast
    await expect.poll(() => state(page)).toMatchObject({ theme: 'high-contrast', mode: 'high-contrast' });
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
    // A reload: the system is dark and nothing is stored, so auto, dark, and never another value
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
    await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__changes.length)).toBeGreaterThan(0);
    await settled(page);
    expect(await state(page)).toEqual({ theme: 'dark', light: null, mode: 'auto', checked: 'auto' });
    expect(new Set(await history(page))).toEqual(new Set(['dark']));
    expect(await stored(page)).toBeNull();
  });

  test('going back to auto removes the key, although core ignores "auto", and follows the system', async ({ page }) => {
    await open(page, 'boot=dark&remember', { fixture: WITH_LUZ, scheme: 'dark', stored: 'high-contrast' });
    expect(await state(page)).toMatchObject({ mode: 'high-contrast' });
    await page.locator('#mode .luz-mode-cycle').click(); // high-contrast -> auto
    await expect.poll(() => state(page)).toEqual({ theme: 'dark', light: null, mode: 'auto', checked: 'auto' });
    expect(await stored(page)).toBeNull();
  });

  test.describe('the cycle button', () => {
    test('walks four states: auto, light, dark, high contrast, then auto again', async ({ page }) => {
      await open(page, 'boot=dark', { fixture: WITH_LUZ, scheme: 'dark' });
      const button = page.locator('#mode .luz-mode-cycle');
      await expect(button).toHaveCount(1);
      await expect(button).toBeVisible();
      await expect(button).toHaveAccessibleName('Change color mode. Current: Auto');
      // The radios give way to the button
      await expect(page.locator('#mode label').first()).toBeHidden();
      const steps = [
        ['light', 'Light', 'light'],
        ['dark', 'Dark', 'dark'],
        ['high-contrast', 'High contrast', 'high-contrast'],
        ['auto', 'Auto', 'dark'], // auto in a dark system
      ];
      for (const [value, label, theme] of steps) {
        await button.click();
        await expect.poll(() => state(page), value).toMatchObject({ theme, mode: value, checked: value });
        await expect(button).toHaveAccessibleName(`Change color mode. Current: ${label}`);
      }
    });

    test('works from the keyboard', async ({ page }) => {
      await open(page, 'boot=light', { fixture: WITH_LUZ });
      await page.locator('#mode .luz-mode-cycle').focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => state(page)).toMatchObject({ mode: 'light', checked: 'light' });
      await page.keyboard.press('Space');
      await expect.poll(() => state(page)).toMatchObject({ mode: 'dark', theme: 'dark' });
    });

    test('luz-mode:change comes with every step', async ({ page }) => {
      await open(page, 'boot=light&by=clock', { fixture: WITH_LUZ, time: at('09:30') });
      const button = page.locator('#mode .luz-mode-cycle');
      await page.waitForTimeout(100);
      const first = (await events(page)).length; // the upgrade
      const seen = [];
      for (let i = 0; i < 4; i++) {
        await button.click();
        await expect.poll(async () => (await events(page)).length).toBe(first + seen.length + 1);
        await page.waitForTimeout(100); // and no second event for the same click
        expect((await events(page)).length).toBe(first + seen.length + 1);
        seen.push((await events(page)).at(-1));
      }
      expect(seen.map((e) => e.mode)).toEqual(['light', 'dark', 'high-contrast', 'auto']);
      expect(seen.map((e) => e.light)).toEqual(['afternoon', 'night', 'night', 'morning']);
    });
  });
});
