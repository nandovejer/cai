---
"@cai-ds/core": minor
---

Button: `.cai-btn--block` fills the width of its container, for the one action of a card, a drawer or a form on a phone. The label wraps and a word longer than the box breaks (`overflow-wrap: anywhere`), so nothing leaves the button at 320 px or at 200 % text, and a wrapped label keeps `--cai-space-2xs` above and below. The same `overflow-wrap` is now on `.cai-card .cai-btn`. It replaces the rule every shop writes (`.card .btn { width: 100% }`). The Product card example uses it. Pages: `/docs/components/button/`, `/docs/components/card/`.
