// @ts-check
/**
 * `.luz-landing-footer` (@luz-ds/landing; .claude/plans/specs/f3-package-model.md,
 * §1.5, §3.3 and §9 step 10): the footer of a landing page, no longer
 * `.luz-site-footer` of site. It is a native <footer> with a row of core's
 * inside: `footer.luz-landing-footer > div.o-container.o-container--inline.o-row`.
 * The landing adds the divider, the padding and the distribution of the row:
 * its items at the two ends (`justify-content: space-between`), and at 768px
 * and below a column aligned to the start.
 *
 * The cases run on a page of tokens, core and landing (tests/fixtures/landing-page.html,
 * no site), and on the pages that use the class: the home page in its three
 * languages and the documentation (the docs footer partial). The mode switcher
 * in the home footer is tested by tests/landing.spec.js.
 * Runs in `chromium` and `chromium-nojs`: the footer has no script.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/landing-page.html';

/** A CSS length expression resolved to pixels, in the page. */
const px = (page, expression) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${value}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, expression);

const color = (page, token) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.cssText = `color:var(${value})`;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, token);

const style = (page, selector, property) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], property);

test.describe('landing footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(FIXTURE);
  });

  test('has a divider above it and room around its row: lg above, xl below', async ({ page }) => {
    expect(await style(page, '#ftr', 'borderBlockStartWidth')).toBe('1px');
    expect(await style(page, '#ftr', 'borderBlockStartStyle')).toBe('solid');
    expect(await style(page, '#ftr', 'borderBlockStartColor')).toBe(await color(page, '--luz-divider'));
    expect(await style(page, '#ftr', 'paddingBlockStart')).toBe(`${await px(page, 'var(--luz-space-lg)')}px`);
    expect(await style(page, '#ftr', 'paddingBlockEnd')).toBe(`${await px(page, 'var(--luz-space-xl)')}px`);
  });

  test('the row is core\'s: the page\'s width and gutters, and its content starts where the main\'s does', async ({ page }) => {
    await expect(page.locator('#ftr > .o-container.o-container--inline.o-row')).toHaveCount(1);
    const { footer, main } = await page.evaluate(() => {
      const content = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight) };
      };
      return { footer: content(document.getElementById('ftr-row')), main: content(document.getElementById('main-content')) };
    });
    expect(Math.abs(footer.left - main.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(footer.right - main.right)).toBeLessThanOrEqual(1);
  });

  test('wide: the note is at the inline start and the links at the inline end', async ({ page }) => {
    expect(await style(page, '#ftr-row', 'justifyContent')).toBe('space-between');
    const { note, links, row } = await page.evaluate(() => {
      const row = document.getElementById('ftr-row');
      const cs = getComputedStyle(row);
      return {
        note: document.getElementById('ftr-note').getBoundingClientRect(),
        links: row.querySelector('nav').getBoundingClientRect(),
        row: { left: row.getBoundingClientRect().left + parseFloat(cs.paddingLeft), right: row.getBoundingClientRect().right - parseFloat(cs.paddingRight) },
      };
    });
    expect(Math.abs(note.left - row.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(row.right - links.right)).toBeLessThanOrEqual(1);
    expect(note.right).toBeLessThan(links.left);
  });

  for (const width of [768, 320]) {
    test(`at ${width} px the row is a column aligned to the start, with no sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      expect(await style(page, '#ftr-row', 'flexDirection')).toBe('column');
      expect(await style(page, '#ftr-row', 'alignItems')).toMatch(/^(flex-)?start$/);
      const { note, links } = await page.evaluate(() => ({
        note: document.getElementById('ftr-note').getBoundingClientRect(),
        links: document.querySelector('#ftr-row nav').getBoundingClientRect(),
      }));
      expect(note.bottom).toBeLessThanOrEqual(links.top + 1);
      expect(Math.abs(note.left - links.left)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }

  test('above 768 px the row is a row again (the column is for narrow windows only)', async ({ page }) => {
    await page.setViewportSize({ width: 769, height: 900 });
    expect(await style(page, '#ftr-row', 'flexDirection')).toBe('row');
  });

  test('forced colors keep the divider', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await style(page, '#ftr', 'borderBlockStartStyle')).toBe('solid');
    expect(parseFloat(await style(page, '#ftr', 'borderBlockStartWidth'))).toBeGreaterThanOrEqual(1);
  });

  test('the markup carries no `luz-site-*` class', async ({ page }) => {
    expect(await page.evaluate(() => [...document.querySelectorAll('[class]')].flatMap((el) => [...el.classList]).filter((c) => c.startsWith('luz-site-')))).toEqual([]);
  });
});

test.describe('the pages that use the landing footer', () => {
  for (const route of ['/', '/es/', '/ar/']) {
    test(`${route}: the footer is \`footer.luz-landing-footer\` around a core row, not \`.luz-site-footer\``, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('footer.luz-landing-footer > .o-container.o-container--inline.o-row')).toHaveCount(1);
      await expect(page.locator('.luz-site-footer')).toHaveCount(0);
      expect(await page.locator('footer.luz-landing-footer').evaluate((el) => getComputedStyle(el).borderBlockStartStyle)).toBe('solid');
    });
  }

  test('the documentation\'s footer partial is the landing footer too, on a docs page and on the 404', async ({ page }) => {
    await page.goto('/docs/');
    await expect(page.locator('#site-footer.luz-landing-footer, #site-footer .luz-landing-footer')).toHaveCount(1);
    await expect(page.locator('.luz-site-footer')).toHaveCount(0);
    expect(await page.locator('#site-footer .luz-mode-switcher').count()).toBeGreaterThan(0);

    await page.goto('/404.html');
    await expect(page.locator('footer.luz-landing-footer, footer .luz-landing-footer')).toHaveCount(1);
    await expect(page.locator('.luz-site-footer')).toHaveCount(0);
  });
});

