// @ts-check
/**
 * axe on the home page and the docs under each of the six lights (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4). The light is set the
 * way a visitor gets it: the clock, with no stored choice (apps/site/boot.js,
 * then <luz-mode by="clock">). The four lights that override tokens
 * (apps/site/theme-light.css) meet the same contrast as the modes under them.
 * Serious and critical violations fail; Chromium only (tests/a11y.spec.js
 * samples the other engines on the base modes).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';
import { LIGHTS, NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const PAGES = ['/', '/docs/', '/docs/components/button/'];
const BLOCKING = ['serious', 'critical'];

for (const path of PAGES) {
  for (const [light, time, mode] of LIGHTS) {
    test(`axe: ${path} in the ${light} light (${time}, ${mode})`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await atTime(page, time);
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
      await page.waitForLoadState('networkidle');
      // The boot script sets the light before the first frame, so there is nothing to wait for:
      // a fade running at load would be measured mid-way by axe, so it is a failure, not a delay
      expect(await page.evaluate(() => document.documentElement.getAnimations().map((a) => /** @type {any} */ (a).transitionProperty))).toEqual([]);
      await faded(page);

      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const summary = violations
        .filter((v) => BLOCKING.includes(v.impact ?? ''))
        .map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target?.join(' ')}`);
      expect(summary, 'serious/critical axe violations').toEqual([]);
    });
  }
}
