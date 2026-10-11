---
"@cai-ds/core": minor
---

The tooltip flips below its control when there is no room above, in browsers with CSS anchor positioning.

**Changed (`@cai-ds/core`, `components/tooltip.css`)**

- Inside `@supports (anchor-name: --cai-tooltip) and (position-area: block-start)`: the control is the anchor, and the tip is placed with `position-area: block-start` and `position-try-fallbacks: flip-block`. It is fixed to the viewport, so an ancestor that hides overflow no longer clips it, and a control at the top of the screen gets its tip below it.
- A second bridge pseudo-element covers the gap on the other side (WCAG 1.4.13, hoverable), since the tip can now be above or below.
- Supported in Chrome and Edge 125, Safari 26 and Firefox 147: Baseline Newly available (web.dev, January 2026), not Widely available, so it is an enhancement only. Without support the component is exactly what it was. `anchor-size()` and `position-visibility`, the parts that are not interoperable yet, are not used.
- No script. Cost: +0.1 kB min+gzip of core CSS (9.3 of 15 kB).

**Tested** (`tests/tooltip-anchor.spec.js`): above and centred with room; flipped below and in view at the top; centred in right-to-left text; and, with the `@supports` rule removed from the CSSOM, above, centred and clipped at the top as before.
