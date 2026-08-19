import js from "@eslint/js";

/**
 * Flat config (ESLint 9). Migrated from .eslintrc.json — stylistic rules
 * aligned with the actual codebase style (double quotes, allowed
 * single-line if statements).
 */
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
        // Node (build scripts)
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
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
