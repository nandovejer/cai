// @ts-check
/**
 * Core's layout objects that every page of every kind needs
 * (.claude/plans/specs/f3-package-model.md, §1.4 and §9 step 3):
 * `.o-page`, `.o-container--inline`, `.o-sticky` (with `--luz-bar-h`),
 * `.o-grid--split` and `.o-actions`, on a page of their own
 * (tests/fixtures/objects.html: core's CSS and a kind's skin, no site).
 * The `.o-sticky` cases are the ones of the old site header
 * (tests/site-header.spec.js, H1 and H2 of
 * .claude/plans/specs/platform-site-header.md), retargeted.
 * Every size is read from the tokens in the page, never typed here.
 * Runs in `chromium` and `chromium-nojs`: the objects are CSS only.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIXTURE = '/tests/fixtures/objects.html';
const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

/** Resolve a CSS length expression (`var(--luz-space-md)`, `calc(...)`) to pixels, in the page. */
const px = (page, expression, onRoot = false) =>
  page.evaluate(([value, root]) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${value}`;
    (root ? document.documentElement : document.body).append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, [expression, onRoot]);

const box = (page, selector) =>
  page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, selector);

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('objects: --luz-bar-h', () => {
  test('is a one-row bar of 44px controls: a control, one 8px gap and the 1px border', async ({ page }) => {
    await page.goto(FIXTURE);
    const declared = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--luz-bar-h').trim());
    expect(declared, '--luz-bar-h is declared by core').not.toBe('');
    const expected = await px(page, 'calc(var(--luz-control-lg) + var(--luz-space-xs) + 1px)');
    expect(await px(page, 'var(--luz-bar-h)')).toBeCloseTo(expected, 1);
  });
});

test.describe('objects: .o-page', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto(FIXTURE);
  });

  test('is a column at least as tall as the window, and takes any number of bands before the header', async ({ page }) => {
    // A short page: the long content of the fixture is not needed here
    await page.evaluate(() => document.getElementById('fields').remove());
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.getElementById('page'));
      return { display: s.display, direction: s.flexDirection };
    });
    expect(style.display).toBe('flex');
    expect(style.direction).toBe('column');
    expect((await box(page, '#page')).height).toBeGreaterThanOrEqual(800 - 0.5);

    // The two bands, the header, the main area and the footer follow one another, each the width of the page
    const stack = ['#band-1', '#band-2', '#hdr', '#top', '#footer'];
    let previousBottom = 0;
    for (const selector of stack) {
      const b = await box(page, selector);
      expect(b.top, `${selector} starts where the one before it ends`).toBeGreaterThanOrEqual(previousBottom - 0.5);
      expect(b.width, `${selector} is as wide as the page`).toBeCloseTo(1000, 0);
      previousBottom = b.bottom;
    }
  });

  test('on a short page the main area grows and the footer rests on the bottom of the window', async ({ page }) => {
    await page.evaluate(() => document.getElementById('fields').remove());
    const grow = await page.evaluate(() => {
      const s = getComputedStyle(document.getElementById('top'));
      return { grow: s.flexGrow, shrink: s.flexShrink };
    });
    expect(grow.grow).toBe('1');
    expect(grow.shrink).toBe('0');
    const footer = await box(page, '#footer');
    expect(footer.bottom).toBeCloseTo(800, 0);
    // The main area is what gives: it fills the rest of the window between the header and the footer
    const [hdr, main] = [await box(page, '#hdr'), await box(page, '#top')];
    expect(main.top).toBeCloseTo(hdr.bottom, 0);
    expect(main.bottom).toBeCloseTo(footer.top, 0);
  });

  test('on a long page the footer follows the content, below the window', async ({ page }) => {
    const footer = await box(page, '#footer');
    expect(footer.top).toBeGreaterThan(800);
    expect(footer.top).toBeCloseTo((await box(page, '#top')).bottom, 0);
  });
});

test.describe('objects: .o-container--inline', () => {
  for (const [label, width, gutter] of [
    ['641px and up: the large gutter', 1000, 'var(--luz-space-xl)'],
    ['640px and below: the medium gutter', 320, 'var(--luz-space-md)'],
  ]) {
    test(`takes no block padding and the page's gutters on the inline axis, ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(FIXTURE);
      const padding = await page.evaluate(() => {
        const s = getComputedStyle(document.getElementById('inline'));
        return { top: s.paddingTop, bottom: s.paddingBottom, left: parseFloat(s.paddingLeft), right: parseFloat(s.paddingRight) };
      });
      expect(padding.top).toBe('0px');
      expect(padding.bottom).toBe('0px');
      const expected = await px(page, gutter);
      expect(padding.left).toBeCloseTo(expected, 1);
      expect(padding.right).toBeCloseTo(expected, 1);
    });
  }

  for (const width of [320, 1000, 2560]) {
    test(`at ${width}px its content starts where the content of a plain .o-container starts`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(FIXTURE);
      const [plain, inline] = [await box(page, '#plain-first'), await box(page, '#inline-first')];
      expect(inline.left).toBeCloseTo(plain.left, 0);
      // The bar's row starts there too
      expect((await box(page, '#brand')).left).toBeCloseTo(plain.left, 0);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('objects: .o-sticky', () => {
  test('sticks to the top of the window, above the page, only in a window at least 30rem tall', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await page.goto(FIXTURE);
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.getElementById('hdr'));
      const overlay = getComputedStyle(document.documentElement).getPropertyValue('--luz-z-overlay').trim();
      return { position: s.position, top: s.top, zIndex: s.zIndex, overlay };
    });
    expect(style.position).toBe('sticky');
    expect(style.top).toBe('0px');
    expect(style.zIndex).toBe(style.overlay);
    await page.setViewportSize({ width: 800, height: 400 });
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('hdr')).position)).toBe('static');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), 'no scroll padding without the bar').toBe('auto');
  });

  test('stays on screen while the page scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await page.goto(FIXTURE);
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    expect((await box(page, '#hdr')).top).toBeCloseTo(0, 0);
  });

  test('H1, H2: the scroll padding of the page is a length, at least 3.5em, and a field under the bar is scrolled clear', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto(FIXTURE);
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
    // 3.5em (56px) + half a 44px control: WebKit puts a focused field at the padding minus half its height
    expect(padding, 'not auto, with half a control added').toBeGreaterThanOrEqual(78);

    const noted = new Set();
    for (const scale of ['100%', '200%', '300%']) {
      // No smooth scrolling: the test reads the place where the browser leaves the field
      await page.evaluate((s) => {
        document.documentElement.style.fontSize = s;
        document.documentElement.style.scrollBehavior = 'auto';
      }, scale);
      for (const offset of [5, 30]) {
        for (const direction of ['Tab', 'Shift+Tab']) {
          // The field to reach sits `offset` px from the top of the window, under the bar,
          // and the focus is on its neighbour
          await page.evaluate(({ offset, direction }) => {
            const fields = [...document.querySelectorAll('#fields input')];
            const target = fields[12];
            const from = fields[direction === 'Tab' ? 11 : 13];
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'instant' });
            from.focus({ preventScroll: true });
          }, { offset, direction });
          await page.waitForTimeout(100);
          await page.keyboard.press(direction);
          await page.waitForTimeout(400);
          const result = await page.evaluate(() => {
            const r = document.activeElement.getBoundingClientRect();
            return {
              top: r.top,
              id: document.activeElement.id,
              barBottom: document.getElementById('hdr').getBoundingClientRect().bottom,
              padding: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
            };
          });
          expect(result.id).toBe('f13');
          // Known issue (carried over from the site header): the padding is a minimum. When the
          // bar wraps to rows taller than it (300 % text), Chromium centres the field and clears
          // the bar, WebKit puts it at the padding minus half its height and leaves it under.
          const wrapped = result.barBottom > result.padding;
          if (browserName === 'webkit' && wrapped) {
            if (!noted.has(scale)) {
              noted.add(scale);
              test.info().annotations.push({ type: 'known issue', description: `WebKit, ${scale}: bar (${Math.round(result.barBottom)}px) taller than the scroll padding (${Math.round(result.padding)}px)` });
            }
            continue;
          }
          expect(result.top, `${scale}, ${offset}px, ${direction}: bar ends at ${result.barBottom}`).toBeGreaterThanOrEqual(result.barBottom - 1);
        }
      }
    }
  });

  test('the scroll padding is the bar height or 3.5em, whichever is more, plus half a control', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto(FIXTURE);
    const expected = await px(page, 'calc(max(var(--luz-bar-h), 3.5em) + var(--luz-control-lg) / 2)', true);
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
    expect(padding).toBeCloseTo(expected, 0);
  });
});

