/**
 * F6 step 5, dictionary rules in `pnpm check:strings`
 * (.claude/plans/specs/f6-languages.md, section 7.2 row 5).
 *
 * scripts/check-strings.js reads the HTML under apps/. It must also read the
 * strings core's scripts write: the values of `en` in
 * packages/core/src/i18n.js and of every packages/core/src/i18n/<code>.json,
 * against the VAGUE[code] word list of the script (en, es, ar; the other codes
 * are not checked), as the whole value ("Aceptar" is vague, "Haz clic aquí
 * para copiar" is not). The keys of a language file are the keys of `en`.
 *
 * The script reads everything relative to its own location and has no API, so
 * it runs in a copy of the files it reads, with the dictionary changed:
 *
 *   - a problem line names the file (its repository path) and the key, and
 *     for a vague value the text; the exit status is 1 and the first line
 *     starts with ✗
 *   - `$header` of a language file is not a string of the dictionary
 *   - a code with no word list (fr) is not checked
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const EN_FILE = "packages/core/src/i18n.js";
const dictionary = (code) => `packages/core/src/i18n/${code}.json`;

let dir;
const at = (path) => join(dir, path);
const read = (path) => readFileSync(at(path), "utf-8");

/** Tracked files under `path` (git), so another session's untracked page is not in the copy; else every file. */
function files(path) {
  const run = spawnSync("git", ["ls-files", "-z", "--", path], { cwd: repo, encoding: "utf-8" });
  if (run.status === 0 && run.stdout) return run.stdout.split("\0").filter(Boolean);
  const out = [];
  const walk = (rel) => {
    for (const entry of readdirSync(join(repo, rel), { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else out.push(next);
    }
  };
  walk(path);
  return out;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "luz-check-strings-"));
  const sources = [...files("apps"), ...files("scripts"), ...files("packages/check/src"), ...files("packages/core/src/i18n"), ...files("packages/core/src/components"), "packages/core/src/objects/_objects.css", "packages/tokens/tokens.json", "packages/tokens/src/semantic.css", EN_FILE, "package.json"];
  for (const name of readdirSync(join(repo, "packages"))) sources.push(`packages/${name}/package.json`);
  for (const rel of new Set(sources)) {
    try {
      mkdirSync(dirname(at(rel)), { recursive: true });
      cpSync(join(repo, rel), at(rel));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  symlinkSync(join(repo, "node_modules"), at("node_modules"));
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Run the script in the copy. */
function run() {
  const result = spawnSync(process.execPath, [at("scripts/check-strings.js")], { cwd: dir, encoding: "utf-8", timeout: 60_000 });
  const output = `${result.stdout}${result.stderr}`;
  return { status: result.status, output, lines: output.split("\n") };
}

/** Run with files changed by `edits` ({ path: text | (text) => text | null to delete }); restored after. */
function runWith(edits) {
  const before = new Map();
  for (const [path, edit] of Object.entries(edits)) {
    let original = null;
    try {
      original = read(path);
    } catch {
      // a new file
    }
    before.set(path, original);
    if (edit === null) rmSync(at(path), { force: true });
    else {
      mkdirSync(dirname(at(path)), { recursive: true });
      writeFileSync(at(path), typeof edit === "function" ? edit(original) : edit);
    }
  }
  try {
    return run();
  } finally {
    for (const [path, original] of before) {
      if (original === null) rmSync(at(path), { force: true });
      else writeFileSync(at(path), original);
    }
  }
}

/** The text of es.json with the values of `patch` set (a key set to undefined is removed). */
const esWith = (patch) => (text) => {
  const next = { ...JSON.parse(text), ...patch };
  for (const key of Object.keys(patch)) if (patch[key] === undefined) delete next[key];
  return `${JSON.stringify(next, null, 2)}\n`;
};

/** The problem lines that name `file`. */
const about = (result, file) => result.lines.filter((line) => line.includes(file));

describe("check:strings reads the dictionaries of core", () => {
  it("passes on the repository's own dictionaries", () => {
    const result = run();
    expect(about(result, "packages/core/src/i18n"), result.output).toEqual([]);
    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain("✓");
  });

  describe("a vague value of a language file is a problem that names the file, the key and the text", () => {
    it.each([
      ["Aceptar", "copy"],
      ["Haz clic aquí", "copied"],
      ["ACEPTAR", "play"],
      ["  Más información ", "next"],
    ])('es: "%s" as the value of %s', (value, key) => {
      const result = runWith({ [dictionary("es")]: esWith({ [key]: value }) });
      expect(result.status, result.output).toBe(1);
      expect(result.output).toContain("✗");
      const lines = about(result, dictionary("es"));
      expect(lines.length, result.output).toBeGreaterThan(0);
      expect(lines.some((line) => line.includes(key) && line.includes(value.trim())), lines.join("\n")).toBe(true);
    });

    it("ar: a vague Arabic value is a problem too (the same words as the HTML check)", () => {
      const isolate = (value) => value.replace(/\{(column|mode|lang)\}/g, "⁨{$1}⁩");
      // a new ar.json: the strings of es.json (the script does not read meaning), isolated as RTL asks
      const arabic = () =>
        Object.fromEntries(Object.entries(JSON.parse(read(dictionary("es")))).filter(([k]) => k !== "$header").map(([k, v]) => [k, isolate(v)]));
      const clean = runWith({ [dictionary("ar")]: () => `${JSON.stringify(arabic())}\n` });
      expect(about(clean, dictionary("ar")), clean.output).toEqual([]);

      const result = runWith({ [dictionary("ar")]: () => `${JSON.stringify({ ...arabic(), copy: "موافق" })}\n` });
      expect(result.status, result.output).toBe(1);
      const lines = about(result, dictionary("ar"));
      expect(lines.some((line) => line.includes("copy") && line.includes("موافق")), result.output).toBe(true);
    });

    it("a language with no word list (fr) is not checked", () => {
      const result = runWith({ [dictionary("fr")]: () => `${JSON.stringify({ ...JSON.parse(read(dictionary("es"))), copy: "OK" })}\n` });
      expect(about(result, dictionary("fr")), result.output).toEqual([]);
      expect(result.status, result.output).toBe(0);
    });

    it("only the whole value is vague: a sentence that has the words is not", () => {
      const result = runWith({ [dictionary("es")]: esWith({ copyFailed: "Haz clic aquí para copiar a mano", loading: "Más información en un momento" }) });
      expect(about(result, dictionary("es")), result.output).toEqual([]);
      expect(result.status, result.output).toBe(0);
    });
  });

  describe("a vague value of English, in i18n.js, is a problem that names the file, the key and the text", () => {
    it.each([
      ["Click here", "copy"],
      ["Learn more", "next"],
      ["OK", "play"],
    ])('en: "%s" as the value of %s', (value, key) => {
      const edit = (text) => text.replace(new RegExp(`(\\n\\s+${key}:\\s*)"[^"\\n]*"`), `$1${JSON.stringify(value)}`);
      const result = runWith({ [EN_FILE]: edit });
      expect(result.status, result.output).toBe(1);
      const lines = about(result, EN_FILE);
      expect(lines.length, result.output).toBeGreaterThan(0);
      expect(lines.some((line) => line.includes(key) && line.includes(value)), lines.join("\n")).toBe(true);
    });
  });

  describe("a language file has the keys of English", () => {
    it("an extra key is a problem that names the file and the key", () => {
      const result = runWith({ [dictionary("es")]: esWith({ shareLink: "Compartir el enlace" }) });
      expect(result.status, result.output).toBe(1);
      expect(about(result, dictionary("es")).some((line) => line.includes("shareLink")), result.output).toBe(true);
    });

    it("a missing key is a problem that names the file and the key", () => {
      const result = runWith({ [dictionary("es")]: esWith({ copyFailed: undefined }) });
      expect(result.status, result.output).toBe(1);
      expect(about(result, dictionary("es")).some((line) => line.includes("copyFailed")), result.output).toBe(true);
    });
  });

  it("$header of a language file is not one of its strings: a header that names handles passes", () => {
    const header = { language: "Español", tag: "es", author: "nandovejer", reviewer: "a-reader" };
    const result = runWith({ [dictionary("es")]: esWith({ $header: header }) });
    expect(about(result, dictionary("es")), result.output).toEqual([]);
    expect(result.status, result.output).toBe(0);
  });
});
