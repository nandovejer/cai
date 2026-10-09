---
"@cai-ds/tokens": major
"@cai-ds/core": major
"@cai-ds/platform": major
---

Semantic tokens get CAI's own names and surface model. The names and the light/dark layering came from IBM Carbon (layers 01–03, `$overlay`, its icon and border roles); they are replaced.

**Breaking (`@cai-ds/tokens`, `@cai-ds/core`, `@cai-ds/platform`)**

Surfaces now follow one model in every mode. The page and the surfaces on it (cards, dialogs, fields) are one flat face: white in light, gray-90 in dark (it was gray-10 and gray-100, under white and gray-90 layers). Two tones step away from the face: `--cai-surface-muted` (code, wells) one step, `--cai-surface-strong` (table headers, tags, tooltips, toasts) two. Hover takes the muted step and pressed the strong one. Light steps darker, dark steps lighter; the sidebar keeps gray-100 in both.

Icons use the text tokens. `--cai-text-inverse` and `--cai-icon-inverse` had no user in CAI and are removed.

Rename every old token in your CSS:

| Old | New |
| --- | --- |
| `--cai-bg-page` | `--cai-surface-page` |
| `--cai-bg-ui` | `--cai-surface` |
| `--cai-layer-01` | `--cai-surface` |
| `--cai-bg-ui-hover` | `--cai-surface-hover` |
| `--cai-bg-ui-active` | `--cai-surface-pressed` |
| `--cai-layer-02` | `--cai-surface-muted` |
| `--cai-layer-03` | `--cai-surface-strong` |
| `--cai-bg-overlay` | `--cai-scrim` |
| `--cai-bg-media` | `--cai-surface-media` |
| `--cai-text-placeholder` | `--cai-text-muted` |
| `--cai-text-on-color` | `--cai-text-on-fill` |
| `--cai-text-inverse` | removed: use `--cai-text-on-fill` on a fill, or `--cai-surface-page` |
| `--cai-icon-primary` | `--cai-text-primary` |
| `--cai-icon-secondary` | `--cai-text-secondary` |
| `--cai-icon-inverse` | removed: use `--cai-text-on-fill` |
| `--cai-border-subtle` | `--cai-divider` |
| `--cai-border-strong` | `--cai-outline` |
| `--cai-border-interactive` | `--cai-focus-ring` |

A custom theme renames the same properties; one that set both `--cai-bg-ui` and `--cai-layer-01` keeps one `--cai-surface`. `text-primary`, `text-secondary`, `text-disabled`, `brand-*`, `color-*`, `sidebar-*` and `input-*` keep their names.

`pnpm check:contrast` now measures 1265 pairs in 11 theme/mode combinations (status colours are also measured as plain text on the hovered and muted surfaces).
