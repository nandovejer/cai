/**
 * LUZ Site — site search: a native <dialog> with grouped links, in a
 * custom element, <luz-search> (light DOM, no Shadow DOM). A lazy chunk:
 * site.js loads this file (dist/search.min.js, one file with its own
 * budget, which loads nothing else) when the page has a <luz-search>; a
 * page that adds one later loads it by hand ("@luz-ds/site/search").
 *
 * Markup (every fixed text is authored in the HTML; the docs page,
 * /docs/site/search/, has the full example):
 *
 *   <luz-search>
 *     <a class="luz-search__fallback" href="a-z/" data-luz-search-fallback>
 *       <svg class="luz-search__trigger-icon" aria-hidden="true">…</svg>
 *       <span class="luz-search__fallback-label">A–Z index</span></a>
 *     <button class="luz-search__trigger" type="button" data-luz-search-open
 *             aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" hidden>…</button>
 *     <dialog class="luz-modal luz-search" data-luz-search
 *             data-luz-search-src="search-index.json"
 *             aria-labelledby="…" data-luz-label-results="{n} results" …>
 *       <div class="luz-search__field"><svg aria-hidden="true" …>…</svg>
 *         <input type="text" autofocus aria-describedby="…"></div>
 *       <p class="luz-search__status" role="status"></p>
 *       <div data-luz-search-results>
 *         <div data-luz-search-show="idle">…shown while the field is empty…</div>
 *         <div hidden><h3>Pages</h3><ul data-luz-search-list="pages"></ul></div>
 *         … "sections", "elements"
 *       </div>
 *       <p data-luz-search-show="none" hidden>…shown when nothing matches…</p>
 *     </dialog>
 *   </luz-search>
 *
 * The index is a JSON file on the same origin (data-luz-search-src),
 * format version 1: { "version": 1, "pages": [[text, url, meta?, lang?]],
 * "sections": [...], "elements": [...] }, URLs relative to the file.
 *
 * Without JavaScript the element does nothing, the trigger stays hidden and
 * the fallback link shows. With it, the element wires itself when it
 * connects: the trigger takes the fallback's place (search.css keeps both
 * in one cell, so nothing moves), but never under the reader: while the
 * fallback has the keyboard focus or a pressed pointer the swap waits for
 * its focusout, click or pointercancel, and focus is never moved. Every
 * [data-luz-search-open] button of the page shows when it works. The
 * button and Ctrl+K or ⌘K open the dialog (showModal: focus trap, Escape
 * and focus return are the browser's, except that a close after an open
 * with nothing focused moves the focus to the opening button; the field is type="text" because in
 * a type="search" field the first Escape clears the text instead of
 * closing the dialog); the index loads on the first open; the results are
 * real links, grouped under headings, at most 8 per group (each a span
 * with the title, then a visually hidden ", " and a span with the page, if
 * any); the arrows move between them, Enter follows one.
 *
 * Two copies of this file on one page (a CDN copy and a bundled one) define
 * the element once: the second finds it defined and does nothing, so the
 * page gets one keydown handler (SEC-CHUNK-5).
 *
 * Security (.claude/plans/docs-redesign/security.md, SEC-IDX, SEC-NET,
 * SEC-CHUNK): index text reaches the page through textContent only; a link
 * is the URL the index gives, resolved and checked (http or https), never
 * the raw string; the JSON comes from this origin, without redirects, and
 * has size limits.
 */

/** Result groups, in their order on screen. */
const GROUPS = ["pages", "sections", "elements"];
const LANG = /^[a-z]{2,8}(-[a-z\d]{1,8})*$/i;

/** Lowercase, without accents, words separated by single spaces. */
export const fold = (text) =>
  text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const str = (value) => typeof value === "string";
/** At most 300 characters of a string from the index (SEC-IDX-8). */
const cut = (text) => text.slice(0, 300);

