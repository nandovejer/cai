/**
 * Stylelint — the CSS half of the red lines in PRINCIPLES.md.
 *
 * Every CSS file in packages/ and apps/ gets the rules that hold everywhere
 * (RL-5 focus, RL-8 motion). packages/ adds the standard config, the strong
 * rules SR-3 (no !important) and SR-4 (logical properties) and RL-11 (bare
 * elements only inside :where()). Component code adds RL-10: no primitive
 * token and no literal colour or space value.
 *
 * JavaScript, not JSON, so the primitive colour families come from
 * tokens.json and a new family is covered without touching this file.
 */
import { readFileSync } from "node:fs";

const tokens = JSON.parse(readFileSync(new URL("./packages/tokens/tokens.json", import.meta.url), "utf-8"));
const families = Object.keys(tokens.color).join("|");

/* ---- Value lists, shared so an override can extend them ---------------- */

// RL-5: the focus ring is never removed (a transparent outline is fine: it is
// what forced-colors mode paints)
const FOCUS = {
  outline: ["/^(none|0|0px|hidden)(\\s|$)/", "/\\s(none|hidden)(\\s|$)/"],
  "outline-style": ["none", "hidden"],
  "outline-width": ["/^0(px|rem|em)?$/"],
};

// RL-8: every duration is a --cai-duration-* token, zeroed in one block under
// prefers-reduced-motion. A literal time other than 0 bypasses that block.
const MOTION = {
  "/^(transition|animation)(-duration)?$/": ["/(^|[\\s,(])(?!0+m?s\\b)\\d*\\.?\\d+m?s\\b/"],
};

const PACKAGES = {
  ...FOCUS,
  ...MOTION,
  color: ["/^#/", "/^rgb/", "/^hsl/", "black", "white", "grey", "gray"],
  background: ["/^#(?!{)/", "/^rgb/"],
  border: ["/solid #/"],
  "border-color": ["/^#/", "/^rgb/"],
  "text-align": ["left", "right"],
  float: ["left", "right"],
};

// RL-10, components only
const COMPONENTS = {
  ...PACKAGES,
  // Primitive tokens (Layer 1 colours): components use semantic tokens
  "/.*/": [`/var\\(--cai-(${families})-\\d+\\)/`],
  // Literal space: margin, padding and gap take --cai-space-* tokens. em and
  // ch stay allowed (relative to the type, not a spacing scale), and so does a
  // 1px hairline (the visually-hidden recipe's margin: -1px).
  "/^(margin|padding|scroll-margin|scroll-padding)(-.+)?$|^(row-|column-)?gap$/": [
    "/(^|[\\s(,])-?(?!0+(px|rem)?\\b|1px\\b)\\d*\\.?\\d+(px|rem)\\b/",
  ],
};

const COLOR_FUNCTIONS = ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color"];
const RL10 = "No primitive token or literal colour or space value in a component: use semantic tokens (red line 10).";

export default {
  plugins: ["./scripts/stylelint/no-bare-element.js"],
  rules: {
    "declaration-property-value-disallowed-list": [
      { ...FOCUS, ...MOTION },
      { message: "Focus stays visible (RL-5) and durations are --cai-duration-* tokens (RL-8)." },
    ],
  },
  ignoreFiles: ["**/dist/**", "**/node_modules/**", "docs/**"],
  overrides: [
    {
      files: ["packages/**/*.css"],
      extends: ["stylelint-config-standard"],
      rules: {
        "color-no-invalid-hex": true,
        "declaration-property-value-disallowed-list": [
          PACKAGES,
          { message: "Disallowed value: see PRINCIPLES.md (RL-5 focus, RL-8 motion tokens, SR-4 logical values)." },
        ],
        "selector-class-pattern": [
          "^(([a-z][a-z0-9]*)((-{1,2}|_{2})([a-z0-9][a-z0-9-]*))*|is-[a-z][a-z0-9-]*)$",
          {
            message:
              "Expected class selector to follow BEM (cai-block, cai-block__element, cai-block--modifier, is-state)",
          },
        ],
        "alpha-value-notation": null,
        "color-function-notation": null,
        "media-feature-range-notation": null,
        "no-descending-specificity": null,
        "comment-empty-line-before": null,
        "no-empty-source": null,
        "rule-empty-line-before": null,
        "declaration-no-important": [
          true,
          { message: "No !important in packages/. Utilities win by @layer order (PRINCIPLES.md, SR-3)." },
        ],
        "property-disallowed-list": [
          [
            "/^margin-(left|right)$/",
            "/^padding-(left|right)$/",
            "/^border-(left|right)(-.+)?$/",
            "/^scroll-(margin|padding)-(left|right)$/",
          ],
          {
            message:
              "Use logical properties (margin-inline-start, padding-inline-end, border-inline-start…) — PRINCIPLES.md, SR-4.",
          },
        ],
        "cai/no-bare-element": true,
      },
    },
    {
      files: [
        "packages/core/src/components/**/*.css",
        "packages/core/src/elements/**/*.css",
        "packages/core/src/objects/**/*.css",
        "packages/platform/src/**/*.css",
      ],
      rules: {
        "color-no-hex": [true, { message: RL10 }],
        "color-named": ["never", { message: RL10 }],
        "function-disallowed-list": [COLOR_FUNCTIONS, { message: RL10 }],
        "declaration-property-value-disallowed-list": [
          COMPONENTS,
          { message: "Disallowed value: see PRINCIPLES.md (RL-5 focus, RL-8 motion tokens, RL-10 primitives and literal space, SR-4)." },
        ],
      },
    },
  ],
};
