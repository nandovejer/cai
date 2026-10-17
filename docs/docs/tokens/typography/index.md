# Typography

The three font stacks, the type scale in rem, and the smallest size each kind of text may use.

Two knobs size the whole scale. Set them on `:root`, in rem, in CSS of your own; a knob set on `body` or on a section changes nothing. Components read the `--luz-text-*` steps, never the knobs.

### Font roles

These four ship with core, not with tokens.

### Type scale and minimum sizes

Every size is in `rem`, so text follows the font size the reader sets in the browser, not only page zoom (WCAG 1.4.4). The scale is the same at every viewport width: no breakpoint makes text smaller. Above the 16px base each step is the one before times 1.25, rounded to 1/16 rem (a whole pixel at the default); below it are the readability floors. The Formula column is the chain as the stylesheet writes it; a browser that has `round()` rounds each step to 1/16 rem, which gives the Value column.

- **Body text** is `--luz-text-body` (17px at the defaults), with a line height of 1.6.
- **Secondary and UI text** is never below `--luz-text-sm` (14px).
- **Nothing** goes below `--luz-text-xs` (12px). Sizes relative to their context (`kbd`, `time`, `output`, inline code, captions) are clamped with `max()` so they cannot fall below the floor inside small text.
- **Form fields** use `--luz-text-control` (core setting): `--luz-text-md` on desktop, `max(1rem, var(--luz-text-base))` at 768px and below and on touch screens, never under 16px, where iOS Safari zooms the page into any smaller field.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
