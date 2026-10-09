/**
 * CAI — axe-core on every app, in every base theme.
 * PRINCIPLES.md §8: serious and critical violations fail the build;
 * moderate and minor ones are attached to the report without failing it.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// /platform/ and /html/ are redirect stubs to /docs/ (tests/moved-pages.spec.js)
const APPS = ['/', '/docs/'];
const THEMES = ['light', 'dark', 'high-contrast'];
const BLOCKING = ['serious', 'critical'];

for (const app of APPS) {
  for (const theme of THEMES) {
    test(`axe: ${app} in ${theme}`, async ({ page }, testInfo) => {
      await page.goto(app);
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
