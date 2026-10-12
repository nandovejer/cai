---
"@cai-ds/core": minor
---

Card: a link in `.cai-card__title` now makes the whole card one link, with no modifier and no JavaScript. The link's `::after` is stretched over the card (which is now always `position: relative`), so there is one tab stop named by the title, and `:focus-visible` draws an outline around the card that stays in forced-colors mode. Only a linked card answers the pointer: the hover shadow and border no longer appear on a static card, and the hover border is `--cai-input-border` (3:1 or more in every mode) instead of `--cai-outline`. The last title or body no longer leaves a margin under it, so `u-mb-0` is not needed; margins are logical (`margin-block-end`). Print: the external-link URL after a link is `position: static`, so it does not cover a linked card. Known issue: in a linked card the body text cannot be selected with a mouse. Page: `/docs/components/card/`.
