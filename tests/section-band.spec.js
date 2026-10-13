// @ts-check
/**
 * `.cai-platform-section--band`: a section on a tint that runs from edge to
 * edge of the page (.claude/plans/specs/band-and-featured-card.md and its
 * accessibility review, B2 and B3). The band is a spread `box-shadow` cut off
 * above and below by `clip-path`, so it adds no scrollable width and does not
 * clip the controls inside.
 *
 * The page is a synthetic one, served at /__band__ with the three stylesheets
 * of the packages, built like a consumer's page (`.cai-platform-main`,
 * `.o-container`): the docs' own frame would answer for the docs.
 * Runs in `chromium` and `chromium-nojs` (it is CSS only).
 */
import { test, expect } from '@playwright/test';

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Band</title>
<link rel="stylesheet" href="/packages/tokens/dist/cai-tokens.css">
<link rel="stylesheet" href="/packages/core/dist/cai.css">
<link rel="stylesheet" href="/packages/platform/dist/platform.css">
</head>
<body class="cai-platform-page">
<main id="main-content" class="cai-platform-main o-container">
  <section class="cai-platform-section" aria-labelledby="before-title">
    <h2 id="before-title">Programme</h2>
    <p>Two days of talks and workshops for retail teams.</p>
  </section>
  <section class="cai-platform-section cai-platform-section--band" aria-labelledby="last-seats-title" id="band">
    <h2 id="last-seats-title">Registration closes on 30 April</h2>
    <p>The hall holds 400 people, and the Two days ticket sold out last year.</p>
    <div class="cai-platform-actions">
      <a class="cai-btn cai-btn--primary" href="#after-title">Register now</a>
      <a class="cai-btn cai-btn--outline" href="#after-title">Programme</a>
    </div>
  </section>
  <section class="cai-platform-section" aria-labelledby="after-title">
    <h2 id="after-title">Venue</h2>
    <p>The main hall, in Seville.</p>
  </section>
</main>
</body>
</html>`;

// The labels are short on purpose: a .cai-btn does not wrap its label outside a card, so a long one
// ("See the programme") is wider than 288 px at 200 % text: a Button matter, not the band's.

/** Add a rule to the page. addStyleTag needs script, and this test also runs without it. */
const style = (page, css) => page.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

/** Serve the synthetic page and open it at `width`. */
async function open(page, width, height = 1000) {
  await page.route('**/__band__', (route) => route.fulfill({ contentType: 'text/html', body: PAGE }));
  await page.setViewportSize({ width, height });
  await page.goto('/__band__');
  await page.waitForLoadState('load');
}

/** The RGB of the pixels at `points` of a screenshot of the viewport. */
async function pixels(page, points) {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(
    async ([data, list]) => {
      const bitmap = await window.createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = new window.OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      return list.map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3).join(','));
    },
    [png, points],
  );
}

test.describe('section band', () => {
  for (const width of [320, 768, 1440, 2560]) {
    test(`at ${width} px the page does not scroll sideways, and the content keeps the column`, async ({ page }) => {
      await open(page, width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await page.evaluate(() => window.scrollTo(10000, 0));
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
      // The band's heading starts where the heading of the section before it starts
      const lefts = await page.evaluate(() => ['before-title', 'last-seats-title', 'after-title'].map((id) => document.getElementById(id).getBoundingClientRect().left));
      expect(lefts[1]).toBe(lefts[0]);
      expect(lefts[2]).toBe(lefts[0]);
    });
  }

  for (const width of [320, 1440]) {
    test(`at ${width} px the tint reaches both edges of the page and stops at the band's top and bottom`, async ({ page }) => {
      await open(page, width);
      const box = await page.evaluate(() => {
        const r = document.getElementById('band').getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      });
      const mid = Math.round(box.top) + 10; // in the band's own padding: no text, no control
      const [edgeLeft, edgeRight, inside, above, below] = await pixels(page, [
        [2, mid],
        [width - 3, mid],
        [Math.round(box.left) + 1, mid],
        [Math.round(box.left) + 1, Math.round(box.top) - 3],
        [Math.round(box.left) + 1, Math.round(box.bottom) + 3],
      ]);
      // The bleed is the box's own colour, and the page above and below is not
      expect(edgeLeft).toBe(inside);
      expect(edgeRight).toBe(inside);
      expect(above).not.toBe(inside);
      expect(below).not.toBe(inside);
      // A column of the band's colour at the edge, 3 px above the band: the page's
      const [bleedAbove, bleedBelow] = await pixels(page, [[2, Math.round(box.top) - 3], [2, Math.round(box.bottom) + 3]]);
      expect(bleedAbove).toBe(above);
      expect(bleedBelow).toBe(below);
    });
  }

  for (const [label, css] of [['320 px', ''], ['320 px with 200 % text', 'html { font-size: 200% }']]) {
    test(`at ${label} every control has 4 px of room for its focus ring: inside the band above and below, inside the window at the sides`, async ({ page }) => {
      await open(page, 320);
      if (css) await style(page, css);
      const slack = await page.evaluate(() => {
        // The tint bleeds sideways, so the band's own edges are the top and bottom only
        const band = document.getElementById('band').getBoundingClientRect();
        const edge = document.documentElement.clientWidth;
        return [...document.querySelectorAll('#band a, #band button')].map((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top - band.top, bottom: band.bottom - r.bottom, left: r.left, right: edge - r.right };
        });
      });
      expect(slack.length).toBe(2);
      for (const s of slack) for (const side of ['top', 'bottom', 'left', 'right']) expect(s[side], side).toBeGreaterThanOrEqual(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }

  test('with the text-spacing overrides of WCAG 1.4.12 at 320 px the page does not scroll sideways', async ({ page }) => {
    await open(page, 320);
    await style(page, '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    // Nothing of the band is cut at the sides
    const beyond = await page.evaluate(() => {
      const edge = document.documentElement.clientWidth;
      return [...document.querySelectorAll('#band *')].filter((el) => el.getBoundingClientRect().right > edge + 0.5).length;
    });
    expect(beyond).toBe(0);
  });

  test('in forced colors the tint and its bleed are gone and two CanvasText rules mark the band', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page, 1440);
    const style = await page.evaluate(() => {
      const band = getComputedStyle(document.getElementById('band'));
      const body = getComputedStyle(document.body);
      return {
        shadow: band.boxShadow,
        background: band.backgroundColor,
        pageBackground: body.backgroundColor,
        top: [band.borderBlockStartWidth, band.borderBlockStartStyle, band.borderBlockStartColor],
        bottom: [band.borderBlockEndWidth, band.borderBlockEndStyle, band.borderBlockEndColor],
        text: body.color,
      };
    });
    expect(style.shadow).toBe('none');
    expect(style.background).toBe(style.pageBackground);
    expect(style.top).toEqual(['1px', 'solid', style.text]);
    expect(style.bottom).toEqual(['1px', 'solid', style.text]);
    // The heading and the button are still there, in the column
    await expect(page.getByRole('heading', { name: 'Registration closes on 30 April' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register now' })).toBeVisible();
  });

  test('outside forced colors the band has no border', async ({ page }) => {
    await open(page, 1440);
    const border = await page.evaluate(() => getComputedStyle(document.getElementById('band')).borderBlockStartWidth);
    expect(border).toBe('0px');
  });

  test('the band is a named region in the accessibility tree', async ({ page }) => {
    await open(page, 1440);
    await expect(page.getByRole('region', { name: 'Registration closes on 30 April' })).toHaveCount(1);
  });
});
