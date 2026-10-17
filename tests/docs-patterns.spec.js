// @ts-check
/**
 * @luz-ds/docs (F6a of .claude/plans/luz-home-docs-identity.md, section 3.2; the brief is
 * f6-docs-spec.md): the seven patterns of a documentation page, CSS only, from tokens, core and
 * docs, with no script.
 *
 *   shell      body.o-shell.luz-docs-shell > header, nav.luz-sidebar.luz-docs-nav, main.o-main.luz-docs-main,
 *              aside.luz-docs-rail: sidebar 16.5rem | content | rail 14rem from 80rem, two columns from
 *              60rem, one below; the measure of the content is --luz-docs-measure: 46rem
 *   page-head  header.luz-docs-page-head > p.__eyebrow, h1, p.__lead, ul.__meta (chips)
 *   rail       aside.luz-docs-rail > nav.luz-docs-rail__onpage (sticky) + .luz-docs-rail__actions
 *   example    figure.luz-docs-example > .__preview (> .__frame, --luz-docs-example-w) + optional .__code
 *   dodont     .luz-docs-dodont > figure.__item--do / --dont (figcaption > strong.__verdict, .__stage)
 *   pager      ul.luz-docs-pager > li.__prev / li.__next > a.__link > span.__label + span.__title
 *   page-foot  p.luz-docs-page-foot (Last updated, Edit, Report)
 *
 * Page: tests/fixtures/docs-patterns.html (tokens, core and docs only). The stylesheet is
 * packages/docs/dist/docs.css, built by `pnpm docs:build`.
 * Runs in `chromium` and, once playwright.config.js lists it in the `chromium-nojs` testMatch, in
 * `chromium-nojs`: nothing here needs a script.
 */
/* global CSSLayerBlockRule */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGE = '/tests/fixtures/docs-patterns.html';
const STYLESHEET = '/packages/docs/dist/docs.css';

/** Measured against a root font size of 16px: 1rem. */
const REM = 16;
const near = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;

/** The boxes the shell places, in page coordinates, and whether each is drawn at all. */
const layout = (page) =>
  page.evaluate(() => {
    const read = (selector) => {
      const el = document.querySelector(selector);
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        left: box.left,
        right: box.right,
        top: box.top + window.scrollY,
        bottom: box.bottom + window.scrollY,
        width: box.width,
        height: box.height,
        visible: style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0,
      };
    };
    return {
      viewport: document.documentElement.clientWidth,
      rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
      nav: read('#nav'),
      main: read('#main-content'),
      rail: read('#rail'),
    };
  });

/** The box of an element in the viewport (it moves when the page scrolls). */
const box = (page, selector) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().toJSON());
const style = (page, selector, property, pseudo = null) =>
  page.locator(selector).first().evaluate((el, [name, pseudoElement]) => getComputedStyle(el, pseudoElement)[name], [property, pseudo]);
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Axe, serious and critical only, in a mode. */
async function axeIn(page, mode) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, mode);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

/* ---- The stylesheet is built and has no script behind it ------------------------------------- */

