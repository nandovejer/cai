// @ts-check
/**
 * F4 of .claude/plans/luz-home-docs-identity.md, @luz-ds/landing 0.2: what any landing
 * wants and nothing of LUZ. Four additions, on tests/fixtures/landing-f4.html (tokens, core
 * and landing only):
 *
 *   - the head of a section: `.luz-landing-section__eyebrow`, `__title` and `__lead`, and the
 *     `em` of a hero or section title that takes `--luz-landing-title-accent` only when set
 *   - `.luz-landing-stat` with `__value` and `__label`
 *   - `--luz-landing-glow-x`, the horizontal position of the glow's tint
 *   - axe on the whole page in light, dark and high contrast
 *
 * The hero (--centered, __media--bleed) is in tests/landing-hero.spec.js and the footer
 * (__brand, __col) in tests/landing-footer.spec.js. CSS only: runs in `chromium` and
 * `chromium-nojs` (axe, which needs script, only in the first).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readPoints, paintOf } from './helpers/pixels.js';

const F4 = '/tests/fixtures/landing-f4.html';

async function open(page, width = 1280, dir = 'ltr') {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(F4);
  await page.waitForLoadState('load');
  if (dir === 'rtl') await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; });
}

/** A CSS length expression resolved to pixels, in the page. */
const px = (page, expression) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${value}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, expression);

const color = (page, token) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `color:var(${value})`;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, token);

const css = (page, selector, property) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], property);
const compact = (value) => value.replace(/\s/g, '');
const tokenValue = (page, token) => page.evaluate((t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(), token);

test.describe('landing section head', () => {
  test('the eyebrow looks like the hero\'s: same face, size, weight, spacing, capitals and colour', async ({ page }) => {
    await open(page);
    const read = (selector) => page.locator(selector).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, spacing: cs.letterSpacing, transform: cs.textTransform, color: cs.color, lineHeight: cs.lineHeight };
    });
    const section = await read('#sec-eyebrow');
    expect(section.transform).toBe('uppercase');
    expect(section).toEqual(await read('#hero-c-eyebrow'));
  });

  test('the title is the heading face, smaller than the hero\'s: 3xl, 2xl under 1024 px, xl under 641 px', async ({ page }) => {
    await open(page);
    expect(compact(await css(page, '#sec-title', 'fontFamily'))).toBe(compact(await tokenValue(page, '--luz-font-heading')));
    expect(await css(page, '#sec-title', 'color')).toBe(await color(page, '--luz-text-primary'));
    for (const [width, token] of [[1280, '--luz-text-3xl'], [1000, '--luz-text-2xl'], [640, '--luz-text-xl']]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await css(page, '#sec-title', 'fontSize'), `${width} px`).toBe(`${await px(page, `var(${token})`)}px`);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    const hero = parseFloat(await css(page, '#hero-c-title', 'fontSize'));
    expect(parseFloat(await css(page, '#sec-title', 'fontSize')), 'smaller than the hero title').toBeLessThan(hero);
  });

  test('the lead is secondary text', async ({ page }) => {
    await open(page);
    expect(await css(page, '#sec-lead', 'color')).toBe(await color(page, '--luz-text-secondary'));
  });

  test('in Arabic the eyebrow takes the sans, and neither it nor the title is letter-spaced', async ({ page }) => {
    await open(page, 1280, 'rtl');
    expect(compact(await css(page, '#sec-eyebrow', 'fontFamily'))).toBe(compact(await tokenValue(page, '--luz-font-sans')));
    expect(['normal', '0px']).toContain(await css(page, '#sec-eyebrow', 'letterSpacing'));
    expect(['normal', '0px']).toContain(await css(page, '#sec-title', 'letterSpacing'));
  });

  for (const [name, section, em] of [['section', '#sec-title', '#sec-em'], ['hero', '#hero-c-title', '#hero-c-em']]) {
    test(`the em of a ${name} title is the colour of the title by default`, async ({ page }) => {
      await open(page);
      expect(await css(page, em, 'color')).toBe(await css(page, section, 'color'));
    });

    test(`the em of a ${name} title takes --luz-landing-title-accent when it is set, and the title does not`, async ({ page }) => {
      await open(page);
      const before = await css(page, section, 'color');
      await page.evaluate(() => document.documentElement.style.setProperty('--luz-landing-title-accent', 'rgb(200, 30, 30)'));
      expect(await css(page, em, 'color')).toBe('rgb(200, 30, 30)');
      expect(await css(page, section, 'color')).toBe(before);
    });
  }
});

