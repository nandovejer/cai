// @ts-check
/**
 * The tooltip's anchor positioning is an enhancement (tooltip.css, inside
 * @supports): with it a tooltip flips below its trigger when there is no room
 * above; without it the component is what it was. The second state is made
 * here by removing the @supports rule from the CSSOM, as a browser without
 * the feature would see the page.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/tooltip-anchor.html';

/** Drop every @supports rule that names anchor-name (what an old browser ignores). */
const withoutAnchors = (page) =>
  page.evaluate(() => {
    let removed = 0;
    const walk = (sheet) => {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        return;
      }
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (rule instanceof window.CSSSupportsRule && rule.conditionText.includes('anchor-name')) {
          sheet.deleteRule(i);
          removed++;
        } else if (rule instanceof window.CSSLayerBlockRule) {
          // The component is inside @layer luz.components
          for (let j = rule.cssRules.length - 1; j >= 0; j--) {
            const inner = rule.cssRules[j];
            if (inner instanceof window.CSSSupportsRule && inner.conditionText.includes('anchor-name')) {
              rule.deleteRule(j);
              removed++;
            }
          }
        }
      }
    };
    for (const sheet of document.styleSheets) walk(sheet);
    return removed;
  });

/** Show a tooltip and return its box and its trigger's. */
async function open(page, name) {
  await page.locator(`#trigger-${name}`).focus();
  await page.waitForTimeout(250);
  return page.evaluate((n) => {
    const box = (id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, center: (r.left + r.right) / 2 };
    };
    return { tip: box(`tip-${n}`), trigger: box(`trigger-${n}`) };
  }, name);
}

test.describe('tooltip anchor positioning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
  });

  test('is supported here, or the other tests say nothing', async ({ page }) => {
    expect(await page.evaluate(() => window.CSS.supports('anchor-name', '--x') && window.CSS.supports('inset-block-end', 'anchor(start)'))).toBe(true);
  });

  test('with room above, the tooltip sits above its trigger, centred', async ({ page }) => {
    const { tip, trigger } = await open(page, 'middle');
    expect(tip.bottom).toBeLessThanOrEqual(trigger.top);
    // Next to its own trigger, not to another one on the page (Firefox 147+
    // anchored every tip to the last trigger before anchor-scope)
    expect(trigger.top - tip.bottom).toBeLessThanOrEqual(12);
    expect(Math.abs(tip.center - trigger.center)).toBeLessThanOrEqual(1);
  });

  test('at the top of the screen, it flips below the trigger and stays in view', async ({ page }) => {
    const { tip, trigger } = await open(page, 'top');
    expect(tip.top).toBeGreaterThanOrEqual(trigger.bottom);
    expect(tip.top - trigger.bottom).toBeLessThanOrEqual(12);
    expect(tip.top).toBeGreaterThanOrEqual(0);
    expect(Math.abs(tip.center - trigger.center)).toBeLessThanOrEqual(1);
  });

  test('right-to-left: still centred, above or below', async ({ page }) => {
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    for (const name of ['middle', 'top']) {
      const { tip, trigger } = await open(page, name);
      expect(Math.abs(tip.center - trigger.center), name).toBeLessThanOrEqual(1);
    }
  });

  test('right-to-left on a container, not on the page: still beside its own trigger', async ({ page }) => {
    await page.evaluate(() => document.querySelectorAll('.row').forEach((row) => row.setAttribute('dir', 'rtl')));
    for (const name of ['middle', 'top']) {
      const { tip, trigger } = await open(page, name);
      expect(Math.abs(tip.center - trigger.center), name).toBeLessThanOrEqual(1);
      expect(Math.min(Math.abs(tip.top - trigger.bottom), Math.abs(trigger.top - tip.bottom)), name).toBeLessThanOrEqual(12);
    }
  });

  test('without the feature: above and centred as before, and clipped at the top', async ({ page }) => {
    expect(await withoutAnchors(page)).toBeGreaterThan(0);
    const middle = await open(page, 'middle');
    expect(middle.tip.bottom).toBeLessThanOrEqual(middle.trigger.top);
    expect(Math.abs(middle.tip.center - middle.trigger.center)).toBeLessThanOrEqual(1);
    // The unenhanced component does not flip: it is above the screen's edge
    const top = await open(page, 'top');
    expect(top.tip.top).toBeLessThan(0);
  });

  test('the pointer can cross the gap on both sides (hoverable, WCAG 1.4.13)', async ({ page }) => {
    // The bridges are pseudo-elements of the tooltip, one on each side
    const sides = await page.evaluate(() => {
      const el = document.getElementById('tip-top');
      const gap = (p) => getComputedStyle(el, p).content;
      return { before: gap('::before'), after: gap('::after') };
    });
    expect(sides.before).not.toBe('none');
    expect(sides.after).not.toBe('none');
  });
});
