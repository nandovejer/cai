# CAI Design System — Claude Code context

**See [VANILLA-FIRST.md](./VANILLA-FIRST.md) for architectural principles, [STRUCTURE.md](./STRUCTURE.md) for directory layout, and [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for naming, tokens, and commands.**

---

## Critical Implementation Rules

### 1. `dist/` is generated, never edited directly

See [DIST-RULES.md](./DIST-RULES.md) for full regeneration steps.

---

## JS in `packages/core/src/cai.js`

Main functions (all vanilla JS, ES modules):

| Function                                  | Purpose                                                        |
| ----------------------------------------- | -------------------------------------------------------------- |
| `applyTheme(theme)`                       | Changes `data-theme` on `<html>`, persists in localStorage     |
| `openSidebar()` / `closeSidebar()`        | Toggles mobile sidebar + overlay                               |
| `copyToClipboard(text, el, type)`         | Copies text, visual feedback on the element                    |
| `formatTime(seconds)`                     | `mm:ss` for players                                            |
| `initSeekbar(bar, onSeek)`                | Drag/click/keyboard support for seekbar                        |
| `wrapHTMLMedia(el)`                       | Wraps an HTMLMediaElement with a MidiPlayer-compatible API     |
| `bindPlayerUI(root, controls, mediaLike)` | Shared binding for video/audio/MIDI                            |
| `mountPlayer(root)`                       | Mounts video/audio player                                      |
| `mountMidiPlayer(root)`                   | Mounts MIDI player (async)                                     |
| `highlightBlock(pre)`                     | Syntax highlight with no dependencies for `pre.cai-code-block` |

`midi.js` exposes `MidiPlayer` — MIDI Format 0/1 parser + Web Audio scheduler.

---

## Vite config

`root: apps/docs` + `publicDir: <repo-root>` → absolute paths like `/packages/...` in HTML resolve correctly in dev. In build, `outDir: apps/docs/dist`.

---

## Common workflows

### Adding a new component

1. **Check first:** is there a native HTML element or browser API that solves this? (`dialog`, `details`, `popover`, `<input type="...">`, CSS `:has()`, etc.). If so, use it as the base.
2. Add styles in `packages/core/src/components/_components.css`
3. Regenerate `dist/cai.css` (see [DIST-RULES.md](./DIST-RULES.md))
4. Document in `apps/docs/index.html`: add a section with an id, sidebar link, demo, and a Keyboard & ARIA subsection
5. If the styles are docs-only (grids, prop tables), put them in `apps/docs/showcase.css`

**Vanilla checklist before delivering any JS:**

- [ ] Zero runtime dependencies added (`package.json` unchanged)
- [ ] No `import` of external libraries in any `.js` file
- [ ] Interactivity uses native APIs wherever possible
- [ ] Component works without a bundler (plain HTML + CSS + JS)

### Adding a new semantic token

1. Add it to `packages/tokens/dist/cai-tokens.css` in all three theme blocks (`light`, `dark`, `high-contrast`)
2. If it is a new primitive, also add it to `tokens.json` and run `pnpm tokens:build`
3. Document it in the Tokens section of `apps/docs/index.html`

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
