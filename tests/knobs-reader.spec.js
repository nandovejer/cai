// @ts-check
/**
 * LUZ — the size knobs must not take the page from the reader (F4, step 3).
 *
 * The "large" preset is the top of every range the docs promise
 * (--luz-type-base 1.25rem, --luz-type-ratio 1.333, --luz-space-unit
 * 0.3125rem). It is applied on top of a reader who also asked for 130%
 * text in the browser and whose tools force the WCAG 1.4.12 text spacing
 * (line height 1.5, paragraphs 2em apart, letters 0.12em, words 0.16em).
 *
 *   - 1.4.10 reflow: at 320 and at 1280px the page has no horizontal
 *     scroll of its own;
 *   - 1.4.12 text spacing: no button, field, card or alert clips its text;
 *   - forced colours: colours are not sizes, so the sizes are the same;
 *   - print: a consumer re-scales paper with a media query on :root.
 *
 * Each case first proves the knobs were applied (the base probe reads the
 * preset, not the default), so none can pass on a page the knobs never
 * reached.
 */
import { test, expect } from '@playwright/test';
import { LARGE, knobsCss } from './helpers/scale-golden.js';

const FIXTURE = '/tests/fixtures/knobs-reader.html';

const ROOT_PERCENT = 130;
const ROOT_PX = (16 * ROOT_PERCENT) / 100;
/** What the "large" preset reads as at that root: 1.25rem, and four units of 0.3125rem. */
const EXPECTED_BASE_PX = 1.25 * ROOT_PX;
const EXPECTED_SPACE_MD_PX = 4 * 0.3125 * ROOT_PX;

/** The reader's browser setting, the preset, and the four WCAG 1.4.12 overrides. */
const READER = `
  html { font-size: ${ROOT_PERCENT}%; }
  ${knobsCss(LARGE)}
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`;

/** Add a rule to the page. addStyleTag needs script, and this spec also runs without it (tests/band.spec.js). */
const style = (page, css) => page.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

const probes = (page) =>
  page.evaluate(() => ({
    base: parseFloat(getComputedStyle(document.querySelector('[data-step="base"]')).fontSize),
    xxxxl: parseFloat(getComputedStyle(document.querySelector('[data-step="4xl"]')).fontSize),
    spaceMd: parseFloat(getComputedStyle(document.querySelector('[data-space="md"]')).paddingLeft),
  }));

async function expectKnobsApplied(page) {
  const { base, spaceMd, xxxxl } = await probes(page);
  expect(base, 'the base probe reads the preset: the knobs reached the page').toBeCloseTo(EXPECTED_BASE_PX, 1);
  expect(spaceMd, 'the space probe reads the preset unit').toBeCloseTo(EXPECTED_SPACE_MD_PX, 1);
  expect(xxxxl, 'the largest step is the base times the ratio five times').toBeGreaterThan(base * 3);
}

for (const width of [320, 1280]) {
  test.describe(`the "large" preset, 130% text and the text-spacing overrides at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test.beforeEach(async ({ page }) => {
      await page.goto(FIXTURE);
      await style(page, READER);
      await expectKnobsApplied(page);
    });

    test('the page does not scroll sideways (WCAG 1.4.10)', async ({ page }) => {
      const scroll = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(scroll.document, 'documentElement').toBeLessThanOrEqual(0);
      expect(scroll.body, 'body').toBeLessThanOrEqual(0);
    });

    test('no button clips its text (WCAG 1.4.12)', async ({ page }) => {
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll('.luz-btn')]
          .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
          .map((el) => `${el.textContent.trim()}: ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`),
      );
      expect(clipped).toEqual([]);
      expect(await page.locator('.luz-btn').count()).toBeGreaterThan(3);
    });

    test('a field and a select are tall enough for their text', async ({ page }) => {
      const short = await page.evaluate(() =>
        [...document.querySelectorAll('.luz-input, .luz-select')]
          .map((el) => {
            const style = getComputedStyle(el);
            return { name: el.id, line: parseFloat(style.fontSize) * 1.5, height: el.clientHeight };
          })
          .filter((f) => f.height < f.line)
          .map((f) => `${f.name}: ${f.height}px for a line of ${f.line}px`),
      );
      expect(short).toEqual([]);
    });

    test('no card, alert, heading or paragraph has text that overflows its box', async ({ page }) => {
      const overflowing = await page.evaluate(() =>
        [...document.querySelectorAll('main h1, main h2, main h3, main p, .luz-card, .luz-alert, .luz-field__label')]
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => `${el.localName}.${el.className}: ${el.scrollWidth} in ${el.clientWidth}`),
      );
      expect(overflowing).toEqual([]);
    });

    test('a wide table scrolls inside its own region, not the page', async ({ page }) => {
      const region = page.locator('.luz-table-wrap');
      expect(await region.evaluate((el) => getComputedStyle(el).overflowX)).toMatch(/auto|scroll/);
    });
  });
}

test.describe('forced colours', () => {
  test('the sizes are the same as without them', async ({ page }) => {
    await page.goto(FIXTURE);
    await style(page, READER);
    await expectKnobsApplied(page);
    const before = await probes(page);
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await page.evaluate(() => window.matchMedia('(forced-colors: active)').matches)).toBe(true);
    expect(await probes(page)).toEqual(before);
    await expectKnobsApplied(page);
  });

  test('the page still does not scroll sideways at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(FIXTURE);
    await style(page, READER);
    await page.emulateMedia({ forcedColors: 'active' });
    await expectKnobsApplied(page);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(scroll).toBeLessThanOrEqual(0);
  });
});

test.describe('print', () => {
  const PRINT_BASE = 0.9375;

  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    // A consumer's way to re-scale paper: a media query on :root, outside any layer
    await style(page, `@media print { :root { --luz-type-base: ${PRINT_BASE}rem; } }`);
  });

  test('on a screen the base is still 16px', async ({ page }) => {
    await page.emulateMedia({ media: 'screen' });
    expect((await probes(page)).base).toBe(16);
  });

  test('on paper the base is 15px, and every step follows (the knobs carry to print)', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    const { base, xxxxl } = await probes(page);
    expect(base).toBe(PRINT_BASE * 16);
    // 4xl is the base times 1.25 five times, rounded to the pixel at each step: 15, 19, 24, 30, 38, 48
    let step = PRINT_BASE * 16;
    for (let i = 0; i < 5; i += 1) step = Math.round(step * 1.25);
    expect(xxxxl).toBe(step);
    expect(xxxxl).toBeLessThan(49);
  });

  test('the running text of the body follows it', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))).toBeCloseTo(PRINT_BASE * 16 * 1.0625, 2);
  });
});
