# Avatar

Shows who a person or a team is, with their initials or a photo, in three sizes.

### Known issues
If a photo does not load, the browser draws its `alt` text in the box, in the avatar's capitals; a long name can spill past the box. The name is still there for a screen reader.

### Copy the markup
Avatar markup
```html
<span class="luz-avatar luz-avatar--md" role="img" aria-label="Carlos Díaz">CD</span>
```

Next to the person's name, the avatar repeats it: hide it instead.

Avatar next to a name markup
```html
<span class="luz-avatar luz-avatar--sm" aria-hidden="true">CD</span> Carlos Díaz
```

With a photo: the image fills the box, cropped to a square.

Avatar with a photo markup
```html
<span class="luz-avatar luz-avatar--md"><img src="/img/ana.jpg" width="36" height="36" alt="Ana Belén"></span>

<span class="luz-avatar luz-avatar--lg"><img src="/img/ana.jpg" width="48" height="48" alt=""></span> Ana Belén
```

### Variants and options
Pick one size modifier.

Without one, the avatar has no size of its own. The content is the initials or one `<img>`.

- `.luz-avatar--sm`: 24 × 24 px, extra-small text
- `.luz-avatar--md`: 36 × 36 px, small text
- `.luz-avatar--lg`: 48 × 48 px, base text
- `<img>` inside: A photo: fills the box, cropped to a square, with the avatar's corners

### How it works
An inline box that centres its text, styled by `components/avatar.css`. No JavaScript.

- The initials are set in the mono font, in capitals (`text-transform: uppercase`).
- The colours are the brand tint and the brand text colour, in every mode.
- A photo is an `<img>` at `100%` of the box with `object-fit: cover` and the corners of the avatar (`border-radius: inherit`). The box does not clip (no `overflow: hidden`), so initials that outgrow a small box at 200 % text stay readable.

### Without JavaScript
Nothing changes: the avatar is HTML and CSS only.

### Keyboard and ARIA
An avatar is not interactive and takes no focus.

- Initials on their own are an image: `role="img"` and an `aria-label` with the full name, so a screen reader does not spell out the initials.
- A photo on its own is named by its `alt`, with the person's name: no role, no `aria-label`. When the photo is all there is in a link or a button, the `alt` names the control, so it says the action too: `alt="Ana Belén, your account"`.
- Next to the name, an avatar is decoration: `aria-hidden="true"` on initials, `alt=""` on a photo.
- Inside a link or a button with text, the control's text names it; hide the avatar.

### When to use
Use an avatar to identify a person or an account where space is tight, such as a list of members or the author of a comment.

### When not to use
Do not use an avatar as the only way to tell people apart.

- Two people can share initials: show the name as text nearby.
- For a status or a category, use a [tag](https://nandovejer.github.io/luz/docs/components/tag/).
- For the portrait of a speaker or a product, a size of its own, use a card with the image frame: see [Speakers](https://nandovejer.github.io/luz/docs/landing/templates/#speakers) in the landing page templates. An avatar is 24 to 48 px.
