# GitHub Copilot Instructions — CAI Design System

You are assisting with **CAI**, a vanilla-first design system for web developers.

## Core Principles

- **Vanilla first.** No JS frameworks, no CSS frameworks, no runtime dependencies.
- **Native APIs.** Always prefer browser APIs over external libraries.
- **Standards over abstractions.** Semantic HTML, CSS custom properties, ES modules.
- **See [VANILLA-FIRST.md](./VANILLA-FIRST.md) for the full architectural philosophy.**

## Code Suggestions

### Before suggesting any code:

1. **Is there a native browser API for this?** → Use it. No exceptions.
2. **Can it be done in vanilla JS?** → Do it in vanilla JS (ES modules).
3. **Would it require a dependency?** → Suggest opening a discussion first.

### When suggesting CSS:

- ✓ Use semantic tokens: `color: var(--cai-text-primary);`
- ✗ Never use primitives: `color: var(--cai-gray-100);`
- ✓ Use native CSS: `@media`, `@keyframes`, `@layer`, `:has()`
- ✗ No CSS-in-JS, no Tailwind, no PostCSS

### When suggesting JS:

- ✓ Vanilla ES modules with native browser APIs
- ✓ `IntersectionObserver`, `ResizeObserver`, `MutationObserver`, `Web Animations API`, `AudioContext`, `dialog`, `details`/`summary`, `CustomEvent`
- ✗ No React, Vue, Svelte, Alpine, HTMX, or any runtime framework
- ✗ No `npm install` for browser-facing code

### Naming conventions:

- Components: `.cai-button`, `.cai-card__title` (BEM with `__` for elements, `--` for modifiers)
- Layout objects: `.o-shell`, `.o-grid`
- Utilities: `.u-hidden`, `.u-flex`
- States: `.is-active`, `.is-open`
- Custom properties: `--cai-brand-primary`, `--cai-space-04`
- Keyframes: `@keyframes cai-spin`

**See [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for full naming conventions.**

## File Structure

**Always edit `src/`, never `dist/`.**

```
packages/
├── tokens/          → tokens.json + dist/cai-tokens.css
├── core/
│   ├── src/         ← EDIT HERE (CSS + JS)
│   └── dist/        ← GENERATED (never edit)
└── platform/
    ├── src/         ← EDIT HERE
    └── dist/        ← GENERATED
```

**After editing `src/`**, regenerate `dist/`:
- See [DIST-RULES.md](./DIST-RULES.md) for exact commands

## Token System

### Primitives
`--cai-{family}-{scale}` (e.g., `--cai-blue-60`, `--cai-gray-30`)
- Only used inside `cai-tokens.css` to define semantics
- **Never used in components**

### Semantics
`--cai-{role}-{state}` (e.g., `--cai-text-primary`, `--cai-brand-hover`)
- Used in all component CSS
- Defined per-theme (light, dark, high-contrast)

**See [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for full token structure.**

## Important References

- **[VANILLA-FIRST.md](./VANILLA-FIRST.md)** — Architectural philosophy
- **[DIST-RULES.md](./DIST-RULES.md)** — Build workflow (src → dist)
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** — Commands, naming, tokens, components
- **[STRUCTURE.md](./STRUCTURE.md)** — Monorepo directory layout
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — PR guidelines

## Dos and Don'ts

### ✓ DO

- Use native `<dialog>` for modals
- Use `details`/`summary` for accordions
- Use semantic HTML (button, input, label, etc.)
- Test keyboard navigation (Tab, Enter, Escape)
- Ensure focus states are visible

### ✗ DON'T

- Suggest adding npm dependencies
- Use primitive tokens in CSS
- Edit `dist/` files directly
- Add CSS frameworks or preprocessors
- Use JS frameworks

## Questions?

For architectural decisions, see [ROADMAP.md](./ROADMAP.md) or open an issue in the repo.
