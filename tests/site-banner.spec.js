// @ts-check
/**
 * The banner of @luz-ds/site (<luz-banner>, a CSS-only tag around one
 * section[aria-labelledby]: .claude/plans/specs/f3-package-model.md section
 * 2.2, D1 and D4, step 8; accessibility requirement O2). A band above the
 * site header with one announcement and an optional link. No script and no
 * close button. `tone="warning"` is the one variant. On
 * tests/fixtures/site-top.html. Runs in `chromium` and `chromium-nojs`: it is
 * the same in both.
 *
 * O1: the accessibility tree is the one `section.luz-site-notice` gave before
 * the rename; the snapshots below were taken from that markup.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/site-top.html';

async function open(page, width, dir = 'ltr') {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(FIXTURE);
  if (dir === 'rtl') await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
}

const style = (page, css) => page.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

const box = (page, selector) => page.evaluate((s) => {
  const r = document.querySelector(s).getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width };
}, selector);

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** The banner as the first test pages see it: `tone` on the tag, the section inside. */
const tone = (page, value) => page.evaluate((v) => document.querySelector('luz-banner').setAttribute('tone', v), value);

/**
 * How the band is painted, wherever the implementation puts it (the tag or its
 * section): the background and the block-end border of the element, among the
 * two, that has them.
 */
const paint = (page) => page.evaluate(() => {
  const host = document.querySelector('luz-banner');
  const section = host.querySelector('section');
  const of = (el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, width: parseFloat(s.borderBlockEndWidth), style: s.borderBlockEndStyle, color: s.borderBlockEndColor };
  };
  const transparent = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  const a = of(section);
  const b = of(host);
  return { bg: transparent(a.bg) ? b.bg : a.bg, border: a.width > 0 ? a : b };
});

