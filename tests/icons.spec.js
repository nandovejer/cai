// @ts-check
/**
 * CAI's own icons, on the Icon grid page (.claude/plans/specs/icons-charts-data-grid.md,
 * 5a, and its accessibility review: I1, M3). The set is docs only: the page is
 * the contract, so the page is what is tested.
 *  - every icon is decorative (`aria-hidden="true"`, `focusable="false"`), draws
 *    inside 24 × 24 in `currentColor`, and in forced colors takes the system
 *    text colour;
 *  - each copy button is named by its icon ("Copy SVG Menu"), unique on the
 *    page, and copies the SVG that is shown;
 *  - the sprite snippet has one `<symbol>` for each icon of the grid, with the
 *    same drawing, and each draws through `<use href="#id">`;
 *  - the info and warning glyphs always come with visible words (RL-6).
 * Runs in `chromium`: the grid is a catalogue, its copy buttons need script.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/components/icon-grid/';

/** The icons of the grid, as the page states them. */
async function icons(page) {
  return page.locator('.docs-example .cai-icon-item').evaluateAll((items) =>
    items.map((li) => {
      const svg = li.querySelector('.cai-icon-display svg');
      const name = li.querySelector('.cai-icon-name');
      const button = li.querySelector('button');
      const labelledby = (button.getAttribute('aria-labelledby') ?? '').split(/\s+/);
      return {
        id: name.id.replace(/^c-icons-/, ''),
        label: name.textContent.trim(),
        inner: svg.innerHTML,
        ariaHidden: svg.getAttribute('aria-hidden'),
        focusable: svg.getAttribute('focusable'),
        stroke: svg.getAttribute('stroke'),
        fill: svg.getAttribute('fill'),
        viewBox: svg.getAttribute('viewBox'),
        flip: svg.hasAttribute('data-cai-flip'),
        buttonName: labelledby.map((id) => document.getElementById(id)?.textContent.trim()).join(' '),
        copy: button.getAttribute('data-copy'),
      };
    }),
  );
}

