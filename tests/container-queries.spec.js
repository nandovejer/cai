// @ts-check
/**
 * Size queries on the component's own container (table cell padding, player
 * controls) and an intrinsic grid (platform feature grid) replace window
 * media queries: the same markup reacts to the room it has, in one viewport.
 * The second group proves containment did not break what escapes it: the top
 * layer (dialog, popover, ::backdrop) and the scroll of the table wrap.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/container-queries.html';
const css = (page, selector, prop) => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

test.describe('component size queries', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(FIXTURE);
  });

  test('table: cell padding and stacking follow the wrapper, not the window', async ({ page }) => {
    const narrow = await css(page, '#table-narrow td:first-child', 'padding-left');
    const wide = await css(page, '#table-wide td:first-child', 'padding-left');
    // Same viewport (1280): only the wrapper differs
    expect(parseFloat(narrow)).toBeLessThan(parseFloat(wide));
    expect(await css(page, '#table-narrow tbody tr', 'display')).toBe('block');
    expect(await css(page, '#table-wide tbody tr', 'display')).toBe('table-row');
  });

  test('player: controls stack and the volume bar goes in a narrow player only', async ({ page }) => {
    expect(await css(page, '#controls-narrow', 'flex-direction')).toBe('column');
    expect(await css(page, '#volbar-narrow', 'display')).toBe('none');
    expect(await css(page, '#controls-wide', 'flex-direction')).toBe('row');
    expect(await css(page, '#volbar-wide', 'display')).not.toBe('none');
  });

  test('feature grid: two columns when two fit, one when they do not, no query', async ({ page }) => {
    const columns = (selector) =>
      page.locator(selector).evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(await columns('#grid-narrow')).toBe(1);
    expect(await columns('#grid-wide')).toBe(2);
    // Never three, however wide
    await page.locator('#wide').evaluate((el) => (el.style.inlineSize = '1600px'));
    expect(await columns('#grid-wide')).toBe(2);
  });

  test('the window size alone changes nothing about a component of a given width', async ({ page }) => {
    const before = await css(page, '#table-wide td:first-child', 'padding-left');
    await page.setViewportSize({ width: 360, height: 800 });
    // The wide slot is 900px in a 360px window: it overflows, and still reads as wide
    expect(await css(page, '#table-wide td:first-child', 'padding-left')).toBe(before);
    expect(await css(page, '#controls-wide', 'flex-direction')).toBe('row');
  });
});

test.describe('containment does not break what escapes a container', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(FIXTURE);
  });

  for (const host of ['table', 'player']) {
    test(`a modal dialog inside a ${host} container is centred in the window`, async ({ page }) => {
      await page.evaluate((h) => document.getElementById(`dlg-${h}`).showModal(), host);
      const { box, host: hostBox, viewport } = await page.evaluate((h) => {
        const r = document.getElementById(`dlg-${h}`).getBoundingClientRect();
        const hb = document.getElementById(`host-${h}`).getBoundingClientRect();
        return {
          box: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
          host: { right: hb.right, bottom: hb.bottom },
          viewport: { width: window.innerWidth, height: window.innerHeight },
        };
      }, host);
      // Outside the 300 x 80 host and centred in the window: the top layer is not contained
      expect(box.right).toBeGreaterThan(hostBox.right);
      expect(Math.abs((box.left + box.right) / 2 - viewport.width / 2)).toBeLessThan(2);
      // ::backdrop belongs to the dialog and covers the window: a hit at the corner is the dialog's, not the page's
      const topElement = await page.evaluate(() => document.elementFromPoint(window.innerWidth - 4, window.innerHeight - 4)?.tagName);
      expect(topElement).toBe('DIALOG');
      await page.evaluate((h) => document.getElementById(`dlg-${h}`).close(), host);
    });

    test(`a popover inside a ${host} container is placed against the window`, async ({ page }) => {
      await page.evaluate((h) => document.getElementById(`pop-${h}`).showPopover(), host);
      const r = await page.evaluate((h) => {
        const b = document.getElementById(`pop-${h}`).getBoundingClientRect();
        const hb = document.getElementById(`host-${h}`).getBoundingClientRect();
        return { top: b.top, hostTop: hb.top, visible: document.getElementById(`pop-${h}`).matches(':popover-open') };
      }, host);
      expect(r.visible).toBe(true);
      // 200px from the top of the window, not from the host (which is further down the page)
      expect(r.hostTop).toBeGreaterThan(200);
      expect(Math.round(r.top)).toBe(200);
    });
  }

  test('the table wrap still scrolls its own overflow', async ({ page }) => {
    const scrolls = await page.evaluate(() => {
      const wrap = document.getElementById('host-table');
      const wide = document.createElement('div');
      wide.style.inlineSize = '900px';
      wide.style.blockSize = '10px';
      wrap.append(wide);
      return { overflowX: getComputedStyle(wrap).overflowX, scrollable: wrap.scrollWidth > wrap.clientWidth };
    });
    expect(scrolls.overflowX).toBe('auto');
    expect(scrolls.scrollable).toBe(true);
  });
});
