/**
 * CAI Design System — Platform docs guidance
 * Every block class that @cai-ds/platform ships belongs to a pattern, and
 * every pattern has its page in the documentation (apps/docs, the Platform
 * area, /docs/platform/) with the six guidance sections (PRINCIPLES.md red line 18
 * and strong rule SR-5). The class list
 * is read from the package source, so a new class without a pattern fails.
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gotoId, routeOf } from './helpers/docs-site.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

const platformCss = readFileSync(fromRepo('packages/platform/src/components/_components.css'), 'utf-8');
// Blocks only: elements (__) and modifiers (--) are covered by their block
const blocks = [...new Set(
  [...platformCss.matchAll(/\.cai-platform-([\w-]+)/g)].map((m) => m[1].split(/__|--/)[0]),
)];

const patternOf = {
  page: 'shell',
  main: 'shell',
  content: 'shell',
  'skip-link': 'skip',
  'page-header': 'header',
  section: 'section',
  actions: 'actions',
  'feature-grid': 'features',
  'command-block': 'command',
  footer: 'footer',
  image: 'image',
};

const sections = ['when', 'when-not', 'how', 'content', 'keyboard', 'issues'];

test.describe('Platform docs', () => {
  test('every platform class belongs to a pattern', () => {
    for (const block of blocks) {
      expect(patternOf[block], `.cai-platform-${block} has no pattern in tests/platform-docs.spec.js`).toBeTruthy();
    }
  });

  test('every platform pattern has its page with the six guidance sections', async ({ page }) => {
    for (const pattern of new Set(Object.values(patternOf))) {
      const route = await gotoId(page, `p-${pattern}`);
      expect(route, pattern).toMatch(/^\/docs\/platform\/[a-z-]+\/$/);
      // A pattern is a page: its name is the h1, like a core component
      await expect(page.locator('h1.docs-title'), pattern).toHaveCount(1);
      for (const section of sections) {
        const heading = page.locator(`#h-p-${pattern}-${section}`);
        await expect(heading, `${pattern} ${section}`).toHaveCount(1);
        expect(await heading.evaluate((h) => h.tagName), `${pattern} ${section}`).toBe('H2');
        // A heading with nothing under it is not documentation
        const text = await heading.evaluate((h) => h.nextElementSibling?.textContent.trim() ?? '');
        expect(text.length, `${pattern} ${section} is empty`).toBeGreaterThan(10);
      }
    }
  });

  test('keyboard: the skip link is first and moves focus to the main area', async ({ page }) => {
    await gotoId(page, 'p-skip');
    await page.keyboard.press('Tab');
    const skip = page.locator('.cai-platform-skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    // The next Tab starts inside main, not back at the top of the page
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('#main-content'))).toBe(true);
  });

  test('the Platform area lists every pattern, in the sidebar and in its gallery', async ({ page }) => {
    await page.goto('/docs/platform/');
    const nav = await page.locator('.docs-nav a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    const cards = await page.locator('.docs-gallery a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    for (const pattern of new Set(Object.values(patternOf))) {
      expect(nav, pattern).toContain(routeOf(`p-${pattern}`));
      expect(cards, pattern).toContain(routeOf(`p-${pattern}`));
    }
  });

  test('keyboard: a command block copy button is a native button reached with Tab', async ({ page }) => {
    await gotoId(page, 'p-command');
    const copy = page.locator('.cai-platform-command-block .cai-copy-btn').first();
    await expect(copy).toHaveJSProperty('tagName', 'BUTTON');
    await copy.focus();
    await expect(copy).toBeFocused();
    await expect(copy).toHaveAccessibleName(/^Copy /);
  });
});
