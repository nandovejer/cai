// @ts-check
/**
 * `.luz-image` (core, components/image.css): a frame of fixed ratio around a
 * native <picture> (.claude/plans/specs/f3-package-model.md §1.4 and §9 step 4;
 * decision D2 and accessibility requirement O7). The cases are the ones of the
 * old `.luz-site-image` (tests/site-image.spec.js) minus the placeholders,
 * which are docs-only assets now: the frame is a flat `--luz-surface-strong`
 * surface, with no background image, so an image that fails to load shows its
 * alt text at 4.5:1 (red line 7). Nothing the page asks for leaves this host
 * (red line 12).
 * Page: tests/fixtures/image.html (tokens and core), then the docs page.
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contrast, formatRatio } from './helpers/design-tokens.js';
import { paintOf } from './helpers/pixels.js';
import { routes } from './helpers/docs-site.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const FIXTURE = '/tests/fixtures/image.html';

// The ratio of each modifier; the unmodified frame is 16:9
const RATIOS = { '16x9': [16, 9], '4x3': [4, 3], '3x2': [3, 2], '1x1': [1, 1], '21x9': [21, 9], '9x16': [9, 16] };

/** WCAG contrast ratio of two computed rgb() colours. */
const runtimeContrast = (a, b) => {
  const lum = (c) => {
    const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map((v) => {
      const s = Number(v) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test.describe('image: the frame', () => {
  test('every ratio is the width over the height of its modifier, with no image inside', async ({ page }) => {
    await page.goto(FIXTURE);
    for (const [name, [w, h]] of Object.entries(RATIOS)) {
      const frame = page.locator(`[data-ratio="${name}"]`);
      const box = await frame.boundingBox();
      expect(box?.height, name).toBeGreaterThan(0);
      expect((box?.width ?? 0) / (box?.height ?? 1), name).toBeCloseTo(w / h, 1);
      // Decorative: nothing in the frame is announced
      await expect(frame, name).toHaveAccessibleName('');
      await expect(frame.getByRole('img'), name).toHaveCount(0);
    }
  });

  test('the frame is a flat surface: the colour of --luz-surface-strong and no background image (D2)', async ({ page }) => {
    await page.goto(FIXTURE);
    const [r, g, b] = await paintOf(page, 'var(--luz-surface-strong)');
    for (const name of Object.keys(RATIOS)) {
      const style = await page.locator(`[data-ratio="${name}"]`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { image: s.backgroundImage, color: s.backgroundColor, radius: s.borderTopLeftRadius, overflow: s.overflow };
      });
      expect(style.image, name).toBe('none');
      expect(style.color, name).toBe(`rgb(${r}, ${g}, ${b})`);
      expect(style.overflow, name).toBe('hidden');
      expect(parseFloat(style.radius), name).toBeGreaterThan(0);
    }
  });

  test('the frame stays flat in dark mode, and the page asks for no placeholder', async ({ page }) => {
    const requested = [];
    page.on('request', (request) => { if (request.resourceType() === 'image') requested.push(request.url()); });
    await page.goto(FIXTURE);
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    for (const name of Object.keys(RATIOS)) {
      const frame = page.locator(`[data-ratio="${name}"]`);
      expect((await frame.boundingBox())?.height, `${name} has a height of its own`).toBeGreaterThan(0);
      expect(await frame.evaluate((el) => getComputedStyle(el).backgroundImage), name).toBe('none');
    }
    await page.waitForLoadState('networkidle');
    expect(requested.filter((url) => /placeholder/.test(url))).toEqual([]);
  });

  test('in forced-colors mode an empty frame keeps a visible edge', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(FIXTURE);
    const style = await page.locator('[data-ratio="16x9"]').evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(style).toBe('solid');
  });
});

test.describe('image: a failed image', () => {
  const MODES = [
    { label: 'light', theme: 'light' },
    { label: 'dark', theme: 'dark' },
    { label: 'high contrast', theme: 'high-contrast' },
  ];
  for (const { label, theme } of MODES) {
    test(`keeps its alt text at 4.5:1 on the frame's surface in ${label} (RL-7, O7)`, async ({ page }) => {
      await page.goto(FIXTURE);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const img = page.locator('#broken img');
      await expect.poll(() => img.evaluate((el) => /** @type {HTMLImageElement} */ (el).complete && /** @type {HTMLImageElement} */ (el).naturalWidth === 0)).toBe(true);
      // The alt text is drawn in the img box, on its own opaque background
      const [color, background] = await img.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.color, s.backgroundColor];
      });
      expect(background, 'opaque backdrop').toMatch(/^rgb\(/);
      const [r, g, b] = await paintOf(page, 'var(--luz-surface-strong)');
      expect(background, 'the surface of the frame').toBe(`rgb(${r}, ${g}, ${b})`);
      expect(runtimeContrast(color, background), `${color} on ${background}`).toBeGreaterThanOrEqual(4.5);
      // And the same pair, computed from the tokens: text-primary on surface-strong
      const computed = contrast(theme, 'text-primary', 'surface-strong');
      expect(computed, `--luz-text-primary on --luz-surface-strong, ${formatRatio(computed)}`).toBeGreaterThanOrEqual(4.5);
      // The img fills the frame, so nothing else shows behind the text
      const [frame, box] = await Promise.all([page.locator('#broken').boundingBox(), img.boundingBox()]);
      expect(box?.width).toBeCloseTo(frame?.width ?? 0, 0);
      expect(box?.height).toBeCloseTo(frame?.height ?? 0, 0);
    });
  }
});

