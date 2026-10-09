/**
 * CAI Platform — .cai-platform-image
 * The frame shows an abstract placeholder as a CSS background when it has no
 * image, by day or by night, with no JavaScript (red line 2). A failed
 * image's alt text keeps 4.5:1 on a flat backdrop (red line 7). The files
 * ship with the package and are served from the same origin (red line 12).
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import { routeOf } from './helpers/docs-site.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JPEG_LONG_SIDES, LONG_SIDES, RATIOS, VARIANTS, sizeOf } from '../scripts/build-placeholders.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const FIXTURE = '/tests/fixtures/level-3-platform.html';
const MODIFIERS = Object.keys(RATIOS);

/** Every url() in a computed background-image, in order. */
const urlsOf = (value) => [...value.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1]);

/** WCAG contrast ratio of two computed rgb() colours. */
const contrast = (a, b) => {
  const lum = (c) => {
    const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** One frame per ratio, plus one whose image is missing. */
async function mountFrames(page, { theme, mode, vejer } = {}) {
  await page.goto(FIXTURE);
  if (vejer) {
    await page.addStyleTag({ url: '/packages/core/dist/themes/cai-theme-vejer.css' });
  }
  await page.evaluate(([t, m]) => {
    if (t) document.documentElement.dataset.theme = t;
    if (m) document.documentElement.dataset.mode = m;
  }, [theme, mode]);
  await page.evaluate((modifiers) => {
    const probe = document.querySelector('#probe');
    probe.innerHTML = modifiers
      .map((m) => `<div class="cai-platform-image cai-platform-image--${m}" data-ratio="${m}"></div>`)
      .join('');
    probe.insertAdjacentHTML(
      'beforeend',
      '<div class="cai-platform-image" id="broken"><picture><img src="/tests/fixtures/no-such-image.jpg" width="640" height="360" alt="A photo that does not exist"></picture></div>',
    );
  }, MODIFIERS);
}

test.describe('Platform image', () => {
  test('every placeholder the build promises is in dist', () => {
    const files = [];
    for (const prefix of Object.values(VARIANTS)) {
      files.push(`${prefix}.svg`);
      for (const [name, ratio] of Object.entries(RATIOS)) {
        for (const long of LONG_SIDES) {
          const [width] = sizeOf(ratio, long);
          files.push(`${prefix}-${name}-${width}.avif`, `${prefix}-${name}-${width}.webp`);
          if (JPEG_LONG_SIDES.includes(long)) files.push(`${prefix}-${name}-${width}.jpg`);
        }
      }
    }
    for (const file of files) {
      expect(existsSync(fromRepo(`packages/platform/dist/placeholders/${file}`)), file).toBe(true);
    }
  });

  test('every placeholder background resolves to an image, AVIF first', async ({ page, request }) => {
    await mountFrames(page);
    const backgrounds = await page
      .locator('[data-ratio]')
      .evaluateAll((frames) => frames.map((el) => [el.dataset.ratio, getComputedStyle(el).backgroundImage]));

    for (const [ratio, value] of backgrounds) {
      const urls = urlsOf(value);
      expect(urls.length, ratio).toBe(3);
      expect(urls[0], ratio).toMatch(new RegExp(`placeholder-${ratio}-\\d+\\.avif$`));
      expect(urls[1], ratio).toMatch(/\.webp$/);
      expect(urls[2], ratio).toMatch(/\.jpg$/);
      for (const url of urls) {
        const response = await request.get(url);
        expect(response.status(), url).toBe(200);
        expect(response.headers()['content-type'], url).toMatch(/^image\//);
      }
    }
  });

  test('a frame with no image shows the placeholder at its ratio', async ({ page }) => {
    await mountFrames(page);
    for (const [name, [w, h]] of Object.entries(RATIOS)) {
      const frame = page.locator(`[data-ratio="${name}"]`);
      const box = await frame.boundingBox();
      expect(box.height, name).toBeGreaterThan(0);
      expect(box.width / box.height, name).toBeCloseTo(w / h, 1);
      // Decorative: nothing in the frame is announced
      await expect(frame, name).toHaveAccessibleName('');
      await expect(frame.getByRole('img'), name).toHaveCount(0);
    }
  });

  const MODES = [
    { label: 'light', theme: 'light' },
    { label: 'dark', theme: 'dark' },
    { label: 'high contrast', theme: 'high-contrast' },
    { label: 'vejer light', theme: 'vejer', mode: 'light', vejer: true },
    { label: 'vejer dark', theme: 'vejer', mode: 'dark', vejer: true },
    { label: 'vejer high contrast', theme: 'vejer', mode: 'high-contrast', vejer: true },
  ];
  for (const { label, ...scope } of MODES) {
    test(`a failed image keeps its alt text at 4.5:1 in ${label} (RL-7)`, async ({ page }) => {
      await mountFrames(page, scope);
      const img = page.locator('#broken img');
      await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth === 0)).toBe(true);
      // The alt text is drawn in the img box, on its own opaque background
      const [color, background] = await img.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.color, s.backgroundColor];
      });
      expect(background, 'opaque backdrop').toMatch(/^rgb\(/);
      expect(contrast(color, background), `${color} on ${background}`).toBeGreaterThanOrEqual(4.5);
      // The img fills the frame, so no part of the placeholder shows behind the text
      const [frame, box] = await Promise.all([page.locator('#broken').boundingBox(), img.boundingBox()]);
      expect(box.width).toBeCloseTo(frame.width, 0);
      expect(box.height).toBeCloseTo(frame.height, 0);
    });
  }

  const DARK = [
    { label: 'data-theme="dark"', theme: 'dark' },
    { label: 'a custom theme in data-mode="dark"', theme: 'vejer', mode: 'dark', vejer: true },
  ];
  for (const { label, ...scope } of DARK) {
    test(`dark mode shows the night placeholder: ${label}`, async ({ page }) => {
      await mountFrames(page, scope);
      for (const name of MODIFIERS) {
        const value = await page.locator(`[data-ratio="${name}"]`).evaluate((el) => getComputedStyle(el).backgroundImage);
        expect(urlsOf(value)[0], name).toMatch(new RegExp(`placeholder-night-${name}-\\d+\\.avif$`));
      }
    });
  }

  test('dark mode shows the night placeholder: the switcher radio, without JavaScript', async ({ page }) => {
    await mountFrames(page);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<input type="radio" name="cai-theme" value="dark" aria-label="Dark" checked>');
    });
    const value = await page.locator('[data-ratio="1x1"]').evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(urlsOf(value)[0]).toMatch(/placeholder-night-1x1-1920\.avif$/);
  });

  test('light and high contrast keep the day placeholder', async ({ page }) => {
    for (const theme of ['light', 'high-contrast']) {
      await mountFrames(page, { theme });
      const value = await page.locator('[data-ratio="16x9"]').evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(urlsOf(value)[0], theme).toMatch(/\/placeholder-16x9-1920\.avif$/);
    }
  });

  test('in forced-colors mode an empty frame keeps a visible edge', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFrames(page);
    const style = await page.locator('[data-ratio="16x9"]').evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(style).toBe('solid');
  });

  test('the docs demos use a picture with AVIF and WebP sources and a sized img', async ({ page }) => {
    await page.goto(routeOf('demo-image')); // the image pattern's page
    const pictures = page.locator('.cai-platform-image picture');
    expect(await pictures.count()).toBeGreaterThan(0);
    for (const picture of await pictures.all()) {
      await expect(picture.locator('source[type="image/avif"][srcset]')).toHaveCount(1);
      await expect(picture.locator('source[type="image/webp"][srcset]')).toHaveCount(1);
      // AVIF is offered first
      expect(await picture.evaluate((p) => p.querySelector('source').type)).toBe('image/avif');
      const img = picture.locator('img');
      for (const attr of ['src', 'srcset', 'sizes', 'width', 'height', 'alt']) {
        await expect(img, attr).toHaveAttribute(attr);
      }
      await expect(img).toHaveAttribute('decoding', 'async');
    }
    // The demo with an image and the one without
    await expect(page.locator('#demo-image-empty')).toBeVisible();
    const real = page.locator('#demo-image img');
    await real.scrollIntoViewIfNeeded();
    await expect.poll(() => real.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  });

  test('nothing is requested outside this host', async ({ page }) => {
    const external = [];
    const images = [];
    await page.route('**/*', (route) => {
      const { protocol, hostname, href } = new URL(route.request().url());
      if (route.request().resourceType() === 'image') images.push(href);
      if (['data:', 'blob:'].includes(protocol) || ['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
        return route.continue();
      }
      external.push(href);
      return route.abort();
    });
    await page.goto(routeOf('demo-image')); // the image pattern's page
    await page.locator('#demo-image').scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
    // The placeholder and the demo image did load, from here
    expect(images.some((url) => /placeholders\/placeholder-16x9-1920\.(avif|webp|jpg)$/.test(url))).toBe(true);
    expect(images.some((url) => /assets\/desert-\d+\.(avif|webp|jpg)$/.test(url))).toBe(true);
  });
});
