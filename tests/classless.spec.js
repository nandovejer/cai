// @ts-check
/**
 * The classless layer (packages/core/src/classless/_classless.css) gives a
 * bare button, text field, textarea, select and table the look of its
 * component, inside [data-cai-classless] only, at specificity 0.
 *
 * It is written by hand next to the components, so this file is what keeps
 * the two from drifting: each bare element is compared, property by
 * property, with the component that is its reference.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/classless.html';

/** Computed values of `props` for the element with this id. */
const read = (page, id, props) =>
  page.locator(`#${id}`).evaluate((el, list) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(list.map((p) => [p, cs.getPropertyValue(p)]));
  }, props);

async function expectParity(page, bare, reference, props) {
  const [a, b] = [await read(page, bare, props), await read(page, reference, props)];
  expect(a, `#${bare} against #${reference}`).toEqual(b);
}

const BOX = ['display', 'min-height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width', 'border-bottom-width', 'border-top-style', 'border-bottom-style', 'border-bottom-color', 'border-top-color', 'border-radius'];
const TYPE = ['font-family', 'font-size', 'font-weight', 'color', 'background-color', 'cursor', 'text-decoration-line', 'white-space', 'opacity'];

test.describe('classless: the same look as the component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
  });

  test('a bare button is the secondary button', async ({ page }) => {
    await expectParity(page, 'button', 'ref-button', [...BOX, ...TYPE, 'gap', 'justify-content', 'align-items']);
  });

  test('type="submit" is the primary button, and a reset input is a button too', async ({ page }) => {
    await expectParity(page, 'submit', 'ref-submit', [...BOX, ...TYPE]);
    const bg = await read(page, 'submit', ['background-color']);
    const secondary = await read(page, 'button', ['background-color']);
    expect(bg['background-color']).not.toBe(secondary['background-color']);
    await expectParity(page, 'input-button', 'ref-button', [...BOX.filter((p) => p !== 'display'), ...TYPE.filter((p) => p !== 'cursor' && p !== 'font-family')]);
  });

  test('a disabled button keeps the dashed outline of the component', async ({ page }) => {
    await expectParity(page, 'button-disabled', 'ref-button-disabled', [...BOX, 'color', 'background-color', 'cursor', 'pointer-events']);
  });

  test('a bare button shows the focus ring and the hover colour', async ({ page }) => {
    await page.locator('#button').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await read(page, 'button', ['outline-style', 'outline-width', 'outline-offset']);
    const ref = await page.locator('#ref-button').focus().then(() => page.keyboard.press('Shift+Tab')).then(() => page.keyboard.press('Tab')).then(() => read(page, 'ref-button', ['outline-style', 'outline-width', 'outline-offset']));
    expect(ring['outline-style']).toBe('solid');
    expect(ring).toEqual(ref);
    await page.locator('#button').hover();
    await page.waitForTimeout(250);
    const hover = await read(page, 'button', ['background-color', 'color']);
    await page.locator('#ref-button').hover();
    await page.waitForTimeout(250);
    expect(hover).toEqual(await read(page, 'ref-button', ['background-color', 'color']));
  });

  test('a text field, a date field and a textarea are the input', async ({ page }) => {
    const props = [...BOX.filter((p) => p !== 'min-height'), ...TYPE, 'height', 'width', 'color-scheme'];
    await expectParity(page, 'input', 'ref-input', props);
    await expectParity(page, 'input-email', 'ref-input', props);
    await expectParity(page, 'input-date', 'ref-input-date', props);
    await expectParity(page, 'input-readonly', 'ref-input-readonly', props);
    await expectParity(page, 'input-disabled', 'ref-input-disabled', props);
    await expectParity(page, 'textarea', 'ref-textarea', [...props, 'min-height', 'resize']);
  });

  test('the date picker follows the colour mode', async ({ page }) => {
    for (const mode of ['light', 'high-contrast', 'dark']) {
      await page.evaluate((m) => (document.documentElement.dataset.theme = m), mode);
      await expectParity(page, 'input-date', 'ref-input-date', ['color-scheme']);
    }
  });

  test('a select has the closed box of .cai-select', async ({ page }) => {
    // The open list of the component needs appearance: base-select; only the closed box is compared
    const props = ['min-block-size', 'padding-top', 'padding-bottom', 'padding-left', 'border-top-width', 'border-bottom-width', 'border-bottom-style', 'border-bottom-color', 'border-radius', 'color', 'font-family', 'font-size', 'cursor', 'color-scheme', 'inline-size'];
    await expectParity(page, 'select', 'ref-select', props);
    const multiple = ['border-top-width', 'border-bottom-width', 'border-top-color', 'background-image', 'padding-inline-end'];
    await expectParity(page, 'select-multiple', 'ref-select-multiple', multiple);
  });

  test('a table has the look of .cai-table, and no scroll box of its own', async ({ page }) => {
    await expectParity(page, 'table', 'ref-table', ['width', 'border-collapse', 'font-family', 'font-size']);
    for (const part of ['caption', 'thead th', 'tbody td']) {
      const pick = (id) => page.locator(`#${id} ${part}`).first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return ['padding-top', 'padding-left', 'font-size', 'font-weight', 'color', 'background-color', 'border-bottom-width', 'text-align', 'white-space'].map((p) => cs.getPropertyValue(p));
      });
      expect(await pick('table'), part).toEqual(await pick('ref-table'));
    }
    const box = await read(page, 'table', ['display', 'overflow-x']);
    expect(box.display).toBe('table');
    expect(box['overflow-x']).toBe('visible');
  });
});

