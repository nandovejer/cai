// @ts-check
/**
 * Avatar with a photo (.claude/plans/specs/speakers-block.md, part B, and its
 * accessibility review A1, A2). Runs in `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import { near, readPoints } from './helpers/pixels.js';

const PAGE = '/docs/components/avatar/';
const EXAMPLE = '#example ~ .docs-example';

test.describe('avatar with a photo', () => {
  test('the image fills the box and takes its corners; the box does not clip (A1)', async ({ page }) => {
    await page.goto(PAGE);
    const sizes = await page.locator(`${EXAMPLE} .cai-avatar:has(img)`).evaluateAll((list) =>
      list.map((a) => {
        const img = a.querySelector('img');
        const [box, image] = [a.getBoundingClientRect(), img.getBoundingClientRect()];
        const s = getComputedStyle(a);
        return {
          same: Math.abs(box.width - image.width) < 0.5 && Math.abs(box.height - image.height) < 0.5,
          square: Math.abs(box.width - box.height) < 0.5,
          overflow: s.overflow,
          fit: getComputedStyle(img).objectFit,
          radius: getComputedStyle(img).borderTopLeftRadius,
          boxRadius: s.borderTopLeftRadius,
        };
      }));
    expect(sizes).toHaveLength(3);
    for (const s of sizes) {
      expect(s.same).toBe(true);
      expect(s.square).toBe(true);
      expect(s.overflow).toBe('visible');
      expect(s.fit).toBe('cover');
      expect(s.radius).not.toBe('0px');
      expect(s.radius).toBe(s.boxRadius);
    }
  });

  test('the corner of the box is the page, not the photo', async ({ page }) => {
    await page.goto(PAGE);
    const avatar = page.locator(`${EXAMPLE} .cai-avatar--lg:has(img)`);
    await avatar.scrollIntoViewIfNeeded();
    const box = await avatar.boundingBox();
    const clip = { x: Math.floor(box.x) - 4, y: Math.floor(box.y) - 4, width: Math.ceil(box.width) + 8, height: Math.ceil(box.height) + 8 };
    const png = await page.screenshot({ clip });
    // The box corner and a pixel well outside it; the middle of the photo
    const [corner, outside, middle] = await readPoints(page, png, [[4, 4], [1, 1], [Math.floor(clip.width / 2), Math.floor(clip.height / 2)]]);
    expect(near(corner, outside, 8), 'rounded: the corner pixel is the background').toBe(true);
    expect(near(middle, outside, 8), 'the photo is not the background').toBe(false);
  });

  test('initials are not cut at 200 % text in any size (A1)', async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const cut = await page.locator(`${EXAMPLE} .cai-avatar`).evaluateAll((list) =>
      list.filter((a) => a.textContent.trim()).map((a) => {
        const range = document.createRange();
        range.selectNodeContents(a);
        return { wider: range.getBoundingClientRect().width > a.getBoundingClientRect().width + 0.5, overflow: getComputedStyle(a).overflow };
      }));
    expect(cut.length).toBe(3);
    // Either the text fits, or nothing clips it
    for (const c of cut) expect(!c.wider || c.overflow !== 'hidden').toBe(true);
  });

  test('every photo of the page has an alt, empty or the person (A2)', async ({ page }) => {
    await page.goto(PAGE);
    const alts = await page.locator(`${EXAMPLE} .cai-avatar img`).evaluateAll((list) => list.map((i) => i.getAttribute('alt')));
    expect(alts).toEqual(['Ana Belén', 'Carlos Díaz', 'Eva Flores']);
    // Next to a name an avatar is decoration: the photo has an empty alt there
    await expect(page.locator(`${EXAMPLE} .cai-avatar:has(img)`).first()).not.toHaveAttribute('role', /.*/);
    await expect(page.locator(`${EXAMPLE} .cai-avatar:has(img)`).first()).not.toHaveAttribute('aria-label', /.*/);
  });
});