// F4 of the identity plan (@luz-ds/landing 0.2): a brand block and columns of links.
// The page is tests/fixtures/landing-f4.html (`div.o-container.o-container--inline.o-grid` inside the footer);
// the old `> .o-row` footer is tests/fixtures/landing-page.html, tested above and unchanged.
const F4 = '/tests/fixtures/landing-f4.html';
const PARTS = ['brand', 'col-1', 'col-2', 'col-3'];

const rects = (page) =>
  page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    return [id, { left: r.left, right: r.right, top: r.top, bottom: r.bottom }];
  })), PARTS);

test.describe('landing footer: brand and columns', () => {
  for (const dir of ['ltr', 'rtl']) {
    for (const width of [1280, 768]) {
      test(`${dir}, ${width} px: the brand and the columns sit side by side, the brand at the inline start`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(F4);
        if (dir === 'rtl') await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; });
        const r = await rects(page);
        // One row: every part shares the top of the brand's box
        for (const id of PARTS.slice(1)) {
          expect(r[id].top, id).toBeLessThan(r.brand.bottom);
          expect(r.brand.top, id).toBeLessThan(r[id].bottom);
        }
        // In reading order along the row: brand, then the columns
        const order = PARTS.map((id) => ({ id, edge: dir === 'ltr' ? r[id].left : -r[id].right })).sort((a, b) => a.edge - b.edge).map((x) => x.id);
        expect(order).toEqual(PARTS);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      });
    }

    for (const width of [767, 320]) {
      test(`${dir}, ${width} px: they are one under the other, all at the inline start, with no sideways scroll`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(F4);
        if (dir === 'rtl') await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; });
        const r = await rects(page);
        for (let i = 1; i < PARTS.length; i += 1) {
          expect(r[PARTS[i - 1]].bottom, PARTS[i]).toBeLessThanOrEqual(r[PARTS[i]].top + 1);
          const edge = dir === 'ltr' ? 'left' : 'right';
          expect(Math.abs(r[PARTS[i]][edge] - r.brand[edge]), PARTS[i]).toBeLessThanOrEqual(1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      });
    }
  }

  test('a column is a small heading over a plain list of links with a gap between them', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(F4);
    const col = await page.evaluate(() => {
      const base = parseFloat(getComputedStyle(document.body).fontSize);
      const title = document.getElementById('col-1-title');
      const list = document.querySelector('#col-1 ul');
      const [a, b] = [...list.querySelectorAll('li')].map((li) => li.getBoundingClientRect());
      const cs = getComputedStyle(list);
      return {
        titleSize: parseFloat(getComputedStyle(title).fontSize),
        base,
        titleBottom: title.getBoundingClientRect().bottom,
        listTop: list.getBoundingClientRect().top,
        marker: cs.listStyleType,
        indent: cs.paddingInlineStart,
        gap: b.top - a.bottom,
      };
    });
    expect(col.titleSize, 'the heading is no larger than the text').toBeLessThanOrEqual(col.base);
    expect(col.titleBottom).toBeLessThanOrEqual(col.listTop + 1);
    expect(col.marker).toBe('none');
    expect(col.indent).toBe('0px');
    expect(col.gap, 'the links have room between them').toBeGreaterThanOrEqual(4);
  });

  test('the old footer, a core row, is unchanged: its items at the two ends, with no landing grid', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(FIXTURE);
    expect(await style(page, '#ftr-row', 'justifyContent')).toBe('space-between');
    expect(await style(page, '#ftr-row', 'display')).toBe('flex');
  });
});
