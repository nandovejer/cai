// @ts-check
/**
 * `.luz-site-hero`: the first block of a home or landing page. Its columns
 * are intrinsic, like the feature grid's: two equal ones when each gets 24rem
 * (the hero 51rem wide or more), one below, so it stacks in a narrow column
 * and with larger text. The copy is first in the source, so first in reading
 * order and at the inline start in both writing directions.
 *
 * The page is a synthetic one, served at /__hero__ with the three stylesheets
 * of the packages, built like a consumer's page (`.luz-site-main`,
 * `.o-container`); the home page (`/`, `/ar/`) is the real use, with no picture.
 * Runs in `chromium` and `chromium-nojs` (it is CSS only).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const page = (dir = 'ltr', lang = 'en') => `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hero</title>
<link rel="stylesheet" href="/packages/tokens/dist/luz-tokens.css">
<link rel="stylesheet" href="/packages/core/dist/luz.css">
<link rel="stylesheet" href="/packages/site/dist/site.css">
</head>
<body class="luz-site-page">
<main id="main-content" class="luz-site-main o-container">
  <section class="luz-site-hero" id="hero" aria-labelledby="hero-title">
    <div class="luz-site-hero__copy" id="copy">
      <p class="luz-site-hero__eyebrow">12 and 13 May 2027 · Seville</p>
      <h1 class="luz-site-hero__title" id="hero-title">Acme Summit 2027</h1>
      <p class="luz-site-hero__lead">Two days of talks and workshops for retail teams.</p>
      <div class="luz-site-actions">
        <a class="luz-btn luz-btn--primary" href="#register">Register</a>
        <a class="luz-btn luz-btn--outline" href="#programme">Programme</a>
      </div>
    </div>
    <div class="luz-site-hero__media" id="media">
      <div class="luz-site-image luz-site-image--4x3"></div>
    </div>
  </section>
  <section class="luz-site-section" aria-labelledby="programme">
    <h2 id="programme">Programme</h2>
    <p id="register">Registration opens in March.</p>
  </section>
</main>
</body>
</html>`;

/** Add a rule to the page. addStyleTag needs script, and this test also runs without it. */
const style = (p, css) => p.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

/** Serve the synthetic page and open it at `width`. */
async function open(p, width, dir = 'ltr') {
  await p.route('**/__hero__', (route) => route.fulfill({ contentType: 'text/html', body: page(dir) }));
  await p.setViewportSize({ width, height: 900 });
  await p.goto('/__hero__');
  await p.waitForLoadState('load');
}

/** The boxes of the copy and the picture. */
const boxes = (p) =>
  p.evaluate(() => Object.fromEntries(['copy', 'media'].map((id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    return [id, { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }];
  })));

const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('site hero', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}`, async ({ page: p }, testInfo) => {
      // axe runs as page script: the chromium project covers it
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(p, 1280);
      await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const { violations } = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }

  test('the hero is a region named by its h1', async ({ page: p }) => {
    await open(p, 1280);
    await expect(p.getByRole('region', { name: 'Acme Summit 2027' })).toHaveCount(1);
    await expect(p.getByRole('heading', { level: 1 })).toHaveText('Acme Summit 2027');
  });

  test('at 1280 px the copy and the picture are two equal columns, the copy first', async ({ page: p }) => {
    await open(p, 1280);
    const { copy, media } = await boxes(p);
    expect(Math.abs(copy.width - media.width)).toBeLessThanOrEqual(1);
    expect(copy.right).toBeLessThan(media.left);
    // Side by side: they share the row
    expect(copy.top).toBeLessThan(media.bottom);
    expect(media.top).toBeLessThan(copy.bottom);
  });

  for (const width of [768, 320]) {
    test(`at ${width} px they stack, the copy above the picture, with no sideways scroll`, async ({ page: p }) => {
      await open(p, width);
      const { copy, media } = await boxes(p);
      expect(copy.bottom).toBeLessThanOrEqual(media.top);
      expect(Math.abs(copy.left - media.left)).toBeLessThanOrEqual(1);
      expect(await sideways(p)).toBeLessThanOrEqual(0);
    });
  }

  test('with 200 % text at 1280 px it stacks, and at 320 px nothing goes past the window', async ({ page: p }) => {
    await open(p, 1280);
    await style(p, 'html { font-size: 200% }');
    const { copy, media } = await boxes(p);
    expect(copy.bottom).toBeLessThanOrEqual(media.top);

    await p.setViewportSize({ width: 320, height: 900 });
    expect(await sideways(p)).toBeLessThanOrEqual(0);
    const beyond = await p.evaluate(() => {
      const edge = document.documentElement.clientWidth;
      return [...document.querySelectorAll('#hero *')].filter((el) => el.getBoundingClientRect().right > edge + 0.5).length;
    });
    expect(beyond).toBe(0);
  });

  test('right to left at 1280 px: the copy is the right-hand column', async ({ page: p }) => {
    await open(p, 1280, 'rtl');
    const { copy, media } = await boxes(p);
    expect(copy.left).toBeGreaterThan(media.right);
  });

  test('the title steps down: 4xl, 3xl below 1024 px, 2xl at 640 px and below', async ({ page: p }) => {
    const size = (token) => p.evaluate((t) => {
      const probe = Object.assign(document.createElement('div'), { style: `font-size: var(${t})` });
      document.body.append(probe);
      const value = getComputedStyle(probe).fontSize;
      probe.remove();
      return value;
    }, token);
    const title = () => p.locator('#hero-title').evaluate((el) => getComputedStyle(el).fontSize);
    for (const [width, token] of [[1280, '--luz-text-4xl'], [1000, '--luz-text-3xl'], [640, '--luz-text-2xl']]) {
      await open(p, width);
      expect(await title(), `${width} px`).toBe(await size(token));
    }
  });
});

test.describe('home page hero', () => {
  test('at 320 px the home page does not scroll sideways', async ({ page: p }) => {
    await p.setViewportSize({ width: 320, height: 900 });
    await p.goto('/');
    expect(await sideways(p)).toBeLessThanOrEqual(0);
  });
});
