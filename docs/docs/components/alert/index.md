# Alert

Tells the reader about the page or a task: information, success, a warning or an error.

### Known issues
None known.

### Copy the markup
Warning alert markup
```html
<div class="luz-alert luz-alert--warning">
  <div class="luz-alert__icon" aria-hidden="true">!</div>
  <div>
    <div class="luz-alert__title">Warning</div>
    <div class="luz-alert__body">Storage is almost full. Delete old builds to free space.</div>
  </div>
</div>
```

### Variants and options
One modifier sets the status. Write the status in the title too: the colour is only a second cue.

- `.luz-alert--info`: Something useful to know
- `.luz-alert--success`: A task that finished well
- `.luz-alert--warning`: Something that may go wrong soon
- `.luz-alert--error`: Something that went wrong and needs action

### How it works
A block with an icon, a title and a body, styled by `components/alert.css`. No JavaScript.

- The icon is decorative (`aria-hidden="true"`): the title already names the status.
- The start border and the title take the status colour; the body stays in the secondary text colour.

### Without JavaScript
Nothing changes: the alert is static HTML and CSS.

### Keyboard and ARIA
An alert is not interactive and takes no focus.

- An alert that is on the page when it loads needs no role.
- An alert that appears after an action must be announced: insert it into a container that is already on the page with `role="status"`, or `role="alert"` for an error that needs attention now.

### When to use
Use an alert to tell the reader about a state that matters on this page.

- Information they need before they act: "This project is archived."
- The result of a task: success, a warning or an error.

### When not to use
Do not use an alert for a message that must stop the reader, or one they can safely miss.

- A decision the reader must make before going on: use a [modal](https://nandovejer.github.io/luz/docs/components/modal/).
- A short confirmation that needs no action: use a [toast](https://nandovejer.github.io/luz/docs/components/toast/).
- An error on one field: put it next to the field ([form fields](https://nandovejer.github.io/luz/docs/components/form/)).
- More than two alerts at once: merge them, or the reader stops reading them.