/** `raw` resolved against `base`, if that is an http(s) URL; else falsy. */
export function safeUrl(raw, base) {
  try {
    const url = new URL(raw, base);
    return /^https?:$/.test(url.protocol) && url;
  } catch {
    // Not a URL: undefined
  }
}

/**
 * The results of an index (format version 1), checked item by item; null
 * when it is not an index. The index has three lists, `pages`, `sections`
 * and `elements`, of [text, url, meta?, lang?]; URLs are relative to `base`,
 * the URL of the index. A result: { g (its group), name (folded text and
 * meta), text, meta, href, lang }. At most 10,000 results, 300 characters a string.
 */
export function readIndex(data, base) {
  if (data?.version !== 1 || !Array.isArray(data.pages)) return null;
  const out = [];
  GROUPS.forEach((group, g) => {
    for (const item of Array.isArray(data[group]) ? data[group] : []) {
      const [text, raw, m, lang] = Array.isArray(item) ? item : [];
      const meta = str(m) && cut(m);
      const url = out.length < 1e4 && str(text) && str(raw) && safeUrl(raw, base);
      if (url) {
        // The meta is searched too: a section is found by its page's name
        out.push({ g, name: fold(`${cut(text)} ${meta || ""}`), text: cut(text), meta, href: url.href, lang: str(lang) && LANG.test(lang) && lang });
      }
    }
  });
  return out;
}

/** JSON text → results, or null: over 1,000,000 characters, not JSON or not an index. */
export function parseIndex(text, base) {
  if (!str(text) || text.length > 1e6) return null;
  try {
    return readIndex(JSON.parse(text), base);
  } catch {
    return null;
  }
}

/**
 * The results that contain every word of `query` (8 words at most), per
 * group, best first: the earlier the query appears in the name, the better
 * (so a name that starts with it comes first), then the shorter name (so an
 * exact match comes first of all).
 */
export function search(results, query) {
  const terms = fold(query).split(" ").filter(Boolean).slice(0, 8);
  const q = terms.join(" ");
  // -1 (several words, not side by side) becomes the largest number
  const rank = ({ name }) => (name.indexOf(q) >>> 0) * 1e3 + name.length;
  return GROUPS.map((_, g) =>
    q ? results.filter((r) => r.g === g && terms.every((t) => r.name.includes(t))).sort((a, b) => rank(a) - rank(b)) : [],
  );
}

/**
 * Whether a keydown is the search shortcut: Ctrl+K or ⌘K, without Alt or
 * Shift, not during IME composition, not already handled, and not typed in
 * a textarea or editable content (PRINCIPLES.md §3).
 */
export const isShortcut = (e) =>
  (e.ctrlKey || e.metaKey) &&
  !e.altKey &&
  !e.shiftKey &&
  /^k$/i.test(e.key) &&
  !e.isComposing &&
  !e.defaultPrevented &&
  !(e.target?.isContentEditable || e.target?.localName === "textarea");

const make = (tag, text) => {
  const el = document.createElement(tag);
  el.textContent = text ?? "";
  return el;
};

/** The dialog Ctrl+K and the buttons outside any <luz-search> open: the last one wired. */
let current;
const wired = new WeakSet();

