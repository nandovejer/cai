// @ts-check
/**
 * What happens to the search slot while its chunk loads (.claude/plans/specs/f3-package-model.md,
 * accessibility requirements S1 to S4, owner decision S3 (a); security R4):
 *   S1  a control is never swapped under focus or a pressed pointer;
 *   S2  the trigger stays hidden (not focusable, not in the tree) until wired,
 *       and the fallback leaves the Tab order once swapped;
 *   S3  Ctrl+K before the chunk loads it and opens the dialog;
 *   S4  a failed import leaves the fallback working, with a clean console,
 *       and neither retries nor loops (R4, SEC-CHUNK-3; decided in steps 6-7:
 *       a failed module stays in the browser's module map, and a cache-busting
 *       URL would break SEC-CHUNK-1/2).
 * Page: tests/fixtures/site-loader.html (the loader, site.min.js). Idle is held.
 */
import { test, expect } from '@playwright/test';
import { EMPTY, PAGE, SEARCH_CHUNK, chunkRequests, hold, holdIdle, isDefined, releaseIdle } from './helpers/site-loader.js';

const dialog = (page) => page.getByRole('dialog', { name: 'Search' });
const field = (page) => dialog(page).getByRole('textbox', { name: 'Query' });

/** Resolve once the element is defined. */
const defined = (page) => expect.poll(() => isDefined(page)).toBe(true);

test.describe('S1: no control is swapped under the reader', () => {
  test('Tab to the fallback while the chunk is held: after the chunk wires, focus is still on the A–Z link; Tab and Shift+Tab then land on the trigger', async ({ page }) => {
    await holdIdle(page);
    const release = await hold(page, SEARCH_CHUNK);
    await page.goto(PAGE);
    await page.keyboard.press('Tab');
    await expect(page.locator('#fallback')).toBeFocused();
    release();
    await defined(page);
    await page.waitForTimeout(200);
    await expect(page.locator('#fallback')).toBeFocused();
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#trigger')).toBeHidden();
    // Leaving the link swaps the two
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
    await expect(page.locator('#fallback')).toBeHidden();
    await expect(page.locator('#trigger')).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#trigger')).toBeFocused();
  });

  test('a press on the fallback while the chunk is served at once still follows the link', async ({ page }) => {
    await holdIdle(page);
    await page.route('**/a-z/', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>A-Z</title><h1>A–Z index</h1>' }));
    await page.goto(PAGE);
    const box = await page.locator('#fallback').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await defined(page);
    // The chunk has wired while the button is down: the link is still there to be released on
    await expect(page.locator('#fallback')).toBeVisible();
    await page.mouse.up();
    await expect(page).toHaveURL(/\/a-z\/$/);
  });
});

test.describe('S2: the trigger is not a control before it works', () => {
  test('before the chunk the trigger is hidden, not in the tree, and not in the Tab order; the fallback is the only stop', async ({ page }) => {
    await holdIdle(page);
    await hold(page, SEARCH_CHUNK);
    await page.goto(PAGE);
    await expect(page.locator('#trigger')).toBeHidden();
    await expect(page.getByRole('button', { name: /Search/ })).toHaveCount(0);
    await expect(page.locator('#external')).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(page.locator('#fallback')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
  });

  test('once wired the button outside shows, the fallback is out of the Tab order and out of the tree, and the trigger is the stop', async ({ page }) => {
    await holdIdle(page);
    await page.goto(PAGE);
    await releaseIdle(page);
    await defined(page);
    await expect(page.locator('#external')).toBeVisible();
    await expect(page.locator('#fallback')).toBeHidden();
    await expect(page.getByRole('link', { name: 'A–Z index' })).toHaveCount(0);
    await page.keyboard.press('Tab');
    await expect(page.locator('#trigger')).toBeFocused();
  });
});

test.describe('S3: Ctrl+K before the chunk', () => {
  /** Whether each keydown reached the window with its default prevented. */
  const record = (page) =>
    page.addInitScript(() => {
      window.__prevented = [];
      window.__shown = 0;
      // The modifier keys fire their own keydown: only the letter counts
      window.addEventListener('keydown', (e) => !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key) && window.__prevented.push(e.defaultPrevented));
      const show = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = function () {
        window.__shown++;
        return show.call(this);
      };
    });

  test('loads the chunk, takes the key, and opens the dialog with the focus in the field once it is there', async ({ page }) => {
    await record(page);
    await holdIdle(page);
    const seen = chunkRequests(page);
    const release = await hold(page, SEARCH_CHUNK);
    await page.goto(PAGE);
    await page.waitForTimeout(200);
    expect(seen).toEqual([]);
    await page.keyboard.press('Control+k');
    await expect.poll(() => seen).toEqual(['search']);
    expect(await page.evaluate(() => window.__prevented)).toEqual([true]);
    release();
    await expect(dialog(page)).toBeVisible();
    await expect(field(page)).toBeFocused();
    expect(await page.evaluate(() => window.__shown)).toBe(1);
  });

  test('the early handler removes itself: Escape, then Ctrl+K opens the dialog once more, not twice', async ({ page }) => {
    await record(page);
    await holdIdle(page);
    await page.goto(PAGE);
    await page.keyboard.press('Control+k');
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await page.keyboard.press('Control+k');
    await expect(dialog(page)).toBeVisible();
    expect(await page.evaluate(() => window.__shown)).toBe(2);
  });

  test('a single key, Alt+K and Shift+Ctrl+K are left alone and load nothing', async ({ page }) => {
    await record(page);
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(PAGE);
    for (const key of ['k', 'Alt+k', 'Control+Shift+k', '/']) await page.keyboard.press(key);
    await page.waitForTimeout(300);
    expect(seen).toEqual([]);
    expect(await page.evaluate(() => window.__prevented)).toEqual([false, false, false, false]);
  });

  test('in a text area the key is left alone and loads nothing', async ({ page }) => {
    await record(page);
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(PAGE);
    await page.locator('#notes').focus();
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);
    expect(seen).toEqual([]);
    expect(await page.evaluate(() => window.__prevented)).toEqual([false]);
  });

  test('on a page without a <luz-search> the key is not taken and loads nothing', async ({ page }) => {
    await record(page);
    await holdIdle(page);
    const seen = chunkRequests(page);
    await page.goto(EMPTY);
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);
    expect(seen).toEqual([]);
    expect(await page.evaluate(() => window.__prevented)).toEqual([false]);
  });
});

