# CAI Design System — agent context

**See [PRINCIPLES.md](./PRINCIPLES.md) for the principles and red lines every change must respect, [VANILLA-FIRST.md](./.claude/VANILLA-FIRST.md) for architectural principles, [STRUCTURE.md](./.claude/STRUCTURE.md) for directory layout, and [QUICK-REFERENCE.md](./.claude/QUICK-REFERENCE.md) for naming, tokens, and commands.**

---

## Critical Implementation Rules

### 1. `dist/` is generated, never edited directly

See [DIST-RULES.md](./.claude/DIST-RULES.md) for full regeneration steps.

### 2. `docs/` is the generated GitHub Pages site

`docs/` at the repo root is the output of `pnpm pages:build` (Vite, `--mode pages`, relative URLs) and is committed so GitHub Pages can serve it. Never edit it by hand: change `apps/` or `packages/`, rebuild, and commit the result.

### 3. Bundled fonts must be MIT licensed

Every font file shipped by a package must be under the MIT License, with its notice next to it as `LICENSE-<Font>.txt` (`pnpm check:pack` enforces the notice). Dual-licensed fonts are fine if MIT is one of the options. OFL-only fonts are not accepted.

---

## JS in `packages/core/src/`

Vanilla JS, ES modules — JavaScript only enhances what the browser already does (native `dialog`, `popover`, `input type=range|radio|checkbox`, `progress`, forms). One module per concern, all re-exported (and auto-initialized) by the `cai.js` entry. Importing an individual module has no side effects until you call its `init*()`. Published exports: `@cai-ds/core/theme`, `/sidebar`, `/clipboard`, `/modal`, `/highlight`, `/player`, `/tabs`, `/utils`, `/midi`.

| Module         | Key exports                                                    |
| -------------- | -------------------------------------------------------------- |
| `theme.js`     | `applyTheme(theme)` (sets `data-theme` on `<html>`, persists), `applyMode`, `getInitialTheme`, `initThemeSystem()` |
| `sidebar.js`   | `initSidebar()` — scroll-spy active link; closes the popover drawer on navigation |
| `clipboard.js` | `copyToClipboard(text, el, type)` (visual feedback), `initCopyButtons()` |
| `modal.js`     | `initModals()` — fallback for `command`/`commandfor` on a native `<dialog>`; `supportsCommands()` |
| `highlight.js` | `highlightBlock(pre)` — dependency-free highlight for `pre.cai-code-block`, `initHighlight()` |
| `player.js`    | `initSeekbar(bar, onSeek)`, `wrapHTMLMedia(el)`, `bindPlayerUI(root, controls, mediaLike)`, `mountPlayer(root)`, `mountMidiPlayer(root)` (async), `initPlayers()` |
| `tabs.js`      | `activateTab(tab)`, `initTabs()` — upgrades linked panels to the ARIA tabs pattern |
| `utils.js`     | `formatTime(seconds)` (`mm:ss`), `escapeHtml`, `calculateProgress`, `enableJs()` (sets `data-cai-js` on `<html>`), … |
| `midi.js`      | `MidiPlayer` — MIDI Format 0/1 parser + Web Audio scheduler (lazy-loaded chunk) |

---

## Vite config

`root: <repo-root>` + `publicDir: false` → absolute paths like `/packages/...` and `/apps/...` in HTML resolve correctly in dev. In build, `outDir: dist/` with the four apps as entries (`/`, `/docs/`, `/platform/`, `/html/`).

---

## Package layering

`tokens` is standalone; `core` requires `tokens`; `platform` requires `core` and `tokens`. The contract is expressed as required `peerDependencies` with literal ranges (never `workspace:`), and the three packages share one version (changesets `fixed`).

- Nothing in `packages/*/src` may reference docs-app hooks (`.docs-*`, `#demo-form`, …). Docs-only behavior lives in `apps/docs/docs.js`.
- `pnpm check:pack` verifies what each tarball ships against `packages/<name>/pack-files.txt`; after intentionally adding or removing a published file run `node scripts/check-pack.js --update`.
- Releases: add a changeset (`pnpm changeset`); never run `npm publish` by hand.

---

## Common workflows

### Adding a new component

1. **Check first:** is there a native HTML element or browser API that solves this? (`dialog`, `details`, `popover`, `<input type="...">`, CSS `:has()`, etc.). If so, use it as the base.
2. Create `packages/core/src/components/<name>.css` (use the standard header of the sibling files) and add its `@import` to `packages/core/src/components/index.css` in cascade order
3. Run `pnpm core:build` — regenerates `dist/cai.css` AND `dist/components/<name>.css` (see [DIST-RULES.md](./.claude/DIST-RULES.md)), then `node scripts/check-pack.js --update`
4. Document it in `apps/landing/index.html` (the component showcase): a demo article with an id, and a `<details class="landing-guide">` with the six guidance headings (`h-<id>-when`, `-when-not`, `-how`, `-content`, `-keyboard`, `-issues`), then add it to the list in the "every component has the six guidance sections" test. State the no-JS behavior and any known issue in the statement in `apps/docs/index.html`
5. If the styles are docs-only (grids, prop tables), put them in `apps/docs/showcase.css`

**Before delivering anything, read [PRINCIPLES.md](./PRINCIPLES.md): its red lines are enforced by stylelint, ESLint, `pnpm check:size`, `pnpm check:strings` and the Playwright suites (axe, no-JS, reduced motion, forced colors).**

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

### Adding a style for a bare HTML element

1. Put the rule in the file of its MDN category under `packages/core/src/elements/` (`document`, `sections`, `text`, `inline`, `media`, `forms`, `interactive`).
2. Wrap the whole selector in `:where()` (specificity 0), so any `.cai-*` class or the consumer's own rule wins. A pseudo-element goes outside: `:where(dialog)::backdrop`. Rules that predate this convention are listed in `tests/html-elements.spec.js`; do not add to that list.
3. Elements that already have a component (`table`, `input`, `select`, `button`) are styled through its class, not here.
4. Update the element's `styledBy` in `tests/fixtures/html-elements.json` and its card in `apps/html-elements/index.html`, then run `pnpm core:build` and `pnpm test:ui`.

---

## Not yet implemented (P2 backlog)

- Dropdown / context menu
- Pagination
- Documented grid system
- HTML elements page: a table of the deprecated elements with their modern replacement, and a grid of the 22 `input` types
