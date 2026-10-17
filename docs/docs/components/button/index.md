# Button

Starts an action on the current page, such as saving, sending or opening a dialog.

### Known issues
None known.

### Copy the markup
Primary button markup
```html
<button class="luz-btn luz-btn--primary" type="button">Save changes</button>
```

A link that goes somewhere, with the look of a button:

Link styled as a button markup
```html
<a class="luz-btn luz-btn--outline" href="/pricing/">See the plans</a>
```

The full width of a narrow container, such as a card or a form on a phone:

Full-width button markup
```html
<form action="/cart/add" method="post">
  <button class="luz-btn luz-btn--primary luz-btn--block" type="submit">Add to cart</button>
</form>
```

### Variants and options
Combine `.luz-btn` with one variant and, if needed, one size and the full width.

- `.luz-btn--primary`: Brand fill: the main action of the view
- `.luz-btn--secondary`: Strong neutral surface: a second action
- `.luz-btn--outline`: Brand text and border, no fill
- `.luz-btn--ghost`: Brand text only: a low-priority action
- `.luz-btn--danger`: Danger fill: an action that deletes or cannot be undone
- `.luz-btn--sm`: 36 px high, small text
- `.luz-btn--lg`: 56 px high, base text
- `.luz-btn--block`: Fills the width of its container, and its label wraps: for a card, a form or a drawer, not for a wide column
- `disabled`: Muted text, dashed border, no pointer events

The default height is 44 px. An `<svg>` inside the button is drawn at 16 × 16 px, before or after the label.

### How it works
A native `<button>` (or `<a>`) with classes from `components/button.css`. No JavaScript.

- Set `type="button"` unless the button submits a form; the default type is `submit`.
- The height is a minimum: the label can grow with the reader's font size.
- `.luz-btn--block` sets `inline-size: 100%`. Put it where the button is the only thing in its row: in a flex row it would take the whole row. Its label wraps, and a word longer than the box breaks, so nothing leaves the button at 320 px or at 200 % text.

### Without JavaScript
A button works like any native button: it submits its form or runs nothing. What it does on click is up to your script.

On this page, Try it and the Width choice under the example need JavaScript: without it they are not shown, and the examples and their markup are.

### Keyboard and ARIA
Tab reaches the button; Enter or Space presses it. A link styled as a button answers to Enter only, as every link does.

- No ARIA is needed: the visible label is the name.
- An icon-only button needs a name: `aria-label="Close"`, and the icon `aria-hidden="true"`.
- A disabled button is skipped by Tab and screen readers may not find it: prefer an enabled button that explains what is missing.

### When to use
Use a button to start an action on the current page: save, send, delete, open a dialog.

- One primary button per view, for the action most people take.
- Secondary, outline or ghost buttons for the other actions.
- The full width (`.luz-btn--block`) when the action is the only thing in a narrow container: a card, a drawer, the submit of a form on a phone.

### When not to use
Do not use a button to go to another page: use a link, styled as a button only when it is the main call to action.

- For several related actions in a row, use an [action group](https://nandovejer.github.io/luz/docs/components/layout/#objects-actions).
- Do not disable a button to hide an action the reader cannot take yet: say why instead.
- Do not stretch a button across a wide column: a bar 1,000 px wide is not a button. Two actions side by side are two buttons of their own width.
