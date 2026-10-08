---
"@cai-ds/tokens": minor
"@cai-ds/core": major
---

A new reading theme, `vejer`, replaces `ricardoymortimer`. Body text gets its own font setting, and more theme colours are checked for contrast.

**Breaking (`@cai-ds/core`)**

- The `ricardoymortimer` theme is removed, with its font, Comic Shanns. `@cai-ds/core` no longer ships `dist/fonts/`. To migrate, replace `cai-theme-ricardoymortimer.css` with `cai-theme-vejer.css` and `data-theme="ricardoymortimer"` with `data-theme="vejer"`. Vejer's default mode is light, not dark: add `data-mode="dark"` to keep a dark page.
- The sidebar scroll-spy now sets `aria-current="true"` on the link to the section in view, instead of `aria-current="page"`. `"page"` is kept for a sidebar link to another document. If your CSS selects `.cai-sidebar__link[aria-current="page"]`, select `.is-active` instead.
- The minimalist and vejer themes darken `--cai-border-strong` so the white text of `.cai-badge--gray` reaches 4.5:1. The minimalist theme's disabled text, field and strong borders, and dark-mode status colours are darker or lighter so they reach 3:1 and 4.5:1 on every surface. Dark mode gets its own `--cai-color-danger-fill`.

**New (`@cai-ds/core`)**

- `data-theme="vejer"`, in light, dark and high contrast, inspired by Vejer de la Frontera (Cádiz). Surfaces are whitewash and sandstone, text is iron black (warm stone and wood at night), and sky blue marks links and actions only. Terracotta appears only as the rule of a quotation, and status colours keep their hues. Running text and headings are set in ET Book at 17px, with a line height of 1.6. Controls, labels, tables and navigation stay in the sans. Every link is underlined, and radii are softer.
- `--cai-font-body`, a setting that defaults to `var(--cai-font-sans)`: the font of `<body>` and of the text that inherits from it. Form fields, labels, tables, tabs, breadcrumbs, the sidebar and tooltips set `--cai-font-sans` themselves, so they never take a serif body font.

**New (`@cai-ds/tokens`)**

- Four primitives: `--cai-green-70` (`#0e6027`), `--cai-red-70` (`#a2191f`), `--cai-teal-70` (`#005d5d`) and `--cai-purple-70` (`#6929c4`).

**Changed (`@cai-ds/tokens`)**

The status and extended colours now reach 4.5:1 on every surface, including `--cai-layer-03` (tooltips, toasts, table headers), where they fell to 3.3–3.8:1. Each one keeps its hue and its meaning; only the shade changes.

- Light and high contrast:
  - `--cai-color-success` is `green-70`, instead of `green-60`.
  - `--cai-color-danger` is `red-70`, instead of `red-60`.
  - `--cai-color-teal` is `teal-70`, instead of `teal-60`.
  - `--cai-color-purple` is `purple-70`, instead of `purple-60`.
  - In light, `--cai-color-code` is `purple-70`, instead of `purple-60`.
  - `--cai-color-danger-fill` stays `red-60` in light, so the danger button keeps its red.
- Dark:
  - `--cai-color-success` is `green-20` and `--cai-color-danger` is `red-20`.
  - `--cai-color-warning` is `yellow-20`, `--cai-color-info` is `blue-20` and `--cai-color-teal` is `teal-20`.
  - `--cai-color-code` is `purple-20`.
- `--cai-input-border` is `gray-60` in light, instead of `gray-50`, and `gray-40` in dark, instead of `gray-60`. Field boundaries now reach 3:1 on every surface, including `--cai-layer-03` and a hovered row (WCAG 1.4.11). High contrast is unchanged (`#000`).
- Dark mode `--cai-text-disabled` is `gray-40` instead of `gray-50`, so disabled text reaches 3:1 on `--cai-layer-03`.

**Checks**

- `pnpm check:contrast` now measures the custom themes in every mode. In every theme it measures disabled text, status colours, their tints and code on `--cai-layer-03`, and the white text of `.cai-badge--gray`. It also measures the field border on every surface.
- The home page's example form repeats its confirmation in a `role="status"` region, and its header keeps the visual order of the markup at narrow widths.
