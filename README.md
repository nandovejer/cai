# CAI Design System

CAI stands for Consistent Adaptive Identity. It is a vanilla design system built with plain CSS, ES modules, and native browser APIs — no runtime frameworks, no build-time dependencies for consumers.

The repository is a small monorepo with three package layers:

- `@cai-ds/tokens` — design token primitives and semantic themes
- `@cai-ds/core` — reusable CSS components and JS behaviors
- `@cai-ds/platform` — app-level shells and patterns built on top of CAI core

The docs app in `apps/docs/` and the landing app in `apps/landing/` consume those packages during development.

## Principles

- **Vanilla first.** No runtime frameworks and no browser-side dependencies. Native browser APIs are always preferred.
- **Tokens first.** Components consume semantic tokens, not primitive color scales.
- **Source-first workflow.** Edit `src/`, then regenerate `dist/`.
- **Accessibility by default.** Keyboard behavior, visible focus states, and ARIA contracts are part of the component surface.

## Workspace

See [STRUCTURE.md](./STRUCTURE.md) for the full annotated directory layout. Summary:

```text
cai-design-system/
├── apps/
│   ├── docs/                  # Showcase app (not publishable)
│   │   ├── index.html         # Full documentation
│   │   └── showcase.css       # Docs-only styles
│   ├── landing/               # Marketing site
│   │   ├── index.html
│   │   └── landing.css
│   └── platform-docs/         # Platform showcase
├── packages/
│   ├── tokens/                # @cai-ds/tokens
│   │   ├── tokens.json        # Source of truth for primitives
│   │   ├── dist/cai-tokens.css
│   │   └── fonts/             # Self-hosted web fonts
│   ├── core/                  # @cai-ds/core
│   │   ├── src/               # Edit here, never dist/
│   │   │   ├── themes/        # Custom visual identity themes
│   │   │   ├── components/
│   │   │   ├── settings/
│   │   │   └── ...
│   │   └── dist/              # Generated — do not edit directly
│   │       ├── cai.css
│   │       ├── cai.js
│   │       ├── midi.js
│   │       └── themes/
│   └── platform/              # @cai-ds/platform
│       ├── src/
│       └── dist/
└── scripts/                   # Build helpers
```

## Requirements

- Node.js 18+ with ES module support
- `pnpm` as the package manager

## Development

```bash
pnpm install
pnpm build   # REQUIRED: generates all dist/ assets before dev server
pnpm dev
```

This opens `apps/docs/index.html` through Vite at `localhost:5173`.

**Note:** `pnpm dev` runs `pnpm build` automatically via the `predev` hook. If you make source changes during dev, you'll need to re-run `pnpm build` or a specific build command (`pnpm core:build`, `pnpm tokens:build`, etc.) to regenerate the assets.

## Build Commands

```bash
pnpm dev           # Start Vite dev server
pnpm tokens:build  # Regenerate token primitives (preserves semantic themes)
pnpm core:build    # Regenerate packages/core/dist from packages/core/src
pnpm platform:build # Regenerate packages/platform/dist from packages/platform/src
pnpm build         # Run tokens:build + core:build + platform:build
pnpm lint:css      # Stylelint over packages/**/*.css
pnpm lint:js       # ESLint over packages/**/*.js and scripts/**/*.js
pnpm test:unit     # Unit tests (recommended baseline)
pnpm test:ui       # UI smoke + a11y smoke (recommended baseline)
```

## Testing Strategy

Use a lightweight hybrid strategy:

- Unit tests for core JS behavior
- UI smoke tests for critical flows in the docs app
- Manual exploratory checks for visual polish

Recommended minimum coverage:

- Unit: `formatTime`, seekbar behavior, theme persistence, player UI binding
- UI: theme switch, sidebar mobile behavior, modal keyboard/focus behavior, tabs keyboard behavior
- A11y smoke: no obvious keyboard traps, focus visible, key ARIA contracts present

Development dependencies for testing are recommended.
These do not violate the vanilla-first runtime principle because they are not shipped to consumers.

**For detailed testing guide, see [TESTING.md](./TESTING.md)**

## Build Flow

