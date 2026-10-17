# @luz-ds/core

Reusable CSS components and vanilla JS behaviors for the LUZ Design System.

> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

## Prerequisites

Requires `@luz-ds/tokens` (declared as a peer dependency), loaded first. `@luz-ds/site` is optional and builds on this package.

## Installation

```bash
npm install @luz-ds/tokens @luz-ds/core
```

## Usage

### Via npm/bundler

```js
import '@luz-ds/tokens/css'
import '@luz-ds/core/css'

import '@luz-ds/core'   // optional: the JavaScript, starts every behavior
```

`@luz-ds/core` without `/css` is the script, not the stylesheet.

### Via CDN (jsDelivr)

```html
<!-- Tokens first -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.css">

<!-- Then core -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.js"></script>

<!-- A theme of your own (optional): start from themes/_template.css -->
<link rel="stylesheet" href="/my-brand.css">
<html data-theme="my-brand" data-luz-themes="my-brand">
```

### Using a single component (standalone CSS)

Every component also ships as its own file in `dist/components/` — load only what you need. Tokens come first, then `base.css` (core settings such as z-index and motion, reset, bare elements):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/base.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/components/button.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/components/card.css">
```

Available: `accordion`, `alert`, `avatar`, `breadcrumb`, `button`, `card`, `code`, `copy-btn`, `dropdown`, `figure`, `form`, `icon-grid`, `modal`, `mode-switcher`, `pagination`, `player`, `progress`, `select`, `sidebar`, `table`, `tabs`, `tag`, `toast`, `tooltip` (+ `_animations` for the shared keyframes). Each has a `.min.css` twin.

### Using a single JS behavior

The behavior modules are dependency-free browser ESM — import them individually; nothing runs until you call the module's `init*()`:

```js
import { applyTheme, initThemeSystem } from "@luz-ds/core/theme";
import { copyToClipboard } from "@luz-ds/core/clipboard";
import { mountPlayer } from "@luz-ds/core/player";
```

## Language

Text that LUZ's JavaScript writes (button names such as "Pause" or "Copy", status messages such as "Copied to clipboard") follows the page language. English (`en`) is in the entry. Every other language LUZ ships (Spanish today) is a small file, fetched only for the pages that declare it: the entry makes one request for `i18n-es.min.js` on a page in Spanish and none on a page in English.

- **Language** comes from the nearest `lang` attribute of the element, then `<html lang>`. A regional tag falls back to its primary subtag (`es-MX` → `es`), and a language without strings falls back to English. A fragment with its own `lang` (WCAG 3.1.2) gets its own strings, and its file is fetched too.
- **No `lang` at all:** English, and one console warning. Set `<html lang="…">` (WCAG 2.2 SC 3.1.1).
- **Override one string** with `data-luz-label-<key>` on the element or any ancestor, such as the component root: `<div class="luz-player" data-luz-label-pause="Pausar">`. Text and `aria-label`s you write in the HTML are kept, except the names that change with the state (play or pause, mute or unmute, full screen): set those with `data-luz-label-*`.
- **A language LUZ does not ship** (a page in French, say): set all the `data-luz-label-*` once on `<html>` or `<body>`, or add the language with `registerLocale()` before the entry runs:

```js
import { registerLocale } from "@luz-ds/core/i18n";

registerLocale("fr", { play: "Lire", pause: "Pause", copy: "Copier" });
```

- **The files LUZ ships** are fetched by `loadLocales()`, which the entry calls when it starts. With the individual modules, call it yourself and wait for it before the init functions that write text when they start:

```js
import { loadLocales } from "@luz-ds/core/i18n";
import { initHighlight } from "@luz-ds/core/highlight";
import { initPlayers } from "@luz-ds/core/player";
import { initThemeCycle } from "@luz-ds/core/theme";

