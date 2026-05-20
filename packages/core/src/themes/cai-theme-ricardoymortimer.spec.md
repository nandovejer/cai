# CAI Theme Spec — Ricardo & Mortimer (`cai-theme-ricardoymortimer`)

> **AI build guide.** This file is the authoritative reference for any agent or collaborator
> who needs to create, extend, or maintain `cai-theme-ricardoymortimer.css`.
> Follow the constraints in this file before overriding any semantic token.

---

## 1. Purpose

`cai-theme-ricardoymortimer` is a custom CAI theme that reproduces the official visual identity
of the Adult Swim animated series *Rick and Morty* (Ricardo & Mortimer). It maps every CAI semantic token
to the series' canonical color palette, typography references, and design morphology.

**Activation:**
```html
<html data-theme="ricardoymortimer">
```

**CDN usage (self-contained — does NOT require cai-tokens.css):**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/themes/cai-theme-ricardoymortimer.css">
```

---

## 2. Official Color Palette

### Ricardo Sanchez — Cool / Clinical
| Element     | Hex       | Name                    | Use in theme              |
|-------------|-----------|-------------------------|---------------------------|
| Skin        | `#DBD6D0` | Catacomb Walls          | Ricardo-accent (decorative)  |
| Hair        | `#AEE6E3` | Cool Crayon             | `--cai-text-secondary`, icons, borders |
| Shirt       | `#BBE0F2` | Fountains of Budapest   | `--cai-color-info`        |
| Lab coat    | `#FCFAFB` | Dr. White               | `--cai-text-on-color` fallback |
| Trousers    | `#756951` | Hip Waders              | (decorative only)         |

### Mortimer Smith — Warm / Primary
| Element     | Hex       | Context                  | Use in theme              |
|-------------|-----------|--------------------------|---------------------------|
| Shirt       | `#F7F07B` | Bright yellow            | `--cai-color-code`, `--cai-color-purple` |
| Skin        | `#F8BD91` | Warm peach               | (decorative only)         |
| Hair        | `#70592D` | Earth brown              | (decorative only)         |
| Trousers    | `#3A4767` | Desaturated navy         | (decorative only)         |

### Multiverso & Technology — Brand Palette
| Element           | Hex       | Name            | Use in theme                                   |
|-------------------|-----------|-----------------|------------------------------------------------|
| Portal green      | `#08C952` | Battletoad      | `--cai-brand-primary`, `--cai-color-success`, `--cai-sidebar-active-bg`, `--cai-border-interactive` |
| Portal border     | `#FCE46D` | Yellow Tan      | `--cai-color-warning`, `--cai-color-warning-accent` |
| Space background  | `#160440` | Floppy Disk     | `--cai-bg-page`, page background               |
| Space deep        | `#0d0221` | (deeper)        | `--cai-sidebar-bg`, deepest layer              |
| Space surface     | `#1a0f3c` | (lighter)       | `--cai-bg-ui`, layer 01                        |

---

## 3. Typography

### Creative Identity (Series Title)
- Reference font: **"Get Schwifty"** (created by Jonizaak, community standard)
- Style: electronic, vibrant, "crazy lines" (not available as a web-safe font)
- **CAI fallback:** `"Helvetica Neue", "Arial Narrow", system-ui, sans-serif`
- *Do not attempt to embed Get Schwifty as a web font* — use system fonts with tight letter-spacing

### Corporate Identity (Adult Swim)
- Font: **Neue Helvetica 77 Condensed Bold** / **Helvetica Neue Condensed Black**
- Used in: credits, on-air promos, lower thirds
- **CAI approximation:** keep `--cai-font-sans` as-is (IBM Plex Sans is a reasonable neutral)

### Token decisions
The theme intentionally does **not** override `--cai-font-sans` or `--cai-font-mono`
because IBM Plex is a valid neutral UI font. Typography character comes from color and
spacing, not from a custom font that would require an external dependency.

---

## 4. Morphology → CSS Design Decisions

