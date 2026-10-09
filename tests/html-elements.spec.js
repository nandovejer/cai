/**
 * CAI Design System — HTML elements reference checks
 * The HTML elements area of the documentation (apps/docs, served at
 * /docs/html/: an overview and one page per category) lists every current
 * (non-deprecated) HTML element from MDN with a live example or a snippet. The inventory lives
 * in tests/fixtures/html-elements.json; these tests keep the page and the
 * element styles in packages/core/src/elements/ in step with it.
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gotoId, routeOf, routesOf } from './helpers/docs-site.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

const inventory = JSON.parse(
  readFileSync(fromRepo('tests/fixtures/html-elements.json'), 'utf-8'),
);
const { elements, deprecated, categories } = inventory;

/* ---- Selectors the element styles actually contain ---------------------- */

const elementsDir = fromRepo('packages/core/src/elements');
const elementFiles = existsSync(elementsDir)
  ? readdirSync(elementsDir).filter((file) => file.endsWith('.css') && file !== 'index.css')
  : [];

/** Selector preludes of a stylesheet: every "<prelude> {" that is not an at-rule. */
function selectorsOf(css) {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...bare.matchAll(/([^{}]+)\{/g)]
    .map((m) => m[1].trim())
    .filter((prelude) => !prelude.startsWith('@'));
}

const selectorsByFile = new Map(
  elementFiles.map((file) => [
    file,
    selectorsOf(readFileSync(fromRepo(`packages/core/src/elements/${file}`), 'utf-8')),
  ]),
);

/** True when `tag` is used as a type selector in any of the given preludes. */
const hasTypeSelector = (preludes, tag) =>
  preludes.some((prelude) => new RegExp(`(^|[^\\w.#:\\[-])${tag}(?![\\w-])`).test(prelude));

/* ---- Helpers ------------------------------------------------------------ */

/** Open a page and collect failed requests and console problems. */
async function open(page, route) {
  const failed = [];
  const problems = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(res.url());
  });
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(route);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  return { failed, problems };
}

const article = (page, name) => page.locator(`article[data-element="${name}"]`);
// The overview and one page per category (scripts/docs-site)
const [OVERVIEW, ...CATEGORY_PAGES] = routesOf('html');

/* ---- The inventory itself ----------------------------------------------- */

test.describe('HTML elements inventory (fixture)', () => {
  test('lists each element once, in a known category', () => {
    const names = elements.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    for (const e of elements) {
      expect(categories, e.name).toContain(e.category);
      expect(['standard', 'experimental'], e.name).toContain(e.status);
      expect(['live', 'snippet'], e.name).toContain(e.render);
    }
  });

  test('never lists a deprecated element as current', () => {
    const names = new Set(elements.map((e) => e.name));
    expect(deprecated.filter((tag) => names.has(tag))).toEqual([]);
  });
});

/* ---- Element styles ----------------------------------------------------- */

