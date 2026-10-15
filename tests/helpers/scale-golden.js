/**
 * The type and space scales as LUZ shipped them before the size knobs
 * (F4), and what the knobs must give for the combinations the docs promise.
 * These are literals on purpose: a deliberate change to the scale edits this
 * file and carries a changeset; an accidental one fails the tests that read
 * it (tests/type-space-scale.test.js, .spec.js, tests/knobs-reader.spec.js).
 * Source: .claude/plans/specs/f4-customisation.md, section 1.7.
 */

/** The nine steps of the type scale, smallest to largest. */
export const STEPS = ["xs", "sm", "md", "base", "lg", "xl", "2xl", "3xl", "4xl"];

/** `--luz-text-<step>` in tokens.json before the knobs, as written there. */
export const TEXT_AT_DEFAULTS = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "0.9375rem",
  base: "1rem",
  lg: "1.25rem",
  xl: "1.5625rem",
  "2xl": "1.9375rem",
  "3xl": "2.4375rem",
  "4xl": "3.0625rem",
};

/** The same, in px at a 16px root, with round(): the sizes the browser draws. */
export const TEXT_PX_AT_DEFAULTS = [12, 14, 15, 16, 20, 25, 31, 39, 49];

/** Without round() (a browser that lacks it): the plain chain, in px. Only 2xl, 3xl and 4xl differ. */
export const TEXT_PX_PLAIN_CHAIN = [12, 14, 15, 16, 20, 25, 31.25, 39.0625, 48.828125];

/** The ten steps of the space scale, and their px at the 4px unit. */
export const SPACE_STEPS = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
export const SPACE_PX_AT_DEFAULTS = [2, 4, 8, 12, 16, 24, 32, 48, 64, 96];
/** At `--luz-space-unit: 0.1875rem` (3px), a 16px root. */
export const SPACE_PX_AT_3PX_UNIT = [1.5, 3, 6, 9, 12, 18, 24, 36, 48, 72];

/** The knob combinations of the docs, with the nine type steps in px at a 16px root (STEPS order). */
export const PRESETS = [
  { name: "default", knobs: {}, px: TEXT_PX_AT_DEFAULTS },
  { name: "larger text (base 1.125rem)", knobs: { "--luz-type-base": "1.125rem" }, px: [12, 14, 16, 18, 23, 29, 36, 45, 56] },
  { name: "tighter steps (ratio 1.2)", knobs: { "--luz-type-ratio": "1.2" }, px: [12, 14, 15, 16, 19, 23, 28, 34, 41] },
  { name: "small base (0.875rem, the floors hold)", knobs: { "--luz-type-base": "0.875rem" }, px: [12, 14, 14, 14, 18, 23, 29, 36, 45] },
  { name: "large and wide (1.25rem, 1.333)", knobs: { "--luz-type-base": "1.25rem", "--luz-type-ratio": "1.333" }, px: [12, 15, 18, 20, 27, 36, 48, 64, 85] },
];

/** The reader's browser font size at 125 % (a 20px root), default knobs: every step is today's rem scale x1.25. */
export const TEXT_PX_AT_ROOT_125 = [15, 17.5, 18.75, 20, 25, 31.25, 38.75, 48.75, 61.25];

/** The "large" preset the reader-safety spec uses: the top of every tested range. */
export const LARGE = { "--luz-type-base": "1.25rem", "--luz-type-ratio": "1.333", "--luz-space-unit": "0.3125rem" };

/** `:root { … }` for a map of knobs. */
export const knobsCss = (knobs) => `:root { ${Object.entries(knobs).map(([k, v]) => `${k}: ${v};`).join(" ")} }`;
