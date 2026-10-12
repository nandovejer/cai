---
"@cai-ds/core": minor
---

**Layout grid.** `.o-grid` gets modifiers: `.o-grid--auto` (as many equal columns as fit, none narrower than `--cai-grid-min`, 16 rem by default) and `.o-grid--2`, `.o-grid--3`, `.o-grid--4` (that many columns above 768 px, one at 768 px and below). Documented on `/docs/components/layout/`.

**Safari and Firefox review of pagination and the HTML reference.**

- `.cai-pagination`: the current page keeps its fill on hover; in forced colors its focus ring is `CanvasText` and an end that is not a link is `GrayText`; the gap has padding instead of a minimum width.
- `.cai-input` of `date`, `time`, `datetime-local`, `month` and `week` (and the classless equivalents) centre their value with `display: flex`, as WebKit's own sheet does; with `display: block` the value sat about 10 px high in Safari.
