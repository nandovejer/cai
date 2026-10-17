# Color palette

The primitive colour scales. For theme authors only: components never use them.

Building a component? Use the [semantic colours](https://nandovejer.github.io/luz/docs/tokens/color/) instead. These scales are what a theme points the semantic tokens at.

Raw values, never used directly in components. LUZ's own palette: `scripts/build-palette.js` computes every step in OKLCH from one lightness curve shared by all families, a chroma curve and a hue per family.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
