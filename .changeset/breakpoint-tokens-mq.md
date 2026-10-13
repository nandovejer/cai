---
"@cai-ds/core": minor
"@cai-ds/site": minor
---

**Breaking (`@cai-ds/core`)**: the breakpoint tokens are renamed from `--cai-bp-*` to `--cai-mq-*` (`mq` for media query), and the scale changes:

| Token | Before | Now |
| --- | --- | --- |
| `--cai-mq-sm` | `--cai-bp-sm`, 480px | 640px |
| `--cai-mq-md` | `--cai-bp-md`, 768px | 768px |
| `--cai-mq-lg` | `--cai-bp-lg`, 1024px | 1024px |
| `--cai-mq-xl` | `--cai-bp-xl`, 1280px | 1280px |
| `--cai-mq-xxl` | `--cai-bp-2xl`, 1440px | 1536px |
| `--cai-mq-xxxl` | — | 1920px (new) |

The media queries of core and platform that used 480px follow `--cai-mq-sm` and now fire at 640px and below: `.o-container` and `.cai-platform-content` reduce their padding, `.cai-platform-actions` stacks full width, the page header title steps down to 2xl. The container queries of `.cai-table-wrap` and the player still fire below 480px of their own width: they measure the component, not the window.
