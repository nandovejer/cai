// @ts-check
/**
 * The space of <luz-search> before and after its chunk (.claude/plans/specs/f3-package-model.md,
 * section 2.4 "No CLS before define"; .claude/plans/specs/f3-ux.md section 3,
 * the narrow slot): the fallback link and the trigger share one cell of an
 * inline grid and both take part in its size, so swapping them moves
 * nothing. At 768px and below the fallback is the compact magnifier, 44 by
 * 44, like the compact trigger, with its words clipped but in its name.
 * Page: tests/fixtures/site-loader.html. The half without JavaScript runs in
 * `chromium` with JavaScript turned off for the file.
 */
import { test, expect } from '@playwright/test';
import { PAGE, SEARCH_CHUNK, hold, isDefined, layoutShift, px, slotBox, watchLayoutShift } from './helpers/site-loader.js';

const TOLERANCE = 0.5;
const near = (a, b) => Math.abs(a - b) <= TOLERANCE;

test.describe('the slot, with JavaScript', () => {
  for (const width of [320, 1440]) {
    test(`${width}px: the box of <luz-search> is the same before and after the chunk, and nothing shifts`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await watchLayoutShift(page);
      const release = await hold(page, SEARCH_CHUNK);
      await page.goto(PAGE);
      await page.waitForLoadState('load');
      await page.waitForTimeout(300);
      const before = await slotBox(page);
      await expect(page.locator('#fallback')).toBeVisible();
      await expect(page.locator('#trigger')).toBeHidden();
      release();
      await expect.poll(() => isDefined(page)).toBe(true);
      await expect(page.locator('#trigger')).toBeVisible();
      await page.waitForTimeout(500);
      const after = await slotBox(page);
      expect(near(before.width, after.width), `${before.width} then ${after.width}`).toBe(true);
      expect(near(before.height, after.height), `${before.height} then ${after.height}`).toBe(true);
      expect(await layoutShift(page)).toBe(0);
    });
  }

  test('320px: the compact slot is a control high, before and after', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const release = await hold(page, SEARCH_CHUNK);
    await page.goto(PAGE);
    const control = await px(page, 'var(--luz-control-lg)');
    const before = await slotBox(page);
    release();
    await expect.poll(() => isDefined(page)).toBe(true);
    await expect(page.locator('#trigger')).toBeVisible();
    const after = await slotBox(page);
    for (const box of [before, after]) {
      expect(near(box.width, control), `width ${box.width}`).toBe(true);
      expect(near(box.height, control), `height ${box.height}`).toBe(true);
    }
  });

  test('1440px: the hidden trigger keeps its space, so the slot is as wide as the wider of the two', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await hold(page, SEARCH_CHUNK);
    await page.goto(PAGE);
    const sizes = await page.evaluate(() => {
      const width = (selector) => document.querySelector(selector).getBoundingClientRect().width;
      return { slot: width('luz-search'), fallback: width('#fallback'), trigger: width('#trigger') };
    });
    expect(sizes.trigger).toBeGreaterThan(0);
    expect(sizes.fallback).toBeGreaterThan(0);
    expect(sizes.slot).toBeGreaterThanOrEqual(Math.max(sizes.fallback, sizes.trigger) - TOLERANCE);
    expect(await page.locator('#trigger').evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
  });
});

test.describe('the slot, without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('320px: the fallback is the compact magnifier, a control by a control, named "A–Z index"', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(PAGE);
    const control = await px(page, 'var(--luz-control-lg)');
    const box = await page.locator('luz-search').boundingBox();
    expect(near(box.width, control), `width ${box.width}`).toBe(true);
    expect(near(box.height, control), `height ${box.height}`).toBe(true);
    await expect(page.locator('#fallback')).toBeVisible();
    await expect(page.locator('#fallback')).toHaveAccessibleName('A–Z index');
    // The words are clipped, not removed
    const label = await page.locator('.luz-search__fallback-label').boundingBox();
    expect(label.width).toBeLessThanOrEqual(1);
    await expect(page.locator('#trigger')).toBeHidden();
  });

  test('1440px: the fallback shows its words, and the trigger is invisible and out of the tree', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto(PAGE);
    await expect(page.locator('#fallback')).toBeVisible();
    const label = await page.locator('.luz-search__fallback-label').boundingBox();
    expect(label.width).toBeGreaterThan(24);
    await expect(page.locator('#trigger')).toBeHidden();
    await expect(page.getByRole('button', { name: /Search/ })).toHaveCount(0);
    await page.keyboard.press('Tab');
    await expect(page.locator('#fallback')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
  });
});
