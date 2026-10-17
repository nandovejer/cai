/**
 * WCAG 2.4.11 (Focus Not Obscured, minimum): a focused control is not hidden by
 * content the author put over it (a sticky rail, a sticky row). The test is the
 * one a pointer would make: whatever `elementFromPoint` answers at the control's
 * centre, and at the two ends of its middle line, is the control or inside it.
 */

/**
 * Focus the element and report what is drawn on top of it.
 * @param {import('@playwright/test').Locator} locator one element
 * @param {{ ends?: boolean }} [options] `ends: false` tests the centre only
 * @returns {Promise<{ label: string, focused: boolean, inViewport: boolean, covered: string[] }>}
 */
export async function focusAndHitTest(locator, { ends = true } = {}) {
  await locator.focus();
  return locator.evaluate((el, withEnds) => {
    const r = el.getBoundingClientRect();
    const y = r.top + r.height / 2;
    const points = { centre: [r.left + r.width / 2, y] };
    if (withEnds) {
      points.start = [r.left + 1, y];
      points.end = [r.right - 1, y];
    }
    const describe = (node) => (node ? `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${node.className && typeof node.className === 'string' ? `.${node.className.trim().split(/\s+/).join('.')}` : ''}` : 'nothing (outside the window)');
    const covered = [];
    for (const [name, [x, py]] of Object.entries(points)) {
      const hit = document.elementFromPoint(x, py);
      if (!hit || !(hit === el || el.contains(hit))) covered.push(`${name} (${Math.round(x)}, ${Math.round(py)}): ${describe(hit)}`);
    }
    return {
      label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
      focused: document.activeElement === el,
      inViewport: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
      covered,
    };
  }, ends);
}

/**
 * The focused element's outline against the first box that clips it: how many CSS pixels of the ring
 * lie beyond the inline-start edge of that box's padding box (0 or less: the ring is whole there).
 * The ring reaches past the border box by `outline-offset + outline-width`; the clip is the nearest
 * ancestor whose overflow is not `visible` (an `overflow-y: auto` clips on x as well), or the window.
 * @param {import('@playwright/test').Page} page the page, with an element focused by the keyboard
 * @returns {Promise<{ label: string, focusVisible: boolean, outlineStyle: string, clipper: string, ringStart: number, paddingBoxStart: number, hidden: number }>}
 */
export function ringBeyondInlineStart(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    const rtl = cs.direction === 'rtl';
    const r = el.getBoundingClientRect();
    const width = cs.outlineStyle === 'none' ? 0 : parseFloat(cs.outlineWidth);
    const reach = Math.max(0, parseFloat(cs.outlineOffset) + width);
    let clip = el.parentElement;
    while (clip && clip !== document.documentElement) {
      const o = getComputedStyle(clip);
      if (o.overflowX !== 'visible' || o.overflowY !== 'visible') break;
      clip = clip.parentElement;
    }
    const isWindow = !clip || clip === document.documentElement;
    const box = isWindow ? null : clip.getBoundingClientRect();
    const border = isWindow ? 0 : parseFloat(getComputedStyle(clip)[rtl ? 'borderRightWidth' : 'borderLeftWidth']);
    const ringStart = rtl ? r.right + reach : r.left - reach;
    const paddingBoxStart = isWindow ? (rtl ? window.innerWidth : 0) : rtl ? box.right - border : box.left + border;
    return {
      label: el.textContent.trim().slice(0, 30),
      focusVisible: el.matches(':focus-visible'),
      outlineStyle: cs.outlineStyle,
      clipper: isWindow ? 'the window' : `${clip.tagName.toLowerCase()}${clip.id ? `#${clip.id}` : ''}.${clip.className}`,
      ringStart,
      paddingBoxStart,
      hidden: rtl ? ringStart - paddingBoxStart : paddingBoxStart - ringStart,
    };
  });
}
