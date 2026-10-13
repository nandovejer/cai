// @ts-check
/**
 * Sorting a table in the browser: `th[data-cai-sort]`, the lazy chunk
 * `table-sort.js` (.claude/plans/specs/table-sort.md and its accessibility
 * review, T1 to T4). The fixture holds a table with links, plain headings,
 * formatted numbers (`data-sort-value`) and ties. Runs in `chromium` and in
 * `chromium-nojs`, where the table must stay whole.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/table-sort.html';
const ROUTES = '#routes';

/** The text of a column, row by row. */
const column = (page, table, index) =>
  page.locator(`${table} tbody tr`).evaluateAll((rows, i) => rows.map((r) => r.cells[i].textContent.trim()), index);

async function ready(page, query = '') {
  await page.goto(`${FIXTURE}${query}`);
  await page.waitForSelector(`${ROUTES} th[data-cai-sort] > button`);
}

test.describe('table sort', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS test is below');

  test('a marked heading becomes a button with the same text, a plain one too, an unmarked one stays', async ({ page }) => {
    await ready(page);
    const heads = await page.locator(`${ROUTES} thead th`).evaluateAll((ths) => ths.map((th) => [th.textContent.trim(), th.firstElementChild?.tagName ?? null, !!th.querySelector('a')]));
    expect(heads).toEqual([['Route', 'BUTTON', false], ['Parcels', 'BUTTON', false], ['Weight (kg)', 'BUTTON', false], ['Notes', null, false]]);
    // The button is a button of its own, not a submit
    await expect(page.locator(`${ROUTES} th > button`).first()).toHaveAttribute('type', 'button');
  });

  test('the status line exists, empty, before the first press, one per table, outside the scroll wrapper (4.1.3)', async ({ page }) => {
    await ready(page);
    const info = await page.evaluate(() => [...document.querySelectorAll('output[data-cai-sort-status]')].map((o) => ({
      text: o.textContent,
      after: o.previousElementSibling?.classList.contains('cai-table-wrap'),
      inWrap: !!o.closest('.cai-table-wrap'),
      hidden: o.classList.contains('u-sr-only'),
    })));
    expect(info).toHaveLength(4);
    for (const o of info) expect(o).toEqual({ text: '', after: true, inWrap: false, hidden: true });
  });

  test('a formatted number sorts by its data-sort-value, and a second press reverses', async ({ page }) => {
    await ready(page);
    const button = page.locator(`${ROUTES} th > button`, { hasText: 'Parcels' });
    // The server said "descending"; the first press in the browser sorts ascending
    await button.click();
    expect(await column(page, ROUTES, 1)).toEqual(['58', '58', '312', '999', '1,204']);
    await expect(page.locator(`${ROUTES} th[aria-sort]`)).toHaveCount(1);
    await expect(page.locator(`${ROUTES} th[aria-sort]`)).toHaveAttribute('aria-sort', 'ascending');
    await button.click();
    expect(await column(page, ROUTES, 1)).toEqual(['1,204', '999', '312', '58', '58']);
    await expect(page.locator(`${ROUTES} th[aria-sort]`)).toHaveAttribute('aria-sort', 'descending');
    await button.click();
    await expect(page.locator(`${ROUTES} th[aria-sort]`)).toHaveAttribute('aria-sort', 'ascending');
  });

  test('equal values keep their order (stable), and Álava and Alava tie', async ({ page }) => {
    await ready(page);
    await page.locator(`${ROUTES} th > button`, { hasText: 'Parcels' }).click();
    // Both 58s: Álava came first in the markup and stays first
    expect(await column(page, ROUTES, 0)).toEqual(['Álava to Bilbao', 'Alava to Bilbao', 'Room 10', 'Room 2', 'Sevilla to Madrid']);
    await page.locator(`${ROUTES} th > button`, { hasText: 'Route' }).click();
    // Text, in the language of the table: base letters tie (order kept), "Room 2" before "Room 10"
    expect(await column(page, ROUTES, 0)).toEqual(['Álava to Bilbao', 'Alava to Bilbao', 'Room 2', 'Room 10', 'Sevilla to Madrid']);
  });

  test('plain numbers sort as numbers, negative ones too', async ({ page }) => {
    await ready(page);
    await page.locator(`${ROUTES} th > button`, { hasText: 'Weight' }).click();
    expect(await column(page, ROUTES, 2)).toEqual(['-3', '9', '406.3', '1912', '8430.5']);
  });

  test('the status line says what changed, in the language of the table (T2)', async ({ page }) => {
    await ready(page);
    await page.locator(`${ROUTES} th > button`, { hasText: 'Parcels' }).click();
    const status = page.locator('output[data-cai-sort-status]').first();
    await expect(status).toHaveText('Sorted by Parcels, ascending');
    await page.locator(`${ROUTES} th > button`, { hasText: 'Parcels' }).click();
    await expect(status).toHaveText('Sorted by Parcels, descending');
    // The status carries the language of the table, here the page's
    await expect(status).toHaveAttribute('lang', 'en');

    await page.locator('#es th > button', { hasText: 'Peso' }).click();
    const es = page.locator('#es').locator('xpath=ancestor::div[contains(@class,"cai-table-wrap")]/following-sibling::output[1]');
    await expect(es).toHaveText('Ordenado por Peso, ascendente');
    await expect(es).toHaveAttribute('lang', 'es');
    expect(await column(page, '#es', 1)).toEqual(['3', '12']);
  });

  test('each body sorts within itself and the foot stays', async ({ page }) => {
    await ready(page);
    await page.locator('#groups th > button').click();
    const rows = await page.locator('#groups').evaluate((t) => [...t.tBodies].map((b) => [...b.rows].map((r) => r.textContent)).concat([[...t.tFoot.rows].map((r) => r.textContent)]));
    expect(rows).toEqual([['a', 'b'], ['y', 'z'], ['total']]);
  });

  test('a malformed lang does not throw', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await ready(page);
    await page.locator('#bad-lang th > button').click();
    expect(await column(page, '#bad-lang', 0)).toEqual(['a', 'b']);
    expect(errors).toEqual([]);
  });

  test('calling initTableSort twice leaves one button and one status line per table', async ({ page }) => {
    await ready(page);
    await page.evaluate(async () => {
      const { initTableSort } = await import('/packages/core/dist/table-sort.js');
      const { t } = await import('/packages/core/dist/i18n.js');
      initTableSort(document, t);
      initTableSort(document, t);
    });
    await expect(page.locator(`${ROUTES} th > button`)).toHaveCount(3);
    await expect(page.locator(`${ROUTES} th > button > button`)).toHaveCount(0);
    await expect(page.locator('output[data-cai-sort-status]')).toHaveCount(4);
    // One press, one sort: the handler was not added twice
    await page.locator(`${ROUTES} th > button`, { hasText: 'Parcels' }).click();
    await expect(page.locator(`${ROUTES} th[aria-sort]`)).toHaveAttribute('aria-sort', 'ascending');
  });

  test('Tab reaches the button, Enter sorts, and focus stays on it', async ({ page }) => {
    await ready(page);
    await page.locator(`${ROUTES} th > button`).first().focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement.tagName + ':' + document.activeElement.textContent)).toBe('BUTTON:Route');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => document.activeElement.textContent)).toBe('Parcels');
    await expect(page.locator(`${ROUTES} th[aria-sort]`)).toHaveAttribute('aria-sort', 'ascending');
  });

  test('T1: a link that had the focus is replaced by a button that has it', async ({ page }) => {
    await page.goto(`${FIXTURE}?manual`);
    await page.locator('#l-route').focus();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('l-route');
    await page.evaluate(async () => {
      const { initTableSort } = await import('/packages/core/dist/table-sort.js');
      initTableSort(document);
    });
    expect(await page.evaluate(() => document.activeElement.tagName + ':' + document.activeElement.textContent)).toBe('BUTTON:Route');
  });

  test('without the dictionary it still sorts, with an empty status line', async ({ page }) => {
    await page.goto(`${FIXTURE}?manual`);
    await page.evaluate(async () => {
      const { initTableSort } = await import('/packages/core/dist/table-sort.js');
      initTableSort(document);
    });
    await page.locator(`${ROUTES} th > button`, { hasText: 'Weight' }).click();
    expect(await column(page, ROUTES, 2)).toEqual(['-3', '9', '406.3', '1912', '8430.5']);
    await expect(page.locator('output[data-cai-sort-status]').first()).toHaveText('');
  });

  test('the chunk is loaded only on a page with a sortable heading', async ({ page }) => {
    const requested = [];
    page.on('request', (r) => { if (/\/table-sort(\.min)?\.js/.test(r.url())) requested.push(r.url()); });
    await page.goto(`${FIXTURE}?nosort`);
    await page.waitForLoadState('networkidle');
    expect(requested).toEqual([]);
    await page.goto(FIXTURE);
    await page.waitForSelector(`${ROUTES} th[data-cai-sort] > button`);
    expect(requested.length).toBeGreaterThan(0);
  });

  test('the sorted heading shows a triangle, up for ascending and down for descending, and it survives forced colors', async ({ page }) => {
    await ready(page);
    const button = page.locator(`${ROUTES} th > button`, { hasText: 'Route' });
    await button.click();
    const read = () => button.evaluate((b) => {
      const s = getComputedStyle(b, '::after');
      return { content: s.content, display: s.display, border: s.borderBlockEndWidth, clip: s.clipPath };
    });
    const up = await read();
    expect(up.content).toBe('""');
    expect(up.display).toBe('inline-block');
    expect(parseFloat(up.border)).toBeGreaterThan(0);
    await button.click();
    const down = await read();
    expect(down.clip).not.toBe(up.clip);
    // Unsorted headings show none
    expect(await page.locator(`${ROUTES} th > button`, { hasText: 'Weight' }).evaluate((b) => getComputedStyle(b, '::after').content)).toBe('none');
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await read();
    expect(forced.display).toBe('inline-block');
    expect(parseFloat(forced.border)).toBeGreaterThan(0);
  });

  test('a heading button is at least 24 px high (T4), and below 480 px the headings are a visible row above the cards', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await ready(page);
    const boxes = await page.locator(`${ROUTES} th > button`).evaluateAll((list) => list.map((b) => {
      const r = b.getBoundingClientRect();
      return { height: r.height, left: r.left - 4, right: r.right + 4, visible: r.width > 0 && r.height > 0 };
    }));
    expect(boxes).toHaveLength(3);
    const viewport = await page.evaluate(() => document.documentElement.clientWidth);
    for (const box of boxes) {
      expect(box.visible).toBe(true);
      expect(box.height).toBeGreaterThanOrEqual(24);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport);
    }
    // Sorting from there moves the rows in the DOM, and the focus stays on the button
    await page.locator(`${ROUTES} th > button`, { hasText: 'Weight' }).click();
    expect(await column(page, ROUTES, 2)).toEqual(['-3', '9', '406.3', '1912', '8430.5']);
    expect(await page.evaluate(() => document.activeElement.textContent)).toBe('Weight (kg)');
  });

  test('no error and no warning in the console', async ({ page }) => {
    const messages = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    await ready(page);
    await page.locator(`${ROUTES} th > button`).first().click();
    expect(messages.filter((m) => !/vite/i.test(m))).toEqual([]);
  });
});

test.describe('table sort without JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled !== false, 'the no-JS project only');

  test('the links are still links, nothing is inserted and the table is whole', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.locator(`${ROUTES} th a`)).toHaveCount(2);
    await expect(page.locator('#l-route')).toHaveAttribute('href', '?sort=route#routes');
    await expect(page.locator('output')).toHaveCount(0);
    await expect(page.locator(`${ROUTES} th > button`)).toHaveCount(0);
    await expect(page.locator(`${ROUTES} tbody tr`)).toHaveCount(5);
    // The server's sort is exposed: aria-sort on the one heading, with its triangle
    await expect(page.locator(`${ROUTES} th[aria-sort]`)).toHaveCount(1);
    const triangle = await page.locator(`${ROUTES} th[aria-sort] a`).evaluate((a) => getComputedStyle(a, '::after').display);
    expect(triangle).toBe('inline-block');
  });
});
