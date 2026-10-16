// @ts-check
/**
 * Core's `.luz-navbar` (.claude/plans/specs/f3-package-model.md, §3.2 and §9
 * step 5; accessibility requirement O4): the links of a header, in a row from
 * 769px and in a native popover panel under the bar at 768px and below,
 * opened by core's `.luz-nav-toggle`. These are the cases of the old site
 * header (tests/site-header.spec.js, H1 to H6 of
 * .claude/plans/specs/platform-site-header.md; H1 and H2 moved to
 * tests/objects.spec.js with `.o-sticky`), on a page of their own
 * (tests/fixtures/navbar.html: `header.o-sticky > .o-container.o-container--inline.o-row`
 * with a bare brand link, no site and no kind of site).
 * Runs in `chromium` and `chromium-nojs`: the navbar has no script.
 */
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routes } from './helpers/docs-site.js';

const FIXTURE = '/tests/fixtures/navbar.html';
const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

/** Presses Tab `n` times and reads what has focus after each press. */
async function tabs(page, n) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    seen.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent.trim().slice(0, 20)));
  }
  return seen;
}

/** Resolve a CSS length expression (`var(--luz-control-lg)`) to pixels, in the page. */
const px = (page, expression) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${value}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, expression);

/** The expanded state of the menu button in the accessibility tree (Chromium; the popover API sets it, the page sets nothing). */
async function expandedOf(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const button = nodes.find((n) => n.role?.value === 'button' && n.name?.value === 'Menu');
  return button?.properties.find((p) => p.name === 'expanded')?.value.value;
}

const LINKS = ['Wines', 'The winery', 'Visits', 'Club', 'Journal', 'Contact'];

