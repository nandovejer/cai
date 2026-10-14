// @ts-check
/**
 * Core's .cai-meta (components/meta.css): a line of facts with a dot drawn by
 * CSS between them. The page is tests/fixtures/prose.html (a byline above
 * the post, and a meta line in each card of a list), served at /__meta__.
 * Checks that the dots are drawn between the facts and are not in the
 * accessibility tree, that no wrapped line starts with a dot, in both
 * directions, that a link's focus ring is not clipped, that a card's title
 * link still covers the card, and axe in the three modes. CSS only: runs in
 * `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const FIXTURE = readFileSync(new URL('./fixtures/prose.html', import.meta.url), 'utf-8');

async function open(p, width, { lang = 'en', dir = 'ltr' } = {}) {
  const body = FIXTURE.replace('<html lang="en">', `<html lang="${lang}" dir="${dir}">`);
  await p.route('**/__meta__', (route) => route.fulfill({ contentType: 'text/html', body }));
  await p.setViewportSize({ width, height: 900 });
  await p.goto('/__meta__');
  await p.waitForLoadState('load');
}

/** Add a rule to the page. addStyleTag needs script, and this test also runs without it. */
const style = (p, css) => p.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/**
 * For each fact of #meta: the line it is on, whether it starts that line,
 * and where its dot would be drawn relative to the clip of the line (the
 * dot is centred in the gap before the fact; negative = outside the clip).
 */
const facts = (p) => p.evaluate(() => {
  const meta = document.getElementById('meta');
  const rtl = getComputedStyle(meta).direction === 'rtl';
  const box = meta.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(meta).columnGap);
  const items = [...meta.children].map((el) => el.getBoundingClientRect());
  const tops = [...new Set(items.map((r) => Math.round(r.top)))];
  return items.map((r, i) => {
    const start = rtl ? box.right - r.right : r.left - box.left; // from the clip edge, inward
    return { i, line: tops.indexOf(Math.round(r.top)), startsLine: i === 0 || Math.round(items[i - 1].top) !== Math.round(r.top), dotCentre: start - gap / 2 };
  });
});

test.describe('meta line', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}`, async ({ page: p }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(p, 1280);
      await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const { violations } = await new AxeBuilder({ page: p }).include('#meta').include('#cards').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }

  test('a dot before every fact but the first, which screen readers do not get', async ({ page: p }) => {
    await open(p, 1280);
    const dots = await p.locator('#meta > *').evaluateAll((els) => els.map((el) => getComputedStyle(el, '::before').content));
    expect(dots[0]).toBe('none');
    for (const d of dots.slice(1)) expect(d).toContain('·');
    // The facts are in the accessibility tree, the dots are not
    const tree = await p.locator('#meta').ariaSnapshot();
    expect(tree).toContain('12 October 2026');
    expect(tree).not.toContain('·');
  });

  test('on one line, the facts are a gap apart, with the dot in the middle of it', async ({ page: p }) => {
    await open(p, 1280);
    const all = await facts(p);
    expect(new Set(all.map((f) => f.line)).size).toBe(1);
    const gap = await p.locator('#meta').evaluate((el) => parseFloat(getComputedStyle(el).columnGap));
    const [a, b] = await p.evaluate(() => ['m-author', 'm-date'].map((id) => document.getElementById(id).getBoundingClientRect()));
    expect(b.left - a.right).toBeCloseTo(gap, 0);
  });

  for (const [dir, lang] of [['ltr', 'en'], ['rtl', 'ar']]) {
    test(`wrapped (${dir}): no line starts with a dot, and nothing scrolls sideways`, async ({ page: p }) => {
      await open(p, 320, { lang, dir });
      await style(p, '#meta { max-inline-size: 12rem }');
      const all = await facts(p);
      expect(new Set(all.map((f) => f.line)).size).toBeGreaterThan(1);
      expect(await p.locator('#meta').evaluate((el) => getComputedStyle(el).overflowX)).toBe('clip');
      for (const f of all.filter((x) => x.startsLine && x.i > 0)) {
        // The dot of a fact that starts a line is outside the clip
        expect(f.dotCentre, `fact ${f.i}`).toBeLessThan(0);
      }
      for (const f of all.filter((x) => !x.startsLine)) expect(f.dotCentre, `fact ${f.i}`).toBeGreaterThan(0);
      expect(await sideways(p)).toBeLessThanOrEqual(0);
    });
  }

  test('with 200 % text at 320 px it wraps and nothing scrolls sideways', async ({ page: p }) => {
    await open(p, 320);
    await style(p, 'html { font-size: 200% }');
    expect(new Set((await facts(p)).map((f) => f.line)).size).toBeGreaterThan(1);
    expect(await sideways(p)).toBeLessThanOrEqual(0);
  });

  test('the text lines up with the text above it, and a link has room for its focus ring inside the clip', async ({ page: p }) => {
    await open(p, 1280);
    await p.keyboard.press('Tab');
    await expect(p.locator('#m-link')).toBeFocused();
    const geo = await p.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      const ring = getComputedStyle(document.getElementById('m-link'));
      return { meta: r('meta').left, first: r('m-author').left, link: r('m-link').left, heading: document.querySelector('h1').getBoundingClientRect().left, ring: parseFloat(ring.outlineOffset) + parseFloat(ring.outlineWidth) };
    });
    expect(geo.ring).toBeGreaterThan(0);
    expect(Math.abs(geo.first - geo.heading)).toBeLessThanOrEqual(1);
    expect(geo.link - geo.ring).toBeGreaterThanOrEqual(geo.meta - 0.5);
  });

  test('in a card, the title link still covers the meta line', async ({ page: p }) => {
    await open(p, 1280);
    const hit = await p.evaluate(() => {
      const meta = document.getElementById('card-meta');
      meta.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = meta.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 4, r.top + r.height / 2)?.id;
    });
    expect(hit).toBe('card-link');
  });
});
