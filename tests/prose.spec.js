// @ts-check
/**
 * Core's .luz-prose (components/prose.css), and lists laid out by a layout
 * object (.o-grid, .o-stack, .o-row on a ul or ol). The page is
 * tests/fixtures/prose.html, the body of a post as a CMS editor writes it
 * (bare blocks, a ul.wp-block-list), served at /__prose__ with the language
 * and direction each test needs. Checks the line length in ch at 1440 px,
 * the space between blocks, the lists, that a .luz-* class inside wins, that
 * classless mode agrees with it, 320 px and 200 % text without sideways
 * scroll, right to left, and axe in the three modes. CSS only: runs in
 * `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const FIXTURE = readFileSync(new URL('./fixtures/prose.html', import.meta.url), 'utf-8');

/** Serve the fixture with `lang`, `dir` and extra head markup, and open it at `width`. */
async function open(p, width, { lang = 'en', dir = 'ltr', head = '' } = {}) {
  const body = FIXTURE.replace('<html lang="en">', `<html lang="${lang}" dir="${dir}">`).replace('</head>', `${head}</head>`);
  await p.route('**/__prose__', (route) => route.fulfill({ contentType: 'text/html', body }));
  await p.setViewportSize({ width, height: 900 });
  await p.goto('/__prose__');
  await p.waitForLoadState('load');
}

/** Add a rule to the page. addStyleTag needs script, and this test also runs without it. */
const style = (p, css) => p.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** A token's length in px, read through a probe. */
const tokenPx = (p, token) => p.evaluate((t) => {
  const probe = Object.assign(document.createElement('div'), { style: `inline-size: var(${t})` });
  document.body.append(probe);
  const value = probe.getBoundingClientRect().width;
  probe.remove();
  return value;
}, token);

/** The space between an element and the one before it, in px. */
const spaceBefore = (p, id) => p.evaluate((i) => {
  const el = document.getElementById(i);
  return el.getBoundingClientRect().top - el.previousElementSibling.getBoundingClientRect().bottom;
}, id);

