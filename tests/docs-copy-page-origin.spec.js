// @ts-check
/**
 * F8 security audit, hardening I1: "Copy page as Markdown" fetches only a
 * same-origin URL.
 *
 * apps/docs/reference.js turns the rail's link (`a[data-docs-copy-page]`, an
 * href to the page's own index.md) into a button that fetches that URL when
 * the pointer or the focus reaches it, and copies the text. The href is
 * markup; if it ever points to another origin (a mistake in a layout, a page
 * that writes its own rail), the page would send the visitor's request to a
 * third party and copy what comes back to the clipboard. So the script reads
 * the URL, and when its origin is not the page's it does not fetch: no request
 * leaves, and the rail's status says "Could not copy the page.".
 *
 * The href is rewritten in the HTML the page receives, before the script
 * runs (it reads the href once, at start). The same-origin case is the control.
 *
 * Files under test:
 *   apps/docs/reference.js
 *
 * Needs JavaScript: it is skipped in chromium-nojs.
 */
import { test, expect } from '@playwright/test';

const BUTTON = '/docs/components/button/';
const OTHER = 'https://other-origin.example';
const rail = (page) => page.getByRole('complementary', { name: 'About this page' });

test.describe('Copy page as Markdown: the origin of the file', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.use.javaScriptEnabled === false, 'needs JavaScript');
  });

  /**
   * Open the button page with the Copy link pointing at `href`; record every
   * request to another origin (answered with a text and CORS open, so a fetch
   * that is made would succeed) and every text given to the clipboard.
   * @param {import('@playwright/test').Page} page
   * @param {string} href
   */
  async function openWithCopyHref(page, href) {
    const foreign = /** @type {string[]} */ ([]);
    await page.addInitScript(() => {
      /** @type {any} */ (window).__written = [];
      const clipboard = navigator.clipboard;
      if (clipboard) clipboard.writeText = (text) => (/** @type {any} */ (window).__written.push(text), Promise.resolve());
    });
    await page.route(/^https?:\/\/other-origin\.example\//, (route) => {
      foreign.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'text/markdown', headers: { 'access-control-allow-origin': '*' }, body: '# From another origin\n' });
    });
    await page.route(`**${BUTTON}`, async (route) => {
      if (route.request().resourceType() !== 'document') return route.fallback();
      const response = await route.fetch();
      const html = (await response.text()).replace(/<a\b[^>]*\bdata-docs-copy-page\b[^>]*>/, (tag) => tag.replace(/href="[^"]*"/, `href="${href}"`));
      return route.fulfill({ response, body: html });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BUTTON);
    await page.waitForLoadState('networkidle');
    return foreign;
  }

  for (const [name, href] of [
    ['an absolute URL of another origin', `${OTHER}${BUTTON}index.md`],
    ['a protocol-relative URL of another origin', `//other-origin.example${BUTTON}index.md`],
  ]) {
    test(`${name}: nothing is fetched and the rail says it could not copy`, async ({ page }) => {
      const foreign = await openWithCopyHref(page, href);
      const button = rail(page).getByRole('button', { name: 'Copy page as Markdown', exact: true });
      await expect(button, 'the script still makes the button').toBeVisible();
      await button.hover();
      await button.focus();
      await button.click();
      await expect(rail(page).getByRole('status')).toHaveText('Could not copy the page.');
      expect(foreign, 'no request went to the other origin').toEqual([]);
      expect(await page.evaluate(() => /** @type {any} */ (window).__written), 'nothing was written to the clipboard').toEqual([]);
      await expect(page, 'the page did not navigate to the file').toHaveURL(new RegExp(`${BUTTON}$`));
    });
  }

  test('control: the page\'s own index.md is fetched, copied and announced', async ({ page }) => {
    const foreign = await openWithCopyHref(page, `${BUTTON}index.md`);
    const button = rail(page).getByRole('button', { name: 'Copy page as Markdown', exact: true });
    await button.click();
    await expect(rail(page).getByRole('status')).toHaveText('Copied the page as Markdown.');
    const written = await page.evaluate(() => /** @type {any} */ (window).__written);
    expect(written).toHaveLength(1);
    expect(written[0].startsWith('# Button\n')).toBe(true);
    expect(foreign).toEqual([]);
  });
});
