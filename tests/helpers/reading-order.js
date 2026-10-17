/**
 * WCAG 2.4.3 and 1.3.2 (Focus Order, Meaningful Sequence): the order of the
 * markup is the order of the screen. Walk the controls the Tab key reaches, in
 * the order of the markup, and report every step that goes back up the page.
 *
 * A step inside one block of the page (a child of `body`: the header, the
 * sidebar, the rail, main, the footer) may go along a row; it may not go up. A
 * step into another block must go into a block that starts below the one it
 * leaves, or into a column to its right (the sidebar beside the content is a
 * column: leaving it for the content is a step to the right).
 */

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ count: number, steps: string[], problems: string[] }>} `steps` is the walk, `problems` the steps that go up the page
 */
export function readingOrder(page) {
  return page.evaluate(() => {
    const SELECTOR = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, [contenteditable="true"], [tabindex]';
    const tabbable = [...document.querySelectorAll(SELECTOR)].filter((el) => {
      const tabindex = el.getAttribute('tabindex');
      if (tabindex !== null && Number(tabindex) < 0) return false;
      if (/** @type {HTMLInputElement} */ (el).disabled || el.closest('[inert]')) return false;
      if (!el.checkVisibility({ checkVisibilityCSS: true })) return false;
      const box = el.getBoundingClientRect();
      // The skip link waits above the window until it is focused: it is first by design
      return box.width > 0 && box.height > 0 && box.bottom + window.scrollY > 0;
    });
    const docBox = (el) => {
      const b = el.getBoundingClientRect();
      return { top: b.top + window.scrollY, bottom: b.bottom + window.scrollY, left: b.left, right: b.right };
    };
    const blockOf = (el) => {
      let node = el;
      while (node.parentElement && node.parentElement !== document.body) node = node.parentElement;
      return node;
    };
    const label = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`;
    const name = (el) => `${label(el)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`;
    const steps = [];
    const problems = [];
    let before = null;
    for (const el of tabbable) {
      const box = docBox(el);
      const block = blockOf(el);
      steps.push(`${name(el)} in ${label(block)} @ y=${Math.round(box.top)} x=${Math.round(box.left)}`);
      if (before) {
        let ok;
        if (before.block === block) {
          ok = box.top >= before.box.top - 1 || box.left >= before.box.right - 1;
        } else {
          const from = docBox(before.block);
          const to = docBox(block);
          ok = to.top >= from.bottom - 1 || to.left >= from.right - 1;
        }
        if (!ok) problems.push(`${name(before.el)} (in ${label(before.block)}, y=${Math.round(before.box.top)}) then ${name(el)} (in ${label(block)}, y=${Math.round(box.top)}): the next control is higher on the page, not in a column to the right`);
      }
      before = { el, box, block };
    }
    return { count: tabbable.length, steps, problems };
  });
}
