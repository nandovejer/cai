/**
 * CAI — user preferences (PRINCIPLES.md §6): reduced motion and forced colors.
 */
import { test, expect } from '@playwright/test';

test.describe('prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const app of ['/', '/docs/']) {
    test(`${app}: no transition, animation or smooth scroll runs (RL-8)`, async ({ page }) => {
      await page.goto(app);
      const moving = await page.evaluate(() => {
        const seconds = (v) => v.split(',').map((x) => parseFloat(x) * (x.trim().endsWith('ms') ? 0.001 : 1));
        const offenders = [];
        for (const el of [document.documentElement, ...document.querySelectorAll('body, body *')]) {
          const s = getComputedStyle(el);
          if (s.scrollBehavior === 'smooth') offenders.push(`${el.tagName.toLowerCase()} scroll-behavior: smooth`);
          const t = Math.max(...seconds(s.transitionDuration));
          const a = s.animationName !== 'none' ? Math.max(...seconds(s.animationDuration)) : 0;
          if (t > 0.001 || a > 0.001) {
            offenders.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} t=${t} a=${a}`);
          }
        }
        return offenders.slice(0, 10);
      });
      expect(moving).toEqual([]);
    });
  }
});

test.describe('forced-colors: active', () => {
  test.use({ forcedColors: 'active' });

  test('/docs/: a focused button keeps a visible outline', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced-colors');
    await page.goto('/docs/');
    const btn = page.locator('button.cai-btn, .cai-copy-btn').first();
    await btn.focus();
    const outline = await btn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
  });
});

test.describe('forced-colors: the color mode switcher', () => {
  test.use({ forcedColors: 'active' });

  for (const app of ['/', '/docs/']) {
    test(`${app}: the cycle button keeps a visible edge and a visible icon`, async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'WebKit does not emulate forced-colors');
      await page.goto(app);
      const button = page.locator('footer .cai-mode-cycle');
      await expect(button).toBeVisible();
      const style = await button.evaluate((el) => {
        const s = getComputedStyle(el);
        const icon = el.querySelector('svg');
        return { border: s.borderTopStyle, width: parseFloat(s.borderTopWidth), icon: icon?.getBoundingClientRect().width ?? 0 };
      });
      expect(style.border).toBe('solid');
      expect(style.width).toBeGreaterThanOrEqual(1);
      expect(style.icon).toBeGreaterThan(0);
    });
  }
});

test.describe('forced-colors: the color mode switcher without JavaScript', () => {
  test.use({ forcedColors: 'active', javaScriptEnabled: false });

  test('/: the checked mode stays visible', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced-colors');
    await page.goto('/');
    const styles = await page.locator('footer .cai-mode-btn').evaluateAll((labels) =>
      labels.map((el) => ({
        checked: el.querySelector('input').checked,
        visible: el.checkVisibility(),
        background: getComputedStyle(el).backgroundColor,
        border: parseFloat(getComputedStyle(el).borderTopWidth),
      })),
    );
    expect(styles.every((s) => s.visible)).toBe(true);
    const [checked] = styles.filter((s) => s.checked);
    const others = styles.filter((s) => !s.checked);
    // The checked option has a system highlight and a thicker border
    for (const other of others) {
      expect(checked.background).not.toBe(other.background);
      expect(checked.border).toBeGreaterThan(other.border);
    }
  });
});
