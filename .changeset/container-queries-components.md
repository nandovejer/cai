---
"@cai-ds/core": minor
"@cai-ds/platform": minor
---

Table cell padding, the audio player controls and the platform feature grid follow the room they have, not the window.

**Changed (`@cai-ds/core`)**

- `components/table.css`: the reduced cell padding moves from `@media (max-width: 480px)` to `@container (max-width: 480px)` on `.cai-table-wrap`, the container the card stacking already used. A narrow table in a wide page now reduces its padding too, and a wide table in a narrow window no longer does.
- `components/player.css`: `.cai-player` is `container-type: inline-size`, and the audio controls (stacked, no volume bar) switch on `@container (max-width: 480px)` instead of the window. Inline-size containment means a player takes its width from its parent: a parent that sizes it to its content (an inline-flex item, a float) needs a width of its own. A `position: fixed` descendant, such as a tooltip with anchor positioning, is now placed against the player and clipped by its `overflow: hidden`, as it already was inside a table wrap.

**Changed (`@cai-ds/platform`)**

- `.cai-platform-feature-grid`: `repeat(auto-fit, minmax(min(100%, max(16rem, 45%)), 1fr))`: two columns at most, one when two do not fit 16rem each. No query. The window breakpoint at 768 px is gone, so a grid in a narrow column is one column in a wide window, and a grid in a wide column is two in a narrow one.
- `.cai-platform-actions` stays on a window query: stacking full-width buttons at 480 px is a touch-screen choice, not a width of the container.

**Not changed:** `.o-container`, `.o-shell`, the sidebar drawer, the platform footer and the search dialog stay on `@media`: they respond to the window. Only size queries (`inline-size`) are used.

**Tested** (`tests/container-queries.spec.js`): the same table, player and grid in a 400 px and a 900 px parent inside one 1280 px window; the window size changing nothing for a component of a given width; and, inside both containers, a modal dialog with its `::backdrop` and a popover placed against the window, and the table wrap still scrolling its overflow.
