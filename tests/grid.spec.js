// @ts-check
/**
 * Layout grid (objects/_objects.css): .o-grid with .o-grid--auto, which fits
 * as many columns as it can above --luz-grid-min, and .o-grid--2 to --4, a
 * fixed number of columns above 768px and one column at 768px and below.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/grid.html';
/** The number of columns of a grid, as the browser lays it out. */
const columns = (page, id) =>
  page.evaluate((sel) => getComputedStyle(document.querySelector(sel)).gridTemplateColumns.split(' ').length, `#${id}`);

test.describe('layout grid', () => {
  test('a fixed number of columns above 768px', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(FIXTURE);
    expect(await columns(page, 'two')).toBe(2);
    expect(await columns(page, 'three')).toBe(3);
    expect(await columns(page, 'four')).toBe(4);
  });

  test('one column at 768px and below', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto(FIXTURE);
    for (const id of ['two', 'three', 'four']) expect(await columns(page, id), id).toBe(1);
  });

  test('auto: as many columns as fit, and fewer as the window narrows', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(FIXTURE);
    // 16rem columns and 16px gaps: 1200 - 16 padding fits 4
    expect(await columns(page, 'auto')).toBe(4);
    await page.setViewportSize({ width: 600, height: 800 });
    expect(await columns(page, 'auto')).toBe(2);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await columns(page, 'auto')).toBe(1);
  });

  test('auto: --luz-grid-min sets the narrowest column', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(FIXTURE);
    // 8rem columns: 4 of them fit in 600px, where 16rem fits 2
    expect(await columns(page, 'auto-narrow')).toBe(4);
  });

  test('a wide item does not push the grid past its container', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto(FIXTURE);
    const { grid, doc } = await page.evaluate(() => ({
      grid: document.querySelector('#wide').getBoundingClientRect().width,
      doc: document.documentElement.clientWidth,
    }));
    expect(grid).toBeLessThanOrEqual(doc);
  });
});

test.describe('layout container', () => {
  test('.o-container is centred, also as a grid item', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 800 });
    await page.goto(FIXTURE);
    const boxes = await page.evaluate(() => {
      const make = (parent) => {
        const el = document.createElement('div');
        el.className = 'o-container';
        el.textContent = 'x';
        parent.append(el);
        const r = el.getBoundingClientRect();
        return { left: r.left, right: window.innerWidth - r.right, width: r.width };
      };
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      document.body.append(grid);
      return { block: make(document.body), grid: make(grid) };
    });
    for (const [name, box] of Object.entries(boxes)) {
      expect(box.width, name).toBeLessThan(1600);
      expect(Math.abs(box.left - box.right), name).toBeLessThanOrEqual(1);
      expect(box.left, name).toBeGreaterThan(0);
    }
    expect(boxes.grid.width).toBeCloseTo(boxes.block.width, 0);
  });
});
