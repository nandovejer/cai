/**
 * F5 step 7, what the bundle of @luz-ds/check may do (.claude/plans/specs/
 * f5-ai-ready.md section 8 "Capabilities" and "Supply chain"; the review
 * answers of security-auditor, Q4 and the capabilities row).
 *
 * The tool reads the files of whoever runs it and its output enters a
 * model's context, so what it can do is a short list that is checked on the
 * file that ships, not on the sources: the bundle is built here into a
 * temporary folder by scripts/build-check.js (tests/helpers/check-build.js)
 * and read from its syntax tree (tests/helpers/js-capabilities.js), so a
 * word in a comment or a message is not a finding.
 *
 *   - the scanner itself: each capability is seen in a sample (a positive
 *     control, so a clean bundle cannot be a scanner that sees nothing)
 *   - the bundle imports node:fs, node:path and node:url, and nothing else
 *   - no child_process, net, http(s), dns, dgram, tls, vm, worker_threads,
 *     no fetch, eval, Function, computed import(), require, process.env
 *   - the size: the row "check CLI" of budgets.json, gzipped, is measured
 */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { builtOnce, removeBuilds, root } from "./helpers/check-build.js";
import { capabilitiesOf } from "./helpers/js-capabilities.js";

const ALLOWED = ["node:fs", "node:path", "node:url"];
const FORBIDDEN_BUILTINS = ["child_process", "net", "dgram", "dns", "tls", "http", "https", "http2", "vm", "worker_threads", "cluster", "module", "os", "crypto", "zlib", "readline", "stream", "fs/promises"];

afterAll(removeBuilds);

/* ---- The scanner ---------------------------------------------------------------- */

describe("the capability scanner (a positive control for the bundle's tests)", () => {
  it("reads static imports, re-exports and require() with their specifiers", () => {
    const found = capabilitiesOf('#!/usr/bin/env node\nimport a from "node:fs";\nexport { b } from "node:net";\nexport * from "./c.js";\nconst d = require("node:vm");\nexport { a, d };\n');
    expect(found.problems).toEqual([]);
    expect(found.imports.sort()).toEqual(["./c.js", "node:fs", "node:net", "node:vm"]);
    expect(found.calls).toContain("require");
  });

  it("reads dynamic imports, the literal ones and the computed ones", () => {
    const found = capabilitiesOf('const n = "x";\nawait import("node:path");\nawait import(n);\nawait import(`./${n}.js`);\n');
    expect(found.dynamic).toEqual(["node:path", "<computed>", "<computed>"]);
  });

  it("reads eval, Function, fetch, sockets and process.env in every spelling it is written", () => {
    const found = capabilitiesOf(
      [
        'eval("1");',
        '(0, eval)("1");',
        'new Function("return 1");',
        'Function("return 1");',
        'fetch("x");',
        'globalThis.fetch("x");',
        'new WebSocket("x");',
        "const a = process.env.HOME;",
        'const b = process["env"];',
        "const { env } = process;",
        "export { a, b, env };",
      ].join("\n"),
    );
    expect(found.problems).toEqual([]);
    expect(found.calls).toEqual(expect.arrayContaining(["eval", "new Function", "Function", "fetch", "new WebSocket"]));
    expect(found.members).toEqual(expect.arrayContaining(["globalThis.fetch", "process.env"]));
    expect(found.members.filter((m) => m === "process.env")).toHaveLength(3);
  });

  it("does not take a comment or a string for a capability", () => {
    const text = '// fetch("x") and process.env\n/* eval("1"); import x from "node:net" */\nexport const s = "child_process fetch( eval( process.env";\n';
    expect(capabilitiesOf(text)).toMatchObject({ imports: [], dynamic: [], calls: [], members: [], problems: [] });
  });
});

/* ---- The bundle ----------------------------------------------------------------- */

describe("dist/luz-check.js: what the bundle can do", () => {
  let built;
  let found;
  beforeAll(async () => {
    built = await builtOnce();
    found = built.error ? null : capabilitiesOf(built.code);
  });

  it("is built by scripts/build-check.js, and parses as a module", () => {
    expect(built.error, "buildCheck({ outdir }) builds the bundle").toBeNull();
    expect(found.problems).toEqual([]);
  });

  it("imports only node:fs, node:path and node:url, and each by a literal", () => {
    expect(built.error).toBeNull();
    expect([...new Set(found.imports)].filter((specifier) => !ALLOWED.includes(specifier)), "imports outside node:fs, node:path, node:url").toEqual([]);
  });

  it("is self-contained: no relative or bare import is left (its own modules and the tokens engine are inlined)", () => {
    expect(built.error).toBeNull();
    expect(found.imports.filter((specifier) => !specifier.startsWith("node:"))).toEqual([]);
    expect(found.dynamic).toEqual([]);
  });

  it("has no import of a built-in that can reach a network, a process, a thread or the machine", () => {
    expect(built.error).toBeNull();
    const names = found.imports.map((s) => s.replace(/^node:/, ""));
    expect(names.filter((name) => FORBIDDEN_BUILTINS.includes(name))).toEqual([]);
  });

  it("has no import() of a computed path, and no require", () => {
    expect(built.error).toBeNull();
    expect(found.dynamic.filter((specifier) => specifier === "<computed>")).toEqual([]);
    expect(found.calls.filter((call) => call === "require")).toEqual([]);
  });

  it("calls no fetch, no eval, no Function and constructs no socket, worker or request", () => {
    expect(built.error).toBeNull();
    expect(found.calls).toEqual([]);
    expect(found.members.filter((member) => member !== "process.env")).toEqual([]);
  });

  it("never reads process.env: what it needs comes in through run(argv, env)", () => {
    expect(built.error).toBeNull();
    expect(found.members.filter((member) => member === "process.env")).toEqual([]);
  });

  it("names no network scheme to open: no http:// or https:// request target is built", () => {
    expect(built.error).toBeNull();
    expect(built.code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/\b(?:XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/);
  });
});

/* ---- The size --------------------------------------------------------------------- */

describe("the size of the bundle: the row `check CLI` of budgets.json", () => {
  const { budgets } = JSON.parse(readFileSync(`${root}budgets.json`, "utf-8"));
  const row = budgets.find((b) => b.file === "packages/check/dist/luz-check.js");

  it("is a gzip row of 16 kB ideal and 24 kB ceiling, which the tests measure and never raise (RL-17)", () => {
    expect(row, "a row for packages/check/dist/luz-check.js").toBeDefined();
    expect(row.max).toBe(24 * 1024);
    expect(row.ideal).toBe(16 * 1024);
  });

  it("fits it: the freshly built bundle gzipped is under the ceiling", async () => {
    const built = await builtOnce();
    expect(built.error, "buildCheck({ outdir }) builds the bundle").toBeNull();
    const bytes = gzipSync(built.code).length;
    expect(bytes, `${bytes} B gzipped`).toBeLessThanOrEqual(row.max);
    expect(bytes, "a bundle that is not empty").toBeGreaterThan(0);
  });
});
