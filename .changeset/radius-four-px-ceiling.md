---
"@cai-ds/tokens": major
"@cai-ds/core": major
"@cai-ds/site": minor
---

One corner for every box: 4px, and never more.

**Breaking (tokens)**

- `--cai-radius-md` is 4px (was 6px).
- `--cai-radius-lg` (14px) and `--cai-radius-xl` (22px) are removed, from the CSS and from the DTCG file. A rule that still reads them gets no corner at all: use `--cai-radius-md`.
- The scale is now `none` (0), `sm` (2px), `md` (4px) and `full` (a pill or a circle), each with a description in `tokens.json`.

**Core**

- Every box has `--cai-radius-md`: the button (and the classless button), the alert, the toast, the tooltip, the avatar, the fieldset, the file button of a file field, a select shown as a list (`multiple` or `size`, also in classless), the mode switcher's buttons, the sidebar logo, the code block, a bare `pre`, the copy button and the player's buttons. The dialog, `.cai-modal` and the dropdown panel go from 14px to 4px.
- `--cai-radius-sm` (2px) stays for small marks and for a row inside a rounded box: the checkbox, inline code, `kbd`, `mark`, `del`, `ins`, the scrollbar thumb, the toast's close button and the dropdown's items (concentric with the 4px panel).
- `--cai-radius-full` for what is round by nature: the switch track (was 12px) and the count badge (was 10px). Dots, radio buttons and slider thumbs stay circles with `50%`.
- No literal radius is left: the 2px of `mark`, `del`, `ins` and the scrollbar thumb are `--cai-radius-sm`.
- Unchanged on purpose: the text field and the closed select are drawn by their bottom edge only, so they keep square corners; the details of an accordion keep square joins between them, with the block's corners rounded; tabs and breadcrumb links draw no box.
- The focus ring is an outline, so it follows each corner.
- The theme template lists `--cai-radius-sm` and `-md` as the optional corner tokens.

**Platform**

- The command block, the image frame and the skip link have `--cai-radius-md`.
