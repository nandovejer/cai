// @ts-check
/**
 * Reflow of the site's own pages at 400 % text (WCAG 1.4.4 Resize Text, 1.4.10
 * Reflow): at 320 px wide, with the root font size at 400 %, the document does
 * not scroll sideways, with and without JavaScript.
 *
 * Found in the Safari and Firefox reviews of 2026-10-16:
 *   - the footer's colour mode radios (`.site-modes .luz-mode-btn`, apps/site/header.css)
 *     are the native radio group without JavaScript, and they do not wrap;
 *   - the home page is 386 px too wide: `.landing-render .o-row` holds a `luz-btn`
 *     that does not wrap.
 * The method is the one of tests/ai-page-reflow.spec.js. Runs in `chromium`
 * and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';

// Docs pages with the footer and no hub-only content (the /docs/ hub has its own find hint, not under test here)
const DOCS = ['/docs/', '/docs/get-started/ai/', '/docs/get-started/', '/docs/tokens/color/'];
const HOME = ['/', '/es/', '/ar/'];

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** The first elements that stick out of the window, to name the offender in the failure. */
const offenders = (page) =>
  page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    // What sits inside a box that scrolls or clips on its own (a code block) does not widen the document
    const clipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== 'visible' && p.getBoundingClientRect().right <= width + 0.5) return true;
      }
      return false;
    };
    return [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > width + 0.5 && el.getBoundingClientRect().width > 0 && !el.matches('.luz-skip-link') && !clipped(el))
      .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)
      .slice(0, 5)
      .map((el) => `${el.localName}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : ''}: ${(el.textContent ?? '').trim().slice(0, 30)}`);
  });

/** Open `route` at 320 px with the root font size at 400 %. */
async function open(page, route) {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(route);
  await page.waitForLoadState('load');
  await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });
}

/**
 * The suite runs twice in the `chromium` project, once per setting of JavaScript, because
 * `chromium-nojs` only runs the files its `testMatch` lists (playwright.config.js). If that
 * project lists this file one day, it runs the same two blocks; the duplicates skip.
 */
for (const javaScript of [true, false]) {
  test.describe(`${javaScript ? 'with' : 'without'} JavaScript`, () => {
    test.use({ javaScriptEnabled: javaScript });
    test.beforeEach(({ page: _page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'chromium runs both settings itself');
    });

    test.describe('400 % text at 320 px: the document does not scroll sideways', () => {
      for (const route of [...DOCS, ...HOME]) {
        test(`${route}`, async ({ page }) => {
          await open(page, route);
          const excess = await sideways(page);
          const wide = excess > 0 ? await offenders(page) : [];
          expect(excess, `wider than the window by ${excess}px; first offenders: ${wide.join(' | ')}`).toBeLessThanOrEqual(0);
        });
      }
    });

    test.describe("400 % text at 320 px: the footer's colour mode buttons stay inside the window", () => {
      for (const route of ['/docs/get-started/ai/', '/']) {
        test(`${route}`, async ({ page }) => {
          await open(page, route);
          const outside = await page.locator('.site-modes .luz-mode-btn').evaluateAll((list) => {
            const width = document.documentElement.clientWidth;
            return list
              .map((b) => b.getBoundingClientRect())
              .filter((r) => r.width > 0 && (r.right > width + 0.5 || r.left < -0.5))
              .map((r) => Math.round(Math.max(r.right - width, -r.left)));
          });
          expect(outside, 'mode buttons sticking out of the window, by px').toEqual([]);
        });
      }
    });
  });
}