/** The colour a token resolves to, as a background. */
const token = (page, name) => page.evaluate((n) => {
  const probe = Object.assign(document.createElement('div'), { style: `background: var(${n})` });
  document.body.append(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return color;
}, name);

/** The tree of the banner with the plain text, as `section.luz-site-notice` rendered it. */
const PLAIN = `
- /children: equal
- region "Open day.":
  - paragraph:
    - strong: Open day.
    - text: Visit the winery on Saturday 25 October, from 11:00 to 18:00.
    - link "Book a visit":
      - /url: "#visits"
`;

const WARNING = `
- /children: equal
- region "Planned maintenance.":
  - paragraph:
    - strong: Planned maintenance.
    - text: Visit the winery on Saturday 25 October, from 11:00 to 18:00.
    - link "Book a visit":
      - /url: "#visits"
`;

test.describe('site banner', () => {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    for (const warning of [false, true]) {
      test(`axe finds nothing serious in ${theme}${warning ? ', warning' : ''}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
        await open(page, 1280);
        await page.evaluate(([t, w]) => {
          document.documentElement.dataset.theme = t;
          if (w) document.querySelector('luz-banner').setAttribute('tone', 'warning');
        }, [theme, warning]);
        await settled(page); // axe must not sample a colour mid-transition (Firefox)
        const { violations } = await new AxeBuilder({ page }).include('luz-banner').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
      });
    }
  }

  test('is <luz-banner> around one section: no class anywhere, the old classes gone, a block', async ({ page }) => {
    await open(page, 1280);
    const shape = await page.evaluate(() => {
      const host = document.querySelector('luz-banner');
      return {
        children: [...host.children].map((c) => c.localName),
        labelled: host.firstElementChild.hasAttribute('aria-labelledby'),
        classes: [host, ...host.querySelectorAll('*')].filter((el) => el.hasAttribute('class')).length,
        oldClass: document.querySelectorAll('[class*="luz-site-notice"]').length,
        display: getComputedStyle(host).display,
        position: getComputedStyle(host).position,
      };
    });
    expect(shape).toEqual({ children: ['section'], labelled: true, classes: 0, oldClass: 0, display: 'block', position: 'static' });
  });

  test('O1: the accessibility tree is what the classed section gave, plain and warning', async ({ page }) => {
    await open(page, 1280);
    await expect(page.locator('luz-banner')).toMatchAriaSnapshot(PLAIN);
    await page.evaluate(() => {
      document.querySelector('luz-banner').setAttribute('tone', 'warning');
      document.querySelector('luz-banner strong').textContent = 'Planned maintenance.';
    });
    await expect(page.locator('luz-banner')).toMatchAriaSnapshot(WARNING);
  });

  test('a region named by its visible label, above the header, the width of the window', async ({ page }) => {
    await open(page, 1280);
    await expect(page.getByRole('region', { name: 'Open day.' })).toHaveCount(1);
    const banner = await box(page, '#notice');
    expect(banner.left).toBe(0);
    expect(banner.width).toBe(1280);
    expect(banner.bottom).toBeLessThanOrEqual((await box(page, '#hdr')).top + 1);
    // Painted as a band: a surface of its own and a rule under it
    const { bg, border } = await paint(page);
    expect(bg).toBe(await token(page, '--luz-surface-muted'));
    expect(border.width).toBeGreaterThanOrEqual(1);
  });

  for (const [width, dir] of [[1440, 'ltr'], [1024, 'ltr'], [320, 'ltr'], [1440, 'rtl'], [320, 'rtl']]) {
    test(`${width} px ${dir}: the text starts where the header's row starts`, async ({ page }) => {
      await open(page, width, dir);
      const text = await box(page, '#notice p');
      // The first thing of the header's row: the menu button up to 768 px, then the brand
      const brand = await box(page, width <= 768 ? '#toggle' : '#brand');
      if (dir === 'ltr') expect(Math.abs(text.left - brand.left)).toBeLessThanOrEqual(1);
      else expect(Math.abs(text.right - brand.right)).toBeLessThanOrEqual(1);
    });
  }

  test('its only control is its link, reached before the header (O2 DOM order: skip, consent, banner, header)', async ({ page }) => {
    await open(page, 1280);
    const order = await page.evaluate(() => {
      const position = (selector) => document.querySelector(selector);
      const before = (a, b) => !!(position(a).compareDocumentPosition(position(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [before('#skip', 'luz-consent'), before('luz-consent', 'luz-banner'), before('luz-banner', '#hdr')];
    });
    expect(order).toEqual([true, true, true]);

    await page.evaluate(() => document.getElementById('consent').remove());
    await page.keyboard.press('Tab');
    await expect(page.locator('#skip')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#notice-link')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('#hdr'))).toBe(true);
    await expect(page.locator('luz-banner button')).toHaveCount(0);
  });

  test('warning: tone="warning" changes the band and its rule, and the words say it as well (RL-6)', async ({ page }) => {
    await open(page, 1280);
    const plain = await paint(page);
    await tone(page, 'warning');
    await page.evaluate(() => { document.querySelector('luz-banner strong').textContent = 'Planned maintenance.'; });
    const warning = await paint(page);
    expect(warning.bg).toBe(await token(page, '--luz-color-warning-bg'));
    expect(warning.bg).not.toBe(plain.bg);
    expect(warning.border.color).not.toBe(plain.border.color);
    await expect(page.getByRole('region', { name: 'Planned maintenance.' })).toHaveCount(1);
  });

  test('tone takes warning only: another value, and the old modifier class, leave the plain band', async ({ page }) => {
    await open(page, 1280);
    const plain = await paint(page);
    await tone(page, 'danger');
    expect(await paint(page)).toEqual(plain);
    await page.evaluate(() => {
      document.querySelector('luz-banner').removeAttribute('tone');
      document.querySelector('#notice').classList.add('luz-site-notice--warning');
    });
    expect(await paint(page)).toEqual(plain);
  });

  test('O2: each banner is a region with a name of its own; none is an alert, a status or a live region', async ({ page }) => {
    await open(page, 1280);
    await page.evaluate(() => {
      const second = document.querySelector('luz-banner').cloneNode(true);
      second.setAttribute('tone', 'warning');
      second.querySelector('section').id = 'notice-2';
      second.querySelector('strong').id = 'notice-label-2';
      second.querySelector('section').setAttribute('aria-labelledby', 'notice-label-2');
      second.querySelector('strong').textContent = 'Planned maintenance.';
      second.querySelector('a').id = 'notice-link-2';
      document.querySelector('luz-banner').after(second);
    });
    await expect(page.getByRole('region', { name: 'Open day.' })).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Planned maintenance.' })).toHaveCount(1);
    const live = await page.evaluate(() => document.querySelectorAll('luz-banner [role="alert"], luz-banner [role="status"], luz-banner [aria-live], luz-banner [aria-atomic], luz-banner [role="alertdialog"]').length);
    expect(live).toBe(0);
    // Static: neither sticks nor floats (it scrolls away with the page)
    const positions = await page.locator('luz-banner').evaluateAll((all) => all.map((el) => getComputedStyle(el).position));
    expect(positions).toEqual(['static', 'static']);
  });

  test('O2: in forced colours both tones keep a border, so the band and the warning stay visible', async ({ page }) => {
    await open(page, 1280);
    await page.emulateMedia({ forcedColors: 'active' });
    for (const value of ['', 'warning']) {
      if (value) await tone(page, value);
      const { border } = await paint(page);
      expect(border.width, value || 'plain').toBeGreaterThanOrEqual(1);
      expect(border.style, value || 'plain').not.toBe('none');
    }
    // The warning is also in the words, not only in a colour (RL-6): the label says what it is
    await page.evaluate(() => { document.querySelector('luz-banner strong').textContent = 'Planned maintenance.'; });
    await expect(page.getByRole('region', { name: 'Planned maintenance.' })).toHaveCount(1);
  });

  test('320 px and 200 % text: it wraps, nothing scrolls sideways', async ({ page }) => {
    for (const dir of ['ltr', 'rtl']) {
      await open(page, 320, dir);
      await style(page, 'html { font-size: 200% }');
      expect(await sideways(page), dir).toBeLessThanOrEqual(0);
      const banner = await box(page, '#notice p');
      expect(banner.right, dir).toBeLessThanOrEqual(320);
      expect(banner.left, dir).toBeGreaterThanOrEqual(0);
    }
  });
});
