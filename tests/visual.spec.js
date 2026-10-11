// @ts-check
/**
 * CAI — visual regression of the component demos.
 * Every `[data-docs-specimen]` of a component page, in light, dark and high
 * contrast, compared with the PNG kept in `visual.spec.js-snapshots/`.
 *
 * Chromium on Linux only: text is drawn by the system's fonts (CAI ships the
 * system stacks), so a snapshot is valid on the machine image that made it.
 * Other projects and systems skip. The tolerance is set in
 * playwright.config.js (expect.toHaveScreenshot).
 *
 * The player is left out: its video frame and its controls depend on media
 * loading. Platform patterns are not covered yet.
 *
 * Update after an intended change:
 *   pnpm exec playwright test tests/visual.spec.js --project=chromium --update-snapshots
 * then look at the changed PNGs in the diff before you commit them.
 */
import { test, expect } from '@playwright/test';
import { site } from './helpers/docs-site.js';

const THEMES = ['light', 'dark', 'high-contrast'];
const SKIP = new Set(['/docs/components/player/']);

const pages = site.pages
  .filter((p) => p.meta.area === 'components' && p.body.includes('data-docs-specimen') && !SKIP.has(p.route))
  .map((p) => p.route)
  .sort();

test.describe('visual regression of the component demos', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'snapshots are Chromium only');
  test.skip(process.platform !== 'linux', 'snapshots are made on Linux');

  for (const route of pages) {
    const slug = route.split('/').filter(Boolean).pop();
    for (const theme of THEMES) {
      test(`${slug} in ${theme}`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.evaluate((t) => {
          document.documentElement.dataset.theme = t;
        }, theme);
        await page.evaluate(() => document.fonts.ready);
        const specimens = page.locator('[data-docs-specimen]');
        const count = await specimens.count();
        for (let i = 0; i < count; i++) {
          await expect(specimens.nth(i)).toHaveScreenshot(`${slug}-${theme}${count > 1 ? `-${i + 1}` : ''}.png`);
        }
      });
    }
  }
});