test.describe('Element styles match the inventory', () => {
  for (const { name, styledBy } of elements) {
    if (styledBy.startsWith('elements/')) {
      test(`${name} has a type selector in ${styledBy}`, () => {
        const file = styledBy.replace('elements/', '');
        expect(elementFiles, `${styledBy} exists`).toContain(file);
        expect(hasTypeSelector(selectorsByFile.get(file), name)).toBe(true);
      });
    } else if (styledBy.startsWith('components/')) {
      test(`${name} is styled by ${styledBy} (with its class)`, () => {
        expect(existsSync(fromRepo(`packages/core/src/${styledBy}`))).toBe(true);
      });
    } else {
      test(`${name} is left unstyled by the elements layer`, () => {
        const all = [...selectorsByFile.values()].flat();
        expect(hasTypeSelector(all, name)).toBe(false);
      });
    }
  }

  // Red line 11; stylelint (cai/no-bare-element) enforces it for every file in packages/
  test('element rules have zero specificity, so any .cai-* class wins', () => {
    const offenders = [];
    for (const [file, preludes] of selectorsByFile) {
      for (const raw of preludes) {
        const prelude = raw.replace(/\s+/g, ' ');
        // A pseudo-element cannot go inside :where(): ":where(dialog)::backdrop" is the floor
        if (/^:where\(.*\)(::[\w-]+)?$/.test(prelude)) continue;
        offenders.push(`${file}: ${prelude}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ---- The pages ---------------------------------------------------------- */

test.describe('HTML elements reference, in the documentation', () => {
  test('every page loads cleanly', async ({ page }) => {
    for (const route of [OVERVIEW, ...CATEGORY_PAGES]) {
      const { failed, problems } = await open(page, route);
      expect(failed, route).toEqual([]);
      expect(problems, route).toEqual([]);
      // The heading demos hold h1 too, but they sit in a stage hidden from assistive technology
      await expect(page.locator('h1:not(.elements-stage *)'), route).toHaveCount(1);
    }
  });

  test('announces the number of elements and categories it lists, one page per category', async ({ page }) => {
    await open(page, OVERVIEW);
    await expect(page.locator('[data-elements-count]')).toHaveText(String(elements.length));
    await expect(page.locator('[data-categories-count]')).toHaveText(String(categories.length));
    expect(CATEGORY_PAGES).toHaveLength(categories.length);
  });

  test('has one article per element, in its category, linking to MDN, live or as a snippet', async ({ page }) => {
    const seen = [];
    for (const route of CATEGORY_PAGES) {
      await open(page, route);
      const category = await page.locator('[data-category]').getAttribute('data-category');
      for (const e of elements.filter((el) => el.category === category)) {
        const card = article(page, e.name);
        await expect(card, e.name).toHaveCount(1);
        await expect(card, e.name).toHaveAttribute('id', `el-${e.name}`);
        await expect(card.locator(`a[href="${e.mdn}"]`), e.name).toHaveCount(1);
        if (e.render === 'live') {
          expect(await card.locator(`.elements-stage ${e.name}`).count(), e.name).toBeGreaterThan(0);
        }
        // Every element, live or not, shows its markup
        await expect(card.locator('pre.cai-code-block'), e.name).not.toHaveCount(0);
        await expect(card.locator('.cai-copy-btn'), e.name).not.toHaveCount(0);
        if (e.status === 'experimental') await expect(card.locator('.cai-tag'), e.name).toContainText(/experimental/i);
        seen.push(e.name);
      }
      // No element on a page of another category
      expect(await page.locator('article[data-element]').count(), route).toBe(elements.filter((el) => el.category === category).length);
    }
    expect(seen.sort()).toEqual(elements.map((e) => e.name).sort());
  });

  test('has an A-Z index linking to every element on its category page', async ({ page }) => {
    await open(page, OVERVIEW);
    const index = page.locator('#html-index');
    await expect(index.locator('tbody tr')).toHaveCount(elements.length);
    const names = await index.locator('tbody tr th a').allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    for (const e of elements) {
      await expect(index.locator(`a[href="${routeOf(`el-${e.name}`)}#el-${e.name}"]`), e.name).toHaveCount(1);
    }
  });

  test('never renders a deprecated element', async ({ page }) => {
    for (const route of [OVERVIEW, ...CATEGORY_PAGES]) {
      await open(page, route);
      for (const tag of deprecated) {
        expect(await page.locator(tag).count(), `${route} <${tag}>`).toBe(0);
      }
    }
  });

  test('is reachable from the landing and works in every color mode', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.site-header__nav a[href="/docs/"]')).toHaveCount(1);

    await open(page, CATEGORY_PAGES[0]);
    await expect(page.locator(`.docs-nav a[href="${OVERVIEW}"]`)).toHaveCount(1);
    // The footer's cycle button: light, then dark, high contrast and light again
    for (const mode of ['dark', 'high-contrast', 'light']) {
      await page.click('footer .cai-mode-cycle');
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
    }
  });

  test('the demos that need a script are wired', async ({ page }) => {
    // Assets the build cannot see in markup get their URL from the script
    // (Vite may inline a small file as a data: URL)
    await gotoId(page, 'el-object');
    await expect(page.locator('#el-object object')).toHaveAttribute('data', /shapes.*\.svg|^data:image\/svg/);
    await gotoId(page, 'el-track');
    await expect(page.locator('#el-track track')).toHaveAttribute('src', /captions.*\.vtt|^data:/);
    // The canvas is painted, and repainted with the new tokens in another mode
    await gotoId(page, 'd-canvas');
    const pixel = () =>
      page.evaluate(() => [...document.getElementById('d-canvas').getContext('2d').getImageData(60, 60, 1, 1).data].join());
    const light = await pixel();
    expect(light).not.toBe('0,0,0,0');
    await page.click('footer .cai-mode-cycle');
    await expect.poll(pixel).not.toBe(light);
  });

  test('has no horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const route of [OVERVIEW, ...CATEGORY_PAGES]) {
      await open(page, route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        route,
      ).toBe(true);
    }
  });
});