// The docs: the component page of core (§1.9, components/image.html)
test.describe('image: the docs page', () => {
  test('core has an Image component page with the Code and Design tabs', async ({ page }) => {
    expect(routes()).toContain('/docs/components/image/');
    await page.goto('/docs/components/image/');
    await expect(page.locator('h1.docs-title')).toHaveText(/image/i);
    await expect(page.getByRole('tablist', { name: /documentation$/ }).getByRole('tab')).toHaveText(['Code', 'Design']);
  });

  test('the demos use a picture with AVIF and WebP sources and a sized img', async ({ page }) => {
    expect(routes()).toContain('/docs/components/image/');
    await page.goto('/docs/components/image/');
    const pictures = page.locator('.docs-example .luz-image picture');
    expect(await pictures.count()).toBeGreaterThan(0);
    for (const picture of await pictures.all()) {
      await expect(picture.locator('source[type="image/avif"][srcset]')).toHaveCount(1);
      await expect(picture.locator('source[type="image/webp"][srcset]')).toHaveCount(1);
      // AVIF is offered first
      expect(await picture.evaluate((p) => p.querySelector('source')?.type)).toBe('image/avif');
      const img = picture.locator('img');
      for (const attr of ['src', 'srcset', 'sizes', 'width', 'height', 'alt']) {
        await expect(img, attr).toHaveAttribute(attr);
      }
      await expect(img).toHaveAttribute('decoding', 'async');
    }
    // The demo with no image, and the one with an image that loads
    await expect(page.locator('.docs-example .luz-image:not(:has(img))')).not.toHaveCount(0);
    const real = page.locator('.docs-example .luz-image img').first();
    await real.scrollIntoViewIfNeeded();
    await expect.poll(() => real.evaluate((img) => /** @type {HTMLImageElement} */ (img).complete && /** @type {HTMLImageElement} */ (img).naturalWidth > 0)).toBe(true);
  });

  test('nothing is requested outside this host, and no placeholder is requested at all (D2)', async ({ page }) => {
    expect(routes()).toContain('/docs/components/image/');
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
    await page.goto('/docs/components/image/');
    await page.locator('.docs-example .luz-image').first().scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
    expect(images.some((url) => /assets\/desert-\d+\.(avif|webp|jpg)$/.test(url))).toBe(true);
    expect(images.filter((url) => /placeholder/.test(url))).toEqual([]);
  });

  test('the placeholders are docs-only: core ships none and no published stylesheet points at them', () => {
    expect(existsSync(fromRepo('packages/core/dist/placeholders')), 'core ships no placeholders').toBe(false);
    for (const file of ['luz.css', 'components/image.css']) {
      const path = fromRepo(`packages/core/dist/${file}`);
      expect(existsSync(path), `packages/core/dist/${file}`).toBe(true);
      expect(readFileSync(path, 'utf-8'), file).not.toMatch(/url\([^)]*placeholder/);
    }
    expect(readFileSync(fromRepo('packages/core/dist/luz.css'), 'utf-8')).toContain('.luz-image');
  });
});
