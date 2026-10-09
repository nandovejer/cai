/**
 * CAI — the no-JavaScript state (PRINCIPLES.md §3, red line 2).
 * Runs in the `chromium-nojs` project, where JavaScript is disabled.
 * Each test says what the page must still do without scripts.
 */
import { test, expect } from '@playwright/test';

const APPS = ['/', '/docs/'];

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

test('/docs/: the image placeholder shows without JavaScript', async ({ page }) => {
  await page.goto('/docs/');
  const empty = page.locator('#demo-image-empty');
  await expect(empty).toBeVisible();
  expect(await empty.evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(/placeholder-16x9-1920\.avif/);
});

test('/docs/: the color mode switcher is three radios that set the mode', async ({ page }) => {
  await page.goto('/docs/');
  const switcher = page.locator('footer .cai-mode-switcher--cycle');
  await expect(switcher.locator('.cai-mode-btn')).toHaveCount(3);
  for (const label of await switcher.locator('.cai-mode-btn').all()) await expect(label).toBeVisible();
  await expect(page.locator('.cai-mode-cycle')).toBeHidden();
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await background();
  await switcher.locator('.cai-mode-btn:has(input[value="dark"])').click();
  await expect.poll(background).not.toBe(light);
});

for (const app of APPS) {
  test(`${app}: the menu drawer opens and closes without JavaScript`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(app);
    const toggle = page.getByRole('button', { name: 'Menu', exact: true });
    const drawer = page.locator('#page-nav');
    await expect(toggle).toBeVisible();
    await expect(drawer).toBeHidden();
    await toggle.click();
    await expect(drawer).toBeVisible();
    // the site links are in the drawer, first, and not in the header row
    await expect(page.locator('.site-header__nav')).toBeHidden();
    await expect(drawer.getByRole('navigation', { name: 'Site' }).getByRole('link')).toHaveText(['Home', 'Docs', 'GitHub']);
    // With no script to measure it, the header's height is the CSS value:
    // the drawer opens right below the header, never over its button
    const header = await page.locator('.site-header').boundingBox();
    const nav = await drawer.boundingBox();
    expect(Math.abs(nav.y - (header.y + header.height))).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
}
