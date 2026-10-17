/**
 * LUZ Design System — Landing page checks
 * The home (apps/landing, served at /, /es/ and /ar/) in the order of the
 * F5 spec of .claude/plans/luz-home-docs-identity.md (section 3.6, Q22-Q27),
 * after the owner's cuts: hero, light, why, inside, native, modes, type, start
 * (the fit lists close "start"), and the footer.
 * It is a level-3 consumer on top of @luz-ds/landing 0.2, with the base color
 * modes and the six lights of the hour. The documentation, with every
 * component and its guidance, lives on its own pages (tests/docs.spec.js);
 * <home-light> has its own file (tests/home-light.spec.js); the numbers in
 * the copy are checked against the packages in tests/landing-numbers.test.js.
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { faded } from './helpers/settle.js';
import { KEY as MODE_KEY, LIGHTS, NO_CHOICE, TIMEZONE, atTime, channels, colorOf, seedMode, vejer } from './helpers/site-lights.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const MODES = ['light', 'dark', 'high-contrast'];
/** The ids of the sections of the home, in the order of the page (Q27). */
const SECTIONS = ['hero', 'light', 'why', 'inside', 'native', 'modes', 'type', 'start'];
const ROUTES = [
  ['/', 'en'],
  ['/es/', 'es'],
  ['/ar/', 'ar'],
];
const PHASES = LIGHTS.map(([light]) => light);

const catalog = (lang) => JSON.parse(readFileSync(fromRepo(`apps/landing/i18n/${lang}.json`), 'utf-8'));
const EN = catalog('en');
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const version = (pkg) => JSON.parse(readFileSync(fromRepo(`packages/${pkg}/package.json`), 'utf-8')).version;

/* ---- Helpers ----------------------------------------------------------- */

/** Open the landing and collect failed requests and console problems. */
async function open(page, path = '/') {
  const requests = [];
  const failed = [];
  const problems = [];
  page.on('request', (req) => requests.push(req.url()));
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(res.url());
  });
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  return { requests, failed, problems };
}

/** Open the home with JavaScript on and wait until <luz-mode> (a lazy chunk) has upgraded. */
async function openLive(page, path = '/?look=city', time) {
  if (time) await atTime(page, time);
  const seen = await open(page, path);
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
  return seen;
}

const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);
const light = (page) => page.evaluate(() => document.documentElement.dataset.light);

/** The text a reader gets: the text nodes that are not under aria-hidden or hidden. */
const readableText = (locator) =>
  locator.evaluate((root) => {
    const out = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) out.push(node.textContent);
      else if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute('aria-hidden') !== 'true' && !node.hidden) node.childNodes.forEach(walk);
    };
    walk(root);
    return out.join(' ').replace(/\s+/g, ' ').trim();
  });

/** Record the arguments of every call to <luz-mode>.preview(), from now on, in window.__previews. */
const spyPreview = (page) =>
  page.evaluate(() => {
    const mode = /** @type {any} */ (document.querySelector('luz-mode'));
    const calls = [];
    const original = mode.preview;
    mode.preview = function (x) {
      calls.push(x === undefined ? 'undefined' : x);
      return original.call(this, x);
    };
    /** @type {any} */ (window).__previews = calls;
  });
const previews = (page) => page.evaluate(() => /** @type {any} */ (window).__previews);

/** The swatches of the six lights, in the card of "Light" of #why. */
const swatches = (page) => page.locator('#why button[aria-pressed]');

