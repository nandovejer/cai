// @ts-check
/**
 * The notice of @cai-ds/site (.cai-site-notice): a band above the site
 * header with one announcement and an optional link. No script and no
 * close button. On tests/fixtures/site-top.html. Runs in `chromium` and
 * `chromium-nojs`: it is the same in both.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/tests/fixtures/site-top.html';

async function open(page, width, dir = 'ltr') {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(FIXTURE);
  if (dir === 'rtl') await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
}

const style = (page, css) => page.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

const box = (page, selector) => page.evaluate((s) => {
  const r = document.querySelector(s).getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width };
}, selector);

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('site notice', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    for (const variant of ['', 'cai-site-notice--warning']) {
      test(`axe finds nothing serious in ${theme}${variant ? ', warning' : ''}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
        await open(page, 1280);
        await page.evaluate(([t, v]) => {
          document.documentElement.dataset.theme = t;
          if (v) document.getElementById('notice').classList.add(v);
        }, [theme, variant]);
        const { violations } = await new AxeBuilder({ page }).include('#notice').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
      });
    }
  }

  test('a region named by its visible label, above the header, the width of the window', async ({ page }) => {
    await open(page, 1280);
    await expect(page.getByRole('region', { name: 'Open day.' })).toHaveCount(1);
    const notice = await box(page, '#notice');
    expect(notice.left).toBe(0);
    expect(notice.width).toBe(1280);
    expect(notice.bottom).toBeLessThanOrEqual((await box(page, '#hdr')).top + 1);
  });

  for (const [width, dir] of [[1440, 'ltr'], [1024, 'ltr'], [320, 'ltr'], [1440, 'rtl'], [320, 'rtl']]) {
    test(`${width} px ${dir}: the text starts where the header's row starts`, async ({ page }) => {
      await open(page, width, dir);
      const text = await box(page, '#notice p');
      // The first thing of the header's row: the menu button up to 768 px, then the brand
      const brand = await box(page, width <= 768 ? '#toggle' : '#brand');
      if (dir === 'ltr') expect(Math.abs(text.left - brand.left)).toBeLessThanOrEqual(1);
      else expect(Math.abs(text.right - brand.right)).toBeLessThanOrEqual(1);
    });
  }

  test('its only control is its link, reached before the header', async ({ page }) => {
    await open(page, 1280);
    await page.evaluate(() => document.getElementById('consent').remove());
    await page.keyboard.press('Tab');
    await expect(page.locator('#skip')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#notice-link')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('#hdr'))).toBe(true);
    await expect(page.locator('#notice button')).toHaveCount(0);
  });

  test('warning: the band and its rule change, and the words say it as well (RL-6)', async ({ page }) => {
    await open(page, 1280);
    const plain = await page.locator('#notice').evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.evaluate(() => {
      const notice = document.getElementById('notice');
      notice.classList.add('cai-site-notice--warning');
      notice.querySelector('strong').textContent = 'Planned maintenance.';
    });
    const warning = await page.locator('#notice').evaluate((el) => {
      const probe = Object.assign(document.createElement('div'), { style: 'background: var(--cai-color-warning-bg)' });
      document.body.append(probe);
      const token = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { bg: getComputedStyle(el).backgroundColor, token };
    });
    expect(warning.bg).toBe(warning.token);
    expect(warning.bg).not.toBe(plain);
    await expect(page.getByRole('region', { name: 'Planned maintenance.' })).toHaveCount(1);
  });

  test('320 px and 200 % text: it wraps, nothing scrolls sideways', async ({ page }) => {
    for (const dir of ['ltr', 'rtl']) {
      await open(page, 320, dir);
      await style(page, 'html { font-size: 200% }');
      expect(await sideways(page), dir).toBeLessThanOrEqual(0);
      const notice = await box(page, '#notice p');
      expect(notice.right, dir).toBeLessThanOrEqual(320);
      expect(notice.left, dir).toBeGreaterThanOrEqual(0);
    }
  });
});
