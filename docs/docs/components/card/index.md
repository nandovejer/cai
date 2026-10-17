# Card

Groups a few facts about one thing on a bordered surface.

### Known issues
In a linked card, the body text, the price included, cannot be selected with a mouse: the title link covers the whole card, so a drag follows or moves the link. Find in page, keyboard selection and screen readers reach the text as usual.

### Copy the markup
Card markup
```html
<article class="luz-card">
  <h3 class="luz-card__title">Database</h3>
  <p class="luz-card__body">48 active connections.</p>
</article>
```

### Variants and options
One card, four classes and one modifier. A link in the title makes the whole card one link; any other link or button in it is raised above that link.

- `.luz-card`: The surface: border, rounded corners and padding
- `.luz-card__title`: Base size, semibold, primary text colour
- `.luz-card__body`: Medium size, secondary text colour
- `.luz-card__price`: The price: base size, semibold, primary text colour, figures of equal width. A previous price goes in `<s>`
- `.luz-card--featured`: The one card to look at first in a group: a 2 px border in the brand colour, as tall as its neighbours. Say why in words too, with a tag such as “Most chosen”
- `<a>` in `.luz-card__title`: A linked card: the link covers the card, the title turns sans, a darker border and a shadow on hover, a focus ring round the card

Compose a card with the layout objects and the other components, with no new class: a linked card, an avatar or an icon beside the text with `.o-media`, an image on top, and a row of actions with `.o-row`.

