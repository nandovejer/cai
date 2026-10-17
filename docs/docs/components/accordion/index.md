# Accordion

Shows and hides sections of content with the native details and summary elements, one at a time if you name the group.

### Known issues
Two points to know before you rely on a named group.

**Exclusive group.** The `name` attribute works in Chrome and Edge 120, Safari 17.2 and Firefox 130, all from September 2024 or earlier, so it is not yet Baseline widely available. In an older browser each panel opens on its own: nothing is lost.

**Screen readers.** How NVDA, JAWS, VoiceOver, TalkBack and Orca announce an exclusive group has not been tested for LUZ, and no support data was checked. The grouping of an exclusive set is not described to assistive technology: the HTML accessibility mapping for it is still an open issue (see the [Open UI explainer](https://open-ui.org/components/accordion.explainer)).

### Copy the markup
Accordion markup
```html
<div class="luz-accordion">
  <details name="faq" open>
    <summary>What is a design token?</summary>
    <p>A named value that components read.</p>
  </details>
  <details name="faq">
    <summary>Does it need JavaScript?</summary>
    <p>No.</p>
  </details>
</div>
```

### Variants and options
A single `<details>` needs no class: the elements layer styles it. The class only joins a stack.

- `.luz-accordion`: Joins the `<details>` inside it into one block: one edge between them, rounded corners only on the block
- `name="…"`: Connects the details with the same name: only one is open at a time. They need not be adjacent
- `open`: Starts a panel open. In a named group, only the first `open` one in the source stays open

### How it works
Native `<details>` and `<summary>`, styled by `elements/interactive.css` with no class. `components/accordion.css` adds only the joined block.

No JavaScript.

- The summary is the label of the panel; the rest of the details is its content.
- Closed content is not shown and is out of the reading order until the panel opens.

### Without JavaScript
Nothing changes: opening, closing and grouping are the browser's. The accordion is complete without a script.

### Keyboard and ARIA
Tab reaches each summary in order. Enter or Space opens or closes it.

There are no arrow-key shortcuts between panels.

- Add no role: a `<details>` already has its semantics, and no ARIA role is allowed on it.
- Keep links and buttons out of the summary: it is itself the control.

### When to use
Use an accordion for content that most readers can skip, grouped under short titles.

- Frequently asked questions and long reference lists.
- Optional detail under a short answer.

### When not to use
Do not hide what every reader needs, and do not use it to move around the site.

- For the main sections of a site, use a [sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/). For content a reader switches between, use [tabs](https://nandovejer.github.io/luz/docs/components/tabs/).
- Do not put an error, a warning or a required step inside a closed panel.
- With only one or two short answers, show them as plain text.
