# @cai-ds/cms

Patterns for one kind of site, a blog, a newspaper or any site of articles, built with any CMS and any stack: the article header and the table of contents beside the text. It builds on `@cai-ds/site`, which holds what every site needs (page shell, site header, sections, footer, search).

> **Beta, version 0.x.** CMS has a version of its own, apart from tokens, core and site, and grows in minor versions while it is 0.x: any of them may change a class. Pin an exact version and read the changelog before you upgrade.

## When to use it

- You publish articles, posts or stories, each with a title, an author and a date, some long enough to need a table of contents.
- Not for documentation, a landing page or an app: `@cai-ds/site` alone (or `@cai-ds/landing`) has what they need.

The classes go on any element, so a template of any CMS can write them (in a WordPress block template, a block's `className`). The post card, the post listing, related posts and the author box need no CSS of their own: they are markup to copy, built from core's card, avatar and pagination, on the [CMS templates](https://nandovejer.github.io/cai/docs/cms/templates/) page of the docs.

## Prerequisites

Requires `@cai-ds/tokens`, `@cai-ds/core` and `@cai-ds/site`, version 3, declared as peer dependencies, loaded in that order before this package.

## Installation

```bash
npm install @cai-ds/tokens @cai-ds/core @cai-ds/site @cai-ds/cms
```

## Usage

### Via npm/bundler

```js
import '@cai-ds/tokens/css'
import '@cai-ds/core/css'
import '@cai-ds/site/css'
import '@cai-ds/cms/css'
```

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@3.0.0/dist/cai-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/site@3.0.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/cms@0.1.0/dist/cms.min.css">
```

There is no script. Core's script is optional: with it, the table of contents marks the section in view (core's scroll spy, on the in-page links inside an element with `data-cai-spy`).

The body of a story is core's `.cai-prose` (line length and the space between blocks) and its date and reading time are core's `.cai-meta`; lists of posts are core's `.o-grid` or `.o-stack` on a `<ul>`. None of them needs a rule of yours.

## Package exports

- **`./css`** → `cms.css` — the patterns, in the cascade layer `cai.cms`, after `cai.site` (`./css/min` for the minified twin)

## Classes included

- `.cai-cms-article-header` (`__kicker`, `__title`, `__standfirst`, `__byline`, `__media`) — The top of a story: its section, the title, the standfirst, who wrote it and when, and an optional lead picture. [Docs](https://nandovejer.github.io/cai/docs/cms/article-header/)
- `.cai-cms-article` (`__layout`) and `.cai-cms-toc` (`__title`, `__list`) — The story and its table of contents: beside the text, staying in view, when the article is 46rem wide or more; above it below that. `--cai-cms-toc-top` sets the space above it while it stays in view. [Docs](https://nandovejer.github.io/cai/docs/cms/toc/)

## License

MIT
