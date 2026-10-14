// @ts-check
/**
 * `.luz-cms-header` (@luz-ds/cms; .claude/plans/specs/f3-package-model.md, §1.6
 * and §9 step 11; .claude/plans/specs/f3-ux.md, §1 and the accessibility
 * answers A1 to A13): the header of a blog or a newspaper, no longer
 * `.luz-site-header` of site. One block, one modifier.
 *
 *   Default (the blog bar): header.luz-cms-header.o-sticky >
 *     div.o-container.o-container--inline.o-row holding core's .luz-nav-toggle,
 *     the `__brand` link, core's nav.luz-navbar[popover] and div.o-row.__actions
 *     (<luz-search>, then an optional <luz-lang-switch>). Sticky through core's
 *     `.o-sticky`; the same bar as the landing's, with a masthead brand.
 *   `--masthead` (the newspaper): three rows, not sticky. `__top` (`__date`, a
 *     time[datetime], and `__actions`), the large centred `__brand`, and
 *     `__sections` (the toggle and the navbar) between two rules.
 *
 * Pages: tests/fixtures/cms-header.html and tests/fixtures/cms-masthead.html
 * (tokens, core, site and cms; no script at all). The collapse mechanics are
 * tested once, in core, by tests/navbar.spec.js; the stickiness by
 * tests/objects.spec.js; the search slot by tests/search-slot.spec.js.
 * Runs in `chromium` and `chromium-nojs`: the header has no script.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MODES, contrast } from './helpers/design-tokens.js';

const BAR = '/tests/fixtures/cms-header.html';
const MASTHEAD = '/tests/fixtures/cms-masthead.html';

/** Presses Tab `n` times and reads what has focus after each press. */
async function tabs(page, n) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    seen.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent.trim().slice(0, 20)));
  }
  return seen;
}

/** A CSS length expression (`var(--luz-space-md)`) resolved to pixels, in the page. */
const px = (page, expression) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${value}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, expression);

/** The computed `property` of a probe styled with `declaration` (`font-size: var(--luz-text-xl)`). */
const resolved = (page, declaration, property) =>
  page.evaluate(([css, name]) => {
    const probe = document.createElement('div');
    probe.style.cssText = css;
    document.body.append(probe);
    const value = getComputedStyle(probe)[name];
    probe.remove();
    return value;
  }, [declaration, property]);

/** A colour token resolved to the `rgb()` string a computed style uses. */
const color = (page, token) => resolved(page, `color:var(${token})`, 'color');

const style = (page, selector, property) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], property);

const box = (page, selector) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().toJSON());

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** A logo as a consumer writes it: an <img> whose alt is the publication's name. */
const LOGO = `<img alt="The Vejer Review" width="300" height="80" src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='80'%3E%3Crect width='300' height='80' fill='%23336'/%3E%3C/svg%3E">`;

/** Axe, serious and critical only, in the three modes. */
async function axeIn(page, mode) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, mode);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id);
}

/* ======================================================================== */
/* The blog bar                                                              */
/* ======================================================================== */

