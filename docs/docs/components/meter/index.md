# Meter

Draws a value in a known range as a bar, next to its figure, with the native meter element.

### Known issues
None known.

### Copy the markup
A bar in the cell of its figure, in a table. The figure is text, so the bar is a picture of it and is hidden from assistive technology:

Meter in a table cell markup
```html
<td class="luz-table__numeric" data-label="Parcels">1,204<meter class="luz-meter" value="1204" min="0" max="1500" aria-hidden="true">1,204 of 1,500</meter></td>
```

A bar on its own, with a visible name and the figure in it:

Meter with a visible label markup
```html
<label for="storage">Storage used, 6 of 10 GB</label>
<meter class="luz-meter" id="storage" value="6" min="0" max="10">6 of 10 GB</meter>
```

### Variants and options
One class. The bar comes from the native attributes.

- `value`, `min` and `max`: The value and its range: `min` is 0 and `max` is 1 if you leave them out. A value outside the range is clamped to it
- `aria-hidden="true"`: For a bar next to its figure: the figure is read, the picture is not
- `low`, `high`, `optimum`: Do not set them: they would only change the colour the browser chooses, and every state is drawn in the brand colour

### How it works
The native `<meter>` element, styled by `components/meter.css`: an 8 px bar, full width of its box and at least 8rem long, with the brand colour as the fill and a 1 px edge in the field border colour, so the whole length shows on any surface.

- The browser draws the fill as `value` between `min` and `max`.
- Every state is the same colour. The figure and the scale say what the value means, not a green or a red: status colours keep their own meanings (alerts, tags).
- Use the same `max` in every row of a table, or the bars lie.
- In forced colors the bar keeps a border and draws the fill in the system highlight colour.
- The text inside the element is the fallback for a browser that does not draw it. Say the figure there too.

### Without JavaScript
The bar shows the value in the markup. Moving it needs your script, which sets `value`.

### Keyboard and ARIA
A meter is not interactive and takes no focus.

- Next to its figure, in the same cell or the same line, hide the bar with `aria-hidden="true"`: the figure is text, and the table is the accessible chart. A reader hears the figure once.
- Put the bar in the cell of its figure, not in a column of its own: a column of bars would read as a column of empty cells. If you do want a column for the bar, each cell carries visible text of its own, such as “80 %”, under a heading that says what it is.
- A meter that is not hidden needs a name: a `<label for>` or `aria-labelledby`. It is then read as “value, minimum, maximum”, so it repeats a figure that is already there: hide it unless it stands alone.
- The bar is a picture of the figure in the same cell: assistive technology reads the figure.

### When to use
Use a meter for a value in a known range, next to its figure, in a few to a few dozen rows that share a scale: a share of a total, a count against a quota.

### When not to use
Do not use a meter for a task that is running: use [progress](https://nandovejer.github.io/luz/docs/components/progress/).

- For a trend over time, use a chart library; keep the [table](https://nandovejer.github.io/luz/docs/components/table/) as its text alternative. LUZ draws no line, area or pie chart.
- When exact values matter more than the shape, leave the bar out: the figure is already there.
- Do not use the bar's colour to say good or bad: it is always the brand colour.
