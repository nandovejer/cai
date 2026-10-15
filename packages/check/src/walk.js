/**
 * LUZ check: which files are read, and how (f5-ai-ready.md 5.3 "Paths", 8
 * "Paths", "Symlinks", "Size limits"; the review answers of security-auditor).
 *
 *   collect(inputs, { cwd, ext = [], ignore = [], limits = LIMITS })
 *     -> { files: [{ path, kind, text }], skipped: [{ file, reason }],
 *          missing: [input], ignored: number }
 *   matchGlob(pattern, path) -> boolean      `*`, `**` and `?`, no backtracking blow-up
 *   readLimited(absolute, max) -> { text, bytes } | { reason }   one regular file, never a link
 *   LIMITS, SKIP_REASONS
 *
 * An input is a file, a directory (walked: .html .htm .css and the --ext
 * extensions) or a glob. Paths are relative to `cwd`, written with "/",
 * sorted, each file once; `kind` is "html", "css" or "template" (a file of
 * --ext, read as HTML-like text).
 *
 * What it does not do, on purpose: it never follows a symbolic link (a link
 * is listed as skipped, named on the command line or found in a walk), reads
 * only what lstat and the open descriptor say is a regular file and opens it
 * without blocking, stops at 1 MiB a file, 128 MiB in all, 5 000 entries
 * visited and 64 levels, and does not enter `.git` or `node_modules` below a
 * folder it was given. A path it did not read is listed under `skipped` with
 * one reason of SKIP_REASONS, never dropped: a file that was not read is not
 * a file that is fine.
 *
 * One known looseness: a folder with more entries than the cap is cut after
 * the first `entries` names the disk gives, then sorted, so which of its
 * files are read past the cap can depend on the disk. Under the cap the
 * order is the sorted one, always.
 */
import { closeSync, constants, fstatSync, lstatSync, openSync, opendirSync, readSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const MIB = 1024 * 1024;
export const LIMITS = Object.freeze({ fileBytes: MIB, totalBytes: 128 * MIB, entries: 5000, depth: 64 });
export const SKIP_REASONS = Object.freeze(["symlink", "not-a-file", "too-large", "unreadable", "read-limit", "too-many-files", "too-deep"]);

const DEFAULT_EXT = [
  [".html", "html"],
  [".htm", "html"],
  [".css", "css"],
];
const NEVER_ENTERED = new Set([".git", "node_modules"]);
const CHUNK = 64 * 1024;

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/* ---- Globs ------------------------------------------------------------------------ */

/** `*` and `?` inside one segment: two pointers and one backtrack point. */
function matchSegment(pattern, text) {
  if (!pattern.includes("*") && !pattern.includes("?")) return pattern === text;
  let p = 0;
  let t = 0;
  let star = -1;
  let mark = 0;
  while (t < text.length) {
    if (p < pattern.length && pattern[p] === "*") {
      star = p++;
      mark = t;
    } else if (p < pattern.length && (pattern[p] === "?" || pattern[p] === text[t])) {
      p++;
      t++;
    } else if (star !== -1) {
      p = star + 1;
      t = ++mark;
    } else return false;
  }
  while (p < pattern.length && pattern[p] === "*") p++;
  return p === pattern.length;
}

const segmentsOf = (text) => text.split("/").filter((segment, i, all) => segment !== "" || i === all.length - 1);

/** A pattern as segments, each `**` segment as `null`. */
const compile = (pattern) => segmentsOf(pattern).map((segment) => (segment === "**" ? null : segment));

/** Pattern segments against path segments, as a table over (pattern, path): no recursion on the stars. */
function matchSegments(pattern, parts) {
  const cols = parts.length;
  let next = new Array(cols + 1).fill(false);
  next[cols] = true;
  for (let i = pattern.length - 1; i >= 0; i--) {
    const row = new Array(cols + 1).fill(false);
    if (pattern[i] === null) {
      row[cols] = next[cols];
      for (let j = cols - 1; j >= 0; j--) row[j] = next[j] || row[j + 1];
    } else {
      for (let j = cols - 1; j >= 0; j--) row[j] = next[j + 1] && matchSegment(pattern[i], parts[j]);
    }
    next = row;
  }
  return next[0];
}

/** Does `pattern` (`*` within a segment, `**` across segments, `?` one character) match `path`? */
export function matchGlob(pattern, path) {
  return matchSegments(compile(String(pattern)), segmentsOf(String(path)));
}

const hasWildcard = (text) => text.includes("*") || text.includes("?");

/* ---- The disk ----------------------------------------------------------------------- */

/**
 * Read a regular file through its descriptor, at most `max` bytes, without
 * following a link or waiting on a pipe. -> { text, bytes } | { reason }
 */
export function readLimited(absolute, max) {
  let fd = null;
  try {
    fd = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    if (!fstatSync(fd).isFile()) return { reason: "not-a-file" };
    const scratch = Buffer.allocUnsafe(CHUNK);
    const chunks = [];
    let length = 0;
    while (length <= max) {
      const read = readSync(fd, scratch, 0, CHUNK, null);
      if (read === 0) break;
      chunks.push(Buffer.from(scratch.subarray(0, read)));
      length += read;
    }
    if (length > max) return { reason: "too-large" };
    return { text: Buffer.concat(chunks, length).toString("utf-8"), bytes: length };
  } catch (error) {
    return { reason: error && error.code === "ELOOP" ? "symlink" : "unreadable" };
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // the descriptor is gone either way
      }
    }
  }
}

