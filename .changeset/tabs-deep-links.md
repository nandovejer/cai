---
"@cai-ds/core": patch
---

Tabs: links into a hidden panel work, find in page reaches it, Space selects a tab, and the arrow keys follow the reading direction.

- `initTabs()` opens the tab whose panel holds the element a URL fragment names (`#keyboard`, not only the panel's own id), on load and on `hashchange`, and brings the element back into view after hiding the other panels, without moving focus. An in-page link to an element inside a hidden panel opens that tab first, so the browser scrolls to it and focuses it when it can take focus.
- Inactive panels get `hidden="until-found"` where the browser supports it (a plain `hidden` elsewhere): find in page (Ctrl+F) reaches their text, and the `beforematch` event opens their tab. `.cai-tabpanel[hidden]` becomes `.cai-tabpanel[hidden]:not([hidden="until-found"])`, and the stray `[role="tabpanel"][hidden]` rule in `breadcrumb.css` is removed (the `[hidden]` utility already covers it).
- Space on a focused tab selects it instead of scrolling the page.
- In right-to-left text, ArrowLeft moves to the next tab and ArrowRight to the previous one; Up and Down are unchanged.
- The selected tab's underline is visible again: it was pulled over the row's rule with a negative margin and clipped by the row's horizontal scroll. The selected label is bolder (600), and in forced colors only the selected tab draws its underline, in `Highlight`.
