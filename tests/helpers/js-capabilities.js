/**
 * What a piece of JavaScript can do, read from its syntax tree and not from
 * its text: a word in a comment or in a string is not a capability.
 *
 * Used by tests/check-capabilities.test.js on the bundle of @luz-ds/check
 * (f5-ai-ready.md section 8, "Capabilities"; security review Q4). The parse
 * is ESLint's own (espree), so the repository adds no dependency to read it.
 *
 *   capabilitiesOf(code) ->
 *     { imports:   ["node:fs", ...]   every static import, re-export and require("x") with a literal
 *       dynamic:   ["x" | "<computed>"] every import(), the literal or "<computed>"
 *       calls:     ["eval", "fetch", "Function", "require", "new Function", ...]
 *       members:   ["process.env", "globalThis.fetch", ...]
 *       problems:  [parse errors]  }
 */
import { Linter } from "eslint";

const CALLED = new Set(["eval", "fetch", "Function", "require"]);
const CONSTRUCTED = new Set(["Function", "WebSocket", "XMLHttpRequest", "Worker", "EventSource"]);
const GLOBALS = new Set(["globalThis", "global", "window", "self"]);

function scanRule(found) {
  const literal = (node) => (node?.type === "Literal" && typeof node.value === "string" ? node.value : null);
  return {
    meta: { schema: [] },
    create() {
      return {
        ImportDeclaration: (node) => found.imports.push(node.source.value),
        ExportAllDeclaration: (node) => found.imports.push(node.source.value),
        ExportNamedDeclaration: (node) => node.source && found.imports.push(node.source.value),
        ImportExpression: (node) => found.dynamic.push(literal(node.source) ?? "<computed>"),
        CallExpression(node) {
          const callee = node.callee;
          if (callee.type === "Identifier" && CALLED.has(callee.name)) {
            found.calls.push(callee.name);
            if (callee.name === "require") found.imports.push(literal(node.arguments[0]) ?? "<computed>");
          }
          // (0, eval)(s), globalThis.eval(s), process.binding(s)
          if (callee.type === "SequenceExpression") {
            const last = callee.expressions.at(-1);
            if (last?.type === "Identifier" && CALLED.has(last.name)) found.calls.push(last.name);
          }
        },
        NewExpression(node) {
          if (node.callee.type === "Identifier" && CONSTRUCTED.has(node.callee.name)) found.calls.push(`new ${node.callee.name}`);
        },
        MemberExpression(node) {
          const object = node.object.type === "Identifier" ? node.object.name : null;
          const property = node.computed ? literal(node.property) : node.property.type === "Identifier" ? node.property.name : null;
          if (object === "process" && property === "env") found.members.push("process.env");
          if (object && GLOBALS.has(object) && property && (CALLED.has(property) || CONSTRUCTED.has(property))) {
            found.members.push(`${object}.${property}`);
          }
        },
        VariableDeclarator(node) {
          // const { env } = process
          if (node.init?.type === "Identifier" && node.init.name === "process" && node.id.type === "ObjectPattern") {
            for (const p of node.id.properties) {
              if (p.type === "Property" && (p.key.name === "env" || p.key.value === "env")) found.members.push("process.env");
            }
          }
        },
      };
    },
  };
}

/** @param {string} code a module (a leading `#!` line is allowed) */
export function capabilitiesOf(code) {
  const found = { imports: [], dynamic: [], calls: [], members: [], problems: [] };
  const linter = new Linter();
  const messages = linter.verify(code, [
    {
      files: ["**/*.js"],
      languageOptions: { ecmaVersion: "latest", sourceType: "module" },
      plugins: { probe: { rules: { scan: scanRule(found) } } },
      rules: { "probe/scan": "error" },
    },
  ], { filename: "bundle.js" });
  found.problems = messages.map((m) => `${m.line}:${m.column} ${m.message}`);
  return found;
}
