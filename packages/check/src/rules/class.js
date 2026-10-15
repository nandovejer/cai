/**
 * LUZ check: the rules of class names (f5-ai-ready.md 5.5 and 5.6).
 *
 *   class/unknown        in HTML a class token starting `luz-` is in no
 *                        manifest; or one starting `o-` or `u-` is within two
 *                        edits of a class LUZ has, extends none, and no
 *                        scanned stylesheet defines it (those prefixes are
 *                        also a convention of the project's own)
 *   class/unknown-in-css a stylesheet writes an unknown `.luz-*` class in a
 *                        selector
 *   class/reserved-prefix a stylesheet defines a class of LUZ's prefix
 *
 * What a template or a framework computes is never read as a mistake: a token
 * that holds `{ } $ : @ [` is skipped, and in a file of --ext a value that
 * holds `{ } $ < % @ (` is skipped whole. Only the `class` attribute is read
 * (and `className` in a template file), split on ASCII whitespace as HTML
 * does. A name that is not safe to print gets no suggestion.
 */
import { finding } from "../report.js";
import { closest } from "../suggest.js";
import { classAttribute, classTokens, isEcho, packageOfName } from "./shared.js";

const LINK = /@luz-ds\/(tokens|core|site|landing|cms|app)@(\d{1,9})\.(\d{1,9})\.(\d{1,9})/g;
const SEMVER = /^(\d{1,9})\.(\d{1,9})\.(\d{1,9})/;

const nameOf = new WeakMap(); // world -> Map name -> result of a measure

/**
 * Is a page linking a LUZ release newer than the one a package's facts are
 * from (only when they are the bundled ones)? -> { package, linked, known } | null
 */
export function newerRelease(records, world) {
  for (const record of records) {
    const url = record.name === "link" ? record.attrs.get("href") : record.name === "script" ? record.attrs.get("src") : undefined;
    if (url === undefined || !url.value.includes("@luz-ds/")) continue;
    for (const match of url.value.matchAll(LINK)) {
      const has = world.versions.get(match[1]);
      if (has === undefined || has.source !== "bundled") continue;
      const known = SEMVER.exec(has.version);
      if (known === null) continue;
      const linked = [Number(match[2]), Number(match[3]), Number(match[4])];
      const older = [Number(known[1]), Number(known[2]), Number(known[3])];
      for (let i = 0; i < 3; i++) {
        if (linked[i] === older[i]) continue;
        if (linked[i] > older[i]) return { package: match[1], linked: linked.join("."), known: older.join(".") };
        break;
      }
    }
  }
  return null;
}

/**
 * What is wrong with a class name: null (nothing), or { closest } where
 * `closest` is the nearest class, null (none is near) or undefined (not
 * worked out yet: a luz- name gets its nearest class only while the
 * suggestions of the run last, see createBudget).
 */
function verdict(name, ctx) {
  const { world, defined } = ctx;
  if (name.startsWith("luz-")) return world.classes.has(name) ? null : { closest: undefined };
  const group = name.startsWith("o-") ? world.byPrefix.o : name.startsWith("u-") ? world.byPrefix.u : null;
  if (group === null || world.classes.has(name) || defined.has(name)) return null;
  // A name that only extends a class LUZ has (o-media-x) is the project's own
  for (const known of group) if (name.length > known.length && name.startsWith(known)) return null;
  const near = closest(name, group, 2);
  return near === null ? null : { closest: near };
}

function memoOf(world) {
  let memo = nameOf.get(world);
  if (memo === undefined) {
    memo = new Map();
    nameOf.set(world, memo);
  }
  return memo;
}

/** The class/unknown findings of one markup file. */
export function unknownClasses(ctx) {
  const { file, records, template, take, world } = ctx;
  const found = [];
  const memo = memoOf(world);
  let newer; // the newer release the page links, looked up at the first unknown class
  for (const record of records) {
    const attribute = classAttribute(record, template);
    if (attribute === undefined) continue;
    for (const token of classTokens(attribute.value, template)) {
      if (!token.startsWith("luz-") && !token.startsWith("o-") && !token.startsWith("u-")) continue;
      let entry = memo.get(token);
      if (entry === undefined) {
        entry = verdict(token, ctx);
        memo.set(token, entry);
      }
      if (entry === null) continue;
      let near = entry.closest;
      if (near === undefined) {
        near = null;
        if (isEcho(token) && take("class/unknown")) {
          near = closest(token, world.byPrefix.luz);
          entry.closest = near;
        }
      }
      const where = { file, line: attribute.line, column: attribute.column };
      const pkg = packageOfName(token);
      if (token.startsWith("luz-")) {
        if (newer === undefined) newer = newerRelease(records, world);
        if (newer !== null) {
          const details = { package: `@luz-ds/${newer.package}`, linked: newer.linked, known: newer.known };
          found.push(finding("class/unknown:newer", { ...where, vars: { name: token, known: newer.known, linked: newer.linked, package: pkg }, details }));
          continue;
        }
      }
      if (near === null) found.push(finding("class/unknown:none", { ...where, vars: { name: token, package: pkg } }));
      else found.push(finding("class/unknown", { ...where, vars: { name: token, closest: near }, suggestion: `.${near}` }));
    }
  }
  return found;
}

/** class/unknown-in-css and class/reserved-prefix for the classes of one stylesheet. */
export function stylesheetClasses(ctx) {
  const { file, css, world, take } = ctx;
  const found = [];
  const memo = memoOf(world);
  for (const entry of css.classes) {
    const { name } = entry;
    if (!name.startsWith("luz-") || world.classes.has(name)) continue;
    const where = { file, line: entry.line, column: entry.column };
    if (entry.defined) {
      found.push(finding("class/reserved-prefix", { ...where, vars: { name } }));
      continue;
    }
    let near = null;
    if (isEcho(name) && take("class/unknown-in-css")) {
      const key = `css:${name}`;
      if (memo.has(key)) near = memo.get(key);
      else {
        near = closest(name, world.byPrefix.luz);
        memo.set(key, near);
      }
    }
    if (near === null) found.push(finding("class/unknown-in-css:none", { ...where, vars: { name, package: packageOfName(name) } }));
    else found.push(finding("class/unknown-in-css", { ...where, vars: { name, closest: near }, suggestion: `.${near}` }));
  }
  return found;
}
