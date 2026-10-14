# @luz-ds/landing

Patterns for one kind of site, a landing page: the page of a product, a service or an event that asks the visitor to act. It builds on `@luz-ds/site`, which holds what every site needs (page shell, site header, sections, footer, search).

> **Beta, version 0.x.** Landing has a version of its own, apart from tokens, core and site, and grows in minor versions while it is 0.x: any of them may change a class. Pin an exact version and read the changelog before you upgrade.

## When to use it

- You build the page of a product, a service or an event, with features to show side by side.
- Not for articles, documentation or an app: `@luz-ds/site` alone has what they need.

The blocks of an event landing page (hero, programme, speakers, tickets, call to action, registration) are markup to copy, on the [Landing page templates](https://nandovejer.github.io/luz/docs/landing/templates/) page of the docs. They use the classes of core, site and this package.

## Prerequisites

Requires `@luz-ds/tokens`, `@luz-ds/core` and `@luz-ds/site`, version `^0.1.0`, declared as peer dependencies, loaded in that order before this package.

## Installation

```bash
npm install @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/landing
```

## Usage

### Via npm/bundler

```js
import '@luz-ds/tokens/css'
import '@luz-ds/core/css'
import '@luz-ds/site/css'
import '@luz-ds/landing/css'
```

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/landing@0.1.0/dist/landing.min.css">
```

There is no script. Add core's and site's if you use their behaviours.

## Package exports

- **`./css`** → `landing.css` — the patterns, in the cascade layer `luz.landing`, after `luz.site` (`./css/min` for the minified twin)

## Classes included

- `.luz-landing-feature-grid` — A short set of features or options of equal weight, usually cards: two columns at most, one when two do not fit 16rem each. It follows the room the grid has, not the window. [Docs](https://nandovejer.github.io/luz/docs/landing/feature-grid/)

## License

MIT
