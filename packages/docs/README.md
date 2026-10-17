# @luz-ds/docs

The pieces of a documentation page: the shell (the sidebar, the content and a rail), the page head, the rail ("On this page" and the page's actions), the frame of a live example and its code, do and don't, Previous / Next and the page foot. Each is a class on a native element, on `@luz-ds/core`'s objects and components (`.o-shell`, `.o-main`, `.luz-sidebar`, `.luz-code-block`); docs adds only its layout, its skin and its rhythm. `@luz-ds/site` is optional: its search goes in the header.

> **Beta, version 0.x.** Docs has a version of its own, apart from tokens, core and site, and grows in minor versions while it is 0.x: any of them may change a class. Pin an exact version and read the changelog before you upgrade.

## When to use it

- You write the documentation of a library, a product or an API, one page per thing, with a sidebar of pages.
- You show live examples with their markup, and say what to do and what not to do.
- Not for a landing page (`@luz-ds/landing`), a blog (`@luz-ds/cms`) or a web application (`@luz-ds/app`).

The shell has three columns from 80 rem (the sidebar 16.5 rem, the content, the rail 14 rem), two from 60 rem (the rail above the content, in its column) and one below, where core's sidebar is a drawer at 768 px and below when it is a popover. The content keeps to a measure of 46 rem (`--luz-docs-measure`).

## Prerequisites

Requires `@luz-ds/tokens` and `@luz-ds/core`, version `^0.1.0`, declared as peer dependencies, loaded in that order before this package. `@luz-ds/site` (`^0.1.0`) is an optional peer: load it before this package if you use its search; the patterns work without it.

## Installation

```bash
npm install @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/docs
```

## Usage

### Via npm/bundler

```js
import '@luz-ds/tokens/css'
import '@luz-ds/core/css'
import '@luz-ds/site/css'
import '@luz-ds/docs/css'
```

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/docs@0.1.0/dist/docs.min.css">
```

There is no script: "On this page" is a native `<details>`, the rail stays in view with native sticky positioning and the drawer is core's popover. Core's script is optional: with it, the sidebar and the rail mark the section in view.

## Package exports

- **`./css`** → `docs.css` — the patterns, in the cascade layer `luz.docs`, after `luz.app` (`./css/min` for the minified twin)
- **`./components/*`** → `dist/components/` — one stylesheet per pattern, `<name>.css` and `<name>.min.css`, each in `luz.docs`, for a page that loads only what it uses

## Classes included

- `.luz-docs-shell` (with `.luz-docs-nav` and `.luz-docs-main`) — The page: core's `.o-shell` with the header, the sidebar, the content, the rail and the footer in three, two or one column; sets `--luz-docs-measure`. [Docs](https://nandovejer.github.io/luz/docs/documentation/shell/)
- `.luz-docs-page-head` (`__eyebrow`, `__lead`, `__meta`) — The area and group, the h1, one sentence and a row of chips (the files, the script, the modes, the known issues). [Docs](https://nandovejer.github.io/luz/docs/documentation/page-head/)
- `.luz-docs-rail` (`__inner`, `__onpage`, `__fold`, `__title`, `__list`, `__sub`, `__link`, `__actions`) — "On this page" and the page's actions in one inner box, in view while the page scrolls and never over the footer. [Docs](https://nandovejer.github.io/luz/docs/documentation/rail/)
- `.luz-docs-example` (`__preview`, `__frame`, `__code`) — A live example and its code in one frame; `--luz-docs-example-w` narrows the frame. [Docs](https://nandovejer.github.io/luz/docs/documentation/example/)
- `.luz-docs-dodont` (`__item`, `__item--do`, `__item--dont`, `__verdict`, `__stage`) — A Do and a Don't, side by side when there is room, told apart by a word, a mark and the frame. [Docs](https://nandovejer.github.io/luz/docs/documentation/dodont/)
- `.luz-docs-pager` (`__prev`, `__next`, `__link`, `__label`, `__title`) — Previous and Next as two link blocks. [Docs](https://nandovejer.github.io/luz/docs/documentation/pager/)
- `.luz-docs-page-foot` — Last updated, Edit this page, Report a problem. [Docs](https://nandovejer.github.io/luz/docs/documentation/page-foot/)

<!-- luz:ai-agents:start -->
## For AI agents

`@luz-ds/docs` 0.0.0 is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.

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
