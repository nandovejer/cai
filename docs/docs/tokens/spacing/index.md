# Spacing and sizing

The space scale for gaps and padding, and the heights of buttons and fields.

Take every gap, padding and margin from this scale, so spacing lines up across components. Use the smaller steps inside a component and the larger ones between sections.

A 2px hairline, then the unit `--luz-space-unit` (0.25rem, 4px at a 16px root) times 1, 2, 3, 4, 6, 8, 12, 16 and 24: each power of two and its 1.5× half step. The unit is in rem, so spacing follows the font size the reader sets in the browser, as text does. Set it on `:root` to change the whole scale; components read the steps, never the unit.

### Control heights

`tokens.json → control`

44px is the WCAG 2.5.5 target size; the other steps are about 1.25× apart on the 4px grid.

- `--luz-control-sm`: close buttons and other small icon targets.
- `--luz-control-md`: small buttons.
- `--luz-control-lg`: buttons and fields, the default.
- `--luz-control-xl`: large buttons.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