await loadLocales();
initHighlight();
initPlayers();
initThemeCycle();
```

`loadLocales()` returns nothing to wait for on a page in English, and a promise that always resolves otherwise: a file that cannot load is one console warning and the English strings. Strings written on a click (copied, sorted, play or pause) read the dictionary when they are written, so they need no wait. `@luz-ds/core/i18n/es` is the Spanish dictionary alone, as a default export.

To check the language file, put an import map with an `integrity` section before the first module script (Chrome 127, Safari 18 and Firefox 138 and later; an older browser ignores the key and loads the file unchecked), on the pages in that language only:

```html
<script type="importmap">
{
  "integrity": {
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/i18n-es.min.js": "sha384-…"
  }
}
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.js" integrity="sha384-…" crossorigin></script>
```

A `<link rel="modulepreload" integrity>` is not a guard outside Chromium: Safari and Firefox do not block a file with a wrong hash. Use it as a performance hint only.

Keys: `play`, `pause`, `mute`, `unmute`, `fullscreen`, `exitFullscreen`, `captions`, `captionsOff`, `loading`, `midiError`, `timeOf` (`{current}`, `{total}`), `copy`, `copied`, `copiedStatus`, `copyFailed`, `codeExample` (`{lang}`), `copyCode` (`{n}`), `applyTheme`, `themeApplied`, `changeMode` and `modeChanged` (`{mode}`), `sortedAsc` and `sortedDesc` (`{column}`), `previous` and `next`. A key in camelCase becomes kebab-case in the attribute: `data-luz-label-exit-fullscreen`. Missing keys fall back to English.

`registerLocale()` must reach the same module instance the components use: with the auto-initializing entry import it from `@luz-ds/core`, with the individual modules from `@luz-ds/core/i18n`. Strings written later (play/pause, copied, status messages) use it right away; the ones written when a component initializes (code block names) need it registered before the `init*()` call.

## Cascade layers

Every stylesheet puts its rules in a layer of one container layer, `luz`: `luz.tokens`, `luz.themes`, `luz.settings`, `luz.generic`, `luz.elements`, `luz.objects`, `luz.components`, `luz.utilities`, `luz.site`, `luz.landing`, `luz.cms`, `luz.app`, `luz.docs`, `luz.print`. Your unlayered CSS wins over all of them; to order LUZ as one unit, declare `@layer reset, luz, app;` first. The names are public API.

## Package exports

- **`.`** → `luz.js` — Entry: re-exports the full API + auto-initializes everything
- **`./css`** → `luz.css` — Full CSS bundle (`./css/min` for the minified twin)
- **`./base.css`** → Settings + reset + elements: the prerequisite for per-component CSS
- **`./components/*`** → Per-component CSS files (standalone use)
- **`./print.css`** → Print styles alone, for pages that load components one by one (`luz.css` already includes them)
- **`./classless.css`** → The look of a bare button, field, select and table inside `[data-luz-classless]`; not part of `luz.css`
- **`./theme`**, **`./sidebar`**, **`./clipboard`**, **`./modal`**, **`./highlight`**, **`./player`**, **`./tabs`** → Individual JS behavior modules (no side effects on import)
- **`./i18n`** → Strings for the JS-generated text (`t`, `getLang`, `registerLocale`, `loadLocales`); **`./i18n/*`** → one language LUZ ships, as a dictionary (`@luz-ds/core/i18n/es`)
- **`./midi`** → `midi.js` — MIDI player (lazy-loaded)
- **`./table-sort`** → `table-sort.js` — `initTableSort(root, t)`: sorts a table whose headings carry `data-luz-sort` (lazy-loaded by `luz.js`; no imports, so pass the `t` of `./i18n` when you load it on its own)
- **`./timeline`** → `timeline.js` — defines `<luz-timeline>`, the timeline with a rail of dates (lazy-loaded by `luz.js` on a page that has one; import it yourself for a timeline added later, with or without the entry; it loads nothing else and carries its own four strings, in English and Spanish. `initTimeline(root, translate)` is what `luz.js` calls to hand it core's `t`)
- **`./utils`** → Pure helper functions (`formatTime`, `escapeHtml`, …)
- **`./themes/*`** → `_template.css`, the starting point for a theme of your own

## Components included

- Buttons (primary, secondary, ghost, outline, danger)
- Forms (inputs, selects, checkboxes, toggles, file upload)
- Cards, tables, tabs, breadcrumbs, pagination, dropdowns, code blocks
- Players (video, audio, MIDI)
- Sidebar navigation
- Alerts, toasts, badges, avatars
- And more...

## Themes

LUZ ships one look, Vejer, in three color modes (`light`, `dark`, `high-contrast`): ET Book for running text, whitewash and sandstone surfaces, iron-black text, sky-blue links and actions, every link underlined.

A theme of your own overrides semantic tokens under `[data-theme="my-brand"]`, with `data-mode` for its light, dark and high-contrast variants. Copy `@luz-ds/core/themes/_template.css`, and check it with `npx @luz-ds/tokens check-contrast my-brand.css`. List its name in `<html data-luz-themes="my-brand">` so the mode switcher remembers the choice.

## Vanilla JS behaviors

The core JS (`luz.js`) provides no-dependency implementations of:

- Theme switching and persistence
- Sidebar toggle and mobile overlay
- Seekbar and media player controls
- Syntax highlighting for code blocks
- And more...

<!-- luz:ai-agents:start -->
## For AI agents

`@luz-ds/core` 0.0.0 is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.

### Breaking changes

Not released yet: 0.0.0 is the workspace's placeholder; the first release is 0.1.0. Nothing is deprecated and nothing breaks.

### Read first

1. `dist/classes.json` in this package: the classes and custom properties its CSS defines. Write only those.
2. `dist/custom-elements.json` in this package: the `<luz-*>` elements it defines, with their attributes.
3. https://nandovejer.github.io/luz/llms.txt: the index of the documentation, short enough for a small context.
4. https://nandovejer.github.io/luz/llms-full.txt: the same pages in full.
5. https://nandovejer.github.io/luz/examples/: one standalone page of markup for each component and pattern.

### Load order

This package needs `@luz-ds/tokens` loaded first.

### Check what you write

Run `npx @luz-ds/check <files>` on every HTML and CSS file you write, and fix what it reports. To copy the accessibility reviewer into your project: `npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md`.

`@luz-ds/check` is not on npm yet: it ships with the first release.

<!-- luz:ai-agents:end -->

## License

MIT. Core ships no fonts; the serif used for running text (ET Book, MIT) comes with `@luz-ds/tokens`.
