// @ts-check
/**
 * LUZ — the sizes demo of "Make it yours" (F4 step 8, spec
 * f4-customisation.md 3.1, decision D6).
 *
 * Two <input type="range"> (the base, 0.875 to 1.25 in steps of 0.0625, and
 * the ratio, 1.125 to 1.5 in steps of 0.025) and a native reset button write
 * `--luz-type-base` and `--luz-type-ratio` on `document.documentElement.style`
 * (`initSizesDemo()` in apps/docs/reference.js). It re-scales the docs page
 * itself: that is the point. Nothing is stored. The form sits in a <template>
 * of the `#sizes` section, so without JavaScript it is not in the page, and
 * the table of presets is what the reader has.
 *
 * Expected sizes are computed with `evalLength` over tokens.json (never
 * typed). Runs in `chromium` (the demo) and `chromium-nojs` (the table).
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { evalLength } from './helpers/design-tokens.js';
import { STEPS } from './helpers/scale-golden.js';

const ROUTE = '/docs/get-started/make-it-yours/';
const THEMES = ['light', 'dark', 'high-contrast'];

const tokens = JSON.parse(readFileSync(new URL('../packages/tokens/tokens.json', import.meta.url), 'utf-8'));
const settings = readFileSync(new URL('../packages/core/src/settings/_settings.css', import.meta.url), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
const BODY_FORMULA = settings.match(/--luz-text-body\s*:\s*([^;]+);/)?.[1].trim() ?? '';

const scope = (knobs = {}) => ({
  ...Object.fromEntries(Object.entries(tokens.typography).map(([key, t]) => [`--luz-${key}`, t.fromRounded ?? t.from ?? t.value])),
  ...knobs,
});
/** The nine steps in px at a 16px root, with these knobs. */
const expectedSteps = (knobs) => STEPS.map((s) => evalLength(`var(--luz-text-${s})`, scope(knobs)));
const expectedBody = (knobs) => evalLength(BODY_FORMULA, scope(knobs));

// The ranges the page is built on (spec 1.9 and 3.1; tests/make-it-yours.test.js pins the markup)
const form = (page) => page.locator('main form.docs-example:has(input[type="range"])');
const baseRange = (page) => form(page).locator('input[type="range"][min="0.875"]');
const ratioRange = (page) => form(page).locator('input[type="range"][min="1.125"]');
const resetButton = (page) => form(page).locator('button[type="reset"]');

/** The computed size of each step, read from probes that read the tokens, so what the page paints is what is measured. */
const stepSizes = (page) =>
  page.evaluate((steps) => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const sizes = steps.map((s) => {
      probe.style.fontSize = `var(--luz-text-${s})`;
      return parseFloat(getComputedStyle(probe).fontSize);
    });
    probe.remove();
    return sizes;
  }, STEPS);

const bodySize = (page) => page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
const inline = (page, name) => page.evaluate((n) => document.documentElement.style.getPropertyValue(n), name);

async function ready(page) {
  await page.goto(ROUTE);
  await page.waitForLoadState('networkidle');
  await expect(form(page)).toBeVisible();
}

const close = (actual, wanted) => {
  expect(actual).toHaveLength(wanted.length);
  actual.forEach((v, i) => expect(v, `step ${STEPS[i]}`).toBeCloseTo(wanted[i], 1));
};

