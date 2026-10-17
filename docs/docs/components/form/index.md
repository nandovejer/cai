# Form fields

Collect input with native fields, choices and pickers, each with a visible label, a hint and an error.

### Known issues
None known.

### Copy the markup
Text field with a hint markup
```html
<div class="luz-field">
  <label class="luz-field__label" for="project-name">Project name</label>
  <input class="luz-input" id="project-name" type="text" aria-describedby="project-name-hint">
  <div class="luz-field__helper" id="project-name-hint">Shown on the dashboard.</div>
</div>
```

Field with an error markup
```html
<div class="luz-field">
  <label class="luz-field__label" for="slug">Slug</label>
  <input class="luz-input luz-input--error" id="slug" type="text" aria-invalid="true" aria-describedby="slug-error">
  <div class="luz-field__error" id="slug-error"><span class="u-sr-only">Error: </span>Use letters, numbers and dashes only.</div>
</div>
```

Radio group markup
```html
<fieldset class="luz-fieldset">
  <legend>Plan</legend>
  <div class="luz-check-group">
    <div class="luz-check-item"><input type="radio" name="plan" id="plan-free" checked><label for="plan-free">Free</label></div>
    <div class="luz-check-item"><input type="radio" name="plan" id="plan-team"><label for="plan-team">Team</label></div>
  </div>
</fieldset>
```

Switch markup
```html
<label class="luz-toggle">
  <input class="luz-toggle__input" type="checkbox" role="switch">
  <span class="luz-toggle__track" aria-hidden="true"><span class="luz-toggle__thumb"></span></span>
  <span class="luz-toggle__label">Weekly digest</span>
</label>
```

### Variants and options
Every control is a native element with a LUZ class. The state comes from native attributes.

- `.luz-field`: Wraps one label, its control, its hint and its error
- `.luz-field__label`: The visible label
- `.luz-field__label--required`: Adds a red " *" after the label
- `.luz-field__helper`: A hint under the control
- `.luz-field__error`: An error under the control, in the danger colour
- `.luz-input`: Text, email, number, date, time, colour, file and range inputs and `<textarea>`; 44 px high
- `.luz-input--error`: A 2 px danger underline; pair it with `aria-invalid="true"`
- `.luz-input--textarea`: Auto height, at least 80 px, resizes vertically
- `.luz-select`: A `<select>`, on its own page: [Select](https://nandovejer.github.io/luz/docs/components/select/)
- `.luz-check-group`, `.luz-check-item`: A list of checkboxes or radios, each with its label
- `.luz-fieldset`: A bordered group with an upper-case `<legend>`
- `.luz-toggle`: A switch: a checkbox with `role="switch"` drawn as a track and a thumb
- `.luz-meter`: A `<meter>` bar, in the brand colour in every state: see [Meter](https://nandovejer.github.io/luz/docs/components/meter/)
- `.luz-output`: A computed value
- `disabled`, `readonly`: Faded; read-only also gets a dashed underline

### How it works
Native form controls, styled by `components/form.css`. No JavaScript: the browser owns the state, the keyboard, validation and submission.

- Each control gets its name from its `<label>`; the hint and the error are tied to it with `aria-describedby`.
- LUZ does not mark a field as invalid for you: add `.luz-input--error`, `aria-invalid="true"` and the error text when your validation fails.
- Field text is 16 px at 768 px and below and on touch screens, so iOS Safari does not zoom in.

### Without JavaScript
Every control works and submits with its form, including the switch. Only what your own script adds is missing, such as live validation or a value echoed in an `<output>`.

### Keyboard and ARIA
The native keys apply. Tab moves between controls.

- Space checks a checkbox or a switch.
- Arrow keys choose within a radio group, and move a range slider.
- Group related controls in a `<fieldset>` with a `<legend>`, or a `role="group"` named with `aria-labelledby`.
- Write "Error: " before the error text, hidden visually with `.u-sr-only` if you like.

### When to use
Use these fields to collect input, with the native control that fits the data.

- Text, email, number, date, time: an input of that `type`.
- One choice from a few (six or fewer): radios. From many: a [select](https://nandovejer.github.io/luz/docs/components/select/).
- Several choices: checkboxes. A setting that applies at once: a switch.

### When not to use
Do not rebuild a native control from `<div>` elements.

- Do not use a placeholder as the label: it disappears when the reader types.
- Do not use a switch inside a form that is sent with a button: use a checkbox.
- To show how far a task has got, use [progress](https://nandovejer.github.io/luz/docs/components/progress/), not a [meter](https://nandovejer.github.io/luz/docs/components/meter/).
