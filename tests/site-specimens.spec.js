// @ts-check
/**
 * Specimens under the light of the site (F2 of
 * .claude/plans/luz-home-docs-identity.md, section 3.4): the site's light
 * changes the page, never what is being documented. A specimen of the docs
 * (`[data-docs-specimen]`, `.docs-dodont__stage`) is re-anchored to the
 * colour mode of <html> with a data-theme of its own, so under any of the six
 * lights its tokens are Vejer's for that mode. apps/docs/reference.js does it
 * (initSpecimenTheme) and follows `luz-mode:change`. Nothing is served with
 * data-theme on a specimen: without JavaScript the specimens inherit Vejer's
 * light and the no-JS radios still re-scope them (tests/nojs.spec.js).
 */
import { test, expect } from '@playwright/test';
import { gotoId } from './helpers/docs-site.js';
import { faded } from './helpers/settle.js';
import { LIGHTS, NO_CHOICE, TIMEZONE, atTime, channels, colorOf, lightToken, seedMode, vejer } from './helpers/site-lights.js';

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const PAGE = '/docs/components/button/';
const SPECIMENS = '[data-docs-specimen], .docs-dodont__stage';
const TOKENS = ['--luz-surface-page', '--luz-text-primary', '--luz-brand-fill'];

const ready = async (page) => {
  await page.goto(PAGE);
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
};

test.describe('a specimen keeps the colours of the mode, whatever the light', () => {
  for (const [light, time, mode] of LIGHTS) {
    test(`${light} (${time}): <html> is ${mode} and every specimen carries data-theme="${mode}" with Vejer's tokens`, async ({ page }) => {
      await atTime(page, time);
      await ready(page);
      expect(await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.light])).toEqual([mode, light]);

      const specimens = page.locator(SPECIMENS);
      expect(await specimens.count(), 'the page has specimens').toBeGreaterThan(1);
      const themes = await specimens.evaluateAll((all) => all.map((el) => el.getAttribute('data-theme')));
      expect(themes.filter((t) => t !== mode), 'specimens that do not follow <html>').toEqual([]);

      // Not the first and the last only: a specimen of each kind
      for (const selector of ['[data-docs-specimen]', '.docs-dodont__stage']) {
        const one = page.locator(selector).first();
        await expect(one).toHaveCount(1);
        for (const token of TOKENS) {
          expect(channels(await colorOf(one, token)), `${selector} ${token} in ${light}`).toEqual(vejer(mode, token));
        }
      }
    });
  }

  // Afternoon and night are Vejer itself, so the token comparison above says nothing there but the
  // data-theme attribute; the four lights that override tokens are where it means something
  for (const [light, time, mode] of LIGHTS.filter(([name]) => ['morning', 'sunset', 'dawn', 'dusk'].includes(name))) {
    test(`${light} (${time}): the page is the light of the block, the specimen is Vejer ${mode}: the site changes around the specimens`, async ({ page }) => {
      await atTime(page, time);
      await ready(page);
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
      const body = channels(await colorOf(page.locator('body'), '--luz-surface-page'));
      const specimen = channels(await colorOf(page.locator('[data-docs-specimen]').first(), '--luz-surface-page'));
      expect(body, `the ${light} page`).toEqual(lightToken(light, '--luz-surface-page'));
      expect(specimen).toEqual(vejer(mode, '--luz-surface-page'));
      expect(body, `the ${light} page is not Vejer ${mode}`).not.toEqual(specimen);
    });
  }
});

test.describe('a specimen follows the mode when the visitor changes it', () => {
  test('Dark, then High contrast, then Light: data-theme follows <html> and the tokens follow data-theme', async ({ page }) => {
    await atTime(page, '14:00');
    await ready(page);
    const button = page.locator('footer .luz-mode-cycle');
    const specimen = page.locator('[data-docs-specimen]').first();
    // Auto → Light → Dark → High contrast → Auto
    await button.click();
    for (const mode of ['light', 'dark', 'high-contrast']) {
      if (mode !== 'light') await button.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      const themes = await page.locator(SPECIMENS).evaluateAll((all) => all.map((el) => el.getAttribute('data-theme')));
      expect(themes.filter((t) => t !== mode), mode).toEqual([]);
      expect(channels(await colorOf(specimen, '--luz-surface-page')), mode).toEqual(vejer(mode, '--luz-surface-page'));
    }
  });

  test('a write to <html>\'s data-theme from anywhere (core\'s applyTheme, another script, a test) reaches the specimens', async ({ page }) => {
    // The visual, contrast and axe suites set the mode this way: they must not meet a stale specimen
    await atTime(page, '23:30');
    await ready(page);
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'dark');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
    });
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('.docs-dodont__stage').first()).toHaveAttribute('data-theme', 'light');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'high-contrast';
    });
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'high-contrast');
  });

  test('Auto at night puts the specimens in dark, and Light puts them back', async ({ page }) => {
    await atTime(page, '23:30');
    await ready(page);
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'dark');
    const button = page.locator('footer .luz-mode-cycle');
    await button.click(); // Light
    await expect(page.locator('[data-docs-specimen]').first()).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('.docs-dodont__stage').first()).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('the canvas of the HTML reference is painted with the tokens of the mode the page ends in', () => {
  const pixel = (page) => page.evaluate(() => [...document.getElementById('d-canvas').getContext('2d').getImageData(60, 60, 1, 1).data].join());

  /** The pixel of a fresh load of the page in Dark, with nothing fading. */
  async function darkPixel(page) {
    const other = await page.context().newPage();
    await seedMode(other, 'dark');
    await gotoId(other, 'd-canvas');
    await expect.poll(() => other.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
    const value = await pixel(other);
    await other.close();
    return value;
  }

  test('a choice repaints it, and after the fade it is the colour of a page loaded in that mode', async ({ page }) => {
    await seedMode(page, 'light');
    await gotoId(page, 'd-canvas');
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
    const dark = await darkPixel(page);
    const light = await pixel(page);
    expect(light).not.toBe('0,0,0,0');
    expect(light).not.toBe(dark);
    await page.locator('footer .luz-mode-cycle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await faded(page);
    // Not the colours of the first frame of the fade
    await expect.poll(() => pixel(page)).toBe(dark);
  });

  test('the clock repaints it when it moves the page from the afternoon to the night', async ({ page }) => {
    await atTime(page, '14:00');
    await gotoId(page, 'd-canvas');
    await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
    const dark = await darkPixel(page);
    const afternoon = await pixel(page);
    expect(afternoon).not.toBe(dark);
    await page.clock.fastForward('09:30:00');
    await expect(page.locator('html')).toHaveAttribute('data-light', 'night');
    await faded(page);
    await expect.poll(() => pixel(page)).toBe(dark);
  });
});
