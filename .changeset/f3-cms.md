---
"@luz-ds/cms": minor
---

**Breaking.** CMS now holds the page structure of a blog or a newspaper: its header, page header and footer join the article header and the table of contents. Each is a class of cms on a native element, laid out in the markup by core's objects (`.o-page`, `.o-sticky`, `.o-container`, `.o-container--inline`, `.o-row`, `.o-stack`) and core's navbar; cms adds only its skin. Site is an optional peer: with tokens, core and cms alone, every pattern renders, and the rules that refine site's `<luz-lang-switch>` match nothing.

**What each one is.**
- `.luz-cms-header`, `__brand`, `__actions`: the blog bar, `header.luz-cms-header.o-sticky > div.o-container.o-container--inline.o-row`, with core's `.luz-nav-toggle` and `nav.luz-navbar[popover]`. The page surface, a 1 px divider, one row of core's `--luz-bar-h`, the row's gaps (8 px between rows, 16 px between items, 24 px from 769 px), and `anchor-name` / `anchor-scope: --luz-bar`, so the navbar's panel and the language list open under it where anchor positioning is supported. The brand is the publication's name as a link: the heading font, semibold, the text colour, underlined on hover only, 44 px tall, `--luz-text-xl` (`--luz-text-lg` at 640 px and below); at 768 px and below it fills the room between the menu button and the actions and wraps there. A logo `<img>` in it is 44 px tall.
- `.luz-cms-header--masthead`, `__top`, `__date`, `__sections`: the newspaper's masthead, three rows in an `.o-stack`, not sticky: the date (a `time[datetime]`, small and secondary, which wraps to leave the actions their row) and the actions; the brand, centred, `--luz-text-4xl` (`-3xl` below 1024 px, `-2xl` at 640 px and below), a logo 88 px tall; and the sections between two rules, centred from 769 px, which name themselves `--luz-bar` so the navbar's panel opens under them.
- `.luz-cms-page-header`, `__title`, `__lead`: the title of a page that is not an article, with site's page header's values.
- `.luz-cms-footer`: `footer.luz-cms-footer > div.o-container.o-container--inline.o-row`, a 1 px divider above, its items at the two ends, a column aligned to the start at 768 px and below.

The table of contents no longer reads site's header: it sticks `--luz-bar-h` + `--luz-space-lg` from the top on a page with core's `.o-sticky` (in a window at least 30 rem tall), and `--luz-space-lg` otherwise.

| Was | Now | Package |
| --- | --- | --- |
| `.luz-site-header`, `__inner`, `__brand`, `__nav`, `__actions`, `--sticky` | `header.luz-cms-header.o-sticky > .o-container.o-container--inline.o-row`; `.luz-cms-header__brand`; `nav.luz-navbar`; `.o-row.luz-cms-header__actions`; or `.luz-cms-header--masthead` | cms, core |
| `.luz-site-page-header`, `__title`, `__lead` | `.luz-cms-page-header`, `__title`, `__lead` | cms |
| `.luz-site-footer` | `footer.luz-cms-footer > .o-container.o-container--inline.o-row` | cms, core |
| `.luz-cms-toc` under `.luz-site-header--sticky` (`--luz-site-header-h`) | under `.o-sticky` (`--luz-bar-h`) | cms, core |

Known issue: in browsers without CSS anchor positioning, the sections menu of the masthead opens near the top of the window and covers the publication name and the menu button while it is open; Escape, or a click outside, closes it.
