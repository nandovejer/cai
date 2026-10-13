// @ts-check
/**
 * Meter: a native <meter> drawn as a bar (.claude/plans/specs/icons-charts-data-grid.md,
 * section 5b, and its accessibility review, M1 to M3). Runs in `chromium` and
 * `chromium-nojs`: the bar is CSS only.
 */
import { test, expect } from '@playwright/test';
import { near, paintOf, readRow } from './helpers/pixels.js';

const PAGE = '/docs/components/meter/';
const EXAMPLE = '#example ~ .docs-example';

/** Fraction of the inside of a meter that is the fill colour, read from its screenshot. */
async function filled(page, meter) {
  const png = await meter.screenshot();
  const [fill, track] = await Promise.all([paintOf(page, 'var(--cai-brand-primary)'), paintOf(page, 'var(--cai-surface-muted)')]);
  const row = await readRow(page, png, Math.floor((await meter.boundingBox()).height / 2));
  const inside = row.slice(1, -1);
  const count = inside.filter((p) => near(p, fill)).length;
  return { ratio: count / inside.length, inside: inside.length, track: inside.filter((p) => near(p, track)).length, fill: count };
}

test.describe('meter', () => {
  for (const width of [320, 1024]) {
    test(`the fill is value / max of the bar, at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PAGE);
      const meters = page.locator(`${EXAMPLE} .cai-meter`);
      expect(await meters.count()).toBe(3);
      for (let i = 0; i < 3; i++) {
        const meter = meters.nth(i);
        await meter.scrollIntoViewIfNeeded();
        const { value, max } = await meter.evaluate((m) => ({ value: m.value, max: m.max }));
        const read = await filled(page, meter);
        // The fill is a rounded bar: allow a pixel at each end
        expect(Math.abs(read.fill - (value / max) * read.inside), `row ${i + 1}: ${read.fill} of ${read.inside} px for ${value} of ${max}`).toBeLessThanOrEqual(2);
      }
    });
  }

  test('a meter is a block, not drawn by the browser, and never narrower than 8rem outside a stacked cell', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(PAGE);
    const style = await page.locator(`${EXAMPLE} .cai-meter`).first().evaluate((m) => {
      const s = getComputedStyle(m);
      return { display: s.display, appearance: s.appearance, min: s.minInlineSize, height: s.blockSize, border: s.borderTopWidth, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) };
    });
    expect(style.display).toBe('block');
    expect(style.appearance).toBe('none');
    expect(parseFloat(style.min)).toBe(style.rem * 8);
    expect(style.height).toBe('8px');
    expect(style.border).toBe('1px');
  });

  test('low, high and optimum change nothing: every state is the brand colour (RL-15)', async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'states';
      host.innerHTML = [
        '<meter class="cai-meter" id="m-good" min="0" max="10" low="3" high="8" optimum="9" value="9" aria-hidden="true"></meter>',
        '<meter class="cai-meter" id="m-mid" min="0" max="10" low="3" high="8" optimum="9" value="5" aria-hidden="true"></meter>',
        '<meter class="cai-meter" id="m-bad" min="0" max="10" low="3" high="8" optimum="9" value="1" aria-hidden="true"></meter>',
      ].join('');
      document.querySelector('#example').after(host);
    });
    for (const id of ['m-good', 'm-mid', 'm-bad']) {
      const meter = page.locator(`#${id}`);
      const read = await filled(page, meter);
      expect(read.fill, `${id} has a fill in the brand colour`).toBeGreaterThan(2);
      // Every pixel of the inside is the fill or the track: no green, yellow or red
      expect(read.fill + read.track, id).toBeGreaterThanOrEqual(read.inside - 6);
    }
  });

  test('forced colors: the bar keeps its border and its fill', async ({ page }) => {
    await page.goto(PAGE);
    await page.emulateMedia({ forcedColors: 'active' });
    const meter = page.locator(`${EXAMPLE} .cai-meter`).first();
    const [text, canvas] = await Promise.all([paintOf(page, 'CanvasText'), paintOf(page, 'Canvas')]);
    const border = await meter.evaluate((m) => getComputedStyle(m).borderTopColor);
    expect(border.match(/\d+/g).slice(0, 3).map(Number)).toEqual(text);
    await meter.scrollIntoViewIfNeeded();
    // 1,204 of 1,500: the start of the bar is filled, in a system colour that is not the track's; its end is the track
    const row = (await readRow(page, await meter.screenshot(), 4)).slice(1, -1);
    const at = (fraction) => row[Math.floor(row.length * fraction)];
    expect(near(at(0.1), canvas, 8), 'the fill is not the track').toBe(false);
    expect(near(at(0.95), canvas, 8), 'the rest is the track').toBe(true);
  });

  test('the bar in a stacked card is the width of the card, at 320 px and 200 % text (M2)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(PAGE);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const fits = await page.locator(`${EXAMPLE} .cai-meter`).evaluateAll((list) =>
      list.map((m) => {
        const cell = m.closest('td').getBoundingClientRect();
        const box = m.getBoundingClientRect();
        return { left: box.left >= cell.left - 0.5, right: box.right <= cell.right + 0.5, width: box.width };
      }));
    for (const f of fits) expect(f).toMatchObject({ left: true, right: true });
  });

  test('the bar is a picture of its figure: the cell reads as the figure alone, with no empty cell (M1)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(PAGE);
    const snapshot = await page.locator(`${EXAMPLE} table`).ariaSnapshot();
    expect(snapshot).not.toContain('meter');
    expect(snapshot).toContain('cell "1,204"');
    // No cell without text
    const empty = await page.locator(`${EXAMPLE} td`).evaluateAll((cells) => cells.filter((c) => c.textContent.trim() === '').length);
    expect(empty).toBe(0);
  });

  test('an exposed meter is named by its label: min, max and value are exposed (M2)', async ({ page }) => {
    await page.goto('/docs/components/form/');
    const meter = page.locator('#f-meter');
    await expect(meter).toHaveAccessibleName('Storage used, 6 of 10 GB');
    await expect(meter).toHaveRole('meter');
  });
});
