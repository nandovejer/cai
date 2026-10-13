---
"@cai-ds/core": minor
---

Card: `.cai-card--featured` marks the one card to look at first in a group of plans or offers: a 2 px border in `--cai-brand-primary`, with the extra pixel taken from the padding so it is as tall as its neighbours. In a linked card the border turns `--cai-brand-hover` on hover and the keyboard ring stands `--cai-space-2xs` off the border, so it does not read as a thicker border. The class says nothing to assistive technology: the docs require a visible tag with the reason ("Most chosen") and a test checks that every featured card in the docs has one. In forced colors the border keeps its weight. Page: `/docs/components/card/`.
