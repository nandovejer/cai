---
"@cai-ds/core": minor
---

Meter: `.cai-meter` moves from `components/form.css` to its own `components/meter.css`, with its own docs page, and now draws every state in the brand colour. BREAKING for a page that relied on the browser's colours: `low`, `high` and `optimum` no longer paint green, yellow or red (status colours keep their own meanings: alerts, tags), so do not set them. A page that loads `components/form.css` alone must also load `components/meter.css`; `cai.css` has both. The bar is a picture of a figure that is already text: hide it with `aria-hidden="true"` in the cell of its figure, or name it with a `<label>`. It is at least 8rem long, and in a table that stacks into cards it takes a line of its own. The Form page's example no longer sets `low`, `high` and `optimum`. Page: `/docs/components/meter/`.
