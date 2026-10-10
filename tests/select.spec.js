// @ts-check
/**
 * Select (.cai-select): the closed box in every theme, forced colors and
 * right-to-left text, the list boxes without an arrow, and the keyboard focus.
 * The layering (nothing of layer 1 depends on `appearance: base-select`) is
 * checked on the CSS in tests/select.test.js. Run with: pnpm test:ui
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/docs/components/select/';
const THEMES = ['light', 'dark', 'high-contrast'];

const style = (locator, props) =>
  locator.evaluate((el, names) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n)]));
  }, props);

/**
 * Take the second layer away, as a browser without `appearance: base-select`
 * would see the page: every @supports rule for it is removed from the CSSOM.
 * Returns how many rules went.
 */
const withoutBaseSelect = (page) =>
  page.evaluate(() => {
    let removed = 0;
    const walk = (sheet) => {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        return;
      }
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (rule instanceof window.CSSSupportsRule && rule.conditionText.includes('base-select')) {
          sheet.deleteRule(i);
          removed++;
        } else if (rule.styleSheet) walk(rule.styleSheet);
        else if (rule.cssRules && rule.parentStyleSheet === sheet && !(rule instanceof window.CSSStyleRule)) walk(rule);
      }
    };
    for (const sheet of document.styleSheets) walk(sheet);
    return removed;
  });

test.describe('Select', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForLoadState('networkidle');
  });

  for (const theme of THEMES) {
    test(`has no axe violations in ${theme}`, async ({ page }) => {
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page })
        .include('#c-select [data-docs-specimen]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(violations.map((v) => v.id)).toEqual([]);
    });

    test(`sets color-scheme from the theme, so the native list matches (${theme})`, async ({ page }) => {
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
      const { 'color-scheme': scheme } = await style(page.locator('#s-country'), ['color-scheme']);
      expect(scheme).toBe(theme === 'dark' ? 'dark' : 'light');
    });
  }

  test('is at least 24 CSS px high, with a visible label', async ({ page }) => {
    const box = await page.locator('#s-country').boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(24);
    await expect(page.getByLabel('Country', { exact: true })).toHaveCount(1);
  });

  test('draws a text-colored arrow, with no content for a screen reader', async ({ page }) => {
    await withoutBaseSelect(page);
    const select = page.locator('#s-country');
    const { 'background-image': image, color } = await style(select, ['background-image', 'color']);
    // The arrow is gradients in currentcolor, so it resolves to the text color
    expect(image).toContain('linear-gradient');
    expect(image).toContain(color);
    await expect(page.locator('.cai-select-wrap')).toHaveCount(0);
  });

  test('shows a keyboard focus ring and a thicker border', async ({ page }) => {
    const select = page.locator('#s-country');
    await page.keyboard.press('Tab');
    await select.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(select).toBeFocused();
    const s = await style(select, ['outline-style', 'outline-width', 'border-bottom-width']);
    expect(s['outline-style']).toBe('solid');
    expect(s['outline-width']).toBe('2px');
    expect(s['border-bottom-width']).toBe('2px');
  });

  test('keeps the arrow and the border in forced colors', async ({ page }) => {
    await withoutBaseSelect(page);
    await page.emulateMedia({ forcedColors: 'active' });
    const select = page.locator('#s-country');
    const s = await style(select, ['background-image', 'border-bottom-style', 'border-bottom-width', 'border-bottom-color', 'color', 'background-color']);
    expect(s['border-bottom-style']).toBe('solid');
    expect(Number.parseFloat(s['border-bottom-width'])).toBeGreaterThanOrEqual(1);
    expect(s['background-image']).toContain('linear-gradient');
    // Border, arrow and text take the system colors, which differ from the field
    expect(s['border-bottom-color']).not.toBe(s['background-color']);
    expect(s.color).not.toBe(s['background-color']);
  });

  test('moves the arrow to the inline end in right-to-left text', async ({ page }) => {
    await withoutBaseSelect(page);
    const select = page.locator('#s-country');
    const ltr = await style(select, ['background-position']);
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    const rtl = await style(select, ['background-position']);
    expect(ltr['background-position']).toContain('calc(100%');
    expect(rtl['background-position']).not.toContain('calc(100%');
    const { 'padding-left': left, 'padding-right': right } = await style(select, ['padding-left', 'padding-right']);
    expect(Number.parseFloat(left)).toBeGreaterThan(Number.parseFloat(right));
  });

  test('a list box (multiple, size) has no arrow and a full border', async ({ page }) => {
    const s = await style(page.locator('#s-multiple'), ['background-image', 'border-top-width', 'border-top-style']);
    expect(s['background-image']).toBe('none');
    expect(s['border-top-style']).toBe('solid');
    expect(s['border-top-width']).toBe('1px');
  });

  test('marks an error with a thicker border, and a disabled select with a dashed one', async ({ page }) => {
    const error = await style(page.locator('#s-error'), ['border-bottom-width']);
    expect(error['border-bottom-width']).toBe('2px');
    const disabled = await style(page.locator('#s-disabled'), ['border-bottom-style', 'cursor']);
    expect(disabled['border-bottom-style']).toBe('dashed');
    expect(disabled.cursor).toBe('not-allowed');
  });

  test('picks an option from the keyboard, with no script', async ({ page }) => {
    const select = page.locator('#s-country');
    await select.selectOption('es');
    await expect(select).toHaveValue('es');
    await select.focus();
    await page.keyboard.type('Fr');
    await expect(select).toHaveValue('fr');
  });

  test('in a browser without base-select, the closed box is the whole component', async ({ page }) => {
    const supported = await page.evaluate(() => window.CSS.supports('appearance', 'base-select'));
    const { 'background-image': image } = await style(page.locator('#s-country'), ['background-image']);
    // Where the list is styled, the browser's own icon replaces the gradient
    // arrow; where it is not, the gradient arrow must be there
    expect(image).toBe(supported ? 'none' : image);
    expect(await withoutBaseSelect(page)).toBeGreaterThan(0);
    const bare = await style(page.locator('#s-country'), ['background-image', 'appearance']);
    expect(bare['background-image']).toContain('linear-gradient');
    expect(bare.appearance).toBe('none');
  });
});