/** Wire the dialog inside `host`, its trigger and fallback, and the buttons of the page. Once per dialog. */
const wire = (host) => {
  const box = host.querySelector("dialog");
  if (!box || wired.has(box)) return;
  wired.add(box);
  const $ = (selector) => box.querySelector(selector);
  const input = $("input");
  const status = $("[role=status]");
  const results = $("[data-luz-search-results]");
  // luz-exception: EX-005 — what the script writes is read from the
  // dialog's data-luz-label-<key> attributes, authored in the page's
  // language. Split and joined, never String.replace() with the query
  // (SEC-IDX-10); a missing label writes nothing.
  const say = (key, vars = {}) =>
    status.replaceChildren(
      ...(box.getAttribute(`data-luz-label-${key}`) ?? "").split(/\{(\w+)\}/).map((part, i) => (i % 2 ? (Object.hasOwn(vars, part) ? vars[part] : "") : part)),
    );
  let index;
  let loading;
  let timer;
  // Where focus goes on close when nothing had it at the open (a11y 2.4.3)
  let back;

  const update = () => {
    if (!index) return;
    const q = input.value.trim();
    let shown = 0;
    let total = 0;
    search(index, q).forEach((hits, g) => {
      const list = $(`[data-luz-search-list="${GROUPS[g]}"]`);
      if (!list) return;
      list.replaceChildren();
      for (const r of hits.slice(0, 8)) {
        shown++;
        // The title, then the page: "Button, Components" to a screen
        // reader; search.css hides the comma on screen, underlines the title
        const a = list.appendChild(make("li")).appendChild(make("a"));
        a.href = r.href;
        if (r.lang) a.lang = r.lang;
        a.append(make("span", r.text));
        if (r.meta) a.append(make("span", ", "), make("span", r.meta));
      }
      total += hits.length;
      list.parentElement.hidden = !hits.length;
    });
    // The state names the label of the status and what [data-luz-search-show] shows
    const state = q ? (total ? (shown < total ? "capped" : total > 1 ? "results" : "result") : "none") : "idle";
    for (const el of box.querySelectorAll("[data-luz-search-show]")) el.hidden = el.dataset.luzSearchShow !== state;
    // The count, once the reader stops typing (a11y.md SRCH-24); an empty
    // field empties the status at once
    clearTimeout(timer);
    timer = setTimeout(() => say(state, { n: total, shown, query: q }), q && 300);
  };

  const load = async () => {
    if (loading) return;
    loading = true;
    say("loading");
    try {
      // This origin only, over http(s), and no redirect away from it
      // (SEC-NET-1/2); credentials stay the default, "same-origin"
      const url = safeUrl(box.dataset.luzSearchSrc, document.baseURI);
      if (url.origin === location.origin) {
        const res = await fetch(url, { redirect: "error" });
        index = res.ok && parseIndex(await res.text(), url);
      }
    } catch {
      // Offline, a redirect, not an index: the error below
    }
    if (index) return update();
    say("error");
    // The next open tries again: no loop, no timer
    loading = false;
  };

  // Every search starts afresh (not on "close": that event comes late, and
  // could empty a search opened again at once)
  const open = (from) => {
    if (!box.isConnected) return;
    // Nothing focused (Ctrl+K on a fresh page, a click in a browser that
    // does not focus buttons): the close returns to the button that opened
    // the dialog, or to this search's trigger, not to the top of the page
    const el = document.activeElement;
    back = (!el || el === document.body) && (from?.nodeType ? from : host.querySelector(".luz-search__trigger"));
    input.value = "";
    update();
    box.showModal();
    load();
  };

  input.addEventListener("input", update);
  // After the browser's own return, to <body>, one task later (Chromium
  // moves the focus out of the dialog after this event): not if it opened
  // again or something outside the dialog has the focus by then
  box.addEventListener("close", () =>
    setTimeout(() => {
      const el = document.activeElement;
      if (back && !box.open && (!el || el === document.body || box.contains(el))) back.focus();
    }),
  );

  // The trigger takes the fallback's place (a11y S1, S2): at once, unless
  // the reader is on the fallback (keyboard focus, or a pointer pressed on
  // it); then when they leave it, follow it or the press is cancelled
  const swap = () => {
    for (const link of host.querySelectorAll("[data-luz-search-fallback]")) link.hidden = true;
    for (const button of host.querySelectorAll("[data-luz-search-open]")) button.hidden = false;
  };
  const busy = host.querySelector("[data-luz-search-fallback]:is(:focus-visible, :active)");
  if (busy) for (const type of ["focusout", "click", "pointercancel"]) busy.addEventListener(type, swap, { once: true });
  else swap();
  for (const button of host.querySelectorAll("[data-luz-search-open]")) button.addEventListener("click", () => open(button));
  // Fallbacks and buttons outside any <luz-search>: shown at once, each
  // bound once, to the last search wired
  for (const el of document.querySelectorAll("[data-luz-search-fallback], [data-luz-search-open]")) {
    if (el.closest("luz-search")) continue;
    el.hidden = el.matches("[data-luz-search-fallback]");
    if (!el.hidden && !wired.has(el)) {
      wired.add(el);
      el.addEventListener("click", () => current.open(el));
    }
  }

  // Down from the field to the first result; Down, Up, Home and End between
  // results (Up from the first goes back to the field); typing goes back to
  // the field, which receives the key; Enter in the field follows the first
  // result, on a result it is the link's own (a11y.md SRCH-20)
  box.addEventListener("keydown", (e) => {
    const { key, target } = e;
    // Not during IME composition: the keys drive its candidate list
    if (e.keyCode === 229 || e.isComposing) return;
    // The field, then the results: 0 is the field, -1 neither
    const items = [input, ...results.querySelectorAll("a:not([hidden] a)")];
    const at = items.indexOf(target);
    // From the field, Down only
    const to = at ? { ArrowDown: at + 1, ArrowUp: at - 1, Home: 1, End: items.length - 1 }[key] : key === "ArrowDown" ? 1 : -1;
    const next = at > -1 && to > -1 && (items[to] ?? (at && target));
    if (next) {
      // eslint-disable-next-line no-restricted-syntax -- RL-3: the arrows, Home and End move between the results instead of the caret or the scroll (a11y.md SRCH-20)
      e.preventDefault();
      next.focus();
    } else if (at > 0 && (key.length === 1 || key === "Backspace") && !(e.ctrlKey || e.metaKey)) {
      input.focus();
    }
    if (!at && key === "Enter" && input.value.trim()) $("[data-luz-search-list] a")?.click();
  });

  // A result on this page: close, let the link scroll (core's tabs.js opens
  // a tab that hides its target), then focus the target (a11y.md SRCH-14)
  results.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    back = 0;
    box.close();
    try {
      const id = decodeURIComponent(a.hash.slice(1));
      const target = id && a.pathname === location.pathname && document.getElementById(id);
      if (target) {
        setTimeout(() => {
          // A heading takes focus from script only; a control keeps its own tabindex
          if (target.tabIndex < 0) target.tabIndex = -1;
          target.focus({ preventScroll: true });
        });
      }
    } catch {
      // A malformed escape in the hash: the link still navigates (SEC-MISC-11)
    }
  });

  // One listener for the page, added by the first wiring, whatever the
  // number of elements or of copies of this file (SEC-MISC-6, SEC-CHUNK-5)
  if (!current) document.addEventListener("keydown", (e) => current.shortcut(e));
  current = {
    open,
    shortcut: (e) => {
      const inside = document.activeElement?.closest("dialog[open]");
      // Never over another modal dialog (SEC-MISC-7)
      if (!isShortcut(e) || !box.isConnected || (inside && inside !== box)) return;
      // eslint-disable-next-line no-restricted-syntax -- PRINCIPLES.md §3: the site search may take Ctrl+K and ⌘K (shown on the trigger, listed in the accessibility statement)
      e.preventDefault();
      // Open, or back to the field with its text selected (a11y.md SRCH-8)
      if (box.open) input.select(input.focus());
      else open();
    },
  };
};

// <luz-search> holds the fallback, the trigger and the dialog. Defined
// once, whatever the number of copies of this file (SEC-CHUNK-5), and only
// where there is a DOM, so importing this module in Node is harmless.
if (typeof customElements < "u" && !customElements.get("luz-search")) {
  customElements.define("luz-search", class extends HTMLElement {
    connectedCallback() {
      wire(this);
    }
  });
}