test.describe('navbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(FIXTURE);
  });

  test('narrow: the links are in a panel; Tab order closed and open; Escape returns focus to the menu button', async ({ page }) => {
    // Closed: the panel is display: none, so its links take no focus
    await expect(page.locator('#site-nav')).toBeHidden();
    await page.focus('#toggle');
    expect(await tabs(page, 2)).toEqual(['brand', 'login']);

    // Open with the keyboard: the browser puts the open popover right after its button
    await page.focus('#toggle');
    await page.keyboard.press('Enter');
    await expect(page.locator('#site-nav')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('toggle');
    expect(await tabs(page, 8)).toEqual([...LINKS, 'brand', 'login']);

    // Escape from a link closes it and puts focus back on the button
    await page.focus('#site-nav a');
    await page.keyboard.press('Escape');
    await expect(page.locator('#site-nav')).toBeHidden();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('toggle');
  });

  test('O4: the panel is a labelled navigation, the button says it is expanded when open, and light dismiss closes it', async ({ page, browserName }) => {
    // The expanded state is read from the Chromium accessibility tree (DevTools protocol); the rest runs everywhere
    const cdp = browserName === 'chromium';
    // Two navigations on the page, two names (WCAG 2.4.1, 1.3.1)
    const names = await page.locator('nav').evaluateAll((navs) => navs.map((n) => n.getAttribute('aria-label')));
    expect(new Set(names).size).toBe(names.length);
    expect(names.every(Boolean)).toBe(true);

    if (cdp) expect(await expandedOf(page), 'closed').toBe(false);
    await page.click('#toggle');
    await expect(page.locator('#site-nav')).toBeVisible();
    if (cdp) expect(await expandedOf(page), 'open').toBe(true);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

    // A click on the page under the panel closes it (light dismiss), and the button is collapsed again
    await page.mouse.click(300, 700);
    await expect(page.locator('#site-nav')).toBeHidden();
    if (cdp) expect(await expandedOf(page), 'dismissed').toBe(false);
  });

  test('narrow: the panel hangs under the bar, as wide as the window, with a shadow, and its links are at least 44px tall', async ({ page }) => {
    await page.click('#toggle');
    const panel = await page.evaluate(() => {
      const nav = document.getElementById('site-nav');
      const r = nav.getBoundingClientRect();
      const s = getComputedStyle(nav);
      return {
        position: s.position,
        top: r.top,
        left: r.left,
        right: r.right,
        shadow: s.boxShadow,
        links: [...nav.querySelectorAll('a')].map((a) => a.getBoundingClientRect().height),
        header: document.getElementById('hdr').getBoundingClientRect().bottom,
      };
    });
    expect(panel.position).toBe('fixed');
    // Without anchor positioning it opens at --luz-bar-h from the top; with it, at the bar's bottom edge: never over the bar
    expect(panel.top).toBeGreaterThanOrEqual(panel.header - 1);
    expect(panel.left).toBeCloseTo(0, 0);
    expect(panel.right).toBeCloseTo(600, 0);
    expect(panel.shadow).not.toBe('none');
    const target = await px(page, 'var(--luz-control-lg)');
    for (const height of panel.links) expect(height).toBeGreaterThanOrEqual(target - 0.5);
  });

  test('H4: resizing wide with the panel open keeps it under the header, away from the brand', async ({ page }) => {
    await page.click('#toggle');
    await expect(page.locator('#site-nav')).toBeVisible();
    await page.setViewportSize({ width: 1000, height: 800 });
    const { nav, brand, header, position } = await page.evaluate(() => {
      const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
      return { nav: box('#site-nav'), brand: box('#brand'), header: box('#hdr'), position: getComputedStyle(document.querySelector('#site-nav')).position };
    });
    expect(position).toBe('fixed');
    expect(nav.top, 'under the header').toBeGreaterThanOrEqual(header.bottom - 1);
    // No overlap with the brand: the panel is below it
    const overlap = nav.left < brand.right && nav.right > brand.left && nav.top < brand.bottom && nav.bottom > brand.top;
    expect(overlap).toBe(false);
    // Closed, the links are a row of the header again
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#site-nav')).position)).toBe('static');
    await expect(page.locator('#site-nav')).toBeVisible();
    await expect(page.locator('#toggle')).toBeHidden();
  });

  test('wide: links in a row, no menu button, the current link underlined as well as coloured, targets at least 44px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('#toggle')).toBeHidden();
    // The toggle is out of the layout and out of the tree; the navigation is in the tree
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('toggle')).display)).toBe('none');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveCount(6);
    const links = page.locator('#site-nav a');
    await expect(links).toHaveCount(6);
    const tops = await links.evaluateAll((els) => els.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'one row').toBe(1);
    const current = await page.locator('#site-nav a[aria-current="page"]').evaluate((a) => getComputedStyle(a).textDecorationLine);
    expect(current).toBe('underline');
    const target = await px(page, 'var(--luz-control-lg)');
    for (const height of await links.evaluateAll((els) => els.map((a) => a.getBoundingClientRect().height))) {
      expect(height).toBeGreaterThanOrEqual(target - 0.5);
    }
  });

  test('wide: the Tab order is the document order, toggle skipped', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => document.activeElement.blur());
    expect(await tabs(page, 8)).toEqual(['brand', ...LINKS, 'login']);
  });

  test('sits in the bar: the panel opens at the bar height of core (--luz-bar-h) when nothing anchors it', async ({ page }) => {
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--luz-bar-h').trim()), '--luz-bar-h is declared by core').not.toBe('');
    await page.click('#toggle');
    const [top, bar] = [await page.evaluate(() => document.getElementById('site-nav').getBoundingClientRect().top), await px(page, 'var(--luz-bar-h)')];
    expect(top).toBeCloseTo(bar, 0);
  });

  for (const forced of [false, true]) {
    test(`H3: the open panel's scrim starts under the header, so the header is not dimmed${forced ? ' (forced colors)' : ''}`, async ({ page }) => {
      if (forced) await page.emulateMedia({ forcedColors: 'active' });
      const header = await page.evaluate(() => {
        const r = document.getElementById('hdr').getBoundingClientRect();
        return { x: 0, y: 0, width: 600, height: Math.ceil(r.bottom) };
      });
      const before = await page.screenshot({ clip: header });
      await page.evaluate(() => document.getElementById('site-nav').showPopover());
      await expect(page.locator('#site-nav')).toBeVisible();
      const after = await page.screenshot({ clip: header });
      expect(Buffer.compare(before, after), 'header pixels unchanged under the scrim').toBe(0);
      // And the panel hangs below the header
      const below = await page.evaluate(() => document.getElementById('site-nav').getBoundingClientRect().bottom);
      expect(below).toBeGreaterThan(header.height + 1);
    });
  }

  test('H5: the row wraps instead of overflowing: 320 px with long words, and 200 % text at 769 px with six links', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => {
      document.getElementById('brand').textContent = 'Bodega Albar de los Hermanos y Compañía';
      document.getElementById('login').textContent = 'Iniciar sesión en su cuenta';
    });
    const narrow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(narrow, '320 px').toBeLessThanOrEqual(0);

    await page.setViewportSize({ width: 769, height: 800 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(wide, '769 px, 200 % text').toBeLessThanOrEqual(0);
    // And the links really are a navbar there: a row that wrapped, not a list with markers
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#site-nav ul')).listStyleType)).toBe('none');
  });

  test('H6: the menu button keeps its icon in forced colors, in the SVG and in core\'s bars', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const svg = await page.locator('#toggle svg path').evaluate((p) => {
      const s = getComputedStyle(p);
      const r = p.getBoundingClientRect();
      return { fill: s.fill, w: r.width, h: r.height };
    });
    expect(svg.w).toBeGreaterThan(10);
    expect(svg.fill).not.toMatch(/none|rgba\(0, 0, 0, 0\)/);
    const bars = await page.locator('#bars .luz-nav-toggle__bar').first().evaluate((b) => getComputedStyle(b).backgroundColor);
    expect(bars, 'a system color, not transparent').not.toBe('rgba(0, 0, 0, 0)');
    // The current link keeps its underline (RL-6), and the weight does not change
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await page.locator('#site-nav a[aria-current="page"]').evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');
  });
});

test.describe('navbar: the docs', () => {
  test('core has a Navbar component page with a live example and the Code and Design tabs', async ({ page }, testInfo) => {
    // Needs apps/docs/pages/components/navbar.html (§1.9: the collapse mechanics)
    expect(routes()).toContain('/docs/components/navbar/');
    await page.goto('/docs/components/navbar/');
    await expect(page.locator('h1.docs-title')).toHaveText(/navbar/i);
    await expect(page.locator('.docs-example .luz-navbar')).toHaveCount(1);
    if (testInfo.project.name === 'chromium-nojs') {
      // No tablist without JavaScript, by design: both panels show, stacked, and the two links reach them
      await expect(page.locator('nav.docs-view-tabs a[href="#code-panel"]')).toHaveText('Code');
      await expect(page.locator('nav.docs-view-tabs a[href="#design-panel"]')).toHaveText('Design');
    } else {
      await expect(page.getByRole('tablist', { name: /documentation$/ }).getByRole('tab')).toHaveText(['Code', 'Design']);
    }
  });

  test('the page documents its class, the popover panel and the forced colors', () => {
    const file = fromRepo('apps/docs/pages/components/navbar.html');
    expect(existsSync(file), 'apps/docs/pages/components/navbar.html').toBe(true);
    const text = readFileSync(file, 'utf-8');
    expect(text).toContain('luz-navbar__link');
    expect(text).toContain('popover');
    expect(text).toContain('forced colors');
  });
});
