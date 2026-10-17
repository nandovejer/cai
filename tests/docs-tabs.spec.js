/**
 * LUZ — the Code and Design tabs of the component pages, and the core tabs
 * fixes they rely on (a11y.md TAB-4 to TAB-17, NAV-13, findings F1, F2, F3
 * and F7; ia.md §6 and §8).
 * Core tabs.js: a fragment that names an element inside a hidden panel opens
 * its tab (on load, on hashchange and from an in-page link); inactive panels
 * are hidden="until-found" and "beforematch" opens them; Space selects; Left
 * and Right follow the reading direction.
 * Docs glue (apps/docs/view.js): the last tab chosen is remembered under
 * "luz-docs-view"; the fragment beats it, restoring is silent, and only a
 * click or a key press on a tab is stored.
 * Run with: pnpm test:ui
 */
import { test, expect } from '@playwright/test';
import { routeOf } from './helpers/docs-site.js';

const BUTTON = routeOf('c-button');
const KEY = 'luz-docs-view';

const tab = (page, name) => page.getByRole('tablist', { name: /documentation$/ }).getByRole('tab', { name });
const stored = (page) => page.evaluate((key) => localStorage.getItem(key), KEY);
const storeBefore = (page, value) => page.addInitScript(([key, v]) => {
  // Only once per test, so a later reload keeps what the page stored
  if (!window.sessionStorage.getItem('seeded')) {
    localStorage.setItem(key, v);
    window.sessionStorage.setItem('seeded', '1');
  }
}, [KEY, value]);
const inViewport = (page, id) => page.evaluate((i) => {
  const r = document.getElementById(i).getBoundingClientRect();
  const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
  return r.top >= header - 1 && r.top < window.innerHeight;
}, id);

