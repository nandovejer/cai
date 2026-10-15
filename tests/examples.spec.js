// @ts-check
/**
 * The markup examples in a browser (F5 step 5, .claude/plans/specs/f5-ai-ready.md
 * 1.4, D1-A, D2-A; the unit side, and the contract, are in
 * tests/ai-files.test.js). Each page with a "Copy the markup" section has a
 * standalone document at `/examples/<area>/<slug>.html` that links LUZ from
 * `../dist/<pkg>/<file>`: relative files beside it, so it opens from a
 * checkout, from the downloaded folder and from Pages, loads nothing from
 * another host and keeps the site's CSP.
 *
 * The documents and the assets are written by this file into a temporary
 * folder from `exampleDocuments()` and `exampleAssets()` of
 * scripts/docs-site/ai.js, and served by a small server of its own (an http
 * origin, so module scripts and the CSP behave as on Pages), so the test does
 * not depend on the dev server's routes. The pages are found with the same
 * scan the generator uses: a new page with markup gets its tests.
 *
 * Axe and the JavaScript tests skip in `chromium-nojs`; the describe at the
 * end turns JavaScript off itself, so it also runs in `chromium`.
 */
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PAGES_CSP } from '../vite.config.js';
import { colorTokens } from './helpers/design-tokens.js';
import { site } from './helpers/docs-site.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const THEMES = ['light', 'dark', 'high-contrast'];
const BLOCKING = ['serious', 'critical'];
const PACKAGE_NAMES = ['tokens', 'core', 'site', 'landing', 'cms', 'app'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

/** The pages that have a #markup section, as the generator reads them; their example route. */
const PAGES = site.pages.filter((p) => /<h3\b[^>]*\bid="markup"/.test(p.body));
const exampleRoute = (page) => page.route.replace(/^\/docs\//, '/examples/').replace(/\/$/, '.html');
const ROUTES = PAGES.map(exampleRoute).sort();
const TITLE = new Map(PAGES.map((p) => [exampleRoute(p), p.meta.title]));

/** @type {{ origin: string, dir: string, server: import('node:http').Server | null }} */
const served = { origin: '', dir: '', server: null };

test.beforeAll(async () => {
  const ai = await import('../scripts/docs-site/ai.js');
  for (const name of ['exampleDocuments', 'exampleAssets']) {
    if (typeof ai[name] !== 'function') throw new Error(`scripts/docs-site/ai.js does not export ${name}`);
  }
  const versions = Object.fromEntries(PACKAGE_NAMES.map((name) => [name, JSON.parse(readFileSync(join(repo, 'packages', name, 'package.json'), 'utf-8')).version]));
  const dir = mkdtempSync(join(tmpdir(), 'luz-examples-'));
  for (const doc of ai.exampleDocuments(site, { csp: PAGES_CSP, versions })) {
    mkdirSync(dirname(join(dir, doc.route)), { recursive: true });
    writeFileSync(join(dir, doc.route), doc.html);
  }
  for (const asset of ai.exampleAssets(repo)) {
    mkdirSync(dirname(join(dir, asset.route)), { recursive: true });
    cpSync(join(repo, asset.from), join(dir, asset.route));
  }
  const server = createServer((req, res) => {
    const path = normalize(join(dir, decodeURIComponent((req.url ?? '/').split('?')[0])));
    if (!path.startsWith(dir + sep) || !existsSync(path) || !TYPES[extname(path)]) {
      res.statusCode = 404;
      return res.end('not found');
    }
    res.setHeader('content-type', TYPES[extname(path)]);
    res.end(readFileSync(path));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  Object.assign(served, { origin: `http://127.0.0.1:${address.port}`, dir, server });
});

test.afterAll(async () => {
  await new Promise((resolve) => (served.server ? served.server.close(() => resolve(undefined)) : resolve(undefined)));
  if (served.dir) rmSync(served.dir, { recursive: true, force: true });
});

/** What each stylesheet link did, read in the page: loaded, with rules, and a token it declares. */
const styled = (page) =>
  page.evaluate((token) => {
    const sheets = [...document.querySelectorAll('link[rel="stylesheet"]')];
    return {
      links: sheets.length,
      withRules: sheets.filter((l) => /** @type {HTMLLinkElement} */ (l).sheet && /** @type {HTMLLinkElement} */ (l).sheet.cssRules.length > 0).length,
      token: getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
    };
  }, colorTokens()[0]);

test.describe('the examples: found, styled, from relative files, under the site CSP', () => {
  test('there is one example for every page with a #markup section, and they are not few', () => {
    // the spec counts 48
    expect(ROUTES.length).toBeGreaterThan(40);
    expect(new Set(ROUTES).size).toBe(ROUTES.length);
  });

  for (const route of ROUTES) {
    test(`${route}: opens, loads every stylesheet and script from its own folder, and is styled`, async ({ page }) => {
      const hosts = [];
      const failed = [];
      page.on('request', (r) => {
        if (!r.url().startsWith(served.origin) && !r.url().startsWith('data:')) hosts.push(r.url());
      });
      page.on('response', (r) => {
        if (['stylesheet', 'script'].includes(r.request().resourceType()) && !r.ok()) failed.push(`${r.status()} ${r.url()}`);
      });
      const response = await page.goto(`${served.origin}${route}`);
      expect(response?.status(), `${route} is served`).toBe(200);
      await page.waitForLoadState('networkidle');
      expect(hosts, 'requests to another host').toEqual([]);
      expect(failed, 'stylesheets and scripts that did not load').toEqual([]);
      const state = await styled(page);
      expect(state.links, 'stylesheets linked').toBeGreaterThanOrEqual(2);
      expect(state.withRules, 'stylesheets with rules').toBe(state.links);
      expect(state.token, 'a token of tokens.min.css resolves').not.toBe('');
      await expect(page.locator('h1').first()).toHaveText(TITLE.get(route) ?? '');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });

    test(`${route}: carries the site's content security policy and breaks none of it`, async ({ page }) => {
      const violations = [];
      page.on('console', (m) => {
        if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
      });
      await page.goto(`${served.origin}${route}`);
      await page.waitForLoadState('networkidle');
      const policy = await page.locator('meta[http-equiv="Content-Security-Policy" i]').first().getAttribute('content');
      expect(policy).toBe(PAGES_CSP);
      expect(violations).toEqual([]);
    });
  }
});

test.describe('the examples with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');

  for (const route of ROUTES) {
    test(`${route}: LUZ's script runs from ../dist/ under the CSP and throws nothing`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${served.origin}${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toHaveAttribute('data-luz-js', '');
      expect(errors, 'uncaught errors').toEqual([]);
    });

    for (const theme of THEMES) {
      test(`${route}: axe in ${theme}`, async ({ page }, testInfo) => {
        await page.goto(`${served.origin}${route}`);
        await page.waitForLoadState('networkidle');
        await page.evaluate((t) => {
          document.documentElement.dataset.theme = t;
        }, theme);
        // Let the theme transition (and any lazy content) settle before measuring
        await page.waitForTimeout(300);
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const summary = (list) => list.map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) - ${v.nodes[0]?.target?.join(' ')}`);
        const advisory = violations.filter((v) => !BLOCKING.includes(v.impact));
        if (advisory.length) await testInfo.attach('axe-advisory.txt', { body: summary(advisory).join('\n'), contentType: 'text/plain' });
        expect(summary(violations.filter((v) => BLOCKING.includes(v.impact))), 'serious/critical axe violations').toEqual([]);
      });
    }
  }

  test('a chunk an entry imports by name is found beside it: <luz-timeline> and <luz-search> are defined', async ({ page }) => {
    await page.goto(`${served.origin}/examples/components/timeline.html`);
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-timeline')), { timeout: 10_000 }).toBe(true);
    await page.goto(`${served.origin}/examples/cms/header.html`);
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-search')), { timeout: 10_000 }).toBe(true);
  });
});

test.describe('the examples without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('a button example is styled by its stylesheets alone, and no script marked the page', async ({ page }) => {
    await page.goto(`${served.origin}/examples/components/button.html`);
    await expect(page.locator('html')).not.toHaveAttribute('data-luz-js', /.*/);
    const button = page.locator('.luz-btn--primary').first();
    await expect(button).toBeVisible();
    const box = await button.evaluate((el) => ({ padding: getComputedStyle(el).paddingInlineStart, height: el.getBoundingClientRect().height }));
    expect(box.padding, 'padding from components/button').not.toBe('0px');
    expect(box.height).toBeGreaterThan(0);
    const state = await styled(page);
    expect(state.token).not.toBe('');
  });

  test('the timeline example is an ordered list with every item visible', async ({ page }) => {
    await page.goto(`${served.origin}/examples/components/timeline.html`);
    const items = page.locator('luz-timeline').first().locator('.luz-timeline__item');
    expect(await items.count()).toBeGreaterThan(1);
    for (let i = 0; i < (await items.count()); i++) await expect(items.nth(i)).toBeVisible();
    await expect(page.locator('luz-timeline button')).toHaveCount(0);
  });

  test('the folder opens from disk (file://): the stylesheets are found by their relative links', async ({ page }) => {
    const url = pathToFileURL(join(served.dir, 'examples/components/button.html')).href;
    await page.goto(url);
    // a file:// stylesheet is opaque to script (cssRules throws), so only what it computes is read
    const state = await page.evaluate((token) => ({ links: document.querySelectorAll('link[rel="stylesheet"]').length, token: getComputedStyle(document.documentElement).getPropertyValue(token).trim() }), colorTokens()[0]);
    expect(state.links).toBeGreaterThanOrEqual(2);
    expect(state.token, 'tokens.min.css loaded from ../dist/').not.toBe('');
    const padding = await page.locator('.luz-btn--primary').first().evaluate((el) => getComputedStyle(el).paddingInlineStart);
    expect(padding, 'core luz.min.css loaded from ../dist/').not.toBe('0px');
  });
});
