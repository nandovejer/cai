# Landing

What a landing page needs on top of core, from its header and hero to the blocks of an event page, and how to tell whether you need it.

A landing page is one page that presents a product or an event and asks the visitor to act. This package holds the patterns only that kind of page uses.

The page column, the sticky bar, the skip link and the header’s links are core’s; the search, the cookie banner and the language switch are [Site](https://nandovejer.github.io/luz/docs/site/)’s, and optional.

- Every class starts with `.luz-landing-`, uses semantic tokens only and sits in the cascade layer `luz.landing`, after site's.
- It has no script. Load `landing.css` after the CSS of tokens, core and site: [Install LUZ](https://nandovejer.github.io/luz/docs/get-started/#site-kinds) has the command and the CDN tags.
- It has a version of its own, 0.x while it grows, and needs version `^0.1.0` of tokens, core and site, declared as peer dependencies.
- [The LUZ home page](https://nandovejer.github.io/luz/) is built with it.

### Use landing when

- You build the page of a product, a service or an event, with features to show side by side.
- You want blocks to copy for such a page: hero, programme, speakers, tickets, call to action and registration.

### Use site alone when

- Your pages are articles, documentation or an app: a header, the content and a footer.
- You lay out your own blocks with core's grid objects.
