// @ts-check
/**
 * The cookie consent of @luz-ds/site: the banner (.luz-consent) and
 * its module, consent.js (<luz-consent>; D5 of .claude/plans/specs/f3-package-model.md:
 * no `site-` in the names), loaded on its own as dist/consent.min.js by
 * tests/fixtures/site-top.html. A band fixed at the block end of the window
 * (D7, step 9): where it sits, what it shifts and the reopen button's space
 * are here; the rest of the band (C1 to C11: Tab stops, the saved state and
 * its Close button, --luz-consent-h, short windows) is in
 * tests/consent-band.spec.js. Runs in `chromium`
 * and `chromium-nojs`: without JavaScript the banner and the button that
 * reopens it stay hidden, and the page reads as if they were not there.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { hold, layoutShift, watchLayoutShift } from './helpers/site-loader.js';

const FIXTURE = '/tests/fixtures/site-top.html';
const KEY = 'luz-consent';

/** Open the fixture; with JavaScript, wait for <luz-consent> to be defined, so a missing element fails here. */
async function open(page, width = 1280, dir = 'ltr', { withScript = true } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(FIXTURE);
  if (withScript) await expect.poll(() => page.evaluate(() => !!customElements.get('luz-consent'))).toBe(true);
  if (dir === 'rtl') await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
}

/** Record the luz:consent events from the first script on. */
const listen = (page) => page.addInitScript(() => {
  window.__events = [];
  document.addEventListener('luz:consent', (e) => window.__events.push(e.detail));
});

const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const store = (page, value) => page.addInitScript(([k, v]) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    sessionStorage.setItem('seeded', '1');
  }
}, [KEY, value]);

const style = (page, css) => page.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('cookie consent without JavaScript', () => {
  test('the banner and the reopen button stay hidden; the cookie policy is a plain link', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-nojs', 'the state without JavaScript');
    await open(page, 1280, 'ltr', { withScript: false });
    await expect(page.locator('#consent')).toBeHidden();
    await expect(page.locator('#settings')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Cookie policy' })).toBeVisible();
    // Nothing of it in the Tab order: skip link, then the notice
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('#notice-link')).toBeFocused();
  });
});