| Series rule                     | CSS interpretation                                          |
|---------------------------------|-------------------------------------------------------------|
| Ricardo's head: **pill shape**     | Interactive elements (buttons, badges) use `--cai-radius-full` instead of `--cai-radius-md` |
| Mortimer's head: **round**         | Cards and panels keep `--cai-radius-lg` (rounder than base) |
| Eyes: **scribble / asterisk**   | Avoid overly sharp corners; minimum radius is `--cai-radius-sm` |
| Earth = deliberately "shabby"   | Backgrounds are dark/muted; high contrast reserved for interactive elements |
| Multiverse = vibrant / chaotic  | Interactive states use bright portal green `#08C952` at full saturation |
| Portal energy border: yellow    | Warning states and focus rings use `#FCE46D`                |

---

## 5. Full Semantic Token Mapping

| CAI Semantic Token              | Value                        | Source              | Rationale                              |
|---------------------------------|------------------------------|---------------------|----------------------------------------|
| `--cai-bg-page`                 | `#160440`                    | Floppy Disk         | Deep space — the "Earth" of the theme  |
| `--cai-bg-ui`                   | `#1a0f3c`                    | Space surface       | Elevated surface                       |
| `--cai-bg-ui-hover`             | `#22145a`                    | Custom              | Hover lift                             |
| `--cai-bg-ui-active`            | `#2a1870`                    | Custom              | Active press                           |
| `--cai-bg-overlay`              | `rgba(13,2,33,0.85)`         | Space deep alpha    | Modal backdrop                         |
| `--cai-text-primary`            | `#e8f4f8`                    | Custom pale blue    | Readable on dark space                 |
| `--cai-text-secondary`          | `#AEE6E3`                    | Cool Crayon         | Ricardo's hair — secondary text           |
| `--cai-text-placeholder`        | `rgba(174,230,227,0.45)`     | Cool Crayon α45     | Muted placeholder                      |
| `--cai-text-disabled`           | `rgba(174,230,227,0.25)`     | Cool Crayon α25     | Disabled state                         |
| `--cai-text-on-color`           | `#160440`                    | Floppy Disk         | Dark text on portal green              |
| `--cai-text-inverse`            | `#160440`                    | Floppy Disk         | Inverse text                           |
| `--cai-border-subtle`           | `rgba(174,230,227,0.18)`     | Cool Crayon α18     | Low-emphasis dividers                  |
| `--cai-border-strong`           | `rgba(174,230,227,0.45)`     | Cool Crayon α45     | Visible borders                        |
| `--cai-border-interactive`      | `#08C952`                    | Battletoad          | Focus/interactive borders              |
| `--cai-brand-primary`           | `#08C952`                    | Battletoad          | Main brand — portal green              |
| `--cai-brand-hover`             | `#0ae55b`                    | Portal hover        | Brighter on hover                      |
| `--cai-brand-active`            | `#0fff6f`                    | Portal active       | Brightest on press                     |
| `--cai-brand-subtle`            | `rgba(8,201,82,0.12)`        | Battletoad α12      | Tinted backgrounds                     |
| `--cai-icon-primary`            | `#e8f4f8`                    | Text pale blue      | Icons on dark backgrounds              |
| `--cai-icon-secondary`          | `#AEE6E3`                    | Cool Crayon         | Decorative icons                       |
| `--cai-icon-inverse`            | `#160440`                    | Floppy Disk         | Icons on portal green                  |
| `--cai-layer-01`                | `#1a0f3c`                    | Space surface       | First elevation layer                  |
| `--cai-layer-02`                | `#160440`                    | Floppy Disk         | Second layer                           |
| `--cai-layer-03`                | `#0d0221`                    | Space deep          | Third / deepest layer                  |
| `--cai-sidebar-bg`              | `#0d0221`                    | Space deep          | Sidebar — deepest element              |
| `--cai-sidebar-text`            | `#AEE6E3`                    | Cool Crayon         | Resting sidebar links                  |
| `--cai-sidebar-text-hover`      | `#e8f4f8`                    | Text primary        | Hovered sidebar links                  |
| `--cai-sidebar-hover`           | `#1a0f3c`                    | Space surface       | Sidebar hover background               |
| `--cai-sidebar-active-bg`       | `#08C952`                    | Battletoad          | Active nav item — portal green         |
| `--cai-sidebar-active-text`     | `#160440`                    | Floppy Disk         | Text on active nav (dark on green)     |
| `--cai-sidebar-border`          | `rgba(174,230,227,0.1)`      | Cool Crayon α10     | Sidebar dividers                       |
| `--cai-sidebar-label`           | `rgba(174,230,227,0.45)`     | Cool Crayon α45     | Group labels                           |
| `--cai-sidebar-logo-bg`         | `#08C952`                    | Battletoad          | Logo background                        |
| `--cai-color-success`           | `#08C952`                    | Battletoad          | Success = portal energy                |
| `--cai-color-success-bg`        | `rgba(8,201,82,0.12)`        | —                   | —                                      |
| `--cai-color-danger`            | `#ff4757`                    | Custom              | Danger / Ricardo's blaster                |
| `--cai-color-danger-bg`         | `rgba(255,71,87,0.12)`       | —                   | —                                      |
| `--cai-color-warning`           | `#FCE46D`                    | Yellow Tan          | Portal border energy                   |
| `--cai-color-warning-accent`    | `#FCE46D`                    | Yellow Tan          | —                                      |
| `--cai-color-warning-bg`        | `rgba(252,228,109,0.12)`     | —                   | —                                      |
| `--cai-color-info`              | `#BBE0F2`                    | Fountains Budapest  | Ricardo's shirt — informational           |
| `--cai-color-info-bg`           | `rgba(187,224,242,0.12)`     | —                   | —                                      |
| `--cai-input-bg`                | `#1a0f3c`                    | Space surface       | Input fields                           |
| `--cai-input-border`            | `rgba(174,230,227,0.35)`     | Cool Crayon α35     | Input borders                          |
| `--cai-color-teal`              | `#AEE6E3`                    | Cool Crayon         | Ricardo's hair — teal accent              |
| `--cai-color-teal-bg`           | `rgba(174,230,227,0.12)`     | —                   | —                                      |
| `--cai-color-purple`            | `#F7F07B`                    | Mortimer yellow        | Mortimer's shirt — replaces purple slot   |
| `--cai-color-purple-bg`         | `rgba(247,240,123,0.12)`     | —                   | —                                      |
| `--cai-color-code`              | `#F7F07B`                    | Mortimer yellow        | Code syntax highlight accent           |

