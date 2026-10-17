---
"@luz-ds/landing": patch
"@luz-ds/check": patch
---

The hero's copy no longer widens the page when a word is longer than the line, for example with 400 % text on a 320 px screen (WCAG 1.4.10). A word in `.luz-landing-hero__copy` now breaks (`overflow-wrap: anywhere`), and the copy of a `--centered` hero is never wider than its column (`max-inline-size: min(100%, 48rem)`). At usual text sizes nothing moves.
