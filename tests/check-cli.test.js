/**
 * F5 step 8, the command line of @luz-ds/check, its modules and its fixtures
 * (.claude/plans/specs/f5-ai-ready.md 5.3 Command, 5.4, 5.9 Fixtures, 8
 * Security, and the review answers of security-auditor, accessibility-engineer
 * and ux-designer). The rules themselves are steps 9-11 and are not here:
 * every test below holds with no rule written, because the only findings the
 * shell can make are `parse/error` (the readers of html.js and css.js are
 * there) and `file/skipped`.
 *
 * The contract, module by module. Everything is synchronous and reads only
 * node:fs, node:path and node:url.
 *
 *   cli.js      run(argv, env) -> { code, stdout, stderr }, USAGE
 *               env = { version, cwd }: the version and the working
 *               directory come in through env, process.env is never read.
 *               run never throws: whatever goes wrong inside it is exit 2
 *               with one sanitised line on stderr, no stack trace.
 *   walk.js     collect(inputs, { cwd, ext = [], ignore = [], limits = LIMITS })
 *                 -> { files: [{ path, kind, text }], skipped: [{ file, reason }],
 *                      missing: [input], ignored: number }
 *               `path` is relative to cwd, with "/", sorted, each file once;
 *               `kind` is "html" | "css" | "template" (a file of --ext).
 *               matchGlob(pattern, path) -> boolean (`*`, `**`, `?`, linear).
 *               LIMITS = { fileBytes: 1 MiB, totalBytes: 128 MiB, entries: 5000,
 *               depth: 64 }; SKIP_REASONS.
 *   config.js   parseConfig(text, file = "luz-check.json")
 *                 -> { ignore: [], rules: {}, themes: [], strict: false }
 *               throws ConfigError; MAX_CONFIG_BYTES = 65536.
 *   sanitize.js echoName(value), displayPath(path), cleanText(value, max = 80),
 *               UNREADABLE = "<an unreadable name>".
 *   report.js   finding(key, { file, line, column, vars, suggestion, details })
 *               buildReport({ version, files, manifests, findings, skipped,
 *                             config, ignored, strict }) -> the --json object
 *               formatText(report), formatJson(report),
 *               MAX_FINDINGS_PER_FILE = 200, MAX_FINDINGS = 5000.
 *   messages.js see tests/check-messages.test.js.
 *
 * The --json object: tool, version, ok, files, manifests, summary { files,
 * blocking, warnings, skipped, ignored, off, truncated }, config { file, off },
 * findings, skipped. The spec's keys, plus `config`, `summary.ignored`,
 * `summary.off` and `summary.truncated` (security-auditor: the summary lists
 * the rules a config switched off and from which file; "truncated" past the
 * caps).
 *
 * Chosen here, because the spec leaves them open (reported to the caller):
 * a skipped path is also a `file/skipped` warning, so --strict fails on a
 * file the tool did not read; findings are sorted by file, line, column, rule;
 * a rule id in the config that does not exist is a config error.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { USAGE, run } from "../packages/check/src/cli.js";
import { readCss } from "../packages/check/src/css.js";
import { run as luzTokens } from "../packages/tokens/lib/cli.js";
import { scan } from "../packages/check/src/html.js";
import { BLOCKING_RULES, WARNING_RULES, checkModule } from "./helpers/check-modules.js";

const walk = await checkModule("walk");
const config = await checkModule("config");
const sanitize = await checkModule("sanitize");
const report = await checkModule("report");
const messages = await checkModule("messages");

const root = fileURLToPath(new URL("../", import.meta.url));
const FIXTURES = join(root, "tests/fixtures/check");
const CLI_URL = new URL("../packages/check/src/cli.js", import.meta.url).href;
const SITE_URL = "https://nandovejer.github.io/luz/";

// Characters that must never reach a terminal or a model: built from code points
const ESC = String.fromCharCode(0x1b);
const BIDI = String.fromCharCode(0x202e);
const ISOLATE = String.fromCharCode(0x2066);
const NEL = String.fromCharCode(0x85);
const LINE_SEP = String.fromCharCode(0x2028);
const BEL = String.fromCharCode(0x07);
const RAW_CONTROL = new RegExp(`[${ESC}${BIDI}${ISOLATE}${NEL}${LINE_SEP}${BEL}]`);
const STACK_TRACE = /\n\s+at \S|TypeError|ReferenceError|RangeError|node:internal/;
const MIB = 1024 * 1024;

const OK_HTML = '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>Fine</title>\n</head>\n<body>\n  <p>Fine.</p>\n</body>\n</html>\n';
const OK_CSS = ".promo {\n  margin: 0;\n}\n";
// Ends inside a start tag: parse/error at line 2, column 1
const BROKEN_HTML = '<p>fine</p>\n<p class="x"\n';
// Never closes its block: parse/error at line 1, column 3
const BROKEN_CSS = "a { margin: 0;\n";

/* ---- Helpers ---------------------------------------------------------------------- */

const folders = [];
/** A temporary working directory with these files; a Buffer or a string each. */
function tree(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "luz-check-cli-"));
  folders.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return dir;
}
afterAll(() => {
  for (const dir of folders) rmSync(dir, { recursive: true, force: true });
});

const VERSION = "9.9.9";
const luz = (argv, cwd, env = {}) => run(argv, { version: VERSION, cwd, ...env });
/** run() with --json: the result and its parsed report, failing with stderr when stdout is not JSON. */
function luzJson(argv, cwd, env = {}) {
  const result = luz([...argv, "--json"], cwd, env);
  expect(result.stdout, `a JSON report on stdout (stderr: ${result.stderr.slice(0, 200)})`).toMatch(/^\{/);
  return { ...result, data: JSON.parse(result.stdout) };
}
const lastLine = (text) => text.trimEnd().split("\n").pop();
const SUMMARY = /(\d+) blocking and (\d+) warnings? in (\d+) files?/;

/* ---- --help, --version and wrong usage ---------------------------------------------- */

describe("luz-check --help and --version", () => {
  it("prints the usage text and exits 0", () => {
    const result = luz(["--help"], tree());
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`${USAGE}\n`);
    expect(result.stderr).toBe("");
  });

  it("names every command line of the spec in the usage text (the Working with AI page quotes it)", () => {
    for (const piece of ["luz-check [paths", "--json", "--strict", "--config", "--theme", "--ext", "luz-check agent", "--version", "--help"]) {
      expect(USAGE, piece).toContain(piece);
    }
  });

  it("says the three exit codes", () => {
    expect(USAGE).toMatch(/\b0\b[^\n]*\b1\b[^\n]*\b2\b/);
  });

  it("says in one sentence that names, labels, alt text, headings and language are not checked", () => {
    const sentence = USAGE.split(/(?<=[.!?])\s+/).find((s) => /alt text/i.test(s));
    expect(sentence, "a sentence that names alt text").toBeDefined();
    for (const word of ["names", "labels", "headings", "language"]) expect(sentence.toLowerCase(), word).toContain(word);
    expect(sentence).toMatch(/\bnot\b|\bnever\b/i);
  });

  it("never claims a page is accessible or passes", () => {
    expect(USAGE).not.toMatch(/\b(?:is|are) accessible\b|\bpasses\b|\bconforms\b|\bcompliant\b/i);
  });

  it("prints its name and version for --version", () => {
    const result = luz(["--version"], tree());
    expect(result).toEqual({ code: 0, stdout: `@luz-ds/check ${VERSION}\n`, stderr: "" });
  });
});

