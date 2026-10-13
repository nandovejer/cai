---
"@cai-ds/tokens": major
"@cai-ds/core": major
"@cai-ds/site": major
---

**Breaking:** all of CAI's CSS is now inside one cascade layer, `cai`, and the three packages put their rules in layers of it.

**What changes**

- Core's six layers are `cai.settings`, `cai.generic`, `cai.elements`, `cai.objects`, `cai.components` and `cai.utilities`. The top-level names `settings`, `generic`, `elements`, `objects`, `components` and `utilities` are gone: a rule of yours in `@layer components { … }` no longer lands in CAI's layer.
- The tokens are in `cai.tokens` (the `@font-face` rules stay outside any layer), the shipped themes in `cai.themes` (in `dist/themes/*.css`) and platform in `cai.platform`, after `cai.utilities`. They were not in a layer, so they beat every layer of core and any `app` layer of yours.
- Every file repeats the order statement first, so it is the same whichever file a page loads first.

**Why:** `components` and `utilities` are names other tools use too, and a page that loaded both merged them with the order by accident. One container layer lets you place CAI once, and it works from a `<link>` or a CDN, where a layer cannot be added from outside.

**To migrate**

1. Declare your order before any stylesheet loads: `@layer reset, cai, app;`.
2. Move your overrides into your own layer (`app`), or leave them without a layer: both win over `cai`.
3. If you named CAI's layers, use the new names: `@layer cai.components, mine, cai.utilities;`.
4. Do not wrap the files in `layer(cai)` when you import them: they already declare `cai.*`, and wrapping would give `cai.cai.*`.

Without any change on your side, a page that does not use layers behaves as before: your unlayered CSS wins over CAI.

New: the page "Cascade layers" in Get started, with the order, the unlayered rule and an override example.