- **Linked card:** the `<a>` goes inside the heading, round its text. A second link or a button in it is allowed, and sits above the title link: see Product card below.
- **Avatar or icon:** `.o-media` puts it beside `.o-media__body`, which holds the title and the body. Next to a name, hide the avatar with `aria-hidden="true"`: it repeats the name.
- **Image on top:** the [image frame](https://nandovejer.github.io/luz/docs/components/image/) (`.luz-image`), inside the padding, with `.u-mb-sm` under it. Its alt text says what the picture shows; if it only repeats the title, leave it empty (`alt=""`).
- **Actions:** `.o-row` with small buttons (`.luz-btn--sm`) or tags (`.luz-tag`), last in the card. In a linked card, one action at most, as a button after the title.

#### Product card

A card for a shop is the card with an image, a linked title, a price and one action. The action is a button in a form, so it works without JavaScript; it is raised above the title link, so it takes its own click.

Product card markup
```html
<article>
  <h4 id="red-wines">Red wines</h4>
  <ul class="o-grid o-grid--auto" aria-labelledby="red-wines">
    <li class="luz-card">
      <div class="luz-image luz-image--4x3 u-mb-sm">
        <picture>…<img src="malbec.jpg" alt="" width="640" height="480" loading="lazy" decoding="async"></picture>
      </div>
      <h5 class="luz-card__title"><a href="/wines/malbec-2021/">Malbec 2021</a></h5>
      <p class="luz-card__body">Bodega Albar · 75 cl</p>
      <p class="luz-card__price"><data value="12.50">12,50 €</data></p>
      <form action="/cart/add" method="post">
        <input type="hidden" name="product" value="malbec-2021">
        <button class="luz-btn luz-btn--primary luz-btn--block" type="submit">Add to cart<span class="u-sr-only"> Malbec 2021</span></button>
      </form>
    </li>
  </ul>
  <output class="u-sr-only" id="cart-status"></output>
</article>
```

- **The button is the width of the card** with `.luz-btn--block`: a thumb finds it, and its label wraps and breaks inside the card at any text size.
- **One action, one link.** The name is the link; the button is the action. A card with a second action (a wish list, a comparison) has outgrown a card: send the reader to the product's own page.
- **The button's name is unique.** The visible words come first, then the product's name in `.u-sr-only`, repeating the link's text exactly (keep the space before it). A list of twelve buttons all called “Add to cart” says nothing to someone who lists the buttons of a page, or says them by voice.
- **The list is named by its heading:** `aria-labelledby` points at the `<h4>` above it, and the cards use the next level. Core styles no list: remove the bullets and the indent with your own rule (`list-style: none; margin: 0; padding: 0`).
- **The old price is `<s>`,** with the words “Now” and “Was” hidden visually so the order is clear to a screen reader; the line through it is not colour.
- **Feedback after a script adds the item:** keep an empty `<output>` (it has the role `status`) in the page from the start and write “Malbec 2021 added to the cart” into it; focus stays on the button. A status region that is created together with its text is often not announced. Without a script the form posts and the cart page is the feedback.
- **Sold out:** replace the form with `<span class="luz-tag">Sold out</span>`; do not disable the button.
- With core alone there is no image frame: use an `<img>` with your own size rules.

#### Featured card

In a group of plans or offers, `.luz-card--featured` marks the one to look at first. The class says nothing to a screen reader, so the card carries a tag with the reason, in its text.

Featured card markup
```html
<article class="luz-card luz-card--featured">
  <h4 class="luz-card__title">Two days</h4>
  <p class="luz-card__price"><data value="149">149 €</data></p>
  <p class="luz-card__body">Both days, lunch and the recordings.
    <span class="luz-tag luz-tag--blue">Most chosen</span></p>
  <a class="luz-btn luz-btn--primary luz-btn--block" href="/register/?ticket=two-days">Choose Two days</a>
</article>
```

- **One featured card per group.** If everything is featured, nothing is.
- **The words are required.** A 2 px border is a second cue for people who see it, and in forced colors the only one; a tag such as “Most chosen” or “Best value” is the one that reaches everybody. Put it in the body or beside the title.
- **It stays as tall as its neighbours:** the extra pixel of border is taken from the padding.

### How it works
A container styled by `components/card.css`. No JavaScript.

- Use any element: `<article>` for a self-contained item, `<div>` for a group of facts, `<li>` inside a list of cards.
- The title class goes on the heading level that fits the page outline.
- The corners are rounded with `--luz-radius-md`, like a figure or a dropdown.
- The last title or body has no space under it: the padding is the card's last space.
- A linked card: the link's `::after` is stretched over the card (`position: absolute; inset: 0`), so a click anywhere in it follows the link. The card is `position: relative` to hold it. Any other link or control inside the card (`a`, `button`, `input`, `select`, `textarea`, `summary`) is `position: relative` with `z-index: 1`, so it paints above that overlay and takes its own click; the title link is the one thing never raised. A button's label wraps in a card (`white-space: normal`), so a long label or enlarged text stays inside it. On hover the border turns `--luz-input-border` and a small shadow shows; on keyboard focus a ring goes round the card. The title of a linked card is in sans, as a nav or a list of links is; a card without a link keeps the heading face. Both are found with `:has()`; a card without a link does not change on hover.
- `.luz-card--featured` sets `border-width: 2px` in `--luz-brand-primary` and takes the extra pixel from the padding, so the card keeps the height of its neighbours. In a linked card the border turns `--luz-brand-hover` on hover, and the keyboard ring stands 4 px off the border, so it does not read as a thicker border.
- To lay cards out, use the [grid objects](https://nandovejer.github.io/luz/docs/components/layout/), such as the [split grid](https://nandovejer.github.io/luz/docs/components/layout/#objects-actions) for two cards side by side.

### Without JavaScript
Nothing changes: a card, linked or not, is HTML and CSS.

### Keyboard and ARIA
A card is not interactive and takes no focus.

- In a card that is not linked, links and buttons inside keep their own behaviour.
- A link or a button in a linked card is raised above the title link, so the pointer reaches it. It has its own tab stop, in source order, and its own ring; give each a name that is unique on the page (see Product card).
- A linked card has a tab stop for its title link and one for each other link or button. Enter follows the title link; Enter or Space presses a button. The ring shows round the title link and round the whole card; a button shows its own ring only.
- A screen reader names the link with the title, then reads the body as text. Add no `role`, `tabindex` or `aria-label` to the card.
- Put the link on the title text, never round the card: a link round the card takes every word in it as its name.

### When to use
Use a card to group a small set of facts that read as one unit, often in a grid of similar items.

- A featured card (`.luz-card--featured`) for the one recommended choice in a group of plans or offers.

### When not to use
Do not use a card to box content that is not a separate thing.

- For rows of records with the same attributes, use a [table](https://nandovejer.github.io/luz/docs/components/table/).
- For a message about the page, use an [alert](https://nandovejer.github.io/luz/docs/components/alert/).
- For a list of links, each with one line of description, use a plain list (`<ul>`): a card per link adds borders and nothing else.
- A card with more than one action besides its title link is a form or a page: use the page of the thing, not a card.
- Do not put a card inside a card.
- Do not feature several cards in a group, or use the border as the only cue: say why in words too.
