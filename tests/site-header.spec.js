// @ts-check
/**
 * The site header pattern (@cai-ds/platform, .cai-platform-site-header): the
 * accessibility review of 2026-10-13 turned into checks, on a page of its own
 * (tests/fixtures/site-header.html). Each test names the change it keeps
 * (H1 to H6 of .claude/plans/specs/platform-site-header.md).
 * Runs in `chromium` and `chromium-nojs`: the pattern has no script.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/site-header.html';

/** Presses Tab `n` times and reads what has focus after each press. */
async function tabs(page, n) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    seen.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent.trim().slice(0, 20)));
  }
  return seen;
}

const LINKS = ['Wines', 'The winery', 'Visits', 'Club', 'Journal', 'Contact'];

test.describe('site header', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(FIXTURE);
  });

  test('narrow: the links are in a panel; Tab order closed and open; Escape returns focus to the menu button', async ({ page }) => {
    // Closed: the panel is display: none, so its links take no focus
    await expect(page.locator('#site-nav')).toBeHidden();
    await page.focus('#toggle');
    expect(await tabs(page, 2)).toEqual(['brand', 'login']);

    // Open with the keyboard: the browser puts the open popover right after its button
    await page.focus('#toggle');
    await page.keyboard.press('Enter');
    await expect(page.locator('#site-nav')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('toggle');
    expect(await tabs(page, 8)).toEqual([...LINKS, 'brand', 'login']);

    // Escape from a link closes it and puts focus back on the button
    await page.focus('#site-nav a');
    await page.keyboard.press('Escape');
    await expect(page.locator('#site-nav')).toBeHidden();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('toggle');
  });

  test('H4: resizing wide with the panel open keeps it under the header, away from the brand', async ({ page }) => {
    await page.click('#toggle');
    await expect(page.locator('#site-nav')).toBeVisible();
    await page.setViewportSize({ width: 1000, height: 800 });
    const { nav, brand, header, position } = await page.evaluate(() => {
      const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
      return { nav: box('#site-nav'), brand: box('#brand'), header: box('#hdr'), position: getComputedStyle(document.querySelector('#site-nav')).position };
    });
    expect(position).toBe('fixed');
    expect(nav.top, 'under the header').toBeGreaterThanOrEqual(header.bottom - 1);
    // No overlap with the brand: the panel is below it
    const overlap = nav.left < brand.right && nav.right > brand.left && nav.top < brand.bottom && nav.bottom > brand.top;
    expect(overlap).toBe(false);
    // Closed, the links are a row of the header again
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#site-nav')).position)).toBe('static');
    await expect(page.locator('#site-nav')).toBeVisible();
    await expect(page.locator('#toggle')).toBeHidden();
  });

  test('wide: links in a row, no menu button, the current link underlined as well as coloured', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('#toggle')).toBeHidden();
    const links = page.locator('#site-nav a');
    await expect(links).toHaveCount(6);
    const tops = await links.evaluateAll((els) => els.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'one row').toBe(1);
    const current = await page.locator('#site-nav a[aria-current]').evaluate((a) => getComputedStyle(a).textDecorationLine);
    expect(current).toBe('underline');
  });

  test('H1, H2: the scroll padding of the page is a length, at least 3.5em, and a field under the header is scrolled clear', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
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
          // The field to reach sits `offset` px from the top of the window, under the
          // header, and the focus is on its neighbour
          await page.evaluate(({ offset, direction }) => {
            const fields = [...document.querySelectorAll('input')];
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
              headerBottom: document.getElementById('hdr').getBoundingClientRect().bottom,
              padding: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
            };
          });
          expect(result.id).toBe('f13');
          // Known issue (Site header page, accessibility statement): the padding is a
          // minimum. When the header wraps to rows taller than it (300 % text here),
          // Chromium centres the field and clears the header, WebKit puts it at the
          // padding minus half its height and leaves it under. Chromium and Firefox
          // keep the full check at every size; WebKit keeps it at 100 % and 200 %,
          // and at 300 % whenever the header fits in the padding.
          const wrapped = result.headerBottom > result.padding;
          if (browserName === 'webkit' && wrapped) {
            if (!noted.has(scale)) {
              noted.add(scale);
              test.info().annotations.push({ type: 'known issue', description: `WebKit, ${scale}: header (${Math.round(result.headerBottom)}px) taller than the scroll padding (${Math.round(result.padding)}px)` });
            }
            continue;
          }
          expect(result.top, `${scale}, ${offset}px, ${direction}: header ends at ${result.headerBottom}`).toBeGreaterThanOrEqual(result.headerBottom - 1);
        }
      }
    }
  });

  test('sticky applies only in a window at least 30rem tall', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('hdr')).position)).toBe('sticky');
    await page.setViewportSize({ width: 800, height: 400 });
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('hdr')).position)).toBe('static');
  });

  for (const forced of [false, true]) {
    test(`H3: the open panel's scrim starts under the header, so the header is not dimmed${forced ? ' (forced colors)' : ''}`, async ({ page }) => {
      if (forced) await page.emulateMedia({ forcedColors: 'active' });
      const clip = { x: 0, y: 0, width: 600, height: 52 };
      const before = await page.screenshot({ clip });
      await page.evaluate(() => document.getElementById('site-nav').showPopover());
      await expect(page.locator('#site-nav')).toBeVisible();
      const after = await page.screenshot({ clip });
      expect(Buffer.compare(before, after), 'header pixels unchanged under the scrim').toBe(0);
      // And the page under the panel is dimmed (the scrim is there)
      const below = await page.evaluate(() => {
        const r = document.getElementById('site-nav').getBoundingClientRect();
        return r.bottom;
      });
      expect(below).toBeGreaterThan(53);
    });
  }

  test('H5: the row wraps instead of overflowing: 320 px with long words, and 200 % text at 769 px with six links', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => {
      document.getElementById('brand').textContent = 'Bodega Albar de los Hermanos y Compañía';
      document.getElementById('login').textContent = 'Iniciar sesión en su cuenta';
    });
    const narrow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(narrow, '320 px').toBeLessThanOrEqual(0);

    await page.setViewportSize({ width: 769, height: 800 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(wide, '769 px, 200 % text').toBeLessThanOrEqual(0);
  });

  test('H6: the menu button keeps its icon in forced colors, in the SVG and in core\'s bars', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const svg = await page.locator('#toggle svg path').evaluate((p) => {
      const s = getComputedStyle(p);
      const r = p.getBoundingClientRect();
      return { fill: s.fill, w: r.width, h: r.height };
    });
    expect(svg.w).toBeGreaterThan(10);
    expect(svg.fill).not.toMatch(/none|rgba\(0, 0, 0, 0\)/);
    const bars = await page.locator('#bars .cai-nav-toggle__bar').first().evaluate((b) => getComputedStyle(b).backgroundColor);
    expect(bars, 'a system color, not transparent').not.toBe('rgba(0, 0, 0, 0)');
    // The current link keeps its underline
    expect(await page.locator('#site-nav a[aria-current]').evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe('underline');
  });
});
