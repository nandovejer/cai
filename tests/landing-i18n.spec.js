// @ts-check
/**
 * The home page in English (/), Spanish (/es/) and Arabic (/ar/), and the
 * language switch of @luz-ds/site in its header (<luz-lang-switch>, a CSS-only
 * tag that no script defines: .claude/plans/specs/f3-package-model.md section
 * 2.2, step 8). Each language is a
 * static page: its own lang, dir, title and alternates, no redirect and no
 * text swapped by a script. The switcher is links in a native popover, so
 * it is checked with JavaScript and, in chromium-nojs, without it.
 * Run with: pnpm test:ui
 */
import { test, expect } from '@playwright/test';

const LANGUAGES = [
  { route: '/', lang: 'en', dir: 'ltr', name: 'English', label: 'Language' },
  { route: '/es/', lang: 'es', dir: 'ltr', name: 'Español', label: 'Idioma' },
  { route: '/ar/', lang: 'ar', dir: 'rtl', name: 'العربية', label: 'اللغة' },
];

const jsOff = () => test.info().project.use.javaScriptEnabled === false;

/** Open a page and collect failed requests and console problems. */
async function open(page, path) {
  const failed = [];
  const problems = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(res.url());
  });
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  return { failed, problems };
}

const switcher = (page) => page.locator('.site-header luz-lang-switch');

/**
 * O1 (accessibility requirements): the accessibility tree of the switch is the
 * one `div.luz-site-lang-switcher` gave before the rename, closed and open;
 * taken from that markup, for each language.
 */
const LINKS = `
    - listitem:
      - link "English":
        - /url: /
    - listitem:
      - link "Español":
        - /url: /es/
    - listitem:
      - link "العربية":
        - /url: /ar/
`;
const TREES = {
  '/': { button: 'Language: English', label: 'Language' },
  '/es/': { button: 'Idioma: Español', label: 'Idioma' },
  '/ar/': { button: 'اللغة: العربية', label: 'اللغة' },
};
const closedTree = (route) => `
- /children: equal
- 'button "${TREES[route].button}"'
`;
const openTree = (route) => `
- /children: equal
- 'button "${TREES[route].button}"'
- navigation "${TREES[route].label}":
  - paragraph: ${TREES[route].label}
  - list:${LINKS}`;

for (const { route, lang, dir, name, label } of LANGUAGES) {
  test.describe(`home page ${route}`, () => {
    test('declares its language, direction and alternates, and loads cleanly', async ({ page }) => {
      const { failed, problems } = await open(page, route);
      expect(failed).toEqual([]);
      expect(problems).toEqual([]);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
      const alternates = await page.locator('link[rel="alternate"]').evaluateAll((links) =>
        links.map((l) => [l.getAttribute('hreflang'), new URL(l.href).pathname]),
      );
      expect(alternates).toEqual([['en', '/'], ['es', '/es/'], ['ar', '/ar/'], ['x-default', '/']]);
      // Itself as canonical (absolute in the pages build: tests/landing-i18n.test.js)
      expect(new URL(await page.locator('link[rel="canonical"]').evaluate((l) => l.href)).pathname).toBe(route);
      // One title per language, never a placeholder
      const title = await page.title();
      expect(title).not.toMatch(/\{\{|\}\}/);
      expect(await page.locator('body').innerText()).not.toMatch(/\{\{|\}\}/);
    });

    test('the switcher names itself and the current language, and marks it', async ({ page }) => {
      await open(page, route);
      const button = switcher(page).getByRole('button');
      await expect(button).toBeVisible();
      await expect(button).toHaveAccessibleName(`${label}: ${name}`);
      await button.click();
      const list = page.getByRole('navigation', { name: label });
      await expect(list).toBeVisible();
      const links = list.getByRole('link');
      await expect(links).toHaveText(['English', 'Español', 'العربية']);
      expect(await links.evaluateAll((all) => all.map((a) => [a.lang, a.hreflang]))).toEqual([['en', 'en'], ['es', 'es'], ['ar', 'ar']]);
      await expect(list.locator('[aria-current="page"]')).toHaveText(name);
      // A second cue besides colour: the current language is underlined (RL-6)
      const underline = await list.locator('[aria-current="page"]').evaluate((a) => getComputedStyle(a).textDecorationLine);
      expect(underline).toContain('underline');
    });

    test('O1: the accessibility tree of the switch is what the classed div gave, closed and open', async ({ page }) => {
      await open(page, route);
      await expect(switcher(page)).toMatchAriaSnapshot(closedTree(route));
      await switcher(page).getByRole('button').click();
      await expect(switcher(page)).toMatchAriaSnapshot(openTree(route));
    });

    test('Home in the header is this language’s home page, marked current', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page, route);
      const current = page.locator('.site-header__nav a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      expect(new URL(await current.evaluate((a) => a.href)).pathname).toBe(route);
    });
  });
}

