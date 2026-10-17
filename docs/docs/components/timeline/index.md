# Timeline

Shows dated events in order, one card at a time on a rail of dates or all at once down a line; without JavaScript it is a list.

### Known issues
Three things are not done yet, and none has been tested with a screen reader.

- The Previous and Next buttons are named only "Previous" and "Next". The name does not say which date they lead to.
- Whether a screen reader announces the card that appears when you change the item has not been tested.
- The timeline has not been tested with any screen reader: no result is claimed for NVDA, JAWS, VoiceOver, TalkBack or Orca.

### Copy the markup
An ordered list inside `<luz-timeline>`. Give the element `role="group"` and a name with `aria-label`, so the name is read without JavaScript too.

Timeline markup
```html
<luz-timeline role="group" aria-label="Releases of the app">
  <ol class="luz-timeline">
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2025-03">March 2025</time>
      <p class="luz-timeline__title">First beta</p>
      <p class="luz-timeline__text">Ten teams try the app.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2025-06">June 2025</time>
      <p class="luz-timeline__title">Public launch</p>
      <p class="luz-timeline__text">Sign-up opens to everyone.</p>
    </li>
  </ol>
</luz-timeline>
```

With autoplay, every four seconds:

Timeline with autoplay markup
```html
<luz-timeline role="group" aria-label="Milestones" autoplay interval="4000">
  <ol class="luz-timeline">
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2023">2023</time>
      <p class="luz-timeline__title">The idea</p>
      <p class="luz-timeline__text">Two people sketch the first screens.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2024">2024</time>
      <p class="luz-timeline__title">The team</p>
      <p class="luz-timeline__text">Five people work on it full time.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2025">2025</time>
      <p class="luz-timeline__title">The first customers</p>
      <p class="luz-timeline__text">Fifty schools use it every week.</p>
    </li>
  </ol>
</luz-timeline>
```

The vertical layout:

Vertical timeline markup
```html
<luz-timeline role="group" layout="vertical" aria-label="Versions of the library">
  <ol class="luz-timeline">
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2024-02">February 2024</time>
      <h3 class="luz-timeline__title">Version 0.1</h3>
      <p class="luz-timeline__text">Buttons, forms and tables.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2024-09">September 2024</time>
      <h3 class="luz-timeline__title">Version 0.2</h3>
      <p class="luz-timeline__text">Dark mode and a print stylesheet.</p>
    </li>
    <li class="luz-timeline__item">
      <time class="luz-timeline__date" datetime="2025-05">May 2025</time>
      <h3 class="luz-timeline__title">Version 0.3</h3>
      <p class="luz-timeline__text">Right-to-left layouts.</p>
    </li>
  </ol>
</luz-timeline>
```

For a timeline added to the page after it has loaded, import the module once. It defines the element, and there is no `init` to call:

Timeline script code
```js
import "@luz-ds/core/timeline";
```

### Variants and options
The options are attributes of `<luz-timeline>`. Each item has a date, a title and a text.

- `aria-label`: The name of the timeline. Write it with `role="group"`: a name on an element without a role is not read. If you leave the role out, the script adds it
- `layout="vertical"`: Every item stays visible down a line. The item in the middle of the screen is active, the ones before it are past
- `autoplay`: Opts in to moving on by itself, with a visible Pause and Play button. Horizontal only; off unless you write it
- `interval`: Milliseconds between items with `autoplay`. The default is 5000; a value under 2000 is raised to 2000
- `data-luz-label-previous`, `-next`, `-pause`, `-play`: The names of the buttons, when LUZ does not ship the language of the page or you want other words
- `--luz-timeline-paper`: The colour behind the timeline, which the hump on the rail and the empty dots are painted with. The default is `--luz-surface-page`; on a card, set it on the element to the card's surface: `style="--luz-timeline-paper: var(--luz-surface)"`
- `.luz-timeline__date`: A `<time>`. Its text is the label of the date button on the rail, so give each item a different one. Without it the button shows the item's number
- `.luz-timeline__title`: A `<p>`, or a heading of the level your page needs: the class stays the same
- `.luz-timeline__text`: One or two sentences; a link is allowed
- `data-luz-state`: Written by the script on the items of a vertical timeline: `active` or `past`. Do not set it yourself

