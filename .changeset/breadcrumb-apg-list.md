---
"@cai-ds/core": major
---

**Breaking:** the breadcrumb follows the [APG breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): `.cai-breadcrumb` goes on an `<ol>` inside the labelled `<nav>`, with one `<li>` per step and `aria-current="page"` on the last. Screen readers now announce a list and how many steps it has.

`.cai-breadcrumb__sep` is gone. The CSS draws the separator before each item after the first, as a slanted border with empty content, so there is nothing for assistive technology to read and nothing for you to write.

To migrate, replace

```html
<nav aria-label="Breadcrumb">
  <div class="cai-breadcrumb">
    <a class="cai-breadcrumb__item" href="/">Home</a>
    <span class="cai-breadcrumb__sep" aria-hidden="true">/</span>
    <span class="cai-breadcrumb__item" aria-current="page">Billing</span>
  </div>
</nav>
```

with

```html
<nav aria-label="Breadcrumb">
  <ol class="cai-breadcrumb">
    <li><a class="cai-breadcrumb__item" href="/">Home</a></li>
    <li><span class="cai-breadcrumb__item" aria-current="page">Billing</span></li>
  </ol>
</nav>
```
