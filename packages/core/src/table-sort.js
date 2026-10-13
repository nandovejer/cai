/**
 * CAI Design System — Table sort (lazy chunk; enhances a table that already works)
 *
 * A heading marked `<th scope="col" data-cai-sort>` becomes a button that
 * sorts the rows of its table in the browser. The server markup stays the
 * no-JS path: a link in the heading (`<th><a href="?sort=price">`) sorts on
 * the server; here its content moves into a <button>, so the control that
 * acts in place is announced as one.
 *
 * State lives in the DOM: `aria-sort` on the one sorted heading, and
 * `data-sort-value` on a cell whose text is not what it sorts by (a
 * formatted number, a date shown as "13 Oct"). A status line (<output>, role
 * status) says what changed, in the language of the table: the text comes
 * from the dictionary of core's i18n, through `translate`.
 *
 * No imports: cai.js passes its own `t`; a page that loads this module on
 * its own passes the `t` of "@cai-ds/core/i18n". Without it the table still
 * sorts and `aria-sort` is still right; the status line stays empty.
 *
 * Importing this module has no side effects; call initTableSort() to enable it.
 */

/** A cell's value as a number, or NaN: "12" and "-0.5" are numbers, "12 kg" and "" are not. */
const num = (v) => (v !== "" && !Number.isNaN(Number(v)) ? Number(v) : NaN);

function sortBy(th, status, translate) {
  const table = th.closest("table");
  const dir = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
  const col = th.cellIndex;
  const lang = table.closest("[lang]")?.lang || undefined;
  let collator;
  try {
    collator = new Intl.Collator(lang, { numeric: true, sensitivity: "base" });
  } catch {
    collator = new Intl.Collator(); // a malformed lang attribute
  }
  const key = (row) => row.cells[col]?.dataset.sortValue ?? row.cells[col]?.textContent.trim() ?? "";
  const sign = dir === "ascending" ? 1 : -1;
  const compare = (a, b) => {
    const [x, y] = [key(a), key(b)];
    const [m, n] = [num(x), num(y)];
    return sign * (Number.isNaN(m) || Number.isNaN(n) ? collator.compare(x, y) : m - n);
  };
  // Array.prototype.sort is stable: equal rows keep their order. Each body
  // is sorted within itself; a <tfoot> is never moved.
  for (const body of table.tBodies) body.append(...[...body.rows].sort(compare));
  table.querySelectorAll("th[aria-sort]").forEach((h) => h.removeAttribute("aria-sort"));
  th.setAttribute("aria-sort", dir);
  status.textContent =
    translate?.(dir === "ascending" ? "sortedAsc" : "sortedDesc", table, { column: th.textContent.trim() }) ?? "";
}

/**
 * Upgrade every `th[data-cai-sort]` under `root`. Idempotent.
 * @param {ParentNode} [root]
 * @param {(key: string, el?: Element, vars?: object) => string} [translate] - core's `t`
 */
export function initTableSort(root = document, translate) {
  root.querySelectorAll("table:has(th[data-cai-sort])").forEach((table) => {
    const wrap = table.closest(".cai-table-wrap") ?? table;
    let status = wrap.nextElementSibling;
    if (!status?.matches("output[data-cai-sort-status]")) {
      status = document.createElement("output");
      status.className = "u-sr-only";
      status.dataset.caiSortStatus = "";
      // The text of the status is the table's language, not the page's
      status.lang = table.closest("[lang]")?.lang ?? "";
      wrap.after(status); // in the DOM before the first press, so it is announced
    }
    table.querySelectorAll("th[data-cai-sort]").forEach((th) => {
      if (th.firstElementChild?.matches("button")) return;
      const button = document.createElement("button");
      button.type = "button";
      // A link swapped for a button must not take the keyboard user's place with it
      const hadFocus = th.contains(document.activeElement);
      button.append(...(th.querySelector("a") ?? th).childNodes);
      th.replaceChildren(button);
      if (hadFocus) button.focus();
      button.addEventListener("click", () => sortBy(th, status, translate));
    });
  });
}
