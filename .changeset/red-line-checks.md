---
"@cai-ds/tokens": major
"@cai-ds/core": major
"@cai-ds/platform": minor
---

Every red line now has a machine check, and the breaches those checks found are fixed.

**Breaking (`@cai-ds/core`)**

- The bare-element rules that predated the `:where()` convention are now wrapped in it too, so they have zero specificity. Any consumer rule, even a bare element selector, now wins over them.
- A disabled `.cai-btn` has a transparent background and a dashed border in `--cai-text-disabled`, instead of a grey fill.
- Thirteen literal space values became `--cai-space-*` tokens. Some components move by 1–2 px: tooltip, inline code, `kbd`, nav toggle.
- `.cai-tag--blue` uses the info tokens.
- The copy button's hover text is `--cai-text-primary`.
- The `.min.js` files import their `.min.js` siblings, so `cai.min.js` lazy-loads `midi.min.js` instead of the unminified chunk.

**Breaking (`@cai-ds/tokens`)**

- `--cai-text-disabled` keeps at least 3:1 on every surface: `gray-60` in light, `gray-50` in dark.
- Dark mode: `--cai-border-interactive` is `blue-40`, so the focus ring keeps 3:1 on `layer-03`. `--cai-color-success`, `-danger`, `-info` and `-purple` are one step lighter, so tags keep 4.5:1 on a hovered table row.
- New semantic token `--cai-bg-media`, the background behind video, in all three modes.

**Tooling**

- New checks: `pnpm check:contrast` checks token pairs in the three themes, and `pnpm check:generated` fails if `docs/` differs from a fresh Pages build.
- Stylelint uses a local `cai/no-bare-element` rule, and stylelint and ESLint now also cover the apps.
- New suites: `tests/red-lines.spec.js` and `tests/red-lines.test.js`.
- `tests/fixtures/red-line-debt.json` lists red-line breaches found in existing code. It must be empty on `main`.
- The HTML elements page is published at `/html/` again: `.gitignore` was hiding `docs/html/`.
