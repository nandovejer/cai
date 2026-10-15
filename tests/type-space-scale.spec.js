// @ts-check
/**
 * LUZ — the size knobs, in a browser (F4, steps 1 and 2).
 *
 * A fixture of probes (tests/fixtures/type-space-scale.html) is given a
 * consumer's `:root { --luz-type-base: …; }` after LUZ's CSS, as a page
 * would, and the computed sizes are read back. The expected sizes are the
 * golden list of tests/helpers/scale-golden.js (a literal, on purpose).
 *
 *   - at the defaults nothing changes (these cases pass before the knobs
 *     exist: they guard the "no visual change" promise, with the
 *     visual regression suite);
 *   - a knob on :root re-scales; on body it does nothing (F-4);
 *   - spacing is a multiple of the unit and follows the reader's font size;
 *   - running text follows the base (--luz-text-body) and a field on a
 *     touch screen is never under 16px (--luz-text-control).
 */
import { test, expect } from '@playwright/test';
import {
  PRESETS,
  SPACE_PX_AT_3PX_UNIT,
  SPACE_PX_AT_DEFAULTS,
  SPACE_STEPS,
  STEPS,
  TEXT_PX_AT_DEFAULTS,
  TEXT_PX_AT_ROOT_125,
  knobsCss,
} from './helpers/scale-golden.js';

const FIXTURE = '/tests/fixtures/type-space-scale.html';

/** The computed font-size of every type probe, in px, in STEPS order. */
const textSizes = (page) =>
  page.evaluate((steps) => steps.map((s) => parseFloat(getComputedStyle(document.querySelector(`[data-step="${s}"]`)).fontSize)), STEPS);

/** The computed padding-left of every space probe, in px, in SPACE_STEPS order. */
const spaceSizes = (page) =>
  page.evaluate((steps) => steps.map((s) => parseFloat(getComputedStyle(document.querySelector(`[data-space="${s}"]`)).paddingLeft)), SPACE_STEPS);

/** Add a rule to the page. addStyleTag needs script, and this spec also runs without it (tests/band.spec.js). */
const style = (page, css) => page.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

const fontSize = (page, selector) => page.locator(selector).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

const expectClose = (actual, expected) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) => expect(value, `step ${i}`).toBeCloseTo(expected[i], 1));
};

test.describe('size knobs: the type scale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
  });

  for (const { name, knobs, px } of PRESETS) {
    test(`preset "${name}" gives ${px.join(', ')}px`, async ({ page }) => {
      await style(page, knobsCss(knobs));
      expectClose(await textSizes(page), px);
    });
  }

  test('the default scale at the reader\'s root of 125% is today\'s scale times 1.25', async ({ page }) => {
    await style(page, 'html { font-size: 125%; }');
    expectClose(await textSizes(page), TEXT_PX_AT_ROOT_125);
  });

  test('the knobs set in rem follow the reader\'s root: base 1.125rem at 125% is 22.5px', async ({ page }) => {
    await style(page, `html { font-size: 125%; } ${knobsCss({ '--luz-type-base': '1.125rem' })}`);
    expect((await textSizes(page))[STEPS.indexOf('base')]).toBeCloseTo(22.5, 1);
  });

  test('a knob set on body changes nothing (the derived tokens are resolved on :root)', async ({ page }) => {
    // This case passes before the knobs exist, and says what the docs must say: sizes are a page-wide choice
    await style(page, 'body { --luz-type-base: 1.5rem; --luz-type-ratio: 1.5; }');
    expectClose(await textSizes(page), TEXT_PX_AT_DEFAULTS);
  });

  test('a knob set on a section changes nothing either', async ({ page }) => {
    await style(page, 'main { --luz-type-base: 1.5rem; }');
    expectClose(await textSizes(page), TEXT_PX_AT_DEFAULTS);
  });
});

