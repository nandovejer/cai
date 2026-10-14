// @ts-check
/**
 * Print styles (packages/core/src/print, luz.print): a representative docs
 * page rendered with media "print", in the dark mode, must come out as paper
 * would: white and black, no navigation, no controls, the address of an
 * external link, no breaks inside a figure, a table row or code, the table
 * header repeated, and every tab panel shown.
 */
import { test, expect } from '@playwright/test';

const ROUTE = '/docs/components/select/';

const style = (page, selector, pseudo, property) =>
  page.locator(selector).first().evaluate((el, [p, prop]) => getComputedStyle(el, p || null).getPropertyValue(prop), [pseudo, property]);

test.describe('print', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForLoadState('networkidle');
    // The worst case for paper: the dark mode is on
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
  });

  test('on a screen nothing changes: the dark page stays dark and no address is added', async ({ page }) => {
    await page.emulateMedia({ media: 'screen' });
    expect(await style(page, 'body', '', 'background-color')).not.toBe('rgb(255, 255, 255)');
    const link = page.locator('main a[href^="http"]').first();
    await expect(link).toHaveCount(1);
    expect(await link.evaluate((el) => getComputedStyle(el, '::after').content)).toBe('none');
  });

  test('paper is white and ink is black, in the dark mode too', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    // The theme change that preceded may still be easing, on a screen
    await expect.poll(() => style(page, 'body', '', 'color')).toBe('rgb(0, 0, 0)');
    expect(await style(page, 'body', '', 'background-color')).toBe('rgb(255, 255, 255)');
    // A component that reads tokens follows: the table header is not a dark surface
    await expect.poll(() => style(page, '.luz-table th', '', 'background-color')).toBe('rgb(255, 255, 255)');
    await expect.poll(() => style(page, '.luz-table td', '', 'color')).toBe('rgb(0, 0, 0)');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light');
  });

  test('navigation and screen-only controls are not printed', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    const shown = await page.evaluate(() =>
      [...document.querySelectorAll('nav, .luz-sidebar, .luz-tabs, .luz-copy-btn, .luz-player')]
        .filter((el) => el.checkVisibility())
        .map((el) => `${el.localName}.${el.className}`),
    );
    expect(shown).toEqual([]);
    // There is something to hide on this page, or the test says nothing
    expect(await page.locator('nav, .luz-tabs, .luz-copy-btn').count()).toBeGreaterThan(0);
  });

  test('an external link shows its address after its text', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    const link = page.locator('main a[href^="http"]:not(.luz-btn)').first();
    const href = await link.getAttribute('href');
    const content = await link.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(content).toContain(href);
  });

  test('a figure, a code block, a table and a row do not break', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    for (const selector of ['pre', 'table', 'tr']) {
      expect(await style(page, selector, '', 'break-inside'), selector).toBe('avoid');
    }
    expect(await style(page, 'h2', '', 'break-after')).toBe('avoid');
  });

  test('the header row of a table is the header group, repeated on each page', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    expect(await style(page, 'thead', '', 'display')).toBe('table-header-group');
  });

  test('every tab panel is shown, not only the open one', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.luz-tabpanel')]
        .filter((el) => getComputedStyle(el).display === 'none' || getComputedStyle(el).contentVisibility === 'hidden')
        .map((el) => el.id),
    );
    expect(hidden).toEqual([]);
  });

  test('a wide table and a code block are not clipped', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    expect(await style(page, '.luz-table-wrap', '', 'overflow-x')).toBe('visible');
    expect(await style(page, 'pre.luz-code-block', '', 'white-space')).toBe('pre-wrap');
  });
});