test.describe('landing stat', () => {
  test('the value is a big number in the heading face with tabular figures; the label is secondary text under it', async ({ page }) => {
    await open(page);
    for (const [value, label] of [['#stat-value', '#stat-label'], ['#stat-in-card-value', '#stat-in-card-label']]) {
      expect(compact(await css(page, value, 'fontFamily')), value).toBe(compact(await tokenValue(page, '--luz-font-heading')));
      expect(await css(page, value, 'fontVariantNumeric'), value).toContain('tabular-nums');
      expect(parseFloat(await css(page, value, 'fontSize')), `${value} is big`).toBeGreaterThanOrEqual(await px(page, 'var(--luz-text-2xl)'));
      expect(await css(page, label, 'color'), label).toBe(await color(page, '--luz-text-secondary'));
      expect(parseFloat(await css(page, label, 'fontSize')), `${label} is smaller`).toBeLessThan(parseFloat(await css(page, value, 'fontSize')));
      const [v, l] = await Promise.all([page.locator(value).boundingBox(), page.locator(label).boundingBox()]);
      expect(l.y, `${label} is under its value`).toBeGreaterThanOrEqual(v.y + v.height - 1);
    }
  });

  test('inside a card it stays inside the card, at 320 px too', async ({ page }) => {
    await open(page, 320);
    const inside = await page.evaluate(() => {
      const card = document.getElementById('card-stat').getBoundingClientRect();
      const stat = document.getElementById('stat-in-card').getBoundingClientRect();
      return stat.left >= card.left - 0.5 && stat.right <= card.right + 0.5;
    });
    expect(inside).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe('landing glow: --luz-landing-glow-x', () => {
  const glowPage = (dir) => `<!doctype html>
<html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glow</title>
<link rel="stylesheet" href="/packages/tokens/dist/luz-tokens.css">
<link rel="stylesheet" href="/packages/core/dist/luz.css">
<link rel="stylesheet" href="/packages/landing/dist/landing.css">
</head>
<body class="o-page luz-landing-glow">
<main id="main-content" class="o-container"><p>Decoration only.</p></main>
</body>
</html>`;

  /** Which of three points along the top edge (start, middle, end of the window) carries the tint. */
  async function tinted(page, dir, knob) {
    await page.route('**/__glow__', (route) => route.fulfill({ contentType: 'text/html', body: glowPage(dir) }));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    await page.goto('/__glow__');
    await page.waitForLoadState('load');
    // The knob is set on the element that carries the glow, like the other knobs of a component
    if (knob) await page.evaluate((x) => document.body.style.setProperty('--luz-landing-glow-x', x), knob);
    const png = await page.screenshot();
    const subtle = await paintOf(page, 'var(--luz-brand-subtle)');
    const points = await readPoints(page, png, [[3, 3], [640, 3], [1276, 3]]);
    const distance = points.map(([r, g, b]) => Math.abs(r - subtle[0]) + Math.abs(g - subtle[1]) + Math.abs(b - subtle[2]));
    return { distance, left: distance[0], middle: distance[1], right: distance[2] };
  }

  test('by default the tint is at the start edge: the left in ltr', async ({ page }) => {
    const d = await tinted(page, 'ltr');
    expect(d.left).toBeLessThan(d.right - 4);
    expect(d.left).toBeLessThan(d.middle - 4);
  });

  test('by default the tint is at the start edge: the right in rtl', async ({ page }) => {
    const d = await tinted(page, 'rtl');
    expect(d.right).toBeLessThan(d.left - 4);
    expect(d.right).toBeLessThan(d.middle - 4);
  });

  test('at 50% the tint is in the middle of the top edge, and the corners are the plain page', async ({ page }) => {
    const d = await tinted(page, 'ltr', '50%');
    expect(d.middle).toBeLessThan(d.left - 4);
    expect(d.middle).toBeLessThan(d.right - 4);
    expect(Math.abs(d.left - d.right), 'the two corners match').toBeLessThanOrEqual(2);
  });

  test('100% moves it to the right in ltr', async ({ page }) => {
    const d = await tinted(page, 'ltr', '100%');
    expect(d.right).toBeLessThan(d.left - 4);
  });

  test('0% moves it to the left in rtl: the knob is the physical position, in both directions', async ({ page }) => {
    const d = await tinted(page, 'rtl', '0%');
    expect(d.left).toBeLessThan(d.right - 4);
  });
});

test.describe('axe on the landing 0.2 page', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`finds nothing serious in ${theme}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
});
