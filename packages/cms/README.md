# @luz-ds/cms

Patterns for one kind of site, a blog, a newspaper or any site of articles, built with any CMS and any stack: the article header and the table of contents beside the text. It builds on `@luz-ds/site`, which holds what every site needs (page shell, site header, sections, footer, search).

> **Beta, version 0.x.** CMS has a version of its own, apart from tokens, core and site, and grows in minor versions while it is 0.x: any of them may change a class. Pin an exact version and read the changelog before you upgrade.

## When to use it

- You publish articles, posts or stories, each with a title, an author and a date, some long enough to need a table of contents.
- Not for documentation, a landing page or an app: `@luz-ds/site` alone (or `@luz-ds/landing`) has what they need.

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

There is no script. Core's script is optional: with it, the table of contents marks the section in view (core's scroll spy, on the in-page links inside an element with `data-luz-spy`).

The body of a story is core's `.luz-prose` (line length and the space between blocks) and its date and reading time are core's `.luz-meta`; lists of posts are core's `.o-grid` or `.o-stack` on a `<ul>`. None of them needs a rule of yours.

## Package exports

- **`./css`** → `cms.css` — the patterns, in the cascade layer `luz.cms`, after `luz.site` (`./css/min` for the minified twin)
- **`./components/*`** → `dist/components/` — one stylesheet per pattern, `<name>.css` and `<name>.min.css`, each in `luz.cms`, for a page that loads only what it uses

## Classes included

- `.luz-cms-article-header` (`__kicker`, `__title`, `__standfirst`, `__byline`, `__media`) — The top of a story: its section, the title, the standfirst, who wrote it and when, and an optional lead picture. [Docs](https://nandovejer.github.io/luz/docs/cms/article-header/)
- `.luz-cms-article` (`__layout`) and `.luz-cms-toc` (`__title`, `__list`) — The story and its table of contents: beside the text, staying in view, when the article is 46rem wide or more; above it below that. `--luz-cms-toc-top` sets the space above it while it stays in view. [Docs](https://nandovejer.github.io/luz/docs/cms/toc/)

## License

MIT