test.describe('Landing page', () => {
  test.describe('loading and color modes', () => {
    test('loads cleanly, with base color modes only', async ({ page }) => {
      const { requests, failed, problems } = await open(page);

      expect(failed).toEqual([]);
      expect(problems).toEqual([]);
      // No custom theme is loaded, mentioned in markup, or applied
      expect(requests.filter((url) => /themes\//.test(url))).toEqual([]);
      expect(await page.locator('link[href*="themes/"]').count()).toBe(0);
      expect(await page.locator('[data-mode]').count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBeUndefined();
      expect(MODES).toContain(await theme(page));
      // The core behaviors are imported one by one: luz.js would apply its own theme
      expect(requests.filter((url) => /\/luz(\.min)?\.js/.test(url))).toEqual([]);
    });

    test('the footer switcher is a radio group that becomes one cycle button, with Auto', async ({ page }) => {
      await seedMode(page, 'light');
      await open(page);

      // The native radio group stays in the page, under the button
      const switcher = page.locator('footer fieldset.luz-mode-switcher--cycle');
      await expect(switcher).toHaveCount(1);
      await expect(switcher.locator('legend')).toHaveText('Color mode');
      await expect(switcher.locator('input[type="radio"][name="luz-theme"]')).toHaveCount(4);
      expect(await theme(page)).toBe('light');

      const button = switcher.locator('button.luz-mode-cycle');
      await expect(button).toHaveCount(1);
      await expect(button).toHaveAccessibleName('Change color mode. Current: Light');
      await expect(switcher.locator('.luz-mode-btn').first()).toBeHidden();

      // Light, then Dark, High contrast, Auto (the clock decides) and Light again
      for (const [mode, label] of [['dark', 'Dark'], ['high-contrast', 'High contrast'], ['auto', 'Auto'], ['light', 'Light']]) {
        await button.click();
        if (mode !== 'auto') expect(await theme(page)).toBe(mode);
        expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBeUndefined();
        await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue(mode);
        await expect(button).toHaveAccessibleName(`Change color mode. Current: ${label}`);
        await expect(switcher.locator('[role="status"]')).toHaveText(`Color mode: ${label}`);
      }
    });

    test('the cycle button works from the keyboard', async ({ page }) => {
      await seedMode(page, 'light');
      await open(page);

      await page.locator('footer .luz-mode-cycle').focus();
      await page.keyboard.press('Enter');
      expect(await theme(page)).toBe('dark');
      await page.keyboard.press('Space');
      expect(await theme(page)).toBe('high-contrast');
    });

    test('the chosen mode survives a reload, under core\'s key', async ({ page }) => {
      await seedMode(page, 'light');
      await open(page);
      // light → dark → high contrast
      await page.click('footer .luz-mode-cycle');
      await page.click('footer .luz-mode-cycle');

      expect(await page.evaluate((key) => localStorage.getItem(key), MODE_KEY)).toBe('high-contrast');
      // The site has no key of its own
      expect(await page.evaluate(() => localStorage.getItem('luz-site-mode'))).toBeNull();

      await page.reload();
      expect(await theme(page)).toBe('high-contrast');
      // The documentation page follows the same choice
      await page.goto('/docs/');
      expect(await theme(page)).toBe('high-contrast');
    });

    // EX-009: apps/site/boot.js sets the mode before the first paint (the
    // clock, the light and the dark OS preference are in tests/site-boot.spec.js).
    // The pages' modules are blocked, so only the boot script can have set it.
    for (const path of ['/', '/docs/']) {
      test(`${path} applies the stored mode before any module runs`, async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('luz-theme', 'high-contrast'));
        await page.route(/\/apps\/(landing\/landing|docs\/reference|site\/header)\.js/, (route) => route.abort());
        await page.goto(path);
        expect(await theme(page)).toBe('high-contrast');
      });
    }
  });

  /* ---- The page, section by section (Q27) -------------------------------- */

  test.describe('the map of the page', () => {
    for (const [route, lang] of ROUTES) {
      test(`${route}: eight sections, in order, one h1, each named by its heading (${lang})`, async ({ page }) => {
        await open(page, route);

        expect(await page.locator('main > section').evaluateAll((all) => all.map((el) => el.id))).toEqual(SECTIONS);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('#hero h1')).toHaveCount(1);
        // The old ids are gone with their sections
        for (const gone of ['what', 'see', 'adopt', 'fit']) await expect(page.locator(`#${gone}`), `#${gone}`).toHaveCount(0);
        // Every section is named by a heading of its own: h1 for the hero, h2 for the others
        const named = await page.locator('main > section').evaluateAll((all) =>
          all.map((el) => {
            const heading = document.getElementById(el.getAttribute('aria-labelledby') ?? '');
            return [el.id, heading ? heading.tagName : null, el.contains(heading)];
          }),
        );
        expect(named).toEqual(SECTIONS.map((id) => [id, id === 'hero' ? 'H1' : 'H2', true]));
      });
    }

    test('no heading level is skipped, and the title is unique', async ({ page }) => {
      await open(page);

      expect(await page.title()).toMatch(/^LUZ: /);
      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((headings) =>
          headings
            .filter((el) => el.offsetParent !== null || el.classList.contains('u-sr-only'))
            .map((el) => ({ level: Number(el.tagName[1]), text: el.textContent.trim() })),
        );
      expect(levels[0].level).toBe(1);
      for (let i = 1; i < levels.length; i += 1) {
        expect(
          levels[i].level - levels[i - 1].level,
          `"${levels[i - 1].text}" (h${levels[i - 1].level}) → "${levels[i].text}" (h${levels[i].level})`,
        ).toBeLessThanOrEqual(1);
      }
    });

    test('the sections after the light are headed by @luz-ds/landing\'s section head: eyebrow, title (and lead)', async ({ page }) => {
      await open(page);

      for (const id of ['why', 'inside', 'native', 'modes', 'type', 'start']) {
        const section = page.locator(`section#${id}`);
        await expect(section.locator('.luz-landing-section__eyebrow'), `${id} eyebrow`).toHaveCount(1);
        await expect(section.locator('h2.luz-landing-section__title'), `${id} title`).toHaveCount(1);
        await expect(section, `${id} is a landing section`).toHaveClass(/\bluz-landing-section\b/);
        await expect(section.locator('.luz-landing-section__eyebrow')).toBeVisible();
        await expect(section.locator('.luz-landing-section__title')).toBeVisible();
      }
      await expect(page.locator('#why .luz-landing-section__lead')).toHaveCount(1);
      // The head's old, home-only twins are gone
      for (const gone of ['landing-h2', 'landing-lead', 'landing-points', 'landing-point__title']) {
        await expect(page.locator(`.${gone}`), gone).toHaveCount(0);
      }
    });

    test('the heads say what the owner wrote (English): eyebrow, then title', async ({ page }) => {
      await open(page);

      for (const id of ['why', 'inside', 'native', 'modes', 'type', 'start']) await expect(page.locator(`#${id} .luz-landing-section__title`), id).toHaveCount(1);
      const head = async (id) => ({
        eyebrow: (await page.locator(`#${id} .luz-landing-section__eyebrow`).textContent())?.trim(),
        title: (await page.locator(`#${id} .luz-landing-section__title`).textContent())?.trim(),
      });
      expect(await head('why')).toEqual({ eyebrow: 'Why LUZ', title: 'Three words, one promise.' });
      expect((await head('inside')).eyebrow).toMatch(/^What.s inside$/);
      expect((await head('inside')).title).toBe('Adopt it one layer at a time.');
      expect(await head('native')).toEqual({ eyebrow: 'Works without JavaScript', title: 'Starts from what the browser already does.' });
      expect(await head('modes')).toMatchObject({ title: 'Light, dark, high contrast. And the hour.' });
      expect((await head('modes')).eyebrow).toMatch(/^Three colou?r modes$/);
      expect(await head('type')).toEqual({ eyebrow: 'Typography', title: 'Made to be read.' });
      expect(await head('start')).toEqual({ eyebrow: 'Get started', title: 'One link tag per layer.' });
      // The stressed word of "Three words, one promise." is an em, with the head's accent
      await expect(page.locator('#why .luz-landing-section__title em')).toHaveCount(1);
    });

    test('every in-page link points at an element that exists', async ({ page }) => {
      await open(page);

      const broken = await page.locator('a[href^="#"]').evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href) => !document.getElementById(href.slice(1))),
      );
      expect(broken).toEqual([]);
    });

    test('code blocks are highlighted without an injected copy button', async ({ page }) => {
      await open(page);

      expect(await page.locator('pre.luz-code-block .tok-name').count()).toBeGreaterThan(0);
      await expect(page.locator('.luz-code-block__copy')).toHaveCount(0);
    });
  });

  test.describe('layout', () => {
    for (const [route, lang] of ROUTES) {
      for (const width of [320, 360, 768, 1280]) {
        test(`${route}: no horizontal overflow at ${width}px (${lang})`, async ({ page }) => {
          await page.setViewportSize({ width, height: 800 });
          await open(page, `${route}?look=map`);

          const { scrollWidth, innerWidth, overflowX } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            overflowX: getComputedStyle(document.body).overflowX,
          }));
          expect(scrollWidth).toBe(innerWidth);
          // The overflow is absent, not hidden
          expect(overflowX).toBe('visible');
        });
      }
    }

    test('the color mode button is a target of 24px or more at 360px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await open(page);

      const boxes = await page
        .locator('footer .luz-mode-cycle')
        .evaluateAll((buttons) => buttons.map((el) => el.getBoundingClientRect()));
      expect(boxes).toHaveLength(1);
      for (const box of boxes) {
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
      }
    });

    test('footer: the cycle button ships with no icons of its own and shows a copy of the icon of the checked label', async ({ page }) => {
      await seedMode(page, 'light');
      await open(page);
      const button = page.locator('footer .luz-mode-cycle');
      await expect(button.locator('[data-mode-icon]')).toHaveCount(0);
      for (const mode of ['light', 'dark', 'high-contrast', 'auto']) {
        await expect(page.locator(`footer input[value="${mode}"]`)).toBeChecked();
        await expect(button.locator('.luz-mode-btn__icon')).toHaveCount(1);
        await expect(button.locator('.luz-mode-btn__icon')).toBeVisible();
        const copy = await page.evaluate(() => {
          const icon = document.querySelector('footer input:checked').closest('label').querySelector('.luz-mode-btn__icon');
          return icon.outerHTML === document.querySelector('footer .luz-mode-cycle .luz-mode-btn__icon').outerHTML;
        });
        expect(copy, mode).toBe(true);
        await button.click();
      }
    });

    for (const width of [320, 360, 1280]) {
      test(`header: the visual order follows the DOM order at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page);

        const [menu, brand, nav, search] = await Promise.all(
          ['.site-header__menu', '.site-header__brand', '.site-header__nav', '.site-header__search'].map((selector) =>
            page.locator(selector).evaluate((el) => el.getBoundingClientRect().toJSON()),
          ),
        );
        const before = (a, b) => a.bottom <= b.top + 1 || (Math.abs(a.top - b.top) < a.height && a.left < b.left);
        // At 768px and below: menu button, brand, then the search (the site
        // links are in the drawer). Above: brand, site links, search.
        if (width <= 768) {
          expect(before(menu, brand)).toBe(true);
          expect(nav.width).toBe(0);
          expect(before(brand, search)).toBe(true);
        } else {
          expect(menu.width).toBe(0);
          expect(before(brand, nav)).toBe(true);
          expect(before(nav, search)).toBe(true);
        }
      });
    }

    test('the menu drawer lists the sections of this page and of the docs', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await open(page);

      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      const drawer = page.getByRole('navigation', { name: 'Home page' });
      await expect(drawer).toBeVisible();
      const local = await drawer.locator('a[href^="#"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(local.length).toBeGreaterThan(4);
      // The fit lists are in "Get started" now: no link to a section that is gone
      expect(local).not.toContain('#fit');
      // Each names a section of the new map, and none the sections that went
      for (const href of local) {
        expect(SECTIONS, href).toContain(href.slice(1));
        await expect(page.locator(href), href).toHaveCount(1);
      }
      await expect(drawer.locator('a[href^="/docs/"]:not([href="/docs/"])')).toHaveCount(6);
    });

    test('content is centred at 1440px, in the site frame with the header', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page);

      // The frame is the page's own: main.o-container pads its inline ends by the gutters,
      // so measure the content boxes of the main and of the footer's container, and the brand
      const edges = (selector) =>
        page.locator(selector).evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            left: rect.left + parseFloat(cs.paddingLeft),
            right: document.documentElement.clientWidth - rect.right + parseFloat(cs.paddingRight),
          };
        });
      const main = await edges('main.o-container');
      const footer = await edges('footer.luz-landing-footer > .o-container');
      const brand = await page.locator('.site-header__brand').evaluate((el) => el.getBoundingClientRect().left);
      expect(main.left).toBeGreaterThan(100);
      expect(Math.abs(main.left - main.right), 'main is centred').toBeLessThanOrEqual(1);
      expect(Math.abs(main.left - brand), 'main starts under the brand').toBeLessThanOrEqual(1);
      expect(Math.abs(footer.left - main.left), 'footer starts where main does').toBeLessThanOrEqual(1);
      expect(Math.abs(footer.right - main.right), 'footer ends where main does').toBeLessThanOrEqual(1);
    });
  });

  /* ---- 1. hero ---------------------------------------------------------- */

  test.describe('hero', () => {
    test('is centred: the modifier, the text and the actions', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page);

      const hero = page.locator('section#hero');
      await expect(hero).toHaveClass(/\bluz-landing-hero\b/);
      await expect(hero).toHaveClass(/\bluz-landing-hero--centered\b/);
      expect(await hero.locator('h1').evaluate((el) => getComputedStyle(el).textAlign)).toBe('center');
      const centre = await page.evaluate(() => document.documentElement.clientWidth / 2);
      const actions = await hero.locator('a.luz-btn').evaluateAll((all) => {
        const boxes = all.map((el) => el.getBoundingClientRect());
        return { left: Math.min(...boxes.map((b) => b.left)), right: Math.max(...boxes.map((b) => b.right)) };
      });
      expect(Math.abs((actions.left + actions.right) / 2 - centre), 'the buttons sit about the centre').toBeLessThanOrEqual(4);
    });

    test('says what LUZ is (English): the brand line, the title, the lead, the two statements and two actions', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page);

      const hero = page.locator('section#hero');
      await expect(hero.locator('.luz-landing-hero__eyebrow')).toHaveText('Light, usable & zero-dependency');
      await expect(hero.locator('h1.luz-landing-hero__title')).toHaveText('LUZ, design system for humans, ready for AI.');
      // The owner's title (2026-10-17): both ends are stressed, the human and the AI
      await expect(hero.locator('h1.luz-landing-hero__title em')).toHaveText(['humans', 'AI']);
      await expect(hero.locator('.luz-landing-hero__lead')).toBeVisible();
      // The owner kept the longer lead (2026-10-17)
      await expect(hero.locator('.luz-landing-hero__lead')).toHaveText('Tokens, CSS and a little vanilla JavaScript, built on what the browser already does. Every component works before JavaScript loads, in light, dark and high contrast.');
      await expect(hero).toContainText(EN['built.title']);
      await expect(hero).toContainText(EN['built.line']);
      // "We love TDD" leads to the docs section that says how it is done
      const tdd = hero.locator('a[href="/docs/get-started/how-luz-is-built/#tests-first"]');
      await expect(tdd).toHaveCount(1);
      await expect(tdd).toContainText(EN['built.title'].replace(/<[^>]*>/g, ''));

      await expect(hero.locator('a.luz-btn')).toHaveCount(2);
      await expect(hero.locator('.luz-btn--primary')).toHaveCount(1);
      const primary = hero.locator('a.luz-btn--primary');
      await expect(primary).toHaveText('Read the docs');
      await expect(primary).toHaveAttribute('href', '/docs/');
      await expect(primary).toBeInViewport();
      const secondary = hero.locator('a.luz-btn:not(.luz-btn--primary)');
      await expect(secondary).toHaveText('View on GitHub');
      await expect(secondary).toHaveAttribute('href', 'https://github.com/nandovejer/luz');
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: the lead is the catalog's (${lang})`, async ({ page }) => {
        await open(page, route);

        const lead = ((await page.locator('section#hero .luz-landing-hero__lead').textContent()) ?? '').replace(/\s+/g, ' ').trim();
        expect(lead.length).toBeGreaterThan(20);
        expect(lead).toMatch(/[.!?\u061F\u2026]$/);
        if (lang === 'en') expect(lead).toBe(catalog('en')['hero.lead']);
      });

      test(`${route}: the title is the catalog's, and the brand line stays English (${lang})`, async ({ page }) => {
        await open(page, route);

        const hero = page.locator('section#hero');
        await expect(hero).toHaveCount(1);
        const title = (await hero.locator('h1').textContent())?.trim() ?? '';
        expect(title.length).toBeGreaterThan(5);
        if (lang !== 'en') expect(title).not.toBe('LUZ, design system for humans, ready for AI.');
        if (lang === 'es') expect(title).toBe('Luz, sistema de diseño para el humano, listo para la IA');
        // Every language stresses the human and the AI
        await expect(hero.locator('h1 em')).toHaveCount(2);
        if (lang === 'es') await expect(hero.locator('h1 em')).toHaveText(['humano', 'IA']);
        const eyebrow = hero.locator('.luz-landing-hero__eyebrow');
        await expect(eyebrow).toHaveAttribute('lang', 'en');
        await expect(eyebrow).toHaveText('Light, usable & zero-dependency');
        await expect(hero).toContainText(catalog(lang)['built.title']);
      });
    }
  });

  /* ---- 2. light --------------------------------------------------------- */

  test.describe('light', () => {
    test('is <home-light> under a screen-reader heading, in the bleeding wrapper of the hero\'s media', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      await expect(page.locator('section#light h2.u-sr-only')).toHaveText(/\S/);
      await expect(page.locator('section#light home-light')).toHaveCount(1);
      expect(await page.locator('home-light').evaluate((el) => !!el.closest('.luz-landing-hero__media--bleed'))).toBe(true);
      // Edge to edge of the window
      const box = await page.locator('home-light').boundingBox();
      const width = await page.evaluate(() => document.documentElement.clientWidth);
      expect(Math.abs((box?.x ?? 99) - 0)).toBeLessThanOrEqual(1);
      expect(Math.abs((box?.width ?? 0) - width)).toBeLessThanOrEqual(1);
    });
  });

  /* ---- 3. why ----------------------------------------------------------- */

  test.describe('why', () => {
    test('three cards in a grid: Light, Usable, Zero-dependency', async ({ page }) => {
      await open(page);

      const cards = page.locator('#why .o-grid > .luz-card');
      await expect(cards).toHaveCount(3);
      const titles = await cards.evaluateAll((all) => all.map((el) => el.querySelector('h3')?.textContent?.trim()));
      expect(titles.map((t) => t?.toLowerCase())).toEqual(['light', 'usable', 'zero-dependency']);
      // The light card holds the six swatches; the stat is in the third
      await expect(cards.nth(0).locator('button[aria-pressed]')).toHaveCount(6);
      await expect(cards.nth(2).locator('.luz-landing-stat')).toHaveCount(1);
    });

    test('Light: six swatches, one per light, named as <home-light> names them, each with aria-pressed', async ({ page }) => {
      await openLive(page);

      await expect(swatches(page)).toHaveCount(6);
      for (const [index, phase] of PHASES.entries()) {
        const swatch = swatches(page).nth(index);
        const name = EN[`light.${phase}`];
        await expect(swatch, phase).toHaveAccessibleName(new RegExp(escapeRegExp(name), 'i'));
        expect(['true', 'false'], phase).toContain(await swatch.getAttribute('aria-pressed'));
        // A real target
        const box = await swatch.boundingBox();
        expect(box?.width ?? 0, phase).toBeGreaterThanOrEqual(24);
        expect(box?.height ?? 0, phase).toBeGreaterThanOrEqual(24);
      }
      await expect(page.locator('#why')).toContainText('This page follows your clock. Tap a light to borrow another hour.');
    });

    test('Light: a swatch calls <luz-mode>.preview(phase), the page takes that light, and only that swatch is pressed', async ({ page }) => {
      await openLive(page, '/?look=city', '14:00');
      await expect.poll(() => light(page)).toBe('afternoon');
      await expect(swatches(page)).toHaveCount(6);
      await spyPreview(page);

      for (const [index, [phase, , mode]] of LIGHTS.entries()) {
        await swatches(page).nth(index).click();
        expect((await previews(page)).at(-1), `the last call after ${phase}`).toBe(phase);
        await expect.poll(() => light(page), phase).toBe(phase);
        expect(await theme(page), `${phase} is a ${mode} light`).toBe(mode);
        expect(await swatches(page).evaluateAll((all) => all.map((el) => el.getAttribute('aria-pressed')))).toEqual(PHASES.map((p) => String(p === phase)));
      }
    });

    test('Light: "Back to now" calls preview(null), the clock\'s light returns, and the borrowed swatch is released', async ({ page }) => {
      await openLive(page, '/?look=city', '14:00');
      await expect(swatches(page)).toHaveCount(6);
      await spyPreview(page);
      await swatches(page).nth(PHASES.indexOf('night')).click();
      await expect.poll(() => light(page)).toBe('night');

      const back = page.locator('#why').getByRole('button', { name: EN['light.live'] });
      await expect(back).toBeVisible();
      await back.click();
      expect((await previews(page)).at(-1)).toBeNull();
      await expect.poll(() => light(page)).toBe('afternoon');
      expect(await theme(page)).toBe('light');
      expect(await swatches(page).nth(PHASES.indexOf('night')).getAttribute('aria-pressed')).toBe('false');
    });

    test('Light: "Back to now" from the keyboard leaves the focus on the swatch of the current light, not on the page', async ({ page }) => {
      await openLive(page, '/?look=city', '14:00');
      await expect(swatches(page)).toHaveCount(6);
      await swatches(page).nth(PHASES.indexOf('night')).click();
      await expect.poll(() => light(page)).toBe('night');

      const back = page.locator('#why').getByRole('button', { name: EN['light.live'] });
      await back.focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => light(page)).toBe('afternoon');
      // The button hides itself: the focus must not fall to <body> with it
      await expect(back).toBeHidden();
      const active = await page.evaluate(() => ({ tag: document.activeElement?.tagName, phase: document.activeElement?.getAttribute('data-phase') }));
      expect(active, 'document.activeElement').toEqual({ tag: 'BUTTON', phase: 'afternoon' });
      await expect(swatches(page).nth(PHASES.indexOf('afternoon'))).toBeFocused();
    });

    test('Light, forced colors: the pressed swatch is drawn differently from the others, by a solid fill, a border or an outline', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await openLive(page, '/?look=city', '14:00');
      await expect(swatches(page)).toHaveCount(6);
      await swatches(page).nth(PHASES.indexOf('night')).click();
      await expect.poll(() => light(page)).toBe('night');
      // Neither the pointer nor the focus ring may be what tells them apart
      await page.evaluate(() => /** @type {HTMLElement} */ (document.activeElement)?.blur());
      await page.mouse.move(0, 0);

      const looks = await swatches(page).evaluateAll((all) =>
        all.map((el) => {
          const cs = getComputedStyle(el);
          // A fill under half opaque (the page's translucent tint) does not tell one swatch from another
          const alpha = cs.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1].split(/[,\s/]+/).filter(Boolean)[3];
          const fill = alpha !== undefined && Number(alpha) < 0.5 ? 'transparent' : cs.backgroundColor;
          return {
            pressed: el.getAttribute('aria-pressed'),
            look: JSON.stringify([fill, cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.borderTopStyle, cs.borderTopWidth, cs.borderTopColor, cs.borderBottomStyle, cs.borderBottomWidth, cs.borderBottomColor]),
          };
        }),
      );
      const pressed = looks.filter((l) => l.pressed === 'true');
      expect(pressed).toHaveLength(1);
      for (const other of looks.filter((l) => l.pressed !== 'true')) expect(other.look, 'an unpressed swatch looks like the pressed one').not.toBe(pressed[0].look);
    });

    test('Light: the name of the selected light is written next to "Back to now", and follows the swatch', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await openLive(page, '/?look=city', '14:00');
      await expect(swatches(page)).toHaveCount(6);

      const card = page.locator('#why .luz-card').first();
      /** The visible name in the card: text outside any button, equal to the catalog's name of the light. */
      const named = (name) =>
        card.evaluate((root, wanted) => {
          return [...root.querySelectorAll('*')]
            .filter((el) => !el.closest('button, .u-sr-only') && el.children.length === 0 && (el.textContent ?? '').trim() === wanted)
            .filter((el) => el.checkVisibility({ visibilityProperty: true }))
            .map((el) => {
              const r = el.getBoundingClientRect();
              return { width: r.width, height: r.height, top: r.top, bottom: r.bottom };
            })
            .filter((box) => box.width > 8 && box.height > 8);
        }, name);

      // None pressed: the current phase
      expect(await named(EN['light.afternoon']), 'the clock\'s light, with no swatch pressed').toHaveLength(1);

      for (const phase of ['night', 'dawn', 'sunset']) {
        await swatches(page).nth(PHASES.indexOf(phase)).click();
        await expect.poll(() => light(page)).toBe(phase);
        const boxes = await named(EN[`light.${phase}`]);
        expect(boxes, `"${EN[`light.${phase}`]}" is visible in the card`).toHaveLength(1);
        // Beside the button, on its row
        const back = await card.getByRole('button', { name: EN['light.live'] }).boundingBox();
        expect(back).not.toBeNull();
        expect(Math.abs((boxes[0].top + boxes[0].bottom) / 2 - ((back?.y ?? 0) + (back?.height ?? 0) / 2)), `${phase}: on the row of Back to now`).toBeLessThanOrEqual(24);
      }

      await card.getByRole('button', { name: EN['light.live'] }).click();
      await expect.poll(() => light(page)).toBe('afternoon');
      expect(await named(EN['light.afternoon']), 'back to the clock\'s light').toHaveLength(1);
      expect(await named(EN['light.sunset']), 'the borrowed name is gone').toHaveLength(0);
    });

    test('Light: the swatches are keyboard controls', async ({ page }) => {
      await openLive(page, '/?look=city', '14:00');
      await expect(swatches(page)).toHaveCount(6);

      const swatch = swatches(page).nth(PHASES.indexOf('dusk'));
      await swatch.focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => light(page)).toBe('dusk');
      await expect(swatch).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('Space');
      await expect.poll(() => light(page)).toBe('dusk');
    });

    test('Usable: an outline button to press with Tab then Space, with a visible focus ring, and its line', async ({ page }) => {
      await open(page);

      const card = page.locator('#why .o-grid > .luz-card').nth(1);
      await expect(card.locator('button.luz-btn--ghost'), 'not a ghost button').toHaveCount(0);
      const ghost = card.locator('button.luz-btn--outline');
      await expect(ghost).toHaveCount(1);
      await expect(card.locator('p').last()).toHaveText(/\S/);
      // Reached by Tab, as its words say
      for (let i = 0; i < 80 && !(await ghost.evaluate((el) => el === document.activeElement)); i += 1) await page.keyboard.press('Tab');
      await expect(ghost).toBeFocused();
      const ring = await ghost.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
      });
      expect(ring.style).not.toBe('none');
      expect(ring.width).toBeGreaterThanOrEqual(2);
      await page.keyboard.press('Space');
    });

    test('Zero-dependency: a stat whose value is 0', async ({ page }) => {
      await open(page);

      const stat = page.locator('#why .luz-card .luz-landing-stat');
      await expect(stat).toHaveCount(1);
      await expect(stat.locator('.luz-landing-stat__value')).toHaveText('0');
      await expect(stat.locator('.luz-landing-stat__label')).toContainText('runtime dependencies');
    });
  });

  /* ---- 4. inside -------------------------------------------------------- */

  test.describe('inside', () => {
    const anchors = [
      '/docs/get-started/#level-1-tokens-only',
      '/docs/get-started/#level-2-tokens-and-core',
      '/docs/get-started/#level-3-tokens-core-and-site',
    ];

    test('each level says when to choose it and links to its install section', async ({ page }) => {
      await open(page);

      const cards = page.locator('#inside .landing-level');
      await expect(cards).toHaveCount(3);

      for (const [index, anchor] of anchors.entries()) {
        const card = cards.nth(index);
        await expect(card.locator('h3')).toContainText(`Level ${index + 1}`);
        await expect(card.locator('.landing-level__intro p')).toContainText(/^Choose this if /);
        // The install commands live in one place: the guide
        await expect(card.locator('pre, .docs-command-block, .luz-copy-btn')).toHaveCount(0);
        const install = card.getByRole('link', { name: `Install level ${index + 1}` });
        await expect(install).toHaveAttribute('href', new RegExp(`${anchor}$`));
      }
    });

    test('each level card keeps its list short: two bullets at most', async ({ page }) => {
      await open(page);

      const counts = await page.locator('#inside .landing-level').evaluateAll((cards) => cards.map((card) => card.querySelectorAll('li').length));
      expect(counts).toHaveLength(3);
      for (const [index, count] of counts.entries()) expect(count, `Level ${index + 1}`).toBeLessThanOrEqual(2);
    });

    test('the three levels are layered: standalone, then each requires the ones below', async ({ page }) => {
      await open(page);

      const tags = await page
        .locator('#inside .landing-level .luz-tag')
        .evaluateAll((els) => els.map((el) => el.textContent.trim()));
      expect(tags).toEqual(['Standalone', 'Requires tokens', 'Requires core + tokens']);
    });

    test('three columns from 1024px with aligned actions; one column below', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      const tops = (selector) =>
        page
          .locator(selector)
          .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      const cards = await tops('#inside .landing-level');
      expect(new Set(cards).size).toBe(1);
      const installs = await tops('#inside .landing-level__actions .luz-btn');
      expect(installs).toHaveLength(3);
      expect(new Set(installs).size).toBe(1);

      await page.setViewportSize({ width: 390, height: 800 });
      const stacked = await tops('#inside .landing-level');
      expect(stacked[0]).toBeLessThan(stacked[1]);
      expect(stacked[1]).toBeLessThan(stacked[2]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });

    test('Level 4 is a row of three links, to landing, cms and app, after the three levels', async ({ page }) => {
      await open(page);

      const section = page.locator('section#inside');
      const level4 = section.getByRole('heading', { name: /Level 4/ });
      await expect(level4).toHaveCount(1);
      await expect(level4).toContainText(/one package for your kind of site/i);
      for (const kind of ['landing', 'cms', 'app']) {
        const link = section.locator(`a[href="/docs/${kind}/"]`);
        await expect(link, kind).toHaveCount(1);
        await expect(link, kind).toBeVisible();
        expect((await link.boundingBox())?.height ?? 0, kind).toBeGreaterThanOrEqual(24);
      }
      // A row: the three on one line, below the level cards
      const tops = await section
        .locator('a[href="/docs/landing/"], a[href="/docs/cms/"], a[href="/docs/app/"]')
        .evaluateAll((all) => all.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
      const after = await page.evaluate(() => {
        const last = [...document.querySelectorAll('#inside .landing-level')].at(-1);
        const link = document.querySelector('#inside a[href="/docs/cms/"]');
        return !!last && !!link && !!(last.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(after).toBe(true);
    });

    for (const [route] of ROUTES.slice(1)) {
      test(`${route}: the Level 4 links keep their targets and say hreflang="en"`, async ({ page }) => {
        await open(page, route);

        for (const kind of ['landing', 'cms', 'app']) {
          const link = page.locator(`#inside a[href="/docs/${kind}/"]`);
          await expect(link, kind).toHaveCount(1);
          await expect(link, kind).toHaveAttribute('hreflang', 'en');
        }
      });
    }
  });

  /* ---- 5. native -------------------------------------------------------- */

  test.describe('native', () => {
    test('six specimens, each a card labelled with its element in <code>', async ({ page }) => {
      await open(page);

      const cards = page.locator('#native .luz-card');
      await expect(cards).toHaveCount(6);
      const labels = await cards.evaluateAll((all) => all.map((el) => (el.querySelector('code')?.textContent ?? '').replace(/[<>/\s]/g, '').toLowerCase()));
      expect(labels.every(Boolean), `a <code> in each card: ${labels.join(', ')}`).toBe(true);
      for (const element of ['details', 'dialog', 'popover', 'progress', 'select']) {
        expect(labels.filter((label) => label.includes(element)), element).toHaveLength(1);
      }
      expect(labels.filter((label) => label.includes('range')), 'input range').toHaveLength(1);
      // The core components, not specimens of the browser's defaults
      await expect(page.locator('#native progress.luz-progress')).toHaveCount(1);
      await expect(page.locator('#native select.luz-select')).toHaveCount(1);
      await expect(page.locator('#native dialog.luz-modal')).toHaveCount(1);
    });

    for (const js of [true, false]) {
      test.describe(`the specimens work with JavaScript ${js ? 'on' : 'off'}`, () => {
        test.use({ javaScriptEnabled: js });

        test.beforeEach(async ({ page }) => {
          await page.goto('/');
          if (js) await page.waitForLoadState('networkidle');
        });

        test('details: the summary opens and closes it', async ({ page }) => {
          const details = page.locator('#native details');
          await expect(details).toHaveCount(1);
          const before = await details.evaluate((el) => el.open);
          await details.locator('summary').click();
          expect(await details.evaluate((el) => el.open)).toBe(!before);
          await details.locator('summary').click();
          expect(await details.evaluate((el) => el.open)).toBe(before);
        });

        test('popover: its button opens it by popovertarget, and Escape closes it', async ({ page }) => {
          const button = page.locator('#native button[popovertarget]');
          await expect(button).toHaveCount(1);
          const target = page.locator(`#${await button.getAttribute('popovertarget')}`);
          await expect(target).toHaveAttribute('popover', /.*/);
          await expect(target).toBeHidden();
          await button.click();
          expect(await target.evaluate((el) => el.matches(':popover-open'))).toBe(true);
          await expect(target).toBeVisible();
          await page.keyboard.press('Escape');
          expect(await target.evaluate((el) => el.matches(':popover-open'))).toBe(false);
        });

        test('range: the arrow keys move it', async ({ page }) => {
          const range = page.locator('#native input[type="range"]');
          await expect(range).toHaveCount(1);
          await expect(range).toHaveAccessibleName(/\S/);
          const before = await range.inputValue();
          await range.focus();
          await page.keyboard.press('ArrowRight');
          await page.keyboard.press('ArrowRight');
          expect(await range.inputValue()).not.toBe(before);
        });

        test('select: choosing an option changes the value', async ({ page }) => {
          const select = page.locator('#native select.luz-select');
          await expect(select).toHaveAccessibleName(/\S/);
          const values = await select.locator('option').evaluateAll((all) => all.map((o) => o.value));
          expect(values.length).toBeGreaterThan(1);
          const before = await select.inputValue();
          await select.selectOption(values.find((value) => value !== before));
          expect(await select.inputValue()).not.toBe(before);
        });

        test('progress: a named progress bar with a value', async ({ page, browserName }) => {
          test.skip(!js && browserName === 'firefox', 'Playwright Firefox cannot read element properties with JavaScript disabled');
          const bar = page.locator('#native progress.luz-progress');
          await expect(bar).toHaveCount(1);
          await expect(page.locator('#native').getByRole('progressbar')).toHaveAccessibleName(/\S/);
          const { value, max } = await bar.evaluate((el) => ({ value: el.value, max: el.max }));
          expect(value).toBeGreaterThan(0);
          expect(value).toBeLessThan(max);
        });

        test('dialog: command / commandfor opens the modal where the browser does it, Escape closes it', async ({ page }) => {
          const supported = await page.evaluate(() => 'commandForElement' in HTMLButtonElement.prototype);
          test.skip(!js && !supported, 'command / commandfor is not supported here, and the fallback is a script: the page says so');
          const opener = page.locator('#native button[command="show-modal"][commandfor]');
          await expect(opener).toHaveCount(1);
          const dialog = page.locator(`#${await opener.getAttribute('commandfor')}`);
          await expect(dialog).toHaveJSProperty('open', false);
          await opener.click();
          await expect(dialog).toHaveJSProperty('open', true);
          await expect(dialog).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveJSProperty('open', false);
        });
      });
    }
  });

  /* ---- 6. modes --------------------------------------------------------- */

  test.describe('modes', () => {
    const scoped = (page, mode) => page.locator(`#modes [data-theme="${mode}"]`);

    test('three cards, each in its own scope, showing the same invoice', async ({ page }) => {
      await open(page);

      expect(await page.locator('#modes [data-theme]').evaluateAll((all) => all.map((el) => el.getAttribute('data-theme')))).toEqual(MODES);
      for (const mode of MODES) await expect(scoped(page, mode).locator('.luz-card'), mode).toHaveCount(1);
      const text = await Promise.all(MODES.map((mode) => scoped(page, mode).innerText()));
      expect(text[0].length).toBeGreaterThan(20);
      expect(text[1]).toBe(text[0]);
      expect(text[2]).toBe(text[0]);
      const shape = await Promise.all(MODES.map((mode) => scoped(page, mode).evaluate((el) => el.innerHTML.replace(/\sid="[^"]*"/g, '').replace(/\s+/g, ' '))));
      expect(shape[1]).toBe(shape[0]);
      expect(shape[2]).toBe(shape[0]);
    });

    for (const js of [true, false]) {
      test.describe(`JavaScript ${js ? 'on' : 'off'}`, () => {
        test.use({ javaScriptEnabled: js });

        test('the cards re-scope the tokens: each has the surface and the text of Vejer\'s mode', async ({ page }) => {
          await page.goto('/');
          const surfaces = [];
          for (const mode of MODES) {
            await expect(scoped(page, mode), mode).toHaveCount(1);
            const surface = channels(await colorOf(scoped(page, mode), '--luz-surface-page'));
            expect(surface, `${mode} surface`).toEqual(vejer(mode, '--luz-surface-page'));
            expect(channels(await colorOf(scoped(page, mode), '--luz-text-primary')), `${mode} text`).toEqual(vejer(mode, '--luz-text-primary'));
            surfaces.push(surface.join());
          }
          expect(new Set(surfaces).size, 'the three modes differ').toBe(3);
        });
      });
    }

    for (const [name, time] of LIGHTS.map(([n, t]) => [n, t])) {
      test(`the cards stay Vejer's in the ${name} light (${time})`, async ({ page }) => {
        await openLive(page, '/?look=city', time);
        await expect.poll(() => light(page)).toBe(name);
        await faded(page);
        for (const mode of MODES) {
          await expect(scoped(page, mode), mode).toHaveCount(1);
          await expect.poll(async () => channels(await colorOf(scoped(page, mode), '--luz-surface-page')), mode).toEqual(vejer(mode, '--luz-surface-page'));
        }
      });
    }

    /** The marker's place on the day strip, 0 to 1: the --day-t the page sets (a number or a percentage). */
    const dayT = (page) =>
      page.evaluate(() => {
        const strip = [...document.querySelectorAll('#modes [aria-hidden="true"]')].find((el) => !el.closest('#modes [data-theme]'));
        if (!strip) return null;
        for (const el of [strip, ...strip.querySelectorAll('*')]) {
          const value = getComputedStyle(el).getPropertyValue('--day-t').trim();
          if (value) return value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value);
        }
        return null;
      });

    test('the day strip is decorative: aria-hidden, six phases, nothing to focus', async ({ page }) => {
      await open(page);

      const strip = await page.evaluate(() => {
        const el = [...document.querySelectorAll('#modes [aria-hidden="true"]')].find((node) => !node.closest('#modes [data-theme]'));
        if (!el) return null;
        return {
          focusable: el.querySelectorAll('a[href], button, input, select, textarea, [tabindex]').length,
          marked: [...el.querySelectorAll('*')].some((node) => getComputedStyle(node).getPropertyValue('--day-t').trim()) || !!getComputedStyle(el).getPropertyValue('--day-t').trim(),
        };
      });
      expect(strip, 'an aria-hidden day strip in #modes, outside the cards').not.toBeNull();
      expect(strip.focusable).toBe(0);
      expect(strip.marked, 'the marker is placed by --day-t').toBe(true);
    });

    test('the marker follows the hour of the clock, from dawn to night', async ({ page }) => {
      const places = [];
      for (const [name, time] of LIGHTS) {
        const fresh = await page.context().newPage();
        await openLive(fresh, '/?look=city', time);
        await expect.poll(() => light(fresh), name).toBe(name);
        places.push(await dayT(fresh));
        await fresh.close();
      }
      expect(places.every((value) => typeof value === 'number' && value >= 0 && value <= 1), places.join()).toBe(true);
      for (let i = 1; i < places.length; i += 1) expect(places[i], `${PHASES[i]} after ${PHASES[i - 1]}`).toBeGreaterThan(places[i - 1]);
    });

    test('a line says the current phase, and follows a light borrowed in "Why"', async ({ page }) => {
      await openLive(page, '/?look=city', '14:00');
      await expect(swatches(page)).toHaveCount(6);

      const modes = page.locator('#modes');
      expect((await readableText(modes)).toLowerCase()).toContain(EN['light.afternoon'].toLowerCase());
      const before = await dayT(page);
      await swatches(page).nth(PHASES.indexOf('sunset')).click();
      await expect.poll(() => light(page)).toBe('sunset');
      await expect.poll(async () => (await readableText(modes)).toLowerCase()).toContain(EN['light.sunset'].toLowerCase());
      expect(await dayT(page), 'the marker moved on luz-mode:change').toBeGreaterThan(before);
      await swatches(page).nth(PHASES.indexOf('dawn')).click();
      await expect.poll(() => light(page)).toBe('dawn');
      expect(await dayT(page)).toBeLessThan(before);
    });
  });

  /* ---- 7. type ---------------------------------------------------------- */

  test.describe('type', () => {
    test('an ET Book quote', async ({ page }) => {
      await open(page);

      const quote = page.locator('#type blockquote');
      await expect(quote).toHaveCount(1);
      await expect(quote).toHaveText(/\S{3}/);
      const serif = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--luz-font-serif').trim());
      expect(serif).toMatch(/ET Book/);
      const family = await quote.evaluate((el) => getComputedStyle(el).fontFamily);
      expect(family.replace(/\s/g, '')).toBe(serif.replace(/\s/g, ''));
    });

    test('only the quote: no scale samples ("Aa"), no table of steps, no caption about the scale', async ({ page }) => {
      await open(page);

      await expect(page.locator('#type blockquote')).toHaveCount(1);
      // No element whose text is "Aa" (the samples drawn at each step of the scale)
      const samples = await page.locator('#type *').evaluateAll((all) => all.filter((el) => (el.textContent ?? '').trim() === 'Aa').length);
      expect(samples, 'elements with the text "Aa"').toBe(0);
      await expect(page.locator('#type figcaption'), 'the caption of the scale').toHaveCount(0);
      await expect(page.locator('#type ul, #type ol, #type li'), 'the list of steps').toHaveCount(0);
      expect(await page.locator('#type').innerText()).not.toMatch(/\b(?:xs|2xl|3xl|4xl)\b/);
    });
  });

  /* ---- fit: two short lists inside "start" -------------------------------- */

  test.describe('fit', () => {
    test('is not a section of its own, and nothing links to it', async ({ page }) => {
      await open(page);

      await expect(page.locator('#fit')).toHaveCount(0);
      await expect(page.locator('a[href="#fit"]')).toHaveCount(0);
      await expect(page.locator('main > section')).toHaveCount(SECTIONS.length);
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: "A good fit" and "Not a good fit", two lists in #start between the snippets and the actions (${lang})`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await open(page, route);
        const words = catalog(lang);
        const items = (prefix) => Object.keys(words).filter((key) => key.startsWith(prefix)).map((key) => words[key]);
        const good = items('fit.good.');
        const bad = items('fit.bad.');
        expect(good.length, 'good items in the catalog').toBeGreaterThan(0);
        expect(bad.length, 'bad items in the catalog').toBeGreaterThan(0);

        const lists = await page.locator('#start').evaluate((root) => {
          const text = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
          const all = [...root.querySelectorAll('*')];
          const at = (el) => all.indexOf(el);
          const npm = [...root.querySelectorAll('pre.luz-code-block')].find((el) => !el.textContent.includes('cdn.jsdelivr.net'));
          const firstAction = root.querySelector('a.luz-btn');
          return [...root.querySelectorAll('h3')].map((h3) => {
            const list = h3.nextElementSibling?.matches('ul') ? h3.nextElementSibling : h3.parentElement?.querySelector('ul');
            return {
              heading: text(h3),
              items: list ? [...list.querySelectorAll(':scope > li')].map(text) : null,
              top: h3.getBoundingClientRect().top,
              afterSnippets: at(h3) > at(npm),
              beforeActions: at(h3) < at(firstAction),
            };
          });
        });
        expect(lists.map((l) => l.heading)).toEqual([words['fit.good'], words['fit.bad']]);
        expect(lists[0].items).toEqual(good);
        expect(lists[1].items).toEqual(bad);
        for (const l of lists) {
          expect(l.afterSnippets, `${l.heading} comes after the last snippet`).toBe(true);
          expect(l.beforeActions, `${l.heading} comes before the two actions`).toBe(true);
        }
        // Two short lists, not the old three-column section
        await expect(page.locator('#start ul')).toHaveCount(2);
      });
    }

    test('the headings are h3, under the h2 of "Get started"', async ({ page }) => {
      await open(page);

      await expect(page.locator('#start h3')).toHaveText([EN['fit.good'], EN['fit.bad']]);
    });
  });

  /* ---- 9. start --------------------------------------------------------- */

  test.describe('start', () => {
    const cdn = (page) => page.locator('#start pre.luz-code-block').filter({ hasText: 'cdn.jsdelivr.net' });

    test('the order: the CDN snippet, what it renders, the npm snippet, the line to write HTML, two actions', async ({ page }) => {
      await open(page);

      const order = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll('#start pre.luz-code-block')];
        const cdnBlock = blocks.find((el) => el.textContent.includes('cdn.jsdelivr.net'));
        const npmBlock = blocks.find((el) => !el.textContent.includes('cdn.jsdelivr.net') && el.textContent.includes('@luz-ds/'));
        const render = document.querySelector('#start .luz-tag--green');
        const actions = [...document.querySelectorAll('#start a.luz-btn')];
        const at = (a) => (a ? [...document.querySelectorAll('#start *')].indexOf(a) : -1);
        return { cdn: at(cdnBlock), render: at(render), npm: at(npmBlock), actions: actions.map(at), blocks: blocks.length };
      });
      expect(order.cdn).toBeGreaterThan(-1);
      expect(order.render).toBeGreaterThan(order.cdn);
      expect(order.npm).toBeGreaterThan(order.render);
      expect(order.actions).toHaveLength(2);
      for (const place of order.actions) expect(place).toBeGreaterThan(order.npm);
      await expect(page.locator('#start a.luz-btn--primary')).toHaveCount(1);
    });

    test('the CDN snippet pins the version of each package, tokens first', async ({ page }) => {
      await open(page);

      await expect(cdn(page)).toHaveCount(1);
      const snippet = (await cdn(page).textContent()) ?? '';
      expect(snippet.indexOf(`@luz-ds/tokens@${version('tokens')}/dist/luz-tokens.min.css`)).toBeGreaterThan(-1);
      expect(snippet.indexOf(`@luz-ds/core@${version('core')}/dist/luz.min.css`)).toBeGreaterThan(snippet.indexOf('@luz-ds/tokens@'));
      for (const [, pkg, pinned] of snippet.matchAll(/@luz-ds\/([\w-]+)@([^/\s"]+)\//g)) expect(pinned, pkg).toBe(version(pkg));
    });

    test('"this is what it renders" renders the markup of the snippet: same tags, same classes', async ({ page }) => {
      await open(page);

      await expect(cdn(page)).toHaveCount(1);
      const snippet = (await cdn(page).textContent()) ?? '';
      const written = [...snippet.matchAll(/<(button|span)\s+class="([^"]+)"/g)].map(([, tag, cls]) => [tag, cls]);
      expect(written.length).toBeGreaterThanOrEqual(2);
      for (const [tag, cls] of written) {
        const rendered = await page.evaluate(([name, value]) => [...document.querySelectorAll(`#start ${name}`)].filter((el) => !el.closest('pre') && el.className === value).length, [tag, cls]);
        expect(rendered, `<${tag} class="${cls}"> rendered outside the code`).toBe(1);
      }
      await expect(page.locator('#start .luz-tag--green')).toHaveText(EN['see.published']);
    });

    test('the npm snippet installs the packages', async ({ page }) => {
      await open(page);

      const npm = page.locator('#start pre.luz-code-block').filter({ hasNotText: 'cdn.jsdelivr.net' });
      await expect(npm).toHaveCount(1);
      const text = (await npm.textContent()) ?? '';
      expect(text).toContain('@luz-ds/tokens');
      expect(text).toContain('@luz-ds/core');
    });

    test('copy buttons carry exactly the visible text, one for each snippet', async ({ page }) => {
      await open(page);

      const blocks = await page.locator('#start pre.luz-code-block').count();
      expect(blocks).toBeGreaterThanOrEqual(2);
      const pairs = await page.locator('#start [data-copy-from]').evaluateAll((buttons) =>
        buttons.map((button) => ({
          label: button.getAttribute('aria-label'),
          copy: button.dataset.copy,
          visible: document.getElementById(button.dataset.copyFrom)?.textContent.trim(),
        })),
      );
      expect(pairs).toHaveLength(blocks);
      for (const { copy, visible, label } of pairs) {
        expect(visible, label).toBeTruthy();
        expect(copy, label).toBe(visible);
        expect(label, 'a copy button names its snippet').toMatch(/\S/);
      }
    });

    test('clicking a copy button puts the snippet it shows on the clipboard', async ({ page, context, browserName }) => {
      // Playwright's Firefox has no clipboard permissions to grant
      test.skip(browserName === 'firefox', 'clipboard permissions are not available in Playwright Firefox');
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await open(page);

      await expect(page.locator('#start [data-copy-from]')).not.toHaveCount(0);
      for (const button of await page.locator('#start [data-copy-from]').all()) {
        const id = await button.getAttribute('data-copy-from');
        await button.click();
        await expect(button).toHaveClass(/is-copied/);
        const expected = (await page.locator(`#${id}`).textContent())?.trim();
        expect(await page.evaluate(() => navigator.clipboard.readText()), id).toBe(expected);
      }
      await expect(page.locator('#luz-live-region')).toHaveText('Copied to clipboard');
    });
  });

  /* ---- The footer -------------------------------------------------------- */

  test.describe('footer', () => {
    const footer = (page) => page.locator('footer.luz-landing-footer');

    test('a brand, then three columns (Docs, Project, Language) on the landing footer grid', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      await expect(footer(page).locator('> .o-container.o-container--inline.o-grid')).toHaveCount(1);
      const brand = footer(page).locator('.luz-landing-footer__brand');
      await expect(brand).toHaveCount(1);
      await expect(brand).toContainText('LUZ');
      await expect(brand).toContainText(/\d+\.\d+\.\d+/);
      await expect(brand.locator('svg, img').first()).toBeVisible();
      await expect(footer(page).locator('.luz-landing-footer__col-title')).toHaveText(['Docs', 'Project', 'Language']);
      const cols = footer(page).locator('.luz-landing-footer__col');
      await expect(cols).toHaveCount(3);
      // Side by side from 768px: the brand and the three columns in one row
      const tops = await footer(page).locator('.luz-landing-footer__brand, .luz-landing-footer__col').evaluateAll((all) => all.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
    });

    test('Docs and Project hold links; Project has GitHub', async ({ page }) => {
      await open(page);

      const cols = footer(page).locator('.luz-landing-footer__col');
      const docs = cols.nth(0).locator('a');
      expect(await docs.count()).toBeGreaterThanOrEqual(3);
      expect(await docs.evaluateAll((all) => all.map((a) => new URL(a.href).pathname.startsWith('/docs/')))).not.toContain(false);
      await expect(cols.nth(1).locator('a[href="https://github.com/nandovejer/luz"]')).toHaveCount(1);
      for (const link of await cols.locator('a').all()) expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(24);
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: the Language column lists the three languages with hreflang, the current one marked (${lang})`, async ({ page }) => {
        await open(page, route);

        const links = footer(page).locator('.luz-landing-footer__col').nth(2).locator('a');
        expect(await links.evaluateAll((all) => all.map((a) => [new URL(a.href).pathname, a.hreflang, a.lang]))).toEqual([
          ['/', 'en', 'en'],
          ['/es/', 'es', 'es'],
          ['/ar/', 'ar', 'ar'],
        ]);
        expect(await links.evaluateAll((all) => all.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.hreflang))).toEqual([lang]);
      });
    }

    test('the colour mode switcher is the <luz-mode remember by="clock"> of the footer, with its four radios', async ({ page }) => {
      await open(page);

      const mode = footer(page).locator('luz-mode');
      await expect(mode).toHaveCount(1);
      await expect(mode).toHaveAttribute('remember', '');
      await expect(mode).toHaveAttribute('by', 'clock');
      expect(await mode.locator('input[name="luz-theme"]').evaluateAll((all) => all.map((r) => r.value))).toEqual(['auto', 'light', 'dark', 'high-contrast']);
    });

    for (const width of [320, 1280]) {
      test(`the switcher's legend, "Color mode", is shown as text at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page);

        const legend = footer(page).locator('fieldset.luz-mode-switcher legend');
        await expect(legend).toHaveText('Color mode');
        const seen = await legend.evaluate((el) => {
          const cs = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          return { shown: el.checkVisibility({ visibilityProperty: true }), width: box.width, height: box.height, left: box.left, right: box.right, clip: cs.clip, clipPath: cs.clipPath, fontSize: parseFloat(cs.fontSize), edge: document.documentElement.clientWidth };
        });
        expect(seen.shown).toBe(true);
        // Not the one-pixel, clipped box of a screen-reader-only label
        expect(seen.width, 'width of the legend').toBeGreaterThanOrEqual(40);
        expect(seen.height, 'height of the legend').toBeGreaterThanOrEqual(12);
        expect(seen.clip).toBe('auto');
        expect(seen.clipPath).toBe('none');
        expect(seen.fontSize).toBeGreaterThanOrEqual(12);
        expect(seen.left).toBeGreaterThanOrEqual(-1);
        expect(seen.right).toBeLessThanOrEqual(seen.edge + 1);
      });
    }

    test('the privacy line: the light comes from the clock, never from the location', async ({ page }) => {
      await open(page);

      await expect(footer(page).locator('p', { hasText: 'The light is computed from your clock, never from your location.' })).toContainText(
        'The light is computed from your clock, never from your location. Your choice stays in this browser.',
      );
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: the privacy line is in ${lang}`, async ({ page }) => {
        await open(page, route);
        const text = await footer(page).innerText();
        if (lang === 'en') expect(text).toContain('Your choice stays in this browser.');
        else expect(text).not.toContain('Your choice stays in this browser.');
      });
    }

    for (const width of [320, 360, 768, 1280]) {
      test(`the switcher, the brand and the columns overlap nothing and fit at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page);

        const box = (selector) => footer(page).locator(selector).first().evaluate((el) => el.getBoundingClientRect().toJSON());
        const mode = await box('luz-mode');
        expect(mode.left).toBeGreaterThanOrEqual(-1);
        expect(mode.right).toBeLessThanOrEqual(width + 1);
        const others = await footer(page).locator('.luz-landing-footer__brand, .luz-landing-footer__col').evaluateAll((all) => all.map((el) => el.getBoundingClientRect().toJSON()));
        for (const other of others) {
          const apart = mode.left >= other.right - 1 || mode.right <= other.left + 1 || mode.top >= other.bottom - 1 || mode.bottom <= other.top + 1;
          expect(apart).toBe(true);
        }
      });
    }
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    for (const width of [360, 1280]) {
      test(`everything is readable at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        // Every section has words to read and nothing is hidden waiting for a script
        for (const id of SECTIONS) {
          const section = page.locator(`main > section#${id}`);
          await expect(section, id).toHaveCount(1);
          await expect(section.locator('h1, h2').first(), id).toBeAttached();
          if (id !== 'light') expect((await section.innerText()).trim().length, id).toBeGreaterThan(20);
        }
        await expect(page.locator('h1')).toBeVisible();
        for (const id of ['why', 'inside', 'native', 'modes', 'type', 'start']) {
          for (const element of await page.locator(`#${id} h2, #${id} h3`).all()) await expect(element).toBeVisible();
        }
        // The adoption message does not depend on a script
        await expect(page.locator('#inside .landing-level')).toHaveCount(3);
        for (const level of [1, 2, 3]) {
          await expect(page.getByRole('link', { name: `Install level ${level}` })).toBeVisible();
        }
        for (const kind of ['landing', 'cms', 'app']) await expect(page.locator(`#inside a[href="/docs/${kind}/"]`)).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        ).toBe(0);
      });
    }

    test('the controls that need a script are not shown: the six swatches, Back to now, the copy buttons', async ({ page }) => {
      await page.goto('/');

      for (const control of await page.locator('#why button[aria-pressed], #why button:has-text("Back to now"), #start .luz-copy-btn').all()) {
        await expect(control).toBeHidden();
      }
      const shown = await page.locator('#why button').evaluateAll((all) =>
        all.filter((el) => el.checkVisibility({ visibilityProperty: true }) && (el.hasAttribute('aria-pressed') || /Back to now/.test(el.textContent))).length,
      );
      expect(shown).toBe(0);
      // The words stay: the page says it follows the clock
      await expect(page.locator('#why')).toContainText('This page follows your clock.');
    });

    test('the snippets are text that can be selected, and the code blocks are focusable regions', async ({ page }) => {
      await page.goto('/');

      const blocks = page.locator('#start pre.luz-code-block');
      expect(await blocks.count()).toBeGreaterThanOrEqual(2);
      for (const block of await blocks.all()) {
        await expect(block).toHaveAttribute('tabindex', '0');
        await expect(block).toHaveAttribute('role', 'region');
        await expect(block).toHaveAttribute('aria-label', /\S/);
      }
    });

    for (const width of [320, 1280]) {
      test(`the legend of the switcher is shown as text at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/');

        const legend = page.locator('footer fieldset.luz-mode-switcher legend');
        await expect(legend).toHaveText('Color mode');
        const box = await legend.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height, clip: getComputedStyle(el).clip };
        });
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(12);
        expect(box.clip).toBe('auto');
      });
    }

    test('the color mode switcher is four radios (Auto, Light, Dark, High contrast): targets of 24px or more at 360px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/');

      await expect(page.locator('footer .luz-mode-cycle')).toBeHidden();
      const boxes = await page
        .locator('footer .luz-mode-btn')
        .evaluateAll((labels) => labels.map((el) => el.getBoundingClientRect()));
      expect(boxes).toHaveLength(4);
      for (const box of boxes) {
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
      }
    });

    test('the arrow keys move between the modes', async ({ page }) => {
      await page.goto('/');
      const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const lightBackground = await background();

      await page.focus('.luz-mode-switcher input[value="light"]');
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('.luz-mode-switcher input[value="dark"]')).toBeChecked();
      await expect.poll(background).not.toBe(lightBackground);
    });

    test('the color mode switcher works', async ({ page }) => {
      await page.goto('/');
      const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const lightBackground = await background();
      await page.click('footer .luz-mode-btn:has(input[value="dark"])');
      await expect.poll(background).not.toBe(lightBackground);
    });
  });

  /* ---- Accessibility ------------------------------------------------------ */

  test.describe('structure and accessibility of the page itself', () => {
    test('one banner, one main, one contentinfo, and uniquely named navs', async ({ page }) => {
      await open(page);

      await expect(page.locator('body > header')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('footer')).toHaveCount(1);
      // Navs that are displayed: the site links live in the header row or,
      // at 768px and below, in the menu drawer, never in both at once; the
      // footer's columns are named by their titles
      const names = await page
        .locator('nav')
        .evaluateAll((navs) =>
          navs.filter((el) => el.checkVisibility()).map((el) => el.getAttribute('aria-label') ?? document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.textContent?.trim()),
        );
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names).size).toBe(names.length);
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: no two navigation landmarks share a name, the header's language menu and the footer's Language column included (${lang})`, async ({ page }) => {
        await open(page, route);

        // Every nav of the page, shown or not: a menu that is closed now is a landmark once it opens
        const names = await page.locator('nav').evaluateAll((navs) =>
          navs.map((el) => ({
            where: el.className.split(' ')[0],
            name: (el.getAttribute('aria-label') ?? document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.textContent ?? '').trim(),
          })),
        );
        expect(names.every((n) => n.name), JSON.stringify(names)).toBe(true);
        const byName = Object.groupBy(names, (n) => n.name);
        const shared = Object.entries(byName).filter(([, group]) => (group ?? []).length > 1).map(([name, group]) => `${name}: ${(group ?? []).map((g) => g.where).join(' + ')}`);
        expect(shared, 'names used by more than one nav').toEqual([]);
      });
    }

    test('labels say "color mode", never "theme"', async ({ page }) => {
      await open(page);

      // Identifiers (file, class, attribute and export names) live in <code>
      const offenders = await page.evaluate(() => {
        const found = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!/theme/i.test(node.textContent)) continue;
          if (node.parentElement.closest('code, pre, script, style')) continue;
          // The site search's dialog names docs pages by their titles ("Color modes and themes")
          if (node.parentElement.closest('luz-search dialog.luz-search')) continue;
          found.push(node.textContent.trim());
        }
        document.querySelectorAll('[aria-label], [title], [alt]').forEach((el) => {
          for (const name of ['aria-label', 'title', 'alt']) {
            if (/theme/i.test(el.getAttribute(name) ?? '')) found.push(el.getAttribute(name));
          }
        });
        return found;
      });
      expect(offenders).toEqual([]);
    });

    test('the beta and version tags are text', async ({ page }) => {
      await open(page);

      await expect(page.locator('.site-header__brand .site-header__tag')).toHaveText(`v${version('core')} beta`);
    });

    test('the page background is one flat color', async ({ page }) => {
      await open(page);

      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe(
        'none',
      );
    });

    test('standalone links are honest targets', async ({ page }) => {
      await open(page);

      const heights = await page
        .locator('.landing-level__body a, .landing-level__actions a, .site-header__nav a, .luz-landing-footer a')
        .evaluateAll((links) => links.map((el) => el.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(14);
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(24);
    });

    for (const mode of MODES) {
      test(`the text of the page has a contrast of 4.5:1 or more in ${mode}`, async ({ page }) => {
        await page.addInitScript((value) => {
          localStorage.setItem('luz-theme', value);
        }, mode);
        await open(page, '/?look=city');
        expect(await theme(page)).toBe(mode);
        await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
        await faded(page);

        const { checked, failures } = await page.evaluate(() => {
          const parse = (value) => {
            const parts = value.match(/rgba?\(([^)]+)\)/)[1].split(/[,\s/]+/).filter(Boolean).map(Number);
            return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
          };
          const over = (top, bottom) => ({
            r: top.r * top.a + bottom.r * (1 - top.a),
            g: top.g * top.a + bottom.g * (1 - top.a),
            b: top.b * top.a + bottom.b * (1 - top.a),
            a: 1,
          });
          const luminance = ({ r, g, b }) => {
            const channel = (v) => {
              const c = v / 255;
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
          };
          const backgroundOf = (el) => {
            const layers = [];
            for (let node = el; node; node = node.parentElement) {
              const color = parse(getComputedStyle(node).backgroundColor);
              if (color.a > 0) layers.push(color);
              if (color.a === 1) break;
            }
            let result = layers.pop() ?? { r: 255, g: 255, b: 255, a: 1 };
            while (layers.length) result = over(layers.pop(), result);
            return result;
          };

          // The text of the main and of the footer, but not <home-light> (it has its own measure over
          // its pixels: tests/home-light.spec.js) nor what is aria-hidden
          const failures = [];
          let checked = 0;
          const walker = document.createTreeWalker(document.querySelector('main').parentElement, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const el = node.parentElement;
            if (!node.textContent.trim() || !el.closest('main, footer') || el.closest('home-light, [aria-hidden="true"], script, style')) continue;
            if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
            checked += 1;
            const background = backgroundOf(el);
            const color = over(parse(getComputedStyle(el).color), background);
            const [a, b] = [luminance(color), luminance(background)];
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (ratio < 4.5) {
              failures.push(`${ratio.toFixed(2)} ${el.tagName}.${el.className} "${node.textContent.trim().slice(0, 30)}"`);
            }
          }
          return { checked, failures: [...new Set(failures)] };
        });
        expect(checked).toBeGreaterThan(150);
        expect(failures).toEqual([]);
      });
    }

    test('keyboard: skip link first, then the main content', async ({ page }) => {
      await open(page);

      await page.keyboard.press('Tab');
      await expect(page.locator('.luz-skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
    });

    const BLOCKING = ['serious', 'critical'];
    const violations = async (page) => {
      const { violations: found } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      return found.filter((v) => BLOCKING.includes(v.impact ?? '')).map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) - ${v.nodes[0]?.target?.join(' ')}`);
    };

    for (const [name, time, mode] of LIGHTS) {
      test(`axe: / in the ${name} light (${time}, ${mode})`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'Chromium only');
        await openLive(page, '/?look=city', time);
        await expect.poll(() => light(page)).toBe(name);
        expect(await theme(page)).toBe(mode);
        await faded(page);
        expect(await violations(page), 'serious/critical axe violations').toEqual([]);
      });
    }

    for (const mode of MODES) {
      for (const [route] of ROUTES) {
        test(`axe: ${route} in ${mode}, with the sections open to the eye`, async ({ page, browserName }) => {
          test.skip(browserName !== 'chromium', 'Chromium only');
          await seedMode(page, mode);
          await atTime(page, '14:00');
          await open(page, `${route}?look=map`);
          expect(await theme(page)).toBe(mode);
          // The disclosure and the popover of "native" open, so axe reads them too
          await expect(page.locator('#native details summary')).toHaveCount(1);
          await expect(page.locator('#native button[popovertarget]')).toHaveCount(1);
          await page.locator('#native details summary').click();
          await page.locator('#native button[popovertarget]').click();
          await faded(page);
          expect(await violations(page), 'serious/critical axe violations').toEqual([]);
        });
      }
    }
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('no smooth scrolling', async ({ page }) => {
      await open(page);

      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
      ).toBe('auto');
    });
  });

  test.describe('install guide', () => {
    // The Install page writes each CDN URL with the version of that package.json (owner decision D9),
    // so the test reads it too: it is 0.0.0 before `changeset version` and 0.1.0 after
    const cdn = (pkg, file) => `@luz-ds/${pkg}@${version(pkg)}/dist/${file}`;
    const levels = [
      {
        id: 'level-1-tokens-only',
        install: 'pnpm add @luz-ds/tokens',
        files: [cdn('tokens', 'luz-tokens.min.css')],
        absent: ['@luz-ds/core', '@luz-ds/site'],
      },
      {
        id: 'level-2-tokens-and-core',
        install: 'pnpm add @luz-ds/tokens @luz-ds/core',
        files: [
          cdn('tokens', 'luz-tokens.min.css'),
          cdn('core', 'luz.min.css'),
          cdn('core', 'luz.min.js'),
        ],
        absent: ['@luz-ds/site'],
      },
      {
        id: 'level-3-tokens-core-and-site',
        install: 'pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site',
        files: [
          cdn('tokens', 'luz-tokens.min.css'),
          cdn('core', 'luz.min.css'),
          cdn('site', 'site.min.css'),
          cdn('core', 'luz.min.js'),
          cdn('site', 'site.min.js'),
        ],
        absent: [],
      },
    ];

    test('each level has one install command, one CDN snippet and one bundler snippet', async ({ page }) => {
      await page.goto('/docs/get-started/');

      for (const [index, level] of levels.entries()) {
        const section = page.locator('.docs-prose').filter({ has: page.locator(`#${level.id}`) });
        await expect(section.locator('.docs-command-block')).toHaveCount(1);
        await expect(section.locator('pre.luz-code-block')).toHaveCount(2);

        const command = await section.locator('.docs-command-block__cmd').textContent();
        expect(command.replace(/\s+/g, ' ').replace(/^\s*\$\s*/, '').trim()).toBe(level.install);
        await expect(section.locator('.docs-command-block .luz-copy-btn')).toHaveAttribute('data-copy', level.install);
        // Each snippet has its own Copy button, pointing at its code
        for (const kind of ['cdn', 'bundler']) {
          const button = section.locator(`.docs-snippet .luz-copy-btn[data-copy-from="code-${kind}-level-${index + 1}"]`);
          await expect(button).toHaveCount(1);
          await expect(section.locator(`pre.luz-code-block code#code-${kind}-level-${index + 1}`)).toHaveCount(1);
        }

        const snippet = await section.locator(`code#code-cdn-level-${index + 1}`).textContent();
        let position = -1;
        for (const file of level.files) {
          // Present, and in load order
          const found = snippet.indexOf(file);
          expect(found, `${file} in level ${index + 1}`).toBeGreaterThan(position);
          position = found;
        }
        for (const name of level.absent) expect(snippet).not.toContain(name);
        // Every CDN URL pins the exact version of its package
        const urls = snippet.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/\S+?(?=")/g);
        expect(urls).toHaveLength(level.files.length);
        for (const url of urls) {
          const [, pkg, pinned] = url.match(/@luz-ds\/(tokens|core|site)@([^/]+)\//) ?? [];
          expect(pkg, url).toBeTruthy();
          expect(pinned, url).toBe(version(pkg));
        }
        for (const script of snippet.match(/<script[^>]*>/g) ?? []) {
          expect(script).toMatch(/^<script type="module" src="[^"]+\.min\.js">$/);
        }
      }
    });
  });
});
