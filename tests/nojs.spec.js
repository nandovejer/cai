/**
 * CAI — the no-JavaScript state (PRINCIPLES.md §3, red line 2).
 * Runs in the `chromium-nojs` project, where JavaScript is disabled.
 * Each test says what the page must still do without scripts.
 */
import { test, expect } from '@playwright/test';
import { gotoId, notFoundRoute, routes, routesWith } from './helpers/docs-site.js';

const APPS = ['/', ...routes(), notFoundRoute];

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
      '.cai-platform-search-trigger',
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

// a11y.md TAB-1/TAB-3: the Code and Design tabs of a component or pattern page
for (const route of routesWith('docs-view-tabs')) {
  test(`${route}: Code and Design are stacked sections, each under its visible h2`, async ({ page }) => {
    await page.goto(route);
    const row = page.getByRole('navigation', { name: /documentation$/ });
    await expect(row.getByRole('link')).toHaveText(['Code', 'Design']);
    await expect(page.getByRole('tab')).toHaveCount(0);
    for (const [panel, heading, text] of [['code-panel', 'code', 'Code'], ['design-panel', 'design', 'Design']]) {
      await expect(page.locator(`#${panel}`)).toBeVisible();
      await expect(page.locator(`#${heading}`)).toBeVisible();
      await expect(page.locator(`#${heading}`)).toHaveText(text);
      expect(await page.locator(`#${heading}`).evaluate((h) => h.tagName)).toBe('H2');
    }
    // Known issues, above them, and When to use / When not to use (red line 18)
    for (const id of ['known-issues', 'when', 'when-not', 'how', 'keyboard']) await expect(page.locator(`#${id}`)).toBeVisible();
    // Code comes first, in the DOM and on screen
    const top = (id) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
    expect(await top('code')).toBeLessThan(await top('design'));
  });
}

// a11y.md SRCH-1, SRCH-28: no search dialog without JavaScript; the
// header's search is a plain link to the A–Z index, which lists every page
for (const app of ['/', '/docs/', '/docs/components/button/', notFoundRoute]) {
  test(`${app}: the search is a link to the A–Z index`, async ({ page }) => {
    await page.goto(app);
    const banner = page.getByRole('banner');
    const link = banner.getByRole('link', { name: 'A–Z index' });
    await expect(link).toBeVisible();
    await expect(banner.getByRole('button', { name: /^Search docs/ })).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const href = await link.evaluate((a) => a.href);
    const response = await page.request.get(href);
    expect(response.status()).toBe(200);
  });
}

// a11y.md SRCH-4: at 320 px the header stays one row without JavaScript.
// The fallback link shows "A–Z"; its name stays "A–Z index" (2.5.3).
for (const app of ['/', '/docs/', '/docs/components/button/', notFoundRoute]) {
  test(`${app}: the header is one row at 320 px, with the short A–Z link`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(app);
    const link = page.getByRole('banner').getByRole('link', { name: 'A–Z index', exact: true });
    await expect(link).toBeVisible();
    // painted text: the link's words outside a visually hidden (1 px, clipped) box
    expect(await link.evaluate((a) => [...a.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE || n.getBoundingClientRect().width > 1)
      .map((n) => n.textContent).join('').trim())).toBe('A–Z');
    const rows = await page.locator('.site-header__inner').evaluate((row) =>
      new Set([...row.children]
        .filter((el) => el.checkVisibility())
        .map((el) => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2))).size);
    expect(rows, 'rows of controls in the header').toBe(1);
    const { height } = await page.locator('.site-header').boundingBox();
    const oneRow = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-h')) * 16);
    expect(height).toBeLessThanOrEqual(oneRow + 1);
  });
}

test('docs: the A–Z index links every page', async ({ page }) => {
  await page.goto('/docs/a-z/');
  const hrefs = new Set(await page.locator('main a').evaluateAll((links) => links.map((a) => new URL(a.href).pathname)));
  for (const route of routes().filter((r) => r !== '/docs/a-z/')) expect(hrefs.has(route), route).toBe(true);
});

test('docs: the home shows the A–Z link in place of the big search button', async ({ page }) => {
  await page.goto('/docs/');
  await expect(page.getByRole('main').getByRole('link', { name: 'Browse the A–Z index' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /^Search docs/ })).toBeHidden();
});

test('docs: the image placeholder shows without JavaScript', async ({ page }) => {
  await gotoId(page, 'demo-image-empty');
  const empty = page.locator('#demo-image-empty');
  await expect(empty).toBeVisible();
  expect(await empty.evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(/placeholder-16x9-1920\.avif/);
});

test('docs: the color mode switcher is three radios that set the mode', async ({ page }) => {
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
    // the site links are in the drawer, first; only Components stays in the header row
    await expect(page.locator('.site-header__nav a:visible')).toHaveText(['Components']);
    await expect(drawer.getByRole('list', { name: 'Site' }).getByRole('link')).toHaveText(['Home', 'Docs', 'GitHub']);
    // With no script to measure it, the header's height is the CSS value:
    // the drawer opens right below the header, never over its button
    const header = await page.locator('.site-header').boundingBox();
    const nav = await drawer.boundingBox();
    expect(Math.abs(nav.y - (header.y + header.height))).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
}
