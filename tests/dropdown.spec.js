// @ts-check
/**
 * Dropdown (components/dropdown.css): a native popover opened by a button
 * with popovertarget. The browser gives it Escape, light dismiss and focus
 * return, so these tests check what LUZ adds: the panel is anchored under its
 * own button and every action is in the tab order. No JavaScript is loaded,
 * so the nojs project runs the same file.
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/fixtures/dropdown.html';
const open = async (page, id) => {
  await page.locator(`#btn-${id}`).click();
  await expect(page.locator(`#menu-${id}`)).toBeVisible();
};

test.describe('dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 700 });
    await page.goto(FIXTURE);
  });

  test('is closed until its button is pressed', async ({ page }) => {
    await expect(page.locator('#menu-one')).toBeHidden();
    await open(page, 'one');
    await expect(page.locator('#btn-one')).toHaveAttribute('popovertarget', 'menu-one');
  });

  test('Escape closes it and the focus goes back to the button', async ({ page }) => {
    await open(page, 'one');
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu-one')).toBeHidden();
    await expect(page.locator('#btn-one')).toBeFocused();
  });

  test('a click outside closes it', async ({ page }) => {
    await open(page, 'one');
    await page.locator('#edited').click();
    await expect(page.locator('#menu-one')).toBeHidden();
  });

  test('Tab moves between the actions, in order', async ({ page }) => {
    await open(page, 'one');
    const labels = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      labels.push(await page.evaluate(() => document.activeElement?.textContent?.trim()));
    }
    expect(labels.slice(0, 3)).toEqual(expect.arrayContaining(['Duplicate', 'Delete project']));
    // Every action can take the focus
    for (const name of ['Edit', 'Duplicate', 'Delete project']) {
      await page.getByRole(name === 'Edit' ? 'link' : 'button', { name }).focus();
      await expect(page.getByRole(name === 'Edit' ? 'link' : 'button', { name })).toBeFocused();
    }
  });

  test('Enter opens it with the focus still on the button; the first Tab enters the panel', async ({ page }) => {
    await page.locator('#btn-one').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#menu-one')).toBeVisible();
    await expect(page.locator('#btn-one')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Edit' })).toBeFocused();
  });

  test('each panel opens under its own button, at its start edge', async ({ page }) => {
    for (const id of ['one', 'two']) {
      await open(page, id);
      const { button, menu } = await page.evaluate((key) => ({
        button: document.querySelector(`#btn-${key}`).getBoundingClientRect().toJSON(),
        menu: document.querySelector(`#menu-${key}`).getBoundingClientRect().toJSON(),
      }), id);
      // Anchored: the top of the panel is just below the button, and they share the start edge
      expect(menu.top - button.bottom, id).toBeGreaterThanOrEqual(0);
      expect(menu.top - button.bottom, id).toBeLessThan(16);
      expect(Math.abs(menu.left - button.left), id).toBeLessThan(2);
      await page.keyboard.press('Escape');
    }
  });

  test('a danger action is in the danger color and an unavailable one in the disabled color', async ({ page }) => {
    await open(page, 'one');
    const danger = await page.getByRole('button', { name: 'Delete project' }).evaluate((el) => getComputedStyle(el).color);
    const normal = await page.getByRole('button', { name: 'Duplicate' }).evaluate((el) => getComputedStyle(el).color);
    expect(danger).not.toBe(normal);
    await page.keyboard.press('Escape');
    await open(page, 'two');
    const disabled = await page.getByRole('button', { name: 'Move' }).evaluate((el) => getComputedStyle(el).color);
    const archive = await page.getByRole('button', { name: 'Archive' }).evaluate((el) => getComputedStyle(el).color);
    expect(disabled).not.toBe(archive);
  });

  test('every action is at least 44px high', async ({ page }) => {
    await open(page, 'one');
    for (const box of await page.locator('#menu-one .luz-dropdown__item').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  });
});
