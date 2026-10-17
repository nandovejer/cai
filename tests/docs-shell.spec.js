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
import { eyebrowPackageOf } from './helpers/package-areas.js';
import { focusAndHitTest, ringBeyondInlineStart } from './helpers/obscured.js';

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

  test('on an area index the eyebrow is above the h1, and says the area and its package', async ({ page }) => {
    for (const area of ['components', 'documentation', 'landing']) {
      await page.goto(`/docs/${area}/`);
      const eyebrow = await box(page, 'header.luz-docs-page-head p.luz-docs-page-head__eyebrow');
      const h1 = await box(page, 'header.luz-docs-page-head h1');
      expect(eyebrow.bottom, area).toBeLessThanOrEqual(h1.y + 1);
      const label = site.areas.find((a) => a.id === area)?.label ?? '';
      await expect(page.locator('header.luz-docs-page-head p.luz-docs-page-head__eyebrow')).toHaveText(`${label} · ${eyebrowPackageOf(area)}`);
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
    // The drawer's site links (Home, Docs) are in the nav too, and "Docs" is "true" on every docs page: they are not an area
    await expect(nav.locator('a[aria-current="true"]:not(.page-nav__site a)')).toHaveText('Components');
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
    // WCAG 4.1.2: a link without a script, a button only when a script makes it do something else than navigate
    await expect(rail(page).getByRole('button', { name: 'Copy page as Markdown' })).toHaveCount(0);
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

/* ====================================================================================================
 * Accessibility audit of the docs shell (feat/luz-identity, HEAD ae7a5983): S1, S2, M1 to M3, m1, m2.
 * ================================================================================================== */

const COULD_NOT_COPY = 'Could not copy the page.';
const copyControl = (page) => rail(page).getByText('Copy page as Markdown', { exact: true });

/* ---- S1 (WCAG 2.4.11): from 80rem the sticky rail never covers the site footer ------------------ */

for (const javaScriptEnabled of [true, false]) {
  test.describe(`S1 rail and footer, JavaScript ${javaScriptEnabled ? 'on' : 'off'}`, () => {
    test.use({ javaScriptEnabled, reducedMotion: 'reduce' });

    for (const [width, height] of [[1440, 800], [1280, 720]]) {
      test(`${width}x${height}: at the bottom of the page every focused footer link is drawn on top, and the rail ends above the footer`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(BUTTON);
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
        const links = page.locator('#site-footer a');
        const count = await links.count();
        expect(count, 'the footer has links').toBeGreaterThan(0);
        const problems = [];
        for (let i = 0; i < count; i++) {
          const result = await focusAndHitTest(links.nth(i));
          if (!result.focused) problems.push(`"${result.label}" did not take the focus`);
          if (!result.inViewport) problems.push(`"${result.label}" is not inside the window`);
          for (const hit of result.covered) problems.push(`"${result.label}" is covered at ${hit}`);
        }
        expect(problems, 'footer links covered by something else').toEqual([]);
        const bottoms = await page.evaluate(() => {
          const footer = document.querySelector('#site-footer').getBoundingClientRect().top;
          const aside = document.querySelector('aside.luz-docs-rail');
          return {
            footer,
            rail: aside.getBoundingClientRect().bottom,
            inner: aside.querySelector('.luz-docs-rail__inner')?.getBoundingClientRect().bottom ?? null,
          };
        });
        expect(bottoms.rail, 'the rail ends at or above the footer').toBeLessThanOrEqual(bottoms.footer + 0.5);
        if (bottoms.inner !== null) expect(bottoms.inner, 'what the rail holds ends at or above the footer').toBeLessThanOrEqual(bottoms.footer + 0.5);
      });
    }
  });
}

test.describe('S1 the rail is a box that stretches, with a sticky box inside it', () => {
  test.use({ viewport: { width: 1440, height: 800 } });

  test('aside > div.luz-docs-rail__inner holds "On this page" and the actions; the inner box is sticky, the aside is not', async ({ page }) => {
    await page.goto(BUTTON);
    const aside = page.locator('aside.luz-docs-rail');
    const inner = aside.locator(':scope > div.luz-docs-rail__inner');
    await expect(inner, 'one inner box, a direct child of the aside').toHaveCount(1);
    await expect(aside.locator(':scope > *'), 'the aside has nothing else').toHaveCount(1);
    await expect(inner.locator(':scope > nav.luz-docs-rail__onpage')).toHaveCount(1);
    await expect(inner.locator(':scope > .luz-docs-rail__actions')).toHaveCount(1);
    expect(await aside.evaluate((el) => getComputedStyle(el).position), 'the aside does not stick').not.toBe('sticky');
    expect(await inner.evaluate((el) => getComputedStyle(el).position), 'the inner box sticks').toBe('sticky');
  });

  test('the aside stretches over its grid area: as tall as main', async ({ page }) => {
    await page.goto(BUTTON);
    const main = await box(page, 'main.luz-docs-main');
    const aside = await box(page, 'aside.luz-docs-rail');
    expect(Math.abs(aside.height - main.height), `aside ${aside.height}px, main ${main.height}px`).toBeLessThanOrEqual(1);
  });
});

/* ---- S2 (WCAG 2.4.11): the sticky tab row does not cover a Copy button reached backwards ---------- */

test.describe('S2 the sticky tab row and the Copy buttons', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'the Copy buttons are the script\'s');
  test.use({ reducedMotion: 'reduce' });

  for (const [width, height] of [[320, 800], [320, 200]]) {
    test(`${width}x${height}: going backwards with Shift+Tab through "Copy the markup", no focused Copy button is under the tab row`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(BUTTON);
      await page.waitForLoadState('networkidle');
      await page.locator('[aria-label="Button variants and sizes"]').focus();
      const seen = [];
      const covered = [];
      for (let press = 0; press < 12 && seen.length < 3; press++) {
        await page.keyboard.press('Shift+Tab');
        const isCopy = await page.evaluate(() => document.activeElement?.matches('.docs-snippet .luz-copy-btn') ?? false);
        if (!isCopy) continue;
        const label = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
        seen.push(label);
        const result = await focusAndHitTest(page.locator('.docs-snippet .luz-copy-btn:focus'), { ends: false });
        for (const hit of result.covered) covered.push(`"${label}" is covered at ${hit}`);
      }
      expect(seen, 'Shift+Tab reached the three Copy buttons of "Copy the markup"').toHaveLength(3);
      expect(covered, 'Copy buttons under the tab row').toEqual([]);
    });
  }

  test('320x200: in a window shorter than 30rem the tab row is not sticky', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 200 });
    await page.goto(BUTTON);
    expect(await page.locator('.docs-view-tabs').evaluate((el) => getComputedStyle(el).position)).not.toBe('sticky');
  });
});

