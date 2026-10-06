/**
 * CAI Design System — HTML elements reference checks
 * apps/html-elements (served at /html/) lists every current (non-deprecated)
 * HTML element from MDN with a live example or a snippet. The inventory lives
 * in tests/fixtures/html-elements.json; these tests keep the page and the
 * element styles in packages/core/src/elements/ in step with it.
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

/**
 * Rules that predate the :where() convention (v3.0). They keep their type
 * specificity so consumers see no change; do not add to this list.
 */
const LEGACY_TYPE_SELECTORS = new Set([
  'html',
  'body',
  'a',
  'a:hover',
  'a:focus-visible',
  'hr',
  'textarea',
  'h1, h2, h3, h4, h5, h6',
  'details',
  'details[open]',
  'summary',
  'summary:hover',
  'summary:focus-visible',
  'mark',
  'kbd',
  'time',
  'figure',
  'figcaption',
  'output',
  'meter',
]);

/** True when `tag` is used as a type selector in any of the given preludes. */
const hasTypeSelector = (preludes, tag) =>
  preludes.some((prelude) => new RegExp(`(^|[^\\w.#:\\[-])${tag}(?![\\w-])`).test(prelude));

/* ---- Helpers ------------------------------------------------------------ */

/** Open the page and collect failed requests and console problems. */
async function open(page) {
  const failed = [];
  const problems = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(res.url());
  });
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto('/html/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  return { failed, problems };
}

const article = (page, name) => page.locator(`article[data-element="${name}"]`);

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

  test('new element rules have zero specificity, so any .cai-* class wins', () => {
    const offenders = [];
    for (const [file, preludes] of selectorsByFile) {
      for (const raw of preludes) {
        const prelude = raw.replace(/\s+/g, ' ');
        // A pseudo-element cannot go inside :where(): ":where(dialog)::backdrop" is the floor
        if (LEGACY_TYPE_SELECTORS.has(prelude) || /^:where\(.*\)(::[\w-]+)?$/.test(prelude)) continue;
        offenders.push(`${file}: ${prelude}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ---- The page ----------------------------------------------------------- */

test.describe('HTML elements page', () => {
  test('loads cleanly', async ({ page }) => {
    const { failed, problems } = await open(page);
    expect(failed).toEqual([]);
    expect(problems).toEqual([]);
    // The heading demos hold h1 too, but they sit in a stage hidden from assistive technology
    await expect(page.locator('h1:not(.elements-stage *)')).toHaveCount(1);
  });

  test('announces the number of elements and categories it lists', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-elements-count]')).toHaveText(String(elements.length));
    await expect(page.locator('[data-categories-count]')).toHaveText(String(categories.length));
    await expect(page.locator('section[data-category]')).toHaveCount(categories.length);
  });

  test('has one article per element, in its category, linking to MDN', async ({ page }) => {
    await open(page);
    await expect(page.locator('article[data-element]')).toHaveCount(elements.length);
    for (const e of elements) {
      const card = article(page, e.name);
      await expect(card, e.name).toHaveCount(1);
      await expect(card, e.name).toHaveAttribute('id', `el-${e.name}`);
      expect(
        await card.evaluate((el) => el.closest('section')?.dataset.category),
        e.name,
      ).toBe(e.category);
      await expect(card.locator(`a[href="${e.mdn}"]`), e.name).toHaveCount(1);
    }
  });

  test('renders live elements as real tags and the rest as copyable snippets', async ({ page }) => {
    await open(page);
    for (const e of elements) {
      const card = article(page, e.name);
      if (e.render === 'live') {
        expect(await card.locator(`.elements-stage ${e.name}`).count(), e.name).toBeGreaterThan(0);
      }
      // Every element, live or not, shows its markup
      await expect(card.locator('pre.cai-code-block'), e.name).not.toHaveCount(0);
      await expect(card.locator('.cai-copy-btn'), e.name).not.toHaveCount(0);
    }
  });

  test('marks experimental elements', async ({ page }) => {
    await open(page);
    for (const e of elements.filter((el) => el.status === 'experimental')) {
      await expect(article(page, e.name).locator('.cai-tag'), e.name).toContainText(/experimental/i);
    }
  });

  test('has an A-Z index linking to every element', async ({ page }) => {
    await open(page);
    const index = page.locator('#index');
    await expect(index.locator('tbody tr')).toHaveCount(elements.length);
    const names = await index.locator('tbody tr th a').allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    for (const e of elements) {
      await expect(index.locator(`a[href="#el-${e.name}"]`), e.name).toHaveCount(1);
    }
  });

  test('never renders a deprecated element', async ({ page }) => {
    await open(page);
    for (const tag of deprecated) {
      expect(await page.locator(tag).count(), `<${tag}>`).toBe(0);
    }
  });

  test('is reachable from the landing and works in every color mode', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.landing-header__nav a[href="/html/"]')).toHaveCount(1);

    await open(page);
    for (const mode of ['light', 'dark', 'high-contrast']) {
      await page.click(`[data-elements-mode="${mode}"]`);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
      await expect(page.locator('[data-elements-mode][aria-pressed="true"]')).toHaveAttribute(
        'data-elements-mode',
        mode,
      );
    }
  });

  test('has no horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await open(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});
