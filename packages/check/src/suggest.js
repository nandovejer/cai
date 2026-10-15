/**
 * LUZ check: the nearest name (f5-ai-ready.md 5.5 "Suggestion").
 *
 *   distance(a, b)            Damerau-Levenshtein, the "optimal string
 *                             alignment" kind: an insertion, a deletion, a
 *                             replacement and the swap of two neighbours
 *                             each count one.
 *   closest(name, candidates) the nearest candidate or null. A candidate is
 *                             near when its distance is at most
 *                             min(max(2, ceil(len / 4)), floor(0.4 * len)),
 *                             `len` being the length of the name; the nearest
 *                             wins and a tie goes to the first in code-unit
 *                             order. A name over MAX_NAME characters is never
 *                             measured (null, even against itself), so the
 *                             cost is bounded by what a file can hold.
 *
 * `candidates` is any iterable of strings. Nothing here reads a file.
 */

export const MAX_NAME = 64;

// Three rows reused for every measure of a name of the supported length
const ROWS = [new Int32Array(MAX_NAME + 1), new Int32Array(MAX_NAME + 1), new Int32Array(MAX_NAME + 1)];

/**
 * The distance of two strings when it is at most `limit`, else limit + 1.
 * Rows stop as soon as every cell of one is over the limit.
 */
function bounded(a, b, limit) {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > limit) return limit + 1;
  const rows = m <= MAX_NAME ? ROWS : [new Int32Array(m + 1), new Int32Array(m + 1), new Int32Array(m + 1)];
  let [previous, previous2, row] = rows;
  for (let j = 0; j <= m; j++) previous[j] = j;
  for (let i = 1; i <= n; i++) {
    row[0] = i;
    let least = row[0];
    for (let j = 1; j <= m; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let value = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        value = Math.min(value, previous2[j - 2] + 1);
      }
      row[j] = value;
      if (value < least) least = value;
    }
    if (least > limit) return limit + 1;
    const spare = previous2;
    previous2 = previous;
    previous = row;
    row = spare;
  }
  return Math.min(previous[m], limit + 1);
}

/** The edit distance of two strings (a swap of neighbours is one edit). */
export function distance(a, b) {
  const x = String(a);
  const y = String(b);
  return bounded(x, y, Math.max(x.length, y.length));
}

/** The farthest a candidate may be from a name of this length. */
export const limitOf = (length) => Math.min(Math.max(2, Math.ceil(length / 4)), Math.floor(0.4 * length));

/**
 * @param {string} name
 * @param {Iterable<string>} candidates
 * @param {number} [ceiling] a stricter limit than the rule above (the o- and u- names take 2)
 * @returns {string | null}
 */
export function closest(name, candidates, ceiling = Infinity) {
  const text = String(name);
  if (text.length === 0 || text.length > MAX_NAME) return null;
  let limit = Math.min(limitOf(text.length), ceiling);
  if (limit < 1) return null;
  let best = null;
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || Math.abs(candidate.length - text.length) > limit) continue;
    const found = bounded(text, candidate, limit);
    if (found > limit) continue;
    // A nearer candidate tightens the limit, so later ones are dropped sooner
    if (best === null || found < limit || candidate < best) {
      best = candidate;
      limit = found;
    }
  }
  return best;
}
