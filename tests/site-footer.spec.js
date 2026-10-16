// @ts-check
/**
 * The footer of the home page and of the docs (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4): the color mode
 * switcher is <luz-mode remember by="clock"> around core's fieldset, with an
 * Auto radio first, an icon in every label (core's cycle button copies the
 * checked label's icon; core has no Auto icon for data-mode-icon), and the
 * choice stored under core's "luz-theme" key. The site has no key of its own:
 * "luz-site-mode" is never written.
 *
 * The footer is one partial (apps/site/_partials/footer.html) on the docs and
 * written again in apps/landing/index.html, in three languages.
 */
import { test, expect } from '@playwright/test';
import { KEY, NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const PAGES = ['/', '/es/', '/ar/', '/docs/', '/docs/components/button/'];
const VALUES = ['auto', 'light', 'dark', 'high-contrast'];

/** Record every key the page writes to localStorage, from the first script on. */
const recordWrites = (page) =>
  page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__writes = [];
    const set = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function (key, value) {
      w.__writes.push(key);
      return set.call(this, key, value);
    };
  });
const writes = (page) => page.evaluate(() => /** @type {any} */ (window).__writes);

test.describe('the markup of the footer, as served', () => {
  for (const path of PAGES) {
    test(`${path}: <luz-mode remember by="clock"> wraps the fieldset, four radios, Auto first and checked`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      // The footer that holds the switcher, not the first <footer> of the page (a demo may have one)
      const footer = [...html.matchAll(/<footer\b[\s\S]*?<\/footer>/g)].map((m) => m[0]).find((f) => f.includes('<luz-mode')) ?? '';
      expect(footer, 'a <footer> with <luz-mode> in it').not.toBe('');
      expect(footer).toMatch(/<luz-mode\b[^>]*\bremember\b[^>]*>/);
      expect(footer).toMatch(/<luz-mode\b[^>]*\bby="clock"[^>]*>/);
      const group = footer.slice(footer.indexOf('<luz-mode'), footer.indexOf('</luz-mode>'));
      expect(group, 'the fieldset is inside the element').toContain('<fieldset');
      const radios = [...group.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
      expect(radios.map((r) => r.match(/value="([^"]+)"/)?.[1])).toEqual(VALUES);
      // The attribute, not aria-checked or data-checked
      const checked = (r) => /\schecked(?=[\s>=/])/.test(r);
      expect(radios.filter(checked)).toHaveLength(1);
      expect(checked(radios[0])).toBe(true);
      // The cycle button is in the markup and brings no icons of its own
      const button = group.match(/<button\b[^>]*luz-mode-cycle[\s\S]*?<\/button>/)?.[0] ?? '';
      expect(button, 'the cycle button').not.toBe('');
      expect(button).not.toContain('data-mode-icon');
    });
  }
});

test.describe('the footer in the page', () => {
  for (const path of PAGES) {
    test(`${path}: four radios in <luz-mode>, an icon in every label, no icons of its own in the cycle button`, async ({ page }) => {
      await atTime(page, '14:00');
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);

      const mode = page.locator('footer luz-mode[remember][by="clock"]');
      await expect(mode).toHaveCount(1);
      await expect(mode.locator('fieldset.luz-mode-switcher')).toHaveCount(1);
      const radios = mode.locator('input[name="luz-theme"]');
      await expect(radios).toHaveCount(4);
      expect(await radios.evaluateAll((all) => all.map((r) => /** @type {HTMLInputElement} */ (r).value))).toEqual(VALUES);
      await expect(radios.first()).toBeChecked();
      // Exactly one group drives the tokens of the page
      await expect(page.locator('input[name="luz-theme"]')).toHaveCount(4);

      const labels = mode.locator('label.luz-mode-btn');
      await expect(labels).toHaveCount(4);
      for (const label of await labels.all()) {
        await expect(label.locator('.luz-mode-btn__icon'), await label.innerText()).toHaveCount(1);
        expect((await label.innerText()).trim().length, 'the label has a text').toBeGreaterThan(0);
      }

      const button = mode.locator('.luz-mode-cycle');
      await expect(button).toHaveCount(1);
      await expect(button.locator('[data-mode-icon]')).toHaveCount(0);
      // It shows the icon of the checked label, a copy of it
      await expect(button.locator('.luz-mode-btn__icon')).toHaveCount(1);
      const same = await page.evaluate(() => {
        const icon = document.querySelector('footer luz-mode input:checked')?.closest('label')?.querySelector('.luz-mode-btn__icon');
        return icon?.outerHTML === document.querySelector('footer luz-mode .luz-mode-cycle .luz-mode-btn__icon')?.outerHTML;
      });
      expect(same).toBe(true);
    });
  }

  test('the English label of the first radio is Auto', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer luz-mode label.luz-mode-btn').first()).toHaveText('Auto');
    await page.goto('/docs/');
    await expect(page.locator('footer luz-mode label.luz-mode-btn').first()).toHaveText('Auto');
  });

  test('the home page says Auto in its own language, from the catalog (the key is checked in tests/site-footer.test.js)', async ({ page }) => {
    await page.goto('/es/');
    await expect(page.locator('footer luz-mode label.luz-mode-btn')).toHaveCount(4);
    const es = (await page.locator('footer luz-mode label.luz-mode-btn').first().innerText()).trim();
    expect(es.length).toBeGreaterThan(0);
    expect(es).not.toBe('Light');
    await page.goto('/ar/');
    await expect(page.locator('footer luz-mode label.luz-mode-btn')).toHaveCount(4);
    const ar = (await page.locator('footer luz-mode label.luz-mode-btn').first().innerText()).trim();
    expect(ar, '/ar/ is not left in English').not.toBe('Auto');
    expect(ar).toMatch(/[\u0600-\u06FF]/);
  });
});

