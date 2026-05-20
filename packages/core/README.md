# @cai-ds/core

Reusable CSS components and vanilla JS behaviors for the CAI Design System.

## Prerequisites

Requires `@cai-ds/tokens` to be loaded first.

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
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css">

<!-- Then core -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js"></script>

<!-- Custom theme (optional) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/themes/cai-theme-minimalist.css">
<html data-theme="minimalist">
```

## Package exports

- **`.`** → `cai.js` — Main entrypoint with JS behaviors
- **`./css`** → `cai.css` — CSS components only
- **`./midi`** → `midi.js` — MIDI player (lazy-loaded)
- **`./themes/*`** → Custom theme stylesheets
  - `cai-theme-minimalist.css`
  - `cai-theme-ricardoymortimer.css`
- **`./utils`** → Utility functions (internal/testing)

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

- **Minimalist** (`data-theme="minimalist"`) — Ultra-light DM Sans, warm neutrals
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

MIT