describe("luz-check, wrong usage is exit 2", () => {
  it("exits 2 on an unknown option, with the usage on stderr and nothing on stdout", () => {
    const result = luz(["--fix"], tree({ "a.html": OK_HTML }));
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--fix");
  });

  it("never writes a control or bidi character from the argument to stderr", () => {
    const result = luz([`--${ESC}[31mred${BIDI}`], tree());
    expect(result.code).toBe(2);
    expect(result.stderr).not.toMatch(RAW_CONTROL);
  });

  it("exits 2 when an option that takes a value has none", () => {
    const dir = tree({ "a.html": OK_HTML });
    for (const option of ["--config", "--theme", "--ext"]) {
      const result = luz(["a.html", option], dir);
      expect(result.code, option).toBe(2);
      expect(result.stderr, option).toContain(option);
      expect(result.stderr, option).not.toMatch(/Unknown option/i);
    }
  });

  it("exits 2 for a path that matches nothing, names it on stderr and prints nothing on stdout", () => {
    const result = luz(["missing.html"], tree({ "a.html": OK_HTML }));
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("missing.html");
  });

  it("exits 2 for a glob that matches nothing, and names it", () => {
    const result = luz(["src/**/*.html"], tree({ "a.html": OK_HTML }));
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("src/**/*.html");
  });

  it("exits 2 when the folders hold no HTML or CSS at all", () => {
    for (const result of [luz(["."], tree({ "notes.txt": "hello", "app.js": "export {};" })), luz([], tree())]) {
      expect(result.code).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.stderr).toMatch(/\bno\b[^\n]*\b(?:file|HTML|CSS)/i);
    }
  });

  it("never throws, whatever it is given: an internal error is exit 2 with no stack trace", () => {
    for (const [argv, env] of [
      [null, { version: VERSION, cwd: tree() }],
      [["a.html"], undefined],
      [["a.html"], { version: VERSION }],
      [[42, {}, ["x"]], { version: VERSION, cwd: tree() }],
    ]) {
      let result;
      expect(() => {
        result = run(argv, env);
      }, JSON.stringify(argv)).not.toThrow();
      expect(result.code, JSON.stringify(argv)).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.stderr).not.toMatch(STACK_TRACE);
    }
  });
});

/* ---- Exit codes over files ------------------------------------------------------------ */

describe("luz-check, exit codes over files", () => {
  it("exits 0 and writes a summary that says nothing blocks, for a file with no finding", () => {
    const result = luz(["ok.html", "ok.css"], tree({ "ok.html": OK_HTML, "ok.css": OK_CSS }));
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    const summary = lastLine(result.stdout);
    expect(summary).toMatch(/^✓ /);
    expect(summary.match(SUMMARY).slice(1)).toEqual(["0", "0", "2"]);
  });

  it("exits 1 and reports parse/error at the line and column, for HTML that ends inside a tag", () => {
    const result = luz(["broken.html"], tree({ "broken.html": BROKEN_HTML }));
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^✗ broken\.html:2:1 parse\/error\s+\S/m);
    expect(lastLine(result.stdout)).toMatch(/^✗ 1 blocking and 0 warnings in 1 file/);
  });

  it("exits 1 and reports parse/error at the line and column, for CSS whose block never closes", () => {
    const result = luz(["broken.css"], tree({ "broken.css": BROKEN_CSS }));
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^✗ broken\.css:1:3 parse\/error\s+\S/m);
  });

  it("reports an unclosed comment as parse/error, never as a file that is fine", () => {
    const result = luz(["open.html"], tree({ "open.html": "<p>text</p>\n<!-- never closed\n<p>more</p>\n" }));
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^✗ open\.html:2:1 parse\/error/m);
  });

  it("reads on after a broken file: one broken file does not hide the next", () => {
    const dir = tree({ "a.html": BROKEN_HTML, "b.css": BROKEN_CSS, "c.html": OK_HTML });
    const { code, data } = luzJson(["."], dir);
    expect(code).toBe(1);
    expect(data.files).toEqual(["a.html", "b.css", "c.html"]);
    expect(data.findings.map((f) => [f.file, f.rule])).toEqual([
      ["a.html", "parse/error"],
      ["b.css", "parse/error"],
    ]);
  });

  it("never quotes the source in a parse/error message", () => {
    const dir = tree({ "broken.html": '<p>fine</p>\n<zz-secret-marker class="zz-secret-class"\n' });
    const { data } = luzJson(["broken.html"], dir);
    expect(data.findings).toHaveLength(1);
    expect(data.findings[0].message).not.toMatch(/zz-secret/);
  });

  it("reads the working directory when no path is given", () => {
    const dir = tree({ "ok.html": OK_HTML, "css/site.css": OK_CSS });
    const { code, data } = luzJson([], dir);
    expect(code).toBe(0);
    expect(data.files).toEqual(["css/site.css", "ok.html"]);
  });

  it("does not change the exit code for a warning, and --strict makes it 1", () => {
    const dir = tree({ "real.html": OK_HTML });
    symlinkSync("real.html", join(dir, "link.html"));
    expect(luz(["."], dir).code).toBe(0);
    expect(luz([".", "--strict"], dir).code).toBe(1);
    expect(luzJson([".", "--strict"], dir).data.ok).toBe(false);
    expect(luzJson(["."], dir).data.ok).toBe(true);
  });
});

/* ---- Text output ------------------------------------------------------------------------ */

describe("luz-check, the text output", () => {
  it("writes ✗ for a blocking finding, ! for a warning and a ✓ or ✗ summary last", () => {
    const dir = tree({ "broken.html": BROKEN_HTML, "real.html": OK_HTML });
    symlinkSync("real.html", join(dir, "link.html"));
    const lines = luz(["."], dir).stdout.trimEnd().split("\n");
    expect(lines.filter((l) => l.startsWith("✗ ") && /parse\/error/.test(l))).toHaveLength(1);
    expect(lines.filter((l) => l.startsWith("! ") && /file\/skipped/.test(l))).toHaveLength(1);
    expect(lines.at(-1)).toMatch(/^✗ 1 blocking and 1 warning in 2 files/);
  });

  it("names a warning's file and rule, with no position when the finding has none", () => {
    const dir = tree({ "real.html": OK_HTML });
    symlinkSync("real.html", join(dir, "link.html"));
    const result = luz(["."], dir);
    expect(result.stdout).toMatch(/^! link\.html file\/skipped\s+\S/m);
    expect(lastLine(result.stdout)).toMatch(/^✓ 0 blocking and 1 warning in 1 file/);
  });

  it("never says a page is accessible, passes or conforms, on a clean run or a broken one", () => {
    const dir = tree({ "ok.html": OK_HTML, "bad.html": BROKEN_HTML });
    for (const argv of [["ok.html"], ["."]]) {
      expect(luz(argv, dir).stdout, "something on stdout").not.toBe("");
      expect(luz(argv, dir).stdout).not.toMatch(/\b(?:is|are) accessible\b|\bpass(?:es|ed)?\b|\bconforms\b|\bcompliant\b/i);
    }
  });

  it("prints the same bytes on a second run", () => {
    const dir = tree({ "b.html": BROKEN_HTML, "a.css": BROKEN_CSS, "c.html": OK_HTML });
    const first = luz(["."], dir).stdout;
    expect(first).toMatch(/parse\/error/);
    expect(luz(["."], dir).stdout).toBe(first);
  });
});

/* ---- --json ---------------------------------------------------------------------------- */