test.describe('the choice', () => {
  for (const path of ['/', '/docs/']) {
    test(`${path}: the cycle goes Auto, Light, Dark, High contrast and back to Auto`, async ({ page }) => {
      await atTime(page, '14:00');
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
      const button = page.locator('footer .luz-mode-cycle');
      await expect(button).toHaveAccessibleName('Change color mode. Current: Auto');
      for (const [value, label] of [['light', 'Light'], ['dark', 'Dark'], ['high-contrast', 'High contrast'], ['auto', 'Auto']]) {
        await button.click();
        await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue(value);
        await expect(button).toHaveAccessibleName(`Change color mode. Current: ${label}`);
      }
    });

    test(`${path}: choosing Dark stores luz-theme, and Auto removes it; luz-site-mode is never written`, async ({ page }) => {
      await atTime(page, '14:00');
      await recordWrites(page);
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
      const button = page.locator('footer .luz-mode-cycle');

      expect(await page.evaluate((k) => localStorage.getItem(k), KEY), 'nothing is stored before a choice').toBeNull();
      await button.click(); // Light
      await button.click(); // Dark
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      expect(await page.evaluate(() => document.documentElement.dataset.light)).toBe('night');
      expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('dark');

      // The choice follows the visitor
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue('dark');

      await button.click(); // High contrast
      await button.click(); // Auto
      await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue('auto');
      expect(await page.evaluate((k) => localStorage.getItem(k), KEY), 'Auto is the absence of the key').toBeNull();
      expect(await page.evaluate(() => document.documentElement.dataset.theme), 'Auto at 14:00').toBe('light');

      expect(await page.evaluate(() => localStorage.getItem('luz-site-mode'))).toBeNull();
      expect(await writes(page)).not.toContain('luz-site-mode');
    });

    test(`${path}: a choice made with the keyboard on the cycle button`, async ({ page }) => {
      await atTime(page, '14:00');
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
      await page.locator('footer .luz-mode-cycle').focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('dark');
    });
  }
});
