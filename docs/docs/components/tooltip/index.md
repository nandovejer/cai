# Tooltip

Adds a short hint to a control on hover or focus; never essential content.

### Known issues
Partly fails WCAG 1.4.13 (content on hover or focus): Escape does not close the tooltip, so the reader has to move the pointer or the focus away. Keep tooltips short and non-essential.

Listed in the [accessibility statement](https://nandovejer.github.io/luz/docs/accessibility/).

### Copy the markup
Tooltip markup
```html
<div class="luz-tooltip">
  <button class="luz-btn luz-btn--outline" type="button" aria-describedby="archive-tip">Archive</button>
  <div class="luz-tooltip__text" role="tooltip" id="archive-tip">Hides the project from the list</div>
</div>
```

### Variants and options
One position: above the control, centred. Where the browser has CSS anchor positioning, the tip moves below the control when there is no room above.

There are no modifiers.

- `.luz-tooltip`: Wraps the control and the tip, and opens the tip on hover and on focus inside
- `.luz-tooltip__text`: The tip: one line, on the strong surface, with a shadow

### How it works
CSS only, from `components/tooltip.css`: the tip shows while the wrapper is hovered or holds focus.

- It stays open while the pointer moves from the control onto the tip.
- It fades in and out over `--luz-duration-fast`, and appears at once under reduced motion.
- The tip does not wrap: keep it short, or it can overflow a narrow screen.
- **Enhancement:** in browsers with CSS anchor positioning (Chrome and Edge 125, Safari 26, Firefox 147: Newly available, not yet Widely available), the tip is anchored to its own control (`anchor-scope` and `anchor()` insets) and flips below it when there is no room above. Outside a size container it is no longer clipped by an ancestor that hides overflow; inside one, such as a table wrapper or a player, it is placed and clipped by that box, as before. In other browsers it stays above, as before: the rules sit inside `@supports`, with no script.

### Without JavaScript
Nothing changes: the tooltip has no script.

### Keyboard and ARIA
Focus the control with Tab and the tip shows; move the focus away and it hides.

- `aria-describedby` on the control points at the tip, so screen readers read it after the control's name.
- The tip has `role="tooltip"` and never takes focus.
- The control keeps its own name: the tip is a description, not a label.

### When to use
Use a tooltip to add a short explanation to a control whose label is clear but brief.

### When not to use
Do not put anything essential, long or interactive in a tooltip.

- Touch screens have no hover: put information people need on the page, as a hint ([form fields](https://nandovejer.github.io/luz/docs/components/form/)).
- Never use a tooltip as the only name of an icon button.
- No links or buttons inside it.
