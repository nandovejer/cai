// @ts-check
/**
 * LUZ docs site — the docs app adopts @luz-ds/docs (F6b): what the browser shows.
 * The markup the generator writes is checked, page by page, in tests/docs-shell.test.js;
 * this file holds what needs a layout, a keyboard or a clipboard: the three columns, the
 * order of the page head on screen, the rail outside main, "Copy page as Markdown" (a
 * plain link without JavaScript, the clipboard and a status with it), index.md served by
 * the dev server, and where the area index's gallery stands.
 *
 * The no-JS describe sets `javaScriptEnabled: false` itself, so it runs in `chromium`
 * and in `chromium-nojs` alike; the other one skips itself without JavaScript.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readingOrder } from '../scripts/docs-site/site.js';
import { site } from './helpers/docs-site.js';

const BUTTON = '/docs/components/button/';
const rail = (page) => page.getByRole('complementary', { name: 'About this page' });
const box = async (page, selector) => {
  const element = page.locator(selector).first();
  await expect(element, `${selector} is on the page`).toBeVisible();
  const b = await element.boundingBox();
  if (!b) throw new Error(`${selector} has no box`);
  return { ...b, right: b.x + b.width, bottom: b.y + b.height };
};
const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

test.describe('docs shell, with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('at 1440px the sidebar, main and the rail stand side by side, in this order', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BUTTON);
    await expect(page.locator('body.o-shell.luz-docs-shell')).toHaveCount(1);
    await expect(rail(page)).toBeVisible();
    const [nav, main, aside] = await Promise.all(['nav.luz-docs-nav', 'main.luz-docs-main', 'aside.luz-docs-rail'].map((s) => box(page, s)));
    expect(nav.right, 'the sidebar is left of main').toBeLessThanOrEqual(main.x + 1);
    expect(main.right, 'main is left of the rail').toBeLessThanOrEqual(aside.x + 1);
  });

  test('"On this page" is in the rail, not in main, and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BUTTON);
    await expect(page.locator('main nav.luz-docs-rail__onpage')).toHaveCount(0);
    const onpage = rail(page).locator('nav.luz-docs-rail__onpage');
    await expect(onpage).toBeVisible();
    await expect(onpage.locator('summary.luz-docs-rail__title')).toHaveText('On this page');
    await expect(onpage.getByRole('link', { name: 'Example', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('the rail ends with Copy page as Markdown, Edit this page and Report a problem, in this order', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BUTTON);
    const actions = rail(page).locator('.luz-docs-rail__actions').getByText(/^(Copy page as Markdown|Edit this page|Report a problem)$/);
    await expect(actions).toHaveText(['Copy page as Markdown', 'Edit this page', 'Report a problem']);
    await expect(rail(page).getByRole('link', { name: 'Edit this page', exact: true })).toHaveAttribute('href', 'https://github.com/nandovejer/luz/edit/main/apps/docs/pages/components/button.html');
    await expect(rail(page).getByRole('link', { name: 'Report a problem', exact: true })).toHaveAttribute('href', 'https://github.com/nandovejer/luz/issues/new?title=Button');
  });

  test('Copy page as Markdown writes the page as Markdown to the clipboard, says so, and stays on the page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BUTTON);
    await page.waitForLoadState('networkidle');
    const markdown = await (await page.request.get(`${BUTTON}index.md`)).text();
    expect(markdown.startsWith('# Button\n')).toBe(true);
    const status = rail(page).locator('[role="status"], [aria-live], output').filter({ hasText: /\S/ });
    await expect(status, 'nothing is announced before the click').toHaveCount(0);
    await rail(page).getByText('Copy page as Markdown', { exact: true }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(markdown);
    await expect(status, 'a status says it was copied').not.toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${BUTTON}$`));
  });

  test('the dev server serves /docs/<route>/index.md as text, headed by the title and the description', async ({ page }) => {
    const response = await page.request.get(`${BUTTON}index.md`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^text\/(markdown|plain)/);
    const text = await response.text();
    const button = site.byRoute.get(BUTTON);
    expect(text.split('\n')[0]).toBe('# Button');
    expect(text.split('\n').slice(1).find((line) => line.trim())).toBe(button?.meta.description);
    // The area index and the hub are published too
    for (const route of ['/docs/', '/docs/components/']) {
      const other = await page.request.get(`${route}index.md`);
      expect(other.status(), route).toBe(200);
    }
  });

  test('the page head reads eyebrow, h1, lead and chips from top to bottom', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BUTTON);
    const head = page.locator('header.luz-docs-page-head');
    await expect(head.locator('p.luz-docs-page-head__eyebrow')).toHaveText('Components · Actions and input');
    await expect(head.locator('h1')).toHaveText('Button');
    await expect(head.locator('p.luz-docs-page-head__lead')).toHaveText(site.byRoute.get(BUTTON)?.meta.description ?? '');
    const [eyebrow, h1, lead, meta] = await Promise.all(
      ['.luz-docs-page-head__eyebrow', 'header.luz-docs-page-head h1', '.luz-docs-page-head__lead', '.luz-docs-page-head__meta'].map((s) => box(page, s)),
    );
    expect(eyebrow.bottom, 'eyebrow above the h1').toBeLessThanOrEqual(h1.y + 1);
    expect(h1.bottom, 'h1 above the lead').toBeLessThanOrEqual(lead.y + 1);
    expect(lead.bottom, 'lead above the chips').toBeLessThanOrEqual(meta.y + 1);
    const chips = [
      'components/button.css',
      'No JavaScript',
      'Light · Dark · High contrast',
      ...(['button.spec.js', 'components-button.spec.js'].some((name) => existsSync(fromRepo(`tests/${name}`))) ? ['Tested'] : []),
      'No known issues',
    ];
    await expect(head.locator('ul.luz-docs-page-head__meta > li')).toHaveText(chips);
  });

  test('on an area index the eyebrow is above the h1, and says the area alone', async ({ page }) => {
    for (const area of ['components', 'documentation', 'landing']) {
      await page.goto(`/docs/${area}/`);
      const eyebrow = await box(page, 'header.luz-docs-page-head p.luz-docs-page-head__eyebrow');
      const h1 = await box(page, 'header.luz-docs-page-head h1');
      expect(eyebrow.bottom, area).toBeLessThanOrEqual(h1.y + 1);
      await expect(page.locator('header.luz-docs-page-head p.luz-docs-page-head__eyebrow')).toHaveText(site.areas.find((a) => a.id === area)?.label ?? '');
    }
  });

  test('the sidebar is flat: every area is open, so a page of another area is a link away, with no accordion', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BUTTON);
    const nav = page.locator('nav.luz-docs-nav');
    await expect(nav.locator('details, summary')).toHaveCount(0);
    for (const href of ['/docs/tokens/color/', '/docs/get-started/snippet/', '/docs/site/search/', '/docs/documentation/rail/', '/docs/accessibility/']) {
      await expect(nav.locator(`a[href="${href}"]`), href).toBeVisible();
    }
    // Every page of the reading order is in it, once
    expect(await nav.locator('a[href^="/docs/"]').count()).toBeGreaterThanOrEqual(readingOrder(site).length);
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Button');
    await expect(nav.locator('a[aria-current="true"]')).toHaveText('Components');
  });

  test('the page ends with the pager, then the foot: Last updated, Edit and Report', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BUTTON);
    const foot = page.locator('main p.luz-docs-page-foot');
    await expect(foot).toHaveCount(1);
    await expect(foot).toContainText('Last updated');
    await expect(foot.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
    await expect(foot.getByRole('link')).toHaveText(['Edit this page', 'Report a problem']);
    const pager = await box(page, '.luz-docs-pager');
    const f = await box(page, 'main p.luz-docs-page-foot');
    expect(f.y, 'the foot is under the pager').toBeGreaterThanOrEqual(pager.bottom - 1);
    // The pager's links are named by their text
    await expect(page.locator('.luz-docs-pager').getByRole('link', { name: 'Previous Breadcrumb', exact: true })).toBeVisible();
  });

  test('on the documentation index "Install and load" comes under the pattern gallery', async ({ page }) => {
    await page.goto('/docs/documentation/');
    const patterns = await box(page, '#group-patterns');
    const reference = await box(page, '#group-reference');
    const install = await box(page, '#install-and-load');
    expect(install.y, 'under Patterns').toBeGreaterThanOrEqual(patterns.bottom - 1);
    expect(install.y, 'under Reference').toBeGreaterThanOrEqual(reference.bottom - 1);
  });

  test('axe: the page with the head, the rail and the pager has no serious or critical violation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of [BUTTON, '/docs/components/']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(' ')}`), route).toEqual([]);
    }
  });
});

test.describe('docs shell, without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('Copy page as Markdown is a plain link to the .md file, and the file is text', async ({ page }) => {
    await page.goto(BUTTON);
    const copy = rail(page).getByRole('link', { name: 'Copy page as Markdown', exact: true });
    await expect(copy).toBeVisible();
    await expect(copy).toHaveAttribute('href', `${BUTTON}index.md`);
    const response = await page.request.get(await copy.evaluate((a) => /** @type {HTMLAnchorElement} */ (a).href));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^text\/(markdown|plain)/);
    expect((await response.text()).startsWith('# Button\n')).toBe(true);
  });

  test('the rail has the three actions as links, and "On this page" is a native <details>', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BUTTON);
    await expect(rail(page).locator('.luz-docs-rail__actions a')).toHaveText(['Copy page as Markdown', 'Edit this page', 'Report a problem']);
    const summary = rail(page).locator('nav.luz-docs-rail__onpage details > summary');
    await expect(summary).toHaveText('On this page');
    await expect(summary).toBeVisible();
  });

  test('below 80rem the rail is drawn under the content, and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(BUTTON);
    const main = await box(page, 'main.luz-docs-main');
    const aside = await box(page, 'aside.luz-docs-rail');
    expect(aside.y, 'the rail is under main').toBeGreaterThanOrEqual(main.bottom - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('the not-found page keeps no rail (its markup has no script: tests/docs-shell.test.js; the dev server adds its own client)', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
    await expect(page.locator('aside.luz-docs-rail')).toHaveCount(0);
  });
});