/**
 * @param {string[]} inputs files, directories and globs, as typed
 * @param {{ cwd: string, ext?: string[], ignore?: string[], limits?: typeof LIMITS }} options
 */
export function collect(inputs, { cwd, ext = [], ignore = [], limits = LIMITS } = {}) {
  const base = resolve(cwd);
  const kinds = new Map(DEFAULT_EXT);
  for (const extension of ext) kinds.set(String(extension).toLowerCase(), "template");
  const kindOf = (path) => {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const dot = name.lastIndexOf(".");
    return dot <= 0 ? null : (kinds.get(name.slice(dot).toLowerCase()) ?? null);
  };

  const patterns = ignore.map(compile);
  // `dir/**` leaves the whole folder out without walking it
  const folders = ignore.filter((pattern) => pattern.endsWith("/**")).map((pattern) => compile(pattern.slice(0, -3)));
  const isIgnored = (path) => {
    const parts = segmentsOf(path);
    return patterns.some((pattern) => matchSegments(pattern, parts));
  };
  const isPruned = (path) => {
    const parts = segmentsOf(path);
    return folders.some((pattern) => matchSegments(pattern, parts)) || patterns.some((pattern) => matchSegments(pattern, parts));
  };

  const found = new Map();
  const skipped = new Map();
  const missing = [];
  let ignored = 0;
  let visited = 0;
  let total = 0;
  let stopped = false;

  const rel = (absolute) => {
    const path = relative(base, absolute);
    return (sep === "/" ? path : path.split(sep).join("/")) || ".";
  };
  const skip = (path, reason) => {
    if (!skipped.has(path)) skipped.set(path, reason);
  };

  function take(absolute, path, kind) {
    if (found.has(path) || skipped.has(path)) return;
    const result = readLimited(absolute, limits.fileBytes);
    if (result.reason) return skip(path, result.reason);
    if (total + result.bytes > limits.totalBytes) return skip(path, "read-limit");
    total += result.bytes;
    found.set(path, { path, kind, text: result.text });
  }

  /**
   * One path of a walk, or a file named on the command line. `match`, for a
   * glob, says whether a file or link is one the glob asked for; `maxParts`
   * stops a glob without `**` from descending where it cannot match.
   */
  function visit(absolute, depth, match, maxParts) {
    const path = rel(absolute);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch {
      return skip(path, "unreadable");
    }
    if (stat.isSymbolicLink()) {
      if (match && !match(path)) return;
      if (isIgnored(path)) ignored++;
      else skip(path, "symlink");
      return;
    }
    if (stat.isDirectory()) {
      if (isPruned(path)) {
        ignored++;
        return;
      }
      if (depth > limits.depth) return skip(path, "too-deep");
      if (maxParts !== null && segmentsOf(path).length >= maxParts) return;
      walk(absolute, depth, match, maxParts);
      return;
    }
    const kind = kindOf(path);
    if (kind === null || (match && !match(path))) return;
    if (isIgnored(path)) {
      ignored++;
      return;
    }
    if (!stat.isFile()) return skip(path, "not-a-file");
    take(absolute, path, kind);
  }

  function walk(directory, depth, match, maxParts) {
    let handle;
    try {
      handle = opendirSync(directory);
    } catch {
      return skip(rel(directory), "unreadable");
    }
    const room = limits.entries - visited;
    const names = [];
    let more = false;
    try {
      for (let entry = handle.readSync(); entry !== null; entry = handle.readSync()) {
        if (names.length >= room) {
          more = true;
          break;
        }
        names.push(entry.name);
      }
    } catch {
      skip(rel(directory), "unreadable");
    } finally {
      try {
        handle.closeSync();
      } catch {
        // already closed
      }
    }
    visited += names.length;
    for (const name of names.sort(byText)) {
      if (stopped) return;
      if (NEVER_ENTERED.has(name)) continue;
      visit(resolve(directory, name), depth + 1, match, maxParts);
    }
    if (more && !stopped) {
      stopped = true;
      skip(rel(directory), "too-many-files");
    }
  }

  for (const raw of inputs) {
    if (stopped) break;
    const input = String(raw);
    if (hasWildcard(input)) {
      // Walk the folder before the first wildcard and keep what the glob matches
      const segments = input.split("/");
      const first = segments.findIndex(hasWildcard);
      const prefix = segments.slice(0, first).join("/");
      const start = resolve(base, prefix === "" && input.startsWith("/") ? "/" : prefix);
      const startPath = rel(start);
      const pattern = compile([...(startPath === "." ? [] : [startPath]), ...segments.slice(first)].join("/"));
      let hits = 0;
      const match = (path) => {
        const matches = matchSegments(pattern, segmentsOf(path));
        if (matches) hits++;
        return matches;
      };
      let isFolder = false;
      try {
        isFolder = lstatSync(start).isDirectory();
      } catch {
        // no such folder: nothing matched
      }
      if (isFolder) walk(start, 0, match, pattern.includes(null) ? null : pattern.length);
      if (hits === 0) missing.push(input);
      continue;
    }

    const absolute = resolve(base, input);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch {
      missing.push(input);
      continue;
    }
    const path = rel(absolute);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      if (path !== "." && isPruned(path)) ignored++;
      else walk(absolute, 0, null, null);
    } else if (stat.isSymbolicLink() || kindOf(path) !== null) {
      visit(absolute, 0, null, null);
    } else missing.push(input);
  }

  return {
    files: [...found.values()].sort((a, b) => byText(a.path, b.path)),
    skipped: [...skipped].map(([file, reason]) => ({ file, reason })).sort((a, b) => byText(a.file, b.file)),
    missing,
    ignored,
  };
}
