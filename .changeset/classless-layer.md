---
"@cai-ds/core": minor
---

A classless stylesheet, `@cai-ds/core/classless.css`: the look of a bare `button`, `input`, `textarea`, `select` and `table` inside an element with `data-cai-classless`. For markup you cannot add classes to (Markdown, a CMS).

**Added (`@cai-ds/core`)**

- `dist/classless.css` and `dist/classless.min.css`, exported as `@cai-ds/core/classless.css`. Not part of `cai.css`: nothing changes for a page that does not load it.
- Scope: `[data-cai-classless]` on `<body>` or on any element, which styles its descendants. Specificity 0 (everything inside `:where()`, RL-11), in the layer `cai.elements`; an element whose class contains `cai-` is left to its component.
- A bare `button` and `input` of type `button` or `reset` look like `.cai-btn--secondary`; `type="submit"` like `.cai-btn--primary`. Text-like inputs and `textarea` look like `.cai-input`; `select` like the closed box of `.cai-select`; `table` like `.cai-table` (appearance only: no scroll box, no stacking, which need a wrapper and `data-label`).
- Left out on purpose: `checkbox`, `radio`, `range`, `color`, `file` and `hidden` inputs, the styled open list of a select, `.cai-field` with its label and messages.
- Size: 1.5 kB min+gzip, with its own budget row (ideal 2 kB, ceiling 3 kB). No existing ceiling changes.
- Docs: Get started > Classless styles.

**Tested** (`tests/classless.spec.js`): each bare element against its component, property by property (button, submit, disabled, hover and focus, inputs in every state, date picker per color mode, select box, table parts); outside the scope nothing changes; a CAI class inside the scope is left alone; specificity zero; right-to-left and forced colors for the select. `tests/layers.test.js` also covers the new file.
