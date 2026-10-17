// @ts-check
/**
 * A `.luz-sidebar` that is a direct child of `.o-shell`.
 *
 * Bug: `.o-shell > .luz-sidebar:not([popover])` (objects, layer luz.objects,
 * inside `@media (max-width: 768px)`) lost to `.luz-sidebar` of
 * components/sidebar.css (layer luz.components, declared later), so a sidebar
 * WITHOUT `popover` stayed `position: sticky; height: 100dvh` on a phone
 * instead of being the static, auto-height first block of the page.
 *
 * Fixtures: tests/fixtures/shell-sidebar.html (no popover) and
 * shell-sidebar-popover.html (the drawer), both core's CSS only.
 * Runs in `chromium` and `chromium-nojs`: it is CSS only.
 */
import { test, expect } from '@playwright/test';

const PLAIN = '/tests/fixtures/shell-sidebar.html';
const DRAWER = '/tests/fixtures/shell-sidebar-popover.html';

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1024, height: 768 };

const read = (page, selector) =>
  page.locator(selector).evaluate((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      position: cs.position,
      display: cs.display,
      height: r.height,
      width: r.width,
      top: r.top + window.scrollY,
      left: r.left,
      bottom: r.bottom + window.scrollY,
    };
  });

test.describe('shell: a sidebar without popover on a phone', () => {
  test.use({ viewport: PHONE });

  test.beforeEach(async ({ page }) => {
    await page.goto(PLAIN);
  });

  test('is static, not sticky', async ({ page }) => {
    expect((await read(page, '#sidebar')).position).toBe('static');
  });

  test('is as tall as its content, not as tall as the window', async ({ page }) => {
    const sidebar = await read(page, '#sidebar');
    const content = await page.locator('#sidebar').evaluate((el) => el.scrollHeight);
    expect(sidebar.height).not.toBe(PHONE.height);
    expect(sidebar.height).toBeLessThan(PHONE.height);
    expect(Math.round(sidebar.height)).toBe(Math.round(content));
    expect(await page.locator('#sidebar').evaluate((el) => getComputedStyle(el).height)).not.toBe(`${PHONE.height}px`);
  });

  test('is as wide as the shell', async ({ page }) => {
    const [sidebar, shell] = [await read(page, '#sidebar'), await read(page, '#shell')];
    expect(sidebar.width).toBeCloseTo(shell.width, 0);
    expect(sidebar.left).toBeCloseTo(shell.left, 0);
  });

  test('is the first block of the page, and main comes below it', async ({ page }) => {
    const [sidebar, main, shell] = [await read(page, '#sidebar'), await read(page, '#main'), await read(page, '#shell')];
    expect(sidebar.top).toBeCloseTo(shell.top, 0);
    expect(main.top).toBeGreaterThanOrEqual(sidebar.bottom - 1);
    expect(main.left).toBeCloseTo(sidebar.left, 0);
    expect(main.width).toBeCloseTo(shell.width, 0);
    const rows = await page.locator('#shell').evaluate((el) => getComputedStyle(el).gridTemplateRows.split(' ').length);
    expect(rows).toBe(3);
  });

  test('scrolls away with the page', async ({ page }) => {
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
    const sidebar = await page.locator('#sidebar').evaluate((el) => el.getBoundingClientRect().bottom);
    expect(sidebar).toBeLessThan(0);
  });
});

test.describe('shell: a sidebar without popover on a desktop', () => {
  test.use({ viewport: DESKTOP });

  test.beforeEach(async ({ page }) => {
    await page.goto(PLAIN);
  });

  test('is a sticky column as tall as the window, beside main', async ({ page }) => {
    const [sidebar, main] = [await read(page, '#sidebar'), await read(page, '#main')];
    expect(sidebar.position).toBe('sticky');
    expect(sidebar.height).toBe(DESKTOP.height);
    expect(sidebar.left).toBe(0);
    expect(main.left).toBeGreaterThanOrEqual(sidebar.width - 1);
    expect(main.top).toBeCloseTo(sidebar.top, 0);
  });

  test('stays at the top of the window while the page scrolls', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 400));
    const top = await page.locator('#sidebar').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBe(0);
  });
});

test.describe('shell: a sidebar with popover keeps the drawer', () => {
  test('on a phone it is hidden, and opens fixed and full height', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(DRAWER);
    await expect(page.locator('#sidebar')).toBeHidden();
    await page.locator('#toggle').click();
    await expect(page.locator('#sidebar')).toBeVisible();
    const open = await read(page, '#sidebar');
    expect(open.position).toBe('fixed');
    expect(open.height).toBe(PHONE.height);
    expect(open.left).toBe(0);
  });

  test('on a desktop it is still the sticky column', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(DRAWER);
    const sidebar = await read(page, '#sidebar');
    expect(sidebar.position).toBe('sticky');
    expect(sidebar.height).toBe(DESKTOP.height);
  });
});

test.describe('shell: forced colours', () => {
  test.use({ viewport: DESKTOP });

  test('the current link has a border colour that a link that is not current does not have', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(PLAIN);
    expect(await page.evaluate(() => window.matchMedia('(forced-colors: active)').matches), 'forced colours are on').toBe(true);
    await page.evaluate(() => document.querySelector('#sidebar .luz-sidebar__link').setAttribute('aria-current', 'page'));
    const border = (selector) =>
      page.locator(selector).first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return { color: cs.borderInlineStartColor, width: cs.borderInlineStartWidth, style: cs.borderInlineStartStyle, all: cs.borderColor };
      });
    const current = await border('#sidebar .luz-sidebar__link[aria-current="page"]');
    const other = await border('#sidebar .luz-sidebar__link:not([aria-current])');
    expect(current.style, 'the current link has a border').not.toBe('none');
    expect(current.width, 'the current link has a border with a width').not.toBe('0px');
    expect(current.color, 'border-inline-start-color of the current link and of a link that is not current').not.toBe(other.color);
    expect(current.all, 'border-color of the current link and of a link that is not current').not.toBe(other.all);
  });
});

test.describe('shell: forced colours, the open drawer', () => {
  // F7 (review with forced colours): the drawer is drawn over the page; with backgrounds dropped, nothing but a border tells it from the page behind it
  test.use({ viewport: { width: 375, height: 800 } });

  test('the open drawer has a visible border on its inline-end edge, in a colour that is not its own background', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(DRAWER);
    expect(await page.evaluate(() => window.matchMedia('(forced-colors: active)').matches), 'forced colours are on').toBe(true);
    await page.locator('#toggle').click();
    await expect(page.locator('#sidebar')).toBeVisible();
    expect(await page.locator('#sidebar').evaluate((el) => el.matches(':popover-open')), 'the drawer is open').toBe(true);
    const edge = await page.locator('#sidebar').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { width: parseFloat(cs.borderInlineEndWidth), style: cs.borderInlineEndStyle, color: cs.borderInlineEndColor, background: cs.backgroundColor };
    });
    expect(edge.style, 'border-inline-end-style').not.toBe('none');
    expect(edge.width, 'border-inline-end-width').toBeGreaterThan(0);
    expect(edge.color, 'the border is not drawn in the drawer\'s own background colour').not.toBe(edge.background);
  });
});