/* ---- M1: Copy page as Markdown, when it fails ------------------------------------------------------ */

test.describe('M1 Copy page as Markdown fails', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');
  test.use({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  const failures = [
    ['index.md answers 404', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' })],
    ['the network fails', (route) => route.abort()],
  ];
  for (const [when, fail] of failures) {
    test(`when ${when}: the URL stays, the rail says "${COULD_NOT_COPY}", and the focus stays on the control`, async ({ page }) => {
      await page.route('**/index.md', fail);
      await page.goto(BUTTON);
      await page.waitForLoadState('networkidle');
      const navigations = [];
      page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
      await copyControl(page).click();
      await expect(rail(page).locator('[role="status"]'), 'the status tells the failure').toHaveText(COULD_NOT_COPY);
      expect(navigations, 'the page did not navigate').toEqual([]);
      await expect(page).toHaveURL(new RegExp(`${BUTTON}$`));
      await expect(copyControl(page), 'the focus is still on the control').toBeFocused();
    });
  }

  test('when the file is fetched and the clipboard refuses: the browser opens the .md file', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')), readText: () => Promise.resolve('') },
      });
    });
    await page.goto(BUTTON);
    await page.waitForLoadState('networkidle');
    await copyControl(page).click();
    await expect(page).toHaveURL(new RegExp(`${BUTTON}index\\.md$`));
  });
});

/* ---- M2 (WCAG 4.1.2): with JavaScript Copy page is a button, not a link ---------------------------- */

test.describe('M2 Copy page as Markdown is a button with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS link is tested above');
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a <button type="button"> named "Copy page as Markdown", and no link of that name', async ({ page }) => {
    await page.goto(BUTTON);
    const button = rail(page).getByRole('button', { name: 'Copy page as Markdown', exact: true });
    await expect(button, 'the script made it a button').toBeVisible();
    expect(await button.evaluate((el) => el.tagName)).toBe('BUTTON');
    await expect(button).toHaveAttribute('type', 'button');
    await expect(rail(page).getByRole('link', { name: 'Copy page as Markdown' })).toHaveCount(0);
    await expect(rail(page).locator('a[href$="index.md"]')).toHaveCount(0);
  });
});

