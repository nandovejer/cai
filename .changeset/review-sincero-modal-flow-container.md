---
"@cai-ds/core": minor
---

Fixes from an outside review.

- **Modal:** `dialog.cai-modal` opened in the top-left corner, because the reset's `margin: 0` removed the `margin: auto` the browser uses to centre a dialog. Every `dialog` now gets `margin: auto` back (`:where(dialog)` in `elements/interactive.css`); a component that places its dialog elsewhere, such as the platform search, sets its own margin and wins by layer.
- **Classless: space between blocks.** Inside `[data-cai-classless]` a paragraph, list, quotation, figure, preformatted block, table, rule, `details`, `fieldset`, `form` or address starts `--cai-space-md` below the block before it; a heading starts `--cai-space-xl` below, and what follows a heading sits `--cai-space-sm` under it. A button that follows a field gets `--cai-space-md`. All at specificity 0, in `cai.elements`, in logical properties. About 0.15 kB min+gzip more (1.63 kB of 3 kB). No new class: the zone is still marked with `data-cai-classless`.
- **`.o-container` centres.** It had the width and the padding but no `margin-inline: auto`, although its comment said "centered". It now has `margin-inline: auto` and `inline-size: 100%`, so it also centres as a grid or flex item (the platform page shell). A container that sat at the start edge of a wide screen now sits in the middle: add your own `margin-inline: 0` to keep the old place.
- **Code is left to right.** `pre`, `code`, `kbd` and `samp` without a `dir` attribute are `direction: ltr; unicode-bidi: isolate`, so a snippet in a right-to-left page is no longer mirrored (`important!`, `<button/>…`). A `dir` of your own wins.
- **Code block language label** is a line of its own above the code (at the end edge) and no longer sits on top of the first line. A wrapper that carries the label (a bar with a copy button) still turns it off with `.cai-code-block::before { content: none }`. A labelled block is one line taller.

Docs: the dropdown page says what the component does (the focus stays on the button and the first Tab enters the panel; it never moved the focus); the classless page gives CDN `<link>` tags and `import` paths that resolve; the CDN snippets of Get started have a Copy button; the not-found page shows the A–Z link instead of a search button that cannot work without its script.
