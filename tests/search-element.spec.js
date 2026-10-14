// @ts-check
/**
 * <luz-site-search> (packages/site/src/search.js): a light-DOM custom
 * element that wraps the search dialog and wires it, and the triggers of the
 * page, when it connects. The behaviour of the dialog itself is in
 * tests/search.spec.js, on the docs site; this file is the element.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/search-element.html';

test.describe('<luz-site-search>', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await page.waitForFunction(() => customElements.get('luz-site-search'));
  });

  test('is defined once, as a plain HTMLElement, with no Shadow DOM', async ({ page }) => {
    const info = await page.evaluate(async () => {
      const before = customElements.get('luz-site-search');
      // Importing the module again does not define it twice (and does not throw)
      await import('/packages/site/dist/search.js?again');
      window.addSearch();
      const el = document.querySelector('luz-site-search');
      return { same: before === customElements.get('luz-site-search'), shadow: !!el.shadowRoot, isHtml: el instanceof HTMLElement };
    });
    expect(info).toEqual({ same: true, shadow: false, isHtml: true });
  });

  test('with no element on the page the trigger stays hidden and the fallback shows', async ({ page }) => {
    await expect(page.locator('#trigger')).toBeHidden();
    await expect(page.locator('#fallback')).toBeVisible();
  });

  test('an element added later wires itself: the button shows, the fallback goes, it opens', async ({ page }) => {
    await page.evaluate(() => window.addSearch());
    await expect(page.locator('#trigger')).toBeVisible();
    await expect(page.locator('#fallback')).toBeHidden();
    await page.locator('#trigger').click();
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Query' }).fill('butt');
    await expect(page.locator('[data-luz-search-list="pages"] a')).toHaveText(['Button']);
  });

  test('Ctrl+K opens it, and a second connection of the same dialog adds no second handler', async ({ page }) => {
    await page.evaluate(() => {
      window.addSearch();
      // Moving the element disconnects and connects it again
      const el = document.querySelector('luz-site-search');
      document.body.append(el);
    });
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
    // One request for the index, not two
    const count = await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.name.includes('search-index.json')).length);
    expect(count).toBe(1);
  });

  test('an element with no dialog inside does nothing and throws nothing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.evaluate(() => document.body.append(document.createElement('luz-site-search')));
    expect(errors).toEqual([]);
    await expect(page.locator('#trigger')).toBeHidden();
  });
});
