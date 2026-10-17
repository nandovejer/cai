// @ts-check
/**
 * A class name in a "Variants and options" table does not break inside a word
 * (F7, accessibility review): on /docs/documentation/dodont/ at 1440 px the
 * cell showed `dodont__verdic` / `t` and `.luz-docs-` / `dodont`, which reads
 * as two names. A `code` that holds a class name wraps only at a `__` or `--`
 * boundary (the break stands right before or right after the delimiter), or
 * does not wrap at all.
 *
 * How it is checked: the line boxes. Every character of the `code` has a
 * client rect; characters whose rects share a top are one line; between two
 * lines the break must touch `__` or `--` (the last characters of the line,
 * or the first of the next). This does not care how the page does it (a
 * `<wbr>` before every `__` and `--`, no wrapping, a narrower name), only what
 * the reader sees. A break after a single hyphen (`.luz-docs-` / `dodont`)
 * is a break inside the name, so it fails too.
 *
 * Which `code` elements: those of the table under "Variants and options" whose
 * text is one class name or selector (letters, digits, `-`, `_`, `.`, at least
 * one hyphen or underscore): not `aria-hidden="true"`, not `<div>`.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/documentation/dodont/';

/** The lines of every class-name `code` of the Variants table, each as the text on that line. */
async function classNameLines(page) {
  return page.evaluate(() => {
    const name = /^[.#]?[A-Za-z][\w-]*(?:\.[A-Za-z][\w-]*)*$/;
    const out = [];
    for (const code of document.querySelectorAll('#variants ~ .luz-table-wrap td code')) {
      const text = (code.textContent ?? '').trim();
      if (!name.test(text) || !/[-_]/.test(text)) continue;
      const lines = [];
      const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const data = /** @type {Text} */ (node).data;
        for (let i = 0; i < data.length; i++) {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const rect = range.getClientRects()[0];
          if (!rect) continue;
          const top = Math.round(rect.top);
          if (!lines.length || Math.abs(lines[lines.length - 1].top - top) > 3) lines.push({ top, text: '' });
          lines[lines.length - 1].text += data[i];
        }
      }
      out.push({ text, lines: lines.map((l) => l.text) });
    }
    return out;
  });
}

test.describe('class names in the Variants table of Do and don\'t', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('there are class names to check, and the page does not scroll sideways', async ({ page }) => {
    await page.goto(PAGE);
    const codes = await classNameLines(page);
    expect(codes.length, 'class-name cells in the Variants table').toBeGreaterThanOrEqual(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test('a class name wraps only at a __ or -- boundary, or does not wrap', async ({ page }) => {
    await page.goto(PAGE);
    const breaks = [];
    for (const { text, lines } of await classNameLines(page)) {
      for (let i = 1; i < lines.length; i++) {
        const before = lines.slice(0, i).join('');
        const after = lines.slice(i).join('');
        const atDelimiter = /(__|--)$/.test(before) || /^(__|--)/.test(after);
        if (!atDelimiter) breaks.push(`${text}: breaks as "${lines.join(' | ')}"`);
      }
    }
    expect(breaks, 'a line break inside a word of a class name').toEqual([]);
  });
});
