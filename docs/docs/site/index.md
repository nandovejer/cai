# Site

Six self-contained components that need data of the site: search, cookie consent, color mode, language switch, submenu and banner, and how to tell whether you need them.

A piece is here when it needs data of the site: its search index, its cookie policy, its languages, its menu, an announcement. Each is a `<luz-*>` tag that works on its own, in any header or page.

Everything else is a **component** of core, one reusable piece that fits inside anything; components are in [Components](https://nandovejer.github.io/luz/docs/components/).

The page structure (the header, the hero, the footer, the page header) is in the packages for one kind of site: [landing](https://nandovejer.github.io/luz/docs/landing/) for a landing page and [CMS](https://nandovejer.github.io/luz/docs/cms/) for a blog, a newspaper or any CMS. They work without this package, and take its components where a search or a language switch goes.

- Each tag is the block, and its parts are `.luz-<tag>__<part>`; every rule uses semantic tokens only.
- [The LUZ home page](https://nandovejer.github.io/luz/) and these docs are built with them.
- Not sure which package a piece belongs to? [What each package needs](https://nandovejer.github.io/luz/docs/get-started/structure/#needs) lists every piece, with the package it is in.

### Use site when

- You want a site search, a cookie banner or a language switch without writing them yourself.
- Your header has a few links grouped under one button.
- You need a short announcement above the header on every page.

### Use core alone when

- You only need components such as buttons, forms and cards.
- Your site has no search, no optional cookies and one language.
- You build a single widget, not a whole page.

### Your own components on top

Style what you add with semantic tokens too, so it follows the color mode and any [theme of your own](https://nandovejer.github.io/luz/docs/tokens/themes/).

Semantic tokens in an app-level component
```css
.my-panel {
  background: var(--luz-surface);
  border: 1px solid var(--luz-divider);
  color: var(--luz-text-primary);
}

.my-panel:hover {
  background: var(--luz-surface-muted);
  border-color: var(--luz-outline);
}

/* Not a primitive colour: it would stay the same in dark mode */
/* color: var(--luz-gray-100); */
```