### How it works
A custom element around a native ordered list, with styles from `components/timeline.css` and a script, `timeline.js`. `luz.js` loads the script only on a page that has a `<luz-timeline>`.

The element looks for the first `.luz-timeline` inside it; with none, it does nothing.

- **Horizontal.** The script builds, with DOM methods only, Previous and Next at the sides of the card and a rail of dates under it: one button per item, with the text of its date. The cards share one grid cell, so the band is as tall as the longest card and nothing jumps when you change the item. The cards that are not current are `inert` and hidden. In the current card the date is hidden from sight, because the rail shows it.
- **Changing the item.** Click a date, use Previous and Next, the arrow keys, Home and End on the rail, or swipe more than 40 px sideways with a finger or the mouse. Toward the start of the line is the next item. Past either end it wraps round. A swipe that ends on a link is not a click on it.
- **The rail.** The current date is scrolled to the middle, with a smooth scroll only if the visitor has not asked for reduced motion. A keyboard move keeps the focus on the new current date, and so does a change that hides the card the focus was in.
- **Vertical.** The script marks the item crossing the middle of the screen `data-luz-state="active"` and the ones before it `past`. The line behind a past item takes the brand colour, and the active dot is filled and larger. It runs with reduced motion too, without the transition.
- **Autoplay.** With `autoplay`, the item changes every `interval` milliseconds, in a loop. The Pause button under the rail stops it; it then reads Play and starts it again. The timeline also waits, without a change to the button, while the pointer moves over it (it goes on after 4 seconds still, or when the pointer leaves), while the keyboard focus is inside it, while less than half of it is on screen and while the tab is hidden. With reduced motion it never starts and the button is not shown.
- **Text.** "Previous", "Next", "Pause" and "Play" are in the language of the page when LUZ ships it (English, Spanish), chosen by the nearest `lang`, or yours through `registerLocale()` and `data-luz-label-*`. They travel with the script, so `@luz-ds/core/timeline` works on its own. With `luz.js` on the page, a language you add with `registerLocale()` reaches them too. See [the JavaScript modules](https://nandovejer.github.io/luz/docs/get-started/javascript/).

### Without JavaScript
An ordered list, with every item visible: a line down the inline-start side with a dot at each item, then the date, the title and the text. The list looks the same before the script has defined the element, so nothing jumps when it does.

Autoplay, the rail, Previous and Next, the swipe and the active mark of the vertical layout need JavaScript.

### Keyboard and ARIA
Tab reaches, in this order: Previous, the links in the current card, Next, the current date on the rail and the Pause or Play button. The other dates are not in the Tab order: the arrow keys move between them.

- **Left and Right** on the rail move to the previous and the next date, and the focus goes with them. In right-to-left text they swap. Past either end it wraps.
- **Home and End** go to the first and the last date.
- **Enter or Space** on a date, Previous, Next or Pause presses it: they are native buttons.
- The element has `role="group"` and your `aria-label`. The current date has `aria-current="true"`; only that date is tabbable (a roving `tabindex`).
- The cards are one live region. It is `aria-live="polite"` when the visitor changes the item, and `off` while autoplay runs, so a card that changes by itself is not announced.
- The Pause or Play button's name is its action. The arrows' names are "Previous" and "Next": see the known issues.
- The cards that are not current are `inert`: they take no focus and are not read. If the focus was in the card that goes, it moves to the new current date.
- Each card has `aria-posinset` and `aria-setsize`, so a screen reader can say "2 of 4" when only one card is shown.

### When to use
Use a timeline for a short run of events with dates, where the order is the point: releases, milestones, a company's history.

- Horizontal, when each event needs a card and the reader goes through them one by one.
- Vertical, when the reader should see every event as they scroll.
- Four to ten items. Beyond that the rail needs a lot of scrolling.

### When not to use
Do not use a timeline for steps the reader has to follow in order, or for events without dates.

- For a process, use a numbered list.
- To compare events across attributes, use a [table](https://nandovejer.github.io/luz/docs/components/table/).
- When the reader needs to see every item at once, use the vertical layout: the horizontal one shows a single card.
- Do not turn on autoplay for content the reader must not miss. Nobody has to wait for the next card.
