# Color

Every colour a component may use, named by its job, with its value in light, dark and high contrast side by side.

Pick a token by its job, not by its colour. The name stays the same in every mode; the value changes.

- **Surfaces** for backgrounds, **text** for words, **lines** for borders and dividers.
- **Brand** for links and the main action; the **fill** tokens behind white text.
- **Status** for success, warning, danger and information, and nothing else.
- **Sidebar**, **inputs** and **code syntax** for those components only.

Each token shows its job, then its value in light, dark and high contrast, side by side. One click on a name selects all of it, ready to copy. In Figma the same names are variables: see [Tokens in Figma](https://nandovejer.github.io/luz/docs/tokens/figma/).

**All 55 semantic tokens, in 9 groups**

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
