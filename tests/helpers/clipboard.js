/**
 * What the page last copied. Chromium lets the test read the real clipboard
 * (it grants clipboard-read); Firefox and WebKit do not know that permission,
 * so there a spy on `navigator.clipboard.writeText` records the text the page
 * handed to it, and the real write still happens. Call `recordCopies` before
 * `page.goto`; the same `copiedText` then works in every browser.
 */

/** @param {import('@playwright/test').Page} page */
const isChromium = (page) => page.context().browser()?.browserType().name() === 'chromium';

/** @param {import('@playwright/test').Page} page */
export async function recordCopies(page) {
  if (isChromium(page)) return;
  await page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__copied = null;
    const clip = navigator.clipboard;
    if (!clip?.writeText) return;
    const write = clip.writeText.bind(clip);
    clip.writeText = (text) => {
      w.__copied = text;
      return write(text).catch(() => undefined);
    };
  });
}

/** @param {import('@playwright/test').Page} page */
export async function copiedText(page) {
  if (isChromium(page)) return page.evaluate(() => navigator.clipboard.readText());
  return page.evaluate(() => /** @type {any} */ (window).__copied);
}
