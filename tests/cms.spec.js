// @ts-check
/**
 * @cai-ds/cms: the article header and the article layout with its table of
 * contents. The page is tests/fixtures/cms-article.html, a whole story as a
 * consumer builds it (site's sticky header, the article, the author box and
 * related posts, which are templates of core and site classes), served at
 * /__cms__ with the language and direction each test needs.
 *
 * The table of contents follows the room the article has (a size
 * container): beside the text, at the inline end, when the article is 46rem
 * wide or more, and staying in view under the sticky header; above the text
 * below that, and with larger text. Core's scroll spy marks the section in
 * view with JavaScript only. Runs in `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const FIXTURE = readFileSync(new URL('./fixtures/cms-article.html', import.meta.url), 'utf-8');

/** Serve the fixture with `lang` and `dir`, and open it at `width`. */
async function open(p, width, { lang = 'en', dir = 'ltr' } = {}) {
  const body = FIXTURE.replace('<html lang="en">', `<html lang="${lang}" dir="${dir}">`);
  await p.route('**/__cms__', (route) => route.fulfill({ contentType: 'text/html', body }));
  await p.setViewportSize({ width, height: 900 });
  await p.goto('/__cms__');
  await p.waitForLoadState('load');
}

/** Add a rule to the page. addStyleTag needs script, and this test also runs without it. */
const style = (p, css) => p.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

const box = (p, id) => p.evaluate((i) => {
  const r = document.getElementById(i).getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width };
}, id);

const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const tokenSize = (p, token) => p.evaluate((t) => {
  const probe = Object.assign(document.createElement('div'), { style: `font-size: var(${t})` });
  document.body.append(probe);
  const value = getComputedStyle(probe).fontSize;
  probe.remove();
  return value;
}, token);

test.describe('cms article page', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious in ${theme}`, async ({ page: p }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(p, 1280);
      await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      const { violations } = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }

  test('one h1, the title; the contents are a navigation landmark named by their heading', async ({ page: p }) => {
    await open(p, 1280);
    await expect(p.getByRole('heading', { level: 1 })).toHaveText('What ten years of tide records say about the bay');
    const toc = p.getByRole('navigation', { name: 'Contents' });
    await expect(toc).toHaveCount(1);
    await expect(toc.getByRole('link')).toHaveCount(4);
  });

  test('the lead picture has no panel: no padding, no background', async ({ page: p }) => {
    await open(p, 1280);
    const media = await p.locator('#media').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { padding: cs.paddingTop, background: cs.backgroundColor, inline: cs.marginInlineStart };
    });
    expect(media).toEqual({ padding: '0px', background: 'rgba(0, 0, 0, 0)', inline: '0px' });
  });

  test('the title steps down: 3xl, 2xl at 640 px and below', async ({ page: p }) => {
    for (const [width, token] of [[1280, '--cai-text-3xl'], [640, '--cai-text-2xl']]) {
      await open(p, width);
      expect(await p.locator('#title').evaluate((el) => getComputedStyle(el).fontSize), `${width} px`).toBe(await tokenSize(p, token));
    }
  });

  test('at 1280 px the contents are beside the text, at the end, and stay in view under the sticky header', async ({ page: p }) => {
    await open(p, 1280);
    const toc = await box(p, 'toc');
    const body = await box(p, 'body');
    expect(body.right).toBeLessThan(toc.left);
    expect(toc.top).toBeLessThan(body.bottom);
    expect(await p.locator('#toc').evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    // The contents come first in the source, whatever the layout
    expect(await p.evaluate(() => document.getElementById('toc').compareDocumentPosition(document.getElementById('body')) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();

    // Instant: <html> scrolls smoothly unless the reader prefers reduced motion
    // To the second section: near the end of the text the contents leave with it
    await p.evaluate(() => window.scrollTo({ top: document.getElementById('level').getBoundingClientRect().top + window.scrollY, behavior: 'instant' }));
    await expect.poll(() => p.evaluate(() => window.scrollY)).toBeGreaterThan(800);
    const header = await box(p, 'hdr');
    const stuck = await box(p, 'toc');
    // Under the header, by --cai-space-lg
    expect(stuck.top).toBeGreaterThanOrEqual(header.bottom);
    expect(stuck.top - header.bottom).toBeLessThanOrEqual(32);
  });

  for (const width of [768, 320]) {
    test(`at ${width} px the contents are above the text, do not stick, and nothing scrolls sideways`, async ({ page: p }) => {
      await open(p, width);
      const toc = await box(p, 'toc');
      const body = await box(p, 'body');
      expect(toc.bottom).toBeLessThanOrEqual(body.top);
      expect(Math.abs(toc.left - body.left)).toBeLessThanOrEqual(1);
      expect(await p.locator('#toc').evaluate((el) => getComputedStyle(el).position)).toBe('static');
      expect(await sideways(p)).toBeLessThanOrEqual(0);
    });
  }

  test('with 200 % text at 1280 px the contents go above the text, and at 320 px nothing goes past the window', async ({ page: p }) => {
    await open(p, 1280);
    await style(p, 'html { font-size: 200% }');
    expect((await box(p, 'toc')).bottom).toBeLessThanOrEqual((await box(p, 'body')).top);

    await p.setViewportSize({ width: 320, height: 900 });
    expect(await sideways(p)).toBeLessThanOrEqual(0);
    const beyond = await p.evaluate(() => {
      const edge = document.documentElement.clientWidth;
      return [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > edge + 0.5).length;
    });
    expect(beyond).toBe(0);
  });

  test('right to left at 1280 px: the contents are on the left of the text', async ({ page: p }) => {
    await open(p, 1280, { lang: 'ar', dir: 'rtl' });
    const toc = await box(p, 'toc');
    const body = await box(p, 'body');
    expect(toc.right).toBeLessThan(body.left);
    expect(await sideways(p)).toBeLessThanOrEqual(0);
  });

  test('in Arabic the kicker and the title have no letter-spacing, and the kicker is in the sans', async ({ page: p }) => {
    await open(p, 1280, { lang: 'ar', dir: 'rtl' });
    const kicker = await p.locator('.cai-cms-article-header__kicker').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { spacing: cs.letterSpacing, family: cs.fontFamily, sans: getComputedStyle(document.documentElement).getPropertyValue('--cai-font-sans').trim() };
    });
    expect(['normal', '0px']).toContain(kicker.spacing);
    expect(kicker.family.replace(/\s/g, '')).toBe(kicker.sans.replace(/\s/g, ''));
    expect(['normal', '0px']).toContain(await p.locator('#title').evaluate((el) => getComputedStyle(el).letterSpacing));
  });

  test('the section in view is marked with JavaScript only, by a bar and the weight', async ({ page: p }, testInfo) => {
    await open(p, 1280);
    await p.evaluate(() => window.scrollTo({ top: document.getElementById('level').getBoundingClientRect().top + window.scrollY - 120, behavior: 'instant' }));
    const current = p.locator('#toc a[aria-current="true"]');
    if (testInfo.project.name === 'chromium-nojs') {
      await p.waitForTimeout(300);
      await expect(current).toHaveCount(0);
      return;
    }
    await expect(current).toHaveCount(1);
    const look = await current.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { weight: cs.fontWeight, bar: cs.borderInlineStartColor, width: cs.borderInlineStartWidth };
    });
    expect(Number(look.weight)).toBeGreaterThanOrEqual(600);
    expect(look.width).toBe('2px');
    expect(look.bar).not.toBe('rgba(0, 0, 0, 0)');
  });
});
