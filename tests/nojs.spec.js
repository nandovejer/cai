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

  test(`${app}: no control that carries a script hook is shown dead`, async ({ page }) => {
    await page.goto(app);
    // Scripts bind to data-* hooks (PRINCIPLES.md §3). Without JavaScript, a
    // visible control with a hook must still do something natively: submit
    // or reset its form, open a popover, or run a command. A specimen button
    // with no hook is inert in both states and is not reported.
    const dead = await page.evaluate(() =>
      [...document.querySelectorAll('button, input[type="button"], [role="button"], a[href^="javascript:"]')]
        .filter((el) => el.checkVisibility({ visibilityProperty: true }) && !el.closest('[aria-hidden="true"], [inert]'))
        .filter((el) => !el.disabled)
        .filter((el) => el.matches('a') || [...el.attributes].some((a) => a.name.startsWith('data-')))
        .filter((el) => !(el.form && ['submit', 'reset'].includes(el.type)))
        .filter((el) => !el.popoverTargetElement)
        .filter((el) => !(el.getAttribute('commandfor') && 'commandForElement' in HTMLButtonElement.prototype))
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} [${[...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => a.name).join(' ')}] "${el.textContent.trim().slice(0, 30)}"`),
    );
    expect(dead, 'visible controls that need JavaScript').toEqual([]);
  });
}
