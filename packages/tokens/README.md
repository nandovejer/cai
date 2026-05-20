# @cai-ds/tokens

Design tokens and self-hosted web fonts for the CAI Design System.

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
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css">
```

## What's included

- **Primitives**: Color scales, spacing, typography, shadows, radius tokens
- **Semantic themes**: Light, dark, and high-contrast color modes
- **Self-hosted fonts**: IBM Plex Serif, Sans, and Mono families (included in `cai-tokens.css`)
- **Custom faces**: DM Sans, Space Grotesk, and Freckle Face for custom themes

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

Theme variants are available via `data-mode`:

```html
<html data-mode="dark">
<html data-mode="high-contrast">
```

## Fonts

The base tokens file includes `@font-face` declarations for IBM Plex Serif, Sans, and Mono. These are served from the same CDN and will load automatically when you import the tokens.

For custom themes using Space Grotesk or DM Sans, those fonts are in `dist/fonts/custom-faces/`.

## License

MIT
