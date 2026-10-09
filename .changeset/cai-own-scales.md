---
"@cai-ds/tokens": major
"@cai-ds/core": major
"@cai-ds/platform": major
---

Spacing, control heights, the type ramp and the easing curves are CAI's own, each built by a stated rule. They used to be IBM Carbon's spacing and size scales and Material's easing curves.

**Breaking (`@cai-ds/tokens`)**

Spacing: a 2px hairline, then the 4px base times 1, 2, 3, 4, 6, 8, 12, 16 and 24 (each power of two and its 1.5× half step). The names use the same t-shirt sizes as the type ramp. 40px and 80px are gone; CAI's components moved to the nearest step.

| Old | Value | New | Value |
| --- | --- | --- | --- |
| `--cai-space-01` | 2px | `--cai-space-3xs` | 2px |
| `--cai-space-02` | 4px | `--cai-space-2xs` | 4px |
| `--cai-space-03` | 8px | `--cai-space-xs` | 8px |
| `--cai-space-04` | 12px | `--cai-space-sm` | 12px |
| `--cai-space-05` | 16px | `--cai-space-md` | 16px |
| `--cai-space-06` | 24px | `--cai-space-lg` | 24px |
| `--cai-space-07` | 32px | `--cai-space-xl` | 32px |
| `--cai-space-08` | 40px | `--cai-space-xl` (or `calc(var(--cai-space-xl) + var(--cai-space-xs))` to keep 40px) | 32px |
| `--cai-space-09` | 48px | `--cai-space-2xl` | 48px |
| `--cai-space-10` | 64px | `--cai-space-3xl` | 64px |
| `--cai-space-11` | 80px | `--cai-space-3xl` (or `calc(var(--cai-space-3xl) + var(--cai-space-md))` to keep 80px) | 64px |
| `--cai-space-12` | 96px | `--cai-space-4xl` | 96px |

Control heights: 44px, the WCAG 2.5.5 target size, and steps of 1.25× around it on the 4px grid. Buttons and fields are now 44px high (they were 40px). `tokens.json` calls the group `control` (it was `sizing`).

| Old | Value | New | Value |
| --- | --- | --- | --- |
| `--cai-size-height-sm` | 24px | `--cai-control-sm` | 28px |
| `--cai-size-height-md` | 32px | `--cai-control-md` | 36px |
| `--cai-size-height-lg` | 40px | `--cai-control-lg` | 44px |
| `--cai-size-height-xl` | 48px | `--cai-control-xl` | 56px |

Type ramp: the readability floors (`--cai-text-xs` 12px, `-sm` 14px, `-md` 15px) and the 16px base do not change. Above the base each step is the one before times 1.25, rounded to whole pixels. The names do not change.

| Token | Old | New |
| --- | --- | --- |
| `--cai-text-lg` | 1.25rem (20px) | 1.25rem (20px) |
| `--cai-text-xl` | 1.5rem (24px) | 1.5625rem (25px) |
| `--cai-text-2xl` | 2rem (32px) | 1.9375rem (31px) |
| `--cai-text-3xl` | 2.625rem (42px) | 2.4375rem (39px) |
| `--cai-text-4xl` | 3.375rem (54px) | 3.0625rem (49px) |

**Changed (`@cai-ds/core`)**

The easing curves are CAI's own: movement starts promptly and spends most of its time settling. The names do not change.

| Token | Old | New |
| --- | --- | --- |
| `--cai-easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | `cubic-bezier(0.3, 0, 0.1, 1)` |
| `--cai-easing-enter` | `cubic-bezier(0, 0, 0.2, 1)` | `cubic-bezier(0.15, 0.6, 0.3, 1)` |
| `--cai-easing-exit` | `cubic-bezier(0.4, 0, 1, 1)` | `cubic-bezier(0.5, 0, 0.85, 0.4)` |
| `--cai-easing-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `cubic-bezier(0.3, 1.35, 0.55, 1)` |
