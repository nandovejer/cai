// @ts-check
/**
 * `.luz-landing-hero` (@luz-ds/landing; .claude/plans/specs/f3-package-model.md,
 * §1.5 and §9 step 10): the first block of a home or landing page, no longer a
 * block of site (the port of tests/site-hero.spec.js, which stays until site's
 * old CSS goes at step 12). It is a native <section> on core's `.o-grid.o-grid--split`:
 * two equal columns when each gets 24rem (`--luz-grid-min`), one below, so it
 * stacks in a narrow column and with larger text; the landing adds the gaps, the
 * top padding, the type steps and the Arabic rules. The copy is first in the
 * source, so first in reading order and at the inline start in both writing
 * directions. The actions are core's `.o-actions`, the picture core's `.luz-image`.
 *
 * The page is a synthetic one, served at /__hero__ with tokens, core and
 * landing only (site is an optional peer), built like a consumer's page
 * (`main.o-container.o-stack.luz-landing-main`); the home page (`/`, `/ar/`) is
 * the real use, with no picture.
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
<link rel="stylesheet" href="/packages/landing/dist/landing.css">
</head>
<body class="o-page">
<main id="main-content" class="o-container o-stack luz-landing-main">
  <section class="luz-landing-hero o-grid o-grid--split" id="hero" aria-labelledby="hero-title">
    <div class="luz-landing-hero__copy" id="copy">
      <p class="luz-landing-hero__eyebrow">12 and 13 May 2027 · Seville</p>
      <h1 class="luz-landing-hero__title" id="hero-title">Acme Summit 2027</h1>
      <p class="luz-landing-hero__lead">Two days of talks and workshops for retail teams.</p>
      <div class="o-actions">
        <a class="luz-btn luz-btn--primary" href="#register">Register</a>
        <a class="luz-btn luz-btn--outline" href="#programme">Programme</a>
      </div>
    </div>
    <div class="luz-landing-hero__media" id="media">
      <div class="luz-image luz-image--4x3" role="img" aria-label="The main hall"></div>
    </div>
  </section>
  <section class="o-stack luz-landing-section" aria-labelledby="programme">
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

test.describe('landing hero', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}`, async ({ page: p }, testInfo) => {
      // axe runs as page script: the chromium project covers it
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      // Reduced motion: the colour transition of the page must not be caught half way by axe
      await p.emulateMedia({ reducedMotion: 'reduce' });
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

  test('it is core\'s split grid with the landing\'s own measures: columns of 24rem, gaps xl and 2xl, 3xl of room above', async ({ page: p }) => {
    await open(p, 1280);
    await expect(p.locator('#hero')).toHaveClass(/\bo-grid\b.*\bo-grid--split\b|\bo-grid--split\b.*\bo-grid\b/);
    const px = (expression) => p.evaluate((value) => {
      const probe = Object.assign(document.createElement('div'), { style: `position:absolute;visibility:hidden;inline-size:${value}` });
      document.body.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    }, expression);
    const hero = await p.locator('#hero').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { min: cs.getPropertyValue('--luz-grid-min').trim(), rowGap: cs.rowGap, columnGap: cs.columnGap, top: cs.paddingBlockStart, align: cs.alignItems };
    });
    expect(hero.min, 'the landing sets --luz-grid-min').toBe('24rem');
    expect(hero.rowGap).toBe(`${await px('var(--luz-space-xl)')}px`);
    expect(hero.columnGap).toBe(`${await px('var(--luz-space-2xl)')}px`);
    expect(hero.top).toBe(`${await px('var(--luz-space-3xl)')}px`);
    expect(hero.align).toBe('center');
    // Below 1024 px the room above is smaller (xl and xs)
    await p.setViewportSize({ width: 1000, height: 900 });
    expect(await p.locator('#hero').evaluate((el) => getComputedStyle(el).paddingBlockStart)).toBe(`${await px('calc(var(--luz-space-xl) + var(--luz-space-xs))')}px`);
  });

  test('the eyebrow is small mono capitals; the title is the light heading face; the lead is secondary text', async ({ page: p }) => {
    await open(p, 1280);
    const read = (selector) => p.locator(selector).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { family: cs.fontFamily, weight: cs.fontWeight, transform: cs.textTransform, spacing: cs.letterSpacing, color: cs.color };
    });
    const family = (token) => p.evaluate((t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(), token);
    const colorOf = (token) => p.evaluate((t) => {
      const probe = Object.assign(document.createElement('div'), { style: `color:var(${t})` });
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    }, token);
    const eyebrow = await read('.luz-landing-hero__eyebrow');
    expect(eyebrow.transform).toBe('uppercase');
    expect(eyebrow.family.replace(/\s/g, '')).toBe((await family('--luz-font-mono')).replace(/\s/g, ''));
    const title = await read('.luz-landing-hero__title');
    expect(title.weight).toBe('300');
    expect(title.family.replace(/\s/g, '')).toBe((await family('--luz-font-heading')).replace(/\s/g, ''));
    expect((await read('.luz-landing-hero__lead')).color).toBe(await colorOf('--luz-text-secondary'));
  });

  test('in Arabic the eyebrow takes the sans and neither it nor the title is letter-spaced', async ({ page: p }) => {
    await p.route('**/__hero__', (route) => route.fulfill({ contentType: 'text/html', body: page('rtl', 'ar') }));
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto('/__hero__');
    const read = (selector) => p.locator(selector).evaluate((el) => ({ family: getComputedStyle(el).fontFamily, spacing: getComputedStyle(el).letterSpacing }));
    const sans = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--luz-font-sans').trim());
    const eyebrow = await read('.luz-landing-hero__eyebrow');
    expect(eyebrow.family.replace(/\s/g, '')).toBe(sans.replace(/\s/g, ''));
    expect(['normal', '0px']).toContain(eyebrow.spacing);
    expect(['normal', '0px']).toContain((await read('.luz-landing-hero__title')).spacing);
  });

  test('the actions are core\'s `.o-actions`: a column of full-width buttons at 640 px, a row above', async ({ page: p }) => {
    await open(p, 1280);
    const rowTops = await p.locator('#copy .luz-btn').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(rowTops).size, 'one row').toBe(1);
    await p.setViewportSize({ width: 640, height: 900 });
    const column = await p.locator('#copy .luz-btn').evaluateAll((els) => els.map((el) => ({ top: el.getBoundingClientRect().top, width: el.getBoundingClientRect().width, parent: el.parentElement.getBoundingClientRect().width })));
    expect(column[1].top).toBeGreaterThan(column[0].top);
    for (const { width, parent } of column) expect(Math.abs(width - parent)).toBeLessThanOrEqual(1);
  });

  test('the markup carries no `luz-site-*` class', async ({ page: p }) => {
    await open(p, 1280);
    expect(await p.evaluate(() => [...document.querySelectorAll('[class]')].flatMap((el) => [...el.classList]).filter((c) => c.startsWith('luz-site-')))).toEqual([]);
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
  test('in Arabic the copy starts at the right edge of the hero, in the sans with no letter-spacing', async ({ page: p }) => {
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto('/ar/');
    await expect(p.locator('.luz-landing-hero')).toHaveCount(1);
    const geometry = await p.evaluate(() => {
      const hero = document.querySelector('.luz-landing-hero');
      const cs = getComputedStyle(hero);
      const inner = hero.getBoundingClientRect().right - parseFloat(cs.paddingRight);
      const title = document.querySelector('.luz-landing-hero__title');
      // The text, not the block: in RTL its lines start at the right
      const range = document.createRange();
      range.selectNodeContents(title);
      return { inner, right: Math.max(...[...range.getClientRects()].map((r) => r.right)), spacing: getComputedStyle(title).letterSpacing };
    });
    expect(Math.abs(geometry.inner - geometry.right)).toBeLessThanOrEqual(1);
    expect(['normal', '0px']).toContain(geometry.spacing);
  });

  test('at 320 px the home page does not scroll sideways', async ({ page: p }) => {
    await p.setViewportSize({ width: 320, height: 900 });
    await p.goto('/');
    expect(await sideways(p)).toBeLessThanOrEqual(0);
  });
});