---

## 6. Non-Color Primitives Included

The following tokens from `cai-tokens.css` Layer 1 are embedded in the theme file
to make it self-contained (no dependency on `cai-tokens.css`):

- Spacing: `--cai-space-01` through `--cai-space-12`
- Sizing: `--cai-size-height-sm/md/lg/xl`
- Typography: `--cai-font-sans/serif/mono`, `--cai-text-xs` through `--cai-text-4xl`
- Radius: `--cai-radius-none/sm/md/lg/xl/full`
- Shadows: `--cai-shadow-sm/md/lg` (with portal-green tint on shadow color)

**Color primitives (`--cai-blue-*`, `--cai-gray-*`, etc.) are NOT included.**
The theme does not extend the CAI palette — it defines its own private `--rm-*` variables.

---

## 7. Extension Rules

When extending or modifying this theme:

1. **Never use `--cai-*` primitive tokens** (e.g. `--cai-gray-80`) as values — define new `--rm-*` privates instead.
2. **All three theme contexts must be covered**: `[data-theme="rickymorty"]`, hover, focus, active states.
3. **Contrast minimum**: text on `#08C952` must be `#160440` (passes WCAG AA). Check with a contrast checker.
4. **Do not add new font families** — no runtime dependencies allowed (CAI vanilla-first rule).
5. **To add a dark variant**: create `cai-theme-rickymorty-dark.css` following the same structure; do not add it inside this file.
6. **Shadows** in this theme include a subtle portal-green tint — maintain that aesthetic.
