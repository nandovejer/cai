// @ts-check
/**
 * The docs pages in the dark: a band of small stars across the top of the page.
 *
 * The home page's night city draws stars (apps/landing/light/city.js,
 * `.home-city__star`); the docs show a quiet, static version of them at the top
 * of every page when the colour mode is dark. The decision, as these tests read it:
 *
 *  - CSS only, in apps/docs/reference.css (which the pages and the 404 link): a
 *    pseudo-element or a decorative element with a `background-image`, out of
 *    flow (`position: absolute` or `fixed`), starting at the top of the page,
 *    across the width, at least as tall as the site header.
 *  - Shown when `<html data-theme="dark">` (so the dusk and dawn lights that sit
 *    over dark too), never in light and never in high contrast; not under forced
 *    colours.
 *  - Decorative: no text, not in the accessibility tree, `pointer-events: none`.
 *  - Static: nothing animates it for more than 5 s (WCAG 2.2.2: the docs have no
 *    pause control).
 *  - No layout change, no sideways scroll at 320 px, axe passes in dark.
 *
 * The band has no agreed class name, so `findBand` looks for what the decision
 * describes (an out-of-flow box with a background image, at the top of the page,
 * across it, as tall as the header) on every element and on its ::before and
 * ::after, and marks the host with `data-test-band` so the test can switch it off
 * with an injected style and compare the page with and without it.
 *
 * It needs JavaScript only for what the site does before it (boot.js sets
 * data-theme), so it runs in `chromium`.
 */
/* global atob, Blob, createImageBitmap, innerHeight, OffscreenCanvas, scrollX, scrollY -- these run in the page, inside page.evaluate() */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';
import { LIGHTS, NO_CHOICE, TIMEZONE, atTime, seedMode } from './helpers/site-lights.js';

test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'boot.js sets data-theme: the band needs JavaScript to know the mode');
test.use({ timezoneId: TIMEZONE });

const ROUTES = ['/docs/', '/docs/components/button/'];
const NIGHT = '23:30';

/**
 * Open a page in a colour mode, at a clock that does not vary, with the colour fade finished.
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 * @param {string} mode light, dark or high-contrast (stored under core's key)
 */
