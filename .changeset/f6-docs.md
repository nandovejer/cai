---
"@luz-ds/docs": minor
"@luz-ds/check": patch
---

New package: the pieces of a documentation page, on core's shell and sidebar. CSS only (no script), in the cascade layer `luz.docs`, after `luz.app`. Requires `@luz-ds/tokens` and `@luz-ds/core` (`^0.1.0`); `@luz-ds/site` is an optional peer, for the search in the header. Exports `./css`, `./css/min`, the class manifest and `./components/*`.

- `.luz-docs-shell`, `.luz-docs-nav`, `.luz-docs-main`: `body.o-shell.luz-docs-shell` > header, `nav.luz-sidebar.luz-docs-nav`, `main.o-main.luz-docs-main`, `aside.luz-docs-rail`, footer. Three columns from 80 rem (the sidebar 16.5 rem, the content, the rail 14 rem), two from 60 rem (the rail under the content), one below, in the order of the markup. Every child of the content keeps to `--luz-docs-measure`, 46 rem.
- `.luz-docs-page-head`, `__eyebrow`, `__lead`, `__meta`: the area and group, the `h1`, one sentence and a row of chips.
- `.luz-docs-rail`, `__onpage`, `__fold`, `__title`, `__list`, `__sub`, `__link`, `__actions`: "On this page" (a native `<details>`) and the page's actions, kept in view by native sticky positioning; a link also carries core's `.luz-sidebar__link`, so core's scroll spy marks the section in view with a start border and the weight.
- `.luz-docs-example`, `__preview`, `__frame`, `__code`: a live example and its code in one frame; `--luz-docs-example-w` narrows the frame, which is a size container.
- `.luz-docs-dodont`, `__item--do`, `__item--dont`, `__verdict`, `__stage`: a Do and a Don't, told apart by a word, a mark and a solid or dashed frame.
- `.luz-docs-pager`, `__prev`, `__next`, `__link`, `__label`, `__title`: Previous and Next as two link blocks, stacked at 640 px and below.
- `.luz-docs-page-foot`: Last updated, Edit this page, Report a problem, in small print.

`@luz-ds/check` knows the `luz-docs-*` classes: its snapshot has the facts of the seven libraries, and a `luz-docs-` name is reported as a class of `@luz-ds/docs`.
