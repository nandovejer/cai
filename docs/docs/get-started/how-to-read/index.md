# How to read LUZ

What the names in LUZ's CSS, markup and tokens tell you, and which of them you can rely on.

### Class names

The start of a class name tells you what it is and which package it comes from.

What each class prefix means

- `.luz-`: A component, or a part of one: core: `.luz-btn`
- `.o-`: A layout object: it arranges things and has no look of its own: core: `.o-stack`
- `.u-`: A utility: one job, with no component around it: core: `.u-sr-only`
- `.luz-landing-`: A piece of a landing page: landing: `.luz-landing-hero`
- `.luz-cms-`: A piece of a blog, a newspaper or any CMS: cms: `.luz-cms-header`
- `.luz-app-`: A piece of a web application: app: `.luz-app-header`
- `.luz-docs-`: A piece of a documentation page: docs: `.luz-docs-pager`
- `.is-`: A state a script mirrors onto an element. Read it, but do not style from outside: it is not part of what you can rely on: core: `.is-active`

Inside a component, two separators say how the pieces fit. A double underscore names a part of the component: `.luz-card__title` is the title of a card.

A double hyphen names a variant of it: `.luz-btn--primary` is the primary button.

Read this markup from left to right, one class at a time.

A card with a primary button
```html
<div class="o-stack">
  <article class="luz-card">
    <h3 class="luz-card__title">Team plan</h3>
    <button class="luz-btn luz-btn--primary" type="button">Choose plan</button>
  </article>
</div>
```

- `o-stack` is a layout object: it spaces its children in a column.
- `luz-card` is a component, a card.
- `luz-card__title` is a part of the card: its title.
- `luz-btn` is another component, a button, and `luz-btn--primary` is its primary variant.

### Token names

A token is a CSS custom property that starts with `--luz-`. The next word says what kind of value it holds.

One token of each kind

- `--luz-blue-60`: Primitive: A raw color: a family and a step. It has no role and never changes with the mode
- `--luz-brand-primary`: Semantic token: A role: the color of links and actions. It has a value for each mode
- `--luz-space-md`: Scale step: One step of the space scale
- `--luz-text-lg`: Scale step: One step of the type scale
- `--luz-type-base`: Knob: The value a whole scale is worked out from. Change it to resize every step
- `--luz-z-modal`: Setting: A value core uses to lay out the page: stacking order, motion and breakpoints

- LUZ's own components read semantic tokens and scale steps. They never read a primitive or a knob.
- You can set any token in your own CSS. [Make it yours](https://nandovejer.github.io/luz/docs/get-started/make-it-yours/) shows how.

Each family has a page: [color](https://nandovejer.github.io/luz/docs/tokens/color/), [typography](https://nandovejer.github.io/luz/docs/tokens/typography/), [spacing and sizing](https://nandovejer.github.io/luz/docs/tokens/spacing/), [radius](https://nandovejer.github.io/luz/docs/tokens/radius/), [shadows](https://nandovejer.github.io/luz/docs/tokens/shadows/), [motion](https://nandovejer.github.io/luz/docs/tokens/motion/) and [layout and breakpoints](https://nandovejer.github.io/luz/docs/tokens/layout/).

### Attributes

Classes are for style. Attributes that start with `data-` are how a script and your markup talk to each other.

- `data-theme` on `<html>` picks the color mode (`light`, `dark` or `high-contrast`) or the name of a look of your own.
- `data-mode` on `<html>` picks the color mode inside a look of your own: `data-theme="my-brand"` with `data-mode="dark"`.
- `data-luz-*` are the hooks of LUZ's scripts, such as `data-luz-js`, which the script sets on `<html>` once it runs. A script binds to these, never to a class.
- `data-luz-classless` turns on [classless styles](https://nandovejer.github.io/luz/docs/get-started/classless/) for the markup inside it.
- `data-luz-label-*` overrides one string a script writes.

These are examples, not the full list: each component's page names the attributes it uses.

### Elements that start with luz

A tag that starts with `luz-` is a custom element. LUZ's are in the light DOM, so your CSS reaches inside them, and their parts are classes: `.luz-<tag>__<part>`.

- **With a script:** `<luz-search>`, `<luz-consent>`, `<luz-mode>` and `<luz-timeline>` need their script to do their job.
- **CSS only:** `<luz-lang-switch>`, `<luz-submenu>` and `<luz-banner>` have no script at all. They are a tag you can style before and without its script.

Which package holds each one is in [How LUZ is organised](https://nandovejer.github.io/luz/docs/get-started/structure/).

### Layers, in one paragraph

All of LUZ's CSS is in one cascade layer called `luz`, with named layers inside it, and any CSS of yours that is not in a layer wins over all of it, with no `!important`. [Cascade layers](https://nandovejer.github.io/luz/docs/get-started/layers/) lists them in order and shows how to override one.

### What you can rely on

Not every name is a promise. These four parts of LUZ are public API: a change to them is announced.

- **Tokens**: every `--luz-` custom property in `tokens.css`, not the ones a component declares for itself.
- **Classes**: `.luz-`, `.o-` and `.u-` classes in the markup the docs show, with their parts and variants. Not `.is-` classes.
- **Attributes**: `data-theme`, `data-mode`, `data-luz-*` and `data-luz-label-*`. Not the attributes the docs site's own scripts use.
- **Packages**: the `exports` map of each package and the paths of the files it publishes.

In beta, anything may break, and the changeset of the release says how to migrate. Read [What is public API, in VERSIONING.md on GitHub](https://github.com/nandovejer/luz/blob/main/VERSIONING.md) for the whole table.

### Reading a file name

A file name says what is in it. Every CSS file also has a `.min` twin that holds the same rules, minified: `luz.css` and `luz.min.css`.

Files in the dist folder of each package

- `luz-tokens.css`: `@luz-ds/tokens`: Always, unless you bring your own font. It has the tokens and the `@font-face` rules of ET Book
- `tokens.css`: `@luz-ds/tokens`: Instead of `luz-tokens.css`, when you bring your own font: the same tokens, with no `@font-face`
- `luz.css`: `@luz-ds/core`: For the reset, the bare elements, the layout objects, the components and the utilities, all at once
- `base.css`: `@luz-ds/core`: When you want only a few components: the reset and the bare elements, then one file per component
- `components/<name>.css`: `@luz-ds/core`: After `base.css`, for each component you use
- `classless.css`: `@luz-ds/core`: For markup you cannot add classes to, inside `data-luz-classless`. It is a file of its own, not in `luz.css`
- `themes/_template.css`: `@luz-ds/core`: Never as it is: copy it as the start of a look of your own
- `site.css`: `@luz-ds/site`: When the page uses a site element such as `<luz-search>`

To pick the lines for your build, [choose your snippet](https://nandovejer.github.io/luz/docs/get-started/snippet/).
