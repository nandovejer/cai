// @ts-check
/**
 * The presence loader (packages/site/src/site.js, .claude/plans/specs/f3-package-model.md,
 * section 2.3 and 9 step 7): site.min.js scans the page once and loads
 * search.min.js only when there is a <luz-search> (on its first pointerdown or
 * focusin, or on idle) and consent.min.js only when there is a <luz-consent>
 * (on idle) and mode.min.js only when there is a <luz-mode> (on idle). Content added later is not upgraded until the page imports the
 * chunk by hand. Security: SEC-CHUNK-4 (R5), the full-SRI path is an import map
 * with an `integrity` section: a chunk with a wrong hash is never defined, in
 * every engine. A modulepreload with `integrity` is only a hint: Chromium
 * reuses its verdict, WebKit and Firefox (reviewed 2026-10-16) fetch or run the
 * file anyway.
 * Idle is held with a stub of requestIdleCallback (tests/helpers/site-loader.js).
 */
import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { EMPTY, MODE_PAGE, PAGE, SEARCH_CHUNK, chunkRequests, holdIdle, isDefined, layoutShift, releaseIdle, watchLayoutShift } from './helpers/site-loader.js';

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

test.describe('the loader: the mode chunk', () => {
  test('(e) with a <luz-mode>, the mode chunk waits for idle: not requested while idle is held', async ({ page }) => {
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(MODE_PAGE);
    await page.waitForTimeout(SETTLE);
    expect(seen).toEqual([]);
    expect(await isDefined(page, 'luz-mode')).toBe(false);
  });

  test('(e) idle requests the mode chunk, once, and defines <luz-mode>; the search and consent chunks are not requested', async ({ page }) => {
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(MODE_PAGE);
    await releaseIdle(page);
    await expect.poll(() => seen).toContain('mode');
    await expect.poll(() => isDefined(page, 'luz-mode')).toBe(true);
    await page.waitForTimeout(SETTLE);
    expect(seen).toEqual(['mode']);
  });

  test('(e) with no stub the mode chunk arrives by itself', async ({ page }) => {
    const seen = chunkRequests(page);
    await page.goto(MODE_PAGE);
    await expect.poll(() => seen).toEqual(['mode']);
    await expect.poll(() => isDefined(page, 'luz-mode')).toBe(true);
  });

  for (const url of [EMPTY, PAGE]) {
    test(`(e) a page without a <luz-mode> never requests the mode chunk, idle or not (${url})`, async ({ browser }) => {
      // A page of its own per URL: the idle stub and the request listener are installed once
      const page = await browser.newPage();
      await holdIdle(page);
      const seen = chunkRequests(page);
      await page.goto(url);
      await releaseIdle(page);
      await page.waitForTimeout(SETTLE);
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(SETTLE);
      expect(seen).not.toContain('mode');
      expect(await isDefined(page, 'luz-mode')).toBe(false);
      await page.close();
    });
  }
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
    // S1: a control under focus is not swapped, so the focus leaves before the import
    await page.locator('#fallback').blur();
    expect(await page.locator('luz-search').evaluate((el) => el.matches(':defined'))).toBe(false);
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#trigger')).toBeHidden();

    await page.evaluate(() => import('/packages/site/dist/search.min.js'));
    expect(await page.locator('luz-search').evaluate((el) => el.matches(':defined'))).toBe(true);
    await expect(page.locator('#trigger')).toBeVisible();
    await expect(page.locator('#fallback')).toBeHidden();
  });
});

test.describe('the loader: the load event (Firefox review)', () => {
  // Gecko delays `load` while a dynamic import() is pending (load at 3 s with the chunk held 3 s); the
  // loader waits for `load` before it imports on idle. Chromium never showed it, so this passes there
  // today and guards the behaviour; the red guard is tests/site-idle.test.js.
  test('the page load event is not delayed by a chunk the network holds for 3 s', async ({ page }) => {
    await page.route(SEARCH_CHUNK, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue().catch(() => {});
    });
    await page.goto(PAGE, { waitUntil: 'load' });
    const loadAt = await page.evaluate(() => performance.getEntriesByType('navigation')[0].loadEventStart);
    expect(loadAt).toBeLessThan(1000);
    expect(await isDefined(page)).toBe(false);
    await expect.poll(() => isDefined(page), { timeout: 8000 }).toBe(true);
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

// SEC-CHUNK-4 (R5), the full-SRI path: an import map with an `integrity` section
// before site.min.js. WebKit 26.6 and Firefox 155 honour it; so does Chromium
// (127+). The page is the fixture with the import map added.
test.describe('the loader: an import map with integrity (R5)', () => {
  /** The fixture with `<script type="importmap">{"integrity": {...}}</script>` before site.min.js. */
  async function withImportMap(page, integrity) {
    await page.route(/\/tests\/fixtures\/site-loader\.html$/, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        '<script type="module"',
        `<script type="importmap">${JSON.stringify({ integrity })}</script>\n  <script type="module"`,
      );
      await route.fulfill({ response, body: html });
    });
  }
  const CHUNK_URL = '/packages/site/dist/search.min.js';

  test('the right hash lets the chunk run: the element is defined', async ({ page }) => {
    const body = await (await page.request.get(CHUNK_URL)).body();
    await withImportMap(page, { [CHUNK_URL]: `sha384-${createHash('sha384').update(body).digest('base64')}` });
    await page.goto(PAGE);
    await expect.poll(() => isDefined(page)).toBe(true);
  });

  test('a wrong hash makes the import reject: the element stays undefined, the fallback works, nothing is logged', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await withImportMap(page, { [CHUNK_URL]: `sha384-${'A'.repeat(64)}` });
    await holdIdle(page);
    await page.goto(PAGE);
    await page.locator('#fallback').dispatchEvent('pointerdown');
    await releaseIdle(page);
    await page.waitForTimeout(800);
    expect(await isDefined(page)).toBe(false);
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#trigger')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('each URL has its own entry: a wrong hash for the consent chunk blocks that one only, the search chunk (not listed) loads', async ({ page }) => {
    const body = await (await page.request.get(CHUNK_URL)).body();
    await withImportMap(page, { '/packages/site/dist/consent.min.js': `sha384-${createHash('sha384').update(body).digest('base64')}` });
    await page.goto(PAGE);
    // the entry for consent.min.js holds the hash of search.min.js, so the consent chunk is blocked; the search is not listed and loads
    await expect.poll(() => isDefined(page)).toBe(true);
    await page.waitForTimeout(800);
    expect(await isDefined(page, 'luz-consent')).toBe(false);
  });
});

// A <link rel="modulepreload" integrity> is a performance hint, not a guard: only Chromium
// reuses its verdict (SEC-CHUNK-4, M1 of the Safari and Firefox reviews).
test.describe('the loader: modulepreload with integrity (R5, a hint)', () => {
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

  test('a wrong hash never defines the element, sends no second request, and leaves the fallback working', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WebKit 26.6 runs the preloaded file unverified and Firefox 155 fetches it again without integrity: only Chromium reuses the preload verdict. The import map test above runs everywhere.');
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