test.describe('the package', () => {
  test('docs.css is served: the layer order statement first, its rules in luz.docs', async ({ request }) => {
    // `?direct`: Vite serves a bare .css request as a JS module, the way it does for an import
    const response = await request.get(`${STYLESHEET}?direct`);
    expect(response.status(), `${STYLESHEET} (pnpm docs:build)`).toBe(200);
    const css = await response.text();
    expect(css.startsWith('@layer luz.tokens,')).toBe(true);
    expect(css).toMatch(/^@layer luz\.docs \{$/m);
  });

  test('the page loads tokens, core and docs, and no script', async ({ page }) => {
    await page.goto(PAGE);
    expect(await page.evaluate(() => [...document.styleSheets].map((s) => new URL(s.href).pathname))).toEqual([
      '/packages/tokens/dist/luz-tokens.css',
      '/packages/core/dist/luz.css',
      STYLESHEET,
    ]);
    // ... and the last one really is the package's: it holds the luz.docs layer
    expect(
      await page.evaluate(() => [...document.styleSheets].at(-1).cssRules.length > 0 && [...document.styleSheets].at(-1).cssRules.length),
      'docs.css has rules',
    ).toBeTruthy();
    expect(await page.evaluate(() => [...[...document.styleSheets].at(-1).cssRules].some((rule) => rule instanceof CSSLayerBlockRule && rule.name === 'luz.docs'))).toBe(true);
    // Vite's dev server adds its own client to every page it serves: the fixture itself has none
    expect(await page.locator('script:not([src^="/@vite"])').count()).toBe(0);
  });
});

/* ---- shell ------------------------------------------------------------------------------------- */

test.describe('shell: three columns from 80rem, two from 60rem, one below', () => {
  for (const width of [1600, 1440, 1280]) {
    test(`${width}px: sidebar 16.5rem, content, rail 14rem, side by side`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PAGE);
      const { viewport, nav, main, rail } = await layout(page);
      expect(nav.visible && main.visible && rail.visible, 'all three are drawn').toBe(true);
      expect(near(nav.left, 0)).toBe(true);
      expect(near(nav.width, 16.5 * REM), `sidebar ${nav.width}px`).toBe(true);
      expect(near(main.left, nav.right), 'content starts where the sidebar ends').toBe(true);
      expect(near(rail.width, 14 * REM), `rail ${rail.width}px`).toBe(true);
      expect(main.right, 'content ends where the rail starts').toBeLessThanOrEqual(rail.left + 1);
      expect(rail.left, 'the rail is the third column').toBeGreaterThan(main.left + 10 * REM);
      expect(rail.right).toBeLessThanOrEqual(viewport + 1);
    });
  }

  for (const width of [1279, 1024, 960]) {
    test(`${width}px: sidebar and content, the rail is not a third column`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PAGE);
      const { viewport, nav, main, rail } = await layout(page);
      expect(nav.visible && main.visible).toBe(true);
      expect(near(nav.left, 0)).toBe(true);
      expect(near(nav.width, 16.5 * REM), `sidebar ${nav.width}px`).toBe(true);
      expect(near(main.left, nav.right), 'content starts where the sidebar ends').toBe(true);
      expect(near(main.right, viewport), 'content takes the rest').toBe(true);
      expect(!rail.visible || rail.left <= main.left + 1, 'the rail is hidden or below the content, never beside it').toBe(true);
    });
  }

  for (const width of [959, 800, 375]) {
    test(`${width}px: one column, the sidebar above the content`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(PAGE);
      const { viewport, nav, main, rail } = await layout(page);
      expect(near(main.left, 0), 'content starts at the edge').toBe(true);
      expect(near(main.right, viewport), 'content takes the width').toBe(true);
      expect(!nav.visible || nav.bottom <= main.top + 1, 'the sidebar is hidden or above the content').toBe(true);
      expect(!rail.visible || rail.left <= main.left + 1, 'the rail is hidden or below the content').toBe(true);
    });
  }

  test('the measure of the content is --luz-docs-measure, 46rem, and a paragraph does not pass it', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(PAGE);
    expect(await page.locator('#main-content').evaluate((el) => getComputedStyle(el).getPropertyValue('--luz-docs-measure').trim())).toBe('46rem');
    const paragraph = await box(page, '#p1');
    expect(paragraph.width, 'a paragraph is no wider than the measure').toBeLessThanOrEqual(46 * REM + 1);
    expect(paragraph.width, 'and is not squeezed').toBeGreaterThan(30 * REM);
  });
});

/* ---- page-head --------------------------------------------------------------------------------- */

