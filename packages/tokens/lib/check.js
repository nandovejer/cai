/**
 * LUZ — the contrast check as a function of parsed stylesheets, shared by the
 * command line (lib/cli.js) and the docs page's in-browser tool.
 * No file access and no DOM.
 */
import { createResolver, measure, pairsFor } from "./contrast.js";
import { targetsOf, valuesFor } from "./theme.js";

/**
 * @param {{ file: string, rules: object[] }[]} sources LUZ's tokens first
 *   (file "tokens"), then the consumer's files in load order
 * @param {{ strict?: boolean }} [options] strict: advisory pairs fail too
 */
export function analyze(sources, { strict = false } = {}) {
  const mine = sources.slice(1);
  const targets = targetsOf(mine.flatMap((s) => s.rules));
  const failures = [];
  const warnings = [];
  const unreadable = new Map();
  const ignored = new Map();
  let checked = 0;
  const overridesOf = (tokens, values, origin) =>
    [...new Set(tokens)].filter((t) => origin[t] && origin[t].file !== "tokens").map((t) => ({ token: t, value: values[t], file: origin[t].file, line: origin[t].line }));
  for (const target of targets) {
    const { values, origin, ignored: left } = valuesFor(target, sources);
    for (const item of left) ignored.set(`${item.file}:${item.line} ${item.selector}`, item);
    const { results, unreadable: bad } = measure(createResolver(values), pairsFor(target.name));
    for (const r of results) {
      checked++;
      if (r.ok) continue;
      (r.advisory && !strict ? warnings : failures).push({
        mode: target.name,
        foreground: r.foreground,
        background: r.background,
        ratio: Math.floor(r.ratio * 100) / 100,
        minimum: r.minimum,
        kind: r.kind,
        overrides: overridesOf(r.tokens, values, origin),
      });
    }
    for (const b of bad) {
      unreadable.set(b.reason, { mode: target.name, foreground: b.foreground, background: b.background, reason: b.reason, overrides: overridesOf(b.tokens, values, origin) });
    }
  }
  return {
    ok: failures.length === 0 && unreadable.size === 0,
    modes: targets.map((t) => t.name),
    checked,
    failures,
    warnings,
    unreadable: [...unreadable.values()],
    ignored: [...ignored.values()],
  };
}
