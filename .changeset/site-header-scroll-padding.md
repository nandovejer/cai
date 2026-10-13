---
"@cai-ds/site": patch
---

Site header: a field reached with Tab under a sticky header is no longer left under it in Safari (WebKit review, 2026-10-13).

**Fixed**

- `.cai-platform-site-header--sticky`: the page's `scroll-padding-block-start` is now `max(--cai-platform-site-header-h, 3.5em)` plus half of `--cai-control-lg`. Chromium centres the field it scrolls to; WebKit puts its top at the padding minus half its height, which left a 44 px field 8 px under the header at 100 % text.

**Known issues (not fixed)**

- Sticky header at 300 % text with the header wrapped to several rows (252 to 353 px in the test page): Safari (measured in WebKit on Linux) still leaves the field under it; at 100 % and 200 % the field ends 14 px below the header. Chromium centres the element and keeps it clear. Listed on the Site header page, with the way out (override `scroll-padding-block-start` with the header's real height, or drop `--sticky`), and in the accessibility statement.
- Firefox with forced colors: the `::backdrop` of the open menu loses the scrim gradient (computed `none`); the panel keeps its border.
- Safari on a Mac with always-visible scrollbars does not count the scrollbar in width media queries (WebKit bug 52653): the 640, 768 and 1024 px breakpoints are crossed when the window is up to about 15 px wider.
- `@cai-ds/core` Copy button: when `navigator.clipboard.writeText` rejects, the failure is announced to screen readers but the button shows no message.
