# @cai-ds/platform

App-level shell patterns and layout components for the CAI Design System.

## Prerequisites

Requires `@cai-ds/tokens` and `@cai-ds/core`.

## Installation

```bash
npm install @cai-ds/tokens @cai-ds/core @cai-ds/platform
```

## Usage

### Via npm/bundler

```js
import '@cai-ds/tokens'
import '@cai-ds/core'
import '@cai-ds/platform'
```

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/platform@2.0.0/dist/platform.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js"></script>
```

## Package exports

- **`.`** → `platform.js` — Platform-level JS orchestration (currently a no-op, reserved for v1.4.0+)
- **`./css`** → `platform.css` — App shell and layout primitives

## Classes included

- `.cai-platform-page` — Full-page container with optional gradient
- `.cai-platform-content` — Constrained content wrapper
- `.cai-platform-main` — Main content area
- `.cai-platform-section` — Semantic section divisions
- `.cai-platform-page-header`, `__title`, `__lead` — Page header block
- `.cai-platform-actions` — Action button group
- `.cai-platform-feature-grid` — Feature showcase grid
- `.cai-platform-footer` — Page footer
- `.cai-platform-skip-link` — Accessibility skip link
- `.cai-platform-command-block` — Command-line-style code snippet

## License

MIT
