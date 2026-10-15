# @luz-ds/cms

The page structure of one kind of site, a blog, a newspaper or any site of articles, built with any CMS and any stack: the header (a bar or a newspaper's masthead), the page header, the article header, the table of contents beside the text, and the footer. Each is a class on a native element, laid out in the markup by `@luz-ds/core`'s objects (`.o-page`, `.o-sticky`, `.o-container`, `.o-row`, `.o-stack`) and its navbar; cms adds only its skin. `@luz-ds/site` is optional: its search and language switch go in the header's actions.

> **Beta, version 0.x.** CMS has a version of its own, apart from tokens, core and site, and grows in minor versions while it is 0.x: any of them may change a class. Pin an exact version and read the changelog before you upgrade.

## When to use it

- You publish articles, posts or stories, each with a title, an author and a date, some long enough to need a table of contents.
- Not for a landing page (`@luz-ds/landing`), documentation or an app.

The classes go on any element, so a template of any CMS can write them (in a block-editor template, a block's `className`). The post card, the post listing, related posts and the author box need no CSS of their own: they are markup to copy, built from core's card, avatar and pagination, on the [CMS templates](https://nandovejer.github.io/luz/docs/cms/templates/) page of the docs.

## Prerequisites

Requires `@luz-ds/tokens` and `@luz-ds/core`, version `^0.1.0`, declared as peer dependencies, loaded in that order before this package. `@luz-ds/site` (`^0.1.0`) is an optional peer: load it before this package if you use its pieces; the patterns work without it.

## Installation

```bash
npm install @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/cms
```

## Usage

### Via npm/bundler

```js
import '@luz-ds/tokens/css'
import '@luz-ds/core/css'
import '@luz-ds/site/css'
import '@luz-ds/cms/css'
```

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/cms@0.1.0/dist/cms.min.css">
```

There is no script: the header's menu is a native popover. Core's script is optional: with it, the table of contents marks the section in view (core's scroll spy, on the in-page links inside an element with `data-luz-spy`).

The body of a story is core's `.luz-prose` (line length and the space between blocks) and its date and reading time are core's `.luz-meta`; lists of posts are core's `.o-grid` or `.o-stack` on a `<ul>`. None of them needs a rule of yours.

## Package exports

- **`./css`** → `cms.css` — the patterns, in the cascade layer `luz.cms`, after `luz.site` (`./css/min` for the minified twin)
- **`./components/*`** → `dist/components/` — one stylesheet per pattern, `<name>.css` and `<name>.min.css`, each in `luz.cms`, for a page that loads only what it uses

## Classes included

- `.luz-cms-header` (`__brand`, `__actions`; `--masthead` with `__top`, `__date`, `__sections`) — The top of every page: the publication's name, its sections in core's navbar and the actions, in one row that stays at the top with core's `.o-sticky`; or, with `--masthead`, a newspaper's three rows (date and search, the name, the sections), not sticky. [Docs](https://nandovejer.github.io/luz/docs/cms/header/)
- `.luz-cms-page-header` (`__title`, `__lead`) — The title of a page that is not an article (about, contact) and one sentence about what it is for. [Docs](https://nandovejer.github.io/luz/docs/cms/page-header/)

- `.luz-cms-article-header` (`__kicker`, `__title`, `__standfirst`, `__byline`, `__media`) — The top of a story: its section, the title, the standfirst, who wrote it and when, and an optional lead picture. [Docs](https://nandovejer.github.io/luz/docs/cms/article-header/)
- `.luz-cms-article` (`__layout`) and `.luz-cms-toc` (`__title`, `__list`) — The story and its table of contents: beside the text, staying in view, when the article is 46rem wide or more; above it below that. `--luz-cms-toc-top` sets the space above it while it stays in view (by default under a `.o-sticky` bar of core's `--luz-bar-h`). [Docs](https://nandovejer.github.io/luz/docs/cms/toc/)
- `.luz-cms-footer` — The end of every page: a rule above, who publishes it and a few links at the two ends of a row; a column at 768 px and below. [Docs](https://nandovejer.github.io/luz/docs/cms/footer/)

<!-- luz:ai-agents:start -->
## For AI agents

`@luz-ds/cms` 0.0.0 is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.

### Breaking changes

Not released yet: 0.0.0 is the workspace's placeholder; the first release is 0.1.0. Nothing is deprecated and nothing breaks.

### Read first

1. `dist/classes.json` in this package: the classes and custom properties its CSS defines. Write only those.
2. https://nandovejer.github.io/luz/llms.txt: the index of the documentation, short enough for a small context.
3. https://nandovejer.github.io/luz/llms-full.txt: the same pages in full.
4. https://nandovejer.github.io/luz/examples/: one standalone page of markup for each component and pattern.

### Load order

This package needs `@luz-ds/tokens` and `@luz-ds/core` loaded first.

`@luz-ds/site` is optional: the CSS of this package works with the packages above alone.

### Check what you write

Run `npx @luz-ds/check <files>` on every HTML and CSS file you write, and fix what it reports. To copy the accessibility reviewer into your project: `npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md`.

`@luz-ds/check` is not on npm yet: it ships with the first release.

<!-- luz:ai-agents:end -->

## License

MIT
