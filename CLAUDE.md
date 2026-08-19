# CAI Design System — Claude Code context

**See [VANILLA-FIRST.md](./VANILLA-FIRST.md) for architectural principles, [STRUCTURE.md](./STRUCTURE.md) for directory layout, and [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for naming, tokens, and commands.**

---

## Critical Implementation Rules

### 1. `dist/` is generated, never edited directly

See [DIST-RULES.md](./DIST-RULES.md) for full regeneration steps.

---

## JS in `packages/core/src/`

Vanilla JS, ES modules — one module per concern, all re-exported (and auto-initialized) by the `cai.js` entry. Importing an individual module has no side effects until you call its `init*()`. Published exports: `@cai-ds/core/theme`, `/sidebar`, `/clipboard`, `/modal`, `/highlight`, `/player`, `/utils`, `/midi`.

| Module         | Key exports                                                    |
| -------------- | -------------------------------------------------------------- |
| `theme.js`     | `applyTheme(theme)` (sets `data-theme` on `<html>`, persists), `applyMode`, `getInitialTheme`, `initThemeSystem()` |
| `sidebar.js`   | `openSidebar()` / `closeSidebar()` (mobile drawer + overlay), `initSidebar()` |
| `clipboard.js` | `copyToClipboard(text, el, type)` (visual feedback), `initCopyButtons()` |
| `modal.js`     | `createFocusTrap(el)`, `initModals()`                          |
| `highlight.js` | `highlightBlock(pre)` — dependency-free highlight for `pre.cai-code-block`, `initHighlight()` |
| `player.js`    | `initSeekbar(bar, onSeek)`, `wrapHTMLMedia(el)`, `bindPlayerUI(root, controls, mediaLike)`, `mountPlayer(root)`, `mountMidiPlayer(root)` (async), `initPlayers()` |
| `utils.js`     | `formatTime(seconds)` (`mm:ss`), `escapeHtml`, `calculateProgress`, … (pure, unit-tested) |
| `midi.js`      | `MidiPlayer` — MIDI Format 0/1 parser + Web Audio scheduler (lazy-loaded chunk) |

---

## Vite config

`root: apps/docs` + `publicDir: <repo-root>` → absolute paths like `/packages/...` in HTML resolve correctly in dev. In build, `outDir: apps/docs/dist`.

---

## Common workflows

### Adding a new component

1. **Check first:** is there a native HTML element or browser API that solves this? (`dialog`, `details`, `popover`, `<input type="...">`, CSS `:has()`, etc.). If so, use it as the base.
2. Create `packages/core/src/components/<name>.css` (use the standard header of the sibling files) and add its `@import` to `packages/core/src/components/index.css` in cascade order
3. Run `pnpm core:build` — regenerates `dist/cai.css` AND `dist/components/<name>.css` (see [DIST-RULES.md](./DIST-RULES.md))
4. Document in `apps/docs/index.html`: add a section with an id, sidebar link, demo, and a Keyboard & ARIA subsection
5. If the styles are docs-only (grids, prop tables), put them in `apps/docs/showcase.css`

**Vanilla checklist before delivering any JS:**

- [ ] Zero runtime dependencies added (`package.json` unchanged)
- [ ] No `import` of external libraries in any `.js` file
- [ ] Interactivity uses native APIs wherever possible
- [ ] Component works without a bundler (plain HTML + CSS + JS)

### Adding a new semantic token

1. Add it to `packages/tokens/src/semantic.css` in all three theme blocks (`:root, [data-theme="light"]`, `[data-theme="dark"]`, `[data-theme="high-contrast"]`)
2. If it references a new primitive, also add that to `tokens.json`
3. Run `pnpm tokens:build`
4. Document it in the Tokens section of `apps/docs/index.html`

### Adding a new primitive color

1. Add it to `tokens.json` under `color.{family}.{scale}`
2. Run `pnpm tokens:build` — adds `--cai-{family}-{scale}` to Layer 1
3. Reference from semantic tokens in Layer 2 if needed in any theme

### Modifying a breakpoint or motion token

Edit `packages/core/src/settings/_settings.css` only, then regenerate `dist/cai.css`.

---

## Not yet implemented (P2 backlog)

- Dropdown / context menu
- Pagination
- Documented grid system