test.describe('Code and Design tabs on a component page', () => {
  test('Code is selected by default; Design is hidden until found (TAB-6, TAB-16)', async ({ page }) => {
    await page.goto(BUTTON);
    await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#design-panel')).toHaveAttribute('hidden', 'until-found');
    await expect(page.locator('#design-panel')).toBeHidden();
    // The panel's h2 stays for screen readers and "On this page" (TAB-2)
    await expect(page.locator('#code')).toHaveCount(1);
    expect(await page.locator('#code').evaluate((h) => h.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
    expect(await stored(page)).toBeNull();
  });

  test('the selected tab is marked by more than colour, also in forced colors (TAB-8)', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(BUTTON);
    const cue = (name) => tab(page, name).evaluate((el) => {
      const s = getComputedStyle(el);
      return { weight: s.fontWeight, border: s.borderBottomColor, width: s.borderBottomWidth };
    });
    const code = await cue('Code');
    const design = await cue('Design');
    expect(code.weight).not.toBe(design.weight);
    expect(code.border).not.toBe(design.border);
    expect(code.width).toBe('2px');
    // Targets of at least 24px (TAB-9)
    for (const name of ['Code', 'Design']) {
      const box = await tab(page, name).boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });

  test('a deep link into the hidden tab opens it and shows the section, over the stored choice (TAB-5, TAB-11)', async ({ page }) => {
    await storeBefore(page, 'design');
    await page.goto(`${BUTTON}#keyboard`);
    await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
    expect(await inViewport(page, 'keyboard')).toBe(true);
    // A fragment does not change the reader's choice (TAB-14)
    expect(await stored(page)).toBe('design');
  });

  test('a deep link below the tabs is still in view once the stored tab is restored (TAB-12)', async ({ page }) => {
    await storeBefore(page, 'code');
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto(`${routeOf('c-player')}#when-not`);
    await expect(tab(page, 'Design')).toHaveAttribute('aria-selected', 'true');
    expect(await inViewport(page, 'when-not')).toBe(true);
  });

  test('the stored tab opens on the next page, silently (TAB-13)', async ({ page }) => {
    await page.goto(BUTTON);
    await tab(page, 'Design').click();
    // view.js stores the choice once the click has been handled (a timeout)
    await expect.poll(() => stored(page)).toBe('design');
    const before = await page.evaluate(() => window.history.length);
    await page.goto(routeOf('c-card'));
    await expect(tab(page, 'Design')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#design-panel')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    expect(new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(() => window.history.length)).toBe(before + 1);
  });

  test('a stored value other than code or design is ignored (SEC-MISC-1)', async ({ page }) => {
    await storeBefore(page, '<img src=x onerror=alert(1)>');
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BUTTON);
    await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
    expect(errors).toEqual([]);
  });

  test('storage that throws leaves Code selected and no error (TAB-15)', async ({ page }) => {
    await page.addInitScript(() => {
      const fail = () => {
        throw new window.DOMException('blocked', 'SecurityError');
      };
      Object.defineProperty(window, 'localStorage', { get: fail, configurable: true });
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(BUTTON);
    await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
    await tab(page, 'Design').click();
    await expect(page.locator('#design-panel')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('"On this page" opens the tab of the section it links to, scrolls to it and focuses it (NAV-13)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BUTTON);
    const toc = page.getByRole('navigation', { name: 'On this page' });
    await toc.getByRole('link', { name: 'When not to use' }).click();
    await expect(tab(page, 'Design')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#when-not')).toBeFocused();
    // Smooth scrolling (no reduced-motion preference) takes a moment
    await expect.poll(() => inViewport(page, 'when-not')).toBe(true);
    // Followed links are not a choice (TAB-14)
    expect(await stored(page)).toBeNull();
    // Back to Code by the cross-link at the end of the Design tab
    await page.locator('#design-panel .docs-view__xref a').click();
    await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#keyboard')).toBeFocused();
    // The same link again, after choosing Design by hand: the hash does not change
    await tab(page, 'Design').click();
    await page.locator('#design-panel .docs-view__xref a').click();
    await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
  });

  test('Back and Forward between sections open their tab (hashchange)', async ({ page }) => {
    await page.goto(BUTTON);
    await page.locator('#code-panel .docs-view__xref a').click();
    await expect(tab(page, 'Design')).toHaveAttribute('aria-selected', 'true');
    await page.goBack();
    await page.goForward();
    await page.evaluate(() => { location.hash = '#how'; });
    await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
  });

  test('find in page opens the hidden tab: beforematch selects it (TAB-6, F2)', async ({ page }) => {
    await page.goto(BUTTON);
    await page.locator('#design-panel').evaluate((panel) => panel.dispatchEvent(new Event('beforematch', { bubbles: true })));
    await expect(tab(page, 'Design')).toHaveAttribute('aria-selected', 'true');
    expect(await stored(page)).toBeNull();
  });

  test('keyboard: arrows, Home, End and Space select a tab, and are stored (TAB-4, TAB-7)', async ({ page }) => {
    // The tab row is below the fold at 1280x720: focusing a tab scrolls it into view, and smooth scrolling
    // would still be moving when scrollY is read
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BUTTON);
    await tab(page, 'Code').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'Design')).toBeFocused();
    await expect(tab(page, 'Design')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => stored(page)).toBe('design');
    await page.keyboard.press('Home');
    await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => stored(page)).toBe('code');
    const y = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Space');
    await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
    // Space must not scroll the page (a link's default). Focusing the tab may
    // round its position under the sticky header by a pixel: not a scroll.
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - y)).toBeLessThanOrEqual(1);
  });
});

test.describe('core tabs', () => {
  test('Left and Right follow the reading direction in right-to-left text (F7)', async ({ page }) => {
    await page.goto(routeOf('tab-summary'));
    await page.locator('#tab-summary').evaluate((t) => t.closest('.luz-tabs').setAttribute('dir', 'rtl'));
    await page.focus('#tab-summary');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#tab-settings')).toBeFocused();
    await expect(page.locator('#tab-settings')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tab-summary')).toBeFocused();
    // Up and Down do not depend on the direction
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#tab-settings')).toBeFocused();
  });

  test('Space selects the focused tab without scrolling the page (F3)', async ({ page }) => {
    await page.goto(routeOf('tab-summary'));
    await page.focus('#tab-settings');
    const y = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Space');
    await expect(page.locator('#tab-settings')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-settings')).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
  });

  test('an "until-found" panel is not removed by the CSS, a plain hidden one is (F2)', async ({ page }) => {
    await page.goto(routeOf('tab-summary'));
    const display = (value) => page.locator('#panel-logs').evaluate((p, v) => {
      p.setAttribute('hidden', v);
      return getComputedStyle(p).display;
    }, value);
    expect(await display('until-found')).not.toBe('none');
    expect(await display('')).toBe('none');
  });
});

/* ---- The tab row sticks under the site header --------------------------- */

const SIZES = [
  { name: '1280 px', width: 1280, height: 800 },
  { name: '375 px', width: 375, height: 667 },
];

const rowBox = (page) => page.evaluate(() => {
  const row = document.querySelector('nav.luz-tabs.docs-view-tabs');
  const r = row.getBoundingClientRect();
  const header = document.querySelector('.site-header').getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, height: r.height, headerBottom: header.bottom, scrollY: window.scrollY };
});

// Instant, whatever scroll-behavior the page sets
const scrollToPanelMiddle = (page, id) => page.evaluate((panelId) => {
  const panel = document.getElementById(panelId);
  const rect = panel.getBoundingClientRect();
  const y = rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2;
  window.scrollTo({ top: y, behavior: 'instant' });
}, id);

// The smooth scroll of a followed link takes a moment: wait until the heading stops
const settled = async (page, id) => {
  let last = null;
  await expect.poll(async () => {
    const top = await page.evaluate((i) => document.getElementById(i).getBoundingClientRect().top, id);
    const same = last !== null && Math.abs(top - last) < 0.5;
    last = top;
    return same;
  }, { intervals: [150, 150, 150, 250, 250, 500], timeout: 5000 }).toBe(true);
};

const expectBelowTabs = async (page, id) => {
  await settled(page, id);
  const { headingTop, rowBottom } = await page.evaluate((i) => ({
    headingTop: document.getElementById(i).getBoundingClientRect().top,
    rowBottom: document.querySelector('nav.luz-tabs.docs-view-tabs').getBoundingClientRect().bottom,
  }), id);
  // Fully below the row: scroll-margin accounts for the header and the tabs
  expect(headingTop, `#${id} top ${headingTop} vs tab row bottom ${rowBottom}`).toBeGreaterThanOrEqual(rowBottom - 0.5);
};

for (const size of SIZES) {
  test.describe(`the tab row is sticky at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('its computed position is sticky and its background is opaque', async ({ page }) => {
      await page.goto(BUTTON);
      const style = await page.locator('nav.luz-tabs.docs-view-tabs').evaluate((el) => {
        const s = getComputedStyle(el);
        return { position: s.position, background: s.backgroundColor };
      });
      expect(style.position).toBe('sticky');
      // Text scrolling under the row must be hidden: not transparent, alpha 1
      expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(style.background).not.toBe('transparent');
      const alpha = style.background.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/);
      expect(alpha ? Number(alpha[1]) : 1).toBe(1);
    });

    for (const [panel, label] of [['code-panel', 'Code'], ['design-panel', 'Design']]) {
      test(`in the middle of the ${label} panel the row sits right under the header`, async ({ page }) => {
        await page.goto(BUTTON);
        if (label === 'Design') {
          await tab(page, 'Design').click();
          await expect(page.locator('#design-panel')).toBeVisible();
        }
        await scrollToPanelMiddle(page, panel);
        await expect(page.locator('nav.luz-tabs.docs-view-tabs')).toBeInViewport({ ratio: 1 });
        const box = await rowBox(page);
        expect(box.scrollY).toBeGreaterThan(300);
        expect(Math.abs(box.top - box.headerBottom)).toBeLessThanOrEqual(1);
        // And the row is what the header's variable says it is
        const headerH = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-h')));
        expect(Math.abs(box.top - headerH)).toBeLessThanOrEqual(1);
      });
    }

    test('clicking Design while stuck shows the Design panel and the row stays stuck', async ({ page }) => {
      await page.goto(BUTTON);
      await scrollToPanelMiddle(page, 'code-panel');
      const before = await rowBox(page);
      expect(Math.abs(before.top - before.headerBottom)).toBeLessThanOrEqual(1);
      await tab(page, 'Design').click();
      await expect(tab(page, 'Design')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#design-panel')).toBeVisible();
      await expect(page.locator('#code-panel')).toBeHidden();
      await expect(page.locator('nav.luz-tabs.docs-view-tabs')).toBeInViewport({ ratio: 1 });
      const after = await rowBox(page);
      expect(Math.abs(after.top - after.headerBottom)).toBeLessThanOrEqual(1);
    });

    test('a link to #keyboard puts the heading fully below the tab row', async ({ page }) => {
      await page.goto(BUTTON);
      await tab(page, 'Design').click();
      await expect(page.locator('#design-panel')).toBeVisible();
      await page.locator('#design-panel .docs-view__xref a').click();
      await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
      await expectBelowTabs(page, 'keyboard');
    });

    test('a link to #contrast puts the heading fully below the tab row', async ({ page }) => {
      await page.goto(BUTTON);
      await page.locator('#code-panel .docs-view__xref a').click();
      await expect(tab(page, 'Design')).toHaveAttribute('aria-selected', 'true');
      await expectBelowTabs(page, 'contrast');
    });

    test('loading the page at #how puts the heading fully below the tab row', async ({ page }) => {
      await page.goto(`${BUTTON}#how`);
      await expect(tab(page, 'Code')).toHaveAttribute('aria-selected', 'true');
      await expectBelowTabs(page, 'how');
    });
  });
}

test.describe('without JavaScript the tab row blocks nothing', () => {
  test.use({ javaScriptEnabled: false });

  for (const size of SIZES) {
    for (const id of ['how', 'keyboard', 'contrast']) {
      test(`#${id} is visible at ${size.name} and the page does not scroll sideways`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto(`${BUTTON}#${id}`);
        await expect(page.locator(`#${id}`)).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        // The heading is not left under the sticky header or the tab row
        await expect.poll(() => page.evaluate((i) => {
          const top = document.getElementById(i).getBoundingClientRect().top;
          const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
          const row = document.querySelector('nav.luz-tabs.docs-view-tabs').getBoundingClientRect();
          // At the tab row's own place only when the page cannot scroll further
          return top >= header - 1 && (row.bottom <= top + 0.5 || row.top >= top || window.scrollY === 0);
        }, id)).toBe(true);
      });
    }
  }
});
