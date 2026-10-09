/**
 * CAI — the ESLint HTML-sink rule (docs-redesign security.md SEC-IDX-1/2)
 * covers every package and every app, and every way to turn a string into
 * HTML or code that the phase 4 review found. Each line of the fixture is one
 * sink and must be reported once; the safe lines must not be.
 */
import { describe, it, expect } from "vitest";
import { ESLint } from "eslint";

const SINKS = [
  "el.innerHTML = s;",
  "el.outerHTML = s;",
  'el["innerHTML"] = s;',
  "iframe.srcdoc = s;",
  'iframe["srcdoc"] = s;',
  "Object.assign(el, { innerHTML: s });",
  'Object.assign(el, { "outerHTML": s });',
  'el.insertAdjacentHTML("beforeend", s);',
  "range.createContextualFragment(s);",
  'parser.parseFromString(s, "text/html");',
  "document.write(s);",
  "eval(s);",
  "window.eval(s);",
  "Function(s);",
  "new Function(s);",
  "new DOMParser();",
  "el.setHTMLUnsafe(s);",
  "Document.parseHTMLUnsafe(s);",
  'setTimeout("go()", 1);',
  "setInterval(`go()`, 1);",
  'window.setTimeout("go()", 1);',
];

const SAFE = [
  "el.textContent = s;",
  "el.append(s);",
  "setTimeout(() => go(), 1);",
  "window.setInterval(go, 1);",
  "navigator.clipboard.writeText(s);",
  "const o = { text: s };",
];

const eslint = new ESLint();
const sinkMessages = async (code, filePath) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => /No HTML from strings/.test(m.message));
};

describe("no-HTML-sinks rule", () => {
  for (const file of ["packages/core/src/x.js", "packages/platform/src/x.js", "packages/tokens/src/x.js", "apps/docs/x.js"]) {
    it(`reports each sink once in ${file}`, async () => {
      const messages = await sinkMessages(SINKS.join("\n"), file);
      expect(messages.map((m) => m.line)).toEqual(SINKS.map((_, i) => i + 1));
    });

    it(`leaves text and function callbacks alone in ${file}`, async () => {
      expect(await sinkMessages(SAFE.join("\n"), file)).toEqual([]);
    });
  }
});
