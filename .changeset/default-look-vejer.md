---
"@cai-ds/tokens": major
"@cai-ds/core": major
---

The default look is Vejer. CAI ships one look, in three color modes, and no theme file: `cai-theme-minimalist.css` and `cai-theme-vejer.css` are gone.

**Breaking, and visible on every page that loads the tokens**

- **Colors.** The semantic tokens of `light`, `dark` and `high-contrast` take the values the Vejer theme had: warm whitewash and sandstone surfaces, iron-black text, sky-blue links and actions, a dark wooden sidebar. Contrast is unchanged in kind: the same minimums, measured by `pnpm check:contrast` in all three modes (the numbers differ, because the colors do).
- **Type.** Running text is the serif (`--cai-font-body` is `--cai-font-serif`), at 17px with a 1.6 line height; labels, tables and navigation keep the sans. `--cai-font-serif` is `"ET Book", charter, "Bitstream Charter", "Sitka Text", cambria, georgia, serif`.
- **Links.** Every link outside a `<nav>` is underlined.
- **Shape.** `--cai-radius-md`, `-lg` and `-xl` are 6px, 14px and 22px (were 4, 8 and 12); the shadows are warm brown, heavier black in dark mode, an edge in high contrast.
- **Removed.** `data-theme="vejer"` and `data-theme="minimalist"`, and `dist/themes/cai-theme-*.css`. A page that set `data-theme="vejer"` now sets nothing (`light`); one that set `data-theme="minimalist"` should make its own theme (below).
- **Removed JS.** `CUSTOM_THEMES` is no longer exported from `@cai-ds/core`. `getInitialTheme()` returns the theme the markup sets, else `light`, and no longer `minimalist`: `cai.js` stops overriding a `data-theme` you wrote.

**Added**

- `@cai-ds/core/themes/_template.css`: the starting point of a theme of your own, with every semantic token in three blocks, valid as it is.
- `<html data-cai-themes="my-brand other">`: the names of your themes, so the stored choice is accepted and the mode switcher remembers it. `getCustomThemes()` is exported.
- The page `/docs/tokens/themes/` and a test (`tests/theme-template.test.js`) that keeps the template and the page in step with `semantic.css`.
- Date and time pickers are `color-scheme: light` unless an ancestor is `data-theme="dark"` (they were dark by default).

**How to migrate.** If you used `vejer`: remove the stylesheet and the attribute; nothing else. If you used `minimalist`, or you do not want the new look: copy `themes/_template.css`, set the values you had, and load it with `data-theme="my-brand"`. A page that overrode semantic tokens keeps working, with the check `npx @cai-ds/tokens check-contrast`.

**Not changed.** The primitives and their names, the spacing and control scales, every class and attribute, and the DTCG file (a mode may redraw a shadow; the semantic collection holds colors only).
