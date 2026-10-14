// @ts-check
/**
 * `.luz-landing-header` (@luz-ds/landing; .claude/plans/specs/f3-package-model.md,
 * §1.5, §3 and §9 step 10): the header of a landing page, no longer a block of
 * site. It is a native <header> composed in the markup from core's pieces:
 * `.o-sticky` (stays at the top), `.o-container.o-container--inline.o-row`
 * (the width and gutters of the page, one wrapping row), core's
 * `.luz-nav-toggle` and `.luz-navbar` (the links), and the `__brand` and
 * `__actions` slots. The landing adds only its skin (surface, divider, brand)
 * and the row's gaps.
 *
 * The cases are the old site header's (tests/site-header.spec.js, H1 to H6 of
 * .claude/plans/specs/platform-site-header.md) on the landing classes, on a
 * page of their own (tests/fixtures/landing-header.html: tokens, core, site and
 * landing, no script). The collapse mechanics are tested once, in core, by
 * tests/navbar.spec.js; the stickiness by tests/objects.spec.js.
 * Runs in `chromium` and `chromium-nojs`: the header has no script.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/tests/fixtures/landing-header.html';

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

/** A colour token resolved to the `rgb()` string a computed style uses. */
const color = (page, token) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `color:var(${value})`;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, token);

const style = (page, selector, property) => page.locator(selector).evaluate((el, p) => getComputedStyle(el)[p], property);

const LINKS = ['Wines', 'The winery', 'Visits', 'Club', 'Journal', 'Contact'];

