# Toast

Confirms a small result, such as "Draft saved", without interrupting the reader.

### Known issues
LUZ ships the look only. The live region, the placement, the timing and the close button's behaviour are yours to build, and to make accessible.

### Copy the markup
Keep an empty live region on the page, and put the toast inside it when the result happens.

Toast in its live region markup
```html
<div role="status">
  <div class="luz-toast">
    <div class="luz-toast__content">
      <div class="luz-toast__kind">Saved</div>
      <div class="luz-toast__msg">Draft saved.</div>
    </div>
    <button class="luz-toast__close" type="button" aria-label="Dismiss notification">×</button>
  </div>
</div>
```

### Variants and options
There are no modifiers.

- `.luz-toast`: A raised box on the strong surface, 320 px wide at most and never wider than its container
- `.luz-toast__kind`: A small mono label above the message
- `.luz-toast__msg`: The message
- `.luz-toast__close`: The × button, 28 px at least

### How it works
A styled block from `components/toast.css`. LUZ has no toast script.

- Position it with your own CSS, for example fixed at the bottom of the screen, above the page with `--luz-z-toast`.
- If it hides by itself, leave it on screen for at least 5 seconds and keep it while it has focus or the pointer is over it.
- The close button needs your script to remove the toast.

### Without JavaScript
A toast only appears in answer to something your script did, so it does not exist without JavaScript. Show the same result on the page, for example in an [alert](https://nandovejer.github.io/luz/docs/components/alert/) after a form is sent.

### Keyboard and ARIA
Showing a toast does not move focus.

- Insert it into a polite live region (`role="status"`) that is already on the page, so screen readers announce it.
- The close button is reachable with Tab, and named "Dismiss notification".

### When to use
Use a toast to confirm a small result that needs no answer: "Draft saved", "Link copied".

### When not to use
Do not use a toast for anything the reader must act on or must not miss: it goes away.

- For an error, use an [alert](https://nandovejer.github.io/luz/docs/components/alert/) next to what failed.
- For a decision, use a [modal](https://nandovejer.github.io/luz/docs/components/modal/).
- Do not put links or buttons in it, other than the close button.
