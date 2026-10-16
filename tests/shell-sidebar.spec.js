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
    await page.evaluate(() => window.scrollTo(0, 400));
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
