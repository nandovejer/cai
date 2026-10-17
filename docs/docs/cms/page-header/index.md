# Page header

Gives a page that is not an article, such as About or Contact, its title and one sentence about what it is for.

### Known issues
None known.

### Copy the markup
Page header markup
```html
<div class="luz-cms-page-header">
  <h1 class="luz-cms-page-header__title">About the Review</h1>
  <p class="luz-cms-page-header__lead">An independent paper for Vejer and the coast, paid for by its readers.</p>
</div>
```

### Variants and options
There are no modifiers. The lead is optional.

- `.luz-cms-page-header`: The block, with 32 px of space below it
- `.luz-cms-page-header__title`: The title: heading font, 3xl size, light weight; 2xl at 640 px and below
- `.luz-cms-page-header__lead`: One paragraph in the secondary text colour, 600 px wide at most

### How it works
A wrapper with a title and a lead, styled by `@luz-ds/cms`. No JavaScript, and `@luz-ds/site` is optional.

- The classes change the look only. The title must be the page's `<h1>`.
- In Arabic the title has no letter-spacing, which would break the joins of the script.
- A story has the [article header](https://nandovejer.github.io/luz/docs/cms/article-header/) instead, with its section, standfirst and byline.

### Without JavaScript
Nothing changes: the page header is HTML and CSS.

### Keyboard and ARIA
The page header has no interaction.

- An `<h1>` title lets screen reader users find the page title from the heading list.
- Keep it inside `<main>`, so the skip link lands right before it.

### When to use
Use a page header at the top of a page of a blog or a newspaper that is not a story (About, Contact, a section's index) to give its title and one sentence about what it is for.

### When not to use
Do not use it for a section inside the page: use a plain heading of the right level.

- One page header per page.
- A story takes the [article header](https://nandovejer.github.io/luz/docs/cms/article-header/), which has its author and date.
