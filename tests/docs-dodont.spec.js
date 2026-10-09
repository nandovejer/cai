/**
 * CAI — the Do and don't examples of the Design tab (a11y.md TAB-20, HUB-2).
 * Each example is live CAI markup inside a stage with `inert` and
 * `aria-hidden="true"`, captioned by a figcaption that starts with the verdict.
 * The stage is a picture: nothing in it takes focus or reaches the
 * accessibility tree, so the figure is announced by its caption alone. It is
 * still seen, so its text and parts keep the contrast of the page: axe skips
 * hidden content, so it is measured here with the stage exposed.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routesWith } from './helpers/docs-site.js';

const DESIGN = routesWith('docs-dodont__stage');
const THEMES = ['light', 'dark', 'high-contrast'];

for (const route of DESIGN) {
  test(`${route}: the Do and don't examples are captioned pictures`, async ({ page }) => {
    await page.goto(`${route}#design`);
    await expect(page.locator('#design-panel')).toBeVisible();
    const figures = page.locator('#do-dont + .docs-dodont > figure');
    await expect(figures).toHaveCount(2);

    // Every stage is inert and hidden; an id in it (a label's for) is used
    // inside that stage only, so nothing outside points into a picture
    const stages = page.locator('.docs-dodont__stage');
    for (const stage of await stages.all()) {
      await expect(stage).toHaveAttribute('inert', '');
      await expect(stage).toHaveAttribute('aria-hidden', 'true');
    }
    const outsideRefs = await stages.evaluateAll((list) =>
      list.flatMap((stage) => [...stage.querySelectorAll('[id]')].flatMap(({ id }) =>
        [...document.querySelectorAll(`[href="#${id}"], [for="${id}"], [aria-labelledby~="${id}"], [aria-describedby~="${id}"], [aria-controls~="${id}"], [commandfor="${id}"], [popovertarget="${id}"]`)]
          .filter((el) => !stage.contains(el))
          .map((el) => `${id} ← ${el.outerHTML.slice(0, 60)}`))));
    expect(outsideRefs).toEqual([]);

    // In the accessibility tree the figure holds its caption and nothing else:
    // the verdict first, as a word (the ✓ / ✕ is CSS with empty alt text)
    for (const [i, verdict] of [[0, 'Do'], [1, "Don't"]]) {
      const figure = figures.nth(i);
      const [head, ...inside] = (await figure.ariaSnapshot()).split('\n');
      expect(head, route).toMatch(/^- '?figure\b/);
      const caption = await figure.locator(':scope > figcaption').ariaSnapshot();
      expect(inside.map((l) => l.replace(/^ {2}/, '')).join('\n'), route).toBe(caption);
      expect(caption.split('\n')[0], route).toBe(`- strong: ${verdict}`);
    }

    // Nothing in a stage takes focus, by script or by Tab
    const focusable = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable], audio[controls], video[controls], iframe';
    const reached = await page.locator('.docs-dodont__stage').evaluateAll((list, sel) => {
      const hits = [];
      for (const stage of list) for (const el of stage.querySelectorAll(sel)) {
        el.focus();
        if (document.activeElement === el) hits.push(el.outerHTML.slice(0, 80));
      }
      return hits;
    }, focusable);
    expect(reached).toEqual([]);
    // Tab from the section heading (a click sets the starting point) until focus
    // passes the next heading: it never stops in a stage
    await page.locator('#do-dont').click();
    let passed = false;
    for (let i = 0; i < 40 && !passed; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const a = document.activeElement;
        const next = document.getElementById('content');
        return {
          inStage: !!a?.closest('.docs-dodont__stage'),
          passed: !!(next.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING),
        };
      });
      expect(where.inStage, route).toBe(false);
      passed = where.passed;
    }
    expect(passed, `${route}: Tab left the section`).toBe(true);
  });

  for (const theme of THEMES) {
    test(`${route}: the Do and don't examples keep the page's contrast in ${theme}`, async ({ page }) => {
      await page.goto(`${route}#design`);
      await expect(page.locator('#design-panel')).toBeVisible();
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        // axe skips hidden content: expose the stages to measure what is seen
        for (const s of document.querySelectorAll('.docs-dodont__stage')) {
          s.removeAttribute('aria-hidden');
          s.removeAttribute('inert');
        }
      }, theme);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page })
        .include('.docs-dodont')
        .withRules(['color-contrast', 'link-in-text-block'])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message ?? ''}`).join('; ')}`)).toEqual([]);
    });
  }
}
