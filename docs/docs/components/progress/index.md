# Progress

Shows how far a task that takes time has got, with the native progress element.

### Known issues
None known.

### Copy the markup
Progress bar with a visible label markup
```html
<label for="upload">Uploading report.pdf</label>
<progress class="luz-progress" id="upload" value="25" max="100">25%</progress>
```

### Variants and options
One class. The state comes from the native attributes.

- `value` and `max`: How much is done; `max` is 1 if you leave it out
- no `value`: Indeterminate: the task is running but its length is unknown

### How it works
The native `<progress>` element, styled by `components/progress.css`: an 8 px bar, full width, with the brand colour as the fill and a 1 px edge in the field border colour, so the whole length shows on any surface.

- The browser exposes the role and the value to assistive technology.
- In Chromium and WebKit browsers the fill slides to a new value; under reduced motion it jumps.
- In forced colors the bar keeps a border and draws the fill in the system highlight colour.

### Without JavaScript
The bar shows the value in the markup. Moving it needs your script, which sets `value`.

### Keyboard and ARIA
A progress bar is not interactive and takes no focus.

- Name it with a `<label>`, or an `aria-label` when no label is shown.
- Screen readers do not announce every change. Announce the start and the end in a polite live region (`role="status"`).

### When to use
Use a progress bar for a task that takes more than a few seconds, such as an upload or a build.

### When not to use
Do not use a progress bar for a value that is not a task.

- For a measure in a known range, such as storage used, use a [meter](https://nandovejer.github.io/luz/docs/components/meter/).
- Do not use it as decoration.
