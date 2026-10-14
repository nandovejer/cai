// @ts-check
/**
 * The cookie band of @luz-ds/site (<luz-consent>, D7 of
 * .claude/plans/specs/f3-package-model.md, step 9, and the accessibility
 * requirements C1 to C11 and the owner's second round on C3 and C5): a band
 * fixed at the block end of the window, so showing it shifts nothing, whose
 * height is published as --luz-consent-h so that nothing Tab reaches ends up
 * under it (WCAG 2.4.11). On tests/fixtures/consent-band.html: a shell with a
 * long sidebar, a long page and a footer, loaded through site.min.js (the
 * presence loader), so the idle trigger of C9 is the real one. The band's
 * behaviour on tests/fixtures/site-top.html (the answers, the storage, axe)
 * stays in tests/site-consent.spec.js.
 *
 * Needs JavaScript: without it the band stays hidden (site-consent.spec.js).
 */
import { test, expect } from '@playwright/test';

const PAGE = '/tests/fixtures/consent-band.html';
const KEY = 'luz-consent';
const BAND = '#consent';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

/** Open the page; with a stored choice (valid) the band stays hidden. */
async function open(page, { width = 1280, height = 800, stored = false } = {}) {
  await page.setViewportSize({ width, height });
  if (stored) {
    await page.addInitScript(([k, v]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(k, JSON.stringify(v));
        sessionStorage.setItem('seeded', '1');
      }
    }, [KEY, { version: 1, expires: Date.now() + 1e9, asked: ['analytics', 'marketing'], granted: [] }]);
  }
  await page.goto(PAGE);
  if (stored) await expect(page.locator('#settings')).toBeVisible();
  else await expect(page.locator(BAND)).toBeVisible();
}

const style = (page, css) => page.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);
const rect = (page, selector) => page.evaluate((s) => {
  const r = document.querySelector(s).getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
}, selector);
/** --luz-consent-h as the page computes it on :root. */
const published = (page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--luz-consent-h').trim());
const activeId = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.localName);
const insideBand = (page) => page.evaluate(() => !!document.activeElement?.closest('luz-consent'));

/** Answer with Accept, which moves to the saved state. */
async function accept(page) {
  await page.click('#accept');
  await expect(page.locator('#done')).toBeVisible();
}

test.describe('where it sits', () => {
  test('fixed at the block end of the window, the whole width, before and after scrolling', async ({ page }) => {
    await open(page);
    const look = () => page.locator(BAND).evaluate((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { position: s.position, bottom: r.bottom, left: r.left, width: r.width, height: window.innerHeight };
    });
    let band = await look();
    expect(band.position).toBe('fixed');
    expect(band.bottom).toBeCloseTo(band.height, 0);
    expect(band.left).toBe(0);
    expect(band.width).toBe(1280);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    band = await look();
    expect(band.bottom).toBeCloseTo(band.height, 0);
  });

  test('right to left: still the whole width, at the same edge, from logical insets', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    const band = await rect(page, BAND);
    expect(band.left).toBe(0);
    expect(band.width).toBe(1280);
    expect(band.bottom).toBeCloseTo(800, 0);
    const inset = await page.locator(BAND).evaluate((el) => {
      const s = getComputedStyle(el);
      return { block: s.insetBlockEnd, start: s.insetInlineStart, end: s.insetInlineEnd };
    });
    expect(inset).toEqual({ block: '0px', start: '0px', end: '0px' });
  });

  for (const width of [320, 1440]) {
    test(`${width} px: showing it shifts nothing, and moves nothing that was there`, async ({ page }) => {
      // Count the shifts from the moment the band shows: the web font swapping in (a pixel of
      // text, with the band still hidden) is not the band, and document.fonts.ready is too early to tell
      await page.addInitScript(() => {
        window.__shift = 0;
        window.__shownAt = null;
        new window.MutationObserver(() => {
          const band = document.getElementById('consent');
          if (band && !band.hidden && window.__shownAt === null) window.__shownAt = performance.now();
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ['hidden'], childList: true });
        new window.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput && window.__shownAt !== null && entry.startTime >= window.__shownAt) window.__shift += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await open(page, { width, height: 800 });
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => window.__shownAt), 'the band showed').not.toBeNull();
      expect(await page.evaluate(() => window.__shift)).toBe(0);
      // The same page without the band: the first things of it are where they were
      const before = await rect(page, '#top');
      await page.evaluate(() => { document.getElementById('consent').hidden = true; });
      expect((await rect(page, '#top')).top).toBe(before.top);
    });
  }

  test('showing it does not take focus: nothing is focused, and the skip link is still the first stop', async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.keyboard.press('Tab');
    expect(await activeId(page)).toBe('skip');
  });

  test('is not in the top layer: a modal dialog and a popover both draw over it', async ({ page }) => {
    await open(page);
    const state = await page.locator(BAND).evaluate((el) => ({
      modal: el.matches(':modal'), popover: el.matches(':popover-open'), attr: el.hasAttribute('popover'), dialog: !!el.closest('dialog'),
    }));
    expect(state).toEqual({ modal: false, popover: false, attr: false, dialog: false });

    // A popover whose box overlaps the band
    await page.evaluate(() => document.getElementById('pop').showPopover());
    const overPopover = await page.evaluate(() => {
      const band = document.getElementById('consent').getBoundingClientRect();
      const hit = document.elementFromPoint(band.left + band.width / 2, band.bottom - 4);
      return hit?.id;
    });
    expect(overPopover).toBe('pop');
    await page.evaluate(() => document.getElementById('pop').hidePopover());

    // A modal dialog: its backdrop is over the whole window, the band included
    await page.evaluate(() => document.getElementById('modal').showModal());
    const overModal = await page.evaluate(() => {
      const band = document.getElementById('consent').getBoundingClientRect();
      const hit = document.elementFromPoint(band.left + band.width / 2, band.top + band.height / 2);
      return { inModal: hit?.closest('dialog')?.id, inBand: !!hit?.closest('luz-consent') };
    });
    expect(overModal).toEqual({ inModal: 'modal', inBand: false });
  });
});

