# CAI Quick Reference

## Commands

```bash
pnpm dev            # Vite → localhost:5173 (apps/docs/)
pnpm build          # Full build (tokens + core + platform)
pnpm tokens:build   # Regenerate primitives from tokens.json
pnpm core:build     # Sync @cai-ds/core dist/
pnpm platform:build # Sync @cai-ds/platform dist/
pnpm lint:css       # Stylelint
pnpm lint:js        # ESLint
```

## Naming Conventions

| Scope          | Prefix   | Example                        |
| -------------- | -------- | ------------------------------ |
| Components     | `.cai-`  | `.cai-btn`, `.cai-card__title` |
| Layout objects | `.o-`    | `.o-shell`, `.o-main`          |
| Utilities      | `.u-`    | `.u-hidden`, `.u-sr-only`      |
| Docs           | `.docs-` | `.docs-section`, `.docs-demo`  |
| States         | `.is-`   | `.is-active`, `.is-open`       |
| Tokens         | `--cai-` | `--cai-brand-primary`          |
| Keyframes      | `cai-`   | `@keyframes cai-spin`          |

**BEM:** Modifiers use `--` (`.cai-btn--primary`), elements use `__` (`.cai-card__title`).

## Token Structure

### Primitives
`--cai-{family}-{scale}` — never used in components, only in semantic token definitions.
- Families: `blue`, `gray`, `green`, `red`, `yellow`, `teal`, `purple`
- Scales: 10–100 (10 = lightest, 100 = darkest)

### Semantics (Component Usage)
- `--cai-bg-*`, `--cai-text-*`, `--cai-brand-*`, `--cai-border-*`, `--cai-icon-*`
- `--cai-color-success`, `--cai-color-danger`, `--cai-color-warning`, `--cai-color-info`

### Configuration (Theme-Independent)
- Z-index: `--cai-z-base`, `--cai-z-raised`, `--cai-z-overlay`, `--cai-z-modal`, `--cai-z-toast`
- Breakpoints: `--cai-bp-sm` (480), `--cai-bp-md` (768), `--cai-bp-lg` (1024), `--cai-bp-xl` (1280), `--cai-bp-2xl` (1440)
- Motion: `--cai-duration-*`, `--cai-easing-*`
- Spacing: `--cai-space-01` through `--cai-space-12`
- Radius: `--cai-radius-sm`, `--cai-radius-md`, `--cai-radius-lg`, `--cai-radius-full`

## Core Components

**Sidebar:** `.cai-sidebar`, `.cai-theme-switcher`, `.cai-nav-toggle`

**Forms:** `.cai-field`, `.cai-input`, `.cai-select-wrap`, `.cai-check-group`, `.cai-toggle`

**Primitives:** `.cai-btn`, `.cai-tag`, `.cai-badge`, `.cai-avatar`, `.cai-progress`

**Containers:** `.cai-alert`, `.cai-toast`, `.cai-card`, `.cai-modal`

**Navigation:** `.cai-tabs`, `.cai-breadcrumb`

**Media:** `.cai-player` (video/audio/MIDI)

**Code:** `.cai-code-block`, `.cai-code-inline`

**Layout Objects:** `.o-shell`, `.o-main`, `.o-container`, `.o-grid`, `.o-stack`

**Utilities:** `.u-hidden`, `.u-sr-only`, `.u-flex`, `.u-text-mono`, `.u-truncate`

## Critical Rules

✓ **Edit `src/`, not `dist/`** — See [DIST-RULES.md](./DIST-RULES.md)

✓ **Never use primitive tokens in components** — only semantics

✓ **Token decimal rule:** Components always use semantic tokens (`--cai-text-primary`), never primitives (`--cai-gray-100`)

✓ **Package boundary:** `core` must never import from `platform`

✓ **No runtime dependencies** — See [VANILLA-FIRST.md](./VANILLA-FIRST.md)

## JS Modules (`packages/core/src/`)

`cai.js` is the entry: it re-exports everything below and auto-initializes on load. Each module is also published individually (`@cai-ds/core/theme`, `/sidebar`, `/clipboard`, `/modal`, `/highlight`, `/player`, `/utils`, `/midi`) and importing it has no side effects until you call its `init*()`.

| Module         | Exports                                                        |
| -------------- | -------------------------------------------------------------- |
| `theme.js`     | `applyTheme`, `applyMode`, `getInitialTheme`, `getStoredTheme`, `getStoredMode`, `initThemeSystem`, `MODES`, `CUSTOM_THEMES` |
| `sidebar.js`   | `openSidebar`, `closeSidebar`, `initSidebar`                   |
| `clipboard.js` | `copyToClipboard`, `initCopyButtons`                           |
| `modal.js`     | `createFocusTrap`, `initModals`                                |
| `highlight.js` | `highlightBlock`, `initHighlight`                              |
| `player.js`    | `initSeekbar`, `wrapHTMLMedia`, `bindPlayerUI`, `mountPlayer`, `mountMidiPlayer`, `initPlayers` |
| `utils.js`     | `formatTime`, `isCustomTheme`, `isValidMode`, `calculateProgress`, `escapeHtml` |
| `midi.js`      | `MidiPlayer` (Format 0/1 parser + Web Audio scheduler; lazy-loaded) |

## Standalone CSS Components

Each component ships as its own file in `@cai-ds/core/dist/components/`:

```html
<link rel="stylesheet" href=".../@cai-ds/tokens@2/dist/cai-tokens.css">
<link rel="stylesheet" href=".../@cai-ds/core@2/dist/components/button.css">
```

Requires only the tokens layer loaded first.

## File Organization

- **Package source:** `packages/{tokens,core,platform}/src/`
- **Package dist:** `packages/{tokens,core,platform}/dist/` (generated)
- **Docs app:** `apps/docs/index.html` + `apps/docs/showcase.css`
- **Landing app:** `apps/landing/` (external consumer)

**See [STRUCTURE.md](./STRUCTURE.md) for full directory layout.**
