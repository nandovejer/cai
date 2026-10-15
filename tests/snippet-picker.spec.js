// @ts-check
/**
 * LUZ — the snippet picker of "Choose your snippet" (F4 step 6, spec
 * f4-customisation.md 3.4.2, 3.4.3 and 3.4.5).
 *
 * The page is generated (scripts/docs-site/snippets.js): an index table, and
 * eight snippets stacked in four sections. The picker is not in the page:
 * it is a <template data-docs-picker>, so without JavaScript there is no
 * `form.docs-picker` in the DOM at all (docs.spec.js allows no `hidden`
 * element in main) and the table is the index. With JavaScript
 * `initSnippetPicker()` (apps/docs/reference.js) clones it in, hides the
 * table, shows the one snippet that matches the two radios, copies that
 * snippet's h3 into <output data-picker-status>, and keeps the choice in
 * the URL (`history.replaceState`, `#<kind>-<via>`), never in storage.
 *
 * Runs in `chromium` (the picker) and `chromium-nojs` (the index).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/docs/get-started/snippet/';
const KINDS = ['atoms', 'landing', 'blog', 'app'];
const VIAS = ['npm', 'cdn'];
const IDS = KINDS.flatMap((k) => VIAS.map((v) => `${k}-${v}`));
const THEMES = ['light', 'dark', 'high-contrast'];

// The labels the generator writes (scripts/docs-site/snippets.js)
const KIND_LABEL = { atoms: 'Components only', landing: 'Landing page', blog: 'Blog or newspaper', app: 'Web application' };
const VIA_LABEL = { npm: 'npm and a bundler', cdn: 'CDN with integrity hashes' };

const picker = (page) => page.locator('form.docs-picker');
const status = (page) => page.locator('output[data-picker-status]');
const radio = (page, label) => page.getByRole('radio', { name: label, exact: true });
const choose = async (page, kind, via) => {
  await radio(page, KIND_LABEL[kind]).check();
  await radio(page, VIA_LABEL[via]).check();
};
const shownSnippets = (page) =>
  page.locator('[data-snippet]').evaluateAll((all) => all.filter((el) => el.checkVisibility()).map((el) => el.id));
const shownSections = (page) =>
  page.locator('[data-snippet-kind]').evaluateAll((all) => all.filter((el) => el.checkVisibility()).map((el) => el.getAttribute('data-snippet-kind')));

async function ready(page, hash = '') {
  await page.goto(`${ROUTE}${hash}`);
  await page.waitForLoadState('networkidle');
  await expect(picker(page)).toBeVisible();
}

test.describe('snippet picker', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');

  test('the picker replaces the index table: two groups of radios, one status line', async ({ page }) => {
    await ready(page);
    await expect(picker(page).getByRole('group', { name: 'What are you building?' })).toBeVisible();
    await expect(picker(page).getByRole('group', { name: 'How do you load it?' })).toBeVisible();
    await expect(picker(page).getByRole('radio')).toHaveCount(KINDS.length + VIAS.length);
    await expect(page.locator('[role="region"][aria-label="Every snippet"]')).toBeHidden();
    // A single picker, cloned from the template once
    await expect(page.locator('form.docs-picker')).toHaveCount(1);
  });

  test('before any choice, the first radios are checked and only Components only with npm shows', async ({ page }) => {
    await ready(page);
    await expect(radio(page, KIND_LABEL.atoms)).toBeChecked();
    await expect(radio(page, VIA_LABEL.npm)).toBeChecked();
    expect(await shownSnippets(page)).toEqual(['atoms-npm']);
    expect(await shownSections(page)).toEqual(['atoms']);
  });

  test('Landing page and CDN show only #landing-cdn, and a section with nothing to show is hidden', async ({ page }) => {
    await ready(page);
    await choose(page, 'landing', 'cdn');
    expect(await shownSnippets(page)).toEqual(['landing-cdn']);
    expect(await shownSections(page)).toEqual(['landing']);
    await expect(page.locator('#landing-cdn')).toBeVisible();
    await expect(page.locator('#landing-npm')).toBeHidden();
    // The snippet is whole: its code and its copy button are shown with it
    await expect(page.locator('#code-landing-cdn')).toBeVisible();
    await expect(page.locator('#landing-cdn .luz-copy-btn')).toBeVisible();
  });

  for (const kind of KINDS) {
    for (const via of VIAS) {
      test(`${kind} and ${via}: exactly #${kind}-${via} shows`, async ({ page }) => {
        await ready(page);
        await choose(page, kind, via);
        expect(await shownSnippets(page)).toEqual([`${kind}-${via}`]);
        expect(await shownSections(page)).toEqual([kind]);
      });
    }
  }

  test('the choice is the URL: location.hash is the id, and history gains no entry', async ({ page }) => {
    await ready(page);
    const before = await page.evaluate(() => window.history.length);
    await choose(page, 'landing', 'cdn');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#landing-cdn');
    expect(await page.evaluate(() => window.history.length), 'replaceState, not pushState').toBe(before);
  });

  test('the status line is the text of the shown h3, taken from the markup', async ({ page }) => {
    await ready(page);
    await choose(page, 'landing', 'cdn');
    const heading = (await page.locator('#landing-cdn h3').textContent()).trim();
    expect(heading).toContain('Landing page');
    await expect(status(page)).toHaveText(heading);
    await choose(page, 'blog', 'npm');
    await expect(status(page)).toHaveText((await page.locator('#blog-npm h3').textContent()).trim());
  });

  test('the arrow keys inside a group change the content (native radios, no Show button)', async ({ page }) => {
    await ready(page);
    await radio(page, KIND_LABEL.atoms).focus();
    await page.keyboard.press('ArrowDown');
    await expect(radio(page, KIND_LABEL.landing)).toBeChecked();
    await expect(radio(page, KIND_LABEL.landing)).toBeFocused();
    expect(await shownSnippets(page)).toEqual(['landing-npm']);
    await radio(page, VIA_LABEL.npm).focus();
    await page.keyboard.press('ArrowDown');
    await expect(radio(page, VIA_LABEL.cdn)).toBeChecked();
    expect(await shownSnippets(page)).toEqual(['landing-cdn']);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#landing-cdn');
  });

  test('Tab goes from the kind radios to the way radios to the shown snippet\'s copy button', async ({ page }) => {
    await ready(page);
    await choose(page, 'landing', 'cdn');
    await radio(page, KIND_LABEL.landing).focus();
    await page.keyboard.press('Tab');
    await expect(radio(page, VIA_LABEL.cdn)).toBeFocused();
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return { cls: el?.className ?? '', inside: el?.closest('[data-snippet]')?.id ?? null, tag: el?.tagName };
    });
    expect(focused.tag).toBe('BUTTON');
    expect(focused.cls).toContain('luz-copy-btn');
    expect(focused.inside, 'the copy button of the shown snippet').toBe('landing-cdn');
  });

  test('loading with #blog-npm checks Blog or newspaper and npm and shows only that snippet', async ({ page }) => {
    await ready(page, '#blog-npm');
    await expect(radio(page, KIND_LABEL.blog)).toBeChecked();
    await expect(radio(page, VIA_LABEL.npm)).toBeChecked();
    expect(await shownSnippets(page)).toEqual(['blog-npm']);
    await expect(status(page)).toHaveText((await page.locator('#blog-npm h3').textContent()).trim());
  });

  test('reloading after a choice selects the same one', async ({ page }) => {
    await ready(page);
    await choose(page, 'app', 'cdn');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#app-cdn');
    await page.reload();
    await expect(picker(page)).toBeVisible();
    await expect(radio(page, KIND_LABEL.app)).toBeChecked();
    await expect(radio(page, VIA_LABEL.cdn)).toBeChecked();
    expect(await shownSnippets(page)).toEqual(['app-cdn']);
  });

  test('a hashchange to another snippet selects it, as a pasted or followed link would', async ({ page }) => {
    await ready(page);
    await page.evaluate(() => {
      location.hash = '#app-cdn';
    });
    await expect(radio(page, KIND_LABEL.app)).toBeChecked();
    await expect(radio(page, VIA_LABEL.cdn)).toBeChecked();
    expect(await shownSnippets(page)).toEqual(['app-cdn']);
    await expect(status(page)).toHaveText((await page.locator('#app-cdn h3').textContent()).trim());
    // And back: Back and Forward work on a hashchange
    await page.evaluate(() => {
      location.hash = '#atoms-npm';
    });
    expect(await shownSnippets(page)).toEqual(['atoms-npm']);
  });

  test('a hash that is not a snippet changes nothing', async ({ page }) => {
    await ready(page);
    await choose(page, 'landing', 'cdn');
    await page.evaluate(() => {
      location.hash = '#verify';
    });
    expect(await shownSnippets(page)).toEqual(['landing-cdn']);
    await expect(radio(page, KIND_LABEL.landing)).toBeChecked();
  });

  test('the choice is not stored: no storage key appears', async ({ page }) => {
    await ready(page);
    const keys = () => page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage), document.cookie]);
    const before = await keys();
    await choose(page, 'blog', 'cdn');
    expect(await keys()).toEqual(before);
  });

  for (const theme of THEMES) {
    test(`axe: the picker with a snippet chosen, in ${theme}`, async ({ page }) => {
      await ready(page);
      await choose(page, 'landing', 'cdn');
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(
        blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target?.join(' ')}`),
        'serious/critical axe violations',
      ).toEqual([]);
    });
  }
});

test.describe('snippet picker without JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled !== false, 'the no-JS project only');

  test('there is no form: the picker is a template, and nothing is hidden', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('form.docs-picker')).toHaveCount(0);
    await expect(page.locator('main input[type="radio"]')).toHaveCount(0);
    await expect(page.locator('main output')).toHaveCount(0);
    await expect(page.locator('template[data-docs-picker]')).toHaveCount(1);
    await expect(page.locator('main [hidden]')).toHaveCount(0);
  });

  test('the index table and the eight snippets are all visible', async ({ page }) => {
    await page.goto(ROUTE);
    const table = page.locator('[role="region"][aria-label="Every snippet"] table.luz-table');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(KINDS.length);
    await expect(page.locator('[data-snippet]')).toHaveCount(IDS.length);
    for (const id of IDS) {
      await expect(page.locator(`#${id}[data-snippet]`)).toBeVisible();
      await expect(page.locator(`#${id} h3`)).toBeVisible();
      await expect(page.locator(`#code-${id}`)).toBeVisible();
    }
    for (const kind of KINDS) await expect(page.locator(`[data-snippet-kind="${kind}"]`)).toBeVisible();
  });

  test('every link of the table lands on a visible snippet', async ({ page }) => {
    // No smooth scrolling: a link is clicked again while the page is still moving otherwise
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTE);
    const hrefs = await page.locator('[role="region"][aria-label="Every snippet"] table a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(IDS.map((id) => `#${id}`));
    for (const href of hrefs) {
      await page.locator(`[role="region"][aria-label="Every snippet"] table a[href="${href}"]`).click();
      const target = page.locator(href);
      await expect(target, href).toBeVisible();
      await expect(target, href).toBeInViewport();
    }
  });

  test('no copy button is shown dead (it needs JavaScript)', async ({ page }) => {
    await page.goto(ROUTE);
    const shown = await page.locator('.luz-copy-btn').evaluateAll((all) => all.filter((el) => el.checkVisibility({ visibilityProperty: true })).length);
    expect(shown).toBe(0);
  });
});
