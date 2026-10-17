// @ts-check
/**
 * Every "v<version>" the header and the footers show is the version of
 * packages/core/package.json (the same one the home footer writes with
 * `{{version}}`): the header's tag on the home page, in its three languages,
 * and on the docs, and the docs footer. F7 decision of the accessibility
 * review; the sources are checked in tests/site-version.test.js.
 * Without JavaScript the text is the same, so this runs in `chromium`.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const { version } = JSON.parse(readFileSync(new URL('../packages/core/package.json', import.meta.url), 'utf-8'));
const PAGES = ['/', '/es/', '/ar/', '/docs/', '/docs/components/button/'];

for (const path of PAGES) {
  test(`${path}: every "v<digits>" in the header and in the footer is v${version}`, async ({ page }) => {
    await page.goto(path);
    const found = await page.evaluate(() => {
      const read = (selector) => [...document.querySelectorAll(selector)].flatMap((el) => (el.textContent ?? '').match(/v\d+(?:\.\d+)+/g) ?? []);
      return { header: read('header.site-header'), footer: read('footer') };
    });
    expect(found.header.length, 'the header shows a version').toBeGreaterThan(0);
    expect(found.footer.length, 'the footer shows a version').toBeGreaterThan(0);
    for (const shown of [...found.header, ...found.footer]) expect(shown).toBe(`v${version}`);
  });
}
