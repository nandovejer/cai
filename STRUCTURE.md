# CAI Monorepo Structure

```
cai-design-system/
├── apps/
│   ├── docs/                         ← showcase (NOT publishable, NOT part of the package)
│   │   ├── index.html               ← full documentation
│   │   └── showcase.css             ← docs app–only styles
│   └── landing/                     ← landing app (private)
│       ├── index.html
│       └── landing.css
├── packages/
│   ├── tokens/                        ← @cai-ds/tokens (publishable)
│   │   ├── tokens.json                ← source of truth for primitives
│   │   ├── dist/cai-tokens.css        ← DO NOT edit directly
│   │   └── fonts/                     ← self-hosted web fonts
│   │
│   ├── core/                          ← @cai-ds/core (publishable)
│   │   ├── src/                       ← EDIT HERE
│   │   │   ├── settings/_settings.css ← config tokens (z-index, breakpoints, motion)
│   │   │   ├── generic/_reset.css     ← reset
│   │   │   ├── elements/_elements.css ← bare HTML elements
│   │   │   ├── objects/_objects.css   ← layout abstractions (.o-)
│   │   │   ├── components/_components.css ← all .cai-* + @keyframes
│   │   │   ├── utilities/_utilities.css   ← .u-*
│   │   │   ├── index.css              ← entry with ITCSS imports
│   │   │   ├── cai.js                 ← showcase JS + players + highlight
│   │   │   └── midi.js                ← MIDI parser + Web Audio scheduler
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── cai.css
│   │       ├── cai.js
│   │       └── midi.js
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
    ├── build-tokens.js                ← regenerates Layer 1 primitives
    ├── build-core.js                  ← syncs @cai-ds/core dist/
    └── build-platform.js              ← syncs @cai-ds/platform dist/
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
- **What gets published** — `packages/tokens/`, `packages/core/`, `packages/platform/` (consumers download these)
- **What does not** — `apps/docs/`, `apps/landing/` (internal showcase apps only)
