---
"@cai-ds/tokens": minor
"@cai-ds/core": minor
---

**New:** CAI's own syntax colours for `pre.cai-code-block`, one scheme per color mode. Six semantic tokens, defined in light, dark and high contrast: `--cai-code-comment`, `--cai-code-keyword`, `--cai-code-name`, `--cai-code-property`, `--cai-code-string`, `--cai-code-literal`. Keywords stay ink and bold, colour goes to names, properties and values, comments are muted and italic, and no token uses red (red means error). Every colour keeps 4.5:1 or more on `--cai-surface-muted`, and 7:1 or more in high contrast; `pnpm check:contrast` measures them in every theme and mode. Bold keywords and italic comments survive forced colors.

**New primitive:** `--cai-yellow-70` (`#553000`), a brown that keeps 7:1 on light surfaces, used by the high-contrast literal colour.

**New:** `highlight.js` also highlights JSON (`data-lang="json"`) and shell (`bash`, `sh`, `shell`), and marks more of HTML (boolean attributes, doctype, entities), CSS (selectors, functions, properties, media features, numbers and units, `!important`) and JavaScript (function calls, numbers, `true`, `false`, `null`, `undefined`).

**Breaking:** the highlighter emits six classes, one per token: `tok-comment`, `tok-keyword`, `tok-name`, `tok-property`, `tok-string`, `tok-literal`. To migrate hand-written spans: `tok-tag` → `tok-name`, `tok-attr` → `tok-property`, `tok-value` → `tok-string`; `tok-error` is removed (no replacement). Hex colours are now `tok-literal`, not `tok-string`. Custom themes with a dark mode should set the `--cai-code-*` tokens in it, as `vejer` and `minimalist` now do; otherwise they inherit the light values.
