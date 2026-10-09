---
"@cai-ds/core": patch
---

Progress bars and the player's seek and volume bars meet WCAG 1.4.11 (Non-text contrast, 3:1) in the three modes, and keep their fill in forced colors.

**Fixed (`@cai-ds/core`)**

- `.cai-progress` and the bare `<progress>`: the track is `--cai-surface-muted` (was `--cai-divider`) and has a 1 px edge in `--cai-input-border` (was none). Fill against the track: 5.2 / 6.7 / 13.5:1 in light / dark / high contrast (was 4.7 / 6.7 / 1.5:1). Edge against the page: 5.3 / 8.4 / 21.0:1 (the track was 1.1 / 1.2 / 9.0:1, so in light and dark the length of the bar could not be seen). The bar is still 8 px high; the fill is 6 px inside the edge.
- `.cai-player-seekbar`: the part not loaded yet is `--cai-surface-muted` (was `--cai-divider`; the played part was 1.5:1 against it in high contrast, now 5.2 / 6.7 / 13.5:1), and the 4 px track has a 1 px `--cai-input-border` edge, 4.6 / 4.3 / 18.0:1 on the controls (the track was 1.0:1 there in every mode).
- Forced colors: the fill and the thumb now use `Highlight` on a `Canvas` track with a `CanvasText` edge. The rules listed a `-webkit-` and a `-moz-` pseudo-element in one selector, so every browser dropped them and the fill kept the brand colour.

No change to the tokens. If you set `--cai-divider` to restyle a progress track, set `--cai-surface-muted` on `.cai-progress` instead.
