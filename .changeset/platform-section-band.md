---
"@cai-ds/platform": minor
---

New `.cai-platform-section--band`: a section on a tinted band that runs from edge to edge of the page, for one call to act or one pause in a long page.

**New (`@cai-ds/platform`)**

- `.cai-platform-section--band` sets the section on `--cai-brand-subtle`, with `--cai-space-2xl` above and below its content. The content keeps the page's column; only the tint bleeds to the edges. The tint is a spread `box-shadow` cut off above and below by `clip-path`, so it adds no horizontal scroll at 320 to 2560 px (`100vw` would, with a scrollbar).
- In forced colors the tint is removed and two 1 px `CanvasText` rules mark the band's top and bottom.
- It makes obsolete the card-as-band workaround of the Call to action template and the "a band is one rule of your own" advice. The Page templates page now shows the band, a Speakers block (a list of cards with a square image frame) and no longer lists them under "What is not here".

**Known issues**

- Whatever sticks out of the band above or below is clipped: a CSS tooltip on the first control of a band is cut at 200 percent text and larger. Start the band with its heading. Popovers and dropdown menus are in the top layer and are not clipped.
- `.cai-btn--outline` and `.cai-btn--ghost` hover with the band's own tint, so their hover shows no change; the label and the outline still identify them.
- The primary button's fill is 3.0:1 against the tint in dark mode (3:1 needed; its label is 4.9:1). Keep the band on the page, never inside a card or on `--cai-surface`, where it falls to 2.7:1.