test.describe('C1 and C7: its place in the page, and what it is', () => {
  test('C1: it comes right after the skip link, before the page, and the Tab order is skip, policy, Accept, Reject, Choose, then the page', async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => document.getElementById('skip').nextElementSibling?.localName)).toBe('luz-consent');
    const order = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      order.push(await activeId(page));
    }
    expect(order).toEqual(['skip', 'policy', 'accept', 'reject', 'choose', 'side-1']);
  });

  test('C7: a section named by its heading, the one region of the page; no dialog, no aria-modal, no live region', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('region', { name: 'Cookies on Bodega Albar' })).toHaveCount(1);
    const shape = await page.evaluate(() => {
      const band = document.getElementById('consent');
      const inside = [band, ...band.querySelectorAll('*')];
      return {
        tag: band.localName,
        labelledby: band.getAttribute('aria-labelledby'),
        modal: inside.filter((el) => el.hasAttribute('aria-modal') || ['dialog', 'alertdialog'].includes(el.getAttribute('role'))).length,
        live: inside.filter((el) => el.hasAttribute('aria-live') || ['alert', 'status', 'log'].includes(el.getAttribute('role'))).length,
        dialogs: band.querySelectorAll('dialog').length,
      };
    });
    expect(shape).toEqual({ tag: 'section', labelledby: 'consent-title', modal: 0, live: 0, dialogs: 0 });
    // Still a region in its saved state
    await accept(page);
    await expect(page.getByRole('region', { name: 'Cookies on Bodega Albar' })).toHaveCount(1);
  });
});

