// @ts-check
/**
 * The CSS-only tags of @luz-ds/site in a browser: <luz-lang-switch>,
 * <luz-submenu>, <luz-banner> (.claude/plans/specs/f3-package-model.md
 * section 2.2, step 8). No LUZ script ever defines them: after site.min.js
 * has run and both chunks have loaded, `customElements.get()` still answers
 * undefined and the tags are `:not(:defined)`. On
 * tests/fixtures/css-only-tags.html, which also holds a <luz-search> and a
 * <luz-consent> so that both chunks load. The sources: tests/css-only-tags.test.js.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/css-only-tags.html';
const TAGS = ['luz-lang-switch', 'luz-submenu', 'luz-banner'];

test.describe('the CSS-only tags are never defined', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('after both chunks load, the two elements are defined and the three tags are not', async ({ page }) => {
    await page.goto(FIXTURE);
    // Both chunks (search on idle, then consent): wait for them, so the answer below is after the loader ran
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-search') && !!customElements.get('luz-consent')), { timeout: 10_000 }).toBe(true);
    const state = await page.evaluate((tags) => Object.fromEntries(tags.map((tag) => [tag, {
      definition: customElements.get(tag),
      defined: document.querySelector(tag).matches(':defined'),
    }])), TAGS);
    expect(state).toEqual({
      'luz-lang-switch': { definition: undefined, defined: false },
      'luz-submenu': { definition: undefined, defined: false },
      'luz-banner': { definition: undefined, defined: false },
    });
  });

  test('importing the two chunks by hand does not define them either', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(async () => {
      await import('/packages/site/dist/search.min.js');
      await import('/packages/site/dist/consent.min.js');
    });
    expect(await page.evaluate((tags) => tags.map((tag) => !!customElements.get(tag)), TAGS)).toEqual([false, false, false]);
  });
});

test.describe('what the tags give, with or without JavaScript', () => {
  test('<luz-banner> is a block, <luz-submenu> is display: contents', async ({ page }) => {
    await page.goto(FIXTURE);
    const display = await page.evaluate(() => ({
      banner: getComputedStyle(document.querySelector('luz-banner')).display,
      submenu: getComputedStyle(document.querySelector('luz-submenu')).display,
    }));
    expect(display).toEqual({ banner: 'block', submenu: 'contents' });
  });

  test('--luz-lang-switch-top defaults to --luz-bar-h: the list opens under a one-row bar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    await page.getByRole('button', { name: 'Language: English' }).click();
    const [top, bar] = await page.evaluate(() => {
      const probe = Object.assign(document.createElement('div'), { style: 'position:absolute;visibility:hidden;block-size:var(--luz-bar-h)' });
      document.body.append(probe);
      const h = probe.getBoundingClientRect().height;
      probe.remove();
      return [document.getElementById('lang-menu').getBoundingClientRect().top, h];
    });
    expect(bar).toBeGreaterThan(0);
    expect(Math.abs(top - bar)).toBeLessThanOrEqual(1);
  });

  test('--luz-lang-switch-top set on the tag moves the list; the old property does nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    await page.evaluate(() => {
      const host = document.getElementById('lang');
      host.style.setProperty('--luz-lang-switch-top', '90px');
      host.style.setProperty('--luz-site-lang-switcher-top', '400px');
    });
    await page.getByRole('button', { name: 'Language: English' }).click();
    expect(await page.locator('#lang-menu').evaluate((el) => el.getBoundingClientRect().top)).toBe(90);
  });
});
