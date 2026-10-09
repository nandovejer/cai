/**
 * CAI — the old pages /platform/ and /html/ moved into the documentation
 * page. Their URLs stay: each is a stub that sends the visitor to the new
 * place, with a meta refresh (no JavaScript needed) and a visible link, and,
 * with JavaScript, keeps the section an old #fragment asked for.
 * Run with: pnpm test:ui
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const STUBS = [
  { url: '/platform/', file: 'apps/platform-docs/index.html', target: 'platform' },
  { url: '/html/', file: 'apps/html-elements/index.html', target: 'html-elements' },
];

const fromRepo = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

for (const { url, file, target } of STUBS) {
  test.describe(url, () => {
    test('the stub refreshes to the docs and links there in words', () => {
      const html = fromRepo(file);
      expect(html).toContain(`<meta http-equiv="refresh" content="0; url=../docs/#${target}">`);
      expect(html).toMatch(new RegExp(`<a href="../docs/#${target}" data-moved-to>Go to [^<]+ in the documentation</a>`));
      expect(html).toContain('<h1');
      expect(html).toContain('lang="en"');
    });

    test('leads to the documentation page', async ({ page }) => {
      await page.goto(url);
      await expect(page).toHaveURL(new RegExp(`/docs/#${target}$`));
      await expect(page.locator(`#${target}`)).toBeVisible();
    });
  });
}

test.describe('old fragments', () => {
  const cases = [
    ['/platform/#guidance', 'p-shell'],
    ['/platform/#p-image', 'p-image'],
    ['/platform/#h-p-command-keyboard', 'h-p-command-keyboard'],
    ['/platform/#reference', 'p-reference'],
    ['/platform/#prim-buttons', 'c-button'],
    ['/platform/#no-such-section', 'platform'],
    ['/html/#el-dialog', 'el-dialog'],
    ['/html/#cat-forms', 'cat-forms'],
    ['/html/#index', 'html-index'],
  ];
  for (const [from, to] of cases) {
    test(`${from} lands on #${to}`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(new RegExp(`/docs/#${to}$`));
      await expect(page.locator(`[id="${to}"]`)).toHaveCount(1);
    });
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const { url, target } of STUBS) {
    test(`${url} still leads to the documentation page`, async ({ page }) => {
      await page.goto(url);
      await expect(page).toHaveURL(new RegExp(`/docs/#${target}$`));
      await expect(page.locator('h1').first()).toHaveText('CAI documentation');
    });
  }
});
