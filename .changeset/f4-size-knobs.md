---
"@luz-ds/tokens": minor
"@luz-ds/core": minor
---

Three size knobs, set on `:root`: `--luz-type-base` (`1rem`), `--luz-type-ratio` (`1.25`) and `--luz-space-unit` (`0.25rem`). Every `--luz-text-*` step is now computed from the base and the ratio, each step rounded to 1/16 rem inside `@supports (width: round(1px, 1px))` (a browser without `round()` keeps the plain chain, at most 0.25px away on three heading sizes), and every `--luz-space-*` step is a multiple of the unit. No visual change at the defaults: the nine type sizes and the ten space steps keep their values. Spacing is now in rem, so it follows the reader's browser font size like the type does (at the default 16px root nothing moves). A knob set on `body` or on a section changes nothing; set it on `:root`. `--luz-control-*` (target sizes) are not knobs.

`--luz-text-body` is a new core setting: running text, `calc(var(--luz-text-base) * 1.0625)` (17px at the defaults), read by `body`, so the base knob moves running text too. On touch screens and at 768px or less `--luz-text-control` is `max(1rem, var(--luz-text-base))`: a base below 16px never takes a form field under 16px.

`tokens.json` entries with a formula gain `from` (the plain chain) and, for type, `fromRounded`; `value` stays the resolved default. `luz-tokens.dtcg.json` has `--luz-type-ratio` as a DTCG `number` and the formula of a derived size in `$extensions["com.luz-ds"].from`. The theme template's header says sizes are not set in a theme.
