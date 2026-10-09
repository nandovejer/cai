/**
 * CAI Platform — site search: a native <dialog> with grouped links.
 *
 * Markup (every fixed text is authored in the HTML; the docs page,
 * /docs/platform/search/, has the full example):
 *
 *   <a href="a-z/" data-cai-search-fallback>A–Z index</a>
 *   <button class="cai-platform-search-trigger" type="button" data-cai-search-open
 *           aria-keyshortcuts="Control+K Meta+K" hidden>…</button>
 *   <dialog class="cai-modal cai-platform-search" data-cai-search
 *           data-cai-search-src="search-index.json" aria-labelledby="…"
 *           data-cai-label-results="{n} results" …>
 *     … <input type="search" autofocus>
 *     <p role="status"></p>
 *     <div data-cai-search-results>
 *       <div data-cai-search-show="idle">…shown while the field is empty…</div>
 *       <div hidden><h3>Pages</h3><ul data-cai-search-list="pages"></ul></div>
 *       … "sections", "elements"
 *     </div>
 *     <p data-cai-search-show="none" hidden>…shown when nothing matches…</p>
 *   </dialog>
 *
 * The index is a JSON file on the same origin (data-cai-search-src),
 * format version 1: { "version": 1, "pages": [[text, url, meta?, lang?]],
 * "sections": [...], "elements": [...] }, URLs relative to the file.
 *
 * Without JavaScript the trigger stays hidden and the fallback link shows.
 * With it: the button and Ctrl+K or ⌘K open the dialog (showModal: focus
 * trap, Escape and focus return are the browser's); the index loads on the
 * first open; the results are real links, grouped under headings, at most
 * 8 per group; the arrows move between them, Enter follows one.
 *
 * Security (.claude/plans/docs-redesign/security.md, SEC-IDX, SEC-NET):
 * index text reaches the page through textContent only; a link is the URL
 * the index gives, resolved and checked (http or https), never the raw
 * string; the JSON comes from this origin, without redirects, and has size
 * limits. Importing this module has no side effects: call initSearch().
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
 * the URL of the index. A result: { g (its group), name (folded text),
 * text, meta, href, lang }. At most 10,000 results, 300 characters a string.
 */
