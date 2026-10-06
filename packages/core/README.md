# @cai-ds/core

Reusable CSS components and vanilla JS behaviors for the CAI Design System.

> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

## Prerequisites

Requires `@cai-ds/tokens` (declared as a peer dependency), loaded first. `@cai-ds/platform` is optional and builds on this package.

## Installation

```bash
npm install @cai-ds/tokens @cai-ds/core
```

## Usage

### Via npm/bundler

```js
import '@cai-ds/tokens'
import '@cai-ds/core'
```

### Via CDN (jsDelivr)

```html
<!-- Tokens first -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@3.0.0/dist/cai-tokens.css">

<!-- Then core -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.js"></script>

<!-- Custom theme (optional) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/themes/cai-theme-minimalist.css">
<html data-theme="minimalist">
```

### Using a single component (standalone CSS)

Every component also ships as its own file in `dist/components/` — load only what you need. Tokens come first, then `base.css` (core settings such as z-index and motion, reset, bare elements):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@3.0.0/dist/cai-tokens.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/base.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/components/button.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/components/card.css">
```

Available: `alert`, `avatar`, `breadcrumb`, `button`, `card`, `code`, `copy-btn`, `figure`, `form`, `icon-grid`, `modal`, `player`, `progress`, `sidebar`, `table`, `tabs`, `tag`, `theme-switcher`, `toast`, `tooltip` (+ `_animations` for the shared keyframes). Each has a `.min.css` twin.

### Using a single JS behavior

The behavior modules are dependency-free browser ESM — import them individually; nothing runs until you call the module's `init*()`:

```js
import { applyTheme, initThemeSystem } from "@cai-ds/core/theme";
import { copyToClipboard } from "@cai-ds/core/clipboard";
import { mountPlayer } from "@cai-ds/core/player";
```

## Package exports

- **`.`** → `cai.js` — Entry: re-exports the full API + auto-initializes everything
- **`./css`** → `cai.css` — Full CSS bundle (`./css/min` for the minified twin)
- **`./base.css`** → Settings + reset + elements: the prerequisite for per-component CSS
- **`./components/*`** → Per-component CSS files (standalone use)
- **`./theme`**, **`./sidebar`**, **`./clipboard`**, **`./modal`**, **`./highlight`**, **`./player`**, **`./tabs`**, **`./toggle`** → Individual JS behavior modules (no side effects on import)
- **`./midi`** → `midi.js` — MIDI player (lazy-loaded)
- **`./utils`** → Pure helper functions (`formatTime`, `escapeHtml`, …)
- **`./themes/*`** → Custom theme stylesheets
  - `cai-theme-minimalist.css`
  - `cai-theme-ricardoymortimer.css`

## Components included

- Buttons (primary, secondary, ghost, outline, danger)
- Forms (inputs, selects, checkboxes, toggles, file upload)
- Cards, tables, tabs, breadcrumbs, code blocks
- Players (video, audio, MIDI)
- Sidebar navigation
- Alerts, toasts, badges, avatars
- And more...

## Themes

Two built-in custom themes are available:

- **Minimalist** (`data-theme="minimalist"`) — Gidole throughout, warm neutrals
- **Ricardo & Mortimer** (`data-theme="ricardoymortimer"`) — Expressive, animated series–inspired

All themes support light, dark, and high-contrast color modes via `data-mode`.

## Vanilla JS behaviors

The core JS (`cai.js`) provides no-dependency implementations of:

- Theme switching and persistence
- Sidebar toggle and mobile overlay
- Seekbar and media player controls
- Syntax highlighting for code blocks
- And more...

## License

MIT, fonts included: Comic Shanns, used by one custom theme, is MIT licensed (`dist/fonts/custom-faces/LICENSE-ComicShanns.txt`).
