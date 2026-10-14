---
"@cai-ds/cms": minor
---

**Breaking (0.x):** the table of contents no longer uses core's `.cai-sidebar__link`. Put `data-cai-spy` on `nav.cai-cms-toc` and drop the class from its links: `.cai-cms-toc__list a` is styled by cms, and core's scroll spy finds the links by the attribute.

```html
<nav class="cai-cms-toc" aria-labelledby="toc-title" data-cai-spy>
  <h2 class="cai-cms-toc__title" id="toc-title">Contents</h2>
  <ol class="cai-cms-toc__list">
    <li><a href="#method">How the readings were taken</a></li>
  </ol>
</nav>
```

The templates drop their stopgaps: the article body is core's `.cai-prose` (was `.o-stack`), the date and reading time are core's `.cai-meta` (was a typed `·`), and lists of posts are `ul.o-grid` without the `.posts { list-style: none … }` rule of your own. "What is not here" no longer lists spacing and line length for long text. The speakers template of `/docs/landing/templates/` drops its local list rule too.
