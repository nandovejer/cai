---
---

PRINCIPLES.md §3: one shortcut is allowed by name.

- "JS never conflicts with native behaviour" now adds: a site-wide search may take a shortcut with a modifier key (`Ctrl+K` and `Meta+K`, both accepted, with no platform detection), if the trigger shows it (a visible "Ctrl K" hint and `aria-keyshortcuts`), the accessibility statement lists it, and it is ignored during IME composition and while focus is in a `textarea` or editable content. Single-character shortcuts are never allowed (WCAG 2.1.4).
- EXCEPTIONS.md gets EX-005 (SR-7): the search in `@cai-ds/platform` does not use `@cai-ds/core/i18n`; its fixed text is in the markup and the strings its script writes come from `data-cai-label-*` attributes.

Why: Ctrl+K is the usual way to open a documentation search (the owner's decision in the docs redesign, phase 0), and it takes over a browser shortcut, which §3 forbade without saying when it is acceptable. Writing the case into the rule keeps SR-8 whole, with no exception. The accessibility statement lists the shortcut under its known issues.
