// @ts-check
/**
 * Reflow of "Working with AI" (WCAG 1.4.10, 1.4.4): /docs/get-started/ai/ does
 * not scroll sideways at 320 px, whatever the reader's text size. Reviewed
 * 2026-10-16 (Safari and Firefox reviews, the same in Chromium):
 *   - 200 % text: the document is 13 px too wide, and the `button.luz-copy-btn`
 *     of the code blocks sticks out by 13 to 17 px;
 *   - 400 % text (root font size): 346 px too wide, from the long file names in
 *     `<code>` that have no break opportunity.
 * Only this page is under test here; the others are not required to pass.
 * Runs with and without JavaScript (the page has the same reflow in both).
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/get-started/ai/';

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const scale of ['100%', '200%', '400%']) {
  test.describe(`${PAGE} at 320 px with the root font size at ${scale}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(PAGE);
      await page.waitForLoadState('load');
      await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, scale);
    });

    test('the document does not scroll sideways', async ({ page }) => {
      const excess = await sideways(page);
      const wide = excess > 0
        ? await page.evaluate(() => {
            const width = document.documentElement.clientWidth;
            return [...document.querySelectorAll('body *')]
              .filter((el) => el.getBoundingClientRect().right > width + 0.5)
              .slice(0, 5)
              .map((el) => `${el.localName}${el.className ? `.${String(el.className).split(' ')[0]}` : ''}: ${el.textContent.trim().slice(0, 40)}`);
          })
        : [];
      expect(excess, `wider than the window by ${excess}px; first offenders: ${wide.join(' | ')}`).toBeLessThanOrEqual(0);
    });

    test('every copy button stays inside the window', async ({ page, javaScriptEnabled }) => {
      test.skip(javaScriptEnabled === false, 'the copy buttons are written by JavaScript');
      const outside = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        return [...document.querySelectorAll('button.luz-copy-btn')]
          .map((b) => b.getBoundingClientRect())
          .filter((r) => r.width > 0 && (r.right > width + 0.5 || r.left < -0.5))
          .map((r) => Math.round(r.right - width));
      });
      expect(outside, 'copy buttons sticking out of the window, by px').toEqual([]);
    });
  });
}