test.describe('the language switch', () => {
  test('is <luz-lang-switch> around a button and its popover nav, with .luz-lang-switch__* parts; the old names are gone', async ({ page }) => {
    await open(page, '/es/');
    const shape = await page.evaluate(() => {
      const host = document.querySelector('.site-header luz-lang-switch');
      return {
        host: !!host,
        children: host ? [...host.children].map((c) => `${c.localName}.${c.className}`) : [],
        menuIsPopoverNav: host?.querySelector('nav')?.hasAttribute('popover'),
        links: host ? [...host.querySelectorAll('a')].map((a) => a.className) : [],
        classesOnTag: host?.hasAttribute('class'),
        oldClass: document.querySelectorAll('[class*="luz-site-lang-switcher"]').length,
      };
    });
    expect(shape).toEqual({
      host: true,
      children: ['button.luz-lang-switch__button', 'nav.luz-lang-switch__menu'],
      menuIsPopoverNav: true,
      links: ['luz-lang-switch__link', 'luz-lang-switch__link', 'luz-lang-switch__link'],
      classesOnTag: false,
      oldClass: 0,
    });
  });

  test('the list opens at --luz-lang-switch-top, the renamed property, which a header sets on the tag', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page, '/');
    await switcher(page).evaluate((el) => el.style.setProperty('--luz-lang-switch-top', '123px'));
    await switcher(page).getByRole('button').click();
    const top = await page.locator('#luz-lang-menu').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBe(123);
  });

  test('goes to another language by following a link, with or without JavaScript', async ({ page }) => {
    await open(page, '/es/');
    await switcher(page).getByRole('button').click();
    await page.getByRole('navigation', { name: 'Idioma' }).getByRole('link', { name: 'العربية' }).click();
    await expect(page).toHaveURL(/\/ar\/$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(switcher(page).getByRole('button')).toHaveAccessibleName('اللغة: العربية');
  });

  test('keyboard: Enter opens the list, Tab reaches the languages, Escape closes it', async ({ page }) => {
    await open(page, '/');
    const button = switcher(page).getByRole('button');
    await button.focus();
    await page.keyboard.press('Enter');
    const list = page.getByRole('navigation', { name: 'Language' });
    await expect(list).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(list.getByRole('link', { name: 'English' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
  });

  for (const width of [320, 768, 1440]) {
    test(`Arabic, right to left: the header and the open list fit at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, '/ar/');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      // One row: every control of the header on the same line as the menu button
      const header = page.locator('.site-header');
      expect((await header.boundingBox())?.height).toBeLessThanOrEqual(60);
      const button = switcher(page).getByRole('button');
      const box = await button.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
      // The end of the row is the left edge in right-to-left text
      const brand = await page.locator('.site-header__brand').boundingBox();
      expect(box && brand && box.x < brand.x).toBe(true);
      expect(box && box.height).toBeGreaterThanOrEqual(44);
      await button.click();
      const list = await page.locator('#luz-lang-menu').boundingBox();
      expect(list && list.x >= 0 && list.x + list.width <= width, JSON.stringify(list)).toBe(true);
      // Under the header, not over it
      expect(list && list.y).toBeGreaterThanOrEqual(((await header.boundingBox())?.height ?? 0) - 1);
    });
  }

  for (const { route, name, label } of LANGUAGES) {
    test(`${route} at 320px with 30 % larger text: one header row, the globe alone, the name still the button's`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await open(page, route);
      // Set from the test, not a page script: it works in chromium-nojs too
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '130%';
      });
      const header = await page.locator('.site-header').boundingBox();
      expect(header?.height).toBeLessThanOrEqual(60);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      const button = switcher(page).getByRole('button');
      await expect(button).toHaveAccessibleName(`${label}: ${name}`);
      // No visible text: the name is clipped to 1px
      const shown = await button.locator('.luz-lang-switch__name').evaluate((el) => el.getBoundingClientRect().width);
      expect(shown).toBeLessThanOrEqual(1);
      expect((await button.boundingBox())?.width).toBeGreaterThanOrEqual(44);
    });
  }

  test('from 360px the button shows the language\'s name', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await open(page, '/es/');
    await expect(switcher(page).locator('.luz-lang-switch__name')).toBeVisible();
    expect(await switcher(page).locator('.luz-lang-switch__name').evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(20);
  });

  test('a browser without the popover API gets the languages as a row of links', async ({ page }) => {
    test.skip(jsOff(), 'reads the style sheets from a script');
    await open(page, '/');
    // Chromium has the API, so the fallback cannot be rendered here: its rule must be loaded
    const fallback = await page.evaluate(() =>
      [...document.styleSheets].some((sheet) => {
        try {
          return [...sheet.cssRules].some(function walk(rule) {
            return (rule.conditionText ?? '').includes('not selector(:popover-open)') || [...(rule.cssRules ?? [])].some(walk);
          });
        } catch {
          return false;
        }
      }),
    );
    expect(fallback).toBe(true);
  });
});