test.describe('landing header', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(FIXTURE);
  });

  test('has the skin of the landing: the page surface, a divider under it, and the 44px bar of core', async ({ page }) => {
    expect(await style(page, '#hdr', 'backgroundColor')).toBe(await color(page, '--luz-surface-page'));
    expect(await style(page, '#hdr', 'borderBlockEndWidth')).toBe('1px');
    expect(await style(page, '#hdr', 'borderBlockEndStyle')).toBe('solid');
    expect(await style(page, '#hdr', 'borderBlockEndColor')).toBe(await color(page, '--luz-divider'));
    // One row of 44px controls, two small paddings and the border: core's --luz-bar-h
    const height = await page.locator('#hdr').evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeCloseTo(await px(page, 'var(--luz-bar-h)'), 0);
  });

  test('the row is core\'s: the width and gutters of the page, wrapping, with the landing\'s gaps (xs between rows, md between items)', async ({ page }) => {
    expect(await style(page, '#row', 'flexWrap')).toBe('wrap');
    expect(await style(page, '#row', 'paddingBlockStart')).toBe('0px');
    expect(await style(page, '#row', 'rowGap')).toBe(`${await px(page, 'var(--luz-space-xs)')}px`);
    expect(await style(page, '#row', 'columnGap')).toBe(`${await px(page, 'var(--luz-space-md)')}px`);
    // Larger from 769px
    await page.setViewportSize({ width: 1000, height: 800 });
    expect(await style(page, '#row', 'columnGap')).toBe(`${await px(page, 'var(--luz-space-lg)')}px`);
    // The brand starts where the content of the page starts
    const [brand, main] = await page.evaluate(() => {
      const left = (el) => el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft);
      return [document.getElementById('brand').getBoundingClientRect().left, left(document.getElementById('top'))];
    });
    expect(Math.abs(brand - main)).toBeLessThanOrEqual(1);
  });

  test('the brand is a link outside a nav: weight 600, the text colour, not underlined, and it takes the free room', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await style(page, '#brand', 'fontWeight')).toBe('600');
    expect(await style(page, '#brand', 'textDecorationLine')).toBe('none');
    expect(await style(page, '#brand', 'color')).toBe(await color(page, '--luz-text-primary'));
    const target = await px(page, 'var(--luz-control-lg)');
    expect(await page.locator('#brand').evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(target - 0.5);
    // margin-inline-end: auto pushes the links and the actions to the inline end, so the gap
    // between the brand and the links is the free room of the row, far more than a gap
    const { brand, nav, actions, row } = await page.evaluate(() => {
      const box = (id) => document.getElementById(id).getBoundingClientRect();
      return { brand: box('brand'), nav: box('site-nav'), actions: box('actions'), row: box('row') };
    });
    expect(nav.left - brand.right).toBeGreaterThan(2 * (await px(page, 'var(--luz-space-lg)')));
    expect(row.right - actions.right).toBeLessThanOrEqual(parseFloat(await style(page, '#row', 'paddingRight')) + 1);
  });

  test('narrow: the links are in core\'s panel under the bar; Tab order closed and open; Escape returns focus to the menu button', async ({ page }) => {
    await expect(page.locator('#site-nav')).toBeHidden();
    await page.focus('#toggle');
    expect(await tabs(page, 3)).toEqual(['brand', 'lang-button', 'login']);

    await page.focus('#toggle');
    await page.keyboard.press('Enter');
    await expect(page.locator('#site-nav')).toBeVisible();
    expect(await tabs(page, 9)).toEqual([...LINKS, 'brand', 'lang-button', 'login']);

    await page.focus('#site-nav a');
    await page.keyboard.press('Escape');
    await expect(page.locator('#site-nav')).toBeHidden();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('toggle');
  });

  test('narrow: the open panel hangs under the header, and the header is not dimmed by the scrim (H3)', async ({ page }) => {
    const clip = await page.evaluate(() => ({ x: 0, y: 0, width: 600, height: Math.ceil(document.getElementById('hdr').getBoundingClientRect().bottom) }));
    const before = await page.screenshot({ clip });
    // showPopover(), not a click: the toggle's hover fill would change the header's pixels
    await page.evaluate(() => document.getElementById('site-nav').showPopover());
    await expect(page.locator('#site-nav')).toBeVisible();
    const after = await page.screenshot({ clip });
    expect(Buffer.compare(before, after), 'header pixels unchanged under the scrim').toBe(0);
    const top = await page.evaluate(() => document.getElementById('site-nav').getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(clip.height - 1);
  });

  test('wide: links in a row after the brand, no menu button, the current link underlined as well as coloured, targets at least 44px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('#toggle')).toBeHidden();
    const links = page.locator('#site-nav a');
    await expect(links).toHaveCount(6);
    const tops = await links.evaluateAll((els) => els.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'one row').toBe(1);
    const current = page.locator('#site-nav a[aria-current="page"]');
    await expect(current).toHaveText('Wines');
    expect(await current.evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');
    expect(await current.evaluate((a) => getComputedStyle(a).color)).toBe(await color(page, '--luz-text-primary'));
    const target = await px(page, 'var(--luz-control-lg)');
    for (const height of await links.evaluateAll((els) => els.map((a) => a.getBoundingClientRect().height))) {
      expect(height).toBeGreaterThanOrEqual(target - 0.5);
    }
    // The Tab order is the document order, with the toggle out of it
    await page.evaluate(() => document.activeElement.blur());
    expect(await tabs(page, 9)).toEqual(['brand', ...LINKS, 'lang-button', 'login']);
  });

  test('sticky comes from `.o-sticky` of core: the header stays at the top while the page scrolls, and not in a window under 30rem tall', async ({ page }) => {
    await expect(page.locator('#hdr')).toHaveClass(/\bo-sticky\b/);
    await page.setViewportSize({ width: 800, height: 700 });
    expect(await style(page, '#hdr', 'position')).toBe('sticky');
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    expect(await page.evaluate(() => Math.round(document.getElementById('hdr').getBoundingClientRect().top))).toBe(0);
    // The header sits above the page in the stack (core's overlay layer)
    expect(await style(page, '#hdr', 'zIndex')).not.toBe('auto');
    await page.setViewportSize({ width: 800, height: 400 });
    expect(await style(page, '#hdr', 'position')).toBe('static');
  });

  test('the header names the bar for its panels: anchor-name and anchor-scope --luz-bar', async ({ page }) => {
    // So a panel opened inside it (the links, the language list) finds this header and not another
    expect(await style(page, '#hdr', 'anchorName')).toBe('--luz-bar');
    expect(await style(page, '#hdr', 'anchorScope')).toBe('--luz-bar');
  });

  test('the language list opens under the bar, at its inline end, and stays inside the window', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.click('#lang-button');
    await expect(page.locator('#lang-menu')).toBeVisible();
    const { menu, header } = await page.evaluate(() => ({
      menu: document.getElementById('lang-menu').getBoundingClientRect().toJSON(),
      header: document.getElementById('hdr').getBoundingClientRect().toJSON(),
    }));
    expect(menu.top).toBeGreaterThanOrEqual(header.bottom - 1);
    expect(menu.right).toBeLessThanOrEqual(1000);
    expect(menu.left).toBeGreaterThan(500);
    // Its links are the languages, each named in itself; the current one is marked
    await expect(page.locator('#lang-menu a')).toHaveText(['English', 'Español']);
    await expect(page.locator('#lang-menu a[aria-current="page"]')).toHaveText('English');
  });

  test('the language list still opens under the header when enlarged text makes it two rows tall', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const tall = await page.evaluate(() => document.getElementById('hdr').getBoundingClientRect().height);
    expect(tall, 'the bar wrapped').toBeGreaterThan(await px(page, 'var(--luz-bar-h)') + 20);
    await page.click('#lang-button');
    await expect(page.locator('#lang-menu')).toBeVisible();
    const { menuTop, headerBottom } = await page.evaluate(() => ({
      menuTop: document.getElementById('lang-menu').getBoundingClientRect().top,
      headerBottom: document.getElementById('hdr').getBoundingClientRect().bottom,
    }));
    expect(menuTop).toBeGreaterThanOrEqual(headerBottom - 1);
  });

  test('H5: the row wraps instead of overflowing: 320 px with long words, and 200 % text at 769 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => {
      document.getElementById('brand').textContent = 'Bodega Albar de los Hermanos y Compañía';
      document.getElementById('login').textContent = 'Iniciar sesión en su cuenta';
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), '320 px').toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 769, height: 800 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), '769 px, 200 % text').toBeLessThanOrEqual(0);
  });

  test('H6: in forced colors the divider, the menu icon and the current link\'s underline stay', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await style(page, '#hdr', 'borderBlockEndStyle')).toBe('solid');
    expect(parseFloat(await style(page, '#hdr', 'borderBlockEndWidth'))).toBeGreaterThanOrEqual(1);
    const fill = await page.locator('#toggle svg path').evaluate((p) => getComputedStyle(p).fill);
    expect(fill).not.toMatch(/none|rgba\(0, 0, 0, 0\)/);
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await page.locator('#site-nav a[aria-current="page"]').evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');
  });

  test('the markup carries no `luz-site-*` class: the header is composed of core and landing classes', async ({ page }) => {
    const classes = await page.evaluate(() => [...document.querySelectorAll('[class]')].flatMap((el) => [...el.classList]).filter((c) => c.startsWith('luz-site-')));
    expect(classes).toEqual([]);
  });

  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}, closed and with the panel open`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      // Reduced motion: the colour transition of the page must not be caught half way by axe
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const run = async () => {
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        return violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id);
      };
      expect(await run(), 'closed').toEqual([]);
      await page.click('#toggle');
      await expect(page.locator('#site-nav')).toBeVisible();
      expect(await run(), 'open').toEqual([]);
    });
  }
});