test.describe('page-head: eyebrow, h1, lead and chips', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
  });

  test('stacks the eyebrow, the h1, the lead and the chips, in that order, on one start edge', async ({ page }) => {
    const [eyebrow, title, lead, meta] = await Promise.all(['#eyebrow', '#title', '#lead', '#meta'].map((s) => box(page, s)));
    expect(eyebrow.bottom).toBeLessThanOrEqual(title.top + 1);
    expect(title.bottom).toBeLessThanOrEqual(lead.top + 1);
    expect(lead.bottom).toBeLessThanOrEqual(meta.top + 1);
    for (const other of [title, lead, meta]) expect(near(other.left, eyebrow.left, 2)).toBe(true);
  });

  test('the h1 is the largest, the lead is larger than running text and the eyebrow is smaller than it', async ({ page }) => {
    const size = async (selector) => parseFloat(await style(page, selector, 'fontSize'));
    expect(await size('#title')).toBeGreaterThan(await size('#lead'));
    expect(await size('#title')).toBeGreaterThan(await size('#eyebrow'));
    expect(await size('#lead'), 'the lead').toBeGreaterThan(await size('#p1'));
    expect(await size('#eyebrow'), 'the eyebrow').toBeLessThan(await size('#p1'));
  });

  test('the chips are a row of small shapes, not a bulleted list', async ({ page }) => {
    expect(await style(page, '#meta', 'listStyleType')).toBe('none');
    const [first, second, third] = await Promise.all(['#chip-1', '#chip-2', '#chip-3'].map((s) => box(page, s)));
    expect(near(first.top, second.top, 2) && near(second.top, third.top, 2), 'the first three share a row').toBe(true);
    expect(second.left).toBeGreaterThan(first.right - 1);
    for (const selector of ['#chip-1', '#chip-4']) {
      const shape = await page.locator(selector).evaluate((el) => {
        const s = getComputedStyle(el);
        return { border: parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none', fill: s.backgroundColor !== 'rgba(0, 0, 0, 0)', pad: parseFloat(s.paddingInlineStart) };
      });
      expect(shape.border || shape.fill, `${selector} is a shape`).toBe(true);
      expect(shape.pad, `${selector} has room around its text`).toBeGreaterThan(0);
    }
  });

  test('the chips wrap at 320px and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const chips = await Promise.all(['#chip-1', '#chip-2', '#chip-3', '#chip-4', '#chip-5'].map((s) => box(page, s)));
    for (const chip of chips) expect(chip.right).toBeLessThanOrEqual(320 + 1);
    expect(await sideways(page)).toBe(0);
  });
});

/* ---- rail -------------------------------------------------------------------------------------- */

test.describe('rail: "On this page" that stays in view, and the page actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto(PAGE);
  });

  test('"On this page" is sticky: it stays in view while the page scrolls past', async ({ page }) => {
    const before = await box(page, '#onpage');
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    expect(await page.evaluate(() => window.scrollY), 'the page scrolled').toBeGreaterThan(1000);
    expect((await box(page, '#head')).bottom, 'the page head is gone').toBeLessThan(0);
    const after = await box(page, '#onpage');
    expect(after.top, 'still in the window').toBeGreaterThanOrEqual(0);
    expect(after.top, 'near its top edge').toBeLessThanOrEqual(200);
    expect(after.bottom, 'all of it is visible').toBeLessThanOrEqual(800);
    expect(near(after.left, before.left), 'in the same column').toBe(true);
  });

  test('its list has no bullets and its links are separate lines at least 24px high', async ({ page }) => {
    expect(await style(page, '#onpage ul', 'listStyleType')).toBe('none');
    const links = await Promise.all(['#on-example', '#on-issues', '#on-dodont', '#on-reading'].map((s) => box(page, s)));
    links.forEach((link, i) => {
      expect(link.height, `link ${i}`).toBeGreaterThanOrEqual(24);
      if (i > 0) expect(link.top, `link ${i}`).toBeGreaterThanOrEqual(links[i - 1].bottom - 1);
    });
  });

  test('the actions come after "On this page", one under the other, each a target of 24px or more', async ({ page }) => {
    const onpage = await box(page, '#onpage');
    const actions = await Promise.all(['#act-copy', '#act-edit', '#act-report'].map((s) => box(page, s)));
    expect(actions[0].top).toBeGreaterThanOrEqual(onpage.bottom - 1);
    actions.forEach((action, i) => {
      expect(action.height, `action ${i}`).toBeGreaterThanOrEqual(24);
      if (i > 0) expect(action.top, `action ${i}`).toBeGreaterThanOrEqual(actions[i - 1].bottom - 1);
    });
  });
});