test.describe('Arabic typography', () => {
  test('running text and headings use the system sans, with no letter spacing', async ({ page }) => {
    await open(page, '/ar/');
    const style = (selector) =>
      page.locator(selector).first().evaluate((el) => ({ font: getComputedStyle(el).fontFamily, spacing: getComputedStyle(el).letterSpacing }));
    const sans = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--luz-font-sans').trim());
    for (const selector of ['h1', 'h2', '.landing-lead', '.landing-level__title .landing-eyebrow']) {
      const { font, spacing } = await style(selector);
      expect(font, selector).not.toMatch(/ET Book/i);
      expect(font.replace(/\s/g, ''), selector).toBe(sans.replace(/\s/g, ''));
      expect(['normal', '0px'], `${selector} letter-spacing`).toContain(spacing);
    }
    // English text on the same page keeps its own face
    const { font } = await style('.luz-site-hero__copy > .luz-site-hero__eyebrow[lang="en"]');
    expect(font).toMatch(/mono/i);
  });

  test('the page tint sits in the top right corner', async ({ page }) => {
    await open(page, '/ar/');
    const background = await page.evaluate(() => {
      document.body.classList.add('luz-site-page--gradient');
      return getComputedStyle(document.body).backgroundImage;
    });
    expect(background).toMatch(/at right top|at top right|at 100% 0%/);
  });
});

test.describe('links from another language into the English documentation', () => {
  for (const route of ['/es/', '/ar/']) {
    test(`${route}: every link to the docs says hreflang="en"; the search results are English`, async ({ page }) => {
      await open(page, route);
      const missing = await page.locator('a[href*="docs/"]').evaluateAll((links) =>
        links.filter((a) => new URL(a.href).pathname.startsWith('/docs/') && a.hreflang !== 'en').map((a) => a.outerHTML.slice(0, 80)),
      );
      expect(missing).toEqual([]);
      expect(await page.locator('[data-luz-search-list]').evaluateAll((lists) => lists.map((l) => l.lang))).toEqual(['en', 'en', 'en']);
      // The dialog's own text is in the page's language
      const label = await page.locator('label[for="luz-search-q"]').textContent();
      expect(label).not.toBe('Search the documentation');
    });
  }
});
