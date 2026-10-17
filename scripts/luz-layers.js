/**
 * LUZ — the public cascade layers (one source for every build script).
 *
 * Every LUZ stylesheet puts its rules in a layer inside one container layer,
 * `luz`, so a consumer orders LUZ as a whole (`@layer reset, luz, app;`) and
 * LUZ's own layer names cannot collide with theirs (Tailwind's `components`
 * and `utilities`, for one). The names below are public API: renaming one is
 * a breaking change (VERSIONING, "Cascade layers").
 *
 * Order, first to last (a later layer wins over an earlier one):
 *   luz.tokens      custom properties of @luz-ds/tokens
 *   luz.themes      the shipped custom themes (only custom properties)
 *   luz.settings    configuration custom properties of core
 *   luz.generic     reset
 *   luz.elements    bare HTML elements, at specificity 0
 *   luz.objects     layout (.o-*)
 *   luz.components  .luz-* components
 *   luz.utilities   .u-* helpers: they win over components by order
 *   luz.site        .luz-site-* patterns of @luz-ds/site
 *   luz.landing     .luz-landing-* patterns of @luz-ds/landing (one kind of
 *                   site, built on site: after it, so it can refine it)
 *   luz.cms         .luz-cms-* patterns of @luz-ds/cms (a blog, a newspaper,
 *                   any CMS). Landing and cms never meet (no shared class),
 *                   so their order decides nothing; cms comes after landing
 *                   so adding it moved no existing layer
 *   luz.app         .luz-app-* patterns of @luz-ds/app (the header and the
 *                   dashboard of a web application). It shares no class
 *                   with landing or cms either; it comes after cms so
 *                   adding it moved no existing layer
 *   luz.docs        .luz-docs-* patterns of @luz-ds/docs (the shell, the page
 *                   head, the rail, the example, the do and don't, the pager
 *                   and the page foot of a documentation site). It
 *                   shares no class with any other package, so its place
 *                   moves no other layer: after app, before luz.print
 *   luz.print       what changes on paper (@media print): last, so it wins over
 *                   the screen styles of every package by order
 *
 * Every file repeats the statement first, so the order is the same whichever
 * file a page loads first.
 */
export const LAYERS = ["tokens", "themes", "settings", "generic", "elements", "objects", "components", "utilities", "site", "landing", "cms", "app", "docs", "print"];

export const LAYER_ORDER = `@layer ${LAYERS.map((l) => `luz.${l}`).join(", ")};\n`;

/** CSS `css` inside the public layer `name` (without the `luz.` prefix), with the order statement first. */
export const inLuzLayer = (name, css) => {
  if (!LAYERS.includes(name)) throw new Error(`unknown LUZ layer "${name}"`);
  return `${LAYER_ORDER}@layer luz.${name} {\n${css}\n}\n`;
};