test.describe('icons', () => {
  test('the grid has the 22 icons, each decorative, named by its words and drawn in currentColor', async ({ page }) => {
    await page.goto(PAGE);
    const list = await icons(page);
    expect(list).toHaveLength(22);
    expect(new Set(list.map((i) => i.id)).size).toBe(22);
    for (const icon of list) {
      expect(icon.ariaHidden, icon.id).toBe('true');
      expect(icon.focusable, icon.id).toBe('false');
      expect(icon.stroke, icon.id).toBe('currentColor');
      expect(icon.fill, icon.id).toBe('none');
      expect(icon.viewBox, icon.id).toBe('0 0 24 24');
      expect(icon.label.length, icon.id).toBeGreaterThan(2);
    }
    // The two icons that point to the end of the line carry the hook for right-to-left text
    expect(list.filter((i) => i.flip).map((i) => i.id)).toEqual(['chevron-end', 'arrow-end']);
  });

  test('each copy button is named by its icon, unique on the page, and copies the SVG that is shown', async ({ page }) => {
    await page.goto(PAGE);
    const list = await icons(page);
    const names = list.map((i) => i.buttonName);
    expect(new Set(names).size).toBe(names.length);
    for (const icon of list) {
      expect(icon.buttonName, icon.id).toBe(`Copy SVG ${icon.label}`);
      // The copied markup, parsed as HTML (it is pasted into a page): a decorative SVG with the shown drawing
      const copied = await page.evaluate(
        ([markup]) => {
          const host = document.createElement('template');
          host.innerHTML = markup;
          const root = host.content.firstElementChild;
          return {
            count: host.content.children.length,
            tag: root.localName,
            ns: root.namespaceURI,
            ariaHidden: root.getAttribute('aria-hidden'),
            focusable: root.getAttribute('focusable'),
            stroke: root.getAttribute('stroke'),
            viewBox: root.getAttribute('viewBox'),
            inner: root.innerHTML,
          };
        },
        [icon.copy],
      );
      expect(copied, icon.id).toMatchObject({ count: 1, tag: 'svg', ns: 'http://www.w3.org/2000/svg', ariaHidden: 'true', focusable: 'false', stroke: 'currentColor', viewBox: '0 0 24 24' });
      expect(copied.inner, icon.id).toBe(icon.inner);
    }
  });

  test('each icon draws inside 24 × 24 and takes the colour of its text, and the system text colour in forced colors', async ({ page }) => {
    await page.goto(PAGE);
    const draw = () =>
      page.locator('.docs-example .cai-icon-display svg').evaluateAll((list) =>
        list.map((svg) => {
          const box = svg.getBBox();
          return { w: box.width, h: box.height, x: box.x, y: box.y, stroke: getComputedStyle(svg).stroke, color: getComputedStyle(svg.parentElement).color };
        }),
      );
    const normal = await draw();
    expect(normal).toHaveLength(22);
    for (const [i, b] of normal.entries()) {
      // Not empty: a horizontal line (minus) has no height of its own, only its stroke
      expect(b.w + b.h, `icon ${i}`).toBeGreaterThan(0);
      expect(b.x, `icon ${i}`).toBeGreaterThanOrEqual(0);
      expect(b.y, `icon ${i}`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w, `icon ${i}`).toBeLessThanOrEqual(24);
      expect(b.y + b.h, `icon ${i}`).toBeLessThanOrEqual(24);
      expect(b.stroke, `icon ${i}`).toBe(b.color);
    }
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await draw();
    for (const [i, b] of forced.entries()) {
      // The stroke follows the (system) text colour of its parent, not a colour of the page
      expect(b.stroke, `icon ${i} in forced colors`).toBe(b.color);
      expect(b.stroke, `icon ${i} in forced colors`).not.toBe(normal[i].color);
    }
  });

  test('the sprite has one symbol for each icon, with the same drawing, and <use href> draws each', async ({ page }) => {
    await page.goto(PAGE);
    const list = await icons(page);
    const out = await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'sprite-test';
      host.innerHTML = document.getElementById('code-icon-sprite').textContent;
      document.body.append(host);
      const sprite = host.querySelector('svg[width="0"]');
      const symbols = [...sprite.querySelectorAll('symbol')].map((s) => ({ id: s.id, viewBox: s.getAttribute('viewBox'), inner: s.innerHTML }));
      const drawn = symbols.map((s) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', `#${s.id}`);
        svg.append(use);
        host.append(svg);
        const box = use.getBBox();
        return { id: s.id, w: box.width, h: box.height };
      });
      return {
        sprite: { ariaHidden: sprite.getAttribute('aria-hidden'), focusable: sprite.getAttribute('focusable'), width: sprite.getAttribute('width'), height: sprite.getAttribute('height') },
        symbols,
        drawn,
      };
    });
    expect(out.sprite).toEqual({ ariaHidden: 'true', focusable: 'false', width: '0', height: '0' });
    expect(out.symbols.map((s) => s.id)).toEqual(list.map((i) => `cai-icon-${i.id}`));
    for (const [i, symbol] of out.symbols.entries()) {
      expect(symbol.viewBox, symbol.id).toBe('0 0 24 24');
      expect(symbol.inner, symbol.id).toBe(list[i].inner);
    }
    for (const d of out.drawn) {
      expect(d.w + d.h, d.id).toBeGreaterThan(0);
    }
  });

  test('info and warning always come with words; an icon is never the only thing a control says', async ({ page }) => {
    await page.goto(PAGE);
    // In the grid: the name is visible text in the same item (M3)
    for (const id of ['info', 'warning']) {
      const item = page.locator('.docs-example .cai-icon-item', { has: page.locator(`#c-icons-${id}`) });
      await expect(item.locator('.cai-icon-name')).toBeVisible();
      expect((await item.locator('.cai-icon-name').innerText()).trim().length).toBeGreaterThan(3);
      await expect(item.locator('svg[aria-hidden="true"]').first()).toHaveAttribute('focusable', 'false');
    }
    // Everywhere on the page: a decorative icon sits beside text, or in a control that has a name;
    // a role="img" icon has one
    const orphans = await page.evaluate(() =>
      [...document.querySelectorAll('main svg')]
        .filter((svg) => svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('width') !== '0')
        .filter((svg) => {
          if (svg.closest('[aria-hidden="true"]:not(svg)')) return false; // a picture in a Do and don't stage
          const holder = svg.closest('button, a, li, p, figure') ?? svg.parentElement;
          const text = [...holder.querySelectorAll('*')].filter((el) => !el.closest('svg')).map((el) => (el.matches('.u-sr-only, .u-sr-only *') ? '' : el.textContent)).join(' ');
          return text.trim().length === 0 && !holder.getAttribute('aria-label') && !holder.textContent.trim();
        })
        .map((svg) => svg.parentElement.outerHTML.slice(0, 80)),
    );
    expect(orphans).toEqual([]);
    const unnamed = await page.evaluate(() => [...document.querySelectorAll('svg[role="img"]')].filter((s) => !s.getAttribute('aria-label') && !s.querySelector('title')).length);
    expect(unnamed).toBe(0);
  });

  test('the sprite snippet says it works in the same document only', async ({ page }) => {
    await page.goto(PAGE);
    const text = await page.locator('#markup').evaluate((h) => {
      let out = '';
      for (let el = h.nextElementSibling; el && el.tagName !== 'H3'; el = el.nextElementSibling) out += ` ${el.textContent}`;
      return out;
    });
    expect(text).toMatch(/same document/);
    expect(text).toMatch(/another origin/);
  });
});
