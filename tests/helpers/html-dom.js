/**
 * A tiny element tree of a rendered page, for the unit tests of the docs
 * generator (tests/docs-shell.test.js). It reads our own, already strict,
 * markup with the tokenizer the generator and @luz-ds/check share: no
 * dependency, no jsdom. A node is { name, attrs (Map, entities decoded),
 * children, parent, open (the start tag token), close (the end tag token or
 * null), html (the whole document) }; `open.index` is where it starts in the
 * document, so document order is a comparison of two numbers.
 */
import { VOID, decodeEntities, tags } from "../../scripts/docs-site/html.js";

export function parse(html, file = "<page>") {
  const root = { name: "#root", attrs: new Map(), children: [], parent: null, open: { index: 0, end: 0 }, close: null, html };
  let current = root;
  for (const tag of tags(html, file)) {
    if (tag.type === "start") {
      const node = { name: tag.name, attrs: tag.attrs, children: [], parent: current, open: tag, close: null, html };
      current.children.push(node);
      if (!VOID.has(tag.name) && !tag.selfClosing) current = node;
    } else {
      let node = current;
      while (node !== root && node.name !== tag.name) node = node.parent;
      if (node !== root) {
        node.close = tag;
        current = node.parent;
      }
    }
  }
  return root;
}

/** Every descendant of a node, in document order. */
export function* descendants(node) {
  if (!node) return;
  for (const child of node.children) {
    yield child;
    yield* descendants(child);
  }
}

export const classesOf = (node) => (node.attrs.get("class") ?? "").split(/\s+/).filter(Boolean);
export const hasClass = (node, name) => classesOf(node).includes(name);

/** The descendants that match `test` (a function), in document order. */
export const findAll = (node, test) => [...descendants(node)].filter(test);
export const find = (node, test) => findAll(node, test)[0] ?? null;

/** `selector` is `tag`, `.class`, `tag.class` or `tag.class.class`. */
export function matcher(selector) {
  const [name, ...classes] = selector.split(".");
  return (node) => (!name || node.name === name) && classes.every((c) => hasClass(node, c));
}
export const query = (node, selector) => find(node, matcher(selector));
export const queryAll = (node, selector) => findAll(node, matcher(selector));

/** The text of a node: tags removed, entities decoded, white space collapsed. */
export function textOf(node) {
  if (!node?.close) return "";
  return decodeEntities(node.html.slice(node.open.end, node.close.index).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Is the node part of the page, and not of a demo on it? A demo is a [data-docs-specimen], or
 * something inert or aria-hidden (the pattern pages of @luz-ds/docs show a whole rail and a whole
 * pager as an example): the page's own rail, pager and foot are the ones outside them.
 */
export function isLive(node) {
  for (let up = node; up && up.name !== "#root"; up = up.parent) {
    if (up.attrs.has("data-docs-specimen") || up.attrs.has("inert") || up.attrs.get("aria-hidden") === "true") return false;
  }
  return true;
}
export const queryLive = (node, selector) => find(node, (n) => matcher(selector)(n) && isLive(n));
export const queryAllLive = (node, selector) => findAll(node, (n) => matcher(selector)(n) && isLive(n));

/** Is `node` inside `ancestor`? */
export function isInside(node, ancestor) {
  for (let up = node?.parent; up; up = up.parent) if (up === ancestor) return true;
  return false;
}

/** The element children of a node, as their names. */
export const childNames = (node) => node.children.map((c) => c.name);
