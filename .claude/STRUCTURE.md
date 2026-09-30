# CAI Monorepo Structure

```
cai-design-system/
├── apps/                              ← internal apps (NOT publishable)
│   ├── docs/                          ← component showcase
│   │   ├── index.html
│   │   └── showcase.css               ← docs app–only styles
│   ├── landing/                       ← landing app
│   │   ├── index.html
│   │   └── landing.css
│   └── platform-docs/                 ← platform documentation
│       ├── index.html
│       └── platform-docs.css
├── packages/
│   ├── tokens/                        ← @cai-ds/tokens (publishable)
│   │   ├── tokens.json                ← source of truth for Layer 1 primitives
│   │   ├── src/semantic.css           ← Layer 2 semantic themes (light/dark/high-contrast)
│   │   ├── fonts/                     ← IBM Plex woff2 + fonts.css + OFL.txt
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── cai-tokens.css (+ .min) ← fonts + primitives + semantic
│   │       ├── tokens.css, fonts.css  ← the same, split (bring your own fonts)
│   │       ├── tokens.json            ← primitives source, for tooling
│   │       └── fonts/                 ← woff2 files + OFL.txt
│   │
│   ├── core/                          ← @cai-ds/core (publishable)
│   │   ├── src/                       ← EDIT HERE
│   │   │   ├── settings/_settings.css ← config tokens (z-index, breakpoints, motion)
│   │   │   ├── generic/_reset.css     ← reset
│   │   │   ├── elements/_elements.css ← bare HTML elements
│   │   │   ├── objects/_objects.css   ← layout abstractions (.o-)
│   │   │   ├── components/            ← ONE FILE PER COMPONENT (.cai-*)
│   │   │   │   ├── index.css          ← barrel (@import in cascade order)
│   │   │   │   ├── button.css, form.css, table.css, modal.css, player.css, …
│   │   │   │   └── _animations.css    ← shared public @keyframes
│   │   │   ├── utilities/_utilities.css   ← .u-*
│   │   │   ├── themes/                ← custom themes (minimalist, ricardoymortimer)
│   │   │   ├── index.css              ← entry with ITCSS imports (source of truth for layer order)
│   │   │   ├── cai.js                 ← entry: re-exports API + auto-init
│   │   │   ├── theme.js               ← theme system (applyTheme, applyMode, …)
│   │   │   ├── sidebar.js             ← sidebar nav + mobile drawer
│   │   │   ├── clipboard.js           ← copy-to-clipboard behaviors
│   │   │   ├── modal.js               ← modals + focus trap
│   │   │   ├── highlight.js           ← dependency-free syntax highlight
│   │   │   ├── player.js              ← video/audio/MIDI player UI
│   │   │   ├── tabs.js                ← tabs activation + keyboard
│   │   │   ├── toggle.js              ← switch toggle click + keyboard
│   │   │   ├── midi.js                ← MIDI parser + Web Audio scheduler (lazy chunk)
│   │   │   └── utils.js               ← pure helpers (unit-tested)
│   │   ├── fonts/custom-faces/        ← theme fonts (DM Sans, Space Grotesk, Freckle Face) + OFL texts
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── cai.css (+ .min)       ← full bundle
│   │       ├── base.css (+ .min)      ← settings + reset + elements (needed by per-component files)
│   │       ├── components/*.css       ← per-component files (standalone use)
│   │       ├── cai.js                 ← bundled entry (rollup)
│   │       ├── theme.js, sidebar.js, … ← individual ESM modules
│   │       ├── midi.js                ← lazy chunk
│   │       ├── fonts/custom-faces/    ← copied for the themes
│   │       └── themes/*.css
│   │
│   └── platform/                      ← @cai-ds/platform (publishable)
│       ├── src/                       ← EDIT HERE
│       │   ├── components/_components.css
│       │   ├── index.css
│       │   └── platform.js
│       └── dist/                      ← GENERATED (do not edit)
│           ├── platform.css
│           └── platform.js
│
└── scripts/
    ├── build-tokens.js                ← fonts + primitives (tokens.json) + semantic (src/semantic.css)
    ├── build-core.js                  ← inlines src/index.css @imports + per-component dist + JS
    ├── build-platform.js              ← inlines src/index.css @imports
    ├── check-dist.js                  ← predev guard (rebuilds if any dist missing)
    ├── check-pack.js                  ← tarball contract: file snapshot, licences, exports, no workspace: ranges
    └── publish.js                     ← CI-only: publishes versions missing from npm (OIDC + provenance)
```

## Dependency Chain

```
@cai-ds/tokens
    ↓
@cai-ds/core  (consumes tokens, must never import platform)
    ↓
@cai-ds/platform  (app-level patterns)
```

## Key Rules

- **Never edit `dist/`** — it is generated from `src/`
- **Layer order lives in `src/index.css`** — build scripts inline its `@import` graph; there is no duplicated file list
- **What gets published** — `packages/tokens/`, `packages/core/`, `packages/platform/` (consumers download these)
- **What does not** — `apps/docs/`, `apps/landing/`, `apps/platform-docs/` (internal apps only)
