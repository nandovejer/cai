---
"@cai-ds/core": minor
---

New component: `.cai-dropdown` (`components/dropdown.css`), a button that opens a short list of actions or links. A native popover opened by `<button popovertarget>`: the browser gives Escape, light dismiss, the top layer, focus return and the expanded state, and there is no JavaScript. The panel (`.cai-dropdown__menu`) holds a `.cai-dropdown__list` of `.cai-dropdown__item` links and buttons (at least 44 px, `--danger`, `aria-disabled`), and a `.cai-dropdown__separator`. With CSS anchor positioning it opens under its button and flips above when there is no room; without it, it is a sheet at the bottom of the screen; without the popover API the list stays in the page. It is a list of actions, not an ARIA `menu`: no arrow keys are scripted. A context menu on right click is not provided on purpose. Page: `/docs/components/dropdown/`.