test.describe('objects: .o-main', () => {
  test('does not scroll by itself, so a .o-sticky bar inside it sticks to the window', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await page.goto('/tests/fixtures/objects-shell.html');
    const overflowY = await page.evaluate(() => getComputedStyle(document.getElementById('main')).overflowY);
    expect(overflowY, 'the page scrolls, not .o-main').toBe('visible');

    const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 200);
    expect(scrollable, 'the fixture is taller than the window').toBe(true);
    expect((await box(page, '#bar')).top).toBeCloseTo(0, 0);
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    expect(await page.evaluate(() => window.scrollY), 'the document scrolled').toBeGreaterThan(0);
    expect((await box(page, '#bar')).top, 'the bar stays at the top of the window').toBeCloseTo(0, 0);
  });
});

test.describe('objects: .o-grid--split', () => {
  const columns = async (page, a, b) => ({ first: await box(page, a), second: await box(page, b) });

  test('two equal columns when each gets --luz-grid-min (16rem by default), at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    const { first, second } = await columns(page, '#split-a', '#split-b');
    expect(second.top).toBeCloseTo(first.top, 0);
    expect(second.left).toBeGreaterThan(first.right - 0.5);
    expect(second.width).toBeCloseTo(first.width, 0);
    const min = await px(page, 'var(--luz-grid-min, 16rem)');
    expect(first.width).toBeGreaterThanOrEqual(min - 0.5);
  });

  test('one column when two would be narrower than --luz-grid-min, at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(FIXTURE);
    const { first, second } = await columns(page, '#split-a', '#split-b');
    expect(second.top).toBeGreaterThanOrEqual(first.bottom - 0.5);
    expect(second.left).toBeCloseTo(first.left, 0);
    expect(second.width).toBeCloseTo(first.width, 0);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test('with --luz-grid-min: 24rem it is two columns at 1280px and one at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    let { first, second } = await columns(page, '#wide-a', '#wide-b');
    expect(second.top, '1280px: side by side').toBeCloseTo(first.top, 0);
    expect(second.width).toBeCloseTo(first.width, 0);

    await page.setViewportSize({ width: 768, height: 800 });
    ({ first, second } = await columns(page, '#wide-a', '#wide-b'));
    expect(second.top, '768px: one under the other').toBeGreaterThanOrEqual(first.bottom - 0.5);
    expect(second.left).toBeCloseTo(first.left, 0);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test('with 200 % text it stacks at 1280px, and nothing overflows', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FIXTURE);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const { first, second } = await columns(page, '#wide-a', '#wide-b');
    expect(second.top).toBeGreaterThanOrEqual(first.bottom - 0.5);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('objects: .o-actions', () => {
  test('is a wrapping row with a gap of --luz-space-xs above 640px', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto(FIXTURE);
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.getElementById('actions'));
      return { display: s.display, direction: s.flexDirection, wrap: s.flexWrap, gap: parseFloat(s.columnGap) };
    });
    expect(style.display).toBe('flex');
    expect(style.direction).toBe('row');
    expect(style.wrap).toBe('wrap');
    expect(style.gap).toBeCloseTo(await px(page, 'var(--luz-space-xs)'), 1);
    const [one, two] = [await box(page, '#act-1'), await box(page, '#act-2')];
    expect(two.top).toBeCloseTo(one.top, 0);
    expect(two.left - one.right).toBeCloseTo(style.gap, 0);
  });

  for (const width of [320, 640]) {
    test(`is a column of full-width children with wrapping text at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(FIXTURE);
      const [parent, one, two] = [await box(page, '#actions'), await box(page, '#act-1'), await box(page, '#act-2')];
      expect(two.top).toBeGreaterThanOrEqual(one.bottom - 0.5);
      expect(one.width).toBeCloseTo(parent.width, 0);
      expect(two.width).toBeCloseTo(parent.width, 0);
      const wrap = await page.evaluate(() => getComputedStyle(document.getElementById('act-2')).whiteSpace);
      expect(wrap).toBe('normal');
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test('a long label wraps inside the column at 320px with 200 % text', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(FIXTURE);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const [parent, two] = [await box(page, '#actions'), await box(page, '#act-2')];
    expect(two.right).toBeLessThanOrEqual(parent.right + 0.5);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('objects: the docs', () => {
  test('the layout page documents the five new objects', () => {
    const text = readFileSync(fromRepo('apps/docs/pages/components/layout.html'), 'utf-8');
    for (const name of ['.o-page', '.o-container--inline', '.o-sticky', '.o-grid--split', '.o-actions', '--luz-bar-h']) {
      expect(text, name).toContain(name);
    }
  });
});