test.describe('classless: the scope', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
  });

  test('elements outside [data-cai-classless] are untouched', async ({ page }) => {
    expect((await read(page, 'out-button', ['min-height', 'padding-left', 'background-color']))['padding-left']).not.toBe(
      (await read(page, 'button', ['padding-left']))['padding-left'],
    );
    expect((await read(page, 'out-input', ['border-bottom-width']))['border-bottom-width']).toBe('2px');
    expect((await read(page, 'out-select', ['appearance']))['appearance']).not.toBe('none');
    expect((await read(page, 'out-table', ['border-collapse']))['border-collapse']).toBe('separate');
  });

  test('an element with a CAI class is left to its component', async ({ page }) => {
    // The button of a component is the component's, not the secondary button
    const copy = await read(page, 'copy', ['min-height', 'padding-left']);
    const bare = await read(page, 'button', ['min-height', 'padding-left']);
    expect(copy).not.toEqual(bare);
    await expectParity(page, 'field-input', 'ref-input', ['height', 'padding-left', 'border-bottom-width', 'font-size']);
  });

  test('specificity is zero: an unlayered selector of any kind wins', async ({ page }) => {
    await page.addStyleTag({ content: 'button { min-height: 10px; }' });
    expect((await read(page, 'button', ['min-height']))['min-height']).toBe('10px');
  });

  test('the attribute can sit on any element: only its descendants change', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('scope').removeAttribute('data-cai-classless');
      document.getElementById('outside').setAttribute('data-cai-classless', '');
    });
    const outside = await read(page, 'out-button', ['min-height']);
    const inside = await read(page, 'button', ['min-height']);
    expect(outside['min-height']).toBe(await read(page, 'ref-button', ['min-height']).then((r) => r['min-height']));
    expect(inside['min-height']).not.toBe(outside['min-height']);
  });

  test('forced colors: the select keeps its box and its arrow, in system colors', async ({ page, browserName }) => {
    // forced-color-adjust is not in Safari (MDN browser-compat-data): nothing to read there
    test.skip(browserName === 'webkit', 'forced-color-adjust is not supported in WebKit');
    await page.emulateMedia({ forcedColors: 'active' });
    const sel = await read(page, 'select', ['border-top-width', 'forced-color-adjust', 'background-image', 'background-color']);
    expect(sel['border-top-width']).toBe('1px');
    // The arrow is a gradient: the box opts out of the adjustment so it stays
    expect(sel['forced-color-adjust']).toBe('none');
    expect(sel['background-image']).toContain('linear-gradient');
    expect(sel['background-color']).toBe('rgb(255, 255, 255)');
  });

  test('right-to-left: the arrow and its room move to the start side', async ({ page }) => {
    const ltr = await read(page, 'select', ['background-position-x', 'padding-left', 'padding-right']);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const rtl = await read(page, 'select', ['background-position-x', 'padding-left', 'padding-right']);
    // Left to right the arrow is placed from the right edge, with room on the right
    expect(ltr['background-position-x']).toContain('%');
    expect(parseFloat(ltr['padding-right'])).toBeGreaterThan(parseFloat(ltr['padding-left']));
    // Right to left it is placed from the left edge, with room on the left
    expect(rtl['background-position-x']).toMatch(/^[\d.]+px, [\d.]+px$/);
    expect(parseFloat(rtl['padding-left'])).toBeGreaterThan(parseFloat(rtl['padding-right']));
  });
});
