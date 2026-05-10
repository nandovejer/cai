# CAI — Vanilla-First Architecture

**CAI is a vanilla design system. No JS frameworks. No runtime dependencies.**

This is not a preference — it is an architectural decision that defines what the system can do and how it grows.

## Decision Framework

Before writing any line of code, ask:

| Is there a native browser API for this?         | Action                               |
| ----------------------------------------------- | ------------------------------------ |
| Yes                                             | Use it. No exceptions.               |
| No, but it can be done with vanilla JS          | Do it in vanilla JS.                 |
| No, and it would require an external dependency | Open a discussion before proceeding. |

## In Practice

- **JS:** vanilla ES modules. No React, Vue, Svelte, Alpine, HTMX, or any other runtime framework or library. No `npm install` for code running in the browser.
- **CSS:** native custom properties, `@keyframes`, `@media`, `@layer` when applicable. No Tailwind, PostCSS plugins that transform syntax, or CSS-in-JS.
- **Browser APIs to prefer:** `IntersectionObserver`, `ResizeObserver`, `MutationObserver`, `Web Animations API`, `AudioContext`, `Pointer Events`, the `dialog` element, the `popover` API, `details`/`summary`, native `form` validation, `<template>`, `CustomEvent`.
- **Bundler:** Vite only for the dev server and the docs app. Distributed packages are plain CSS and JS — they do not require a bundler to work.
- **The docs app** (`apps/docs/`) is also vanilla. It is the living demo of the system — if it requires a framework to work, the system has failed.

## Target Audience

- **Indie makers & small teams** building web products
- **Design system maintainers** needing a lightweight foundation
- **Educators** teaching HTML/CSS/a11y without framework overhead
- **Embedded use cases** (docs sites, component libraries, design tokens)