test.describe('size knobs: the space scale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
  });

  test('at the defaults the steps are 2, 4, 8, 12, 16, 24, 32, 48, 64 and 96px', async ({ page }) => {
    expectClose(await spaceSizes(page), SPACE_PX_AT_DEFAULTS);
  });

  test('--luz-space-unit: 0.1875rem gives 1.5, 3, 6, 9, 12, 18, 24, 36, 48 and 72px', async ({ page }) => {
    await style(page, knobsCss({ '--luz-space-unit': '0.1875rem' }));
    expectClose(await spaceSizes(page), SPACE_PX_AT_3PX_UNIT);
  });

  test('spacing follows the reader\'s font size: at a root of 125% the 16px step is 20px', async ({ page }) => {
    await style(page, 'html { font-size: 125%; }');
    expectClose(await spaceSizes(page), SPACE_PX_AT_DEFAULTS.map((n) => n * 1.25));
  });

  test('a knob set on body does not move the space steps', async ({ page }) => {
    await style(page, 'body { --luz-space-unit: 0.5rem; }');
    expectClose(await spaceSizes(page), SPACE_PX_AT_DEFAULTS);
  });
});

test.describe('size knobs: running text (--luz-text-body)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
  });

  test('the body is 17px at the defaults, as it always was', async ({ page }) => {
    expect(await fontSize(page, 'body')).toBe(17);
  });

  test('the body follows the base: 1.125rem gives 19.125px', async ({ page }) => {
    await style(page, knobsCss({ '--luz-type-base': '1.125rem' }));
    expect(await fontSize(page, 'body')).toBeCloseTo(19.125, 2);
  });

  test('--luz-text-body is a core setting a theme can point at the base', async ({ page }) => {
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--luz-text-body').trim())).not.toBe('');
    await style(page, ':root { --luz-text-body: var(--luz-text-base); }');
    expect(await fontSize(page, 'body')).toBe(16);
  });
});

test.describe('size knobs: a field is never under 16px on a touch screen', () => {
  test.describe('a coarse pointer, wider than 768px', () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width: 1024, height: 768 } });

    test.beforeEach(async ({ page }) => {
      await page.goto(FIXTURE);
      // The rule that applies is the pointer one, not the width one
      expect(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)).toBe(true);
      expect(await page.evaluate(() => window.matchMedia('(max-width: 768px)').matches)).toBe(false);
    });

    test('a base of 0.875rem is really 14px, and the field is 16px', async ({ page }) => {
      await style(page, knobsCss({ '--luz-type-base': '0.875rem' }));
      expect((await textSizes(page))[STEPS.indexOf('base')]).toBe(14);
      expect(await fontSize(page, '.luz-input')).toBe(16);
    });

    test('a base of 1.25rem makes the field 20px: it follows the base upward', async ({ page }) => {
      await style(page, knobsCss({ '--luz-type-base': '1.25rem' }));
      expect(await fontSize(page, '.luz-input')).toBe(20);
    });

    test('at the defaults the field is 16px', async ({ page }) => {
      expect(await fontSize(page, '.luz-input')).toBe(16);
    });
  });

  test.describe('a fine pointer on a desktop', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(FIXTURE);
      expect(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)).toBe(false);
    });

    test('at the defaults the field is 15px, the UI text size (unchanged)', async ({ page }) => {
      expect(await fontSize(page, '.luz-input')).toBe(15);
    });

    test('a base of 0.875rem gives a 14px field: the touch floor is not applied to a mouse', async ({ page }) => {
      await style(page, knobsCss({ '--luz-type-base': '0.875rem' }));
      expect((await textSizes(page))[STEPS.indexOf('base')]).toBe(14);
      expect(await fontSize(page, '.luz-input')).toBe(14);
    });
  });

  test.describe('a narrow viewport with a fine pointer', () => {
    test.use({ viewport: { width: 375, height: 700 } });

    test('a base of 0.875rem still gives a 16px field', async ({ page }) => {
      await page.goto(FIXTURE);
      await style(page, knobsCss({ '--luz-type-base': '0.875rem' }));
      expect((await textSizes(page))[STEPS.indexOf('base')]).toBe(14);
      expect(await fontSize(page, '.luz-input')).toBe(16);
    });
  });
});