For the complete build workflow (regeneration scripts, step-by-step instructions), see **[DIST-RULES.md](./DIST-RULES.md)**.

### Tokens

`packages/tokens/dist/cai-tokens.css` has two layers:

- **Layer 1 — Primitives:** generated from `packages/tokens/tokens.json` via `pnpm tokens:build`
- **Layer 2 — Semantics:** handwritten `light`, `dark`, and `high-contrast` theme blocks — never overwritten by the build

```bash
pnpm tokens:build
```

To add a semantic token, edit `cai-tokens.css` directly in the three theme blocks. To add a primitive, edit `tokens.json` and run `pnpm tokens:build`.

### Core

All source edits belong in `packages/core/src/`. After any change:

```bash
pnpm core:build
```

This regenerates `dist/cai.css`, `dist/cai.js`, `dist/midi.js`, and all `dist/themes/*.css`. Never edit `dist/` manually.

### Platform

`@cai-ds/platform` is the app-level layer on top of CAI. It is where shells, layout patterns, and higher-level primitives that are too opinionated for `core` should live.

**Use Platform when:**

- Building a web app with a sidebar, header, main content area, and consistent footer
- You need high-level layout primitives that belong in an app shell, not a component library
- You want design system–aware app patterns without duplicating markup in every app

**Use Core when:**

- Building a component library or design tokens only
- You need individual reusable components (buttons, forms, cards, etc.)
- You're embedding CAI into a single-page app or framework

Current Platform rule of thumb:

- `tokens` = primitive and semantic variables
- `core` = generic reusable components and behaviors
- `platform` = app shells and product-facing layout patterns

Current platform primitives:

- `.cai-platform-page` and `.cai-platform-page--gradient`
- `.cai-platform-content`
- `.cai-platform-main`
- `.cai-platform-section`
- `.cai-platform-page-header`, `__title`, `__lead`
- `.cai-platform-actions`
- `.cai-platform-feature-grid`
- `.cai-platform-footer`
- `.cai-platform-skip-link`
- `.cai-platform-command-block`, `__cmd`, `__prefix`

**Platform.js Status:**  
`@cai-ds/platform` is currently CSS-first. The JS entrypoint (`dist/platform.js`) is reserved for future platform-level orchestration helpers (e.g., shared app initialization, workspace state). First JS helpers are planned for v1.4.0.

After changing any file in `packages/platform/src/`:

```bash
pnpm platform:build
```

This regenerates `packages/platform/dist/platform.css` and `packages/platform/dist/platform.js`. Never edit `dist/` manually.

## Using The Packages

Load tokens before core styles:

```html
<link rel="stylesheet" href="/packages/tokens/dist/cai-tokens.css" />
<link rel="stylesheet" href="/packages/core/dist/cai.css" />
```

If you want CAI app-shell patterns as well:

```html
<link rel="stylesheet" href="/packages/platform/dist/platform.css" />
```

For optional JS behaviors:

```html
<script type="module" src="/packages/core/dist/cai.js"></script>
```

For platform-level orchestration hooks:

```html
<script type="module" src="/packages/platform/dist/platform.js"></script>
```

Today, `@cai-ds/platform` is effectively CSS-first. The JS entrypoint is reserved for future platform-level orchestration and currently ships as a no-op module.

## Theme System

CAI has a two-dimensional theme system:

| Dimension       | Attribute    | Controls                         |
| --------------- | ------------ | -------------------------------- |
| Visual identity | `data-theme` | Fonts, brand colors, personality |
| Color mode      | `data-mode`  | light / dark / high-contrast     |

Set both on `<html>`:

```html
<html data-theme="minimalist" data-mode="light"></html>
```

### Built-in themes

The base system (no `data-theme`) provides the default IBM Plex typography and a neutral palette with `light`, `dark`, and `high-contrast` modes.

### Custom themes

Custom themes live in `packages/core/src/themes/` and are distributed as standalone CSS files under `dist/themes/`. Each theme ships its own `light`, `dark`, and `high-contrast` color variants via `[data-theme="X"][data-mode="Y"]` selectors.

