// @ts-check
/**
 * The cascade layers a consumer orders (@layer reset, luz, app;): what the
 * docs page /docs/get-started/layers/ says is checked here in a real
 * browser, with tokens, core, a theme of the consumer's and site loaded as published.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/layers.html';
const css = (page, selector, property) => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);

test.describe('cascade layers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
  });

  test('a consumer layer after luz overrides a token of tokens and a theme token', async ({ page }) => {
    // --luz-brand-fill is declared by tokens (luz.tokens) and by a consumer theme (luz.themes)
    await expect.poll(() => css(page, '#probe-component', 'background-color')).toBe('rgb(1, 2, 3)');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--luz-surface-page').trim())).toBe('rgb(250, 251, 252)');
  });

  test('a consumer layer after luz overrides a component', async ({ page }) => {
    expect(await css(page, '#probe-component', 'padding-inline-start')).toBe('7px');
  });

  test('a consumer layer after luz overrides a site pattern', async ({ page }) => {
    expect(await css(page, '#probe-site', 'padding-block-start')).toBe('13px');
  });

  test('unlayered CSS wins over any layer, whatever its order in the source', async ({ page }) => {
    // The app layer says 99px and comes later; the unlayered rule says 21px and comes first
    expect(await css(page, '#probe-unlayered', 'min-height')).toBe('21px');
  });

  test('a consumer layer called "components" is not LUZ\'s: it loses to luz.components when ordered before luz', async ({ page }) => {
    // If LUZ's layers were top-level, this rule would share the layer and win by source order
    expect(await css(page, '#probe-own-layer', 'color')).not.toBe('rgb(5, 6, 7)');
  });

  test('luz.utilities still wins over luz.components', async ({ page }) => {
    // .u-sr-only is clipped to 1px by a utility, over any component rule
    expect(await css(page, '#probe-utility', 'position')).toBe('absolute');
    expect(await css(page, '#probe-utility', 'width')).toBe('1px');
  });
});
