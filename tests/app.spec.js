// @ts-check
/**
 * @luz-ds/app 0.1 (.claude/plans/specs/f3-package-model.md, section 6 and
 * section 9 step 14; .claude/plans/specs/f3-ux.md, section 2 and the
 * accessibility answers A1 to A13; accessibility requirements O5, O6): the
 * header of an application and its dashboard, composed from core's `.o-shell`
 * and `.o-main`, the sidebar drawer, `.o-sticky`, `.luz-nav-toggle`, `.o-row`,
 * `.luz-dropdown`, `.luz-avatar`, `.o-grid` and `.luz-card`. No script.
 *
 *   header.luz-app-header.o-sticky inside .o-main (the page's banner)
 *     > div.o-row: core's toggle (`__toggle`), `__product` (the product name,
 *       only while the sidebar is a drawer), div.o-row.`__actions` (an optional
 *       <luz-search>, then the account dropdown whose button is `__account`:
 *       initials in `.luz-avatar`, then `__account-name`, clipped at 320 px but
 *       kept in the accessible name).
 *   main.luz-app-dashboard (the container of the size query; its sibling is the
 *     header): div.__head (the view's one h1 and its actions), then
 *     ul.o-grid.o-grid--auto of li.luz-card.__panel (an h2 each), `__panel--wide`
 *     two columns from a 40rem container.
 *
 * Pages: tests/fixtures/app.html (tokens, core and app; site NOT loaded) and
 * tests/fixtures/app-site.html (the same, with site and a <luz-search>). The
 * collapse of the sidebar is tested once, in core (tests/ui.spec.js); the
 * stickiness of `.o-sticky` by tests/objects.spec.js. Here: that app wires
 * them together and adds only its own skin and rhythm.
 * Runs in `chromium` and `chromium-nojs`: nothing needs a script.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MODES, contrast } from './helpers/design-tokens.js';

const PLAIN = '/tests/fixtures/app.html';
const WITH_SITE = '/tests/fixtures/app-site.html';

/** The minimum width of a panel's column, from the spec (section 6): 18rem. */
const PANEL_MIN = '18rem';

/** A CSS length expression (`var(--luz-space-md)`) resolved to pixels, in the page. */
const px = (page, expression) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${value}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, expression);

/** The computed `property` of a probe styled with `declaration`. */
const resolved = (page, declaration, property) =>
  page.evaluate(([css, name]) => {
    const probe = document.createElement('div');
    probe.style.cssText = css;
    document.body.append(probe);
    const value = getComputedStyle(probe)[name];
    probe.remove();
    return value;
  }, [declaration, property]);

const color = (page, token) => resolved(page, `color:var(${token})`, 'color');
const style = (page, selector, property) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], property);
const box = (page, selector) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().toJSON());
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const near = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;

/** Presses Tab `n` times and reads the id of what has focus after each press. */
async function tabs(page, n) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    seen.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName.toLowerCase()));
  }
  return seen;
}

/** Axe, serious and critical only, in a mode. */
async function axeIn(page, mode) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, mode);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id);
}

/** Row-major order of the panels as drawn: top, then inline start (mirrored in rtl). */
const drawnOrder = (page) =>
  page.evaluate(() => {
    const rtl = getComputedStyle(document.documentElement).direction === 'rtl';
    const panels = [...document.querySelectorAll('#grid > li')].map((li) => ({ id: li.id, ...li.getBoundingClientRect().toJSON() }));
    const rows = [];
    for (const p of [...panels].sort((a, b) => a.top - b.top)) {
      const row = rows.find((r) => Math.abs(r.top - p.top) < 2);
      if (row) row.items.push(p);
      else rows.push({ top: p.top, items: [p] });
    }
    return rows.flatMap((r) => r.items.sort((a, b) => (rtl ? b.left - a.left : a.left - b.left)).map((p) => p.id));
  });

/* ======================================================================== */
/* The header and the drawer, with and without site                         */
/* ======================================================================== */

