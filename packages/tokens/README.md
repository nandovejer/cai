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

- **`.`**, **`./css`** → `cai-tokens.css` — fonts + primitives + semantic tokens (`./css/min` for the minified twin)
- **`./tokens.css`** → primitives + semantic tokens, without any `@font-face` (bring your own fonts)
- **`./fonts.css`** → the `@font-face` declarations only
- **`./tokens.json`** → the primitives source, for tooling
- **`./dtcg`** → `cai-tokens.dtcg.json` — primitives and semantic tokens in the W3C Design Tokens (DTCG) format, for Figma and other design tools. Two groups, one per collection: `primitives` (one mode) and `semantic` (modes Light, Dark and High contrast in `$extensions.mode`, `$value` is Light). Semantic tokens are aliases of primitives where the CSS uses a primitive. Names: drop `--cai-`; the first segment is the group, the rest is the name (`--cai-surface-page` ↔ `surface/page`; `--cai-surface` is `surface/$root`)
- **`./fonts/*`** → the woff2 files

## Check your own colors

`cai-tokens check-contrast` reads the `--cai-*` overrides of your stylesheet, puts them over CAI's tokens as the browser would, and measures the pairs CAI promises to keep readable (WCAG 2.x: 4.5:1 for text, 3:1 for disabled text, focus rings, field borders and icons) in light, dark, high contrast and every `[data-theme]` you define. It needs Node 18 or later and has no dependencies.

```bash
npx @cai-ds/tokens check-contrast my-theme.css
npx @cai-ds/tokens check-contrast base.css my-theme.css --json
```

Exit code `0` when every pair passes, `1` when one fails or a color could not be read, `2` for a usage or file error. What it reads, and what it reports as not read, is on [the contrast page of the docs](https://nandovejer.github.io/cai/docs/tokens/contrast/).

## What's included

- **Primitives** (Layer 1): Color scales, spacing, typography, shadows, radius tokens — generated from `tokens.json`. The colour scales are CAI's own palette, computed in OKLCH (one lightness curve for every family, so a step number means the same contrast in every colour)
- **Semantic tokens** (Layer 2): the default look, Vejer, in the light, dark and high-contrast color modes — source in `src/semantic.css`
- **One self-hosted font**, MIT licensed: ET Book (serif, for running text and headings), included in `cai-tokens.css`
- **System font stacks** for sans and mono, so controls, labels, tables and code download nothing

## CSS Custom Properties

All tokens are available as CSS custom properties (CSS variables) scoped to `:root`:

```css
/* Color primitives */
--cai-blue-10, --cai-blue-20, ...
--cai-gray-10, --cai-gray-20, ...

/* Semantic (light theme by default) */
--cai-text-primary
--cai-surface
--cai-divider
--cai-brand-primary
```

Base color modes are activated via `data-theme` on `<html>`:

```html
<html data-theme="light">
<html data-theme="dark">
<html data-theme="high-contrast">
```

The default look is Vejer. A theme of your own sets `data-theme="<theme-name>"` and uses `data-mode` for its luminosity variants (start from `@cai-ds/core/themes/_template.css`):

```html
<html data-theme="my-brand" data-mode="dark">
```

## Fonts

`cai-tokens.css` includes the `@font-face` declarations for ET Book. The files ship in `dist/fonts/` next to the stylesheet, so they load with no extra setup from npm and from a CDN.

To use your own fonts, load `tokens.css` instead and set `--cai-font-sans`, `--cai-font-serif` and `--cai-font-mono`.

ET Book ships roman, italic, semi-bold and bold. Sans and mono are system stacks, so every weight the platform font has is available:

- `--cai-font-sans`: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- `--cai-font-mono`: `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`

`@cai-ds/core` ships no fonts. It sets the serif for running text through `--cai-font-body`, using this ET Book.

## License

MIT, fonts included. Every bundled font is under the MIT License only, and its notice ships in `dist/fonts/LICENSE-*.txt`:

- ET Book — Copyright (c) 2015 Dmitry Krasny, Bonnie Scranton, Edward Tufte
