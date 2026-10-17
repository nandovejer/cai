# Example

A live preview with its code under it, in one frame, as wide as the width you give it.

### Known issues
None known.

### Copy the markup
A figure with the preview and, under it, the code. The code is optional:

Example markup
```html
<figure class="luz-docs-example">
  <div class="luz-docs-example__preview">
    <div class="luz-docs-example__frame">
      <button class="luz-btn luz-btn--primary" type="button">Save changes</button>
    </div>
  </div>
  <div class="luz-docs-example__code">
    <pre class="luz-code-block" data-lang="html" tabindex="0" aria-label="Markup of the example"><code>&lt;button class="luz-btn luz-btn--primary" type="button"&gt;Save changes&lt;/button&gt;</code></pre>
  </div>
</figure>
```

### Variants and options
No modifier. The width is a custom property.

- `.luz-docs-example`: On a `<figure>`: one framed box with a rounded border on the surface. The preview and the code share it
- `.luz-docs-example__preview`: The live markup, with padding around the frame
- `.luz-docs-example__frame`: Inside the preview: as wide as the preview, or as `--luz-docs-example-w` says (never wider), and centred. It is a size container
- `.luz-docs-example__code`: Optional, under the preview, across its width, with a rule above. A `pre.luz-code-block` in it loses its own border
- `--luz-docs-example-w`: The width of the frame. Set it on the frame: `style="--luz-docs-example-w: 20rem"` is a phone. It defaults to the whole preview

### How it works
CSS from `@luz-ds/docs` on core's code block and highlight.

- The preview and the code are one frame, so they read as one example. A long line scrolls inside the code block and never widens the figure.
- The frame's width is `min(100%, var(--luz-docs-example-w, 100%))`: a width larger than the room does not widen the figure.
- The frame is a size container (`container-type: inline-size`). A block button fills the frame, not the window, and a rule of your own can answer to the frame with `@container`.
- Write the markup once and show it twice, as a preview and as escaped code: the reader sees what they copy.

### Without JavaScript
Nothing changes in the frame. The code block is plain text in a region that scrolls and takes the focus, without the highlight and the copy button of core's script.

### Keyboard and ARIA
- **Order:** the controls of the preview, then the code block.
- **Code block:** keep `tabindex="0"` and an `aria-label` on the `<pre>`: it scrolls, and without them a keyboard user cannot reach it or tell what it is.
- **Preview:** it is live, so what is in it works as it does anywhere. A picture that must not be used goes in [Do and don't](https://nandovejer.github.io/luz/docs/documentation/dodont/), whose stage is inert.

### When to use
Use the example to show a piece and the markup that makes it, in one frame, the code under the preview.

- A component, a pattern or a snippet that a reader will copy.
- A piece whose look depends on its width: set the frame's width.

### When not to use
Do not use the example to show a mistake or code with nothing to preview.

- A picture of a mistake goes in [Do and don't](https://nandovejer.github.io/luz/docs/documentation/dodont/), which is inert.
- Code with nothing to show, such as a command, is a plain [code block](https://nandovejer.github.io/luz/docs/components/code/).