for (const [label, url] of [['without site', PLAIN], ['with site', WITH_SITE]]) {
  test.describe(`app header, ${label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(url);
    });

    test('is the page banner in .o-main, beside the one main that holds the h1 and the primary action', async ({ page }) => {
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      const facts = await page.evaluate(() => {
        const hdr = document.getElementById('hdr');
        const main = document.querySelector('main');
        return {
          parentIsMain: hdr.parentElement === document.getElementById('main'),
          bannerInMain: !!hdr.closest('main'),
          mainInBanner: !!main.closest('header'),
          h1InMain: document.querySelectorAll('h1').length === 1 && !!document.querySelector('h1').closest('main'),
          h1InBar: !!hdr.querySelector('h1'),
          primaryOutsideBar: document.querySelectorAll('.luz-btn--primary').length === 1 && !hdr.querySelector('.luz-btn--primary') && !!document.querySelector('.luz-btn--primary').closest('main'),
          mainIsDashboard: main.classList.contains('luz-app-dashboard'),
        };
      });
      expect(facts).toEqual({ parentIsMain: true, bannerInMain: false, mainInBanner: false, h1InMain: true, h1InBar: false, primaryOutsideBar: true, mainIsDashboard: true });
    });

    test('has the skin of a quiet bar: a surface, a divider under it, sticky through core, one row of --luz-bar-h', async ({ page }) => {
      const surfaces = [await color(page, '--luz-surface-page'), await color(page, '--luz-surface')];
      expect(surfaces).toContain(await style(page, '#hdr', 'backgroundColor'));
      expect(await style(page, '#hdr', 'borderBlockEndWidth')).toBe('1px');
      expect(await style(page, '#hdr', 'borderBlockEndStyle')).toBe('solid');
      expect(await style(page, '#hdr', 'borderBlockEndColor')).toBe(await color(page, '--luz-divider'));
      expect(await style(page, '#hdr', 'position')).toBe('sticky');
      expect((await box(page, '#hdr')).height).toBeCloseTo(await px(page, 'var(--luz-bar-h)'), 0);
    });

    test('320 px: still one row of --luz-bar-h, the toggle first and the product beside it', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      expect((await box(page, '#hdr')).height).toBeCloseTo(await px(page, 'var(--luz-bar-h)'), 0);
      const { toggle, product, actions } = { toggle: await box(page, '#toggle'), product: await box(page, '#product'), actions: await box(page, '#actions') };
      expect(toggle.right).toBeLessThanOrEqual(product.left + 0.5);
      expect(product.right).toBeLessThanOrEqual(actions.left + 0.5);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });

    test('the actions sit at the inline end of the bar, and the toggle starts where the content starts', async ({ page }) => {
      const wide = { actions: await box(page, '#actions'), hdr: await box(page, '#hdr') };
      expect(near(wide.hdr.right - wide.actions.right, await px(page, 'var(--luz-space-xl)'), 1.5)).toBe(true);
      for (const width of [600, 768]) {
        await page.setViewportSize({ width, height: 800 });
        const [toggle, title, actions, hdr] = [await box(page, '#toggle'), await box(page, '#title'), await box(page, '#actions'), await box(page, '#hdr')];
        expect(near(toggle.left, title.left), `${width}: toggle ${toggle.left}, title ${title.left}`).toBe(true);
        expect(near(hdr.right - actions.right, title.left - hdr.left), `${width}: actions end ${actions.right}`).toBe(true);
      }
    });

    test('the product name shows only while the sidebar is a drawer (768 px and below), in its own weight and size', async ({ page }) => {
      await expect(page.locator('#product')).toBeHidden();
      for (const width of [768, 320]) {
        await page.setViewportSize({ width, height: 800 });
        await expect(page.locator('#product')).toBeVisible();
      }
      expect(await style(page, '#product', 'fontWeight')).toBe('600');
      expect(await style(page, '#product', 'fontSize')).toBe(await resolved(page, 'font-size:var(--luz-text-md)', 'fontSize'));
      expect(await style(page, '#product', 'color')).toBe(await color(page, '--luz-text-primary'));
    });

    test('the product name and the sidebar brand are never both in the tree: "Bodega" is visible once at 320, 768 and 1280', async ({ page }) => {
      for (const width of [320, 768, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        const visible = await page.evaluate(() => [...document.querySelectorAll('#product, .luz-sidebar__brand-name')].filter((el) => el.checkVisibility({ checkVisibilityCSS: true })).length);
        expect(visible, `${width} px`).toBe(1);
      }
    });

    test('1280 px: the sidebar is a column, the toggle is not there', async ({ page }) => {
      await expect(page.locator('#toggle')).toBeHidden();
      await expect(page.locator('#app-nav')).toBeVisible();
      expect(await page.locator('#app-nav').evaluate((el) => el.matches(':popover-open'))).toBe(false);
    });

    test('768 px: the toggle is a named 44 px control that opens core\'s drawer; Escape closes it and the focus is back', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 800 });
      await expect(page.locator('#app-nav')).toBeHidden();
      await expect(page.locator('#toggle')).toBeVisible();
      const control = await px(page, 'var(--luz-control-lg)');
      const rect = await box(page, '#toggle');
      expect(rect.width).toBeGreaterThanOrEqual(control - 0.5);
      expect(rect.height).toBeGreaterThanOrEqual(control - 0.5);
      expect(await page.locator('#toggle').getAttribute('popovertarget')).toBe('app-nav');
      const name = await page.locator('#toggle').getAttribute('aria-label');
      expect((name ?? '').trim().length).toBeGreaterThan(0);
      expect(name).not.toBe('☰');
      await page.click('#toggle');
      await expect(page.locator('#app-nav')).toBeVisible();
      expect(await page.locator('#app-nav').evaluate((el) => el.matches(':popover-open'))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(page.locator('#app-nav')).toBeHidden();
      await expect(page.locator('#toggle')).toBeFocused();
    });

    test('the sidebar is the one navigation, named "Main", and no name repeats', async ({ page }) => {
      const names = await page.getByRole('navigation').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
      expect(names).toEqual(['Main']);
    });

    test('forced colors keep the divider under the bar', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      expect(await style(page, '#hdr', 'borderBlockEndStyle')).toBe('solid');
      expect(parseFloat(await style(page, '#hdr', 'borderBlockEndWidth'))).toBeGreaterThanOrEqual(1);
    });

    test('the page does not scroll sideways at 320, 768 and 1280 px', async ({ page }) => {
      for (const width of [320, 768, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        expect(await sideways(page), `${width} px`).toBeLessThanOrEqual(0);
      }
    });
  });
}

/* ======================================================================== */
/* The account control (A4, A12)                                            */
/* ======================================================================== */

test.describe('app header: the account control', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(PLAIN);
  });

  for (const width of [320, 1280]) {
    test(`${width} px: its name starts with the initials it shows, "AM Ana Martín", and contains all its visible text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.getByRole('button', { name: 'AM Ana Martín', exact: true })).toHaveCount(1);
      const { visible, name } = await page.locator('#account-btn').evaluate((button) => {
        const texts = [];
        const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const el = node.parentElement;
          const r = el.getBoundingClientRect();
          if (node.textContent.trim() && r.width > 1 && r.height > 1 && getComputedStyle(el).visibility === 'visible') texts.push(node.textContent.trim());
        }
        return { visible: texts, name: button.textContent };
      });
      expect(visible.length).toBeGreaterThan(0);
      for (const text of visible) expect(name.replace(/\s+/g, ' ').toLowerCase()).toContain(text.toLowerCase());
      expect(await page.locator('#avatar').getAttribute('aria-hidden'), 'the initials are text, so they are in the name').toBeNull();
    });
  }

  test('320 px: avatar only, the name clipped with the visually-hidden technique (not display: none), a 44 px target', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const control = await px(page, 'var(--luz-control-lg)');
    const button = await box(page, '#account-btn');
    expect(button.width).toBeGreaterThanOrEqual(control - 0.5);
    expect(button.height).toBeGreaterThanOrEqual(control - 0.5);
    const clipped = await page.locator('#account-name').evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { display: cs.display, visibility: cs.visibility, fontSize: cs.fontSize, width: r.width, height: r.height };
    });
    expect(clipped.display).not.toBe('none');
    expect(clipped.visibility).toBe('visible');
    expect(parseFloat(clipped.fontSize)).toBeGreaterThan(0);
    expect(clipped.width).toBeLessThanOrEqual(1);
    expect(clipped.height).toBeLessThanOrEqual(1);
  });

  test('768 and 1280 px: avatar and name both show, in a 44 px high button', async ({ page }) => {
    const control = await px(page, 'var(--luz-control-lg)');
    for (const width of [768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      const name = await box(page, '#account-name');
      expect(name.width, `${width}: name`).toBeGreaterThan(20);
      expect((await box(page, '#account-btn')).height, `${width}: button`).toBeGreaterThanOrEqual(control - 0.5);
      const [avatar, label] = [await box(page, '#avatar'), name];
      expect(avatar.right, 'the initials come first').toBeLessThanOrEqual(label.left + 0.5);
    }
  });

  for (const mode of MODES) {
    test(`the initials are 4.5:1 on their fill in ${mode}`, () => {
      expect(contrast(mode, 'brand-primary', 'brand-subtle')).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('is a disclosure of links, not an ARIA menu: popovertarget, no aria-haspopup, no menu roles', async ({ page }) => {
    expect(await page.locator('#account-btn').getAttribute('popovertarget')).toBe('account-menu');
    expect(await page.locator('#account-btn').getAttribute('aria-haspopup')).toBeNull();
    expect(await page.locator('[role="menu"], [role="menuitem"]').count()).toBe(0);
    await expect(page.locator('#account-menu')).toBeHidden();
  });

  test('Enter opens it with the focus on the button, Tab reaches both links in order, Escape closes it and the focus is back', async ({ page }) => {
    await page.locator('#account-btn').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#account-menu')).toBeVisible();
    expect(await tabs(page, 2)).toEqual(['settings', 'signout']);
    await page.keyboard.press('Escape');
    await expect(page.locator('#account-menu')).toBeHidden();
    await expect(page.locator('#account-btn')).toBeFocused();
  });

  for (const width of [320, 768, 1280]) {
    test(`${width} px: the open list is whole inside the window (the button is at the inline end of the bar)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.click('#account-btn');
      await expect(page.locator('#account-menu')).toBeVisible();
      const menu = await box(page, '#account-menu');
      expect(menu.left).toBeGreaterThanOrEqual(-0.5);
      expect(menu.right).toBeLessThanOrEqual(width + 0.5);
      expect(menu.top).toBeGreaterThanOrEqual(-0.5);
    });
  }
});

/* ======================================================================== */
/* The title row and the dashboard                                          */
/* ======================================================================== */

test.describe('app dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(PLAIN);
  });

  test('the main is the container of the size query, and the panels are cards in a list under their own h2', async ({ page }) => {
    expect(await style(page, 'main.luz-app-dashboard', 'containerType')).toBe('inline-size');
    const facts = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#grid > li')];
      return {
        count: items.length,
        allCards: items.every((li) => li.classList.contains('luz-card') && li.classList.contains('luz-app-dashboard__panel')),
        startsWithH2: items.every((li) => li.firstElementChild?.tagName === 'H2'),
        headIsDiv: document.getElementById('head').tagName === 'DIV',
        headInMain: !!document.getElementById('head').closest('main'),
      };
    });
    expect(facts).toEqual({ count: 8, allCards: true, startsWithH2: true, headIsDiv: true, headInMain: true });
  });

  test('the title row: the h1 in the heading size, 600 and the text colour; its actions are links with a href', async ({ page }) => {
    expect(await style(page, '#title', 'fontSize')).toBe(await resolved(page, 'font-size:var(--luz-text-2xl)', 'fontSize'));
    expect(await style(page, '#title', 'fontWeight')).toBe('600');
    expect(await style(page, '#title', 'color')).toBe(await color(page, '--luz-text-primary'));
    const links = await page.locator('#head-actions > *').evaluateAll((els) => els.map((el) => `${el.tagName}:${el.hasAttribute('href')}`));
    expect(links).toEqual(['A:true', 'A:true']);
    // One row at 1280 px, the actions at the inline end
    const [title, actions, head] = [await box(page, '#title'), await box(page, '#head-actions'), await box(page, '#head')];
    expect(near(title.top + title.height / 2, actions.top + actions.height / 2, title.height)).toBe(true);
    expect(actions.right).toBeGreaterThan(head.right - 2);
    // 640 px and below: the next size step of the scale
    await page.setViewportSize({ width: 600, height: 800 });
    expect(await style(page, '#title', 'fontSize')).toBe(await resolved(page, 'font-size:var(--luz-text-xl)', 'fontSize'));
  });

  test('320 px: the actions are a column below the h1', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const [title, actions] = [await box(page, '#title'), await box(page, '#head-actions')];
    expect(actions.top).toBeGreaterThanOrEqual(title.bottom - 0.5);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  for (const [width, columns] of [[320, 1], [768, 2], [1280, 3]]) {
    test(`${width} px: ${columns} column${columns > 1 ? 's' : ''}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const tracks = await page.locator('#grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(tracks).toBe(columns);
    });
  }

  test('the columns are as many as fit, none narrower than 18rem, at any width', async ({ page }) => {
    const min = await px(page, PANEL_MIN);
    for (const width of [320, 480, 640, 768, 1000, 1170, 1280, 1600]) {
      await page.setViewportSize({ width, height: 800 });
      const { tracks, inline, gap } = await page.locator('#grid').evaluate((el) => {
        const cs = getComputedStyle(el);
        return { tracks: cs.gridTemplateColumns.split(' ').map(parseFloat), inline: el.getBoundingClientRect().width, gap: parseFloat(cs.columnGap) };
      });
      const fit = Math.max(1, Math.floor((inline + gap) / (min + gap)));
      expect(tracks.length, `${width} px (grid ${Math.round(inline)} px)`).toBe(fit);
      if (tracks.length > 1) for (const t of tracks) expect(t, `${width} px`).toBeGreaterThanOrEqual(min - 0.5);
    }
  });

  test('1280 px: a wide panel takes two columns and its neighbour the third', async ({ page }) => {
    const [narrow, wide, next, gap] = [await box(page, '#p2'), await box(page, '#p3'), await box(page, '#p4'), await page.locator('#grid').evaluate((el) => parseFloat(getComputedStyle(el).columnGap))];
    expect(near(wide.width, 2 * narrow.width + gap), `${wide.width} = 2 x ${narrow.width} + ${gap}`).toBe(true);
    expect(near(next.top, wide.top, 2), 'p4 is in the same row as the wide panel').toBe(true);
  });

  test('768 px: the wide panel takes both columns', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    const [wide, grid] = [await box(page, '#p3'), await box(page, '#grid')];
    expect(near(wide.width, grid.width), `${wide.width} of ${grid.width}`).toBe(true);
  });

  test('320 px: the wide panel is one column and stays inside the page', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const [wide, narrow, grid] = [await box(page, '#p3'), await box(page, '#p2'), await box(page, '#grid')];
    expect(near(wide.width, narrow.width)).toBe(true);
    expect(wide.right).toBeLessThanOrEqual(grid.right + 0.5);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  for (const width of [320, 768, 1280]) {
    test(`${width} px with 200 % text: no panel leaves its column and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const { overflow, outside } = await page.evaluate(() => {
        const main = document.getElementById('main-content').getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          outside: [...document.querySelectorAll('#grid > li')].filter((li) => li.getBoundingClientRect().right > main.right + 0.5 || li.getBoundingClientRect().left < main.left - 0.5).map((li) => li.id),
        };
      });
      expect(overflow).toBeLessThanOrEqual(0);
      expect(outside).toEqual([]);
    });
  }

  test('a long line of code in a panel scrolls inside it: the column does not widen at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const { panel, grid, inside } = await page.evaluate(() => {
      const li = document.getElementById('p6');
      const pre = document.getElementById('long');
      return {
        panel: li.getBoundingClientRect().width,
        grid: document.getElementById('grid').getBoundingClientRect().width,
        inside: pre.scrollWidth > pre.clientWidth,
      };
    });
    expect(panel).toBeLessThanOrEqual(grid + 0.5);
    expect(inside, 'the line is longer than the panel, so the test means something').toBe(true);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  for (const width of [320, 768, 1280]) {
    test(`${width} px: the drawn order is the order of the markup (no dense packing, no order)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      expect(await drawnOrder(page)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
    });
  }

  test('right to left: the same order, mirrored, with the toggle and the actions at the other ends', async ({ page }) => {
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    expect(await drawnOrder(page)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
    const [p1, p2] = [await box(page, '#p1'), await box(page, '#p2')];
    expect(p1.left).toBeGreaterThan(p2.left);
    await page.setViewportSize({ width: 600, height: 800 });
    const [toggle, actions, hdr] = [await box(page, '#toggle'), await box(page, '#actions'), await box(page, '#hdr')];
    expect(toggle.left).toBeGreaterThan(actions.left);
    expect(hdr.right - toggle.right).toBeLessThan(toggle.left - hdr.left);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

/* ======================================================================== */
/* Keyboard: the skip link, the order of the stops, what the bar covers     */
/* ======================================================================== */

test.describe('app keyboard', () => {
  test('1280 px: the skip link is first, skips the sidebar and lands the next Tab inside main', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(PLAIN);
    await page.keyboard.press('Tab');
    await expect(page.locator('#skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('new-report');
  });

  test('320 px: the skip link is first and the next Tab after it is inside main', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(PLAIN);
    await page.keyboard.press('Tab');
    await expect(page.locator('#skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true);
  });

  test('1280 px, with site: Tab follows the drawing: skip, sidebar, search, account, then the view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(WITH_SITE);
    expect(await tabs(page, 9)).toEqual(['skip', 'side-brand', 'side-overview', 'side-reports', 'side-stock', 'fallback', 'account-btn', 'new-report', 'export']);
    // The search is drawn before the account control, at the inline start of it
    expect((await box(page, '#fallback')).right).toBeLessThanOrEqual((await box(page, '#account-btn')).left + 0.5);
  });

  test('600 px, with site: the closed drawer is out of the order: skip, toggle, search, account, then the view', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(WITH_SITE);
    expect(await tabs(page, 7)).toEqual(['skip', 'toggle', 'fallback', 'account-btn', 'new-report', 'export', 'p1-link']);
  });

  test('600 px, without site: skip, toggle, account, then the view', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(PLAIN);
    expect(await tabs(page, 5)).toEqual(['skip', 'toggle', 'account-btn', 'new-report', 'export']);
  });

  test('with site at 320 px the search slot is a 44 by 44 control, no wider than the toggle', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(WITH_SITE);
    const control = await px(page, 'var(--luz-control-lg)');
    const slot = await box(page, '#search');
    expect(near(slot.width, control, 0.5), `${slot.width}`).toBe(true);
    expect(near(slot.height, control, 0.5), `${slot.height}`).toBe(true);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  // `.o-main` is `overflow-y: auto` in core: a sticky bar inside it sticks to nothing unless `.o-main`
  // is the thing that scrolls, or app takes the overflow off it. Either way the bar must stay at the top.
  test('the bar stays at the top while the view scrolls (core\'s .o-sticky, in .o-main)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(PLAIN);
    expect(await page.locator('#hdr').evaluate((el) => el.classList.contains('o-sticky'))).toBe(true);
    await page.evaluate(() => {
      // `instant`: core may set `scroll-behavior: smooth`, and the reading below is at once
      window.scrollTo({ top: 600, behavior: 'instant' });
      document.getElementById('main').scrollTo({ top: 600, behavior: 'instant' });
    });
    const { scrolled, top } = await page.evaluate(() => ({
      scrolled: window.scrollY + document.getElementById('main').scrollTop,
      top: document.getElementById('hdr').getBoundingClientRect().top,
    }));
    expect(scrolled, 'the page scrolled (the document or .o-main)').toBeGreaterThan(100);
    expect(near(top, 0, 0.5), `the bar is at ${top}`).toBe(true);
  });

  test('.o-main keeps what has the focus out from under the bar: scroll-padding-block-start is --luz-bar-h (O5)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(PLAIN);
    expect(parseFloat(await style(page, '#main', 'scrollPaddingBlockStart'))).toBeCloseTo(await px(page, 'var(--luz-bar-h)'), 0);
  });

  for (const [width, height] of [[1280, 800], [320, 640]]) {
    test(`${width}x${height}: no Tab stop in main, nor a fragment target, ends up under the bar`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(PLAIN);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      const covered = [];
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        const { id, top, barBottom, inMain } = await page.evaluate(() => ({
          id: document.activeElement?.id,
          top: document.activeElement?.getBoundingClientRect().top ?? 0,
          barBottom: document.getElementById('hdr').getBoundingClientRect().bottom,
          inMain: !!document.activeElement?.closest('main'),
        }));
        if (inMain && top < barBottom - 0.5) covered.push(`${id}: top ${top}, bar ${barBottom}`);
      }
      expect(covered).toEqual([]);

      await page.goto(`${PLAIN}#p8`);
      await page.waitForTimeout(100);
      const { top, barBottom } = await page.evaluate(() => ({
        top: document.getElementById('p8').getBoundingClientRect().top,
        barBottom: document.getElementById('hdr').getBoundingClientRect().bottom,
      }));
      expect(top, 'the target of #p8').toBeGreaterThanOrEqual(barBottom - 0.5);
    });
  }

  test('400 % zoom (320 x 256): the bar is not sticky; at 320 x 640 it takes under a quarter of the window', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto(PLAIN);
    expect(await style(page, '#hdr', 'position')).toBe('static');
    await page.setViewportSize({ width: 320, height: 640 });
    expect((await box(page, '#hdr')).height).toBeLessThanOrEqual(640 / 4);
  });
});

/* ======================================================================== */
/* Axe, in the three modes, with and without site                           */
/* ======================================================================== */

for (const [label, url] of [['without site', PLAIN], ['with site', WITH_SITE]]) {
  for (const mode of MODES) {
    test(`app ${label}: axe finds nothing serious in ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(url);
      expect(await axeIn(page, mode)).toEqual([]);
    });

    test(`app ${label}: axe finds nothing serious in ${mode} at 320 px, with the account list open`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(url);
      await page.click('#account-btn');
      expect(await axeIn(page, mode)).toEqual([]);
    });
  }
}

test.describe('app without site: nothing of site is asked for', () => {
  test('the page asks for no file of site and for the stylesheet of app, which it gets', async ({ page }) => {
    const requests = [];
    const responses = [];
    page.on('request', (req) => requests.push(req.url()));
    page.on('response', (res) => responses.push({ url: res.url(), status: res.status(), type: res.headers()['content-type'] ?? '' }));
    await page.goto(PLAIN);
    await page.waitForLoadState('networkidle');
    expect(requests.filter((url) => url.includes('/packages/site/'))).toEqual([]);
    const app = responses.find((r) => r.url.includes('/packages/app/dist/app.css'));
    expect(app, 'a request for packages/app/dist/app.css').toBeTruthy();
    expect(app?.status).toBe(200);
    expect(app?.type).toContain('css');
    expect(await page.evaluate(() => document.querySelectorAll('luz-search, luz-consent, luz-lang-switch, luz-submenu, luz-banner').length)).toBe(0);
  });
});