test.describe('S4 and R4: the chunk does not load', () => {
  /** Record what the loader must not cause: page errors, unhandled rejections, console errors. */
  const watch = (page) => {
    const problems = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    // The browser logs a failed request by itself; anything else is the page's
    page.on('console', (m) => m.type() === 'error' && !/^Failed to load resource/.test(m.text()) && problems.push(`console: ${m.text()}`));
    return problems;
  };
  const rejections = (page) =>
    page.addInitScript(() => {
      window.__rejected = [];
      window.addEventListener('unhandledrejection', (e) => window.__rejected.push(String(e.reason)));
    });

  test('a server error: no error anywhere, the fallback shows, the trigger stays hidden', async ({ page }) => {
    const problems = watch(page);
    await rejections(page);
    await holdIdle(page);
    await page.route(SEARCH_CHUNK, (route) => route.fulfill({ status: 500, body: 'no' }));
    // The fixture has a <luz-consent> too: count the search chunk only
    const all = chunkRequests(page);
    const seen = { get length() { return all.filter((c) => c === 'search').length; } };
    await page.goto(PAGE);
    await releaseIdle(page);
    await expect.poll(() => seen.length).toBe(1);
    await page.waitForTimeout(500);
    expect(seen.length).toBe(1);
    expect(problems).toEqual([]);
    expect(await page.evaluate(() => window.__rejected)).toEqual([]);
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#trigger')).toBeHidden();
    await expect(page.locator('#external')).toBeHidden();
    expect(await isDefined(page)).toBe(false);
  });

  test('no retry, no loop: a second pointerdown or focus makes no new request, no error, and the fallback still navigates', async ({ page }) => {
    const problems = watch(page);
    await rejections(page);
    await holdIdle(page);
    await page.route(SEARCH_CHUNK, (route) => route.fulfill({ status: 500, body: 'no' }));
    const all = chunkRequests(page);
    const requested = () => all.filter((c) => c === 'search').length;
    await page.goto(PAGE);
    await releaseIdle(page);
    await expect.poll(requested).toBe(1);
    await page.waitForTimeout(500);
    expect(requested()).toBe(1);
    await page.locator('#fallback').dispatchEvent('pointerdown');
    await page.locator('#fallback').dispatchEvent('pointerdown');
    await page.locator('#fallback').focus();
    await page.locator('#fallback').dispatchEvent('focusin');
    await page.waitForTimeout(500);
    expect(requested(), 'search chunk requests after the second pointerdown and focus').toBe(1);
    expect(problems).toEqual([]);
    expect(await page.evaluate(() => window.__rejected)).toEqual([]);
    expect(await isDefined(page)).toBe(false);
    // The fallback is still the working control
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#trigger')).toBeHidden();
    await page.route(/\/a-z\/$/, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>A-Z</title><h1>A-Z</h1>' }));
    await page.locator('#fallback').click();
    await expect(page).toHaveURL(/\/a-z\/$/);
  });
});
