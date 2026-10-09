---
---

PRINCIPLES.md: the docs rule for components follows the new documentation site.

- **Red line 18** now reads "No component or pattern merged without its docs page, and that page says *When to use* and *When not to use*." Platform patterns are covered too, and the rule no longer depends on the old one-page layout.
- **SR-5** (§9, the strong rules table and the definition of done): every core component and platform pattern has its own page with a one-line summary, a live example, *Known issues* (always visible, "None known." when empty), and two tabs, **Code** (*Copy the markup*, *Variants and options*, *How it works*, *Without JavaScript*, *Keyboard and ARIA*) and **Design** (*When to use*, *When not to use*, *Do and don't*, *Writing the content*, *Contrast and focus*), which stack as plain sections without JavaScript. It replaces the six guidance sections.
- **§8** allows one more stored preference: on the docs site, the last Code or Design tab, under a `cai-` key, with the value checked against the allowed list, no personal data, and every read and write in `try`/`catch`.

Why: the documentation is one page per component, and developers and designers look for different things on it (the owner's decisions in the docs redesign, phase 0). EXCEPTIONS.md gets EX-006 while the new sections are written (phases 5 and 6). No package changes.
