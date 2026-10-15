/**
 * Loads a module of packages/check/src for a test, so a module that does not
 * exist yet fails the test that needs it with a sentence ("walk.js does not
 * exist") instead of failing the whole file at import time, and the tests of
 * the modules that do exist still run.
 *
 *   const walk = await checkModule("walk");
 *   const { collect, LIMITS } = walk;   // each read is an assertion
 *
 * Reading an export the module does not have fails with expect.fail, naming
 * the module and the export: the red is "the contract is not there".
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";

const SRC = fileURLToPath(new URL("../../packages/check/src/", import.meta.url));

/**
 * @param {string} name the file without `.js`: "walk", "report", "messages"
 * @returns {Promise<Record<string, any>>} a view of the module's exports
 */
export async function checkModule(name) {
  const file = `${SRC}${name}.js`;
  let loaded = null;
  let problem = null;
  if (!existsSync(file)) problem = `packages/check/src/${name}.js does not exist`;
  else {
    try {
      loaded = await import(/* @vite-ignore */ file);
    } catch (error) {
      problem = `packages/check/src/${name}.js does not load: ${error.message}`;
    }
  }
  return new Proxy(
    {},
    {
      get(_, key) {
        // `await view` asks for `then`; a symbol is the runtime looking, not a test
        if (key === "then" || typeof key === "symbol") return undefined;
        if (problem) return expect.fail(problem);
        if (!(key in loaded)) return expect.fail(`packages/check/src/${name}.js does not export ${String(key)}`);
        return loaded[key];
      },
      has(_, key) {
        return Boolean(loaded) && key in loaded;
      },
    },
  );
}

/**
 * The rules the spec names (f5-ai-ready.md 5.5 blocks, 5.6 warns, plus the
 * two the review added or the engine emits). Tests of the words, of the
 * fixtures and of the config read the same lists.
 */
export const BLOCKING_RULES = [
  "parse/error",
  "class/unknown",
  "element/unknown",
  "element/unknown-attribute",
  "load/tokens-missing",
  "load/package-missing",
  "load/layer-statement",
  "misuse/host-element",
  "misuse/modifier-alone",
  "theme/contrast",
  "theme/unreadable",
];

/**
 * Keys of a rule that block (a BLOCKING_RULES id) with a variant that only
 * warns: a template file is not HTML a browser would read, and a page that
 * loads a LUZ release newer than the snapshot may use a class the checker has
 * not met. The rule id in a finding stays the base id; the severity comes
 * from the key (messages.js).
 */
export const WARNING_VARIANTS = ["parse/error:template", "class/unknown:newer"];

export const WARNING_RULES = [
  "load/order",
  "load/no-stylesheet",
  "class/unknown-in-css",
  "class/reserved-prefix",
  "misuse/state-class",
  "misuse/part-orphan",
  "a11y/role-on-generic",
  "a11y/link-no-href",
  "attr/unknown-hook",
  "css/literal-colour",
  "css/literal-size",
  "css/knob-in-px",
  "css/important",
  "css/private-token",
  "css/unknown-token",
  "file/skipped",
  "theme/advisory",
];
