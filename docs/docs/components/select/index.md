# Select

A native drop-down list for choosing one option from a long list, with the closed box styled by tokens.

### Known issues
The open list looks different in each browser and system. This is intended.

- The closed box is the same everywhere. The list that opens from it is drawn by the browser or the operating system, and it is the one the reader already knows.
- Browsers that support `appearance: base-select` (Chrome and Edge 135 and later, Safari 27 and later) also get the list in LUZ's colors, shape and spacing. Firefox shows its own list.
- On phones, the system's own picker opens, and LUZ cannot style it.

### Copy the markup
Select markup
```html
<div class="luz-field">
  <label class="luz-field__label" for="country">Country</label>
  <select class="luz-select" id="country" name="country">
    <option value="">Select a country</option>
    <option value="de">Germany</option>
    <option value="es">Spain</option>
    <option value="fr">France</option>
  </select>
</div>
```

### Variants and options
One class, on the `<select>` itself. There is no wrapper and no modifier: the state comes from the native attributes.

- `.luz-select`: The closed box: 44 px high, a bottom border and an arrow at the end of the line
- `aria-invalid="true"`: The error state: a thicker border in the danger color. Pair it with the error text
- `disabled`: Disabled text and a dashed border
- `multiple`, `size`: A list that stays open, with a full border and no arrow
- `<optgroup label>`: A labelled set of options

### How it works
A native `<select>` styled by `components/select.css`, in two layers. No JavaScript.

- **The closed box, in every browser.** Border, height, type and colors come from tokens. The arrow is two gradients in `currentcolor`, so it follows the text color, the disabled state and forced colors. It sits at the inline end, so it moves to the left in right-to-left text.
- **The open list, where the browser can.** Inside `@supports (appearance: base-select)` the list, its options and the check mark are styled too. Outside it nothing changes.
- `color-scheme` follows the color mode, so the system's own list opens in the right mode.

### Without JavaScript
Nothing changes: the select is a native element and LUZ adds no script to it.

### Keyboard and ARIA
The native keys apply, and which ones open the list differs a little between systems.

- Tab moves to the select. Enter or Space opens the list, and Escape closes it without a change.
- Up and Down move through the options, and typing the first letters jumps to a match.
- Give it a visible `<label for>`. Add no role: the element already has its semantics.
- For an error, set `aria-invalid="true"` and point `aria-describedby` at the error text.

### When to use
Use a select when the reader must choose one option from a long list they already know the answer to.

- A country, a year, a time zone: more than six options, one answer.
- The options are short and the reader can scan them in order.

### When not to use
A select hides the options until the reader opens it, and some people find that hard. The [GOV.UK Design System](https://design-system.service.gov.uk/components/select/) says to use it as a last resort. The rule of six is LUZ's own: that guide gives no number.

- With six options or fewer, use [radio buttons](https://nandovejer.github.io/luz/docs/components/form/): every option stays in view.
- To choose several, use [checkboxes](https://nandovejer.github.io/luz/docs/components/form/).
- Before you use a long list, ask a question that cuts it down.
- Never build your own listbox from `<div>` elements, or hide the select behind a copy of it.
