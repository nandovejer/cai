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

// The syntax page code may not use: RL-16, RL-1, RL-12, RL-3 and RL-8
const PAGE_SYNTAX = [
  // RL-16, as in the base rules
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
    message: "Script animations ignore the --luz-duration-* tokens: use CSS, or check prefers-reduced-motion and document it (red line 8).",
  },
];

// docs-redesign security.md SEC-IDX-1/2: text from an index, a CMS or the
// URL reaches the page through textContent only. Enforced on every package
// and app; core's highlight.js, which writes its own escaped tokenizer
// output, carries the one justified eslint-disable.
const HTML_SINK = "No HTML from strings: build nodes and set textContent (security.md SEC-IDX-1).";
const SINK_PROPS = "/^(innerHTML|outerHTML|srcdoc)$/";
const NO_HTML_SINKS = [
  // el.innerHTML = s, el["innerHTML"] = s, iframe.srcdoc = s
  { selector: `AssignmentExpression > MemberExpression.left[property.name=${SINK_PROPS}]`, message: HTML_SINK },
  { selector: `AssignmentExpression > MemberExpression.left[property.value=${SINK_PROPS}]`, message: HTML_SINK },
  // Object.assign(el, { innerHTML }) and other object literals that carry a sink
  { selector: `Property[key.name=${SINK_PROPS}], Property[key.value=${SINK_PROPS}]`, message: HTML_SINK },
  {
    selector: "CallExpression[callee.property.name=/^(insertAdjacentHTML|createContextualFragment|parseFromString|write|writeln|eval|setHTMLUnsafe|parseHTMLUnsafe)$/]",
    message: HTML_SINK,
  },
  { selector: "CallExpression[callee.name=/^(eval|Function)$/], NewExpression[callee.name=/^(Function|DOMParser)$/]", message: HTML_SINK },
  // setTimeout("code") / setInterval(`code`): a string is evaluated
  {
    selector: "CallExpression[callee.name=/^set(Timeout|Interval)$/][arguments.0.type=/^(Literal|TemplateLiteral)$/]",
    message: HTML_SINK,
  },
  {
    selector: "CallExpression[callee.property.name=/^set(Timeout|Interval)$/][arguments.0.type=/^(Literal|TemplateLiteral)$/]",
    message: HTML_SINK,
  },
];

// @luz-ds/check is Node code, not page code (f5-ai-ready.md 5.1 and 8): it
// reads the files of whoever runs it and its output enters a model's context,
// so what it may do is an allow-list. Imports: node:fs, node:path, node:url
// and our own files, nothing else (so no child_process, net, dns, dgram, tls,
// http(s), http2, vm, worker_threads, cluster or module, with or without the
// `node:` prefix). Calls: no eval, Function, fetch or require, no socket or
// worker, no process.env, and no import() of a path that is not a literal.
const NODE_IMPORTS = "^(?!node:(?:fs|path|url)$)(?![./])";
const NODE_IMPORT_MESSAGE = "@luz-ds/check imports node:fs, node:path, node:url and its own files only: no process, network, vm or thread (f5-ai-ready.md 8).";
const NODE_CAPABILITY = "@luz-ds/check does not evaluate code, open a connection, read the environment or load a computed path (f5-ai-ready.md 8).";
const NODE_SYNTAX = [
  // RL-16, as in the base rules
  { selector: `MemberExpression[object.name='navigator'][property.name=${SNIFFING}]`, message: SNIFF_MESSAGE },
  { selector: `MemberExpression[object.property.name='navigator'][property.name=${SNIFFING}]`, message: SNIFF_MESSAGE },
  { selector: `VariableDeclarator[init.name='navigator'] > ObjectPattern > Property[key.name=${SNIFFING}]`, message: SNIFF_MESSAGE },
  // A dynamic import() takes a literal from the same allow-list
  { selector: "ImportExpression[source.type!='Literal']", message: NODE_CAPABILITY },
  { selector: `ImportExpression > Literal[value=/${NODE_IMPORTS}/]`, message: NODE_IMPORT_MESSAGE },
  // eval, Function, fetch, require: bare, through a global object or as (0, eval)(s)
  { selector: "CallExpression[callee.name=/^(eval|Function|fetch|require)$/], NewExpression[callee.name=/^(Function|WebSocket|XMLHttpRequest|Worker|EventSource)$/]", message: NODE_CAPABILITY },
  { selector: "CallExpression[callee.object.name=/^(globalThis|global|window|self)$/][callee.property.name=/^(eval|fetch|Function)$/]", message: NODE_CAPABILITY },
  { selector: "CallExpression[callee.type='SequenceExpression']", message: NODE_CAPABILITY },
  // The environment and the engine's own doors: process.env, process["env"], const { env } = process
  { selector: "MemberExpression[object.name='process'][property.name=/^(env|binding|dlopen)$/], MemberExpression[object.name='process'][property.value=/^(env|binding|dlopen)$/]", message: NODE_CAPABILITY },
  { selector: "VariableDeclarator[init.name='process'] > ObjectPattern > Property[key.name=/^(env|binding|dlopen)$/]", message: NODE_CAPABILITY },
];

// axe-core and @axe-core/* (MPL-2.0) are dev tools of tests/: code that ships or
// is served never imports them. Named apart from the generic RL-1 pattern so the
// report says why and survives a change to that pattern.
const AXE_MESSAGE = "axe-core and @axe-core/* are MPL-2.0 dev tools of tests/: never import them from packages/ or apps/ (code that ships or is served).";
const AXE_PATTERNS = [{ group: ["axe-core", "axe-core/*", "@axe-core/*"], message: AXE_MESSAGE }];

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
        MutationObserver: "readonly",
        ResizeObserver: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        DOMException: "readonly",
        sessionStorage: "readonly",
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
    // @luz-ds/check has the Node block below
    ignores: ["packages/check/src/**"],
    rules: {
      // RL-1: no runtime dependency. Only relative or root-absolute imports.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...AXE_PATTERNS,
            {
              // axe is reported by its own entry above, once
              regex: "^(?![./])(?!axe-core(?:/|$)|@axe-core/)",
              message: "No runtime dependency: import our own files only (red line 1).",
            },
          ],
        },
      ],
      "no-restricted-syntax": ["error", ...PAGE_SYNTAX, ...NO_HTML_SINKS],
    },
  },
  {
    // Node code: a command line that reads files. Not page code, so none of
    // the HTML-sink and URL-literal rules above; an allow-list instead
    files: ["packages/check/src/**/*.js"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ regex: NODE_IMPORTS, message: NODE_IMPORT_MESSAGE }] }],
      "no-restricted-syntax": ["error", ...NODE_SYNTAX],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: NODE_CAPABILITY },
        { name: "WebSocket", message: NODE_CAPABILITY },
        { name: "XMLHttpRequest", message: NODE_CAPABILITY },
        { name: "eval", message: NODE_CAPABILITY },
        { name: "require", message: NODE_CAPABILITY },
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
