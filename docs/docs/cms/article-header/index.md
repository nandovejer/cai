# Article header

Opens a story with its section, its title, a standfirst, who wrote it and when, and an optional lead picture.

### Known issues
None known.

### Copy the markup
Article header markup
```html
<header class="luz-cms-article-header">
  <p class="luz-cms-article-header__kicker"><a href="/coast/">Coast</a></p>
  <h1 class="luz-cms-article-header__title">What ten years of tide records say about the bay</h1>
  <p class="luz-cms-article-header__standfirst">Volunteers have read the gauge in the port twice a day since 2016. The sea is four centimetres higher, and winter storms now reach the old town's walls.</p>
  <div class="luz-cms-article-header__byline">
    <span class="luz-avatar luz-avatar--lg"><img src="/authors/ana-ruiz-96.jpg" width="48" height="48" alt=""></span>
    <div>
      <p>By <a href="/authors/ana-ruiz/">Ana Ruiz</a></p>
      <p class="luz-meta"><time datetime="2026-10-12">12 October 2026</time> <span>6 min read</span></p>
    </div>
  </div>
  <figure class="luz-cms-article-header__media">
    <div class="luz-image">
      <img src="/img/tide-gauge-1280.jpg" width="1280" height="720" alt="A green gauge post marked in centimetres, standing in shallow water by a stone quay" fetchpriority="high" decoding="async">
    </div>
    <figcaption>The tide gauge in the port, at low tide. Photo: Ana Ruiz.</figcaption>
  </figure>
</header>
```

### Variants and options
There are no modifiers. Only the title is required: leave out the parts you do not have.

- `.luz-cms-article-header`: The block: its parts one under another, 12 px apart, and 32 px of space below it
- `.luz-cms-article-header__kicker`: The section above the title, small capitals in the mono, like the eyebrow of the [hero](https://nandovejer.github.io/luz/docs/landing/hero/). Optional
- `.luz-cms-article-header__title`: The title: heading font, 3xl size, light weight, balanced lines; 2xl at 640 px and below
- `.luz-cms-article-header__standfirst`: One or two sentences in the secondary text colour, a size up from the body, 70 characters wide at most. Optional
- `.luz-cms-article-header__byline`: A row in the sans that wraps: an [avatar](https://nandovejer.github.io/luz/docs/components/avatar/), then the author and a [meta line](https://nandovejer.github.io/luz/docs/components/meta/) with the date. Optional
- `.luz-cms-article-header__media`: A `<figure>` with no panel around it, for an [image frame](https://nandovejer.github.io/luz/docs/components/image/) and its caption. Optional

### How it works
A grid with one column, styled by `@luz-ds/cms`, in its `cms.css`, loaded after `site.css`. No JavaScript.

- Each part styles its text through inheritance, so the class can go on the element that holds the text or on a wrapper around it. A CMS template that wraps the standfirst in a `<div>` works as well as a bare `<p>`. In a WordPress block template, give each block its class in `className`.
- The kicker is a link when your sections have pages, or plain text. The title must be the page's `<h1>`; the classes change the look only.
- The lead picture is the [image frame](https://nandovejer.github.io/luz/docs/components/image/) of core: it keeps its ratio and shows a flat surface until the picture loads. Do not set `loading="lazy"` on it: it is near the top of the page.
- A date the reader sees is a `<time>` with a machine-readable `datetime`. For a story updated after it was published, add a second line: `Updated <time datetime="…">…</time>`.

### Without JavaScript
Nothing changes: the article header is HTML and CSS.

### Keyboard and ARIA
The header has no interaction of its own: Tab reaches the kicker's and the author's links, in that order.

- The `<h1>` title lets screen reader users find the story from the heading list. The kicker comes before it in the source, as it does on the screen; it is short, so it does not delay the title.
- Inside an `<article>`, a `<header>` is not a landmark: no label is needed.
- An avatar beside the author's name is decorative: initials get `aria-hidden="true"`, a photo `alt=""`.

### When to use
Use an article header at the top of a story, a post or a report: a page with an author and a date, that people read from start to end.

### When not to use
Do not use it for a page with no author or date, such as a contact or a section page: use the [page header](https://nandovejer.github.io/luz/docs/cms/page-header/).

- For the first block of a home or a landing page, use the [hero](https://nandovejer.github.io/luz/docs/landing/hero/).
- For a story in a list, use a [post card](https://nandovejer.github.io/luz/docs/cms/templates/#post-card): the header is for the story's own page.