async function open(page, route, mode, hhmm = NIGHT) {
  await atTime(page, hhmm);
  await seedMode(page, mode);
  await page.goto(route);
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
  await faded(page);
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Two frames, so a style toggled a moment ago is the one painted (WebKit applies a media toggle late). */
async function nextFrames(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

/**
 * The star band of the page, or null. Marks its host with `data-test-band`
 * (value "self" or the pseudo-element). The band is an out-of-flow box with a
 * background image that is rendered, starts at the top of the page, spans the
 * width and is as tall as the site header.
 * @param {import('@playwright/test').Page} page
 */
function findBand(page) {
  return page.evaluate(() => {
    document.querySelectorAll('[data-test-band]').forEach((el) => el.removeAttribute('data-test-band'));
    const px = (v) => (v && v !== 'auto' ? parseFloat(v) : NaN);
    const header = document.querySelector('#site-header');
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const vw = window.innerWidth;
    /** Padding box of the containing block of an absolutely positioned box, in document coordinates. */
    const containing = (host, fixed) => {
      if (fixed) return { left: 0, top: window.scrollY, width: vw, height: window.innerHeight };
      for (let n = host; n && n !== document.documentElement; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.position !== 'static' || s.transform !== 'none' || s.willChange.includes('transform')) {
          const r = n.getBoundingClientRect();
          const l = px(s.borderLeftWidth) || 0, t = px(s.borderTopWidth) || 0;
          const rr = px(s.borderRightWidth) || 0, b = px(s.borderBottomWidth) || 0;
          return { left: r.left + l + scrollX, top: r.top + t + scrollY, width: r.width - l - rr, height: r.height - t - b };
        }
      }
      return { left: 0, top: 0, width: vw, height: window.innerHeight };
    };
    for (const host of [document.documentElement, ...document.querySelectorAll('*')]) {
      for (const pseudo of [null, '::before', '::after']) {
        const s = getComputedStyle(host, pseudo);
        if (pseudo && (s.content === 'none' || s.content === 'normal')) continue;
        if (s.backgroundImage === 'none' || s.display === 'none' || s.visibility !== 'visible' || Number(s.opacity) === 0) continue;
        if (s.position !== 'absolute' && s.position !== 'fixed') continue;
        let width, height, top, left;
        if (pseudo) {
          const cb = containing(host, s.position === 'fixed');
          const extraW = s.boxSizing === 'content-box' ? px(s.paddingLeft) + px(s.paddingRight) + px(s.borderLeftWidth) + px(s.borderRightWidth) : 0;
          const extraH = s.boxSizing === 'content-box' ? px(s.paddingTop) + px(s.paddingBottom) + px(s.borderTopWidth) + px(s.borderBottomWidth) : 0;
          width = px(s.width) + extraW;
          height = px(s.height) + extraH;
          const t = px(s.top), b = px(s.bottom), l = px(s.left);
          top = !Number.isNaN(t) ? cb.top + t : !Number.isNaN(b) ? cb.top + cb.height - b - height : NaN;
          left = !Number.isNaN(l) ? cb.left + l : cb.left;
        } else {
          const r = host.getBoundingClientRect();
          ({ width, height } = r);
          top = r.top + scrollY;
          left = r.left + scrollX;
        }
        if (![width, height, top].every(Number.isFinite)) continue;
        if (Math.abs(top) > 1 || width < vw * 0.9 || height < headerH - 1) continue;
        host.setAttribute('data-test-band', pseudo ?? 'self');
        return {
          pseudo,
          host: host.tagName.toLowerCase() + (host.id ? `#${host.id}` : '') + (host.className && typeof host.className === 'string' ? `.${host.className.trim().split(/\s+/).join('.')}` : ''),
          box: { top, left, width, height },
          headerH,
          pointerEvents: s.pointerEvents,
          content: pseudo ? s.content : null,
          position: s.position,
        };
      }
    }
    return null;
  });
}

/** The band exists: the reason a test is red today. */
async function expectBand(page, where) {
  const band = await findBand(page);
  expect(band, `${where}: a band of stars (an out-of-flow box with a background-image, from the top of the page, across it, as tall as the site header) is drawn when data-theme is dark`).not.toBeNull();
  return /** @type {NonNullable<typeof band>} */ (band);
}

/** Switch the band off with an injected style, as the host was marked by findBand. */
async function hideBand(page, band) {
  await page.addStyleTag({
    content: band.pseudo
      ? `[data-test-band]${band.pseudo} { display: none !important; content: none !important; }`
      : '[data-test-band] { display: none !important; }',
  });
}

for (const route of ROUTES) {
  test.describe(`stars on ${route} in dark`, () => {
    test('a band of stars is at the top of the page: from y = 0, across the page, at least as tall as the site header', async ({ page }) => {
      await open(page, route, 'dark');
      const band = await expectBand(page, route);
      expect(band.box.top, 'starts at the top of the page').toBeLessThanOrEqual(1);
      expect(band.box.width, 'spans the width').toBeGreaterThanOrEqual((await page.evaluate(() => window.innerWidth)) * 0.9);
      expect(band.box.height, 'as tall as the site header').toBeGreaterThanOrEqual(band.headerH - 1);
    });

    test('the stars are drawn: the top of the page differs with and without the band', async ({ page }) => {
      await open(page, route, 'dark');
      const band = await expectBand(page, route);
      const clip = { x: 0, y: 0, width: Math.floor(band.box.width), height: Math.min(Math.ceil(band.box.height), 400) };
      const withBand = await page.screenshot({ clip, animations: 'disabled' });
      await hideBand(page, band);
      const without = await page.screenshot({ clip, animations: 'disabled' });
      expect(withBand.equals(without), 'the band is visible: its pixels differ from the same page without it (not hidden under the opaque header)').toBe(false);
    });

    test('the band is decorative: pointer-events none, no text, not in the accessibility tree, and it never covers a control', async ({ page }) => {
      await open(page, route, 'dark');
      const band = await expectBand(page, route);
      expect(band.pointerEvents, 'pointer-events').toBe('none');
      if (band.pseudo) {
        expect(band.content, 'a pseudo-element with no text').toMatch(/^"" *(\/ *"")?$/);
      } else {
        const facts = await page.evaluate(() => {
          const el = document.querySelector('[data-test-band]');
          if (!el) return null;
          return {
            text: (el.textContent ?? '').trim(),
            hidden: !!el.closest('[aria-hidden="true"], [inert]') || el.getAttribute('role') === 'presentation' || el.getAttribute('role') === 'none',
            focusable: !!el.querySelector('a[href], button, input, select, textarea, [tabindex]'),
          };
        });
        expect(facts?.text, 'no text').toBe('');
        expect(facts?.hidden, 'aria-hidden="true" (or inert)').toBe(true);
        expect(facts?.focusable, 'nothing to focus inside').toBe(false);
      }
      const hit = await page.evaluate(() => {
        const brand = document.querySelector('.site-header__brand');
        if (!brand) return null;
        const r = brand.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!top && !!top.closest('.site-header__brand');
      });
      expect(hit, 'a click on the brand link lands on the link, not on the band').toBe(true);
      const withBand = await page.locator('body').ariaSnapshot();
      await hideBand(page, band);
      const without = await page.locator('body').ariaSnapshot();
      expect(withBand, 'the accessibility tree is the same with and without the band').toBe(without);
    });

    test('the band is static: nothing animates it, or every animation ends within 5 s', async ({ page }) => {
      await open(page, route, 'dark');
      const band = await expectBand(page, route);
      const animations = await page.evaluate((pseudo) => {
        const host = document.querySelector('[data-test-band]');
        return document
          .getAnimations()
          .filter((a) => {
            const e = /** @type {KeyframeEffect} */ (a.effect);
            const target = e?.target;
            if (!target || !host) return false;
            return pseudo ? target === host && e.pseudoElement === pseudo : host.contains(target);
          })
          .map((a) => ({ name: /** @type {any} */ (a).animationName ?? a.id, end: a.effect?.getComputedTiming().endTime, state: a.playState }));
      }, band.pseudo);
      for (const a of animations) {
        expect(Number(a.end), `animation "${a.name}" ends within 5 s (WCAG 2.2.2: there is no pause control)`).toBeLessThanOrEqual(5000);
      }
    });

    test('the layout is identical with and without the band: header, page head, main and the size of the page', async ({ page }) => {
      await open(page, route, 'dark');
      const band = await expectBand(page, route);
      const measure = () =>
        page.evaluate(() => {
          const round = (n) => Math.round(n * 100) / 100;
          const rect = (selector) => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return [round(r.x), round(r.y + scrollY), round(r.width), round(r.height)];
          };
          return {
            header: rect('#site-header'),
            brand: rect('.site-header__brand'),
            h1: rect('h1'),
            pageHead: rect('.luz-docs-page-head'),
            main: rect('main'),
            body: rect('body'),
            scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
          };
        });
      const withBand = await measure();
      await hideBand(page, band);
      const without = await measure();
      expect(withBand.h1, 'the page has an h1').not.toBeNull();
      expect(withBand).toEqual(without);
    });

    test('axe: no serious or critical violation in dark, with the band', async ({ page }) => {
      await open(page, route, 'dark');
      await expectBand(page, route);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
    });

    test('the text of the header and the page head keeps its contrast over the stars (measured on the pixels: axe cannot see a pseudo-element)', async ({ page }) => {
      await open(page, route, 'dark');
      await expectBand(page, route);
      const runs = await page.evaluate(() => {
        // Text clipped to a 1px box (the sr-only recipe, e.g. "Search docs…") is not read by eye: it is not a run
        const visuallyHidden = (el, root) => {
          for (let e = el; e && e !== root.parentElement; e = e.parentElement) {
            const r = e.getBoundingClientRect();
            if (r.width <= 1 || r.height <= 1 || getComputedStyle(e).clip !== 'auto') return true;
          }
          return false;
        };
        const out = [];
        window.__runParents = [];
        const roots = [document.querySelector('#site-header'), document.querySelector('.luz-docs-page-head')];
        for (const root of roots) {
          if (!root) continue;
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const parent = n.parentElement;
            if (!parent || !n.textContent?.trim() || !parent.checkVisibility()) continue;
            if (parent.closest('[hidden], dialog:not([open]), script, style')) continue;
            if (visuallyHidden(parent, root)) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight);
            const s = getComputedStyle(parent);
            const size = parseFloat(s.fontSize);
            const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
            // the colour it had before the style above made it transparent is read from the token chain: ask a probe
            window.__runParents.push(parent);
            out.push({ text: n.textContent.trim().slice(0, 30), large, parent: parent.className || parent.tagName, rects: rects.map((r) => [r.left, r.top, r.width, r.height]) });
          }
        }
        return out;
      });
      expect(runs.length, 'the header and the page head have text').toBeGreaterThan(3);
      // read each run's real text colour before the text is made transparent (no style is toggled back: WebKit applies that late)
      const colours = await page.evaluate(() => window.__runParents.map((parent) => getComputedStyle(parent).color));
      // Paint the page with its text transparent: what is left behind each line of text is the background it is read on.
      await page.addStyleTag({ content: '#site-header *, .luz-docs-page-head * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }' });
      await nextFrames(page);
      const png = await page.screenshot({ animations: 'disabled' });
      const worst = await page.evaluate(
        async ({ b64, list }) => {
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
          const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
          ctx.drawImage(bitmap, 0, 0);
          const scale = bitmap.width / window.innerWidth;
          // Chromium answers rgb()/rgba(); WebKit answers color(srgb 0.5 0.5 0.5 / 1), whose channels are 0 to 1: let a canvas resolve anything else
          const probe = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
          const toRgba = (css) => {
            if (/^rgba?\(/.test(css)) {
              const [r, g, b, a = 1] = css.match(/[\d.]+/g).map(Number);
              return [r, g, b, a];
            }
            probe.clearRect(0, 0, 1, 1);
            probe.fillStyle = css;
            probe.fillRect(0, 0, 1, 1);
            const d = probe.getImageData(0, 0, 1, 1).data;
            return [d[0], d[1], d[2], d[3] / 255];
          };
          const lum = ([r, g, b]) => {
            const c = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
          };
          const result = [];
          for (const { text, large, colour, rects } of list) {
            const [fr, fg, fb, fa] = toRgba(colour);
            let min = Infinity;
            for (const [cssX, cssY, cssW, cssH] of rects) {
              // the screenshot is in device pixels (WebKit's project runs at a device pixel ratio of 2), the rects in CSS pixels
              const [x, y, w, h] = [cssX * scale, cssY * scale, cssW * scale, cssH * scale];
              const { data } = ctx.getImageData(Math.floor(x), Math.floor(y), Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
              for (let i = 0; i < data.length; i += 4) {
                const bg = [data[i], data[i + 1], data[i + 2]];
                const fgc = [fr * fa + bg[0] * (1 - fa), fg * fa + bg[1] * (1 - fa), fb * fa + bg[2] * (1 - fa)];
                const [l1, l2] = [lum(fgc), lum(bg)];
                min = Math.min(min, (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
              }
            }
            result.push({ text, need: large ? 3 : 4.5, min });
          }
          return result;
        },
        { b64: png.toString('base64'), list: runs.map((r, i) => ({ ...r, colour: colours[i] })) },
      );
      const low = worst.filter((r) => Number.isFinite(r.min) && r.min < r.need).map((r) => `"${r.text}": ${r.min.toFixed(2)}:1 needs ${r.need}:1`);
      expect(low, 'every line of text in the header and the page head still meets WCAG 1.4.3 over the stars').toEqual([]);
    });

    test('320 px: the page does not scroll sideways, and the band is there', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await open(page, route, 'dark');
      await expectBand(page, `${route} at 320 px`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  });
}

test.describe('where the stars are not', () => {
  test('light: no band, and the same page in dark has it', async ({ page }) => {
    await open(page, '/docs/', 'light', '14:00');
    expect(await findBand(page), 'no band of stars in light').toBeNull();
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await expectBand(page, 'the same page with data-theme switched to dark (the band is keyed on data-theme)');
  });

  test('high contrast: no band, and the same page in dark has it', async ({ page }) => {
    await open(page, '/docs/', 'high-contrast');
    expect(await findBand(page), 'no band of stars in high contrast').toBeNull();
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await expectBand(page, 'the same page with data-theme switched to dark');
  });

  test('forced colours: no band, and without forced colours the same page has it', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page, '/docs/', 'dark');
    expect(await findBand(page), 'no band of stars under forced colours').toBeNull();
    await page.emulateMedia({ forcedColors: 'none' });
    await expectBand(page, 'the same page without forced colours');
  });

  test('the 404 page links reference.css too: dark gives it the band, as it is served (light, no script) it has none', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.locator('link[rel="stylesheet"][href$="/apps/docs/reference.css"]'), 'the 404 links reference.css').toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await findBand(page), 'the 404 as served is light: no band').toBeNull();
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await expectBand(page, '404 with data-theme dark');
  });
});

test.describe('the lights of the hour (no stored choice)', () => {
  test.use({ storageState: NO_CHOICE });

  for (const [light, hhmm, mode] of LIGHTS) {
    test(`${light} (${mode}): ${mode === 'dark' ? 'the band of stars is drawn' : 'no band'}`, async ({ page }) => {
      await atTime(page, hhmm);
      await page.goto('/docs/');
      await expect(page.locator('html')).toHaveAttribute('data-light', light);
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      await faded(page);
      const band = await findBand(page);
      if (mode === 'dark') expect(band, `${light} sits over dark: the stars show`).not.toBeNull();
      else expect(band, `${light} sits over light: no stars`).toBeNull();
    });
  }
});
