---
"@cai-ds/core": patch
---

The filled button keeps 3:1 against the page and the surface in the dark mode of the Vejer and minimalist themes, as the contrast check asks, with white text still above 4.5:1.

- `--cai-brand-fill` in `data-theme="vejer"` dark: `#1d63a8` → `#2172c1` (white text 4.9:1; 3:1 or more on page and surfaces; was 2.4:1 to 2.9:1).
- `--cai-brand-fill` in `data-theme="minimalist"` dark: `#475569` → `#5b6d86` (white text 5.3:1; 3.0:1 or more; was 2.1:1 to 2.3:1).
- The hover and active fills are unchanged, so a hover is a step darker, as before.

`pnpm check:contrast` no longer prints the four advisory lines. A visible change of a color, with no change to any role: a patch under VERSIONING.md (restoring a contrast ratio the value should have had).