export function readIndex(data, base) {
  if (data?.version !== 1 || !Array.isArray(data.pages)) return null;
  const out = [];
  GROUPS.forEach((group, g) => {
    for (const item of Array.isArray(data[group]) ? data[group] : []) {
      const [text, raw, meta, lang] = Array.isArray(item) ? item : [];
      const url = out.length < 1e4 && str(text) && str(raw) && safeUrl(raw, base);
      if (url) {
        out.push({ g, name: fold(cut(text)), text: cut(text), meta: str(meta) && cut(meta), href: url.href, lang: str(lang) && LANG.test(lang) && lang });
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
  if (text) el.textContent = text;
  return el;
};

/** The dialog Ctrl+K opens: the last one wired. */
let current;

/** Wire the search dialog of `root` and its triggers. Idempotent. */
export function initSearch(root = document) {
  const box = root.querySelector("[data-cai-search]");
  if (!box || box === current?.box) return;
  const $ = (selector) => box.querySelector(selector);
  const input = $("input");
  const status = $("[role=status]");
  const results = $("[data-cai-search-results]");
  // cai-exception: EX-005 — what the script writes is read from the
  // dialog's data-cai-label-<key> attributes, authored in the page's
  // language. Split and joined, never String.replace() with the query
  // (SEC-IDX-10); a missing label writes nothing.
  const say = (key, vars) =>
    status.replaceChildren(
      ...(box.getAttribute(`data-cai-label-${key}`) ?? "").split(/\{(\w+)\}/).map((part, i) => (i % 2 ? (Object.hasOwn(vars, part) ? vars[part] : "") : part)),
    );
  let index;
  let loading;
  let timer;

  const update = () => {
    if (!index) return;
    const q = input.value.trim();
    const found = search(index, q);
    let shown = 0;
    let total = 0;
    GROUPS.forEach((group, g) => {
      const list = $(`[data-cai-search-list="${group}"]`);
      if (!list) return;
      list.replaceChildren(
        ...found[g].slice(0, 8).map((r) => {
          const li = make("li");
          const a = li.appendChild(make("a", r.text));
          a.href = r.href;
          if (r.lang) a.lang = r.lang;
          if (r.meta) a.append(" ", make("span", r.meta));
          return li;
        }),
      );
      shown += list.children.length;
      total += found[g].length;
      list.parentElement.hidden = !list.children.length;
    });
    // The state names the label of the status and what [data-cai-search-show] shows
    const state = q ? (total ? (shown < total ? "capped" : total > 1 ? "results" : "result") : "none") : "idle";
    for (const el of box.querySelectorAll("[data-cai-search-show]")) el.hidden = el.dataset.caiSearchShow !== state;
    // The count, once the reader stops typing (a11y.md SRCH-24); an empty
    // field empties the status at once
    clearTimeout(timer);
    timer = setTimeout(() => say(state, { n: total, shown, query: q }), q && 300);
  };

  const load = () =>
    (loading ??= (async () => {
      say("loading");
      // This origin only, over http(s), and no redirect away from it
      // (SEC-NET-1/2); credentials stay the default, "same-origin"
      const url = safeUrl(box.dataset.caiSearchSrc, document.baseURI);
      if (url.origin !== location.origin) return;
      const res = await fetch(url, { redirect: "error" });
      return res.ok && parseIndex(await res.text(), url);
    })()
      .catch(() => {})
      .then((list) => {
        if ((index = list)) return update();
        say("error");
        // The next open tries again: no loop, no timer
        loading = null;
      }));

  // Every search starts afresh (not on "close": that event comes late, and
  // could empty a search opened again at once)
  const open = () => {
    if (box.open) return;
    input.value = "";
    update();
    box.showModal();
    load();
  };

  input.addEventListener("input", update);

  for (const link of root.querySelectorAll("[data-cai-search-fallback]")) link.hidden = true;
  for (const button of root.querySelectorAll("[data-cai-search-open]")) {
    button.hidden = false;
    button.addEventListener("click", open);
  }

  // Down from the field to the first result; Down, Up, Home and End between
  // results (Up from the first goes back to the field); typing goes back to
  // the field, which receives the key; Enter in the field follows the first
  // result, on a result it is the link's own (a11y.md SRCH-20)
  box.addEventListener("keydown", (e) => {
    const { key, target } = e;
    const links = [...results.querySelectorAll("a:not([hidden] a)")];
    const at = links.indexOf(target);
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: links.length - 1 }[key];
    const next = target === input ? key === "ArrowDown" && links[0] : at > -1 && to !== undefined && (links[to] ?? (to < 0 ? input : target));
    if (next) {
      // eslint-disable-next-line no-restricted-syntax -- RL-3: the arrows, Home and End move between the results instead of the caret or the scroll (a11y.md SRCH-20)
      e.preventDefault();
      next.focus();
    } else if (at > -1 && (key.length === 1 || key === "Backspace") && !e.ctrlKey && !e.metaKey) {
      input.focus();
    }
    if (target === input && key === "Enter" && input.value.trim()) $("[data-cai-search-list] a")?.click();
  });

  // A result on this page: close, let the link scroll (core's tabs.js opens
  // a tab that hides its target), then focus the target (a11y.md SRCH-14)
  results.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    box.close();
    const target = a.pathname === location.pathname && document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (target) {
      setTimeout(() => {
        // A heading takes focus from script only; a control keeps its own tabindex
        if (target.tabIndex < 0) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      });
    }
  });

  // One listener for the page, whatever the number of calls (SEC-MISC-6)
  if (!current) document.addEventListener("keydown", (e) => {
    const { box, input, open } = current;
    const inside = document.activeElement?.closest("dialog[open]");
    // Never over another modal dialog (SEC-MISC-7)
    if (!isShortcut(e) || !box.isConnected || (inside && inside !== box)) return;
    // eslint-disable-next-line no-restricted-syntax -- PRINCIPLES.md §3: the site search may take Ctrl+K and ⌘K (shown on the trigger, listed in the accessibility statement)
    e.preventDefault();
    // Open, or back to the field with its text selected (a11y.md SRCH-8)
    if (box.open) input.select(input.focus());
    else open();
  });
  current = { box, input, open };
}