/* ---- example ----------------------------------------------------------------------------------- */

test.describe('example: the preview and its code in one frame, a frame as wide as the width selector says', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
  });

  test('is one framed figure: the preview, then the code under it, both inside the border', async ({ page }) => {
    const figure = await box(page, '#example');
    const preview = await box(page, '#preview');
    const code = await box(page, '#code');
    const border = await page.locator('#example').evaluate((el) => {
      const s = getComputedStyle(el);
      return parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none';
    });
    expect(border, 'the figure has a border').toBe(true);
    expect(code.top).toBeGreaterThanOrEqual(preview.bottom - 1);
    for (const part of [preview, code]) {
      expect(part.left).toBeGreaterThanOrEqual(figure.left);
      expect(part.right).toBeLessThanOrEqual(figure.right);
      expect(part.top).toBeGreaterThanOrEqual(figure.top);
      expect(part.bottom).toBeLessThanOrEqual(figure.bottom);
    }
    expect(near(preview.width, code.width, 2), 'the same width').toBe(true);
  });

  test('the code is optional: a figure with only a preview is framed too', async ({ page }) => {
    await expect(page.locator('#example-plain .luz-docs-example__code')).toHaveCount(0);
    const figure = await box(page, '#example-plain');
    const preview = await box(page, '#preview-plain');
    expect(figure.height).toBeGreaterThan(preview.height - 1);
    expect(figure.height, 'no room kept for code that is not there').toBeLessThan((await box(page, '#example')).height);
    expect(await page.locator('#example-plain').evaluate((el) => {
      const s = getComputedStyle(el);
      return parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none';
    }), 'the figure has a border').toBe(true);
  });

  test('the frame is as wide as the preview, unless --luz-docs-example-w narrows it', async ({ page }) => {
    const preview = await box(page, '#preview');
    const open = await box(page, '#frame');
    const narrow = await box(page, '#frame-narrow');
    expect(open.width, 'no width set: the room there is').toBeGreaterThan(30 * REM - 1);
    expect(open.width).toBeLessThanOrEqual(preview.width + 1);
    expect(near(narrow.width, 20 * REM), `--luz-docs-example-w: 20rem gives ${narrow.width}px`).toBe(true);
    expect(narrow.width).toBeLessThan(open.width);
  });

  test('a width that is more than the room never widens the figure', async ({ page }) => {
    const figure = await box(page, '#example-wide');
    const frame = await box(page, '#frame-wide');
    expect(frame.right).toBeLessThanOrEqual(figure.right + 1);
    expect(frame.width).toBeLessThan(64 * REM);
  });

  test('what is inside a narrow frame answers to the frame: a block button stays in it', async ({ page }) => {
    const frame = await box(page, '#frame-narrow');
    const button = await box(page, '#frame-narrow .luz-btn');
    expect(button.right).toBeLessThanOrEqual(frame.right + 1);
    expect(button.width).toBeLessThanOrEqual(20 * REM + 1);
  });

  test('the code scrolls inside its own box at 320px, and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const code = await page.locator('#code-pre').evaluate((el) => ({ scrolls: el.scrollWidth > el.clientWidth, right: el.getBoundingClientRect().right }));
    expect(code.scrolls, 'the long line scrolls in the pre').toBe(true);
    expect(code.right).toBeLessThanOrEqual(320 + 1);
    expect(await sideways(page)).toBe(0);
  });
});

/* ---- dodont ------------------------------------------------------------------------------------ */

