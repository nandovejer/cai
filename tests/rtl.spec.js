// @ts-check
/**
 * Right-to-left text (PRINCIPLES.md section 5, SR-4): every component demo,
 * rendered with dir="rtl" on its own container, must mirror the left-to-right
 * layout and must not overflow. Runs in chromium and, with JavaScript off, in
 * chromium-nojs: the layout is CSS, not script.
 *
 * "Mirror" means: for every element that carries text or is a control, the
 * centre of its box is at W - x in right-to-left if it was at x in
 * left-to-right (W the container's width), within 2 px. A position written
 * with left or right does not mirror, and this finds it.
 *
 * Left out of the comparison: code (always left to right), SVG and canvas
 * (their drawing is not text), and inline elements inside a sentence (a run
 * of Latin text keeps its order in right-to-left text, as the bidi algorithm
 * says).
 */
import { test, expect } from '@playwright/test';
import { site } from './helpers/docs-site.js';

const SKIP_PAGES = new Set(['/docs/components/player/']);
const TOLERANCE = 2;

const pages = site.pages
  .filter((p) => p.meta.area === 'components' && p.body.includes('data-docs-specimen') && !SKIP_PAGES.has(p.route))
  .map((p) => p.route)
  .sort();

/** Measure a container in both directions inside the page. */
function measure(container) {
  const keep = (el) =>
    !el.closest('pre, code, svg, canvas, [dir="ltr"], [aria-hidden="true"], [hidden], template') &&
    getComputedStyle(el).display !== 'none' &&
    getComputedStyle(el).display !== 'contents' &&
    (el.matches('input, select, textarea, button, a, th, td, li, label, summary, img, progress, meter, output') ||
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));

  // A link inside a sentence is a run of Latin text in the bidi algorithm: it
  // keeps its order in right-to-left text, so its position is not a mirror
  const inSentence = (el) =>
    getComputedStyle(el).display === 'inline' && [...(el.parentElement?.childNodes ?? [])].some((n) => n.nodeType === 3 && n.textContent.trim());
  const elements = [...container.querySelectorAll('*')].filter((el) => keep(el) && !inSentence(el));
  const read = () => {
    const box = container.getBoundingClientRect();
    return elements.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - box.left, width: r.width, height: r.height };
    });
  };

  const previous = container.getAttribute('dir');
  container.setAttribute('dir', 'ltr');
  const ltr = read();
  const width = container.getBoundingClientRect().width;
  container.setAttribute('dir', 'rtl');
  const rtl = read();
  const overflow = container.scrollWidth - container.clientWidth;
  if (previous === null) container.removeAttribute('dir');
  else container.setAttribute('dir', previous);

  const label = (el) => `${el.localName}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : ''} "${(el.textContent ?? '').trim().slice(0, 24)}"`;
  const off = [];
  elements.forEach((el, i) => {
    if (!ltr[i].width || !rtl[i].width) return;
    const centerLtr = ltr[i].left + ltr[i].width / 2;
    const centerRtl = rtl[i].left + rtl[i].width / 2;
    const expected = width - centerLtr;
    if (Math.abs(centerRtl - expected) > 2) off.push({ el: label(el), ltr: Math.round(centerLtr), rtl: Math.round(centerRtl), expected: Math.round(expected) });
  });
  return { count: elements.length, overflow, off };
}

for (const route of pages) {
  const slug = route.split('/').filter(Boolean).pop();
  test(`${slug} mirrors in right-to-left text`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const specimens = page.locator('[data-docs-specimen]');
    const n = await specimens.count();
    for (let i = 0; i < n; i++) {
      const result = await specimens.nth(i).evaluate(measure);
      expect(result.count, `${slug} has elements to compare`).toBeGreaterThan(0);
      expect(result.overflow, `${slug} overflows by ${result.overflow}px`).toBeLessThanOrEqual(1);
      expect(result.off, `${slug}: elements that did not mirror (tolerance ${TOLERANCE}px)`).toEqual([]);
    }
  });
}

test('code stays left to right in a right-to-left page', async ({ page }) => {
  // /ar/ is right to left on <html>; a snippet in it must not be mirrored
  await page.goto('/ar/');
  const dirs = await page.evaluate(() => [...document.querySelectorAll('pre, code')].map((el) => getComputedStyle(el).direction));
  expect(dirs.length).toBeGreaterThan(0);
  expect([...new Set(dirs)]).toEqual(['ltr']);
  // A dir of your own wins
  const own = await page.evaluate(() => {
    const code = document.createElement('code');
    code.dir = 'rtl';
    document.body.append(code);
    return getComputedStyle(code).direction;
  });
  expect(own).toBe('rtl');
});
