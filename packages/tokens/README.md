# @luz-ds/tokens

Design tokens and self-hosted web fonts for the LUZ Design System.

> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

This is the base layer and works on its own: it has no dependencies. `@luz-ds/core` and `@luz-ds/site` build on it.

## Installation

```bash
npm install @luz-ds/tokens
```

## Usage

### Via npm/bundler

```js
import '@luz-ds/tokens'
```

### Via CDN (jsDelivr)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
```

## Package exports

- **`.`**, **`./css`** → `luz-tokens.css` — fonts + primitives + semantic tokens (`./css/min` for the minified twin)
- **`./tokens.css`** → primitives + semantic tokens, without any `@font-face` (bring your own fonts)
- **`./fonts.css`** → the `@font-face` declarations only
- **`./tokens.json`** → the primitives source, for tooling
- **`./dtcg`** → `luz-tokens.dtcg.json` — primitives and semantic tokens in the W3C Design Tokens (DTCG) format, for Figma and other design tools. Two groups, one per collection: `primitives` (one mode) and `semantic` (modes Light, Dark and High contrast in `$extensions.mode`, `$value` is Light). Semantic tokens are aliases of primitives where the CSS uses a primitive. Names: drop `--luz-`; the first segment is the group, the rest is the name (`--luz-surface-page` ↔ `surface/page`; `--luz-surface` is `surface/$root`)
- **`./fonts/*`** → the woff2 files

## Check your own colors

`luz-tokens check-contrast` reads the `--luz-*` overrides of your stylesheet, puts them over LUZ's tokens as the browser would, and measures the pairs LUZ promises to keep readable (WCAG 2.x: 4.5:1 for text, 3:1 for disabled text, focus rings, field borders and icons) in light, dark, high contrast and every `[data-theme]` you define. It needs Node 18 or later and has no dependencies.

```bash
npx @luz-ds/tokens check-contrast my-theme.css
npx @luz-ds/tokens check-contrast base.css my-theme.css --json
```

Exit code `0` when every pair passes, `1` when one fails or a color could not be read, `2` for a usage or file error. What it reads, and what it reports as not read, is on [the contrast page of the docs](https://nandovejer.github.io/luz/docs/tokens/contrast/).

## What's included

- **Primitives** (Layer 1): Color scales, spacing, typography, shadows, radius tokens — generated from `tokens.json`. The colour scales are LUZ's own palette, computed in OKLCH (one lightness curve for every family, so a step number means the same contrast in every colour)
- **Semantic tokens** (Layer 2): the default look, Vejer, in the light, dark and high-contrast color modes — source in `src/semantic.css`
- **One self-hosted font**, MIT licensed: ET Book (serif, for running text and headings), included in `luz-tokens.css`
- **System font stacks** for sans and mono, so controls, labels, tables and code download nothing

## CSS Custom Properties

All tokens are available as CSS custom properties (CSS variables) scoped to `:root`:

```css
/* Color primitives */
--luz-blue-10, --luz-blue-20, ...
--luz-gray-10, --luz-gray-20, ...

/* Semantic (light theme by default) */
--luz-text-primary
--luz-surface
--luz-divider
--luz-brand-primary
```

Base color modes are activated via `data-theme` on `<html>`:

```html
<html data-theme="light">
<html data-theme="dark">
<html data-theme="high-contrast">
```

The default look is Vejer. A theme of your own sets `data-theme="<theme-name>"` and uses `data-mode` for its luminosity variants (start from `@luz-ds/core/themes/_template.css`):

```html
<html data-theme="my-brand" data-mode="dark">
```

## Sizes

Three tokens set the size of the whole type and space scales. Set them on `:root`, in CSS of your own that is not inside a layer, and write the lengths in rem so the reader's browser font size keeps working:

```css
:root {
  --luz-type-base: 1.125rem; /* default 1rem: the size of --luz-text-base */
  --luz-type-ratio: 1.2;     /* default 1.25: the multiple between two steps */
  --luz-space-unit: 0.1875rem; /* default 0.25rem: the 4px grid of --luz-space-* */
}
```

Every `--luz-text-*` and `--luz-space-*` step is computed from them. At the defaults the sizes are the same as before the knobs existed. A knob set on `body` or on a section changes nothing: the steps are resolved on `:root`. Components read the steps, never the knobs. The page [Make it yours](https://nandovejer.github.io/luz/docs/get-started/make-it-yours/) has the tested ranges and a table of presets.

## Fonts

`luz-tokens.css` includes the `@font-face` declarations for ET Book. The files ship in `dist/fonts/` next to the stylesheet, so they load with no extra setup from npm and from a CDN.

To use your own fonts, load `tokens.css` instead and set `--luz-font-sans`, `--luz-font-serif` and `--luz-font-mono`.

ET Book ships roman, italic, semi-bold and bold. Sans and mono are system stacks, so every weight the platform font has is available:

- `--luz-font-sans`: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- `--luz-font-mono`: `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`

`@luz-ds/core` ships no fonts. It sets the serif for running text through `--luz-font-body`, using this ET Book.

## License

MIT, fonts included. Every bundled font is under the MIT License only, and its notice ships in `dist/fonts/LICENSE-*.txt`:

- ET Book — Copyright (c) 2015 Dmitry Krasny, Bonnie Scranton, Edward Tufte
