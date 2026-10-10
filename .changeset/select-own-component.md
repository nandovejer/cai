---
"@cai-ds/core": major
---

**Breaking:** the select is its own component, `.cai-select`, on the `<select>` itself. `.cai-select-wrap` is gone, and a `<select class="cai-input">` no longer gets an arrow.

**Why:** the wrapper drew its arrow with a `::after` that held the text "▾": a fixed colour, a character a screen reader could read, and nothing for `multiple` or `size`. The new arrow is two gradients in `currentcolor`, on the select, so it follows the text colour, the disabled state and the right-to-left direction, and it is gone for `multiple` and `size`.

**New (`@cai-ds/core`, `components/select.css`, in `cai.css`)**

- Layer 1, every browser: the closed box styled with tokens (border, height 44 px, type, hover, focus ring, `aria-invalid` and `:user-invalid`, `disabled` with a dashed border, forced colors, `color-scheme` from the theme). The open list stays the system's.
- Layer 2, inside `@supports (appearance: base-select)` (Chrome and Edge 135, Safari 27; Firefox not yet): the open list, its options and the check mark follow the tokens. Outside the block nothing changes.
- A page for it in the docs, with when to use it (a long list; radios for six options or fewer, checkboxes for several) and when not.

**To migrate**

```html
<!-- before -->
<div class="cai-select-wrap">
  <select class="cai-input" id="role">…</select>
</div>

<!-- after -->
<select class="cai-select" id="role">…</select>
```
