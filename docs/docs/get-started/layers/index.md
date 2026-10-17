# Cascade layers

How LUZ sits in your cascade: one layer called luz, the order to declare, and how to override it with no !important.

### Declare the order first

All of LUZ's CSS is inside one cascade layer, `luz`. Put it between your reset and your own styles, and declare that order before any stylesheet loads.

Layer order
```css
@layer reset, luz, app;
```

- The order of layers is the order in which their names first appear. A statement like this one, before everything else, fixes it.
- In HTML, put it in a `<style>` before the `<link>` elements. In a stylesheet, make it the first line, before any `@import` of LUZ.
- A later layer wins over an earlier one. So `app` wins over `luz`, and `luz` over `reset`.
- You do not have to use these names. Use whatever layers you have: `luz` is the only name LUZ adds.

Layers, and names with a dot such as `luz.components`, work in every current browser and have been available since March 2022 ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)).

### What is inside luz

Core and the other packages put their rules in their own layers inside `luz`. They are listed here from first to last: a layer lower in the table wins over the ones above it.

- `luz.tokens`: tokens: The `--luz-*` custom properties
- `luz.themes`: core: Your own looks (only custom properties; [make one](https://nandovejer.github.io/luz/docs/tokens/themes/)). LUZ ships none: its default look is in `luz.tokens`
- `luz.settings`: core: Motion, z-index and breakpoint settings
- `luz.generic`: core: The reset
- `luz.elements`: core: Bare HTML elements, at specificity 0
- `luz.objects`: core: Layout objects: `.o-*`
- `luz.components`: core: The components: `.luz-*`
- `luz.utilities`: core: Single-purpose helpers: `.u-*`. They win over components by order, not by `!important`
- `luz.site`: site: The five site components: `<luz-search>`, `<luz-consent>`, `<luz-lang-switch>`, `<luz-submenu>`, `<luz-banner>` and their `.luz-<tag>__*` classes
- `luz.landing`: landing: The patterns of a landing page: `.luz-landing-*`. After site, so they can build on it
- `luz.cms`: cms: The patterns of a blog, a newspaper or any CMS: `.luz-cms-*`. After site; landing and cms share no class, so their order decides nothing
- `luz.app`: app: The header and the dashboard of a web application: `.luz-app-*`. After cms; landing, cms and app share no class, so their order decides nothing
- `luz.docs`: docs: The pieces of a documentation page: `.luz-docs-*`. After app; it shares no class with any other package, so its place moves no other layer
- `luz.print`: core: What changes on paper, inside `@media print`: [Print styles](https://nandovejer.github.io/luz/docs/get-started/print/). Last, so it wins over the screen styles of every package

Every file LUZ publishes repeats the order of this list first, so it is the same whichever file a page loads first. These names are public: renaming one is a breaking change.

### CSS without a layer wins

Styles that are not in any layer win over every layer, whatever the order in the source. So a plain rule of yours beats `luz`, and it also beats your own `app` layer.

- If your CSS is not in layers at all, nothing changes for you: it already wins over LUZ, with no `!important`.
- If you use layers, keep your rules in one: a plain rule that you forgot to put in a layer will override your own layers.
- A plain rule is the one place a layer order does not help. Put an override in `app` or in no layer at all, and know which one you chose.

### Override LUZ

Three overrides, from the smallest. Each wins over LUZ because `app` comes after `luz`.

Overriding LUZ from your own layer
```css
@layer reset, luz, app;

@layer app {
  /* A token: every component that reads it follows */
  :root {
    --luz-brand-fill: #0b5a8c;
  }

  /* A component: your rule, in your layer */
  .luz-btn {
    min-height: 3rem;
  }

  /* A site component */
  luz-banner {
    font-size: 1rem;
  }
}
```

- **Prefer tokens.** A token changes every component that reads it, in the mode it is set for. Check the colors you set with [the contrast check](https://nandovejer.github.io/luz/docs/tokens/contrast/).
- **No `!important` and no longer selectors** are needed: layer order decides first, and specificity only counts inside one layer.
- Keep a color override in the right mode: `:root` in `app` wins over LUZ's dark mode too. Set the token per mode, for example in `[data-theme="dark"]`.

### Why one container layer

LUZ's layers used to be six top-level names: `settings`, `generic`, `elements`, `objects`, `components` and `utilities`. They are short and common, and other tools use some of the same names. A page that loaded one of them next to LUZ merged its `components` or `utilities` with LUZ's, and the order between them was an accident.

- Inside `luz`, LUZ's layer names cannot meet yours.
- One name orders all of LUZ: you place `luz` once, and you do not have to know what is inside.
- It works from a `<link>` or a CDN, where a layer cannot be added from the outside.

You can still put your own layer between two of LUZ's by naming them in the first statement: `@layer luz.components, mine, luz.utilities;`.

### Loading with @import

With a bundler that resolves package names, or with paths to the files, load them as they are. Do not add `layer(luz)` to the import: the files already declare their layers inside `luz`, and wrapping them would nest the names as `luz.luz.components`.

Importing LUZ
```css
@layer reset, luz, app;

@import url("@luz-ds/tokens/css");
@import url("@luz-ds/core/css");
@import url("@luz-ds/site/css");
@import url("@luz-ds/landing/css"); /* only for a landing page */
@import url("@luz-ds/cms/css");     /* only for a blog or a newspaper */
@import url("@luz-ds/app/css");     /* only for a web application */
@import url("@luz-ds/docs/css");    /* only for a documentation site */
```

Your own stylesheet imports a file after the statement, so the order is set before LUZ loads.
