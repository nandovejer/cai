/**
 * LUZ — the no-JavaScript state (PRINCIPLES.md §3, red line 2).
 * Runs in the `chromium-nojs` project, where JavaScript is disabled.
 * Each test says what the page must still do without scripts.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { notFoundRoute, routes, routesWith } from './helpers/docs-site.js';
import { px } from './helpers/site-loader.js';
import { channels, colorOf, vejer } from './helpers/site-lights.js';

// The home page in each of its languages (apps/landing/i18n)
const APPS = ['/', '/es/', '/ar/', ...routes(), notFoundRoute];

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
      '.luz-copy-btn',
      '.luz-theme-apply-btn',
      '.luz-theme-mode-btn',
      '.luz-player button',
      '.luz-search__trigger',
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
// At 768 px and below the fallback link paints the magnifier alone, a 44 px
// square; its words stay in the page, clipped, so its name stays "A–Z index"
// (2.5.3).
for (const app of ['/', '/docs/', '/docs/components/button/', notFoundRoute]) {
  test(`${app}: the header is one row at 320 px, with the magnifier as the A–Z link`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(app);
    const link = page.getByRole('banner').getByRole('link', { name: 'A–Z index', exact: true });
    await expect(link).toBeVisible();
    // a touch target: 44 px square, from the control token
    const target = await px(page, 'var(--luz-control-lg)');
    const box = await link.boundingBox();
    expect(box.width, 'link width').toBeCloseTo(target, 0);
    expect(box.height, 'link height').toBeCloseTo(target, 0);
    // the words are clipped to a point (visually hidden), not painted
    const label = await link.locator('.luz-search__fallback-label').boundingBox();
    expect(label.width, 'label width').toBeLessThanOrEqual(1);
    expect(label.height, 'label height').toBeLessThanOrEqual(1);
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

test('docs: the color mode switcher is four radios, Auto first and checked, that set the mode', async ({ page }) => {
  await page.goto('/docs/');
  const switcher = page.locator('footer luz-mode .luz-mode-switcher--cycle');
  await expect(switcher.locator('.luz-mode-btn')).toHaveCount(4);
  await expect(switcher.locator('input[name="luz-theme"]')).toHaveCount(4);
  expect(await switcher.locator('input[name="luz-theme"]').evaluateAll((all) => all.map((r) => r.value))).toEqual(['auto', 'light', 'dark', 'high-contrast']);
  await expect(switcher.locator('input[value="auto"]')).toBeChecked();
  for (const label of await switcher.locator('.luz-mode-btn').all()) await expect(label).toBeVisible();
  await expect(page.locator('.luz-mode-cycle')).toBeHidden();
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // Auto is Vejer light without JavaScript: the clock and the system are followed only by the script
  const light = await background();
  await switcher.locator('.luz-mode-btn:has(input[value="dark"])').click();
  await expect.poll(background).not.toBe(light);
  await switcher.locator('.luz-mode-btn:has(input[value="auto"])').click();
  await expect.poll(background).toBe(light);
});

for (const app of ['/', '/docs/', '/docs/components/button/']) {
  test(`${app}: nothing is served about the light, and the page is Vejer light`, async ({ page }) => {
    await page.goto(app);
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-light'))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  });
}

test('docs: the specimens carry no data-theme without JavaScript, and the radios still re-scope them', async ({ page }) => {
  await page.goto('/docs/components/button/');
  const specimens = page.locator('[data-docs-specimen], .docs-dodont__stage');
  expect(await specimens.count()).toBeGreaterThan(1);
  expect(await specimens.evaluateAll((all) => all.filter((el) => el.hasAttribute('data-theme')).length)).toBe(0);
  const specimen = page.locator('[data-docs-specimen]').first();
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // Light first: Vejer's, whatever the hour (nothing is served about the light)
  expect(channels(await colorOf(specimen, '--luz-surface-page'))).toEqual(vejer('light', '--luz-surface-page'));
  const before = await background();
  await page.locator('footer .luz-mode-btn:has(input[value="dark"])').click();
  await expect.poll(background).not.toBe(before);
  // The specimen follows: its tokens are Vejer's dark, not the light it was served in
  // (polled: the page fades between modes when motion is welcome, and the specimen inherits the fade)
  await expect.poll(async () => channels(await colorOf(specimen, '--luz-surface-page'))).toEqual(vejer('dark', '--luz-surface-page'));
  await expect.poll(async () => channels(await colorOf(specimen, '--luz-text-primary'))).toEqual(vejer('dark', '--luz-text-primary'));
  await page.locator('footer .luz-mode-btn:has(input[value="high-contrast"])').click();
  await expect.poll(async () => channels(await colorOf(specimen, '--luz-surface-page'))).toEqual(vejer('high-contrast', '--luz-surface-page'));
});

// The drawer's names on the home page in another language (apps/landing/i18n)
const DRAWER = {
  '/es/': { menu: 'Menú', site: 'Sitio', links: ['Inicio', 'Documentación', 'GitHub'] },
  '/ar/': { menu: 'القائمة', site: 'الموقع', links: ['الرئيسية', 'التوثيق', 'GitHub'] },
};

for (const app of APPS) {
  test(`${app}: the menu drawer opens and closes without JavaScript`, async ({ page }) => {
    const names = DRAWER[app] ?? { menu: 'Menu', site: 'Site', links: ['Home', 'Docs', 'GitHub'] };
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(app);
    const toggle = page.getByRole('button', { name: names.menu, exact: true });
    const drawer = page.locator('#page-nav');
    await expect(toggle).toBeVisible();
    await expect(drawer).toBeHidden();
    await toggle.click();
    await expect(drawer).toBeVisible();
    // the site links are in the drawer, first; none stays in the header row
    await expect(page.locator('.site-header__nav a:visible')).toHaveCount(0);
    await expect(drawer.getByRole('list', { name: names.site }).getByRole('link')).toHaveText(names.links);
    // With no script to measure it, the header's height is the CSS value:
    // the drawer opens right below the header, never over its button
    const header = await page.locator('.site-header').boundingBox();
    const nav = await drawer.boundingBox();
    expect(Math.abs(nav.y - (header.y + header.height))).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
}

// <home-light> on the home (F3 of .claude/plans/luz-home-docs-identity.md): the hero is complete text, the
// light section is an empty element under a heading, and light.css keeps its room so nothing jumps in
// (the same boxes with JavaScript on are compared in tests/home-light.spec.js)
for (const home of ['/', '/es/', '/ar/']) {
  test(`${home}: the light section is an empty <home-light> under a heading and keeps its height`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(home);
    await expect(page.locator('.luz-landing-hero h1')).toBeVisible();
    await expect(page.locator('section#light h2')).toHaveText(/\S/);
    await expect(page.locator('section#light home-light')).toHaveCount(1);
    expect(await page.locator('home-light').evaluate((el) => ({ children: el.childElementCount, text: (el.textContent ?? '').trim() }))).toEqual({ children: 0, text: '' });
    expect((await page.locator('home-light').boundingBox())?.height ?? 0).toBeGreaterThan(200);
  });
}

// The new home (F5 of .claude/plans/luz-home-docs-identity.md, section 3.6): eight sections in a fixed order (the fit lists
// are in "start"), all of them words and native elements; what needs a script (the swatches of the lights, Back to now, the copy buttons) is not shown dead
const SECTIONS = ['hero', 'light', 'why', 'inside', 'native', 'modes', 'type', 'start'];
const HOME_CATALOG = { '/': 'en', '/es/': 'es', '/ar/': 'ar' };
const homeCatalog = (home) => JSON.parse(readFileSync(fileURLToPath(new URL(`../apps/landing/i18n/${HOME_CATALOG[home]}.json`, import.meta.url)), 'utf-8'));

for (const home of ['/', '/es/', '/ar/']) {
  test(`${home}: the eight sections are in the page, in order, and every one but the light has words`, async ({ page }) => {
    await page.goto(home);
    expect(await page.locator('main > section').evaluateAll((all) => all.map((el) => el.id))).toEqual(SECTIONS);
    await expect(page.locator('h1')).toHaveCount(1);
    for (const id of SECTIONS.filter((section) => section !== 'light')) {
      const section = page.locator(`main > section#${id}`);
      await expect(section.locator('h1, h2').first(), id).toBeVisible();
      expect((await section.innerText()).trim().length, id).toBeGreaterThan(30);
    }
  });

  test(`${home}: the light section is not an empty region: a sentence of the catalog is shown in it`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(home);
    const words = Object.values(homeCatalog(home)).map((value) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    const shown = await page.locator('section#light').evaluate((section) => {
      const clean = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const box = section.getBoundingClientRect();
      return [...section.querySelectorAll('*')]
        // Not the heading for screen readers: a sentence a sighted reader can see
        .filter((el) => !el.closest('.u-sr-only, h1, h2, h3, h4, h5, h6, script, style'))
        .filter((el) => el.checkVisibility({ visibilityProperty: true }) && clean(el).length > 0)
        .map((el) => ({ text: clean(el), rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 8 && rect.height > 8 && rect.bottom > box.top && rect.top < box.bottom)
        .map(({ text }) => text);
    });
    const sentences = shown.filter((text) => words.includes(text) && /\s/.test(text) && /[.!?\u061F]$/.test(text));
    expect(sentences, `visible text in #light: ${JSON.stringify(shown)}`).not.toEqual([]);
  });

  test(`${home}: the swatches of the lights are not shown without a script`, async ({ page }) => {
    await page.goto(home);
    const shown = await page.locator('#why button').evaluateAll((all) =>
      all.filter((el) => el.checkVisibility({ visibilityProperty: true }) && el.hasAttribute('aria-pressed')).map((el) => el.textContent.trim()),
    );
    expect(shown).toEqual([]);
    // A control that is in the page and visible must be able to do something: the light card keeps its words
    await expect(page.locator('#why .luz-card').first()).toBeVisible();
  });

  test(`${home}: the six native specimens work: details, popover, range, select, progress and the dialog`, async ({ page }) => {
    await page.goto(home);
    const native = page.locator('#native');
    await expect(native.locator('.luz-card')).toHaveCount(6);

    const details = native.locator('details');
    await details.locator('summary').click();
    expect(await details.evaluate((el) => el.open)).toBe(true);

    const trigger = native.locator('button[popovertarget]');
    const popover = page.locator(`#${await trigger.getAttribute('popovertarget')}`);
    await trigger.click();
    expect(await popover.evaluate((el) => el.matches(':popover-open'))).toBe(true);
    await page.keyboard.press('Escape');
    expect(await popover.evaluate((el) => el.matches(':popover-open'))).toBe(false);

    const range = native.locator('input[type="range"]');
    const before = await range.inputValue();
    await range.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await range.inputValue()).not.toBe(before);

    const select = native.locator('select');
    const options = await select.locator('option').evaluateAll((all) => all.map((o) => o.value));
    const chosen = await select.inputValue();
    await select.selectOption(options.find((value) => value !== chosen));
    expect(await select.inputValue()).not.toBe(chosen);

    await expect(native.locator('progress.luz-progress')).toHaveCount(1);

    // The dialog opens by command / commandfor where the browser does it
    if (await page.evaluate(() => 'commandForElement' in HTMLButtonElement.prototype)) {
      const opener = native.locator('button[command="show-modal"][commandfor]');
      const dialog = page.locator(`#${await opener.getAttribute('commandfor')}`);
      await opener.click();
      expect(await dialog.evaluate((el) => el.open)).toBe(true);
      await page.keyboard.press('Escape');
      expect(await dialog.evaluate((el) => el.open)).toBe(false);
    }
  });

  test(`${home}: the three mode cards are re-scoped by their own data-theme, with no script`, async ({ page }) => {
    await page.goto(home);
    const surfaces = [];
    for (const mode of ['light', 'dark', 'high-contrast']) {
      const card = page.locator(`#modes [data-theme="${mode}"]`);
      await expect(card, mode).toHaveCount(1);
      const surface = channels(await colorOf(card, '--luz-surface-page'));
      expect(surface, mode).toEqual(vejer(mode, '--luz-surface-page'));
      surfaces.push(surface.join());
    }
    expect(new Set(surfaces).size).toBe(3);
  });

  test(`${home}: the footer lists the columns and the three languages, and the privacy line is words`, async ({ page }) => {
    await page.goto(home);
    const footer = page.locator('footer.luz-landing-footer');
    await expect(footer.locator('.luz-landing-footer__col')).toHaveCount(3);
    await expect(footer.locator('.luz-landing-footer__col').nth(2).locator('a')).toHaveCount(3);
    await expect(footer.locator('luz-mode input[name="luz-theme"]')).toHaveCount(4);
    expect((await footer.locator('p').allInnerTexts()).join(' ').length).toBeGreaterThan(40);
  });
}
