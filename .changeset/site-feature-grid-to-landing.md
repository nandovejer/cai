---
"@cai-ds/site": major
---

The feature grid leaves site for `@cai-ds/landing`: `.cai-site-feature-grid` is removed from `site.css`.

**Migrate**

Install `@cai-ds/landing` and load `landing.css` after `site.css`, then replace `cai-site-feature-grid` with `cai-landing-feature-grid`. Or copy its three declarations into your own CSS:

```css
.my-feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, max(16rem, 45%)), 1fr));
  gap: var(--cai-space-sm);
}
```
