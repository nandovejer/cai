/**
 * CAI Design System — Adoption level smoke tests
 * Each fixture loads only the dist/ files a consumer of that level would:
 * tokens only, tokens + core, tokens + core + platform.
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';

/** Load a fixture and collect failed requests and console warnings. */
async function open(page, fixture) {
  const failed = [];
  const warnings = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(res.url());
  });
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') warnings.push(msg.text());
  });
  await page.goto(`/tests/fixtures/${fixture}`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  return { failed, warnings };
}

const cssVar = (page, name) =>
  page.evaluate(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );

test.describe('Adoption levels', () => {
  test('level 1: tokens work standalone and load their fonts', async ({ page }) => {
    const { failed, warnings } = await open(page, 'level-1-tokens.html');

    expect(failed).toEqual([]);
    expect(warnings).toEqual([]);
    expect(await cssVar(page, '--cai-surface-page')).not.toBe('');
    // Core-only settings must not leak into the tokens layer
    expect(await cssVar(page, '--cai-z-modal')).toBe('');
    // The one bundled font (ET Book) is declared and its file loads
    const etBookLoaded = await page.evaluate(() =>
      document.fonts
        .load('16px "ET Book"')
        .then((faces) => faces.length > 0 && faces.every((face) => face.status === 'loaded')),
    );
    expect(etBookLoaded).toBe(true);
  });

  test('level 2: tokens + core', async ({ page }) => {
    const { failed, warnings } = await open(page, 'level-2-core.html');

    expect(failed).toEqual([]);
    expect(warnings).toEqual([]);
    expect(await cssVar(page, '--cai-z-modal')).not.toBe('');
    const background = await page
      .locator('#probe')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('level 2: core leaves consumer markup alone', async ({ page }) => {
    await open(page, 'level-2-core.html');

    await page.keyboard.press('Escape');
    expect(await page.locator('details').evaluate((el) => el.open)).toBe(true);
  });

  test('level 3: tokens + core + platform', async ({ page }) => {
    const { failed, warnings } = await open(page, 'level-3-platform.html');

    expect(failed).toEqual([]);
    expect(warnings).toEqual([]);
    const maxWidth = await page
      .locator('#probe')
      .evaluate((el) => getComputedStyle(el).maxWidth);
    expect(maxWidth).not.toBe('none');
  });

  test('core without tokens warns about the missing layer', async ({ page }) => {
    const { warnings } = await open(page, 'core-without-tokens.html');

    expect(warnings.some((w) => w.includes('@cai-ds/tokens is not loaded'))).toBe(true);
  });
});