test.describe('cms header: the blog bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(BAR);
  });

  test('has the skin of the bar: the page surface, a divider under it, and the one row of core\'s --luz-bar-h', async ({ page }) => {
    expect(await style(page, '#hdr', 'backgroundColor')).toBe(await color(page, '--luz-surface-page'));
    expect(await style(page, '#hdr', 'borderBlockEndWidth')).toBe('1px');
    expect(await style(page, '#hdr', 'borderBlockEndStyle')).toBe('solid');
    expect(await style(page, '#hdr', 'borderBlockEndColor')).toBe(await color(page, '--luz-divider'));
    expect((await box(page, '#hdr')).height).toBeCloseTo(await px(page, 'var(--luz-bar-h)'), 0);
  });

  test('the row is core\'s: the page\'s gutters, wrapping, xs between rows and md between items (lg from 769 px); the brand starts where the content does', async ({ page }) => {
    expect(await style(page, '#row', 'flexWrap')).toBe('wrap');
    expect(await style(page, '#row', 'rowGap')).toBe(`${await px(page, 'var(--luz-space-xs)')}px`);
    expect(await style(page, '#row', 'columnGap')).toBe(`${await px(page, 'var(--luz-space-md)')}px`);
    await page.setViewportSize({ width: 1000, height: 800 });
    expect(await style(page, '#row', 'columnGap')).toBe(`${await px(page, 'var(--luz-space-lg)')}px`);
    const [brand, main] = await page.evaluate(() => {
      const main = document.getElementById('top');
      return [document.getElementById('brand').getBoundingClientRect().left, main.getBoundingClientRect().left + parseFloat(getComputedStyle(main).paddingLeft)];
    });
    expect(Math.abs(brand - main)).toBeLessThanOrEqual(1);
  });

  test('the brand is a masthead: the heading font, weight 600, the text colour, underlined on hover only, a 44px target', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await style(page, '#brand', 'fontFamily')).toBe(await resolved(page, 'font-family:var(--luz-font-heading)', 'fontFamily'));
    expect(await style(page, '#brand', 'fontWeight')).toBe('600');
    expect(await style(page, '#brand', 'color')).toBe(await color(page, '--luz-text-primary'));
    expect(await style(page, '#brand', 'textDecorationLine')).toBe('none');
    expect((await box(page, '#brand')).height).toBeGreaterThanOrEqual((await px(page, 'var(--luz-control-lg)')) - 0.5);
    await page.hover('#brand');
    expect(await style(page, '#brand', 'textDecorationLine')).toBe('underline');
  });

  for (const [width, token] of [[1280, '--luz-text-xl'], [700, '--luz-text-xl'], [640, '--luz-text-lg'], [320, '--luz-text-lg']]) {
    test(`the brand is ${token.replace('--luz-', '')} at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      expect(await style(page, '#brand', 'fontSize')).toBe(await resolved(page, `font-size:var(${token})`, 'fontSize'));
    });
  }

  test('the brand takes the free room of the row: the links and the actions sit at the inline end', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const { brand, nav, actions, row } = await page.evaluate(() => {
      const rect = (id) => document.getElementById(id).getBoundingClientRect();
      return { brand: rect('brand'), nav: rect('cms-nav'), actions: rect('actions'), row: rect('row') };
    });
    expect(nav.left - brand.right).toBeGreaterThan(2 * (await px(page, 'var(--luz-space-lg)')));
    expect(row.right - actions.right).toBeLessThanOrEqual(parseFloat(await style(page, '#row', 'paddingRight')) + 1);
  });

  test('right to left the brand is at the inline start (the right) and the actions at the left', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    const { brand, actions, row } = await page.evaluate(() => {
      const rect = (id) => document.getElementById(id).getBoundingClientRect();
      return { brand: rect('brand'), actions: rect('actions'), row: rect('row') };
    });
    expect(row.right - brand.right).toBeLessThanOrEqual(parseFloat(await style(page, '#row', 'paddingRight')) + 1);
    expect(actions.left - row.left).toBeLessThanOrEqual(parseFloat(await style(page, '#row', 'paddingLeft')) + 1);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  test('A6: the brand is a link, never a heading; the page has one h1, the story\'s, outside the banner', async ({ page }) => {
    expect(await page.locator('#brand').evaluate((el) => el.tagName)).toBe('A');
    expect(await page.locator('#brand').evaluate((el) => el.closest('h1, h2, h3, h4, h5, h6, [role="heading"]'))).toBeNull();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('#hdr h1')).toHaveCount(0);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('banner').getByRole('link', { name: 'The Vejer Review' })).toHaveCount(1);
  });

  test('A6: a logo is an <img> named for the publication, with no visible text beside it, one control high', async ({ page }) => {
    await page.evaluate((html) => { document.getElementById('brand').innerHTML = html; }, LOGO);
    await expect(page.getByRole('link', { name: 'The Vejer Review', exact: true })).toHaveCount(1);
    expect(await page.locator('#brand').evaluate((el) => el.textContent.trim())).toBe('');
    const control = await px(page, 'var(--luz-control-lg)');
    const logo = await box(page, '#brand img');
    expect(logo.height).toBeCloseTo(control, 0);
    expect(logo.width / logo.height).toBeCloseTo(300 / 80, 1);
  });

  test('sticky comes from `.o-sticky` of core: the bar stays at the top while the page scrolls, and not in a window under 30rem tall', async ({ page }) => {
    await expect(page.locator('#hdr')).toHaveClass(/\bo-sticky\b/);
    await page.setViewportSize({ width: 800, height: 700 });
    expect(await style(page, '#hdr', 'position')).toBe('sticky');
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    expect(Math.round((await box(page, '#hdr')).top)).toBe(0);
    expect(await style(page, '#hdr', 'zIndex')).not.toBe('auto');
    await page.setViewportSize({ width: 800, height: 400 });
    expect(await style(page, '#hdr', 'position')).toBe('static');
  });

  test('A8: at 320x256 (400 % of 1280x1024) the bar does not stick; at 320x640 with a two-line brand it takes a quarter of the window at most', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    expect(await style(page, '#hdr', 'position')).toBe('static');
    await page.setViewportSize({ width: 320, height: 640 });
    await page.evaluate(() => { document.getElementById('brand').textContent = 'The Vejer Review of Books and the Coast'; });
    const brand = await box(page, '#brand');
    expect(brand.height, 'the brand wraps to more than one line').toBeGreaterThan(await px(page, 'var(--luz-control-lg)') + 4);
    expect((await box(page, '#hdr')).height).toBeLessThanOrEqual(640 * 0.25);
  });

  test('the bar names itself for its panels: anchor-name and anchor-scope --luz-bar', async ({ page }) => {
    expect(await style(page, '#hdr', 'anchorName')).toBe('--luz-bar');
    expect(await style(page, '#hdr', 'anchorScope')).toBe('--luz-bar');
  });

  test('narrow: the sections are in core\'s panel; Tab order closed and open; Escape returns focus to the button', async ({ page }) => {
    await expect(page.locator('#cms-nav')).toBeHidden();
    await expect(page.locator('#toggle')).toBeVisible();
    await page.focus('#toggle');
    expect(await tabs(page, 3)).toEqual(['brand', 'fallback', 'lang-button']);

    await page.focus('#toggle');
    await page.keyboard.press('Enter');
    await expect(page.locator('#cms-nav')).toBeVisible();
    expect(await tabs(page, 8)).toEqual(['News', 'Culture', 'Opinion', 'Sport', 'Contact', 'brand', 'fallback', 'lang-button']);

    await page.focus('#cms-nav a');
    await page.keyboard.press('Escape');
    await expect(page.locator('#cms-nav')).toBeHidden();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('toggle');
  });

  test('narrow: the open panel hangs under the bar and the scrim does not dim the bar', async ({ page }) => {
    const clip = await page.evaluate(() => ({ x: 0, y: 0, width: 600, height: Math.ceil(document.getElementById('hdr').getBoundingClientRect().bottom) }));
    const before = await page.screenshot({ clip });
    await page.evaluate(() => document.getElementById('cms-nav').showPopover());
    await expect(page.locator('#cms-nav')).toBeVisible();
    const after = await page.screenshot({ clip });
    expect(Buffer.compare(before, after), 'bar pixels unchanged under the scrim').toBe(0);
    expect((await box(page, '#cms-nav')).top).toBeGreaterThanOrEqual(clip.height - 1);
  });

  test('A13: the menu button is named by what it opens, not by its icon, and points at the sections', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sections', exact: true })).toHaveCount(1);
    expect(await page.locator('#toggle').getAttribute('popovertarget')).toBe('cms-nav');
    expect(await page.locator('#toggle').getAttribute('aria-label')).not.toMatch(/^\s*$|☰|≡/);
    expect(await page.locator('#toggle').evaluate((el) => el.textContent.trim())).toBe('');
    expect((await box(page, '#toggle')).height).toBeGreaterThanOrEqual((await px(page, 'var(--luz-control-lg)')) - 0.5);
  });

  test('wide: the sections are a row after the brand, no menu button, targets of 44px, and the Tab order is the document order', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('#toggle')).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Sections', exact: true })).toHaveCount(1);
    const links = page.locator('#cms-nav a');
    await expect(links).toHaveCount(5);
    const tops = await links.evaluateAll((els) => els.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'one row').toBe(1);
    const target = await px(page, 'var(--luz-control-lg)');
    for (const height of await links.evaluateAll((els) => els.map((a) => a.getBoundingClientRect().height))) {
      expect(height).toBeGreaterThanOrEqual(target - 0.5);
    }
    await page.evaluate(() => document.activeElement.blur());
    expect(await tabs(page, 9)).toEqual(['Skip to content', 'brand', 'News', 'Culture', 'Opinion', 'Sport', 'Contact', 'fallback', 'lang-button']);
  });

  test('A5: the current section is underlined as well as coloured, for aria-current "true" (an article\'s section) and "page" (the section\'s own index), and a nav has one "page" at most', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const news = page.locator('#cms-nav a', { hasText: 'News' });
    const culture = page.locator('#cms-nav a', { hasText: 'Culture' });
    await expect(news).toHaveAttribute('aria-current', 'true');
    expect(await news.evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');
    expect(await news.evaluate((a) => getComputedStyle(a).color)).toBe(await color(page, '--luz-text-primary'));
    expect(await culture.evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('none');
    await page.evaluate(() => document.querySelector('#cms-nav a[aria-current]').setAttribute('aria-current', 'page'));
    expect(await news.evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');
    expect(await page.locator('#cms-nav a[aria-current="page"]').count()).toBeLessThanOrEqual(1);
    // Forced colours keep the underline of both
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await news.evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');
    await page.evaluate(() => document.querySelector('#cms-nav a[aria-current]').setAttribute('aria-current', 'true'));
    expect(await news.evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');
  });

  test('the actions hold <luz-search>, then the language switch, at the end of the row', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const order = await page.locator('#actions').evaluate((el) => [...el.children].map((c) => c.localName));
    expect(order).toEqual(['luz-search', 'luz-lang-switch']);
    // Without a script the search shows its A-Z fallback and keeps the trigger hidden
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#trigger')).toBeHidden();
  });

  test('320 px: the search slot is a control, and the bar holds the toggle, the search and the language switch beside the brand', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const control = await px(page, 'var(--luz-control-lg)');
    const slot = await box(page, 'luz-search');
    expect(Math.abs(slot.width - control)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(slot.height - control)).toBeLessThanOrEqual(0.5);
    const controls = await page.evaluate(() => [...document.querySelectorAll('#row button, #row a')]
      .filter((el) => el.id !== 'brand' && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[popover]:not(:popover-open)')).map((el) => el.id));
    expect(controls).toEqual(['toggle', 'fallback', 'lang-button']);
  });

  test('the language switch is optional: without it the search is at the inline end and the bar still fits', async ({ page }) => {
    await page.evaluate(() => document.getElementById('lang').remove());
    const { actions, row } = await page.evaluate(() => ({ actions: document.getElementById('actions').getBoundingClientRect(), row: document.getElementById('row').getBoundingClientRect() }));
    expect(row.right - actions.right).toBeLessThanOrEqual(parseFloat(await style(page, '#row', 'paddingRight')) + 1);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  test('the language list opens under the bar, at its inline end, inside the window', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.click('#lang-button');
    await expect(page.locator('#lang-menu')).toBeVisible();
    const [menu, header] = [await box(page, '#lang-menu'), await box(page, '#hdr')];
    expect(menu.top).toBeGreaterThanOrEqual(header.bottom - 1);
    expect(menu.right).toBeLessThanOrEqual(1000);
    expect(menu.left).toBeGreaterThan(500);
  });

  for (const width of [320, 768, 1280]) {
    test(`${width} px: the brand is whole (no ellipsis, nothing cut) and nothing scrolls sideways, even with long words and 200 % text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      expect(await style(page, '#brand', 'textOverflow')).not.toBe('ellipsis');
      expect(await page.locator('#brand').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
      await page.evaluate(() => { document.getElementById('brand').textContent = 'The Vejer Review of Books and the Coast'; });
      expect(await sideways(page), 'long words').toBeLessThanOrEqual(0);
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      expect(await sideways(page), '200 % text').toBeLessThanOrEqual(0);
    });
  }

  test('forced colors keep the divider and the menu icon', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await style(page, '#hdr', 'borderBlockEndStyle')).toBe('solid');
    expect(parseFloat(await style(page, '#hdr', 'borderBlockEndWidth'))).toBeGreaterThanOrEqual(1);
    expect(await page.locator('#toggle svg path').evaluate((p) => getComputedStyle(p).fill)).not.toMatch(/none|rgba\(0, 0, 0, 0\)/);
  });

  test('the markup carries no `luz-site-*` class: the header is composed of core and cms classes', async ({ page }) => {
    expect(await page.evaluate(() => [...document.querySelectorAll('[class]')].flatMap((el) => [...el.classList]).filter((c) => c.startsWith('luz-site-')))).toEqual([]);
  });

  for (const mode of MODES) {
    test(`axe finds nothing serious in ${mode}, closed and with the panel open`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      expect(await axeIn(page, mode), 'closed').toEqual([]);
      await page.click('#toggle');
      await expect(page.locator('#cms-nav')).toBeVisible();
      expect(await axeIn(page, mode), 'open').toEqual([]);
    });
  }
});

