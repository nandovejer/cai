/**
 * CAI — the public cascade layers (one source for every build script).
 *
 * Every CAI stylesheet puts its rules in a layer inside one container layer,
 * `cai`, so a consumer orders CAI as a whole (`@layer reset, cai, app;`) and
 * CAI's own layer names cannot collide with theirs (Tailwind's `components`
 * and `utilities`, for one). The names below are public API: renaming one is
 * a breaking change (VERSIONING, "Cascade layers").
 *
 * Order, first to last (a later layer wins over an earlier one):
 *   cai.tokens      custom properties of @cai-ds/tokens
 *   cai.themes      the shipped custom themes (only custom properties)
 *   cai.settings    configuration custom properties of core
 *   cai.generic     reset
 *   cai.elements    bare HTML elements, at specificity 0
 *   cai.objects     layout (.o-*)
 *   cai.components  .cai-* components
 *   cai.utilities   .u-* helpers: they win over components by order
 *   cai.site        .cai-site-* patterns of @cai-ds/site
 *   cai.landing     .cai-landing-* patterns of @cai-ds/landing (one kind of
 *                   site, built on site: after it, so it can refine it)
 *   cai.cms         .cai-cms-* patterns of @cai-ds/cms (a blog, a newspaper,
 *                   any CMS). Landing and cms never meet (no shared class),
 *                   so their order decides nothing; cms comes after landing
 *                   so adding it moved no existing layer, and wordpress,
 *                   built on cms, can follow it with the branch in one run
 *   cai.print       what changes on paper (@media print): last, so it wins over
 *                   the screen styles of every package by order
 *
 * Every file repeats the statement first, so the order is the same whichever
 * file a page loads first.
 */
export const LAYERS = ["tokens", "themes", "settings", "generic", "elements", "objects", "components", "utilities", "site", "landing", "cms", "print"];

export const LAYER_ORDER = `@layer ${LAYERS.map((l) => `cai.${l}`).join(", ")};\n`;

/** CSS `css` inside the public layer `name` (without the `cai.` prefix), with the order statement first. */
export const inCaiLayer = (name, css) => {
  if (!LAYERS.includes(name)) throw new Error(`unknown CAI layer "${name}"`);
  return `${LAYER_ORDER}@layer cai.${name} {\n${css}\n}\n`;
};
