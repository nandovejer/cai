// @ts-check
/**
 * `.luz-cms-page-header` (@luz-ds/cms; .claude/plans/specs/f3-package-model.md,
 * §1.6, D11 and §9 step 11): the title of a page that is not an article (about,
 * contact), no longer `.luz-site-page-header` of site. A wrapper with the page's
 * `h1` (`__title`) and one sentence about what the page is for (`__lead`),
 * styled by cms alone. The values are the old block's, which this one replaces:
 * 32px of room below, a light 3xl title in the heading font (2xl at 640px and
 * below), and a lead in the secondary text colour, 600px wide at most.
 *
 * The page is tests/fixtures/cms-page.html: tokens, core and cms, no site
 * (@luz-ds/site is an optional peer). No script: runs in `chromium` and
 * `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MODES, contrast } from './helpers/design-tokens.js';

const FIXTURE = '/tests/fixtures/cms-page.html';

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
const px = (page, expression) => resolved(page, `inline-size:${expression};position:absolute`, 'inlineSize');
const style = (page, selector, property) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], property);
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('cms page header', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(FIXTURE);
  });

  test('has xl of room below it', async ({ page }) => {
    expect(await style(page, '#page-header', 'marginBlockEnd')).toBe(await px(page, 'var(--luz-space-xl)'));
  });

  test('the title is the page\'s h1: the heading font, 3xl, light, tight, the text colour, 2xs above the lead', async ({ page }) => {
    expect(await page.locator('#page-title').evaluate((el) => el.tagName)).toBe('H1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    expect(await style(page, '#page-title', 'fontFamily')).toBe(await resolved(page, 'font-family:var(--luz-font-heading)', 'fontFamily'));
    expect(await style(page, '#page-title', 'fontSize')).toBe(await resolved(page, 'font-size:var(--luz-text-3xl)', 'fontSize'));
    expect(await style(page, '#page-title', 'fontWeight')).toBe('300');
    expect(await style(page, '#page-title', 'letterSpacing')).toBe('-1px');
    expect(await style(page, '#page-title', 'color')).toBe(await color(page, '--luz-text-primary'));
    expect(await style(page, '#page-title', 'marginBlockEnd')).toBe(await px(page, 'var(--luz-space-2xs)'));
  });

  test('at 640px and below the title steps down to 2xl with half the letter-spacing', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    expect(await style(page, '#page-title', 'fontSize')).toBe(await resolved(page, 'font-size:var(--luz-text-2xl)', 'fontSize'));
    expect(await style(page, '#page-title', 'letterSpacing')).toBe('-0.5px');
    await page.setViewportSize({ width: 641, height: 900 });
    expect(await style(page, '#page-title', 'fontSize')).toBe(await resolved(page, 'font-size:var(--luz-text-3xl)', 'fontSize'));
  });

  test('in Arabic the title has no letter-spacing, which would break the joins of the script', async ({ page }) => {
    await page.evaluate(() => { document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; });
    expect(['normal', '0px']).toContain(await style(page, '#page-title', 'letterSpacing'));
    await page.setViewportSize({ width: 640, height: 900 });
    expect(['normal', '0px']).toContain(await style(page, '#page-title', 'letterSpacing'));
  });

  test('the lead is a paragraph in the secondary text colour, base size, 600px wide at most', async ({ page }) => {
    expect(await page.locator('#page-lead').evaluate((el) => el.tagName)).toBe('P');
    expect(await style(page, '#page-lead', 'color')).toBe(await color(page, '--luz-text-secondary'));
    expect(await style(page, '#page-lead', 'fontSize')).toBe(await resolved(page, 'font-size:var(--luz-text-base)', 'fontSize'));
    expect(await style(page, '#page-lead', 'maxWidth')).toBe('600px');
    expect(await page.locator('#page-lead').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(600.5);
  });

  for (const mode of MODES) {
    test(`the title and the lead are at least 4.5:1 on the page in ${mode} (computed from the tokens)`, async ({ page }) => {
      expect(contrast(mode, 'text-primary', 'surface-page')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(mode, 'text-secondary', 'surface-page')).toBeGreaterThanOrEqual(4.5);
      // No colour transition caught half way when the mode changes
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, mode);
      expect(await style(page, '#page-title', 'color')).toBe(await color(page, '--luz-text-primary'));
      expect(await style(page, '#page-lead', 'color')).toBe(await color(page, '--luz-text-secondary'));
    });
  }

  test('the lead comes right after the title in the source, and both are inside the one block', async ({ page }) => {
    expect(await page.locator('#page-header').evaluate((el) => [...el.children].map((c) => c.id))).toEqual(['page-title', 'page-lead']);
  });

  for (const width of [320, 768, 1280]) {
    test(`${width} px: nothing scrolls sideways, even right to left and with 200 % text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      expect(await sideways(page)).toBeLessThanOrEqual(0);
      await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });
  }

  test('the markup carries no `luz-site-*` class', async ({ page }) => {
    expect(await page.evaluate(() => [...document.querySelectorAll('[class]')].flatMap((el) => [...el.classList]).filter((c) => c.startsWith('luz-site-')))).toEqual([]);
  });

  for (const mode of MODES) {
    test(`axe finds nothing serious in ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, mode);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }
});