test.describe('cookie consent', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('is <luz-consent> with .luz-consent parts; the old names are gone', async ({ page }) => {
    await open(page);
    await expect(page.locator('#consent')).toBeVisible();
    const names = await page.evaluate(() => ({
      defined: !!customElements.get('luz-consent'),
      oldDefined: !!customElements.get('luz-site-consent'),
      host: document.querySelector('#consent')?.parentElement?.localName,
      title: !!document.querySelector('#consent .luz-consent__title'),
      choices: !!document.querySelector('#consent .luz-consent__choices'),
      oldClass: !!document.querySelector('[class*="luz-site-consent"]'),
    }));
    expect(names).toEqual({ defined: true, oldDefined: false, host: 'luz-consent', title: true, choices: true, oldClass: false });
  });

  // SEC-CHUNK-5 (R7): a CDN copy and a bundled copy of the chunk on one page
  test('loaded from two copies of the module, one answer is one luz:consent event', async ({ page }) => {
    await listen(page);
    await open(page);
    await page.evaluate(() => import('/packages/site/dist/consent.js'));
    await page.click('#accept');
    await expect(page.locator('#done')).toBeVisible();
    expect(await page.evaluate(() => window.__events)).toHaveLength(1);
  });

  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}, asking, with the choices open, and saved`, async ({ page }) => {
      await open(page);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await expect(page.locator('#consent')).toBeVisible();
      await page.click('#choose');
      const scan = async () => (await new AxeBuilder({ page }).include('#consent').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze())
        .violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id);
      expect(await scan()).toEqual([]);
      await page.click('#reject');
      await expect(page.locator('#done')).toBeVisible();
      expect(await scan()).toEqual([]);
    });
  }

  test('with no stored choice it shows as a band fixed at the block end of the window, without taking focus; the skip link stays first', async ({ page }) => {
    await open(page);
    await expect(page.locator('#consent')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Cookies on Bodega Albar' })).toHaveCount(1);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    const band = await page.locator('#consent').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { position: getComputedStyle(el).position, bottom: r.bottom, left: r.left, width: r.width, window: window.innerHeight };
    });
    expect(band.position).toBe('fixed');
    expect(band.bottom).toBeCloseTo(band.window, 0);
    expect(band.left).toBe(0);
    expect(band.width).toBe(1280);
    // Still first in the page after the skip link (C1), whatever its place on screen
    expect(await page.evaluate(() => document.getElementById('skip').nextElementSibling?.localName)).toBe('luz-consent');
    const order = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => document.activeElement.id));
    }
    expect(order).toEqual(['skip', 'policy', 'accept', 'reject', 'choose', 'notice-link']);
  });

  /**
   * Open the page with the module held until the page has been painted, as
   * the presence loader delivers it (on idle, after first paint): what the
   * module then shows or un-hides must shift nothing.
   */
  async function openLate(page, width) {
    const release = await hold(page, /consent\.min\.js/);
    await watchLayoutShift(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(FIXTURE, { waitUntil: 'commit' });
    await expect(page.locator('h1')).toBeVisible();
    await page.waitForTimeout(300);
    release();
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-consent'))).toBe(true);
    await page.waitForTimeout(500);
  }

  for (const width of [320, 1440]) {
    test(`${width} px: showing it after the first paint moves nothing (layout shift 0), with the reopen button in view (C11)`, async ({ page }) => {
      await openLate(page, width);
      await expect(page.locator('#consent')).toBeVisible();
      await expect(page.locator('#settings')).toBeVisible();
      expect(await layoutShift(page)).toBe(0);
    });
  }

  test('C11: the reopen button has its space before the script un-hides it: at 320 px, with no band to show, nothing moves', async ({ page }) => {
    await store(page, { version: 1, expires: Date.now() + 1e9, asked: ['analytics', 'marketing'], granted: [] });
    await openLate(page, 320);
    await expect(page.locator('#consent')).toBeHidden();
    await expect(page.locator('#settings')).toBeVisible();
    expect(await layoutShift(page)).toBe(0);
  });

  test('Accept and Reject have equal weight: same colours, same size of text, the same height', async ({ page }) => {
    await open(page);
    const look = (id) => page.locator(`#${id}`).evaluate((b) => {
      const s = getComputedStyle(b);
      return [s.backgroundColor, s.color, s.fontSize, s.fontWeight, s.borderTopWidth, Math.round(b.getBoundingClientRect().height)];
    });
    expect(await look('reject')).toEqual(await look('accept'));
  });

  for (const [button, granted] of [['accept', ['analytics', 'marketing']], ['reject', []]]) {
    test(`${button}: stores the choice, dispatches luz:consent, and the confirmation takes focus; the next page does not ask`, async ({ page }) => {
      await listen(page);
      await open(page);
      await page.click(`#${button}`);
      await expect(page.locator('#done')).toBeVisible();
      await expect(page.locator('#done')).toBeFocused();
      await expect(page.locator('[data-luz-consent-ask]')).toBeHidden();
      const value = await stored(page);
      expect(value).toMatchObject({ version: 1, asked: ['analytics', 'marketing'], granted });
      // 180 days by default
      expect(Math.round((value.expires - Date.now()) / 864e5)).toBe(180);
      expect(await page.evaluate(() => window.__events)).toEqual([{ asked: ['analytics', 'marketing'], granted, expires: value.expires }]);

      await page.reload();
      await expect(page.locator('#consent')).toBeHidden();
      await expect(page.locator('#settings')).toBeVisible();
      expect(await page.evaluate(() => window.__events)).toEqual([]);
    });
  }

  test('Save my choices stores the ticked ones; Enter in a checkbox saves them too, and never accepts all', async ({ page }) => {
    await open(page);
    await page.click('#choose');
    await page.check('#c-analytics');
    await page.click('#save');
    expect((await stored(page)).granted).toEqual(['analytics']);

    await page.evaluate(() => localStorage.clear());
    await open(page);
    await page.click('#choose');
    await page.check('#c-marketing');
    await page.focus('#c-marketing');
    await page.keyboard.press('Enter');
    await expect(page.locator('#done')).toBeVisible();
    expect((await stored(page)).granted).toEqual(['marketing']);
  });

  test('Escape is not an answer: nothing is stored and the banner stays', async ({ page }) => {
    await open(page);
    await page.focus('#accept');
    await page.keyboard.press('Escape');
    await page.click('#choose');
    await page.focus('#c-analytics');
    await page.keyboard.press('Escape');
    expect(await stored(page)).toBeNull();
    await expect(page.locator('#consent')).toBeVisible();
    await expect(page.locator('[data-luz-consent-ask]')).toBeVisible();
  });

  test('asks again when the choice has expired, is malformed, or was not asked about a category the banner now offers', async ({ page }) => {
    const later = Date.now() + 1e9;
    for (const value of [
      { version: 1, expires: Date.now() - 1000, asked: ['analytics', 'marketing'], granted: [] },
      'not json',
      { version: 2, expires: later, asked: ['analytics', 'marketing'], granted: [] },
      { version: 1, expires: later, asked: ['analytics', 'marketing'], granted: ['Bad name'] },
      { version: 1, expires: later, asked: ['analytics'], granted: ['analytics'] },
    ]) {
      const context = await page.context().browser().newContext();
      const fresh = await context.newPage();
      await store(fresh, value);
      await open(fresh);
      await expect(fresh.locator('#consent'), JSON.stringify(value)).toBeVisible();
      await context.close();
    }
    // A category already granted is ticked when the banner asks about a new one
    const context = await page.context().browser().newContext();
    const fresh = await context.newPage();
    await store(fresh, { version: 1, expires: later, asked: ['analytics'], granted: ['analytics'] });
    await open(fresh);
    await fresh.click('#choose');
    await expect(fresh.locator('#c-analytics')).toBeChecked();
    await expect(fresh.locator('#c-marketing')).not.toBeChecked();
    await context.close();
  });

  test('a valid choice is not asked again, and the reopen button shows it ticked and moves focus to the banner', async ({ page }) => {
    await store(page, { version: 1, expires: Date.now() + 1e9, asked: ['analytics', 'marketing'], granted: ['marketing'] });
    await open(page);
    await expect(page.locator('#consent')).toBeHidden();
    await page.click('#settings');
    await expect(page.locator('#consent')).toBeVisible();
    await expect(page.locator('#consent')).toBeFocused();
    await page.click('#choose');
    await expect(page.locator('#c-marketing')).toBeChecked();
    await expect(page.locator('#c-analytics')).not.toBeChecked();
  });

  test('blocked storage: the banner still answers, for this page', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page);
    await expect(page.locator('#consent')).toBeVisible();
    await page.click('#reject');
    await expect(page.locator('#done')).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('320 px and 200 % text, both directions: the buttons stack, nothing scrolls sideways', async ({ page }) => {
    for (const dir of ['ltr', 'rtl']) {
      await open(page, 320, dir);
      await style(page, 'html { font-size: 200% }');
      await page.click('#choose');
      expect(await sideways(page), dir).toBeLessThanOrEqual(0);
      const [accept, reject] = await Promise.all(['#accept', '#reject'].map((s) => page.locator(s).boundingBox()));
      expect(reject.y, dir).toBeGreaterThanOrEqual(accept.y + accept.height - 1);
      const beyond = await page.evaluate(() => [...document.querySelectorAll('#consent *')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > document.documentElement.clientWidth + 0.5 || r.left < -0.5;
      }).length);
      expect(beyond, dir).toBe(0);
    }
  });
});