test.describe('the sizes demo', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');

  test('is shown in the sizes section: two named ranges and a reset button, as a docs specimen', async ({ page }) => {
    await ready(page);
    await expect(form(page)).toHaveCount(1);
    await expect(form(page).locator('input[type="range"]')).toHaveCount(2);
    await expect(baseRange(page)).toHaveAccessibleName(/\S/);
    await expect(ratioRange(page)).toHaveAccessibleName(/\S/);
    await expect(resetButton(page)).toHaveAccessibleName('Reset sizes');
    await expect(form(page)).toHaveAttribute('data-docs-specimen', '');
    // In the sizes section: after its h2 and before the next one
    const order = await page.evaluate(() => {
      const f = document.querySelector('main form.docs-example');
      const before = document.getElementById('sizes');
      const after = document.getElementById('corners');
      return [!!(before.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING), !!(f.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING)];
    });
    expect(order).toEqual([true, true]);
  });

  test('the ranges start at the defaults, and nothing is set on the page yet', async ({ page }) => {
    await ready(page);
    expect(Number(await baseRange(page).inputValue())).toBe(parseFloat(tokens.typography['type-base'].value));
    expect(Number(await ratioRange(page).inputValue())).toBe(parseFloat(tokens.typography['type-ratio'].value));
    expect(await inline(page, '--luz-type-base')).toBe('');
    expect(await inline(page, '--luz-type-ratio')).toBe('');
    close(await stepSizes(page), expectedSteps({}));
  });

  test('moving the base re-scales the page itself: every step and the body text', async ({ page }) => {
    await ready(page);
    await baseRange(page).fill('1.25');
    expect(await inline(page, '--luz-type-base')).toBe('1.25rem');
    const knobs = { '--luz-type-base': '1.25rem' };
    close(await stepSizes(page), expectedSteps(knobs));
    expect(await bodySize(page)).toBeCloseTo(expectedBody(knobs), 1);
    // And it is not the defaults any more
    expect(await bodySize(page)).toBeGreaterThan(expectedBody({}));
  });

  test('moving the ratio changes the steps above the base and leaves the base alone', async ({ page }) => {
    await ready(page);
    await ratioRange(page).fill('1.5');
    expect(await inline(page, '--luz-type-ratio')).toBe('1.5');
    const sizes = await stepSizes(page);
    close(sizes, expectedSteps({ '--luz-type-ratio': '1.5' }));
    expect(sizes[STEPS.indexOf('base')]).toBe(evalLength(tokens.typography['type-base'].value, {}));
  });

  test('both knobs together', async ({ page }) => {
    await ready(page);
    await baseRange(page).fill('0.875');
    await ratioRange(page).fill('1.125');
    const knobs = { '--luz-type-base': '0.875rem', '--luz-type-ratio': '1.125' };
    close(await stepSizes(page), expectedSteps(knobs));
    expect(await bodySize(page)).toBeCloseTo(expectedBody(knobs), 1);
  });

  test('each range has an <output> that shows its value', async ({ page }) => {
    await ready(page);
    await baseRange(page).fill('1.125');
    await ratioRange(page).fill('1.375');
    const outputs = form(page).locator('output');
    await expect(outputs).toHaveCount(2);
    await expect(outputs.nth(0)).toContainText('1.125');
    await expect(outputs.nth(1)).toContainText('1.375');
  });

  test('Reset sizes clears the properties it set, and the ranges go back to the defaults', async ({ page }) => {
    await ready(page);
    await baseRange(page).fill('1.25');
    await ratioRange(page).fill('1.5');
    expect(await inline(page, '--luz-type-base')).not.toBe('');
    await resetButton(page).click();
    await expect.poll(() => inline(page, '--luz-type-base')).toBe('');
    expect(await inline(page, '--luz-type-ratio')).toBe('');
    expect(await page.evaluate(() => document.documentElement.getAttribute('style') ?? '')).not.toContain('--luz-type');
    close(await stepSizes(page), expectedSteps({}));
    expect(await bodySize(page)).toBeCloseTo(expectedBody({}), 1);
    expect(Number(await baseRange(page).inputValue())).toBe(parseFloat(tokens.typography['type-base'].value));
    expect(Number(await ratioRange(page).inputValue())).toBe(parseFloat(tokens.typography['type-ratio'].value));
  });

  test('the keyboard moves a range and the page follows', async ({ page }) => {
    await ready(page);
    await baseRange(page).focus();
    await page.keyboard.press('End');
    expect(await inline(page, '--luz-type-base')).toBe('1.25rem');
    await page.keyboard.press('Home');
    expect(await inline(page, '--luz-type-base')).toBe('0.875rem');
  });

  test('nothing is stored: a reload starts from the defaults and no storage key appears', async ({ page }) => {
    await ready(page);
    const keys = () => page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage), document.cookie]);
    const before = await keys();
    await baseRange(page).fill('1.25');
    expect(await keys()).toEqual(before);
    await page.reload();
    await expect(form(page)).toBeVisible();
    expect(await inline(page, '--luz-type-base')).toBe('');
    close(await stepSizes(page), expectedSteps({}));
  });

  test('the presets table is still there with JavaScript', async ({ page }) => {
    await ready(page);
    const table = page.locator('main table.luz-table:has(caption:text-is("Type sizes at 16px root"))');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(5);
  });

  for (const theme of THEMES) {
    test(`axe: the page with the demo moved, in ${theme}`, async ({ page }) => {
      await ready(page);
      await baseRange(page).fill('1.25');
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(
        blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target?.join(' ')}`),
        'serious/critical axe violations',
      ).toEqual([]);
    });
  }
});

test.describe('the sizes section without JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled !== false, 'the no-JS project only');

  test('the demo is not in the page: no range, no reset button, nothing hidden', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('main input[type="range"]')).toHaveCount(0);
    await expect(page.locator('main button[type="reset"]')).toHaveCount(0);
    await expect(form(page)).toHaveCount(0);
    await expect(page.locator('main [hidden]')).toHaveCount(0);
    // The demo is waiting in a <template>, which no browser shows
    expect(await page.locator('main template').count()).toBeGreaterThan(0);
  });

  test('the presets table shows the five presets and nine steps', async ({ page }) => {
    await page.goto(ROUTE);
    const table = page.locator('main table.luz-table:has(caption:text-is("Type sizes at 16px root"))');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(5);
    await expect(table.locator('thead th')).toHaveCount(STEPS.length + 1);
  });

  test('the nine sections are all there', async ({ page }) => {
    await page.goto(ROUTE);
    for (const id of ['how', 'colour', 'fonts', 'sizes', 'corners', 'shadows', 'component', 'icons', 'limits']) {
      await expect(page.locator(`h2#${id}`), id).toBeVisible();
    }
  });
});
