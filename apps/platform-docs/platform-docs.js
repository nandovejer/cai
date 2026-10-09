/**
 * /platform/ moved into the documentation page, /docs/#platform.
 * The page's meta refresh sends every visitor there, with or without
 * JavaScript. This module only keeps the section an old link asked for: it
 * maps the old #fragment to its id on the documentation page and goes there
 * first. Not part of any published package.
 */

// Old id → new id. Sections that duplicated tokens and core now point at them.
const MOVED = {
  installation: "installation",
  "when-to-use": "platform",
  architecture: "packages",
  colors: "t-semantic",
  "colors-palette": "t-primitives",
  "colors-semantic": "t-semantic",
  tokens: "tokens",
  "tokens-spacing": "t-spacing",
  "tokens-elevation": "t-shadow",
  "tokens-motion": "c-motion",
  "tokens-typography-scales": "t-type",
  "tokens-usage": "platform",
  "tokens-theme": "themes-custom",
  primitives: "core",
  "prim-box": "c-objects",
  "prim-stack": "c-objects",
  "prim-grid": "c-objects",
  "prim-text": "c-elements",
  "prim-buttons": "c-button",
  "prim-form": "c-form",
  "prim-tags": "c-tag",
  "prim-html": "html-elements",
  components: "core",
  "comp-alerts": "c-alert",
  "comp-modal": "c-modal",
  "comp-cards": "c-card",
  "comp-nav": "c-tabs",
  "comp-players": "c-player",
  themes: "themes",
  reference: "p-reference",
  guidance: "p-shell",
  examples: "p-examples",
  templates: "p-templates",
  "live-demo": "p-image",
  "demo-image": "demo-image",
  source: "build",
};

const link = document.querySelector("[data-moved-to]");
if (link) {
  const old = decodeURIComponent(window.location.hash.slice(1));
  const target = new URL(link.href);
  // The pattern sections and their guidance kept their ids (p-*, h-p-*)
  if (MOVED[old]) target.hash = MOVED[old];
  else if (/^(h-)?p-[\w-]+$/.test(old)) target.hash = old;
  window.location.replace(target.href);
}
