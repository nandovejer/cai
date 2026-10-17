// @ts-check
/**
 * LUZ docs site — "Try it" and the width selector (F6c), in the browser.
 * The markup the pages carry is tests/docs-try-it.test.js; this file is what
 * apps/docs/reference.js does with it.
 *
 * Try it (Button page): native controls that rewrite the class list of one live
 * button and the code shown under it, which is exactly that button's outerHTML.
 * Written with textContent and classList only: after any interaction the form
 * holds no element and no attribute it did not hold at load, no script and no
 * on* attribute. The copy button copies the code on screen. Without JavaScript
 * the form is not shown (its controls would do nothing); the static example and
 * its markup are.
 *
 * Width (Button, Card, Form fields, Table): Phone / Tablet / Full set
 * --luz-docs-example-w on `.luz-docs-example__frame`; its inline size follows
 * (about 375px, 768px, 100%), never wider than the box it sits in. Full is the
 * default. Hidden without JavaScript. No sideways scroll at 320px with any choice.
 *
 * The no-JS describes set `javaScriptEnabled: false` themselves, so they run in
 * `chromium`; the others skip themselves without JavaScript.
 * Run with: pnpm exec playwright test tests/docs-try-it.spec.js --project=chromium
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routeOf } from './helpers/docs-site.js';
import { faded } from './helpers/settle.js';

const BUTTON = routeOf('c-button');
const THEMES = ['light', 'dark', 'high-contrast'];
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const tryIt = (page) => page.locator('form.docs-try');
const previewOf = (page) => tryIt(page).locator('.docs-try__preview > *');
const codeOf = (page) => tryIt(page).locator('pre.luz-code-block code');
const classesOf = (page) => previewOf(page).evaluate((el) => [...el.classList].sort());

/** Check one control by its label, the way a reader does. */
const choose = async (page, kind, name) => {
  const control = tryIt(page).getByRole(kind, { name, exact: true });
  await expect(control).toBeVisible();
  await control.check();
};

/** The class list the preview must have for a choice. */
const expected = ({ variant = 'primary', size = 'default', block = false } = {}) =>
  ['luz-btn', `luz-btn--${variant}`, ...(size === 'default' ? [] : [`luz-btn--${size}`]), ...(block ? ['luz-btn--block'] : [])].sort();

const LABEL = {
  variant: { primary: 'Primary', secondary: 'Secondary', outline: 'Outline', ghost: 'Ghost', danger: 'Danger' },
  size: { sm: 'Small', default: 'Default', lg: 'Large' },
};

/** Apply a choice through the controls. */
const apply = async (page, choice) => {
  if (choice.variant) await choose(page, 'radio', LABEL.variant[choice.variant]);
  if (choice.size) await choose(page, 'radio', LABEL.size[choice.size]);
  if (choice.block !== undefined) {
    const box = tryIt(page).getByRole('checkbox', { name: 'Fill the width of its container', exact: true });
    await expect(box).toBeVisible();
    await (choice.block ? box.check() : box.uncheck());
  }
};

/** The code on screen is the preview's markup, normalised. */
const expectCodeIsPreview = async (page) => {
  const html = norm(await previewOf(page).evaluate((el) => el.outerHTML));
  expect(norm((await codeOf(page).textContent()) ?? '')).toBe(html);
};

const gotoButton = async (page) => {
  await page.goto(BUTTON);
  await page.waitForLoadState('networkidle');
  // Everything below needs the form: fail on its absence in five seconds, with this message
  await expect(tryIt(page), 'form.docs-try is shown').toBeVisible();
};

