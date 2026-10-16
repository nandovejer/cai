/**
 * axe-core and @axe-core/* (MPL-2.0) are dev tools of tests/: accepted by name
 * in scripts/check-license.js because nothing of them ships. ESLint keeps it
 * so: an import of them from packages/ or apps/ (code that ships or is served)
 * is an error of the rule `no-restricted-imports`; the same import under
 * tests/ is allowed.
 *
 * packages/ and apps/ already refuse every import that is not relative (RL-1,
 * a generic `no-restricted-imports` pattern whose message does not name axe).
 * The rule asked for here is the dedicated one: an entry that names `axe-core`
 * and `@axe-core/*`, so the report says why (a dev tool, MPL-2.0, never shipped)
 * and survives a change to the generic pattern. ESLint adds the module name to every message, so "axe" alone proves
 * nothing: the dedicated message must also say why, with the words "MPL-2.0"
 * and "tests/".
 */
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();
const restricted = async (code, filePath) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-imports");
};

const IMPORTS = [
  'import axe from "axe-core";',
  'import AxeBuilder from "@axe-core/playwright";',
  'import { x } from "@axe-core/react";',
  'import axe from "axe-core/axe.min.js";',
  'import "axe-core";',
  'export { default } from "axe-core";',
];
const FILES = [
  "packages/core/src/axe-fixture.js",
  "packages/site/src/axe-fixture.js",
  "apps/docs/axe-fixture.js",
  "apps/landing/axe-fixture.js",
];

describe("no-restricted-imports keeps axe out of what ships", () => {
  for (const file of FILES) {
    it.each(IMPORTS)(`${file} cannot: %s`, async (code) => {
      const messages = await restricted(`${code}\n`, file);
      expect(messages, code).toHaveLength(1);
      expect(messages[0].message, "the message says why: MPL-2.0, dev tool of tests/").toMatch(/MPL-2\.0/);
      expect(messages[0].message).toContain("tests/");
    });
  }

  it.each(IMPORTS)("tests/ can: %s", async (code) => {
    expect(await restricted(`${code}\n`, "tests/axe-fixture.js")).toEqual([]);
  });

  it("a package may still import its own files", async () => {
    expect(await restricted('import { t } from "./i18n.js";\nimport u from "../utils.js";\n', "packages/core/src/axe-fixture.js")).toEqual([]);
  });
});
