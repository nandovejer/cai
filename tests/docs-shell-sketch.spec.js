// @ts-check
/**
 * /docs/documentation/shell/: the Example section has a picture of the three
 * columns (F7, accessibility review). The shell is the whole page, so the
 * example cannot be live; a sketch shows it instead: three labelled boxes,
 * "Sidebar", "Content" and "Rail", inside the first `.docs-example`. The
 * sketch is decoration for the eye (`aria-hidden="true"` or `inert`; the prose
 * above it says what the shell is), side by side where the shell has three
 * columns and stacked on a phone, and it never scrolls the page sideways.
 *
 * The boxes are found by their visible text, so the markup is the page's own:
 * the box of a label is the largest element around it that holds no other label.
 * Static markup and CSS: it runs in `chromium` and in `chromium-nojs` alike.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/documentation/shell/';
const LABELS = ['Sidebar', 'Content', 'Rail'];

/** The boxes of the three labels, as the browser lays them out. */
async function boxes(page) {
  const example = page.locator('.docs-example').first();
  await expect(example, 'the Example section has a .docs-example').toHaveCount(1);
  for (const label of LABELS) await expect(example.getByText(label, { exact: true }), `"${label}" is visible in the sketch`).toBeVisible();
  return example.evaluate((root, labels) => {
    const textOf = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    const holders = labels.map((label) => {
      const own = [...root.querySelectorAll('*')].filter((el) => textOf(el) === label && el.children.length === 0);
      return own[0] ?? null;
    });
    return holders.map((holder, i) => {
      if (!holder) return null;
      const others = holders.filter((_, j) => j !== i);
      let box = holder;
      while (box.parentElement && box.parentElement !== root && !others.some((o) => o && box.parentElement.contains(o))) box = box.parentElement;
      const r = box.getBoundingClientRect();
      return { label: labels[i], left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    });
  }, LABELS);
}

test.describe('the sketch of the three columns on the Shell page', () => {
  test('the first .docs-example holds a picture that is hidden from assistive technology, with the three labels inside it', async ({ page }) => {
    await page.goto(PAGE);
    const example = page.locator('.docs-example').first();
    await expect(example).toHaveCount(1);
    const hidden = await example.evaluate((root, labels) => {
      const picture = [...root.querySelectorAll('[aria-hidden="true"], [inert]')].find((el) => labels.every((label) => [...el.querySelectorAll('*')].some((c) => c.children.length === 0 && (c.textContent ?? '').trim() === label)));
      return !!picture;
    }, LABELS);
    expect(hidden, 'one element with aria-hidden="true" or inert holds the Sidebar, Content and Rail labels').toBe(true);
  });

  test('the three boxes read "Sidebar", "Content" and "Rail", and each is a box with a size', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    const found = await boxes(page);
    expect(found.map((b) => b?.label)).toEqual(LABELS);
    for (const b of found) {
      expect(b.width, `${b.label} has a width`).toBeGreaterThan(20);
      expect(b.height, `${b.label} has a height`).toBeGreaterThan(20);
    }
  });

  test('at 1440 px the boxes stand side by side, in the order Sidebar, Content, Rail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    const [sidebar, content, rail] = await boxes(page);
    expect(sidebar.right, 'Sidebar is left of Content').toBeLessThanOrEqual(content.left + 1);
    expect(content.right, 'Content is left of Rail').toBeLessThanOrEqual(rail.left + 1);
    for (const [a, b] of [[sidebar, content], [content, rail]]) {
      expect(Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top), 'the boxes share a row').toBeGreaterThan(10);
    }
  });

  test('at 375 px the boxes are stacked: one above the other, none beside another', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(PAGE);
    const found = await boxes(page);
    const sorted = [...found].sort((a, b) => a.top - b.top);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].top, `${sorted[i].label} starts below ${sorted[i - 1].label}`).toBeGreaterThanOrEqual(sorted[i - 1].bottom - 1);
    for (const b of found) expect(Math.abs(b.left - found[0].left), `${b.label} starts where ${found[0].label} starts`).toBeLessThanOrEqual(2);
    for (const b of found) expect(b.right, `${b.label} stays inside the window`).toBeLessThanOrEqual(375 + 1);
  });

  test('at 320 px the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(PAGE);
    await expect(page.locator('.docs-example').first()).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