/* ---- M3: the current page, in the flat sidebar, is in view when the page loads --------------------- */

test.describe('M3 the current page in the sidebar is in view', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  for (const width of [1440, 860]) {
    test(`${width}px: /docs/accessibility/ shows its own link inside the sidebar's box, without moving the page or the focus`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/docs/accessibility/');
      await page.waitForLoadState('networkidle');
      const scroller = await page.locator('#page-nav').evaluate((nav) => {
        const cs = getComputedStyle(nav);
        return { overflowY: cs.overflowY, overflows: nav.scrollHeight > nav.clientHeight };
      });
      expect(scroller.overflowY, 'the sidebar is the scroller').toMatch(/auto|scroll/);
      expect(scroller.overflows, 'the list is longer than the sidebar: the current link can be out of sight').toBe(true);
      const visible = () =>
        page.evaluate(() => {
          const nav = document.querySelector('#page-nav');
          const current = nav.querySelector('a[aria-current="page"]');
          const n = nav.getBoundingClientRect();
          const c = current.getBoundingClientRect();
          const top = Math.max(n.top, 0);
          const bottom = Math.min(n.bottom, window.innerHeight);
          return { label: current.textContent.trim(), linkTop: Math.round(c.top), linkBottom: Math.round(c.bottom), boxTop: Math.round(top), boxBottom: Math.round(bottom), inside: c.top >= top - 1 && c.bottom <= bottom + 1 };
        });
      await expect.poll(visible, { message: 'the current link is inside the sidebar\'s visible box' }).toMatchObject({ inside: true });
      expect(await page.evaluate(() => window.scrollY), 'the page itself did not scroll').toBe(0);
      expect(await page.evaluate(() => document.activeElement === document.body), 'the focus did not move').toBe(true);
    });
  }
});

/* ---- m1: a focus ring in the rail is not clipped at its start edge --------------------------------- */

test.describe('m1 the focus ring of a rail control is whole at the start edge', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');
  test.use({ viewport: { width: 1440, height: 800 }, reducedMotion: 'reduce' });

  const controls = {
    'the "On this page" title': (page) => rail(page).locator('summary.luz-docs-rail__title'),
    'a link of the list': (page) => rail(page).locator('a.luz-docs-rail__link').first(),
    'Copy page as Markdown': (page) => copyControl(page),
    'Edit this page': (page) => rail(page).getByText('Edit this page', { exact: true }),
    'Report a problem': (page) => rail(page).getByText('Report a problem', { exact: true }),
  };
  for (const [name, find] of Object.entries(controls)) {
    test(`${name}: the outline starts inside the padding box of the element that scrolls`, async ({ page }) => {
      await page.goto(BUTTON);
      await page.waitForLoadState('networkidle');
      await find(page).focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      const ring = await ringBeyondInlineStart(page);
      expect(ring.focusVisible, `"${ring.label}" shows a focus ring`).toBe(true);
      expect(ring.outlineStyle, 'it is an outline').not.toBe('none');
      expect(ring.hidden, `the ring starts ${ring.ringStart}px, the padding box of ${ring.clipper} starts ${ring.paddingBoxStart}px`).toBeLessThanOrEqual(0.01);
    });
  }
});

/* ---- m2: one name, one destination ----------------------------------------------------------------- */

for (const javaScriptEnabled of [true, false]) {
  test.describe(`m2 "Report a problem" names one destination, JavaScript ${javaScriptEnabled ? 'on' : 'off'}`, () => {
    test.use({ javaScriptEnabled, viewport: { width: 1440, height: 900 } });

    for (const route of [BUTTON, '/docs/accessibility/', '/docs/components/']) {
      test(`${route}: no two links named "Report a problem" go to different places, and the footer's link to the issue list is "Issues on GitHub"`, async ({ page }) => {
        await page.goto(route);
        const hrefs = await page.getByRole('link', { name: 'Report a problem', exact: true }).evaluateAll((links) => links.map((a) => a.getAttribute('href')));
        expect(hrefs.length, 'the page has its own Report link').toBeGreaterThan(0);
        expect([...new Set(hrefs)], 'every link named "Report a problem"').toHaveLength(1);
        const issues = page.locator('#site-footer').getByRole('link', { name: 'Issues on GitHub', exact: true });
        await expect(issues).toHaveCount(1);
        await expect(issues).toHaveAttribute('href', 'https://github.com/nandovejer/luz/issues');
      });
    }
  });
}
