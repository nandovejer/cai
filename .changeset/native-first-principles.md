---
"@cai-ds/tokens": minor
"@cai-ds/core": major
"@cai-ds/platform": minor
---

Native elements first, JavaScript as an enhancement (see PRINCIPLES.md).

**Breaking (`@cai-ds/core`)**

- The switch is a native `<input type="checkbox" role="switch" class="cai-toggle__input">` inside `<label class="cai-toggle">`. `toggle.js`, `setToggleState()`, `initToggles()` and the `./toggle` export are removed, as are `.cai-toggle__track.is-on` and the `role="switch"` div.
- Modals are native `<dialog class="cai-modal">` only. The div-based `.cai-modal` / `.cai-modal-overlay` path and `createFocusTrap()` are removed. Open and close with `commandfor` + `command="show-modal" | "close"`; `data-modal-trigger` and `data-modal-close` are gone. `initModals()` is now only a fallback for browsers without those attributes.
- The mobile sidebar is a popover: `<nav class="cai-sidebar" popover>` opened by `<button popovertarget>`. `openSidebar()`, `closeSidebar()`, `.cai-nav-overlay` and the `is-open` class are removed.
- The color-mode switcher is a native radio group: `<fieldset class="cai-mode-switcher">` with `<label class="cai-mode-btn"><input type="radio" name="cai-theme">`. It works without JavaScript through `:root:has()` in the token CSS.
- Tabs are links to panels that are all visible without JavaScript; `initTabs()` adds the ARIA roles. Markup changes to `<nav class="cai-tabs">` with `<a class="cai-tab" href="#panel">` and `.cai-tabpanel`.
- Player seek and volume bars are `<input type="range" class="cai-player-seekbar">`; the `.cai-player-seekbar-buf/-fill/-thumb` children are removed. Audio and video keep their native `controls` until the script replaces them.
- Progress is the native `<progress class="cai-progress">`; `.cai-progress__fill` is removed.
- `.cai-copy-btn` and the custom player controls are hidden until JavaScript runs (`:root[data-cai-js]`, set by `enableJs()`).
- Core CSS is wrapped in native cascade layers (`settings, generic, elements, objects, components, utilities`). Unlayered consumer CSS now beats all of core regardless of specificity. `!important` is gone from core, including the global reduced-motion reset: motion is switched off by zeroing the `--cai-duration-*` tokens.
- Bare links are underlined inside running text; `:where(a)` replaces `a` (zero specificity).

**Changed**

- Logical properties replace `margin-left/right`, `padding-left/right`, `border-left/right` and `text-align: left/right`.
- `.cai-input:focus-visible` draws the same 2px ring as buttons and links.
- `--cai-shadow-icon` added to the tokens; no literal colours remain in components.
- Strings in the docs follow the principles (sentence case, verb-first buttons, no "OK" or "Submit").

**Added**

- `enableJs()` in `@cai-ds/core/utils`, `supportsCommands()` in `@cai-ds/core/modal`.
- An accessibility statement in the docs app, and a "When to use, When not to use, How it works, Content guidance, Keyboard and ARIA, Known issues" block for every core component in the landing page.

**Known issues**

- Tooltip cannot be dismissed with Escape (WCAG 1.4.13, partial).
- `.cai-icon-item` is made a `role="button"` on a div by script.
- Screen readers have not been used to test any component.
