/**
 * CAI — the no-JavaScript state (PRINCIPLES.md §3, red line 2).
 * Runs in the `chromium-nojs` project, where JavaScript is disabled.
 * Each test says what the page must still do without scripts.
 */
import { test, expect } from '@playwright/test';

const APPS = ['/', '/docs/', '/platform/', '/html/'];

for (const app of APPS) {
  test(`${app}: content is readable without JavaScript`, async ({ page }) => {
    await page.goto(app);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    // No horizontal scroll at 320 px (WCAG 1.4.10)
    await page.setViewportSize({ width: 320, height: 800 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test(`${app}: no JavaScript-only control is rendered dead`, async ({ page }) => {
    await page.goto(app);
    // Controls whose behaviour lives in JavaScript. Without JS they must be
    // hidden (or replaced by a native equivalent), never shown and inert.
    const jsOnly = [
      '.cai-copy-btn',
      '.cai-theme-apply-btn',
      '.cai-theme-mode-btn',
      '.landing-modes button',
      '.elements-modes button',
      '.cai-player button',
      '[role="switch"]:not(input)',
      '[role="slider"]:not(input)',
    ].join(', ');
    const dead = await page.evaluate((selector) =>
      [...document.querySelectorAll(selector)]
        .filter((el) => el.checkVisibility({ visibilityProperty: true }) && !el.closest('[aria-hidden="true"]'))
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`),
    jsOnly);
    expect([...new Set(dead)], 'visible JavaScript-only controls').toEqual([]);
  });
}
