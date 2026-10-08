import js from "@eslint/js";

/**
 * Flat config (ESLint 9). Migrated from .eslintrc.json — stylistic rules
 * aligned with the actual codebase style (double quotes, allowed
 * single-line if statements).
 *
 * The browser-code block at the end is the JavaScript half of the red lines
 * in PRINCIPLES.md (RL-1, RL-3, RL-8, RL-12, RL-16).
 */

// RL-16: these navigator properties only exist to identify the browser
const SNIFFING = "/^(userAgent|userAgentData|vendor|vendorSub|platform|appVersion|appName|appCodeName|oscpu|product|productSub)$/";
const SNIFF_MESSAGE = "Feature-detect instead of sniffing the browser (red line 16).";

// RL-3: the browser already does these; JavaScript must not redo them
const NATIVE_KEYS = "/^(Escape|Esc|Tab)$/";
const NATIVE_MESSAGE =
  "dialog, popover and details handle Escape and focus order natively: do not re-implement them (red line 3).";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        getComputedStyle: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        performance: "readonly",
        IntersectionObserver: "readonly",
        AudioContext: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        console: "readonly",
        URL: "readonly",
        location: "readonly",
        HTMLButtonElement: "readonly",
        HTMLDialogElement: "readonly",
        HTMLElement: "readonly",
        NodeFilter: "readonly",
        Node: "readonly",
        CSSStyleRule: "readonly",
        customElements: "readonly",
        // Node (build scripts)
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        global: "readonly",
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "log", "info"] }],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      eqeqeq: ["error", "always"],
      "no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      // RL-16: feature detection only, never browser sniffing (navigator.x,
      // window.navigator.x and const { x } = navigator)
      "no-restricted-syntax": [
        "error",
        { selector: `MemberExpression[object.name='navigator'][property.name=${SNIFFING}]`, message: SNIFF_MESSAGE },
        { selector: `MemberExpression[object.property.name='navigator'][property.name=${SNIFFING}]`, message: SNIFF_MESSAGE },
        { selector: `VariableDeclarator[init.name='navigator'] > ObjectPattern > Property[key.name=${SNIFFING}]`, message: SNIFF_MESSAGE },
      ],
    },
  },
  {
    // Code that runs in the page: the packages and the four apps
    files: ["packages/*/src/**/*.js", "apps/**/*.js"],
    rules: {
      // RL-1: no runtime dependency. Only relative or root-absolute imports.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?![./])",
              message: "No runtime dependency: import our own files only (red line 1).",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        // RL-16, as above
        { selector: `MemberExpression[object.name='navigator'][property.name=${SNIFFING}]`, message: SNIFF_MESSAGE },
        { selector: `MemberExpression[object.property.name='navigator'][property.name=${SNIFFING}]`, message: SNIFF_MESSAGE },
        { selector: `VariableDeclarator[init.name='navigator'] > ObjectPattern > Property[key.name=${SNIFFING}]`, message: SNIFF_MESSAGE },
        // RL-1: the same for dynamic import()
        {
          selector: "ImportExpression > Literal[value=/^(?![./])/]",
          message: "No runtime dependency: import our own files only (red line 1).",
        },
        // RL-12: no third-party request. A URL literal in page code is one.
        {
          selector: "Literal[value=/^(https?:)?\\/\\//]",
          message: "No third-party network request from a package or an app (red line 12).",
        },
        {
          selector: "TemplateElement[value.raw=/^(https?:)?\\/\\//]",
          message: "No third-party network request from a package or an app (red line 12).",
        },
        // RL-3: Escape, Tab order, details and dialog state are the browser's
        { selector: `BinaryExpression > Literal[value=${NATIVE_KEYS}]`, message: NATIVE_MESSAGE },
        { selector: `SwitchCase > Literal[value=${NATIVE_KEYS}]`, message: NATIVE_MESSAGE },
        {
          selector: "AssignmentExpression > MemberExpression.left[property.name='open']",
          message: "Let the browser open and close details and dialog (red line 3). If this only sets an initial state, say why in an eslint-disable comment.",
        },
        {
          selector: "CallExpression[callee.property.name=/^(setAttribute|removeAttribute|toggleAttribute)$/][arguments.0.value='open']",
          message: "Let the browser open and close details and dialog (red line 3).",
        },
        {
          selector: "CallExpression[callee.property.name='preventDefault']",
          message:
            "preventDefault() cancels a native action (red line 3, PRINCIPLES.md §3). If what replaces it is strictly better, document why in an eslint-disable-next-line comment.",
        },
        // RL-8: smooth scrolling and script animation ignore prefers-reduced-motion
        {
          selector: "Property[key.name='behavior'][value.value='smooth']",
          message: "Smooth scrolling belongs to CSS scroll-behavior, inside prefers-reduced-motion: no-preference (red line 8).",
        },
        {
          selector: "CallExpression[callee.property.name='animate']",
          message: "Script animations ignore the --cai-duration-* tokens: use CSS, or check prefers-reduced-motion and document it (red line 8).",
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/",
      "**/dist/**",
      "build/",
      "coverage/",
      "**/*.min.js",
    ],
  },
];
