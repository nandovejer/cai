# Banner

Tells every visitor one short thing at the top of the page, such as a sale, an event or planned maintenance.

### Known issues
It cannot be closed: a close button needs a script, and a choice that lasts from page to page needs storage. Keep the banner short and remove it from the markup when it ends. In a browser without CSS anchor positioning (before Chrome and Edge 125, Safari 26, Firefox 147), the header’s menu at 768 px and below opens at the top of the window, so before the page scrolls it covers part of the header under a banner; Escape or a click outside closes it.

### Copy the markup
A `<luz-banner>` around one `<section>` named by its first words, after the [skip link](https://nandovejer.github.io/luz/docs/components/skip-link/) and the [cookie consent](https://nandovejer.github.io/luz/docs/site/consent/), before the header of the page (a [landing](https://nandovejer.github.io/luz/docs/landing/header/) or [CMS](https://nandovejer.github.io/luz/docs/cms/header/) header).

Banner markup
```html
<a class="luz-skip-link" href="#main">Skip to main content</a>
<luz-banner>
  <section aria-labelledby="banner-label">
    <p><strong id="banner-label">Open day.</strong> Visit the winery on Saturday 25 October,
      from 11:00 to 18:00. <a href="/visits/">Book a visit</a></p>
  </section>
</luz-banner>
<header>…</header>
```

### Variants and options
- `<luz-banner>`: Around one `<section>`, which becomes a band as wide as its container, on a muted surface with a rule under it, in small sans text. Its text starts where the header’s row starts. A tag that no script defines: no class, no role of its own
- `tone="warning"`: On the tag, the one tone: The warning colours: for something that stops the visitor doing what they came to do, such as maintenance. Say it in the words too: “Planned maintenance.” Any other value leaves the plain band

### How it works
CSS from `@luz-ds/site`. No JavaScript: `<luz-banner>` is a tag that no script ever defines.

- It is a band of the page, in the flow: it scrolls away with the page, and an `.o-sticky` header stays at the top under it. Nothing covers the page.
- Its inline padding lines its text up with the header’s row, up to `--luz-content-max` wide, in either direction of text.
- There is no close button. Closing it for good needs a script and a value stored in the browser, and a button that does nothing without a script is never shown. A banner is short-lived: remove it from the markup when the event is over.
- There is no success or error tone: a banner is not the answer to something the visitor did. For that use an [alert](https://nandovejer.github.io/luz/docs/components/alert/) in the page.

### Without JavaScript
Nothing changes: there is no script.

### Keyboard and ARIA
- **Order:** its link comes after the skip link and before the header.
- **Landmark:** a `<section>` with a name is a region, so a screen reader lists it among the landmarks; name it with `aria-labelledby` pointing at its first words. If it says nothing more than its sentence, a `<div>` with no name is fine.
- **Not a live region:** it is there when the page loads, so it needs no `role="status"` or `role="alert"`; a screen reader reads it with the rest of the page.

### When to use
Use it for one short, timely thing every visitor of the site should know, on every page, for a few days: a sale, an event, planned maintenance, a change of opening hours.

### When not to use
Do not use it for something that belongs to one page or to one visitor: put that in the page, or answer with an [alert](https://nandovejer.github.io/luz/docs/components/alert/) or a [toast](https://nandovejer.github.io/luz/docs/components/toast/).

- Do not show two banners at once, and do not leave one up for months: a band that never changes is no longer read.
- Do not use it to ask for cookies: use the [cookie consent](https://nandovejer.github.io/luz/docs/site/consent/) banner.
- Do not put a form or more than one link in it.

It replaces the announcement bars a site builds with its own CSS. Nothing in LUZ is removed.
