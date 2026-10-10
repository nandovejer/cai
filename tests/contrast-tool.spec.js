// @ts-check
/**
 * The contrast check in the page (/docs/tokens/contrast/): the same engine as
 * `cai-tokens check-contrast`, on pasted CSS. Without JavaScript the tool is
 * not there and the page explains the command.
 */
import { test, expect } from '@playwright/test';

const ROUTE = '/docs/tokens/contrast/';

test.describe('Contrast check in the page', () => {
  test('measures the pasted overrides and names the declaration that fails', async ({ page }) => {
    await page.goto(ROUTE);
    const tool = page.locator('[data-contrast-tool]');
    await expect(tool).toBeVisible();
    await page.getByRole('button', { name: 'Check contrast' }).click();
    const result = page.locator('[data-contrast-result]');
    await expect(result).toContainText('pairs fail');
    await expect(result).toContainText('--cai-text-secondary on surface-page is 2.8:1, needs 4.5:1');
    await expect(result).toContainText('--cai-text-secondary is #999 (line 2)');
    await expect(result).toContainText('dark: --cai-focus-ring');
  });

  test('says every pair passes for a readable override', async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByLabel('Your CSS').fill(':root { --cai-text-secondary: #595959; }\n[data-theme="dark"] { --cai-text-secondary: #c9c9c9; }');
    await page.getByRole('button', { name: 'Check contrast' }).click();
    await expect(page.locator('[data-contrast-result]')).toContainText(/All \d+ pairs meet their minimum in light, dark, high-contrast/);
  });

  test('reports a color it cannot read instead of passing it', async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByLabel('Your CSS').fill(':root { --cai-text-primary: color-mix(in srgb, red, blue); }');
    await page.getByRole('button', { name: 'Check contrast' }).click();
    await expect(page.locator('[data-contrast-result]')).toContainText('was not measured');
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('hides the tool and keeps the explanation of the command', async ({ page }) => {
      await page.goto(ROUTE);
      await expect(page.locator('[data-contrast-tool]')).toBeHidden();
      await expect(page.locator('#code-contrast-run')).toContainText('npx @cai-ds/tokens check-contrast');
    });
  });
});
