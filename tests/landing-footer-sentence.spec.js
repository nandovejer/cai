// @ts-check
/**
 * The sentence in the home footer ("The light is computed from your clock,
 * never from your location. Your choice stays in this browser.", the catalog
 * key footer.privacy) is about the light and the choice of the colour mode,
 * which exist only with JavaScript. Without it the sentence is false, so it is
 * not shown: the element carries `data-needs-js hidden`, as the line about
 * tapping a light does (landing.js removes `hidden` from every
 * `[data-needs-js]`). With JavaScript it is shown. Same in the three languages.
 * F7 decision of the accessibility review with JavaScript off.
 *
 * The no-JS describe sets `javaScriptEnabled: false` itself, so it runs in the
 * `chromium` project; the other one skips itself where JavaScript is off.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const catalog = (lang) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${lang}.json`, import.meta.url), 'utf-8'));
const ROUTES = [
  ['/', 'en'],
  ['/es/', 'es'],
  ['/ar/', 'ar'],
];

/** The element of the footer whose text is the sentence. */
const sentence = (page, lang) => page.locator('footer').getByText(catalog(lang)['footer.privacy'], { exact: true });

test.describe('the footer sentence about the light, without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [route, lang] of ROUTES) {
    test(`${route}: the sentence is in the markup, marked data-needs-js and hidden, and not shown (${lang})`, async ({ page }) => {
      await page.goto(route);
      const element = sentence(page, lang);
      await expect(element).toHaveCount(1);
      const marked = await element.evaluate((el) => {
        const owner = el.closest('[data-needs-js]');
        return { owner: !!owner, hidden: !!owner?.hasAttribute('hidden'), inFooter: !!owner?.closest('footer') };
      });
      expect(marked, 'it or an ancestor in the footer has data-needs-js and hidden').toEqual({ owner: true, hidden: true, inFooter: true });
      await expect(element).toBeHidden();
    });
  }
});

test.describe('the footer sentence about the light, with JavaScript', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.use.javaScriptEnabled === false, 'needs JavaScript');
  });

  for (const [route, lang] of ROUTES) {
    test(`${route}: the sentence is shown (${lang})`, async ({ page }) => {
      await page.goto(route);
      const element = sentence(page, lang);
      await expect(element).toHaveCount(1);
      await expect(element).toBeVisible();
    });
  }
});