/* ======================================================================== */
/* --masthead                                                                */
/* ======================================================================== */

test.describe('cms header: --masthead', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(MASTHEAD);
  });

  test('is not sticky: no `.o-sticky`, static at any window, and it scrolls away with the page', async ({ page }) => {
    await expect(page.locator('#hdr')).not.toHaveClass(/\bo-sticky\b/);
    expect(await style(page, '#hdr', 'position')).toBe('static');
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    expect((await box(page, '#hdr')).bottom).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await style(page, '#hdr', 'position')).toBe('static');
  });

  test('has room around its rows: md above and below, sm between the rows; the width and gutters of the page', async ({ page }) => {
    expect(await style(page, '#hdr', 'paddingBlockStart')).toBe(`${await px(page, 'var(--luz-space-md)')}px`);
    expect(await style(page, '#hdr', 'paddingBlockEnd')).toBe(`${await px(page, 'var(--luz-space-md)')}px`);
    expect(await style(page, '#inner', 'rowGap')).toBe(`${await px(page, 'var(--luz-space-sm)')}px`);
    const [inner, main] = await page.evaluate(() => {
      const content = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return [r.left + parseFloat(cs.paddingLeft), r.right - parseFloat(cs.paddingRight)]; };
      return [content(document.getElementById('inner')), content(document.getElementById('top'))];
    });
    expect(Math.abs(inner[0] - main[0])).toBeLessThanOrEqual(1);
    expect(Math.abs(inner[1] - main[1])).toBeLessThanOrEqual(1);
  });

  test('the rows are the top (date and search), the publication name, and the sections, in that order', async ({ page }) => {
    const [top, brand, sections] = [await box(page, '#top-row'), await box(page, '#brand'), await box(page, '#sections')];
    expect(top.bottom).toBeLessThanOrEqual(brand.top + 0.5);
    expect(brand.bottom).toBeLessThanOrEqual(sections.top + 0.5);
  });

  test('the top row has the date at the inline start and the search at the inline end', async ({ page }) => {
    const { date, actions, row } = await page.evaluate(() => {
      const rect = (id) => document.getElementById(id).getBoundingClientRect();
      return { date: rect('date'), actions: rect('actions'), row: rect('top-row') };
    });
    expect(Math.abs(date.left - row.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(row.right - actions.right)).toBeLessThanOrEqual(1);
    expect(date.right).toBeLessThan(actions.left);
  });

  test('A7: the date is a `time` with a valid `datetime`, in the sans, sm and secondary text', async ({ page }) => {
    const datetime = await page.locator('#date time').getAttribute('datetime');
    expect(datetime).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(datetime ?? ''))).toBe(false);
    expect(await style(page, '#date', 'fontFamily')).toBe(await resolved(page, 'font-family:var(--luz-font-sans)', 'fontFamily'));
    expect(await style(page, '#date', 'fontSize')).toBe(await resolved(page, 'font-size:var(--luz-text-sm)', 'fontSize'));
    expect(await style(page, '#date', 'color')).toBe(await color(page, '--luz-text-secondary'));
  });

  for (const mode of MODES) {
    test(`A7: the date is at least 4.5:1 on the header's surface in ${mode} (computed from the tokens)`, async ({ page }) => {
      expect(contrast(mode, 'text-secondary', 'surface-page')).toBeGreaterThanOrEqual(4.5);
      // No colour transition caught half way when the mode changes
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, mode);
      expect(await style(page, '#date', 'color')).toBe(await color(page, '--luz-text-secondary'));
      const background = await style(page, '#hdr', 'backgroundColor');
      expect(['rgba(0, 0, 0, 0)', await color(page, '--luz-surface-page')]).toContain(background);
    });
  }

  for (const [width, token] of [[1280, '--luz-text-4xl'], [900, '--luz-text-3xl'], [768, '--luz-text-3xl'], [640, '--luz-text-2xl'], [320, '--luz-text-2xl']]) {
    test(`the brand is large and centred: ${token.replace('--luz-', '')} at ${width} px, the heading font, line-height 1.1`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const size = await resolved(page, `font-size:var(${token})`, 'fontSize');
      expect(await style(page, '#brand', 'fontSize')).toBe(size);
      expect(await style(page, '#brand', 'textAlign')).toBe('center');
      expect(await style(page, '#brand', 'fontFamily')).toBe(await resolved(page, 'font-family:var(--luz-font-heading)', 'fontFamily'));
      expect(await style(page, '#brand', 'fontWeight')).toBe('600');
      expect(await style(page, '#brand', 'color')).toBe(await color(page, '--luz-text-primary'));
      expect(await style(page, '#brand', 'textDecorationLine')).toBe('none');
      expect(parseFloat(await style(page, '#brand', 'lineHeight'))).toBeCloseTo(parseFloat(size) * 1.1, 0);
    });
  }

  test('the brand\'s text is centred in the header', async ({ page }) => {
    const { text, inner } = await page.evaluate(() => {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('brand'));
      const r = range.getBoundingClientRect();
      const i = document.getElementById('inner').getBoundingClientRect();
      return { text: (r.left + r.right) / 2, inner: (i.left + i.right) / 2 };
    });
    expect(Math.abs(text - inner)).toBeLessThanOrEqual(2);
  });

  test('a logo in the brand is two controls high (88px), named for the publication, with no text beside it', async ({ page }) => {
    await page.evaluate((html) => { document.getElementById('brand').innerHTML = html; }, LOGO);
    await expect(page.getByRole('link', { name: 'The Vejer Review', exact: true })).toHaveCount(1);
    expect(await page.locator('#brand').evaluate((el) => el.textContent.trim())).toBe('');
    expect((await box(page, '#brand img')).height).toBeCloseTo(2 * (await px(page, 'var(--luz-control-lg)')), 0);
  });

  test('A6: the brand is a link, never a heading, and the one h1 is the story\'s, outside the banner', async ({ page }) => {
    expect(await page.locator('#brand').evaluate((el) => el.tagName + (el.closest('h1, h2, h3, h4, h5, h6, [role="heading"]') ? ' in a heading' : ''))).toBe('A');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('#hdr h1')).toHaveCount(0);
  });

  test('the sections row sits between two rules, the links centred from 769 px and at the start below', async ({ page }) => {
    for (const side of ['BlockStart', 'BlockEnd']) {
      expect(await style(page, '#sections', `border${side}Width`), side).toBe('1px');
      expect(await style(page, '#sections', `border${side}Style`), side).toBe('solid');
      expect(await style(page, '#sections', `border${side}Color`), side).toBe(await color(page, '--luz-divider'));
    }
    expect(await style(page, '#sections', 'justifyContent')).toBe('center');
    const { nav, row } = await page.evaluate(() => ({ nav: document.getElementById('cms-nav').getBoundingClientRect(), row: document.getElementById('sections').getBoundingClientRect() }));
    expect(Math.abs((nav.left + nav.right) / 2 - (row.left + row.right) / 2)).toBeLessThanOrEqual(2);
    await page.setViewportSize({ width: 768, height: 900 });
    expect(await style(page, '#sections', 'justifyContent')).toMatch(/^(flex-)?start$|^normal$/);
    await expect(page.locator('#toggle')).toBeVisible();
    await expect(page.locator('#cms-nav')).toBeHidden();
  });

  test('the sections row names the bar for its panel: anchor-name and anchor-scope --luz-bar', async ({ page }) => {
    expect(await style(page, '#sections', 'anchorName')).toBe('--luz-bar');
    expect(await style(page, '#sections', 'anchorScope')).toBe('--luz-bar');
  });

  test('wide: the sections are a row of links, no menu button, current link underlined, targets of 44px', async ({ page }) => {
    await expect(page.locator('#toggle')).toBeHidden();
    const links = page.locator('#cms-nav a');
    const tops = await links.evaluateAll((els) => els.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'one row').toBe(1);
    expect(await page.locator('#cms-nav a[aria-current="page"]').evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');
    const target = await px(page, 'var(--luz-control-lg)');
    for (const height of await links.evaluateAll((els) => els.map((a) => a.getBoundingClientRect().height))) {
      expect(height).toBeGreaterThanOrEqual(target - 0.5);
    }
  });

  test('the Tab order is the document order: search, brand, then the sections', async ({ page }) => {
    await page.evaluate(() => document.activeElement.blur());
    expect(await tabs(page, 8)).toEqual(['Skip to content', 'fallback', 'brand', 'News', 'Culture', 'Opinion', 'Sport', 'Contact']);
    await page.setViewportSize({ width: 600, height: 900 });
    await page.evaluate(() => document.activeElement.blur());
    expect(await tabs(page, 4)).toEqual(['Skip to content', 'fallback', 'brand', 'toggle']);
  });

  for (const width of [768, 320]) {
    test(`A3: at ${width} px the panel opens under the sections row, and the date, the search and the name stay uncovered; Escape and a Tab out close the way back`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.click('#toggle');
      await expect(page.locator('#cms-nav')).toBeVisible();
      const [panel, sections] = [await box(page, '#cms-nav'), await box(page, '#sections')];
      expect(panel.top).toBeGreaterThanOrEqual(sections.bottom - 0.5);
      const covered = await page.evaluate(() => ['brand', 'date', 'fallback'].filter((id) => {
        const r = document.getElementById(id).getBoundingClientRect();
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        return !hit || !document.getElementById(id).contains(hit);
      }));
      expect(covered).toEqual([]);
      // Not modal: no aria-modal, and Tab from the last link leaves the panel
      expect(await page.locator('#cms-nav').getAttribute('aria-modal')).toBeNull();
      await page.focus('#cms-nav li:last-child a');
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('#cms-nav'))).toBe(false);
      // Escape closes it and the focus is back on the button
      await page.focus('#cms-nav a');
      await page.keyboard.press('Escape');
      await expect(page.locator('#cms-nav')).toBeHidden();
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('toggle');
    });
  }

  test('320 px at 200 % text: the date gives way to the search, which stays on its row, and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await sideways(page), '100 %').toBeLessThanOrEqual(0);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await sideways(page), '200 % text').toBeLessThanOrEqual(0);
    const { date, actions } = await page.evaluate(() => ({ date: document.getElementById('date').getBoundingClientRect(), actions: document.getElementById('actions').getBoundingClientRect() }));
    expect(actions.top, 'the search is on the date\'s row').toBeLessThan(date.bottom);
    expect(date.right).toBeLessThanOrEqual(actions.left + 0.5);
  });

  test('the search slot is a control at 320 px, without a script', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const control = await px(page, 'var(--luz-control-lg)');
    const slot = await box(page, 'luz-search');
    expect(Math.abs(slot.width - control)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(slot.height - control)).toBeLessThanOrEqual(0.5);
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#trigger')).toBeHidden();
  });

  for (const width of [320, 768, 1280]) {
    test(`${width} px: nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });
  }

  test('forced colors keep the two rules of the sections row', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const side of ['BlockStart', 'BlockEnd']) {
      expect(await style(page, '#sections', `border${side}Style`), side).toBe('solid');
      expect(parseFloat(await style(page, '#sections', `border${side}Width`)), side).toBeGreaterThanOrEqual(1);
    }
  });

  test('the markup carries no `luz-site-*` class', async ({ page }) => {
    expect(await page.evaluate(() => [...document.querySelectorAll('[class]')].flatMap((el) => [...el.classList]).filter((c) => c.startsWith('luz-site-')))).toEqual([]);
  });

  for (const mode of MODES) {
    test(`axe finds nothing serious in ${mode}, closed and with the panel open`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await page.setViewportSize({ width: 600, height: 900 });
      expect(await axeIn(page, mode), 'closed').toEqual([]);
      await page.click('#toggle');
      await expect(page.locator('#cms-nav')).toBeVisible();
      expect(await axeIn(page, mode), 'open').toEqual([]);
    });
  }
});
