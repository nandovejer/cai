---
"@cai-ds/site": major
---

The search is a custom element, `<cai-platform-search>`, and `initSearch()` is gone.

**Breaking**

- `initSearch(root)` is no longer exported from `@cai-ds/platform` or `@cai-ds/platform/search`. Importing `@cai-ds/platform/search`, or loading `platform.min.js`, defines the element; nothing is called.
- The dialog goes inside the element:

```html
<cai-platform-search>
  <dialog class="cai-modal cai-platform-search" data-cai-search data-cai-search-src="/search-index.json" …>…</dialog>
</cai-platform-search>
```

The triggers (`[data-cai-search-open]`) and the fallback link (`[data-cai-search-fallback]`) stay where they were, anywhere on the page. The element needs no attribute and no `<script>` call: it wires the dialog and the triggers when it connects, so markup a router or a framework adds later works.

**Added.** Light DOM, no Shadow DOM, defined once and only where there is a DOM (importing the module in Node does nothing). Without JavaScript it is an unknown inline element: the trigger stays hidden and the link shows.

**Size.** `platform.min.js` is 2,046 of 2,048 bytes min+gzip, measured against the unchanged ceiling (a prototype first, as the decision record asks). `package.json` `sideEffects` now lists `search.js`, because importing it defines the element.

**Tested** (`tests/search-element.spec.js`, plus the 112 cases of `tests/search.spec.js` against the element): defined once and not shadowed; an element added later wires itself; Ctrl+K opens it; a moved element adds no second handler or request; an element with no dialog throws nothing.
