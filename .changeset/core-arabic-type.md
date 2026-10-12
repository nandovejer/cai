---
"@cai-ds/core": minor
---

Arabic text in `@cai-ds/core`: ET Book has no Arabic letters, so inside any element in Arabic (`:lang(ar)`) `--cai-font-body` and `--cai-font-heading` are the system sans (`--cai-font-sans`), set in `cai.settings` at specificity 0. No font is bundled.

Letter spacing breaks the joins of Arabic script, so it is 0 in Arabic on the headings (`h1`–`h6`), `.cai-sidebar__brand-name`, `.cai-sidebar__section-label`, `.cai-mode-switcher__label`, `.cai-fieldset legend`, `.cai-legend`, `.cai-table th` and the column labels of a stacked table.

To use your own Arabic face, set `--cai-font-body` and `--cai-font-heading` for `:lang(ar)` in your own CSS, outside CAI's layers.