describe("luz-check --json", () => {
  it("has every key of the spec, always, and the extra ones this step adds", () => {
    const { data } = luzJson(["ok.html"], tree({ "ok.html": OK_HTML }));
    expect(Object.keys(data).sort()).toEqual(["config", "files", "findings", "manifests", "ok", "skipped", "summary", "tool", "version"]);
    expect(data.tool).toBe("@luz-ds/check");
    expect(data.version).toBe(VERSION);
    expect(data.ok).toBe(true);
    expect(data.files).toEqual(["ok.html"]);
    expect(Array.isArray(data.manifests)).toBe(true);
    expect(data.findings).toEqual([]);
    expect(data.skipped).toEqual([]);
    expect(Object.keys(data.summary).sort()).toEqual(["blocking", "files", "ignored", "off", "skipped", "truncated", "warnings"]);
    expect(data.summary).toEqual({ files: 1, blocking: 0, warnings: 0, skipped: 0, ignored: 0, off: 0, truncated: false });
    expect(data.config).toEqual({ file: null, off: [] });
  });

  it("gives a finding every key, a position, a message from messages.js and a docs URL of the site", () => {
    const { code, data } = luzJson(["broken.html"], tree({ "broken.html": BROKEN_HTML }));
    expect(code).toBe(1);
    expect(data.ok).toBe(false);
    expect(data.summary).toMatchObject({ files: 1, blocking: 1, warnings: 0 });
    const [found] = data.findings;
    expect(Object.keys(found).sort()).toEqual(["column", "docs", "file", "line", "message", "rule", "severity", "suggestion"]);
    expect(found).toMatchObject({ rule: "parse/error", severity: "block", file: "broken.html", line: 2, column: 1, suggestion: null });
    expect(found.docs.startsWith(`${SITE_URL}docs/`)).toBe(true);
    const text = messages.MESSAGES["parse/error"];
    expect(text.severity).toBe("block");
    expect(found.message.length).toBeLessThanOrEqual(120);
  });

  it("lists a skipped file under `skipped` and as a file/skipped warning, and counts it", () => {
    const dir = tree({ "real.html": OK_HTML });
    symlinkSync("real.html", join(dir, "link.html"));
    const { data } = luzJson(["."], dir);
    expect(data.skipped).toEqual([{ file: "link.html", reason: "symlink" }]);
    expect(data.summary).toMatchObject({ files: 1, blocking: 0, warnings: 1, skipped: 1 });
    expect(data.findings).toHaveLength(1);
    expect(data.findings[0]).toMatchObject({ rule: "file/skipped", severity: "warn", file: "link.html", line: null, column: null });
  });

  it("sorts the files and the findings, so two runs and two machines print the same", () => {
    const dir = tree({ "z.html": BROKEN_HTML, "a.css": BROKEN_CSS, "m/n.html": BROKEN_HTML, "b.html": OK_HTML });
    const first = luzJson(["."], dir);
    expect(first.data.files).toEqual(["a.css", "b.html", "m/n.html", "z.html"]);
    expect(first.data.findings.map((f) => f.file)).toEqual(["a.css", "m/n.html", "z.html"]);
    expect(luzJson(["."], dir).stdout).toBe(first.stdout);
  });

  it("reads a file once, however many inputs reach it", () => {
    const dir = tree({ "a.html": OK_HTML, "d/b.html": OK_HTML });
    const { data } = luzJson(["a.html", ".", "d", "d/b.html", "./a.html"], dir);
    expect(data.files).toEqual(["a.html", "d/b.html"]);
    expect(data.summary.files).toBe(2);
  });

  it("never says a page is accessible or passes", () => {
    const { stdout } = luzJson(["ok.html"], tree({ "ok.html": OK_HTML }));
    expect(stdout).not.toMatch(/\b(?:is|are) accessible\b|\bpass(?:es|ed)?\b|\bconforms\b|\bcompliant\b/i);
  });
});

/* ---- Paths, directories, globs, --ext ------------------------------------------------------ */

describe("luz-check, which files it reads", () => {
  it("reads .html, .htm and .css in a directory, recursively, and nothing else", () => {
    const dir = tree({ "a.html": OK_HTML, "b.htm": OK_HTML, "c.css": OK_CSS, "d.txt": BROKEN_HTML, "e.js": "<p", "sub/deep/f.html": OK_HTML, "sub/g.png": "x" });
    expect(luzJson(["."], dir).data.files).toEqual(["a.html", "b.htm", "c.css", "sub/deep/f.html"]);
  });

  it("reads --ext extensions as HTML-like text, and not without it", () => {
    const dir = tree({ "page.astro": BROKEN_HTML, "view.vue": OK_HTML, "ok.html": OK_HTML });
    expect(luzJson(["."], dir).data.files).toEqual(["ok.html"]);
    const { code, data } = luzJson([".", "--ext", ".astro,.vue"], dir);
    expect(data.files).toEqual(["ok.html", "page.astro", "view.vue"]);
    expect(code).toBe(1);
    expect(data.findings.map((f) => [f.file, f.rule])).toEqual([["page.astro", "parse/error"]]);
  });

  it("takes a glob as the user typed it, so a quoted glob works without the shell", () => {
    const dir = tree({ "a.html": OK_HTML, "src/b.html": OK_HTML, "src/deep/c.html": BROKEN_HTML, "src/d.css": OK_CSS, "x/e.html": OK_HTML });
    expect(luzJson(["src/*.html"], dir).data.files).toEqual(["src/b.html"]);
    expect(luzJson(["**/*.html"], dir).data.files).toEqual(["a.html", "src/b.html", "src/deep/c.html", "x/e.html"]);
    expect(luzJson(["src/**/*.html"], dir).data.files).toEqual(["src/b.html", "src/deep/c.html"]);
    expect(luzJson(["?.html", "src/?.css"], dir).data.files).toEqual(["a.html", "src/d.css"]);
  });

  it("skips .git and node_modules when it walks a directory", () => {
    const dir = tree({ "ok.html": OK_HTML, ".git/hook.html": BROKEN_HTML, "node_modules/pkg/index.html": BROKEN_HTML, "src/node_modules/x.html": BROKEN_HTML });
    const { code, data } = luzJson(["."], dir);
    expect(code).toBe(0);
    expect(data.files).toEqual(["ok.html"]);
  });

  it("prints paths relative to the working directory, with /, however they were written", () => {
    const dir = tree({ "a.html": OK_HTML, "sub/b.html": OK_HTML });
    expect(luzJson(["./a.html", `${dir}/sub/b.html`], dir).data.files).toEqual(["a.html", "sub/b.html"]);
    expect(luzJson(["../a.html"], join(dir, "sub")).data.files).toEqual(["../a.html"]);
  });
});

/* ---- Limits and symlinks ---------------------------------------------------------------------- */

describe("luz-check, symlinks and what is not a regular file", () => {
  it("does not follow a link to a file, a directory or itself, and lists each under skipped", () => {
    const outside = tree({ "secret/bad.html": BROKEN_HTML });
    const dir = tree({ "real.html": OK_HTML });
    symlinkSync("real.html", join(dir, "link.html"));
    symlinkSync(join(outside, "secret"), join(dir, "linkdir"));
    symlinkSync(".", join(dir, "loop"));
    const { code, data } = luzJson(["."], dir);
    expect(code).toBe(0);
    expect(data.files).toEqual(["real.html"]);
    expect(data.skipped.map((s) => [s.file, s.reason])).toEqual([
      ["link.html", "symlink"],
      ["linkdir", "symlink"],
      ["loop", "symlink"],
    ]);
  });

  it("does not read a link named on the command line either", () => {
    const dir = tree({ "real.html": OK_HTML, "ok.html": OK_HTML });
    symlinkSync("real.html", join(dir, "link.html"));
    const { data } = luzJson(["ok.html", "link.html"], dir);
    expect(data.files).toEqual(["ok.html"]);
    expect(data.skipped).toEqual([{ file: "link.html", reason: "symlink" }]);
  });

  it("skips a FIFO named like a page, without opening it (isFile only)", (context) => {
    const dir = tree({ "ok.html": OK_HTML });
    try {
      execFileSync("mkfifo", [join(dir, "pipe.html")]);
    } catch {
      context.skip();
    }
    // A blocking open() would hang this thread for ever, so it runs in a child with a timeout
    const code = `import { run } from ${JSON.stringify(CLI_URL)}; process.stdout.write(JSON.stringify(run(["."], { version: "1", cwd: process.argv[1] })));`;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", code, "--", dir], { encoding: "utf-8", timeout: 20000 });
    expect(child.error, "the run finished: a FIFO was opened and blocked").toBeUndefined();
    const result = JSON.parse(child.stdout);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/pipe\.html file\/skipped/);
  });
});

