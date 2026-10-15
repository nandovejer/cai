# LUZ Quick Reference

## Commands

```bash
pnpm dev            # Vite → localhost:5173 (apps/docs/)
pnpm build          # Full build (tokens + core + site + landing + cms + app)
pnpm tokens:build   # Regenerate primitives from tokens.json
pnpm core:build     # Sync @luz-ds/core dist/
pnpm site:build     # Sync @luz-ds/site dist/
pnpm landing:build  # Sync @luz-ds/landing dist/
pnpm cms:build      # Sync @luz-ds/cms dist/
pnpm app:build      # Sync @luz-ds/app dist/
pnpm lint:css       # Stylelint
pnpm lint:js        # ESLint
```

## Naming Conventions

| Scope          | Prefix   | Example                        |
| -------------- | -------- | ------------------------------ |
| Components     | `.luz-`  | `.luz-btn`, `.luz-card__title` |
| Layout objects | `.o-`    | `.o-shell`, `.o-main`          |
| Utilities      | `.u-`    | `.u-hidden`, `.u-sr-only`      |
| Docs           | `.docs-` | `.docs-section`, `.docs-demo`  |
| States         | `.is-`   | `.is-active`, `.is-open`       |
| Tokens         | `--luz-` | `--luz-brand-primary`          |
| Keyframes      | `luz-`   | `@keyframes luz-spin`          |

**BEM:** Modifiers use `--` (`.luz-btn--primary`), elements use `__` (`.luz-card__title`).

## Token Structure

### Primitives
`--luz-{family}-{scale}` — never used in components, only in semantic token definitions.
- Families: `blue`, `gray`, `green`, `red`, `yellow`, `teal`, `purple`
- Scales: 10–100 (10 = lightest, 100 = darkest)

### Semantics (Component Usage)
- `--luz-bg-*`, `--luz-text-*`, `--luz-brand-*`, `--luz-border-*`, `--luz-icon-*`
- `--luz-color-success`, `--luz-color-danger`, `--luz-color-warning`, `--luz-color-info`

### Configuration (Theme-Independent)
- Z-index: `--luz-z-base`, `--luz-z-raised`, `--luz-z-overlay`, `--luz-z-modal`, `--luz-z-toast`
- Breakpoints: `--luz-bp-sm` (480), `--luz-bp-md` (768), `--luz-bp-lg` (1024), `--luz-bp-xl` (1280), `--luz-bp-2xl` (1440)
- Motion: `--luz-duration-*`, `--luz-easing-*`
- Spacing: `--luz-space-3xs` (2px), `2xs` (4px), `xs` (8px), `sm` (12px), `md` (16px), `lg` (24px), `xl` (32px), `2xl` (48px), `3xl` (64px), `4xl` (96px)
- Radius: `--luz-radius-sm`, `--luz-radius-md`, `--luz-radius-lg`, `--luz-radius-full`

## Core Components

**Sidebar:** `.luz-sidebar`, `.luz-theme-switcher`, `.luz-nav-toggle`

**Forms:** `.luz-field`, `.luz-input`, `.luz-select-wrap`, `.luz-check-group`, `.luz-toggle`

**Primitives:** `.luz-btn`, `.luz-tag`, `.luz-badge`, `.luz-avatar`, `.luz-progress`

**Containers:** `.luz-alert`, `.luz-toast`, `.luz-card`, `.luz-modal`

**Navigation:** `.luz-tabs`, `.luz-breadcrumb`

**Media:** `.luz-player` (video/audio/MIDI)

**Code:** `.luz-code-block`, `.luz-code-inline`

**Layout Objects:** `.o-shell`, `.o-main`, `.o-container`, `.o-grid`, `.o-stack`

**Utilities:** `.u-hidden`, `.u-sr-only`, `.u-flex`, `.u-text-mono`, `.u-truncate`

## Critical Rules

✓ **Edit `src/`, not `dist/`** — See [DIST-RULES.md](./DIST-RULES.md)

✓ **Never use primitive tokens in components** — only semantics

✓ **Token decimal rule:** Components always use semantic tokens (`--luz-text-primary`), never primitives (`--luz-gray-100`)

✓ **Package boundary:** `core` must never import from `site`, nor `site` from `landing`, `cms` or `app`, and `landing`, `cms` and `app` never from each other

✓ **No runtime dependencies** — See [VANILLA-FIRST.md](./VANILLA-FIRST.md)

## JS Modules (`packages/core/src/`)

`luz.js` is the entry: it re-exports everything below and auto-initializes on load. Each module is also published individually (`@luz-ds/core/theme`, `/sidebar`, `/clipboard`, `/modal`, `/highlight`, `/player`, `/tabs`, `/utils`, `/midi`, `/table-sort`) and importing it has no side effects until you call its `init*()`.

| Module         | Exports                                                        |
| -------------- | -------------------------------------------------------------- |
| `theme.js`     | `applyTheme`, `applyMode`, `getInitialTheme`, `getStoredTheme`, `getStoredMode`, `initThemeSystem`, `MODES`, `CUSTOM_THEMES` |
| `sidebar.js`   | `initSidebar`                                                  |
| `clipboard.js` | `copyToClipboard`, `initCopyButtons`                           |
| `modal.js`     | `initModals`, `supportsCommands`                               |
| `highlight.js` | `highlightBlock`, `initHighlight`                              |
| `player.js`    | `initSeekbar`, `wrapHTMLMedia`, `bindPlayerUI`, `mountPlayer`, `mountMidiPlayer`, `initPlayers` |
| `tabs.js`      | `activateTab`, `initTabs`                                      |
| `utils.js`     | `formatTime`, `isCustomTheme`, `isValidMode`, `calculateProgress`, `escapeHtml` |
| `midi.js`      | `MidiPlayer`, `MidiParser`, `buildTimeline` (Format 0/1 parser + Web Audio scheduler; lazy-loaded) |
| `table-sort.js` | `initTableSort` (sorts `th[data-luz-sort]` tables; lazy-loaded) |

## Standalone CSS Components

Each component ships as its own file in `@luz-ds/core/dist/components/`:

```html
<link rel="stylesheet" href=".../@luz-ds/tokens@0.1.0/dist/luz-tokens.css">
<link rel="stylesheet" href=".../@luz-ds/core@0.1.0/dist/base.css">
<link rel="stylesheet" href=".../@luz-ds/core@0.1.0/dist/components/button.css">
```

Requires the tokens layer, then `base.css` (core settings such as z-index and motion, reset, bare elements), loaded first.

## File Organization

- **Package source:** `packages/{tokens,core,site,landing,cms,app}/src/`
- **Package dist:** `packages/{tokens,core,site,landing,cms,app}/dist/` (generated)
- **Docs app:** pages in `apps/docs/pages/` (front matter + fragment), wrapped by `apps/docs/_layouts/` and `apps/docs/_partials/` through `scripts/docs-site/`; styles in `apps/docs/reference.css` and `elements.css`
- **Landing app:** `apps/landing/` (external consumer)

**See [STRUCTURE.md](./STRUCTURE.md) for full directory layout.**
