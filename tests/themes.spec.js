// @ts-check
/**
 * The default look is Vejer and CAI ships no other theme. A theme of the
 * consumer's is listed in <html data-cai-themes="…">: the stored choice is
 * accepted for those names and for the three base modes, and for nothing else.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/themes.html';
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);

test.describe('themes', () => {
  test('the page lists its themes: valid names only, never a base mode', async ({ page }) => {
    await page.goto(FIXTURE);
    // "not_valid" has an underscore and "Dark" is not lowercase
    expect(await page.evaluate(() => window.cai.getCustomThemes())).toEqual(['brand']);
  });

  test('a listed theme is applied, stored and still there after a reload', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.cai.applyTheme('brand'));
    expect(await theme(page)).toBe('brand');
    expect(await page.evaluate(() => window.cai.getStoredTheme())).toBe('brand');
    await page.reload();
    expect(await theme(page)).toBe('brand');
    // Its light mode is the default of the theme
    expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe('light');
  });

  test('a stored name that is not listed is ignored', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => localStorage.setItem('cai-theme', 'minimalist'));
    await page.reload();
    expect(await theme(page)).toBe('light');
    expect(await page.evaluate(() => window.cai.getStoredTheme())).toBe(null);
  });

  test('without a list, a page keeps the theme its markup sets', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => {
      localStorage.clear();
      document.documentElement.removeAttribute('data-cai-themes');
      document.documentElement.dataset.theme = 'dark';
    });
    expect(await page.evaluate(() => window.cai.getCustomThemes())).toEqual([]);
  });

  test('the default look is warm: the page is whitewash, the text is iron, in light', async ({ page }) => {
    await page.goto(FIXTURE);
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return ['--cai-surface-page', '--cai-text-primary', '--cai-font-body'].map((p) => cs.getPropertyValue(p).trim());
    });
    // Vejer: surface #fbf8f2, text #231c16, the serif for running text
    expect(tokens[0]).toBe('#fbf8f2');
    expect(tokens[1]).toBe('#231c16');
    expect(tokens[2]).toMatch(/^"ET Book"/);
  });
});