describe("luz-check, size limits", () => {
  it("reads a file of exactly 1 MiB and skips one byte more, as too-large, with a warning and exit 0", () => {
    const pad = (bytes) => Buffer.from(OK_HTML + " ".repeat(bytes - OK_HTML.length));
    const dir = tree({ "exact.html": pad(MIB), "over.html": pad(MIB + 1), "ok.html": OK_HTML });
    const { code, data } = luzJson(["."], dir);
    expect(code).toBe(0);
    expect(data.files).toEqual(["exact.html", "ok.html"]);
    expect(data.skipped).toEqual([{ file: "over.html", reason: "too-large" }]);
    expect(data.findings.map((f) => [f.file, f.rule, f.severity])).toEqual([["over.html", "file/skipped", "warn"]]);
  });

  it("stops at 5 000 entries visited, reports it as skipped, and still answers", () => {
    const files = { "a.html": OK_HTML };
    for (let i = 0; i < 5100; i++) files[`many/f${String(i).padStart(4, "0")}.txt`] = "";
    const dir = tree(files);
    const { code, data } = luzJson(["."], dir);
    expect(code).toBe(0);
    expect(data.files).toEqual(["a.html"]);
    expect(data.skipped.some((s) => s.reason === "too-many-files")).toBe(true);
  });

  it("does not descend past 64 directories", () => {
    const deep = `${Array.from({ length: 70 }, (_, i) => `d${i}`).join("/")}/deep.html`;
    const dir = tree({ "ok.html": OK_HTML, "a/b/c/shallow.html": OK_HTML, [deep]: BROKEN_HTML });
    const { code, data } = luzJson(["."], dir);
    expect(code).toBe(0);
    expect(data.files).toEqual(["a/b/c/shallow.html", "ok.html"]);
    expect(data.skipped.some((s) => s.reason === "too-deep")).toBe(true);
  });

  it("skips a file it may not read, as unreadable, and goes on", (context) => {
    if (typeof process.getuid === "function" && process.getuid() === 0) context.skip();
    const dir = tree({ "ok.html": OK_HTML, "locked.html": OK_HTML });
    chmodSync(join(dir, "locked.html"), 0o000);
    const { code, data } = luzJson(["."], dir);
    chmodSync(join(dir, "locked.html"), 0o644);
    expect(code).toBe(0);
    expect(data.files).toEqual(["ok.html"]);
    expect(data.skipped).toEqual([{ file: "locked.html", reason: "unreadable" }]);
  });
});

describe("luz-check, parsing cost: 1 MiB of the worst input, each under a second", () => {
  const cases = [
    ["<script></script> repeated", "page.html", "<script></script>".repeat(Math.floor(MIB / 17)), 0],
    ["( repeated, unclosed", "parens.css", "(".repeat(MIB), 1],
    ["{ repeated, unclosed", "braces.css", "{".repeat(MIB), 1],
  ];
  for (const [label, name, text, expected] of cases) {
    it(`reads ${label} in under a second and answers ${expected}`, () => {
      const dir = tree({ [name]: text });
      const started = performance.now();
      const result = luz([name], dir);
      const elapsed = performance.now() - started;
      expect(result.code, `stderr: ${result.stderr.slice(0, 120)}`).toBe(expected);
      expect(elapsed).toBeLessThan(1000);
    });
  }
});

/* ---- Output escaping --------------------------------------------------------------------------- */

describe("luz-check, what a file name can do to a terminal", () => {
  const evil = `a${ESC}[31mb${BIDI}c.html`;
  const shown = "a\\u{1b}[31mb\\u{202e}c.html";

  it("escapes control and bidi characters of a path as \\u{…}, in text", () => {
    const dir = tree({ [evil]: BROKEN_HTML });
    const result = luz(["."], dir);
    expect(result.code).toBe(1);
    expect(result.stdout).not.toMatch(RAW_CONTROL);
    expect(result.stdout).toContain(shown);
  });

  it("escapes them in --json too: files, findings and skipped", () => {
    const dir = tree({ [evil]: BROKEN_HTML, "real.html": OK_HTML });
    symlinkSync("real.html", join(dir, `link${ESC}.html`));
    const { stdout, data } = luzJson(["."], dir);
    expect(stdout).not.toMatch(RAW_CONTROL);
    expect(data.files).toContain(shown);
    expect(data.findings.map((f) => f.file)).toContain(shown);
    expect(data.skipped.map((s) => s.file)).toContain("link\\u{1b}.html");
  });

  it("escapes them on stderr, for a path that is not there", () => {
    const result = luz([`no${ESC}such${BIDI}.html`], tree());
    expect(result.code).toBe(2);
    expect(result.stderr).not.toMatch(RAW_CONTROL);
    expect(result.stderr).toContain("\\u{1b}");
  });
});

/* ---- Config ------------------------------------------------------------------------------------- */

describe("luz-check, luz-check.json", () => {
  it("is optional, and is read from the working directory when it is there", () => {
    const dir = tree({ "vendor/bad.html": BROKEN_HTML, "ok.html": OK_HTML });
    expect(luz(["."], dir).code).toBe(1);
    writeFileSync(join(dir, "luz-check.json"), JSON.stringify({ ignore: ["vendor/**"] }));
    const { code, data } = luzJson(["."], dir);
    expect(code).toBe(0);
    expect(data.files).toEqual(["ok.html"]);
    expect(data.config.file).toBe("luz-check.json");
    expect(data.summary.ignored).toBeGreaterThanOrEqual(1);
  });

  it("is read from --config, wherever it is", () => {
    const dir = tree({ "vendor/bad.html": BROKEN_HTML, "ok.html": OK_HTML, "conf/my.json": JSON.stringify({ ignore: ["vendor/**"] }) });
    const { code, data } = luzJson([".", "--config", "conf/my.json"], dir);
    expect(code).toBe(0);
    expect(data.config.file).toBe("conf/my.json");
  });

  it("says in the summary how many files it ignored and how many rules it switched off", () => {
    const dir = tree({ "legacy-a.html": BROKEN_HTML, "ok.html": OK_HTML, "luz-check.json": JSON.stringify({ ignore: ["**/legacy-*.html"], rules: { "css/literal-size": "off" } }) });
    const result = luz(["."], dir);
    expect(result.code).toBe(0);
    expect(lastLine(result.stdout)).toMatch(/\b1 ignored\b/);
    expect(lastLine(result.stdout)).toMatch(/\b1 off\b/);
    const { data } = luzJson(["."], dir);
    expect(data.summary).toMatchObject({ ignored: 1, off: 1 });
    expect(data.config).toEqual({ file: "luz-check.json", off: ["css/literal-size"] });
  });

  it("honours strict: true", () => {
    const dir = tree({ "real.html": OK_HTML, "luz-check.json": JSON.stringify({ strict: true }) });
    symlinkSync("real.html", join(dir, "link.html"));
    expect(luz(["."], dir).code).toBe(1);
  });

  it("accepts --theme with a file, and exits 2 for one that is not there", () => {
    const dir = tree({ "ok.html": OK_HTML, "theme.css": OK_CSS });
    expect(luz(["ok.html", "--theme", "theme.css"], dir).code).toBe(0);
    expect(luz(["ok.html", "--theme", "nope.css"], dir).code).toBe(2);
  });

  it("exits 2, naming the file, for a config that is not valid", () => {
    const bad = {
      "not json": "{ ignore: ",
      "an array": "[]",
      "an unknown key": JSON.stringify({ colour: "red" }),
      "a blocking rule switched off": JSON.stringify({ rules: { "class/unknown": "off" } }),
      "a rule that does not exist": JSON.stringify({ rules: { "css/literal-sizes": "off" } }),
      "a rule set to warn": JSON.stringify({ rules: { "css/literal-size": "warn" } }),
      "__proto__": '{"__proto__": {"strict": true}}',
      "a nested __proto__": '{"rules": {"__proto__": "off"}}',
      "ignore that is not a list": JSON.stringify({ ignore: "vendor/**" }),
      "more than 64 kB": JSON.stringify({ ignore: ["a".repeat(70000)] }),
    };
    for (const [label, text] of Object.entries(bad)) {
      const dir = tree({ "ok.html": OK_HTML, "luz-check.json": text });
      const result = luz(["."], dir);
      expect(result.code, label).toBe(2);
      expect(result.stdout, label).toBe("");
      expect(result.stderr, label).toContain("luz-check.json");
      expect(result.stderr, label).not.toMatch(STACK_TRACE);
    }
  });

  it("exits 2 for a --config file that is not there", () => {
    const result = luz([".", "--config", "nope.json"], tree({ "ok.html": OK_HTML }));
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("nope.json");
  });
});

