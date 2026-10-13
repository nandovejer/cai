---
"@cai-ds/cms": minor
---

New package, `@cai-ds/cms`: patterns for one kind of site, a blog, a newspaper or any site of articles, with any CMS and any stack, built on `@cai-ds/site`. It has its own version, starting at 0.1.0, and needs `@cai-ds/tokens`, `@cai-ds/core` and `@cai-ds/site` 3.x as peer dependencies, loaded first. It never depends on `@cai-ds/landing`.

- `dist/cms.css` (`./css`) and `dist/cms.min.css` (`./css/min`), in the new cascade layer `cai.cms`, after `cai.landing` and before `cai.print`. No JavaScript.
- Article header: `.cai-cms-article-header` with `__kicker`, `__title`, `__standfirst`, `__byline` and `__media`. The classes go on any element, so a CMS template (a WordPress block's `className`) can write them. Docs page at `/docs/cms/article-header/`.
- Article layout and table of contents: `.cai-cms-article` (a size container) with `__layout`, and `.cai-cms-toc` with `__title` and `__list`. The contents sit beside the text, at the inline end, and stay in view while it scrolls when the article is 46rem wide or more; above the text below that. Links with core's `.cai-sidebar__link` get core's scroll spy (`aria-current="true"` on the section in view) when core's script runs. `--cai-cms-toc-top` sets the space above the contents; under site's sticky header it clears the header. Docs page at `/docs/cms/toc/`.
- The post card, post listing, related posts, author box and a whole article page are markup to copy on `/docs/cms/templates/`, built from core's card, avatar, tag, pagination and grid objects and site's image frame and section.

Known issue: without core's script, no link of the table of contents is marked as current; beside the text, the contents sit at the inline end but come first in the source. Not yet tested with a screen reader.

Rules: PRINCIPLES.md names `@cai-ds/cms` in its introduction and adds a budget row, `cms` CSS, ideal 2 kB and ceiling 4 kB min+gzip (a new row; no ceiling is raised).
