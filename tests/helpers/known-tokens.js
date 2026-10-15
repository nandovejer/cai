/**
 * Every `--luz-*` custom property LUZ declares, from the sources: the
 * primitives of packages/tokens/tokens.json (named as scripts/build-tokens.js
 * names them), the semantic tokens of semantic.css and the core settings of
 * _settings.css. A page that names a token the source does not declare names
 * something that does not exist.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => readFileSync(`${repo}${path}`, "utf-8");
const declared = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]);

/** The primitives, as `--luz-…` names: colour families, space, control, typography, radius, shadow. */
export function primitiveTokens() {
  const tokens = JSON.parse(read("packages/tokens/tokens.json"));
  const names = [];
  for (const [family, steps] of Object.entries(tokens.color)) for (const step of Object.keys(steps)) names.push(`--luz-${family}-${step}`);
  for (const key of Object.keys(tokens.spacing)) names.push(`--luz-space-${key}`);
  for (const key of Object.keys(tokens.control)) names.push(`--luz-control-${key}`);
  for (const key of Object.keys(tokens.typography)) names.push(`--luz-${key}`);
  for (const key of Object.keys(tokens.radius)) names.push(`--luz-radius-${key}`);
  for (const key of Object.keys(tokens.shadow)) names.push(`--luz-shadow-${key}`);
  return names;
}

/** Primitives, semantic tokens and core settings. */
export function knownTokens() {
  return new Set([
    ...primitiveTokens(),
    ...declared(read("packages/tokens/src/semantic.css")),
    ...declared(read("packages/core/src/settings/_settings.css")),
  ]);
}
