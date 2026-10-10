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

Available: `alert`, `avatar`, `breadcrumb`, `button`, `card`, `code`, `copy-btn`, `figure`, `form`, `icon-grid`, `modal`, `mode-switcher`, `player`, `progress`, `sidebar`, `table`, `tabs`, `tag`, `toast`, `tooltip` (+ `_animations` for the shared keyframes). Each has a `.min.css` twin.

### Using a single JS behavior

The behavior modules are dependency-free browser ESM — import them individually; nothing runs until you call the module's `init*()`:

```js
import { applyTheme, initThemeSystem } from "@cai-ds/core/theme";
import { copyToClipboard } from "@cai-ds/core/clipboard";
import { mountPlayer } from "@cai-ds/core/player";
```

## Language

Text that CAI's JavaScript writes (button names such as "Pause" or "Copy", status messages such as "Copied to clipboard") follows the page language. It ships English (`en`) and Spanish (`es`).

- **Language** comes from the nearest `lang` attribute of the element, then `<html lang>`. A regional tag falls back to its primary subtag (`es-MX` → `es`), and a language without strings falls back to English. A fragment with its own `lang` (WCAG 3.1.2) gets its own strings.
- **No `lang` at all:** English, and one console warning. Set `<html lang="…">` (WCAG 2.2 SC 3.1.1).
- **Override one string** with `data-cai-label-<key>` on the element or any ancestor, such as the component root: `<div class="cai-player" data-cai-label-pause="Pausar">`. Text and `aria-label`s you write in the HTML are kept, except the names that change with the state (play or pause, mute or unmute, full screen): set those with `data-cai-label-*`.
- **Add a language:**

```js
import { registerLocale } from "@cai-ds/core/i18n";

registerLocale("fr", { play: "Lire", pause: "Pause", copy: "Copier" });
```

Keys: `play`, `pause`, `mute`, `unmute`, `fullscreen`, `exitFullscreen`, `captions`, `captionsOff`, `loading`, `midiError`, `timeOf` (`{current}`, `{total}`), `copy`, `copied`, `copiedStatus`, `copyFailed`, `codeExample` (`{lang}`), `copyCode` (`{n}`), `applyTheme`, `themeApplied`. A key in camelCase becomes kebab-case in the attribute: `data-cai-label-exit-fullscreen`. Missing keys fall back to English.

`registerLocale()` must reach the same module instance the components use: with the auto-initializing entry import it from `@cai-ds/core`, with the individual modules from `@cai-ds/core/i18n`. Strings written later (play/pause, copied, status messages) use it right away; the ones written when a component initializes (code block names) need it registered before the `init*()` call.

## Package exports

- **`.`** → `cai.js` — Entry: re-exports the full API + auto-initializes everything
- **`./css`** → `cai.css` — Full CSS bundle (`./css/min` for the minified twin)
- **`./base.css`** → Settings + reset + elements: the prerequisite for per-component CSS
- **`./components/*`** → Per-component CSS files (standalone use)
- **`./theme`**, **`./sidebar`**, **`./clipboard`**, **`./modal`**, **`./highlight`**, **`./player`**, **`./tabs`** → Individual JS behavior modules (no side effects on import)
- **`./i18n`** → Strings for the JS-generated text (`t`, `getLang`, `registerLocale`)
- **`./midi`** → `midi.js` — MIDI player (lazy-loaded)
- **`./utils`** → Pure helper functions (`formatTime`, `escapeHtml`, …)
- **`./themes/*`** → Custom theme stylesheets
  - `cai-theme-minimalist.css`
  - `cai-theme-vejer.css`

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

- **Minimalist** (`data-theme="minimalist"`) — one system sans throughout, headings included, warm neutrals
- **Vejer** (`data-theme="vejer"`) — a reading theme inspired by Vejer de la Frontera: ET Book for running text and headings, whitewash and sandstone surfaces, iron-black text, sky-blue links and actions, every link underlined

All themes support light, dark, and high-contrast color modes via `data-mode`.

## Vanilla JS behaviors

The core JS (`cai.js`) provides no-dependency implementations of:

- Theme switching and persistence
- Sidebar toggle and mobile overlay
- Seekbar and media player controls
- Syntax highlighting for code blocks
- And more...

## License

MIT. Core ships no fonts; the serif used by the `vejer` theme (ET Book, MIT) comes with `@cai-ds/tokens`.
