---
"@cai-ds/core": minor
---

**New (`@cai-ds/core`)**: four pieces for long text that the CMS package asked for, none of which knows anything about the site.

- `.cai-prose` (`components/prose.css`): on the element that holds the body of an article or a post, whatever markup an editor writes inside. Lines of about 70 characters (`--cai-prose-measure`, `70ch`), with figures, tables, `pre`, media and `.cai-table-wrap` taking the whole width of the wrapper. The space between blocks: `--cai-space-md`, `--cai-space-xl` before a heading or a rule, `--cai-space-sm` after a heading — the same three steps as classless mode, so the two agree when both are on one element. Lists get their indent and markers back with or without a class (`ul.wp-block-list`), except a list with a layout object or a `cai-` class. Inline code has the look of `.cai-code-inline`. Every selector is inside `:where()`, so any component inside, and any rule of yours, wins. Page: `/docs/components/prose/`.
- `.cai-meta` (`components/meta.css`): a line of facts (`time`, `a`, `span`) with a dot drawn by CSS between them, `content: "·" / ""`, which screen readers do not read. The line clips its inline edges, so no wrapped line starts with a dot; nothing is positioned, so a card's title link still covers the card. Page: `/docs/components/meta/`.
- `.o-grid`, `.o-stack` and `.o-row` on a `ul` or `ol` take off the markers and the indent; the items stay a list. No rule of yours is needed any more.
- Scroll spy hook: `initSidebar()` also spies every in-page link (`href="#…"`) inside an element with `data-cai-spy`, so a table of contents can have its own look without `.cai-sidebar__link`. `.cai-sidebar__link` keeps working as before. Core JS entry: 7.96 → 7.98 kB (ceiling 8 kB).

Known issues: in `.cai-prose`, a table wider than the column without `.cai-table-wrap` makes the page scroll sideways on a narrow screen; the dots of `.cai-meta` are read in browsers without alternative text for generated content (Firefox before 128, Safari before 17.4); Safari does not announce a list without markers outside a `<nav>` as a list.
