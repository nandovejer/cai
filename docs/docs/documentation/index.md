# Documentation

The shell, page head, rail, example, do and don't, pager and page foot of a documentation site, and how to tell whether you need them.

### Use this package when

- You write a documentation site: guides, a reference, a manual, with a sidebar of pages.
- You want a long page to have a head, a list of its sections and a way to the next page.

### Use another package when

- Your site is a landing page, a blog or an application: [Landing](https://nandovejer.github.io/luz/docs/landing/), [CMS](https://nandovejer.github.io/luz/docs/cms/) and [App](https://nandovejer.github.io/luz/docs/app/) have their own pieces.
- You only need a sidebar and a content area: core's [layout](https://nandovejer.github.io/luz/docs/components/layout/) and [sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/) are enough.

A documentation site is read in long sittings, one page after the next. The layout it needs is already core's: the shell, the sidebar and its drawer, the code block, the table.

This package holds the seven pieces only a documentation page has: the three columns, the head, the list of sections, the framed example, the do and don't pair, the links to the next page and the small print.

### Install and load

- Every class starts with `.luz-docs-`, uses semantic tokens only and sits in the cascade layer `luz.docs`, after app's.
- It has no script. Load `docs.css` after the CSS of tokens and core: [Install LUZ](https://nandovejer.github.io/luz/docs/get-started/#site-kinds) has the command. Core's script is optional: it marks the section in view in the rail.
- It has a version of its own, 0.x while it grows, and needs `^0.1.0` of tokens and core. Site is an optional peer, for the search.
- A whole page to copy, and what is not in 0.1, are on [Documentation templates](https://nandovejer.github.io/luz/docs/documentation/templates/).
