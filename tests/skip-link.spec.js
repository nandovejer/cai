// @ts-check
/**
 * `.luz-skip-link` (core, components/skip-link.css): the link that lets a
 * keyboard user jump past the chrome to the main content
 * (.claude/plans/specs/f3-package-model.md §1.4 and §9 step 4; accessibility
 * requirement O3). The keyboard case is the one of tests/site-docs.spec.js
 * ("the skip link is first and moves focus to the main area"), on core's class,
 * on a page of its own (tests/fixtures/skip-link.html: a cookie band, a notice
 * and an `.o-sticky` bar between the link and `main`) and then on the docs.
 * Runs in `chromium` and `chromium-nojs`: it is a link and CSS.
 */
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routes } from './helpers/docs-site.js';

const FIXTURE = '/tests/fixtures/skip-link.html';
const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

test.describe('skip link', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto(FIXTURE);
  });

  test('is off screen until it has focus, then fixed at the top start corner, above the sticky bar', async ({ page }) => {
    const hidden = await page.evaluate(() => {
      const r = document.getElementById('skip').getBoundingClientRect();
      return { position: getComputedStyle(document.getElementById('skip')).position, bottom: r.bottom };
    });
    expect(hidden.position).toBe('fixed');
    expect(hidden.bottom, 'above the window while not focused').toBeLessThanOrEqual(0);

    await page.keyboard.press('Tab');
    await expect(page.locator('#skip')).toBeFocused();
    await expect(page.locator('#skip')).toBeInViewport({ ratio: 1 });
    const shown = await page.evaluate(() => {
      const skip = document.getElementById('skip');
      const r = skip.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const s = getComputedStyle(skip);
      return { top: r.top, left: r.left, covered: top !== skip && !skip.contains(top), zIndex: s.zIndex, toast: getComputedStyle(document.documentElement).getPropertyValue('--luz-z-toast').trim() };
    });
    expect(shown.covered, 'nothing, the sticky bar included, is drawn over it').toBe(false);
    expect(shown.zIndex).toBe(shown.toast);
    expect(shown.left, 'at the start corner').toBeLessThan(40);
  });

  test('O3: is the first Tab stop with a cookie band and a notice before the header', async ({ page }) => {
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    const order = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim().slice(0, 12)));
    }
    expect(order[0]).toBe('skip');
    expect(order.slice(1)).toEqual(['Policy', 'Accept', 'Reject', 'Book a visit']);
  });

  test('O3: Enter moves to main, the next Tab starts inside it, and main is not under the sticky bar', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.locator('#skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    // The next Tab starts inside main, not back at the top of the page
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#main-content'))).toBe(true);
    // Back at the top, the jump scrolls main to the top of the window: the sticky bar must not cover its first line
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('hdr')).position), 'the bar is .o-sticky').toBe('sticky');
    await page.evaluate(() => { window.history.replaceState(null, '', window.location.pathname); window.scrollTo({ top: 0, behavior: 'instant' }); document.getElementById('skip').focus(); });
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.scrollY), { message: 'the jump scrolled' }).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    const { main, bar } = await page.evaluate(() => ({
      main: document.querySelector('#main-content h1')?.getBoundingClientRect().top ?? 0,
      bar: document.getElementById('hdr').getBoundingClientRect().bottom,
    }));
    expect(main, 'the first heading of main starts below the bar').toBeGreaterThanOrEqual(bar - 1);
  });

  test('keeps its slide-in under normal motion and drops it under reduced motion', async ({ page }) => {
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('skip')).position)).toBe('fixed');
    const normal = await page.evaluate(() => getComputedStyle(document.getElementById('skip')).transitionDuration);
    expect(normal).not.toBe('0s');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('skip')).transitionDuration)).toBe('0s');
  });

  test('is a link with the fill of the brand and no underline, not printed on paper', async ({ page }) => {
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.getElementById('skip'));
      return { textDecoration: s.textDecorationLine, background: s.backgroundColor };
    });
    expect(style.textDecoration).toBe('none');
    expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
    await page.emulateMedia({ media: 'print' });
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('skip')).display)).toBe('none');
  });
});

test.describe('skip link: the docs', () => {
  test('core has a Skip link component page with the Code and Design tabs', async ({ page }, testInfo) => {
    // Needs apps/docs/pages/components/skip-link.html (§1.9)
    expect(routes()).toContain('/docs/components/skip-link/');
    await page.goto('/docs/components/skip-link/');
    await expect(page.locator('h1.docs-title')).toHaveText(/skip link/i);
    if (testInfo.project.name === 'chromium-nojs') {
      // No tablist without JavaScript, by design: both panels show, stacked, and the two links reach them
      await expect(page.locator('nav.docs-view-tabs a[href="#code-panel"]')).toHaveText('Code');
      await expect(page.locator('nav.docs-view-tabs a[href="#design-panel"]')).toHaveText('Design');
    } else {
      await expect(page.getByRole('tablist', { name: /documentation$/ }).getByRole('tab')).toHaveText(['Code', 'Design']);
    }
  });

  test('the docs page has the skip link first, and it moves focus to the main area', async ({ page }) => {
    expect(routes()).toContain('/docs/components/skip-link/');
    await page.goto('/docs/components/skip-link/');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Tab');
    // The page's own link: the Design tab's examples are spans, never links
    const skip = page.locator('a.luz-skip-link[href="#main-content"]');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    // The next Tab starts inside main, not back at the top of the page
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#main-content'))).toBe(true);
  });

  test('the layouts and the home page use the core class, and none of them the site one', () => {
    for (const file of ['apps/docs/_layouts/page.html', 'apps/docs/_layouts/not-found.html', 'apps/landing/index.html']) {
      const path = fromRepo(file);
      expect(existsSync(path), file).toBe(true);
      const text = readFileSync(path, 'utf-8');
      expect(text, file).toContain('class="luz-skip-link"');
      expect(text, file).not.toContain('luz-site-skip-link');
    }
  });
});
