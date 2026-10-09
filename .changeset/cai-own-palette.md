---
"@cai-ds/tokens": major
---

CAI has its own colour palette. Every colour primitive changes value; the names (`--cai-<family>-<step>`) and the families stay.

**Breaking (`@cai-ds/tokens`)**

The primitives used to be IBM Carbon's palette (Apache-2.0). They are now computed in OKLCH by `scripts/build-palette.js`, from one lightness curve shared by every family (so a step number means the same contrast in blue, red or gray), a chroma curve and a hue per family. Gray has a faint cool tint; blue, green, red, yellow, teal and purple keep their meaning. `tokens.json` is written by the script and checked against it by `tests/palette.test.js`, which also fails if any former Carbon value comes back.

If you used a primitive directly, or copied one of its hex values, take the new value from the table. The semantic tokens keep every contrast minimum (`pnpm check:contrast`).

| Step | blue | gray | green | red | yellow | teal | purple |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `#edf5ff` → `#f6fbff` | `#f4f4f4` → `#f9fafc` | `#defbe6` → `#eefff5` | `#fff1f1` → `#fff8f8` | `#fcf4d6` → `#fffae8` | `#d9fbfb` → `#effefa` | `#f6f2ff` → `#fcf9ff` |
| 20 | `#d0e2ff` → `#dff0ff` | `#e0e0e0` → `#e9eef4` | `#a7f0ba` → `#beffda` | `#ffd7d9` → `#ffe7e6` | `#fddc69` → `#ffedb7` | `#9ef0f0` → `#c3fbec` | `#e8daff` → `#f3e8ff` |
| 30 | `#a6c8ff` → `#b3d9ff` | `#c6c6c6` → `#ced5dd` | `#6fdc8c` → `#89edb8` | `#ffb3b8` → `#ffc3c1` | `#f1c21b` → `#ffcd51` | — | — |
| 40 | `#78a9ff` → `#77b9ff` | `#a8a8a8` → `#adb5bd` | `#42be65` → `#52cf92` | `#ff8389` → `#ff8f8c` | `#d2a106` → `#e2a928` | `#3ddbd9` → `#62c9b5` | `#be95ff` → `#ca9aff` |
| 50 | `#4589ff` → `#208fff` | `#8d8d8d` → `#889099` | `#24a148` → `#08aa6b` | `#fa4d56` → `#ef4f51` | `#b28600` → `#bc8200` | `#009d9a` → `#30a491` | `#a56eff` → `#ab67f0` |
| 60 | `#0f62fe` → `#0066cf` | `#6f6f6f` → `#646b73` | `#198038` → `#007f4d` | `#da1e28` → `#c31a26` | `#684e00` → `#7c4d00` | `#007d79` → `#007c6d` | `#8a3ffc` → `#853bca` |
| 70 | `#0043ce` → `#004299` | `#525252` → `#434951` | `#0e6027` → `#005733` | `#a2191f` → `#8c000c` | — | `#005d5d` → `#00554b` | `#6929c4` → `#610ca0` |
| 80 | `#002d9c` → `#00256c` | `#393939` → `#282d34` | — | — | — | — | — |
| 90 | `#001d6c` → `#000d4e` | `#262626` → `#16191e` | — | — | — | — | — |
| 100 | `#001141` → `#020831` | `#161616` → `#0d0e11` | — | — | — | — | — |
