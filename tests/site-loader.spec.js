// @ts-check
/**
 * The presence loader (packages/site/src/site.js, .claude/plans/specs/f3-package-model.md,
 * section 2.3 and 9 step 7): site.min.js scans the page once and loads
 * search.min.js only when there is a <luz-search> (on its first pointerdown or
 * focusin, or on idle) and consent.min.js only when there is a <luz-consent>
 * (on idle). Content added later is not upgraded until the page imports the
 * chunk by hand. Security: SEC-CHUNK-4 (R5), a modulepreload with a wrong
 * integrity hash never defines the element and sends no second request.
 * Idle is held with a stub of requestIdleCallback (tests/helpers/site-loader.js).
 */
import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { EMPTY, PAGE, SEARCH_CHUNK, chunkRequests, holdIdle, isDefined, layoutShift, releaseIdle, watchLayoutShift } from './helpers/site-loader.js';

const SETTLE = 400;

test.describe('the loader: which chunk, and when', () => {
  test('(a) a page with neither element requests neither chunk, even when idle comes', async ({ page }) => {
    await holdIdle(page);
    const seen = chunkRequests(page);
    const entry = page.waitForRequest(/\/site\.min\.js(\?.*)?$/);
    await page.goto(EMPTY);
    await entry;
    await releaseIdle(page);
    await page.waitForTimeout(SETTLE);
    await page.locator('#notes').click();
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(SETTLE);
    expect(seen).toEqual([]);
  });

  test('(b) with a <luz-search>, the search chunk is not requested while idle is held and nobody touches it', async ({ page }) => {
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(PAGE);
    await page.waitForTimeout(SETTLE);
    expect(seen).toEqual([]);
    expect(await isDefined(page)).toBe(false);
  });

  test('(b) a pointerdown on the search requests the search chunk, once however many presses', async ({ page }) => {
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(PAGE);
    for (let i = 0; i < 3; i++) await page.locator('#fallback').dispatchEvent('pointerdown');
    await expect.poll(() => seen).toEqual(['search']);
    await page.waitForTimeout(SETTLE);
    expect(seen).toEqual(['search']);
    await expect.poll(() => isDefined(page)).toBe(true);
  });

  test('(b) focus arriving in the search requests the search chunk', async ({ page }) => {
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(PAGE);
    await page.locator('#fallback').focus();
    await expect.poll(() => seen).toEqual(['search']);
  });

  test('(b) idle requests the search chunk when nobody touches the search, and defines the element', async ({ page }) => {
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(PAGE);
    await releaseIdle(page);
    await expect.poll(() => seen).toContain('search');
    await expect.poll(() => isDefined(page)).toBe(true);
    // Wired: the trigger shows, the fallback goes
    await expect(page.locator('#trigger')).toBeVisible();
    await expect(page.locator('#fallback')).toBeHidden();
  });

  test('(b) the consent chunk waits for idle: a pointerdown on the banner does not request it, idle does', async ({ page }) => {
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(PAGE);
    await page.locator('#consent-ask').dispatchEvent('pointerdown');
    await page.locator('#consent-ask').dispatchEvent('focusin');
    await page.waitForTimeout(SETTLE);
    expect(seen).not.toContain('consent');
    await releaseIdle(page);
    await expect.poll(() => seen).toContain('consent');
    await expect.poll(() => isDefined(page, 'luz-consent')).toBe(true);
  });

  test('(b) with no stub the chunks arrive by themselves, without the page doing anything', async ({ page }) => {
    const seen = chunkRequests(page);
    await page.goto(PAGE);
    await expect.poll(() => seen.slice().sort()).toEqual(['consent', 'search']);
  });
});

test.describe('the loader: content added after the scan', () => {
  test('(c) an element injected after load stays undefined, and requests nothing, until the page imports the chunk', async ({ page }) => {
    const seen = chunkRequests(page);
    await page.goto(EMPTY);
    await page.waitForTimeout(SETTLE);
    await page.evaluate(() => document.getElementById('slot').append(document.getElementById('markup').content.cloneNode(true)));
    await page.locator('#fallback').dispatchEvent('pointerdown');
    await page.locator('#fallback').focus();
    await page.waitForTimeout(SETTLE);
    expect(seen).toEqual([]);
    expect(await page.locator('luz-search').evaluate((el) => el.matches(':defined'))).toBe(false);
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#trigger')).toBeHidden();

    await page.evaluate(() => import('/packages/site/dist/search.min.js'));
    expect(await page.locator('luz-search').evaluate((el) => el.matches(':defined'))).toBe(true);
    await expect(page.locator('#trigger')).toBeVisible();
    await expect(page.locator('#fallback')).toBeHidden();
  });
});

test.describe('the loader: layout shift (d)', () => {
  for (const width of [320, 1440]) {
    test(`(d) the layout-shift sum from load to 500 ms after both chunks resolve is 0 at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await watchLayoutShift(page);
      await page.goto(PAGE);
      await expect.poll(() => isDefined(page)).toBe(true);
      await expect.poll(() => isDefined(page, 'luz-consent')).toBe(true);
      await page.waitForTimeout(500);
      expect(await layoutShift(page)).toBe(0);
    });
  }
});

// SEC-CHUNK-4 (R5): the full-SRI path is a <link rel="modulepreload" integrity
// crossorigin> per chunk before site.min.js. The page is the fixture with
// that link added.
test.describe('the loader: modulepreload with integrity (R5)', () => {
  /** The fixture with a modulepreload of the search chunk, with `integrity`, before site.min.js. */
  async function withPreload(page, integrity) {
    await page.route(/\/tests\/fixtures\/site-loader\.html$/, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        '<script type="module"',
        `<link rel="modulepreload" href="/packages/site/dist/search.min.js" integrity="${integrity}" crossorigin>\n  <script type="module"`,
      );
      await route.fulfill({ response, body: html });
    });
  }

  test('the right hash lets the chunk run: the element is defined', async ({ page }) => {
    const body = await (await page.request.get('/packages/site/dist/search.min.js')).body();
    await withPreload(page, `sha384-${createHash('sha384').update(body).digest('base64')}`);
    await page.goto(PAGE);
    await expect.poll(() => isDefined(page)).toBe(true);
  });

  test('a wrong hash never defines the element, sends no second request, and leaves the fallback working', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const requests = [];
    page.on('request', (request) => SEARCH_CHUNK.test(request.url()) && requests.push(request.url()));
    await withPreload(page, `sha384-${'A'.repeat(64)}`);
    await holdIdle(page);
    await page.goto(PAGE);
    await page.locator('#fallback').dispatchEvent('pointerdown');
    await releaseIdle(page);
    await page.waitForTimeout(800);
    expect(await isDefined(page)).toBe(false);
    // The preload is the only request for the chunk: the import reuses its verdict
    expect(requests).toHaveLength(1);
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#trigger')).toBeHidden();
    expect(errors).toEqual([]);
  });
});
