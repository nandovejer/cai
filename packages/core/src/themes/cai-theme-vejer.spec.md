# CAI theme spec: Vejer (`cai-theme-vejer`)

The reference for anyone who changes `cai-theme-vejer.css`. Read it before overriding a token.

## 1. Purpose

A reading theme for documentation, articles and content sites, inspired by Vejer de la Frontera (Cádiz): whitewashed walls, sandstone arches, terracotta roofs, a clear Andalusian sky and black wrought iron. Its mood is sunlit, calm and Mediterranean. It replaces `ricardoymortimer`.

The theme is colour and type only. It ships no photograph, image or font file.

```html
<link rel="stylesheet" href="…/@cai-ds/tokens/dist/cai-tokens.css">
<link rel="stylesheet" href="…/@cai-ds/core/dist/cai.css">
<link rel="stylesheet" href="…/@cai-ds/core/dist/themes/cai-theme-vejer.css">
<html lang="en" data-theme="vejer">                          <!-- light (default) -->
<html lang="en" data-theme="vejer" data-mode="dark">
<html lang="en" data-theme="vejer" data-mode="high-contrast">
```

## 2. Rules

1. **Sky blue means "you can act on it" (§6).** It is used only for links, buttons, focus and the selected state.
2. **Sandstone and terracotta are decoration.** They are used for surfaces, hairlines and the rule of a quotation. They never mark a state: ochre would read as warning and terracotta as danger (RL-15).
3. **Status colours keep their hues.** Green is success, red danger, yellow warning, blue info. A shade can be deeper than the base primitive so it reaches 4.5:1 on the warm surfaces; the hue never changes.
4. **Every link in content, cards and lists is underlined.** The sky blue and the iron text are close in lightness, so colour alone cannot mark a link (WCAG 1.4.1, RL-6). Links inside a `<nav>` are exempt, because their position says they are links. Button classes remove the underline themselves.
5. **Serif for reading, sans for operating.** `--cai-font-body` and `--cai-font-heading` are the serif. Controls, labels, legends, helper and error text, tables, navigation and tooltips stay in `--cai-font-sans`; code stays in `--cai-font-mono`.
6. **Running text is 17px (1.0625rem) with a line height of 1.6**, for ET Book's small x-height.
7. **Soft radii, like the arches:** `--cai-radius-md` 6px, `-lg` 14px, `-xl` 22px.
8. **High contrast has no tint.** Its surfaces are white and grey, as in the base high-contrast mode. Primary and secondary text are both near-black, so nothing depends on telling them apart.

## 3. Fonts

| Role | Token | Value |
| --- | --- | --- |
| Running text | `--cai-font-body` | `var(--cai-font-serif)` |
| Headings | `--cai-font-heading` | `var(--cai-font-serif)` |
| Serif | `--cai-font-serif` | `"ET Book", charter, "Bitstream Charter", "Sitka Text", cambria, georgia, serif` |
| UI | `--cai-font-sans` | base system sans, unchanged |
| Code | `--cai-font-mono` | base system mono, unchanged |

## 4. Palette

| Source | Role | Light | Dark | High contrast |
| --- | --- | --- | --- | --- |
| Whitewash | Page / UI surface | `#fbf8f2` / `#fffdf9` | `#1c1712` / `#241e18` | `#fff` / `#fff` |
| Sandstone | Hover / pressed | `#f4ede0` / `#ebe0cc` | `#2e261f` / `#3a3028` | `gray-10` / `gray-20` |
| Sandstone | Layer 03 / hairline | `#efe6d6` / `#e3d4b8` | `#3a3028` / `#43382d` | `gray-20` / `gray-70` |
| Wrought iron, door wood | Text / secondary | `#231c16` / `#6b5a48` | `#f3ece1` / `#b8a690` | `#000` / `gray-100` |
| — | Placeholder / disabled | `#7a6a58` / `#8f8172` | `#a08f7a` / `#877a69` | `gray-70` / `gray-60` |
| — | Field border | `#8b7d6f` | `#877a69` | `#000` |
| — | Strong border, gray badge fill (white text 4.6 / 4.8) | `#807366` | `#7d7062` | `#000` |
| Sky | Links, focus, brand | `#2365a6` | `#6fb1ec` | `blue-80` / focus `#000` |
| Sky | Button fill (white text) | `#2365a6` | `#1d63a8` | `blue-80` |
| Wooden door | Sidebar | `#2a211a`, text `#e3d5bf` | `#14100c`, text `#cbbba5` | `#000`, text `gray-30` |
| Terracotta | Quotation rule only | `#b8613f` | `#c9785a` | `#000` |
| — | Success / danger | `#177734` / `#ca1c25` | `green-30` / `red-30` | `#105224` / `#8d131a` |
| — | Warning / info | `yellow-60` / `blue-70` | `yellow-30` / `blue-30` | `#5a4300` / `blue-80` |
| — | Code | `#803ae9` | `purple-40` | `#5828a1` |

## 5. Contrast

`pnpm check:contrast` measures every pair in every mode. Some pairs are measured only on the custom themes for now: status and code colours on `layer-03` and as plain text, and the field border on every surface. These are the weakest measured pairs.

| Pair | Light | Dark | High contrast |
| --- | --- | --- | --- |
| Text, worst surface | 12.9 | 11.0 | 15.9 |
| Secondary text, worst surface | 5.1 | 5.5 | 13.7 |
| Placeholder on the input | 5.1 | 5.3 | 7.8 |
| Disabled text, worst surface (needs 3) | 3.1 | 3.1 | 3.8 |
| Links, worst surface | 5.2 | 6.5 | 10.3 |
| White on a fill | 5.7 | 5.0 | 9.4 |
| Focus ring, worst surface (needs 3) | 4.9 | 5.6 | 15.9 |
| Field border, worst surface (needs 3) | 3.2 | 3.1 | 15.9 |
| Sidebar text | 6.8 | 6.7 | 6.3 |
| Status text, worst surface | 4.6 | 5.8 | 7.1 |
| Code on `layer-03` | 4.6 | 5.5 | 7.1 |

## 6. Changing the theme

- Change a colour in all three modes, then run `pnpm check:contrast`. Never add an entry to `tests/fixtures/red-line-debt.json` to pass it.
- The `--vej-*` variables are private: never reference them outside this file.
- Keep the three `[data-mode]` blocks: the contrast check fails if one is missing.
- Do not add a terracotta or ochre token for a state, a tag or an alert.
