// @ts-check
/**
 * Mode switcher, cycle variant (.cai-mode-switcher--cycle): one button
 * that steps through the radios with JavaScript, the radios without it.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/tests/fixtures/mode-cycle.html';

test.describe('Mode switcher, cycle variant', () => {
  test('one named button replaces the three radios', async ({ page }) => {
    await page.goto(FIXTURE);
    const button = page.locator('.cai-mode-cycle');
    await expect(button).toHaveCount(1);
    await expect(button).toHaveAccessibleName('Change color mode. Current: Light');
    await expect(page.locator('.cai-mode-btn').first()).toBeHidden();
    await expect(button.locator('[data-icon="sun"]')).toHaveCount(1);
  });

  test('each press checks the next mode, wraps around and announces it', async ({ page }) => {
    await page.goto(FIXTURE);
    const button = page.locator('.cai-mode-cycle');
    const status = page.locator('.cai-mode-cycle__status');
    const steps = [
      ['dark', 'Dark', 'moon'],
      ['high-contrast', 'High contrast', 'contrast'],
      ['light', 'Light', 'sun'],
    ];
    for (const [value, label, icon] of steps) {
      await button.click();
      await expect(page.locator(`input[value="${value}"]`)).toBeChecked();
      await expect(button).toHaveAccessibleName(`Change color mode. Current: ${label}`);
      await expect(button.locator(`[data-icon="${icon}"]`)).toHaveCount(1);
      await expect(status).toHaveText(`Color mode: ${label}`);
    }
  });

  test('the checked radio re-scopes the page tokens', async ({ page }) => {
    await page.goto(FIXTURE);
    const bg = () => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--cai-surface-page').trim());
    const light = await bg();
    await page.locator('.cai-mode-cycle').click();
    expect(await bg()).not.toBe(light);
  });

  test('works from the keyboard', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.keyboard.press('Tab');
    await expect(page.locator('.cai-mode-cycle')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('input[value="dark"]')).toBeChecked();
    await page.keyboard.press('Space');
    await expect(page.locator('input[value="high-contrast"]')).toBeChecked();
  });

  test('follows a mode set by another script', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => {
      document.querySelector('input[value="dark"]').checked = true;
      document.documentElement.dataset.theme = 'dark';
    });
    await expect(page.locator('.cai-mode-cycle')).toHaveAccessibleName('Change color mode. Current: Dark');
  });

  test('init twice adds one button', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(async () => (await import('/packages/core/dist/theme.js')).initThemeCycle());
    await expect(page.locator('.cai-mode-cycle')).toHaveCount(1);
  });

  test('a button already in the markup is wired, and gets a status if it has none', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(async () => {
      const group = document.querySelector('.cai-mode-switcher--cycle').cloneNode(true);
      group.querySelector('.cai-mode-cycle__status').remove();
      group.querySelectorAll('input').forEach((input) => { input.name = 'other'; });
      group.id = 'shipped';
      document.querySelector('main').append(group);
      (await import('/packages/core/dist/theme.js')).initThemeCycle();
    });
    const group = page.locator('#shipped');
    await expect(group.locator('.cai-mode-cycle')).toHaveCount(1);
    await expect(group.locator('.cai-mode-cycle__status')).toHaveCount(1);
    await group.locator('.cai-mode-cycle').click();
    await expect(group.locator('input[value="dark"]')).toBeChecked();
    await expect(group.locator('.cai-mode-cycle__status')).toHaveText('Color mode: Dark');
  });

  test('has no axe violations', async ({ page }) => {
    await page.goto(FIXTURE);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  });
});

test.describe('Mode switcher, cycle variant, without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the three radios stay usable', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.locator('.cai-mode-cycle')).toHaveCount(0);
    await expect(page.locator('.cai-mode-btn')).toHaveCount(3);
    await page.locator('label.cai-mode-btn', { hasText: 'Dark' }).click();
    await expect(page.locator('input[value="dark"]')).toBeChecked();
  });
});
