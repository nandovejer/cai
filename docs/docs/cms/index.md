# CMS

The page structure of a blog, a newspaper or any site of articles, from the header to the post listing, and how to tell whether you need it.

A site of articles publishes many pages of the same shape: a story with its header, its text and its author, and lists that lead to them. This package holds the page structure of that kind of site: its header (a bar or a masthead), the page header, the article header with its table of contents, and the footer. The layout every page needs (the page, the sticky bar, the navbar) is core's, and the pieces that act for the whole site (search, language, cookie consent) are in [Site](https://nandovejer.github.io/luz/docs/site/).

- It works with any CMS and any stack. The classes go on any element, so a template of WordPress, Drupal, Ghost, Hugo or your own code can write them.
- Every class starts with `.luz-cms-`, uses semantic tokens only and sits in the cascade layer `luz.cms`, after site's. Each pattern is a class on a native element, laid out in the markup by core's objects.
- It has no script. Load `cms.css` after the CSS of tokens and core (and site's, if you use it): [Install LUZ](https://nandovejer.github.io/luz/docs/get-started/#site-kinds) has the command and the CDN tags. With core's script, the table of contents marks the section in view.
- It has a version of its own, 0.x while it grows, and needs version `^0.1.0` of tokens and core, declared as peer dependencies. Site is an optional peer: without it the patterns render the same, and the rules that refine site's elements match nothing.
- The post card, the post listing, related posts and the author box need no CSS of their own: they are core's card, avatar and pagination, put together on [CMS templates](https://nandovejer.github.io/luz/docs/cms/templates/).

### Use cms when

- You publish articles, posts or stories, each with a title, an author and a date.
- Your articles are long enough to need a table of contents beside the text.
- You want a header that names the publication and its sections, as a bar or as a newspaper's masthead.

### Use another package when

- Your site is a landing page: [Landing](https://nandovejer.github.io/luz/docs/landing/) has its header, hero and footer.
- Your pages are documentation or an app, with no author or date: core's [layout](https://nandovejer.github.io/luz/docs/components/layout/) and [navbar](https://nandovejer.github.io/luz/docs/components/navbar/) are the start.
