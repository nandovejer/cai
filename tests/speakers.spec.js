// @ts-check
/**
 * The speakers block of Page templates (.claude/plans/specs/speakers-block.md):
 * a `ul.o-grid--auto` of `li.luz-card`, each a square image frame, an h3 and
 * a role. The page shows it as a snippet, so the test renders the snippet's
 * markup (the text of its <code>) inside the page, where the site's CSS styles
 * it, and checks what the spec asks for:
 *  - one h3 for each speaker, under the h2 of the section;
 *  - a photo with `alt=""`, or an alt that is not the heading beside it
 *    (never the same name twice: technique H67);
 *  - the frames are square, the page does not scroll sideways at 320 px, with
 *    text at 200 % and with the text-spacing overrides of WCAG 1.4.12;
 *  - the list keeps its list role in the accessibility tree (Chromium).
 * Runs in `chromium`; the block is HTML and CSS only.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/landing/templates/';

/** Add a rule to the page. addStyleTag needs script, and this test also runs without it. */
const style = (page, css) => page.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

/** Render the snippet at the end of <main>, at `width`, and wait for the frames. */
async function render(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(PAGE);
  await page.evaluate(() => {
    const markup = document.getElementById('code-tpl-speakers').textContent;
    const host = document.createElement('div');
    host.id = 'speakers-test';
    host.innerHTML = markup;
    document.querySelector('main').append(host);
  });
  await page.waitForTimeout(150);
}

test.describe('speakers block', () => {
  test('each speaker has one h3 under the section h2, and no alt repeats the name beside it', async ({ page }) => {
    await render(page, 1280);
    const block = page.locator('#speakers-test section');
    await expect(block.locator('h2')).toHaveCount(1);
    await expect(block).toHaveAttribute('aria-labelledby', 'speakers-title');
    const cards = block.locator('ul > li.luz-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await expect(card.locator('h3.luz-card__title')).toHaveCount(1);
      await expect(card.locator('.luz-card__body')).toHaveCount(1);
      const heading = ((await card.locator('h3').textContent()) ?? '').trim();
      for (const alt of await card.locator('img').evaluateAll((list) => list.map((img) => img.getAttribute('alt')))) {
        expect(alt, `speaker ${i + 1}: img without alt`).not.toBeNull();
        expect(alt?.trim().toLowerCase(), `speaker ${i + 1}: alt repeats "${heading}"`).not.toBe(heading.toLowerCase());
      }
    }
  });

  test('no photo on the templates page repeats the heading beside it', async ({ page }) => {
    // The templates page itself: a photo whose alt is the text of the heading beside it is a defect
    await page.goto(PAGE);
    const repeats = await page.evaluate(() =>
      [...document.querySelectorAll('img[alt]:not([alt=""])')].flatMap((img) => {
        const scope = img.closest('li, article, figure, section');
        const heading = scope?.querySelector('h1, h2, h3, h4, h5, h6, figcaption')?.textContent.trim().toLowerCase();
        return heading && img.alt.trim().toLowerCase() === heading ? [img.alt] : [];
      }),
    );
    expect(repeats).toEqual([]);
  });

  for (const width of [320, 1280]) {
    test(`at ${width} px the frames are square and the page does not scroll sideways`, async ({ page }) => {
      await render(page, width);
      const frames = page.locator('#speakers-test .luz-image--1x1');
      const boxes = await frames.evaluateAll((list) => list.map((el) => el.getBoundingClientRect()).map((r) => [r.width, r.height]));
      expect(boxes.length).toBeGreaterThanOrEqual(2);
      for (const [w, h] of boxes) {
        expect(w).toBeGreaterThan(0);
        expect(Math.abs(w - h), `${w} x ${h}`).toBeLessThanOrEqual(1);
      }
      // 320 px: one column; 1280 px: more than one
      const lefts = await page.locator('#speakers-test li.luz-card').evaluateAll((list) => list.map((el) => Math.round(el.getBoundingClientRect().left)));
      if (width === 320) expect(new Set(lefts).size).toBe(1);
      else expect(new Set(lefts).size).toBeGreaterThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }

  test('at 320 px with 200 % text and the WCAG 1.4.12 text spacing the block stays inside the window', async ({ page }) => {
    await render(page, 320);
    await style(page, 'html { font-size: 200% } #speakers-test * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }');
    await page.waitForTimeout(100);
    // The block, not the docs chrome around it (the docs header has its own 200 % limits)
    const out = await page.evaluate(() => {
      const host = document.getElementById('speakers-test');
      const edge = document.documentElement.clientWidth;
      return {
        scroll: host.scrollWidth - host.clientWidth,
        beyond: [...host.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > edge + 0.5).map((el) => el.tagName),
      };
    });
    expect(out.scroll).toBeLessThanOrEqual(0);
    expect(out.beyond).toEqual([]);
  });

  test('the list and its items stay in the accessibility tree, the photo does not', async ({ page }) => {
    await render(page, 1280);
    const tree = await page.locator('#speakers-test section').ariaSnapshot();
    expect(tree).toContain('heading "Speakers" [level=2]');
    expect(tree).toContain('heading "Marta Ríos" [level=3]');
    expect(tree).not.toContain('img');
    expect(tree).toMatch(/- list/);
  });
});