test.describe('dodont: a Do and a Don\'t, side by side when there is room', () => {
  test('1440px: side by side, the same size, the Do first', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    const [yes, no] = await Promise.all(['#do', '#dont'].map((s) => box(page, s)));
    expect(near(yes.top, no.top, 1)).toBe(true);
    expect(no.left).toBeGreaterThan(yes.right - 1);
    expect(near(yes.width, no.width, 2)).toBe(true);
  });

  test('375px: stacked, each the full width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(PAGE);
    const [yes, no] = await Promise.all(['#do', '#dont'].map((s) => box(page, s)));
    expect(no.top).toBeGreaterThanOrEqual(yes.bottom - 1);
    expect(near(yes.width, no.width, 2)).toBe(true);
    expect(await sideways(page)).toBe(0);
  });

  test('the verdict is more than a colour: a mark before the word and a different frame (a11y TAB-20)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    const yes = await style(page, '#do-verdict', 'content', '::before');
    const no = await style(page, '#dont-verdict', 'content', '::before');
    for (const content of [yes, no]) expect(['none', 'normal']).not.toContain(content);
    expect(yes).not.toBe(no);
    expect(await style(page, '#do', 'borderTopStyle')).toBe('solid');
    expect(await style(page, '#dont', 'borderTopStyle')).toBe('dashed');
  });

  test('the stage is a framed picture inside its item', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
    const item = await box(page, '#do');
    const stage = await box(page, '#do-stage');
    expect(stage.left).toBeGreaterThanOrEqual(item.left);
    expect(stage.right).toBeLessThanOrEqual(item.right);
    expect(parseFloat(await style(page, '#do-stage', 'borderTopWidth'))).toBeGreaterThan(0);
  });
});

/* ---- pager ------------------------------------------------------------------------------------- */

test.describe('pager: Previous and Next as two link blocks', () => {
  test('1280px: side by side, equal, Next at the end', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PAGE);
    const [prev, next] = await Promise.all(['#pager-prev', '#pager-next'].map((s) => box(page, s)));
    expect(near(prev.top, next.top, 1)).toBe(true);
    expect(next.left).toBeGreaterThan(prev.right);
    expect(near(prev.width, next.width, 2)).toBe(true);
    expect(await page.locator('#pager .luz-docs-pager__next').evaluate((el) => getComputedStyle(el).textAlign)).toMatch(/^(end|right)$/);
    for (const link of [prev, next]) expect(link.height).toBeGreaterThanOrEqual(24);
  });

  test('640px: stacked, each the full width', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto(PAGE);
    const [prev, next] = await Promise.all(['#pager-prev', '#pager-next'].map((s) => box(page, s)));
    expect(next.top).toBeGreaterThanOrEqual(prev.bottom - 1);
    expect(near(prev.width, next.width, 2)).toBe(true);
    expect(await sideways(page)).toBe(0);
  });

  test('Tab reaches Previous, then Next, and each shows a focus ring', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(PAGE);
    await page.locator('#pager-prev').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#pager-next')).toBeFocused();
    expect(await style(page, '#pager-next', 'outlineStyle')).not.toBe('none');
    expect(parseFloat(await style(page, '#pager-next', 'outlineWidth'))).toBeGreaterThan(0);
  });
});

/* ---- page-foot --------------------------------------------------------------------------------- */

test.describe('page-foot: Last updated, Edit, Report', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PAGE);
  });

  test('is small print under the content: smaller than a paragraph, after the pager', async ({ page }) => {
    expect(parseFloat(await style(page, '#foot', 'fontSize'))).toBeLessThan(parseFloat(await style(page, '#p1', 'fontSize')));
    expect((await box(page, '#foot')).top).toBeGreaterThanOrEqual((await box(page, '#pager')).bottom - 1);
  });

  test('its links are targets of 24px or more (WCAG 2.5.8)', async ({ page }) => {
    for (const selector of ['#foot-edit', '#foot-report']) expect((await box(page, selector)).height, selector).toBeGreaterThanOrEqual(24);
  });

  test('wraps at 320px and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    expect((await box(page, '#foot')).right).toBeLessThanOrEqual(320 + 1);
    expect(await sideways(page)).toBe(0);
  });
});

/* ---- The whole page: no sideways scroll, axe in the three modes -------------------------------- */

test.describe('the page', () => {
  test('does not scroll sideways at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(PAGE);
    expect(await sideways(page)).toBe(0);
  });

  for (const mode of ['light', 'dark', 'high-contrast']) {
    test(`has no serious or critical axe violation in ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(PAGE);
      expect(await axeIn(page, mode)).toEqual([]);
    });
  }

  test('has no serious or critical axe violation at 320px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(PAGE);
    expect(await axeIn(page, 'light')).toEqual([]);
  });
});