/* ---- walk.js ---------------------------------------------------------------------------------- */

describe("walk.js: the limits are the spec's", () => {
  it("is 1 MiB a file, 128 MiB in total, 5 000 entries and 64 levels", () => {
    expect(walk.LIMITS).toMatchObject({ fileBytes: MIB, totalBytes: 128 * MIB, entries: 5000, depth: 64 });
  });

  it("names why a path was skipped, from a fixed list", () => {
    expect([...walk.SKIP_REASONS].sort()).toEqual(["not-a-file", "read-limit", "symlink", "too-deep", "too-large", "too-many-files", "unreadable"]);
  });
});

describe("walk.js: matchGlob", () => {
  const table = [
    ["*.html", "a.html", true],
    ["*.html", "dir/a.html", false],
    ["**/*.html", "a.html", true],
    ["**/*.html", "x/y/a.html", true],
    ["**/*.html", "x/y/a.css", false],
    ["src/**", "src/a/b.css", true],
    ["src/**/*.css", "src/b.css", true],
    ["src/*.css", "src/a/b.css", false],
    ["a?c.html", "abc.html", true],
    ["a?c.html", "a/c.html", false],
    ["a?c.html", "ac.html", false],
    ["vendor/*.html", "vendor/x.html", true],
    ["vendor/*.html", "other/x.html", false],
  ];
  for (const [pattern, path, expected] of table) {
    it(`${pattern} ${expected ? "matches" : "does not match"} ${path}`, () => {
      expect(walk.matchGlob(pattern, path)).toBe(expected);
    });
  }

  it("takes a time that does not depend on how the stars could be split (linear, no backtracking blow-up)", () => {
    const started = performance.now();
    expect(walk.matchGlob("a*a*a*a*a*a*a*a*a*a*b", `${"a".repeat(80)}.html`)).toBe(false);
    expect(walk.matchGlob("**/*a*/**/*a*/**/*a*/**/*a*/**/*a*/**/b", `${"a/".repeat(60)}x.html`)).toBe(false);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe("walk.js: collect", () => {
  it("reads in sorted order, relative, with the kind of each file", () => {
    const dir = tree({ "b.html": OK_HTML, "a.css": OK_CSS, "c/d.htm": OK_HTML, "e.astro": OK_HTML });
    const found = walk.collect(["."], { cwd: dir, ext: [".astro"] });
    expect(found.files.map((f) => [f.path, f.kind])).toEqual([
      ["a.css", "css"],
      ["b.html", "html"],
      ["c/d.htm", "html"],
      ["e.astro", "template"],
    ]);
    expect(found.files[1].text).toBe(OK_HTML);
    expect(found.skipped).toEqual([]);
    expect(found.missing).toEqual([]);
    expect(found.ignored).toBe(0);
  });

  it("answers the inputs that matched nothing as missing", () => {
    const dir = tree({ "a.html": OK_HTML });
    const found = walk.collect(["a.html", "nope.html", "src/**/*.css"], { cwd: dir });
    expect(found.files.map((f) => f.path)).toEqual(["a.html"]);
    expect(found.missing).toEqual(["nope.html", "src/**/*.css"]);
  });

  it("prunes what an ignore pattern matches and counts the files it left out", () => {
    const dir = tree({ "legacy-a.html": OK_HTML, "legacy-b.html": OK_HTML, "keep.html": OK_HTML, "vendor/x.html": OK_HTML });
    const found = walk.collect(["."], { cwd: dir, ignore: ["**/legacy-*.html", "vendor/**"] });
    expect(found.files.map((f) => f.path)).toEqual(["keep.html"]);
    expect(found.ignored).toBeGreaterThanOrEqual(3);
  });

  it("takes its limits as a parameter: file size, total size, entries and depth", () => {
    const dir = tree({ "a.html": "<p>a</p>", "b.html": "<p>b</p>", "c.html": "<p>c</p>", "big.html": "x".repeat(50), "d1/d2/d3/d4/deep.html": "<p>d</p>" });
    const limits = { ...walk.LIMITS, fileBytes: 20 };
    expect(walk.collect(["."], { cwd: dir, limits }).skipped).toEqual(expect.arrayContaining([{ file: "big.html", reason: "too-large" }]));
    const total = walk.collect(["."], { cwd: dir, limits: { ...walk.LIMITS, totalBytes: 20 } });
    expect(total.files.length).toBeLessThan(5);
    expect(total.skipped.some((s) => s.reason === "read-limit")).toBe(true);
    const deep = walk.collect(["."], { cwd: dir, limits: { ...walk.LIMITS, depth: 2 } });
    expect(deep.files.map((f) => f.path)).not.toContain("d1/d2/d3/d4/deep.html");
    expect(deep.skipped.some((s) => s.reason === "too-deep")).toBe(true);
    const few = walk.collect(["."], { cwd: dir, limits: { ...walk.LIMITS, entries: 3 } });
    expect(few.skipped.some((s) => s.reason === "too-many-files")).toBe(true);
    expect(few.files.length).toBeLessThanOrEqual(3);
  });

  it("lists nothing it did not name: an empty directory has no files, no skipped and no missing", () => {
    const found = walk.collect(["."], { cwd: tree() });
    expect(found).toMatchObject({ files: [], skipped: [], missing: [], ignored: 0 });
  });

  it("reads a directory's entries without being fooled by its order on disk", () => {
    const dir = tree({});
    for (const name of ["z.html", "m.html", "a.html"]) writeFileSync(join(dir, name), OK_HTML);
    expect(walk.collect(["."], { cwd: dir }).files.map((f) => f.path)).toEqual(["a.html", "m.html", "z.html"]);
  });
});

/* ---- sanitize.js ------------------------------------------------------------------------------- */

describe("sanitize.js", () => {
  it("echoes a name of ^[A-Za-z0-9_:.\\-/]{1,64}$ and nothing else", () => {
    for (const ok of ["luz-btn--primary", "luz-card__title", "is-active", "o-stack", "a:b/c.d_e", "x".repeat(64)]) expect(sanitize.echoName(ok), ok).toBe(ok);
    for (const bad of ["", "x".repeat(65), "a b", "luz-btn\n", `luz-btn${ESC}`, `luz-${BIDI}btn`, "luz-btn{", "luz[0]", "ñandú", "a;b", "<b>"]) {
      expect(sanitize.echoName(bad), JSON.stringify(bad)).toBe(sanitize.UNREADABLE);
    }
    expect(sanitize.UNREADABLE).toBe("<an unreadable name>");
  });

  it("escapes what is outside the path alphabet as \\u{hex} and keeps readable text, spaces and accents", () => {
    expect(sanitize.displayPath(`a${ESC}b`)).toBe("a\\u{1b}b");
    expect(sanitize.displayPath(`x${BIDI}y`)).toBe("x\\u{202e}y");
    expect(sanitize.displayPath(`n${NEL}l${LINE_SEP}`)).toBe("n\\u{85}l\\u{2028}");
    expect(sanitize.displayPath("line\nbreak\ttab")).toBe("line\\u{a}break\\u{9}tab");
    expect(sanitize.displayPath("src/ñandú día/página 1.html")).toBe("src/ñandú día/página 1.html");
    expect(sanitize.displayPath("src/a.html")).toBe("src/a.html");
  });

  it("strips control characters, ESC sequences and bidi overrides from free text, and cuts at 80", () => {
    expect(sanitize.cleanText(`ab${ESC}[31;1mc${BEL}d${BIDI}e${NEL}f`)).toBe("abcdef");
    expect(sanitize.cleanText("x".repeat(500)).length).toBeLessThanOrEqual(80);
    expect(sanitize.cleanText("x".repeat(500)).startsWith("xxxx")).toBe(true);
    expect(sanitize.cleanText("short")).toBe("short");
    expect(sanitize.cleanText("x".repeat(30), 10).length).toBeLessThanOrEqual(10);
  });
});

/* ---- config.js --------------------------------------------------------------------------------- */

describe("config.js: parseConfig", () => {
  it("gives the defaults for an empty object", () => {
    const parsed = config.parseConfig("{}");
    expect({ ...parsed, rules: { ...parsed.rules } }).toEqual({ ignore: [], rules: {}, themes: [], strict: false });
  });

  it("reads the four keys of the spec", () => {
    const parsed = config.parseConfig(JSON.stringify({ ignore: ["vendor/**"], rules: { "css/literal-size": "off" }, themes: ["src/theme.css"], strict: true }));
    expect(parsed.ignore).toEqual(["vendor/**"]);
    expect({ ...parsed.rules }).toEqual({ "css/literal-size": "off" });
    expect(parsed.themes).toEqual(["src/theme.css"]);
    expect(parsed.strict).toBe(true);
  });

  it("lets every warning rule be switched off, and no blocking rule", () => {
    // file/skipped is left out on purpose: switching it off hides a file that was never read (asked in the report)
    const { parseConfig, ConfigError } = config;
    for (const rule of WARNING_RULES.filter((r) => r !== "file/skipped")) expect(() => parseConfig(JSON.stringify({ rules: { [rule]: "off" } })), rule).not.toThrow();
    for (const rule of BLOCKING_RULES) expect(() => parseConfig(JSON.stringify({ rules: { [rule]: "off" } })), rule).toThrow(ConfigError);
  });

  it("rejects what the spec rejects, with a ConfigError that names the file", () => {
    const texts = [
      "{ nope",
      "[]",
      '"text"',
      "null",
      '{"colour":"red"}',
      '{"rules":{"css/literal-size":"warn"}}',
      '{"rules":{"css/literal-size":true}}',
      '{"rules":{"no/such-rule":"off"}}',
      '{"ignore":"vendor"}',
      '{"ignore":[1]}',
      '{"themes":"a.css"}',
      '{"strict":"yes"}',
      '{"__proto__":{"strict":true}}',
      '{"rules":{"__proto__":"off"}}',
      '{"constructor":{}}',
    ];
    for (const text of texts) {
      let thrown;
      try {
        config.parseConfig(text, "conf/luz-check.json");
      } catch (error) {
        thrown = error;
      }
      expect(thrown, text).toBeInstanceOf(config.ConfigError);
      expect(thrown.message, text).toContain("conf/luz-check.json");
      expect(thrown.message, text).not.toMatch(STACK_TRACE);
    }
  });

  it("does not pollute Object.prototype, even from a config that tries", () => {
    const { parseConfig, ConfigError } = config;
    expect(() => parseConfig('{"__proto__":{"polluted":true}}')).toThrow(ConfigError);
    expect({}.polluted).toBeUndefined();
  });

  it("is limited to 64 kB", () => {
    expect(config.MAX_CONFIG_BYTES).toBe(65536);
    const { parseConfig, ConfigError } = config;
    expect(() => parseConfig(JSON.stringify({ ignore: ["a".repeat(70000)] }))).toThrow(ConfigError);
    expect(() => parseConfig(JSON.stringify({ ignore: ["a".repeat(60000)] }))).not.toThrow();
  });

  it("never echoes a key it cannot print", () => {
    let thrown;
    try {
      config.parseConfig(JSON.stringify({ [`bad${ESC}[31m${BIDI}key`]: 1 }));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(config.ConfigError);
    expect(thrown.message).not.toMatch(RAW_CONTROL);
  });
});

/* ---- report.js --------------------------------------------------------------------------------- */

describe("report.js: finding", () => {
  const sample = () => messages.MESSAGES["parse/error"].sample;

  it("fills severity, message and docs from the rule, and has every key", () => {
    const found = report.finding("parse/error", { file: "a.html", line: 3, column: 5, vars: sample() });
    expect(Object.keys(found).sort()).toEqual(["column", "docs", "file", "line", "message", "rule", "severity", "suggestion"]);
    expect(found).toMatchObject({ rule: "parse/error", severity: "block", file: "a.html", line: 3, column: 5, suggestion: null });
    expect(found.message).toBe(messages.message("parse/error", sample()));
    expect(found.docs.startsWith(`${SITE_URL}docs/`)).toBe(true);
  });

  it("reports the rule id, not the variant, and keeps the suggestion and the details when it has them", () => {
    const vars = messages.MESSAGES["class/unknown"].sample;
    const found = report.finding("class/unknown", { file: "a.html", line: 1, column: 1, vars, suggestion: ".luz-btn--primary", details: { a: 1 } });
    expect(found.rule).toBe("class/unknown");
    expect(found.suggestion).toBe(".luz-btn--primary");
    expect(found.details).toEqual({ a: 1 });
  });

  it("has no position when it is given none", () => {
    const found = report.finding("file/skipped", { file: "a.html", vars: messages.MESSAGES["file/skipped"].sample });
    expect(found).toMatchObject({ line: null, column: null });
  });
});

describe("report.js: buildReport", () => {
  const parseError = (file, line = 1, column = 1) => report.finding("parse/error", { file, line, column, vars: messages.MESSAGES["parse/error"].sample });
  const warning = (file, line = 1, column = 1) => report.finding("css/important", { file, line, column, vars: messages.MESSAGES["css/important"].sample });
  const base = (extra = {}) => ({ version: VERSION, files: ["a.html"], manifests: [], findings: [], skipped: [], config: { file: null, off: [] }, ignored: 0, strict: false, ...extra });

  it("counts blocking findings and warnings and says ok when nothing blocks", () => {
    const built = report.buildReport(base({ files: ["a.html", "b.css"], findings: [parseError("a.html"), warning("b.css")] }));
    expect(built).toMatchObject({ tool: "@luz-ds/check", version: VERSION, ok: false });
    expect(built.summary).toEqual({ files: 2, blocking: 1, warnings: 1, skipped: 0, ignored: 0, off: 0, truncated: false });
    expect(report.buildReport(base({ findings: [warning("a.html")] })).ok).toBe(true);
  });

  it("is not ok with a warning under --strict", () => {
    expect(report.buildReport(base({ findings: [warning("a.html")], strict: true })).ok).toBe(false);
    expect(report.buildReport(base({ strict: true })).ok).toBe(true);
  });

  it("sorts findings by file, line, column and rule", () => {
    const built = report.buildReport(base({ files: ["a.html", "b.html"], findings: [warning("b.html", 1, 1), parseError("a.html", 9, 1), warning("a.html", 2, 7), warning("a.html", 2, 3)] }));
    expect(built.findings.map((f) => [f.file, f.line, f.column])).toEqual([
      ["a.html", 2, 3],
      ["a.html", 2, 7],
      ["a.html", 9, 1],
      ["b.html", 1, 1],
    ]);
  });

  it("turns each skipped path into a file/skipped warning and counts it", () => {
    const built = report.buildReport(base({ skipped: [{ file: "link.html", reason: "symlink" }, { file: "big.html", reason: "too-large" }] }));
    expect(built.skipped).toEqual([
      { file: "big.html", reason: "too-large" },
      { file: "link.html", reason: "symlink" },
    ]);
    expect(built.summary).toMatchObject({ blocking: 0, warnings: 2, skipped: 2 });
    expect(built.findings.every((f) => f.rule === "file/skipped" && f.severity === "warn")).toBe(true);
    expect(built.ok).toBe(true);
  });

  it("keeps 200 findings of one file and 5 000 in all, and says it truncated", () => {
    expect([report.MAX_FINDINGS_PER_FILE, report.MAX_FINDINGS]).toEqual([200, 5000]);
    const one = report.buildReport(base({ findings: Array.from({ length: 250 }, (_, i) => warning("a.html", i + 1)) }));
    expect(one.findings).toHaveLength(200);
    expect(one.summary.truncated).toBe(true);
    const files = Array.from({ length: 40 }, (_, i) => `f${String(i).padStart(2, "0")}.css`);
    const many = report.buildReport(base({ files, findings: files.flatMap((file) => Array.from({ length: 200 }, (_, i) => warning(file, i + 1))) }));
    expect(many.findings).toHaveLength(5000);
    expect(many.summary.truncated).toBe(true);
    expect(report.buildReport(base({ findings: [warning("a.html")] })).summary.truncated).toBe(false);
  });

  it("lists the rules the config switched off, and from which file", () => {
    const built = report.buildReport(base({ config: { file: "luz-check.json", off: ["css/important", "css/literal-size"] }, ignored: 3 }));
    expect(built.config).toEqual({ file: "luz-check.json", off: ["css/important", "css/literal-size"] });
    expect(built.summary).toMatchObject({ off: 2, ignored: 3 });
  });

  it("escapes the paths it was given", () => {
    const evil = `a${ESC}b${BIDI}.html`;
    const built = report.buildReport(base({ files: [evil], findings: [parseError(evil)], skipped: [{ file: evil, reason: "symlink" }] }));
    expect(JSON.stringify(built)).not.toMatch(RAW_CONTROL);
    expect(built.files).toEqual(["a\\u{1b}b\\u{202e}.html"]);
  });
});

describe("report.js: formatText and formatJson", () => {
  const withFindings = () =>
    report.buildReport({
      version: VERSION,
      files: ["index.html", "css/theme.css"],
      manifests: [{ package: "@luz-ds/core", version: "0.1.0", source: "node_modules" }],
      findings: [
        report.finding("parse/error", { file: "index.html", line: 14, column: 7, vars: messages.MESSAGES["parse/error"].sample }),
        report.finding("css/important", { file: "css/theme.css", line: 8, column: 3, vars: messages.MESSAGES["css/important"].sample }),
        report.finding("theme/contrast", { file: "css/theme.css", vars: messages.MESSAGES["theme/contrast"].sample }),
      ],
      skipped: [],
      config: { file: null, off: [] },
      ignored: 0,
      strict: false,
    });

  it("writes `mark file:line:column rule  message`, one line per finding, then the summary", () => {
    const lines = report.formatText(withFindings()).trimEnd().split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toMatch(/^! css\/theme\.css:8:3 css\/important\s+\S/);
    expect(lines[1]).toMatch(/^✗ css\/theme\.css theme\/contrast\s+\S/);
    expect(lines[2]).toMatch(/^✗ index\.html:14:7 parse\/error\s+\S/);
    expect(lines[3]).toMatch(/^✗ 2 blocking and 1 warning in 2 files/);
  });

  it("prints where each manifest came from, in the summary line", () => {
    expect(lastLine(report.formatText(withFindings()))).toContain("@luz-ds/core 0.1.0 from node_modules");
  });

  it("writes a ✓ summary when nothing blocks, and never says a page is accessible or passes", () => {
    const clean = report.buildReport({ version: VERSION, files: ["a.html"], manifests: [], findings: [], skipped: [], config: { file: null, off: [] }, ignored: 0, strict: false });
    const text = report.formatText(clean);
    expect(text.trimEnd().split("\n")).toHaveLength(1);
    expect(text).toMatch(/^✓ 0 blocking and 0 warnings in 1 file/);
    expect(text).not.toMatch(/\b(?:is|are) accessible\b|\bpass(?:es|ed)?\b|\bconforms\b|\bcompliant\b/i);
  });

  it("writes JSON with two-space indentation and a final newline, and the same object back", () => {
    const built = withFindings();
    const text = report.formatJson(built);
    expect(text).toBe(`${JSON.stringify(built, null, 2)}\n`);
    expect(JSON.parse(text)).toEqual(built);
  });
});

/* ---- The fixtures ------------------------------------------------------------------------------- */

/** The `expect:` lines of a fixture: { rule, line, column, options } each. */
function expectations(text) {
  const found = [];
  for (const match of text.matchAll(/(?:<!--|\/\*)\s*expect:\s*(.*?)\s*(?:-->|\*\/)/g)) {
    const [rule, ...rest] = match[1].split(/\s+/);
    const entry = { rule, line: null, column: null, options: {} };
    for (const part of rest) {
      const at = /^(\d+)(?::(\d+))?$/.exec(part);
      if (at) {
        entry.line = Number(at[1]);
        entry.column = at[2] === undefined ? null : Number(at[2]);
      } else {
        const [key, ...value] = part.split("=");
        entry.options[key] = value.join("=");
      }
    }
    found.push(entry);
  }
  return found;
}

const fixtureFiles = (folder) =>
  readdirSync(join(FIXTURES, folder))
    .filter((name) => /\.(?:html|css)$/.test(name))
    .sort();

describe("tests/fixtures/check: the folder", () => {
  it("has pass, fail and warn, the files the spec names (5.9), and a file for every rule that a file can show", () => {
    expect(existsSync(FIXTURES)).toBe(true);
    for (const name of ["landing.html", "component-only.html", "bundled.html", "theme-ok.css"]) expect(fixtureFiles("pass"), name).toContain(name);
    for (const name of ["class-typo.html", "host-div.html", "core-without-tokens.html", "layer-after.html", "luz-unknown-tag.html", "theme-low.css", "broken.html"]) {
      expect(fixtureFiles("fail"), name).toContain(name);
    }
    expect(fixtureFiles("warn")).toContain("literals.css");
  });

  it("states what each fail and warn file must make the tool say, in leading `expect:` comments, and the pass files nothing", () => {
    for (const name of fixtureFiles("pass")) expect(expectations(readFileSync(join(FIXTURES, "pass", name), "utf-8")), `pass/${name}`).toEqual([]);
    for (const folder of ["fail", "warn"]) {
      for (const name of fixtureFiles(folder)) {
        const found = expectations(readFileSync(join(FIXTURES, folder, name), "utf-8"));
        expect(found.length, `${folder}/${name} has an expect comment`).toBeGreaterThan(0);
      }
    }
  });

  it("covers every rule of the spec that a file can show, in some file", () => {
    const covered = new Set();
    for (const folder of ["fail", "warn"]) for (const name of fixtureFiles(folder)) for (const e of expectations(readFileSync(join(FIXTURES, folder, name), "utf-8"))) covered.add(e.rule);
    // file/skipped comes from the disk, theme/advisory from the way themes are ordered: no file shows them alone
    for (const rule of [...BLOCKING_RULES, ...WARNING_RULES].filter((r) => !["file/skipped", "theme/advisory"].includes(r))) {
      expect(covered.has(rule), `a fixture for ${rule}`).toBe(true);
    }
  });

  it("names only rules that messages.js has, blocking ones in fail/ and warnings in warn/", () => {
    const keys = new Set(Object.keys(messages.MESSAGES).map((key) => key.split(":")[0]));
    for (const folder of ["fail", "warn"]) {
      for (const name of fixtureFiles(folder)) {
        for (const e of expectations(readFileSync(join(FIXTURES, folder, name), "utf-8"))) {
          expect(keys.has(e.rule), `${folder}/${name}: ${e.rule}`).toBe(true);
          expect(messages.MESSAGES[e.rule].severity, `${folder}/${name}: ${e.rule}`).toBe(folder === "fail" ? "block" : "warn");
        }
      }
    }
  });

  it("points each expectation at the thing the rule is about: a class, a tag, an attribute, a declaration", () => {
    const CLASS_ATTR = new Set(["class/unknown", "misuse/host-element", "misuse/modifier-alone", "load/package-missing", "misuse/state-class", "misuse/part-orphan"]);
    const ELEMENT = { "element/unknown": /^luz-/, "load/tokens-missing": /^link$/, "load/layer-statement": /^style$/, "a11y/link-no-href": /^a$/ };
    const CSS_DECLARATION = new Set(["css/literal-colour", "css/literal-size", "css/important", "css/private-token", "css/knob-in-px", "css/unknown-token"]);
    for (const folder of ["fail", "warn"]) {
      for (const name of fixtureFiles(folder)) {
        const text = readFileSync(join(FIXTURES, folder, name), "utf-8");
        const here = `${folder}/${name}`;
        const lines = text.split("\n");
        const elements = name.endsWith(".html") ? [...scan(text, name)] : [];
        for (const e of expectations(text)) {
          if (e.line === null) continue;
          const at = `${here} ${e.rule} ${e.line}:${e.column}`;
          if (CLASS_ATTR.has(e.rule)) {
            expect(elements.some((el) => el.type === "element" && el.attrs.get("class")?.line === e.line && el.attrs.get("class")?.column === e.column), at).toBe(true);
          } else if (ELEMENT[e.rule]) {
            expect(elements.some((el) => el.type === "element" && ELEMENT[e.rule].test(el.name) && el.line === e.line && el.column === e.column), at).toBe(true);
          } else if (e.rule === "element/unknown-attribute") {
            expect(elements.some((el) => el.type === "element" && el.name.startsWith("luz-") && [...el.attrs.values()].some((a) => a.line === e.line && a.column === e.column)), at).toBe(true);
          } else if (e.rule === "a11y/role-on-generic") {
            expect(elements.some((el) => el.type === "element" && el.attrs.get("role")?.line === e.line && el.attrs.get("role")?.column === e.column), at).toBe(true);
          } else if (e.rule === "attr/unknown-hook") {
            expect(elements.some((el) => el.type === "element" && [...el.attrs.entries()].some(([n, a]) => n.startsWith("data-luz-") && a.line === e.line && a.column === e.column)), at).toBe(true);
          } else if (e.rule === "parse/error") {
            const error = name.endsWith(".css") ? readCss(text, name).findings[0] : elements.find((el) => el.type === "error");
            expect(error, at).toBeDefined();
            expect([error.line, error.column], at).toEqual([e.line, e.column]);
          } else if (CSS_DECLARATION.has(e.rule)) {
            expect(lines[e.line - 1].slice(e.column - 1), at).toMatch(/^[a-z-]+\s*:/);
          } else if (e.rule === "class/unknown-in-css" || e.rule === "class/reserved-prefix") {
            expect(lines[e.line - 1].slice(e.column - 1), at).toMatch(/^\.luz-/);
          } else {
            expect.fail(`${at}: no way to check where this rule points`);
          }
        }
      }
    }
  });

  it("reads without a parse error, except fail/broken.html on purpose", () => {
    for (const folder of ["pass", "fail", "warn"]) {
      for (const name of fixtureFiles(folder)) {
        const text = readFileSync(join(FIXTURES, folder, name), "utf-8");
        const problems = name.endsWith(".css") ? readCss(text, name).findings : [...scan(text, name)].filter((el) => el.type === "error");
        expect(problems.length > 0, `${folder}/${name}`).toBe(`${folder}/${name}` === "fail/broken.html");
      }
    }
  });

  it("makes luz-tokens check-contrast say what the theme fixtures say: ok, a pair too low, a colour it cannot read", () => {
    const tokensPath = join(root, "packages/tokens/dist/tokens.css");
    if (!existsSync(tokensPath)) return; // tokens are not built: nothing to compare with
    const contrast = (file) => luzTokens(["check-contrast", file, "--json"], { tokensPath, read: (path) => readFileSync(path, "utf-8") });
    const ok = contrast(join(FIXTURES, "pass/theme-ok.css"));
    expect([ok.code, JSON.parse(ok.stdout).ok]).toEqual([0, true]);
    const low = contrast(join(FIXTURES, "fail/theme-low.css"));
    expect(low.code).toBe(1);
    expect(JSON.parse(low.stdout).failures.length).toBeGreaterThan(0);
    const unreadable = contrast(join(FIXTURES, "fail/theme-unreadable.css"));
    expect(unreadable.code).toBe(1);
    expect(JSON.parse(unreadable.stdout).unreadable.length).toBeGreaterThan(0);
  });

  it("uses a class of LUZ only where its manifest has it, so a pass file is a valid LUZ page", () => {
    const known = new Set();
    for (const pkg of ["core", "site", "landing", "cms", "app"]) {
      const file = join(root, "packages", pkg, "dist", "classes.json");
      if (existsSync(file)) for (const c of JSON.parse(readFileSync(file, "utf-8")).classes) known.add(c.name);
    }
    if (known.size === 0) return; // packages are not built: the class manifests are not there to compare with
    for (const name of fixtureFiles("pass").filter((n) => n.endsWith(".html"))) {
      const text = readFileSync(join(FIXTURES, "pass", name), "utf-8");
      for (const el of scan(text, name)) {
        if (el.type !== "element" || !el.attrs.has("class")) continue;
        for (const token of el.attrs.get("class").value.split(/\s+/)) {
          if (/[{}$:@[]/.test(token) || !/^(?:luz-|o-|u-|is-)/.test(token)) continue;
          expect(known.has(token), `pass/${name}: .${token}`).toBe(true);
        }
      }
    }
  });
});

describe("luz-check over the fixtures", () => {
  it("exits 0 for the whole pass/ folder and for each file of it", () => {
    const folder = luzJson(["pass"], FIXTURES);
    expect(folder.code).toBe(0);
    expect(folder.data.ok).toBe(true);
    expect(folder.data.files).toEqual(fixtureFiles("pass").map((n) => `pass/${n}`));
    expect(folder.data.findings.filter((f) => f.severity === "block")).toEqual([]);
    for (const name of fixtureFiles("pass")) expect(luz([`pass/${name}`], FIXTURES).code, name).toBe(0);
  });

  it("exits 1 for fail/broken.html, with the one parse/error its expect comment names", () => {
    const [expected] = expectations(readFileSync(join(FIXTURES, "fail/broken.html"), "utf-8"));
    const { code, data } = luzJson(["fail/broken.html"], FIXTURES);
    expect(code).toBe(1);
    expect(data.findings.map((f) => [f.rule, f.line, f.column])).toEqual([[expected.rule, expected.line, expected.column]]);
  });
});
