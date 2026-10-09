# @cai-ds/tokens

Design tokens and self-hosted web fonts for the CAI Design System.

> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

This is the base layer and works on its own: it has no dependencies. `@cai-ds/core` and `@cai-ds/platform` build on it.

## Installation

```bash
npm install @cai-ds/tokens
```

## Usage

### Via npm/bundler

```js
import '@cai-ds/tokens'
```

### Via CDN (jsDelivr)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@3.0.0/dist/cai-tokens.min.css">
```

## Package exports

- **`.`**, **`./css`** → `cai-tokens.css` — fonts + primitives + semantic themes (`./css/min` for the minified twin)
- **`./tokens.css`** → primitives + semantic themes, without any `@font-face` (bring your own fonts)
- **`./fonts.css`** → the `@font-face` declarations only
- **`./tokens.json`** → the primitives source, for tooling
- **`./fonts/*`** → the woff2 files

## What's included

- **Primitives** (Layer 1): Color scales, spacing, typography, shadows, radius tokens — generated from `tokens.json`. The colour scales are CAI's own palette, computed in OKLCH (one lightness curve for every family, so a step number means the same contrast in every colour)
- **Semantic themes** (Layer 2): Light, dark, and high-contrast color modes — source in `src/semantic.css`
- **One self-hosted font**, MIT licensed: ET Book (serif, for headings), included in `cai-tokens.css`
- **System font stacks** for sans and mono, so body, UI and code text download nothing

## CSS Custom Properties

All tokens are available as CSS custom properties (CSS variables) scoped to `:root`:

```css
/* Color primitives */
--cai-blue-10, --cai-blue-20, ...
--cai-gray-10, --cai-gray-20, ...

/* Semantic (light theme by default) */
--cai-text-primary
--cai-bg-ui
--cai-border-subtle
--cai-brand-primary
```

Base color modes are activated via `data-theme` on `<html>`:

```html
<html data-theme="light">
<html data-theme="dark">
<html data-theme="high-contrast">
```

Custom themes (shipped with `@cai-ds/core`) set `data-theme="<theme-name>"` and use `data-mode` for their luminosity variants:

```html
<html data-theme="minimalist" data-mode="dark">
```

## Fonts

`cai-tokens.css` includes the `@font-face` declarations for ET Book. The files ship in `dist/fonts/` next to the stylesheet, so they load with no extra setup from npm and from a CDN.

To use your own fonts, load `tokens.css` instead and set `--cai-font-sans`, `--cai-font-serif` and `--cai-font-mono`.

ET Book ships roman, italic, semi-bold and bold. Sans and mono are system stacks, so every weight the platform font has is available:

- `--cai-font-sans`: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- `--cai-font-mono`: `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`

`@cai-ds/core` ships no fonts. Its `vejer` theme sets the serif for running text through `--cai-font-body`, using this ET Book.

## License

MIT, fonts included. Every bundled font is under the MIT License only, and its notice ships in `dist/fonts/LICENSE-*.txt`:

- ET Book — Copyright (c) 2015 Dmitry Krasny, Bonnie Scranton, Edward Tufte
