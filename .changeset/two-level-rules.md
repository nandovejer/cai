---
"@cai-ds/tokens": major
"@cai-ds/core": major
"@cai-ds/platform": minor
---

Two levels of rules, MIT-only fonts, a language dictionary and size ceilings (see PRINCIPLES.md and EXCEPTIONS.md).

**Breaking (`@cai-ds/tokens`)**

- Gidole and Monoid are removed: they are dual-licensed, and bundled fonts must now be MIT only. `--cai-font-sans` is the system stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) and `--cai-font-mono` is `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`. ET Book is the only bundled face left in tokens. If you relied on Gidole or Monoid, self-host them in your app and set the two tokens.

**Breaking (`@cai-ds/core`)**

- The icon grid is a list: `<ul class="cai-icon-grid">` with `<li class="cai-icon-item">`, the icon and its name in `<span>`s, and a native `<button class="cai-copy-btn" data-copy="…">` per icon. `data-svg` on the item, the item's `role="button"`, `tabindex` and keyboard handler are removed. Name each button with `aria-labelledby` pointing at itself and the icon name.
- The `.copy-btn` alias is removed; use `.cai-copy-btn` on a `<button>`. The custom Enter/Space handler is gone because native buttons already do it.
- The "Copied" feedback no longer starts with a check mark, so screen readers do not read it out.
- The minimalist and ricardoymortimer themes no longer reference Gidole.

**New**

- `@cai-ds/core/i18n`: `t(key, el, vars)`, `getLang(el)` and `registerLocale(lang, messages)`, also re-exported from `@cai-ds/core`. Every string the JavaScript writes comes from it. English and Spanish ship built in. The language is the nearest `lang` attribute; with none, CAI uses English and warns in the console (WCAG 3.1.1). `data-cai-label-<key>` attributes override the dictionary.
- Size budgets have bands and ceilings, and now cover the MIDI chunk and `@cai-ds/platform`. Ceilings are a red line.
- `pnpm check:exceptions` keeps `cai-exception: EX-nnn` comments and EXCEPTIONS.md in step.
