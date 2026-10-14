/**
 * LUZ Design System — Pattern docs guidance, per package
 * Every block class that a package of patterns ships (@luz-ds/site,
 * @luz-ds/landing, @luz-ds/cms) belongs to a pattern, and every pattern has
 * its page in the documentation, in the area of its package (/docs/site/,
 * /docs/landing/, /docs/cms/), with the same structure as a component page: example,
 * known issues, then the Code and Design tabs (PRINCIPLES.md red line 18 and
 * strong rule SR-5). The class list is read from each package's source, so
 * a new class without a pattern fails.
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gotoId, routeOf } from './helpers/docs-site.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

// One entry per package of patterns: its docs area is its name, its
// classes start with .luz-<name>-, and each block maps to the id of its
// pattern page (p-<pattern>)
const PACKAGES = {
  site: {
    label: 'Site',
    patternOf: {
      page: 'shell',
      main: 'shell',
      content: 'shell',
      'skip-link': 'shell',
      'page-header': 'header',
      hero: 'hero',
      header: 'site-header',
      section: 'section',
      actions: 'actions',
      footer: 'footer',
      image: 'image',
      search: 'search',
      'search-trigger': 'search',
      'lang-switcher': 'lang-switch',
      submenu: 'submenu',
      notice: 'banner',
      consent: 'consent',
    },
  },
  landing: {
    label: 'Landing',
    patternOf: {
      'feature-grid': 'features',
    },
  },
  cms: {
    label: 'CMS',
    patternOf: {
      'article-header': 'article-header',
      article: 'toc',
      toc: 'toc',
    },
  },
};

/** Block names of the package's classes: elements (__) and modifiers (--) are covered by their block. */
function blocksOf(name) {
  const dir = fromRepo(`packages/${name}/src/components`);
  const css = readdirSync(dir)
    .filter((file) => file.endsWith('.css'))
    .map((file) => readFileSync(`${dir}/${file}`, 'utf-8'))
    .join('\n');
  return [...new Set([...css.matchAll(new RegExp(`\\.luz-${name}-([\\w-]+)`, 'g'))].map((m) => m[1].split(/__|--/)[0]))];
}

// Code tab, then Design tab; Known issues is above them (ia.md §6)
const sections = ['known-issues', 'how', 'keyboard', 'when', 'when-not', 'content'];

for (const [name, { label, patternOf }] of Object.entries(PACKAGES)) {
  const patterns = new Set(Object.values(patternOf));

  test.describe(`${label} docs`, () => {
    test(`every ${name} class belongs to a pattern`, () => {
      const blocks = blocksOf(name);
      expect(blocks.length, `packages/${name} has no .luz-${name}-* class`).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(patternOf[block], `.luz-${name}-${block} has no pattern in tests/site-docs.spec.js`).toBeTruthy();
      }
    });

    test(`every ${name} pattern has its page: example, known issues, Code and Design`, async ({ page }) => {
      for (const pattern of patterns) {
        const route = await gotoId(page, `p-${pattern}`);
        expect(route, pattern).toMatch(new RegExp(`^/docs/${name}/[a-z-]+/$`));
        // A pattern is a page: its name is the h1, like a core component
        await expect(page.locator('h1.docs-title'), pattern).toHaveCount(1);
        await expect(page.getByRole('tablist', { name: /documentation$/ }).getByRole('tab'), pattern).toHaveText(['Code', 'Design']);
        for (const section of sections) {
          const heading = page.locator(`#${section}`);
          await expect(heading, `${pattern} ${section}`).toHaveCount(1);
          expect(await heading.evaluate((h) => h.tagName), `${pattern} ${section}`).toBe(section === 'known-issues' ? 'H2' : 'H3');
          // A heading with nothing under it is not documentation
          const text = await heading.evaluate((h) => h.nextElementSibling?.textContent.trim() ?? '');
          expect(text.length, `${pattern} ${section} is empty`).toBeGreaterThan(10);
        }
      }
    });

    test(`the ${label} area lists every pattern, in the sidebar and in its gallery`, async ({ page }) => {
      await page.goto(`/docs/${name}/`);
      const nav = await page.locator('.docs-nav a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      const cards = await page.locator('.docs-gallery a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      for (const pattern of patterns) {
        expect(nav, pattern).toContain(routeOf(`p-${pattern}`));
        expect(cards, pattern).toContain(routeOf(`p-${pattern}`));
      }
    });
  });
}
