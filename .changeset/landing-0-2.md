---
"@luz-ds/landing": minor
"@luz-ds/check": patch
---

Landing 0.2: what any landing page wants, with no data of its own. All additions; nothing that worked before changes.

- `.luz-landing-hero--centered`: one column (core's split grid with `--luz-grid-min: 100%`), the text centred, the copy at most 48rem wide and centred, the lead and the `.o-actions` row centred under the title.
- `.luz-landing-hero__media--bleed`, in a centred hero: the media runs from edge to edge of the window in both directions, with no sideways scroll. No viewport unit: on a page that has one, the root is an inline-size query container and the media's margins are `calc(50% - 50cqi)`, so a visible scrollbar is not counted.
- The head of a section: `.luz-landing-section__eyebrow`, `__title` and `__lead`. They share the hero's rules (one selector list in `hero.css`: load it with `section.css`); the title is one step smaller (`--luz-text-3xl`, `2xl` below 1024px, `xl` at 640px and below), the lead `lg` (`base` at 640px and below). The same Arabic rules as the hero: the sans for the eyebrow, no letter-spacing.
- `--luz-landing-title-accent`: the colour of the `em` in a hero or section title. Unset, the title's colour.
- `.luz-landing-stat`, `__value`, `__label` (new `components/stat.css`): a big number in the heading face with tabular figures, and secondary text under it; alone or inside core's `.luz-card`.
- `.luz-landing-footer__brand` and `.luz-landing-footer__col` with `__col-title`, on `footer > .o-container.o-container--inline.o-grid`: a brand block and columns of links (a small heading over a plain list), side by side from 768px, the brand twice as wide as a column, one under the other below. The `> .o-row` footer is unchanged.
- `--luz-landing-glow-x`: where along the top edge the glow's tint sits, a physical position (`0%` the left, `100%` the right). Unset, the edge where reading starts, as before. The right-to-left rule no longer repeats the gradient.