test.describe('C4: nothing that Tab reaches is under the band (WCAG 2.4.11)', () => {
  for (const [width, height] of [[1280, 800], [320, 640]]) {
    test(`${width}x${height}: every Tab stop, the sidebar's and the footer's last links included, ends above the band`, async ({ page }) => {
      // Core sets smooth scrolling; the walk reads where the browser leaves each stop
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page, { width, height });
      const visited = new Set();
      const under = [];
      for (let i = 0; i < 260 && !visited.has('foot-last'); i++) {
        await page.keyboard.press('Tab');
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          const band = document.getElementById('consent').getBoundingClientRect();
          const r = el.getBoundingClientRect();
          return { id: el.id || el.localName, inBand: !!el.closest('luz-consent'), bottom: r.bottom, top: r.top, band: band.top };
        });
        visited.add(stop.id);
        if (!stop.inBand && stop.bottom > stop.band + 0.5) under.push(`${stop.id}: bottom ${Math.round(stop.bottom)} > band ${Math.round(stop.band)}`);
        if (!stop.inBand && stop.id !== 'skip' && stop.top < -0.5) under.push(`${stop.id}: above the window`);
      }
      // At 768px and below the sidebar is a closed popover drawer: Tab does not reach its links
      const sidebar = width > 768 ? ['side-1', 'side-last'] : [];
      expect([...visited]).toEqual(expect.arrayContaining([...sidebar, 'main-last', 'field', 'settings', 'settings-2', 'foot-last']));
      if (width <= 768) expect(visited.has('side-last')).toBe(false);
      expect(under).toEqual([]);
    });
  }

  test('the published height is the scroll padding of the page, and the padding of the sidebar and the main part; none of it in print', async ({ page }) => {
    await open(page);
    const h = await published(page);
    expect(h).toMatch(/^\d+px$/);
    const read = () => page.evaluate(() => ({
      root: getComputedStyle(document.documentElement).scrollPaddingBlockEnd,
      sidebar: getComputedStyle(document.querySelector('.luz-sidebar')).paddingBlockEnd,
      main: getComputedStyle(document.querySelector('.o-main')).paddingBlockEnd,
    }));
    expect(await read()).toEqual({ root: h, sidebar: h, main: h });
    await page.emulateMedia({ media: 'print' });
    expect(await page.locator(BAND).evaluate((el) => getComputedStyle(el).display)).toBe('none');
    const printed = await read();
    expect(printed.sidebar).toBe('0px');
    expect(printed.main).toBe('0px');
  });
});

test.describe('C6: --luz-consent-h follows the band', () => {
  const ceilHeight = (page) => page.locator(BAND).evaluate((el) => `${Math.ceil(el.getBoundingClientRect().height)}px`);

  test('is the border-box height of the band, rounded up, in px, from the first frame it shows', async ({ page }) => {
    await open(page);
    await expect.poll(() => published(page)).toBe(await ceilHeight(page));
    expect(await published(page)).toMatch(/^\d+px$/);
  });

  test('follows the choices opening, the saved state, larger text and text spacing', async ({ page }) => {
    await open(page);
    const start = parseFloat(await published(page));
    await page.click('#choose');
    await expect.poll(async () => parseFloat(await published(page))).toBeGreaterThan(start);
    await expect.poll(() => published(page)).toBe(await ceilHeight(page));

    await style(page, 'html { font-size: 200% }');
    await expect.poll(() => published(page)).toBe(await ceilHeight(page));

    await style(page, 'luz-consent * { line-height: 2 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important }');
    await expect.poll(() => published(page)).toBe(await ceilHeight(page));

    await accept(page);
    await expect.poll(() => published(page)).toBe(await ceilHeight(page));
  });

  test('is reset when the band goes away', async ({ page }) => {
    await open(page);
    await accept(page);
    await page.click('#close');
    await expect(page.locator(BAND)).toBeHidden();
    await expect.poll(() => published(page)).toMatch(/^(0px)?$/);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBlockEnd)).not.toMatch(/^[1-9]/);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.o-main')).paddingBlockEnd)).toBe('0px');
  });
});