test.describe('Try it, with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('is shown in the Example section, after the live demo and before Known issues', async ({ page }) => {
    await gotoButton(page);
    await expect(tryIt(page)).toBeVisible();
    await expect(tryIt(page)).not.toHaveAttribute('hidden', /.*/);
    const order = await page.evaluate(() => {
      const example = document.querySelector('#example ~ .docs-example');
      const form = document.querySelector('form.docs-try');
      const issues = document.getElementById('known-issues');
      const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
      return {
        afterExample: !!(example.compareDocumentPosition(form) & FOLLOWING),
        beforeIssues: !!(form.compareDocumentPosition(issues) & FOLLOWING),
      };
    });
    expect(order).toEqual({ afterExample: true, beforeIssues: true });
  });

  test('has a group with a legend for Variant, Size and Full width, and the defaults checked', async ({ page }) => {
    await gotoButton(page);
    for (const name of ['Variant', 'Size', 'Full width']) {
      await expect(tryIt(page).getByRole('group', { name, exact: true })).toBeVisible();
    }
    await expect(tryIt(page).getByRole('radio', { name: 'Primary', exact: true })).toBeChecked();
    await expect(tryIt(page).getByRole('radio', { name: 'Default', exact: true })).toBeChecked();
    await expect(tryIt(page).getByRole('checkbox', { name: 'Fill the width of its container', exact: true })).not.toBeChecked();
    expect(await classesOf(page)).toEqual(expected());
  });

  test('every control is a native input with an accessible name, and no ARIA role stands in for one', async ({ page }) => {
    await gotoButton(page);
    const inputs = tryIt(page).locator('input');
    expect(await inputs.count()).toBe(9);
    for (let i = 0; i < 9; i++) await expect(inputs.nth(i)).toHaveAccessibleName(/\S/);
    await expect(tryIt(page).getByRole('button', { name: /copy/i })).toHaveCount(1);
    expect(await tryIt(page).locator('[role="radio"], [role="checkbox"], [role="switch"], [role="slider"], [role="listbox"], [role="combobox"]').count()).toBe(0);
    // A radio group is a fieldset with a legend, not a div with a label
    expect(await tryIt(page).locator('fieldset > legend').count()).toBe(3);
  });

  for (const variant of ['secondary', 'outline', 'ghost', 'danger', 'primary']) {
    test(`choosing the ${variant} variant rewrites the preview's class list`, async ({ page }) => {
      await gotoButton(page);
      await choose(page, 'radio', LABEL.variant[variant]);
      expect(await classesOf(page)).toEqual(expected({ variant }));
    });
  }

  for (const size of ['sm', 'lg', 'default']) {
    test(`choosing the ${size} size rewrites the preview's class list`, async ({ page }) => {
      await gotoButton(page);
      await choose(page, 'radio', LABEL.size[size]);
      expect(await classesOf(page)).toEqual(expected({ size }));
    });
  }

  test('the full width adds and removes luz-btn--block', async ({ page }) => {
    await gotoButton(page);
    await apply(page, { block: true });
    expect(await classesOf(page)).toEqual(expected({ block: true }));
    await apply(page, { block: false });
    expect(await classesOf(page)).toEqual(expected());
  });

  test('choices combine: one variant, one size and the full width, and a new variant keeps the others', async ({ page }) => {
    await gotoButton(page);
    await apply(page, { variant: 'danger', size: 'lg', block: true });
    expect(await classesOf(page)).toEqual(expected({ variant: 'danger', size: 'lg', block: true }));
    await apply(page, { variant: 'ghost' });
    expect(await classesOf(page)).toEqual(expected({ variant: 'ghost', size: 'lg', block: true }));
    await apply(page, { size: 'sm' });
    expect(await classesOf(page)).toEqual(expected({ variant: 'ghost', size: 'sm', block: true }));
  });

  test('the preview stays a button that does nothing: type="button", the same label, one element', async ({ page }) => {
    await gotoButton(page);
    const label = await previewOf(page).textContent();
    await apply(page, { variant: 'outline', size: 'lg', block: true });
    await expect(previewOf(page)).toHaveCount(1);
    expect(await previewOf(page).evaluate((el) => el.localName)).toBe('button');
    await expect(previewOf(page)).toHaveAttribute('type', 'button');
    expect(await previewOf(page).textContent()).toBe(label);
  });

  test('the code on screen is the preview markup, at load and after every change', async ({ page }) => {
    await gotoButton(page);
    await expectCodeIsPreview(page);
    for (const choice of [
      { variant: 'secondary' },
      { size: 'sm' },
      { variant: 'ghost', size: 'lg', block: true },
      { variant: 'danger', size: 'default', block: false },
      { variant: 'primary' },
    ]) {
      await apply(page, choice);
      await expectCodeIsPreview(page);
    }
    // And it names what was chosen, in plain text a reader can copy
    await apply(page, { variant: 'outline', size: 'sm', block: true });
    const code = (await codeOf(page).textContent()) ?? '';
    for (const cls of ['luz-btn', 'luz-btn--outline', 'luz-btn--sm', 'luz-btn--block']) expect(code).toContain(cls);
    expect(code).not.toContain('luz-btn--primary');
  });

  test('the copy button sits next to the code and copies the code on screen, at load and after a change', async ({ page }) => {
    await gotoButton(page);
    const copy = tryIt(page).getByRole('button', { name: /copy/i });
    await expect(copy).toBeVisible();
    // It points at the code it copies
    const target = await copy.getAttribute('data-copy-from');
    expect(target).toBeTruthy();
    expect(await codeOf(page).getAttribute('id')).toBe(target);

    const first = ((await codeOf(page).textContent()) ?? '').trim();
    await copy.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(first);

    await apply(page, { variant: 'outline', size: 'sm', block: true });
    const now = ((await codeOf(page).textContent()) ?? '').trim();
    expect(now).toContain('luz-btn--outline');
    await copy.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(now);
  });

  test('writes with textContent and classList only: nothing new in the form, no script, no on* attribute', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await gotoButton(page);
    const inventory = () => tryIt(page).evaluate((form) => {
      const els = [form, ...form.querySelectorAll('*')];
      return {
        tags: [...new Set(els.map((e) => e.localName))].sort(),
        attributes: [...new Set(els.flatMap((e) => [...e.attributes].map((a) => a.name)))].sort(),
        scripts: form.querySelectorAll('script').length,
        handlers: els.flatMap((e) => [...e.attributes].filter((a) => /^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)).map((a) => a.name)),
      };
    });
    const before = await inventory();
    for (const choice of [{ variant: 'danger', size: 'lg', block: true }, { variant: 'ghost', size: 'sm', block: false }, { variant: 'secondary' }]) {
      await apply(page, choice);
    }
    const after = await inventory();
    expect(after.scripts).toBe(0);
    expect(after.handlers).toEqual([]);
    expect(before.handlers).toEqual([]);
    // Every tag and attribute name after is one the form had before
    expect(after.tags.filter((t) => !before.tags.includes(t))).toEqual([]);
    expect(after.attributes.filter((a) => !before.attributes.includes(a))).toEqual([]);
    // The code block holds text, not elements the reader did not get from the markup
    const codeChildren = await codeOf(page).evaluate((code) => [...code.querySelectorAll('*')].map((e) => e.localName));
    expect(codeChildren.filter((t) => t !== 'span')).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('arrow keys move inside a radio group and change the preview as they go', async ({ page }) => {
    await gotoButton(page);
    await tryIt(page).getByRole('radio', { name: 'Primary', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tryIt(page).getByRole('radio', { name: 'Secondary', exact: true })).toBeFocused();
    await expect(tryIt(page).getByRole('radio', { name: 'Secondary', exact: true })).toBeChecked();
    expect(await classesOf(page)).toEqual(expected({ variant: 'secondary' }));
    await page.keyboard.press('ArrowDown');
    await expect(tryIt(page).getByRole('radio', { name: 'Outline', exact: true })).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(tryIt(page).getByRole('radio', { name: 'Secondary', exact: true })).toBeChecked();
    // The group wraps, as every native radio group does
    await tryIt(page).getByRole('radio', { name: 'Danger', exact: true }).check();
    await page.keyboard.press('ArrowRight');
    await expect(tryIt(page).getByRole('radio', { name: 'Primary', exact: true })).toBeChecked();
    await expectCodeIsPreview(page);
  });

  test('Tab goes from the Variant group to the Size group to the full width to Copy, one stop each', async ({ page }) => {
    await gotoButton(page);
    await tryIt(page).getByRole('radio', { name: 'Primary', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(tryIt(page).getByRole('radio', { name: 'Default', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(tryIt(page).getByRole('checkbox', { name: 'Fill the width of its container', exact: true })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(previewOf(page)).toHaveClass(/luz-btn--block/);
    await page.keyboard.press('Tab');
    // Any stop between the checkbox and Copy is the code block, which scrolls and is a region
    const stops = [];
    for (let i = 0; i < 3; i++) {
      stops.push(await page.evaluate(() => document.activeElement?.className ?? ''));
      if (/luz-copy-btn/.test(stops.at(-1))) break;
      await page.keyboard.press('Tab');
    }
    expect(stops.some((c) => /luz-copy-btn/.test(c)), `reached Copy, stops: ${stops.join(' | ')}`).toBe(true);
  });

  test('Enter on a control does not submit the form or leave the page', async ({ page }) => {
    await gotoButton(page);
    const url = page.url();
    await page.evaluate(() => {
      // Bubbles to window after the form's own listeners: the final state of the event
      window.addEventListener('submit', (e) => { window.__tryItSubmit = e.defaultPrevented; });
    });
    await tryIt(page).getByRole('radio', { name: 'Secondary', exact: true }).focus();
    await page.keyboard.press('Enter');
    await tryIt(page).getByRole('checkbox', { name: 'Fill the width of its container', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.waitForLoadState('load');
    expect(page.url()).toBe(url);
    // Either no submit event at all, or one whose default was prevented
    expect(await page.evaluate(() => window.__tryItSubmit)).not.toBe(false);
  });

  for (const theme of THEMES) {
    test(`has no serious or critical axe violation in ${theme}, with Try it shown and a choice made`, async ({ page }) => {
      await gotoButton(page);
      await expect(tryIt(page)).toBeVisible();
      await apply(page, { variant: 'ghost', size: 'lg', block: true });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await faded(page);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .include('form.docs-try')
        .analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
    });
  }
});

test.describe('Try it, without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the form is in the page but not shown, and none of its controls can be reached', async ({ page }) => {
    await page.goto(BUTTON);
    await expect(tryIt(page)).toHaveCount(1);
    await expect(tryIt(page)).toHaveAttribute('hidden', /.*/);
    await expect(tryIt(page)).toBeHidden();
    for (const input of await tryIt(page).locator('input').all()) await expect(input).toBeHidden();
    await expect(tryIt(page).locator('.luz-copy-btn')).toBeHidden();
  });

  test('the static example and its markup still show', async ({ page }) => {
    await page.goto(BUTTON);
    await expect(page.locator('#example ~ .docs-example').first()).toBeVisible();
    await expect(page.locator('#example ~ .docs-example').first().getByRole('button', { name: 'Primary', exact: true })).toBeVisible();
    for (const id of ['code-button', 'code-button-link', 'code-button-block']) await expect(page.locator(`#${id}`)).toBeVisible();
  });
});

/* ---- The width selector ------------------------------------------------- */

const PAGES = [['c-button', 'Button'], ['c-card', 'Card'], ['c-form', 'Form fields'], ['c-table', 'Table']];
const PHONE = 375;
const TABLET = 768;
const TOLERANCE = 8;

const exampleOf = (page) => page.locator('#example ~ .docs-example').first();
const frameOf = (page) => exampleOf(page).locator('.luz-docs-example__frame').first();
const widthGroup = (page) => exampleOf(page).getByRole('group', { name: 'Width', exact: true });
/** A width radio, once its group is shown (fails in five seconds, not thirty, when it is not). */
const widthRadio = async (page, name) => {
  const radio = widthGroup(page).getByRole('radio', { name, exact: true });
  await expect(radio).toBeVisible();
  return radio;
};
/** The fieldset of the selector in the markup, whether shown or not: not the demo's own fieldsets. */
const widthSet = (page) => exampleOf(page).locator('fieldset', { has: page.locator('legend', { hasText: /^Width$/ }) });
/** The frame's inline size, and the room it has: its parent's content box. */
const sizes = async (page) => {
  await expect(frameOf(page), 'div.luz-docs-example__frame in the first .docs-example').toHaveCount(1);
  return measure(page);
};
const measure = (page) => frameOf(page).evaluate((frame) => {
  const parent = frame.parentElement;
  const s = getComputedStyle(parent);
  return {
    frame: frame.getBoundingClientRect().width,
    room: parent.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight),
    custom: frame.style.getPropertyValue('--luz-docs-example-w').trim(),
  };
});
const near = (actual, wanted) => Math.abs(actual - wanted) <= TOLERANCE;

test.describe('the width selector, with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const [id, title] of PAGES) {
    test.describe(`on ${title}`, () => {
      test('is a group "Width" in the Example frame with Phone, Tablet and Full, Full chosen', async ({ page }) => {
        await page.goto(routeOf(id));
        await page.waitForLoadState('networkidle');
        await expect(widthGroup(page)).toBeVisible();
        for (const name of ['Phone', 'Tablet', 'Full']) {
          await expect(widthGroup(page).getByRole('radio', { name, exact: true })).toBeVisible();
          await expect(widthGroup(page).getByRole('radio', { name, exact: true })).toHaveAccessibleName(name);
        }
        await expect(widthGroup(page).getByRole('radio', { name: 'Full', exact: true })).toBeChecked();
        await expect(frameOf(page)).toHaveCount(1);
        // The demo is inside the frame
        expect(await frameOf(page).locator('.docs-demo__stage').count()).toBeGreaterThan(0);
      });

      test('Full fills the room it has; Phone is about 375px; Tablet is about 768px, never wider than the room', async ({ page }) => {
        await page.goto(routeOf(id));
        await page.waitForLoadState('networkidle');
        const full = await sizes(page);
        expect(near(full.frame, full.room), `Full: ${full.frame} of ${full.room}`).toBe(true);

        await (await widthRadio(page, 'Phone')).check();
        const phone = await sizes(page);
        expect(phone.custom, 'the property is set on the frame').not.toBe('');
        expect(near(phone.frame, Math.min(PHONE, phone.room)), `Phone: ${phone.frame}`).toBe(true);
        expect(phone.frame).toBeLessThan(full.frame);

        await (await widthRadio(page, 'Tablet')).check();
        const tablet = await sizes(page);
        expect(tablet.custom).not.toBe('');
        expect(near(tablet.frame, Math.min(TABLET, tablet.room)), `Tablet: ${tablet.frame} of ${tablet.room}`).toBe(true);
        expect(tablet.frame).toBeLessThanOrEqual(tablet.room + 1);
        expect(tablet.frame).toBeGreaterThan(phone.frame);

        await (await widthRadio(page, 'Full')).check();
        const back = await sizes(page);
        expect(near(back.frame, back.room), `Full again: ${back.frame}`).toBe(true);
        expect(['', '100%']).toContain(back.custom);
      });

      test('the arrow keys move inside the group and the frame follows', async ({ page }) => {
        await page.goto(routeOf(id));
        await page.waitForLoadState('networkidle');
        await (await widthRadio(page, 'Full')).focus();
        await page.keyboard.press('ArrowLeft');
        await expect(widthGroup(page).getByRole('radio', { name: 'Tablet', exact: true })).toBeFocused();
        await page.keyboard.press('ArrowLeft');
        await expect(widthGroup(page).getByRole('radio', { name: 'Phone', exact: true })).toBeChecked();
        const { frame, room } = await sizes(page);
        expect(near(frame, Math.min(PHONE, room))).toBe(true);
      });

      test('keeps the page from scrolling sideways at 320px with any choice', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 700 });
        await page.goto(routeOf(id));
        await page.waitForLoadState('networkidle');
        for (const name of ['Phone', 'Tablet', 'Full']) {
          await (await widthRadio(page, name)).check();
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, name).toBeLessThanOrEqual(0);
          const { frame } = await sizes(page);
          expect(frame, `${name}: the frame fits the viewport`).toBeLessThanOrEqual(320);
        }
      });
    });
  }

  test('the Button frame holds the --block demo, which follows the frame', async ({ page }) => {
    await page.goto(BUTTON);
    await page.waitForLoadState('networkidle');
    const block = frameOf(page).locator('.luz-btn--block').first();
    await (await widthRadio(page, 'Phone')).check();
    const phone = (await block.boundingBox())?.width ?? 0;
    await (await widthRadio(page, 'Full')).check();
    const full = (await block.boundingBox())?.width ?? 0;
    expect(phone).toBeLessThanOrEqual(PHONE + TOLERANCE);
    expect(full).toBeGreaterThan(0);
  });
});

test.describe('the width selector, without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });

  for (const [id, title] of PAGES) {
    test(`on ${title} it is in the page but not shown, and the example fills its room`, async ({ page }) => {
      await page.goto(routeOf(id));
      const set = widthSet(page);
      await expect(set).toHaveCount(1);
      await expect(set).toHaveAttribute('hidden', /.*/);
      await expect(set).toBeHidden();
      await expect(frameOf(page)).toHaveCount(1);
      const { frame, room } = await sizes(page);
      expect(near(frame, room), `${frame} of ${room}`).toBe(true);
    });

    test(`on ${title} the page does not scroll sideways at 320px`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(routeOf(id));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