test.describe('prose', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}`, async ({ page: p }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(p, 1280);
      await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const { violations } = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }

  test('at 1440 px a paragraph is 65 to 75 characters wide; figures, code and tables take the whole wrapper', async ({ page: p }) => {
    await open(p, 1440);
    const measure = await p.evaluate(() => {
      const para = document.getElementById('p1');
      const probe = Object.assign(document.createElement('span'), { style: 'inline-size: 1ch; display: inline-block' });
      para.append(probe);
      const ch = probe.getBoundingClientRect().width;
      probe.remove();
      return para.getBoundingClientRect().width / ch;
    });
    expect(measure).toBeGreaterThanOrEqual(65);
    expect(measure).toBeLessThanOrEqual(75);
    const wide = await p.evaluate(() => ['prose', 'figure', 'pre', 'table-wrap', 'p1'].map((id) => document.getElementById(id).getBoundingClientRect().width));
    const [wrapper, figure, pre, table, para] = wide;
    for (const w of [figure, pre, table]) {
      expect(w).toBeGreaterThan(para);
      expect(Math.abs(w - wrapper)).toBeLessThanOrEqual(1);
    }
  });

  test('--luz-prose-measure on the wrapper sets the line length', async ({ page: p }) => {
    await open(p, 1440);
    await style(p, '#prose { --luz-prose-measure: 40ch }');
    const ratio = await p.evaluate(() => {
      const para = document.getElementById('p1');
      const probe = Object.assign(document.createElement('span'), { style: 'inline-size: 1ch; display: inline-block' });
      para.append(probe);
      const ch = probe.getBoundingClientRect().width;
      probe.remove();
      return para.getBoundingClientRect().width / ch;
    });
    expect(Math.round(ratio)).toBe(40);
  });

  test('rhythm: one step between blocks, more before a heading and a rule, less after a heading', async ({ page: p }) => {
    await open(p, 1280);
    const [md, xl, sm] = [await tokenPx(p, '--luz-space-md'), await tokenPx(p, '--luz-space-xl'), await tokenPx(p, '--luz-space-sm')];
    expect(await spaceBefore(p, 'p2')).toBeCloseTo(md, 0);
    expect(await spaceBefore(p, 'h-method')).toBeCloseTo(xl, 0);
    expect(await spaceBefore(p, 'after-h2')).toBeCloseTo(sm, 0);
    expect(await spaceBefore(p, 'hr')).toBeCloseTo(xl, 0);
    expect(await spaceBefore(p, 'after-hr')).toBeCloseTo(xl, 0);
    // The first block does not push the wrapper away from what is above it
    expect(await p.locator('#p1').evaluate((el) => getComputedStyle(el).marginBlockStart)).toBe('0px');
  });

  test('lists: indent and markers, with a class or without one; a layout object keeps none', async ({ page: p }) => {
    await open(p, 1280);
    const look = (id) => p.locator(`#${id}`).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { indent: parseFloat(cs.paddingInlineStart), marker: cs.listStyleType };
    });
    for (const [id, marker] of [['wp-list', 'disc'], ['bare-list', 'decimal'], ['nested', 'circle']]) {
      const l = await look(id);
      expect(l.indent, id).toBeGreaterThan(10);
      expect(l.marker, id).toBe(marker);
    }
    expect(await look('object-list')).toEqual({ indent: 0, marker: 'none' });
    // The markers stay inside the wrapper: the list starts where the text does
    const [list, para] = await p.evaluate(() => ['wp-list', 'p1'].map((id) => document.getElementById(id).getBoundingClientRect().left));
    expect(Math.abs(list - para)).toBeLessThanOrEqual(1);
  });

  test('inline code has the look of .luz-code-inline, and a .luz-* class inside wins', async ({ page: p }) => {
    await open(p, 1280);
    const PROPS = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'paddingTop', 'paddingInlineStart', 'borderTopLeftRadius', 'borderTopWidth', 'borderTopColor'];
    const read = (id) => p.locator(`#${id}`).evaluate((el, props) => Object.fromEntries(props.map((k) => [k, getComputedStyle(el)[k]])), PROPS);
    expect(await read('code')).toEqual(await read('code-component'));
    // A component's own margin is kept: .luz-figure has --luz-space-lg above it, not the step of prose
    const lg = await tokenPx(p, '--luz-space-lg');
    expect(parseFloat(await p.locator('#luz-figure').evaluate((el) => getComputedStyle(el).marginBlockStart))).toBeCloseTo(lg, 0);
    expect(await spaceBefore(p, 'luz-figure')).toBeCloseTo(lg, 0);
  });

  test('with classless mode on the same element, the space between blocks does not change', async ({ page: p }) => {
    await open(p, 1280);
    const ids = ['p2', 'h-method', 'after-h2', 'wp-list', 'quote', 'figure', 'pre', 'hr', 'after-hr'];
    const before = [];
    for (const id of ids) before.push(await spaceBefore(p, id));
    await open(p, 1280, { head: '<link rel="stylesheet" href="/packages/core/dist/classless.css">' });
    await p.evaluate(() => document.getElementById('prose').setAttribute('data-luz-classless', ''));
    const after = [];
    for (const id of ids) after.push(await spaceBefore(p, id));
    after.forEach((v, i) => expect(v, ids[i]).toBeCloseTo(before[i], 0));
  });

  test('at 320 px nothing scrolls sideways, also with 200 % text', async ({ page: p }) => {
    await open(p, 320);
    expect(await sideways(p)).toBeLessThanOrEqual(0);
    await style(p, 'html { font-size: 200% }');
    expect(await sideways(p)).toBeLessThanOrEqual(0);
    const beyond = await p.evaluate(() => {
      const edge = document.documentElement.clientWidth;
      return [...document.querySelectorAll('#prose > *')].filter((el) => el.getBoundingClientRect().right > edge + 0.5).map((el) => el.id || el.tagName);
    });
    expect(beyond).toEqual([]);
  });

  test('right to left: the text starts at the right, and lists are indented on that side', async ({ page: p }) => {
    await open(p, 1280, { lang: 'ar', dir: 'rtl' });
    const geo = await p.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      const li = document.querySelector('#wp-list > li').getBoundingClientRect();
      return { wrapper: r('prose').right, para: r('p1').right, list: r('wp-list').right, li: li.right };
    });
    expect(Math.abs(geo.para - geo.wrapper)).toBeLessThanOrEqual(1);
    expect(geo.list - geo.li).toBeGreaterThan(10);
    expect(await sideways(p)).toBeLessThanOrEqual(0);
  });
});

test.describe('lists laid out by an object', () => {
  test('ul.o-grid has no markers and no indent, and keeps its list role (Chromium)', async ({ page: p }) => {
    await open(p, 1280);
    const look = await p.locator('#cards').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { indent: cs.paddingInlineStart, marker: cs.listStyleType, display: cs.display };
    });
    expect(look).toEqual({ indent: '0px', marker: 'none', display: 'grid' });
    await expect(p.getByRole('list').filter({ has: p.locator('#card') })).toHaveCount(1);
    await expect(p.locator('#cards').getByRole('listitem')).toHaveCount(2);
  });
});