test.describe('C5: at most half the window, scrolling inside; static in a window too short for that', () => {
  test('320x640 at 200 % text with the choices open: no taller than half the window, scrolls inside, and its last button is reachable', async ({ page }) => {
    await open(page, { width: 320, height: 640 });
    await style(page, 'html { font-size: 200% }');
    await page.click('#choose');
    const band = await page.locator(BAND).evaluate((el) => {
      const s = getComputedStyle(el);
      return { height: el.getBoundingClientRect().height, maxBlockSize: s.maxBlockSize, overflowY: s.overflowY, scrolls: el.scrollHeight > el.clientHeight + 1 };
    });
    expect(band.height).toBeLessThanOrEqual(320.5);
    expect(band.maxBlockSize).toBe('320px');
    expect(['auto', 'scroll']).toContain(band.overflowY);
    expect(band.scrolls).toBe(true);
    await page.focus('#save');
    const inside = await page.evaluate(() => {
      const b = document.getElementById('consent').getBoundingClientRect();
      const r = document.getElementById('save').getBoundingClientRect();
      return r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5;
    });
    expect(inside).toBe(true);
    // And the page is still usable above it
    expect((await rect(page, '#top')).top).toBeLessThan(320);
  });

  for (const [width, height] of [[320, 256], [1280, 470]]) {
    test(`${width}x${height}, under 30rem tall: in the flow before the page, not capped`, async ({ page }) => {
      await open(page, { width, height });
      await page.click('#choose');
      const band = await page.locator(BAND).evaluate((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { position: s.position, top: r.top, bottom: r.bottom, scrolls: el.scrollHeight > el.clientHeight + 1 };
      });
      expect(band.position).toBe('static');
      expect(band.scrolls).toBe(false);
      expect((await rect(page, '.o-shell')).top).toBeGreaterThanOrEqual(band.bottom - 0.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }

  test('1280x800 is fixed, 1280x479 is the last height of the static case', async ({ page }) => {
    await open(page, { width: 1280, height: 800 });
    expect(await page.locator(BAND).evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
    await page.setViewportSize({ width: 1280, height: 479 });
    await expect.poll(() => page.locator(BAND).evaluate((el) => getComputedStyle(el).position)).toBe('static');
    await page.setViewportSize({ width: 1280, height: 481 });
    await expect.poll(() => page.locator(BAND).evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
  });
});

test.describe('C3 and C2: the saved state, and where focus goes when the band closes', () => {
  test('Accept moves to the saved state, with a Close button next to the sentence', async ({ page }) => {
    await open(page);
    await accept(page);
    await expect(page.locator('#done')).toBeFocused();
    await expect(page.locator('#close')).toBeVisible();
    await expect(page.locator('#close')).toHaveAccessibleName('Close');
  });

  test('C3: while focus stays in the band the saved state stays; when it leaves for the page, the band hides and focus is where Tab put it', async ({ page }) => {
    await open(page);
    await accept(page);
    await page.keyboard.press('Tab');
    expect(await activeId(page)).toBe('done-policy');
    await page.keyboard.press('Tab');
    expect(await activeId(page)).toBe('close');
    await expect(page.locator(BAND)).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(BAND)).toBeHidden();
    expect(await activeId(page)).toBe('side-1');
    expect(await insideBand(page)).toBe(false);
  });

  test('C3: leaving backwards (Shift+Tab) hides it too, and lands on the skip link', async ({ page }) => {
    await open(page);
    await accept(page);
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(BAND)).toBeHidden();
    expect(await activeId(page)).toBe('skip');
  });

  test('C3: the Close button hides it, with a mouse and with Enter', async ({ page }) => {
    await open(page);
    await accept(page);
    await page.click('#close');
    await expect(page.locator(BAND)).toBeHidden();
    await expect(page.locator('#settings')).toBeVisible();

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator(BAND)).toBeVisible();
    await accept(page);
    await page.focus('#close');
    await page.keyboard.press('Enter');
    await expect(page.locator(BAND)).toBeHidden();
  });

  test('C2: Close on a first visit returns focus to the first button that reopens the band', async ({ page }) => {
    await open(page);
    await accept(page);
    await page.click('#close');
    await expect(page.locator('#settings')).toBeFocused();
  });

  test('C2: Close after the band was reopened from a button returns focus to that button', async ({ page }) => {
    await open(page, { stored: true });
    await page.click('#settings-2');
    await expect(page.locator(BAND)).toBeVisible();
    await expect(page.locator(BAND)).toBeFocused();
    await page.click('#reject');
    await expect(page.locator('#done')).toBeFocused();
    await page.click('#close');
    await expect(page.locator(BAND)).toBeHidden();
    await expect(page.locator('#settings-2')).toBeFocused();
  });

  test('C2: with no button to reopen it, focus goes to the main part, never to the body', async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.querySelectorAll('[data-luz-consent-open]').forEach((b) => b.remove()));
    await accept(page);
    await page.click('#close');
    await expect(page.locator(BAND)).toBeHidden();
    expect(await activeId(page)).toBe('main');
  });

  test('C2: the band hiding when focus leaves it takes nothing from where focus went', async ({ page }) => {
    await open(page, { stored: true });
    await page.click('#settings');
    await page.click('#accept');
    await expect(page.locator('#done')).toBeFocused();
    await page.focus('#field');
    await expect(page.locator(BAND)).toBeHidden();
    await expect(page.locator('#field')).toBeFocused();
  });

  test('C8: Escape does not hide it, in the question or in the saved state', async ({ page }) => {
    await open(page);
    await page.focus('#accept');
    await page.keyboard.press('Escape');
    await expect(page.locator(BAND)).toBeVisible();
    await accept(page);
    await page.keyboard.press('Escape');
    await expect(page.locator(BAND)).toBeVisible();
    await expect(page.locator('#done')).toBeFocused();
  });
});

