/**
 * CAI — axe-core on every app, in every base theme.
 * PRINCIPLES.md §8: serious and critical violations fail the build;
 * moderate and minor ones are attached to the report without failing it.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { notFoundRoute, routeOf, routes, routesWith } from './helpers/docs-site.js';

// Every page in Chromium; a sample of layouts in Firefox and WebKit (a11y.md TEST-1)
const APPS = ['/', ...routes(), notFoundRoute];
const SAMPLE = ['/', '/docs/', '/docs/components/', routeOf('c-button'), '/docs/a-z/', routeOf('h-a11y-target')];
const THEMES = ['light', 'dark', 'high-contrast'];
const BLOCKING = ['serious', 'critical'];

// axe skips hidden content: component pages are scanned again with the
// Design tab open (a11y.md TEST-2)
const DESIGN = routesWith('docs-view-tabs').map((route) => `${route}#design`);

for (const app of [...APPS, ...DESIGN]) {
  for (const theme of THEMES) {
    test(`axe: ${app} in ${theme}`, async ({ page, browserName }, testInfo) => {
      test.skip(browserName !== 'chromium' && !SAMPLE.includes(app), 'sampled outside Chromium');
      await page.goto(app);
      if (app.endsWith('#design')) await expect(page.locator('#design-panel')).toBeVisible();
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      // Let the theme transition (and any lazy content) settle before measuring
      await page.waitForTimeout(400);

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const summary = (list) =>
        list.map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target?.join(' ')}`);
      const blocking = violations.filter((v) => BLOCKING.includes(v.impact));
      const advisory = violations.filter((v) => !BLOCKING.includes(v.impact));

      if (advisory.length) {
        await testInfo.attach('axe-advisory.txt', {
          body: summary(advisory).join('\n'),
          contentType: 'text/plain',
        });
      }
      expect(summary(blocking), 'serious/critical axe violations').toEqual([]);
    });
  }
}
