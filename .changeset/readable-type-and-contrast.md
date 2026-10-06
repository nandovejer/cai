---
"@cai-ds/tokens": minor
"@cai-ds/core": minor
"@cai-ds/platform": patch
---

Readable minimum text sizes and WCAG 2.2 AA fixes.

**Type scale**

- `@cai-ds/tokens`: every `--cai-text-*` token is now in `rem`, so text follows the reader's browser font size and not only page zoom (WCAG 1.4.4). The small steps are raised: `--cai-text-xs` 11px → 0.75rem (12px, absolute floor), `--cai-text-sm` 12px → 0.875rem (14px, floor for secondary/UI text), `--cai-text-md` 14px → 0.9375rem (15px). `base` and larger keep their size.
- `@cai-ds/core`: new setting `--cai-text-control` for form-field text: `--cai-text-md`, and `--cai-text-base` (16px) at 768px and below and on touch screens, so iOS Safari no longer zooms on focus.
- `@cai-ds/core`: helper and error text, tooltips and the stacked-table column labels use `--cai-text-sm`; `kbd`, `time`, `output`, inline code and captions can no longer fall below the floor inside small text; the last fixed `px` font sizes are now tokens.
- Buttons, tags, badges, copy and theme buttons use `min-height`, so their label can grow with the font size.

**Contrast and states**

- `@cai-ds/tokens`: new semantic tokens `--cai-brand-fill`, `--cai-brand-fill-hover`, `--cai-brand-fill-active` and `--cai-color-danger-fill` for solid surfaces under `--cai-text-on-color` (primary and danger buttons, badges, checked checkbox, toggle). In dark mode they are a step darker than the brand, so white text reaches 4.5:1.
- `@cai-ds/tokens`: light placeholder, light `--cai-border-strong`, dark placeholder, dark sidebar label, dark `--cai-brand-primary` (blue-40) and dark `--cai-color-danger` (red-40) adjusted to reach 4.5:1 text / 3:1 non-text.
- `@cai-ds/core`: code blocks use `--cai-layer-02` (syntax colors reach 4.5:1), the `tok-name` color and the language badge are readable; the sidebar brand name, nav-toggle bars and logo letter are visible in dark and high contrast; focus rings on the sidebar are visible in high contrast; dimmed theme buttons keep their text contrast; theme buttons take the sidebar's text color; the minimalist theme's muted, sidebar and placeholder text colors reach 4.5:1 and its dark mode gets a darker button fill.
- `@cai-ds/core`: forced-colors (Windows High Contrast) rules for checkbox, radio, toggle, progress and the player bars.

**Keyboard, targets and reflow**

- `@cai-ds/core`: the closed mobile drawer is `visibility: hidden`, so its links no longer take invisible focus; the tooltip opens on keyboard focus and can be hovered; focus styles for `.cai-table-wrap`, tab panels and the nav toggle; 24×24 minimum targets for the toast and modal close buttons and a 24px hit area for the player bars; the toast no longer overflows a 320px screen; smooth scrolling is off under `prefers-reduced-motion`.
- `@cai-ds/core`: copy actions are announced in a polite live region (`#cai-live-region`), success and failure.
- `@cai-ds/platform`: the skip link uses `--cai-brand-fill`; the command-block copy button keeps a visible focus ring in dark mode.