test.describe('C9: it shows within 1.5 s of the page, whatever idle does', () => {
  /** Record when the band stops being hidden, in ms since the navigation began. */
  const watchShown = (page) => page.addInitScript(() => {
    window.__shownAt = null;
    new MutationObserver(() => {
      const band = document.getElementById('consent');
      if (band && !band.hidden && window.__shownAt === null) window.__shownAt = performance.now();
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['hidden'], childList: true });
  });

  test('with idle held by a busy page (requestIdleCallback only fires at its timeout)', async ({ page }) => {
    await watchShown(page);
    await page.addInitScript(() => {
      window.requestIdleCallback = (callback, options) => {
        if (options?.timeout) setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), options.timeout);
        return 1;
      };
    });
    await page.goto(PAGE);
    await expect.poll(() => page.evaluate(() => window.__shownAt), { timeout: 3000 }).not.toBeNull();
    expect(await page.evaluate(() => window.__shownAt)).toBeLessThan(1500);
  });

  test('in a browser without requestIdleCallback (Safari)', async ({ page }) => {
    await watchShown(page);
    await page.addInitScript(() => { window.requestIdleCallback = undefined; });
    await page.goto(PAGE);
    await expect.poll(() => page.evaluate(() => window.__shownAt), { timeout: 3000 }).not.toBeNull();
    expect(await page.evaluate(() => window.__shownAt)).toBeLessThan(1500);
  });
});

test.describe('C10: forced colours, reduced motion, print', () => {
  test('forced colours: a border of at least 1px on its block-start edge, in the colour of text', async ({ page }) => {
    await open(page);
    await page.emulateMedia({ forcedColors: 'active' });
    const edge = await page.locator(BAND).evaluate((el) => {
      const s = getComputedStyle(el);
      const probe = Object.assign(document.createElement('div'), { style: 'color: CanvasText' });
      document.body.append(probe);
      const canvasText = getComputedStyle(probe).color;
      probe.remove();
      return { width: parseFloat(s.borderBlockStartWidth), style: s.borderBlockStartStyle, color: s.borderBlockStartColor, canvasText };
    });
    expect(edge.width).toBeGreaterThanOrEqual(1);
    expect(edge.style).not.toBe('none');
    expect(edge.color).toBe(edge.canvasText);
  });

  test('reduced motion: nothing slides in, nothing animates or transitions on the band', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const motion = await page.locator(BAND).evaluate((el) => {
      const s = getComputedStyle(el);
      const seconds = (list) => list.split(',').map((t) => parseFloat(t));
      return {
        animations: seconds(s.animationDuration).every((t) => t < 0.05),
        transitions: seconds(s.transitionDuration).every((t) => t < 0.05),
        moved: s.transform !== 'none' || s.translate !== 'none',
        running: el.getAnimations().length,
      };
    });
    expect(motion).toEqual({ animations: true, transitions: true, moved: false, running: 0 });
  });

  test('print: the band is gone, and it leaves no room', async ({ page }) => {
    await open(page);
    await page.emulateMedia({ media: 'print' });
    expect(await page.locator(BAND).evaluate((el) => getComputedStyle(el).display)).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.body).paddingBlockEnd)).toBe('0px');
  });

  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`${theme}: its text keeps 4.5:1 on its surface`, async ({ page }) => {
      await open(page);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const pair = await page.locator(BAND).evaluate((el) => {
        const s = getComputedStyle(el);
        return { color: s.color, bg: s.backgroundColor };
      });
      const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = (c) => {
        const [r, g, b] = rgb(c).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      expect(pair.bg, 'an opaque surface').not.toMatch(/rgba\(.*, 0\)$/);
      const [hi, lo] = [lum(pair.color), lum(pair.bg)].sort((a, b) => b - a);
      expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
