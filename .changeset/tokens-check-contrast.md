---
"@cai-ds/tokens": minor
---

A command to check your own colors against the contrast CAI promises: `npx @cai-ds/tokens check-contrast my-theme.css`.

**New (`@cai-ds/tokens`)**

- `cai-tokens check-contrast <file.css…>` (the `bin` of the package, Node 18 or later, no dependency). It reads the `--cai-*` declarations of your files, applies them over CAI's tokens with a small model of the cascade (`:root`, `html`, `[data-theme]`, `[data-mode]`, `@media (prefers-color-scheme)`, `@layer`, `@supports`; a later rule wins at equal specificity, a more specific selector wins over a later one), and measures the same pairs as the component pages in light, dark, high contrast and each custom theme you define.
- WCAG 2.x only: 4.5:1 for text, 3:1 for disabled text, focus rings, field borders and icons. Aims CAI sets itself, stricter than WCAG, are warnings and fail only with `--strict`.
- The report names the declaration that caused each failure (`file:line`), lists the rules it did not read, and counts a color it cannot read (`color-mix()`, `oklch()`, a named color) as a failure: a pair that was not measured is not a pair that passed. `--json` prints the same as JSON. Exit code `0` passes, `1` fails or could not read a color, `2` usage or file error.
- The pairs and the maths now live in one module (`lib/contrast.js`) that CAI's own `check:contrast`, the docs pages and this command share. The pairs the component pages print are all pairs the command checks (a test keeps it so).
- A page in the docs, `/docs/tokens/contrast/`, runs the same check on pasted CSS, with JavaScript; without it the page explains the command.

**Not modeled:** the order of `@layer` blocks, `:is()` and `:has()` selectors, and any media query other than `prefers-color-scheme`. They are listed as ignored.