| Theme              | `data-theme` value | File                                         |
| ------------------ | ------------------ | -------------------------------------------- |
| Minimalist         | `minimalist`       | `dist/themes/cai-theme-minimalist.css`       |
| Ricardo & Mortimer | `ricardoymortimer` | `dist/themes/cai-theme-ricardoymortimer.css` |

**Minimalist** is the default theme. It uses DM Sans and warm off-whites with a muted slate brand color.

**Ricardo & Mortimer** is an expressive theme inspired by the animated series. It uses Freckle Face for headings and Space Grotesk for body text, with a portal-green brand color.

Load a custom theme after core styles:

```html
<link
  rel="stylesheet"
  href="/packages/core/dist/themes/cai-theme-minimalist.css"
/>
```

Theme preferences are persisted to `localStorage` and restored before first paint via an inline script in `apps/docs/index.html`.

## Token Rules

Components must use semantic tokens:

```css
/* Correct */
color: var(--cai-text-primary);
background: var(--cai-brand-primary);
border-color: var(--cai-border-subtle);

/* Incorrect — breaks theming */
color: var(--cai-gray-100);
background: var(--cai-blue-60);
color: #161616;
```

Primitive tokens (`--cai-blue-*`, `--cai-gray-*`, etc.) are only used inside `cai-tokens.css` to define semantic tokens.

## Components Included

- **Foundations:** shell, container, grid, stack, media objects
- **Form:** text inputs, select, date/time pickers, range with output, meter, color picker, file upload, checkbox/radio groups, toggles, fieldset/legend, datalist
- **Actions:** buttons (primary, secondary, ghost, outline, danger, sizes)
- **Display:** tags, badges, avatars, progress bars, tooltips
- **Feedback:** alerts, toasts
- **Content:** cards, tables, tabs, breadcrumbs, code blocks, copy button
- **Media:** video player, audio player, MIDI player
- **Utilities:** visibility, SR-only, text helpers, flex shortcuts

## Accessibility

- Keyboard navigation for all interactive components
- Visible focus states on every focusable element
- ARIA state management (tabs, toggles, players, theme switcher)
- `high-contrast` mode available for all themes
- Form controls use native HTML validation where possible

## Monorepo Notes

- `apps/docs/` consumes the packages; it is not the package itself.
- `packages/core/src/` is the source of truth for reusable styles and JS.
- `packages/tokens/tokens.json` is the source of truth for token primitives.
- Token builds run from `scripts/build-tokens.js` or `pnpm tokens:build`.

## Agents

CAI uses a four-agent model for development, planning, QA, and architectural alignment. See **[agents.md](./agents.md)** for full definitions.

| Agent          | Role                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| `agent-alba`   | Orchestrator and alignment checker (human-invoked only)                    |
| `agent-ares`   | Frontend engineer and vanilla-first enforcer (implements, reviews, vetoes) |
| `agent-chapa`  | Creative planner — specs, RFCs, execution plans for `agent-ares`           |
| `agent-martin` | QA engineer — tests, regression detection, quality reports                 |

## Documentation Index

| File                                                   | Purpose                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| **[VANILLA-FIRST.md](./VANILLA-FIRST.md)**             | Architectural philosophy — why vanilla, decision framework         |
| **[STRUCTURE.md](./STRUCTURE.md)**                     | Annotated monorepo directory layout                                |
| **[DIST-RULES.md](./DIST-RULES.md)**                   | Build workflow — `src/` → `dist/` regeneration steps               |
| **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)**         | Commands, naming conventions, token structure, component inventory |
| **[agents.md](./agents.md)**                           | Agent definitions and collaboration model                          |
| **[ROADMAP.md](./ROADMAP.md)**                         | Strategic direction, version milestones, and backlog               |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)**               | PR guidelines, checklist, and contribution workflow                |
| **[ACCESSIBILITY_AUDIT.md](./ACCESSIBILITY_AUDIT.md)** | WCAG 2.1 AA audit status and known gaps                            |
| **[TESTING.md](./TESTING.md)**                         | Test infrastructure and coverage strategy                          |
| **[CHANGELOG.md](./CHANGELOG.md)**                     | Version history and migration notes                                |

## License

MIT
