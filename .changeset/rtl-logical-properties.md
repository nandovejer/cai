---
"@cai-ds/core": patch
---

Right-to-left text: the last physical offsets are logical, and a test keeps every component demo mirroring.

**Fixed (`@cai-ds/core`)**

- `.cai-tooltip__text` is placed with `inset-inline-start` (and a `:dir(rtl)` shift), the check mark and the radio dot of `.cai-check-item` with `inset-inline-start`, instead of `left`.
- The switch thumb and the breadcrumb separator use `:dir(rtl)`, not `[dir="rtl"]`: a direction that comes from the `direction` property, or from an ancestor's `dir`, now counts too.
- The breadcrumb's slash leans the other way in right-to-left text.
- The documented decision for the player: its timeline follows the reading direction.

**Lint:** stylelint now also rejects `left`, `right` and the four physical corner radii (`border-top-left-radius`, …) in `packages/`, with the logical property as the suggestion (SR-4). A four-value shorthand with different sides is not caught by a property rule: the RTL test is what catches it.
