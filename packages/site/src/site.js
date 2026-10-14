/**
 * LUZ Site — entry: the presence loader. One <script type="module"> of it
 * checks that core is loaded first, then scans the page once, after it is
 * parsed, and loads the chunk of each element that is on it:
 *
 *   <luz-search>   search.js, on the first pointerdown or focus inside one,
 *                  on Ctrl+K or ⌘K, or when the browser is idle
 *   <luz-consent>  consent.js, when the browser is idle (at most 1 s later),
 *                  and after the search chunk, if there is one, has loaded
 *                  or failed
 *
 * A page with neither requests neither. Each chunk defines its element,
 * and the browser upgrades every instance on the page. There is no
 * MutationObserver: an element added after the scan stays undefined until
 * the page loads its chunk by hand ("@luz-ds/site/search", or
 * dist/search.min.js), as it would without this file.
 *
 * Ctrl+K or ⌘K before the search chunk (accessibility S3): with the same
 * guards as the search's own shortcut, the key is taken, the chunk loads
 * and the dialog opens; the handler then removes itself, and the chunk's
 * own takes over. On a page without a <luz-search> the key is left alone.
 *
 * A chunk that fails to load (offline, a server error, a wrong integrity
 * hash) leaves the page as it is without JavaScript: the fallback link
 * works, the trigger stays hidden, nothing is logged, and the failure is
 * kept: no retry and no loop (accessibility S4, amended: Chromium keeps a
 * failed module in its module map, so a retry would make no request).
 *
 * Security (.claude/plans/docs-redesign/security.md, SEC-CHUNK-1 to 4): the
 * chunks are a constant map of string literals next to this file, never a
 * URL built from the page; this file writes nothing to the DOM; a full-SRI
 * page lists each chunk in a <link rel="modulepreload" integrity crossorigin>
 * before this script (SECURITY.md).
 */

// SEC-CHUNK-1: the only two files this one loads, each by a literal
const CHUNKS = {
  "luz-search": () => import("./search.js"),
  "luz-consent": () => import("./consent.js"),
};

if (typeof document !== "undefined") {
  // Core is a required peer: site styles are built on its settings layer
  getComputedStyle(document.documentElement).getPropertyValue("--luz-z-toast") || console.warn("[luz] Load @luz-ds/core first");

  /** One promise per tag, true once the chunk has run; a failure is kept (no retry). */
  const loading = {};
  const load = (tag) =>
    (loading[tag] ??= CHUNKS[tag]().then(
      () => {
        // The chunk's own shortcut takes over
        document.removeEventListener("keydown", early);
        return true;
      },
      () => {},
    ));

  // Read at call time: Safari has no requestIdleCallback
  const idle = (callback) => (window.requestIdleCallback ? window.requestIdleCallback(callback, { timeout: 1000 }) : setTimeout(callback));

  // Ctrl+K or ⌘K before the chunk, with the guards of search.js's isShortcut
  const early = (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && /^k$/i.test(e.key) && !e.isComposing && !e.defaultPrevented && !(e.target?.isContentEditable || e.target?.localName === "textarea") && !document.activeElement?.closest("dialog[open]")) {
      // eslint-disable-next-line no-restricted-syntax -- PRINCIPLES.md §3: the site search may take Ctrl+K and ⌘K (accessibility statement); here only until its chunk takes over
      e.preventDefault();
      document.removeEventListener("keydown", early);
      load("luz-search").then((ok) => ok && document.querySelector("luz-search [data-luz-search-open]")?.click());
    }
  };

  const scan = () => {
    const search = document.querySelectorAll("luz-search");
    if (search.length) {
      const touch = () => load("luz-search");
      for (const el of search) for (const type of ["pointerdown", "focusin"]) el.addEventListener(type, touch, { capture: true });
      document.addEventListener("keydown", early);
      idle(touch);
    }
    // The banner after the search has loaded or failed: the search shows
    // its buttons elsewhere on the page, which would move a banner already
    // shown below them
    if (document.querySelector("luz-consent")) idle(() => Promise.resolve(loading["luz-search"]).then(() => load("luz-consent")));
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
}
