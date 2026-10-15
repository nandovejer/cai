/**
 * F5 step 7, @luz-ds/check as a package (.claude/plans/specs/f5-ai-ready.md
 * 5.1, 7.1, 7.2, 7.3, 8 "Supply chain", 10 row 7; decisions D7, D10, D12,
 * D14; the review answers of security-auditor Q4 and Q6).
 *
 * A dev tool, not a layer: no CSS, no layer, no kind of site, no docs area.
 * It is published, so it is on the lists that pack, check and publish, and
 * it has the one thing no other package has, a bin. The sources are read as
 * text; the bundle is built into a temporary folder by the builder's own
 * export (tests/helpers/check-build.js). The browser is never involved.
 *
 *   - the manifest: bin, exports, files, no dependency of any kind, engines
 *   - the folder: README, LICENSE, pack-files.txt, no CSS, a lockfile importer
 *   - the build: one deterministic bundle of packages/check/src, with a
 *     shebang, nothing from node_modules (esbuild, as build-package.js)
 *   - the lists: TOOLS and PUBLISHED, and the scripts that read them
 *   - the lint block: Node imports from an allow-list, no network, no shell
 *   - the release: a minor changeset out of `fixed`, and the coupling rule
 *
 * Not here (other steps): the CLI's behaviour (8), the rules (9-11), the
 * agent (12), the docs page, CODEOWNERS and the dev/ notes (13). The size row
 * is tests/size-guard.test.js; what the bundle may import is
 * tests/check-capabilities.test.js.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import { BASE, PACKAGES, PUBLISHED, SITE_KINDS, TOOLS } from "../scripts/luz-packages.js";
import { BUNDLE, buildCheckTo, builtOnce, removeBuilds, root } from "./helpers/check-build.js";

const exists = (path) => existsSync(`${root}${path}`);
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
/** Like `read`, but "" for a file that is not there yet, so the assertion says what is missing. */
const readOr = (path) => (exists(path) ? read(path) : "");
const json = (path) => JSON.parse(readOr(path) || "{}");
/** The text without comments, so a word in one is not a use of it. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const LIBRARIES = ["tokens", "core", "site", "landing", "cms", "app"];
const distOfRepo = `${root}packages/check/dist/${BUNDLE}`;
const distBefore = existsSync(distOfRepo) ? statSync(distOfRepo).mtimeMs : null;

afterAll(removeBuilds);

/* ---- The manifest ------------------------------------------------------------ */

describe("@luz-ds/check: package.json", () => {
  const manifest = json("packages/check/package.json");

  it("is @luz-ds/check, MIT, ESM, 0.0.0 until its first release, and public", () => {
    expect(manifest.name).toBe("@luz-ds/check");
    expect(manifest.version).toBe("0.0.0");
    expect(manifest.license).toBe("MIT");
    expect(manifest.type).toBe("module");
    expect(manifest.private).not.toBe(true);
    expect(manifest.description, "a description of what it does").toMatch(/\S{3,}/);
    expect(Array.isArray(manifest.keywords) && manifest.keywords.length > 0, "keywords").toBe(true);
  });

  it("has one bin, luz-check, that is the bundle", () => {
    expect(manifest.bin).toEqual({ "luz-check": "./dist/luz-check.js" });
  });

  it("exports ./package.json and, once the agent step lands, ./agents/accessibility.md: nothing else, no CSS", () => {
    const exports = manifest.exports;
    expect(exports, "an exports map").toBeTypeOf("object");
    expect(exports["./package.json"]).toBe("./package.json");
    expect(Object.keys(exports).filter((key) => !["./package.json", "./agents/accessibility.md"].includes(key))).toEqual([]);
    if ("./agents/accessibility.md" in exports) expect(exports["./agents/accessibility.md"]).toBe("./dist/agents/luz-accessibility-reviewer.md");
  });

  it("ships dist and LICENSE, and has no side effects to keep", () => {
    expect(manifest.files).toEqual(["dist", "LICENSE"]);
    expect(manifest.sideEffects).toBe(false);
  });

  it("runs on Node 20 and later, the range of the root (D14)", () => {
    expect(manifest.engines).toEqual({ node: ">=20" });
  });

  it("has no dependency of any kind: no dependencies, no peers, no optional, no bundled", () => {
    expect(manifest.name, "packages/check/package.json exists").toBe("@luz-ds/check");
    for (const field of ["dependencies", "peerDependencies", "peerDependenciesMeta", "optionalDependencies", "bundledDependencies", "bundleDependencies"]) {
      expect(manifest, field).not.toHaveProperty(field);
    }
  });

  it("has no script npm runs on install or publish (supply chain: no postinstall)", () => {
    expect(manifest.name, "packages/check/package.json exists").toBe("@luz-ds/check");
    expect(Object.keys(manifest.scripts ?? {})).toEqual([]);
  });

  it("names the six libraries as workspace dev dependencies, for the build that reads their dist", () => {
    expect(manifest.devDependencies).toEqual(Object.fromEntries(LIBRARIES.map((name) => [`@luz-ds/${name}`, "workspace:*"])));
  });

  it("has the repository, homepage, bugs and publish config of its siblings, with its own directory", () => {
    const sibling = json("packages/landing/package.json");
    expect(manifest.repository).toEqual({ ...sibling.repository, directory: "packages/check" });
    expect(manifest.homepage).toBe(sibling.homepage);
    expect(manifest.bugs).toEqual(sibling.bugs);
    expect(manifest.publishConfig).toEqual(sibling.publishConfig);
    expect(manifest.publishConfig).toEqual({ access: "public" });
  });

  it("is a workspace importer of the lockfile (pnpm install was run)", () => {
    expect(read("pnpm-lock.yaml")).toMatch(/^ {2}packages\/check:$/m);
  });
});

/* ---- The folder ---------------------------------------------------------------- */

describe("@luz-ds/check: the folder", () => {
  it("has README.md, LICENSE, pack-files.txt and the entry src/main.js", () => {
    for (const file of ["README.md", "LICENSE", "pack-files.txt", "src/main.js"]) {
      expect(exists(`packages/check/${file}`), `packages/check/${file}`).toBe(true);
    }
  });

  it("has the licence text of the other packages, unchanged", () => {
    expect(readOr("packages/check/LICENSE")).toBe(read("packages/core/LICENSE"));
  });

  it("has no CSS: no stylesheet and no src/components in a dev tool", () => {
    const css = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (entry === "node_modules" || entry === "dist") continue;
        if (statSync(path).isDirectory()) walk(path);
        else if (entry.endsWith(".css")) css.push(relative(root, path));
      }
    };
    expect(exists("packages/check/package.json"), "packages/check/package.json exists").toBe(true);
    walk(`${root}packages/check`);
    expect(css).toEqual([]);
    expect(exists("packages/check/src/components")).toBe(false);
    expect(exists("packages/check/src/index.css")).toBe(false);
  });

  it("lists in pack-files.txt the bundle, LICENSE, README and package.json, and only dist/data and dist/agents besides", () => {
    const packed = readOr("packages/check/pack-files.txt").split("\n").filter(Boolean);
    for (const file of ["LICENSE", "README.md", "dist/luz-check.js", "package.json"]) expect(packed, file).toContain(file);
    expect(packed.filter((path) => !["LICENSE", "README.md", "package.json", "dist/luz-check.js"].includes(path) && !/^dist\/(?:data|agents)\//.test(path))).toEqual([]);
    expect(packed, "sorted, as check-pack.js writes it").toEqual([...packed].sort());
  });

  it("says in its README what it is, and runs it as npx @luz-ds/check, never npx luz-check (security Q2)", () => {
    const readme = readOr("packages/check/README.md");
    expect(readme).toMatch(/^# @luz-ds\/check$/m);
    expect(readme).toContain("npx @luz-ds/check");
    expect(readme).not.toMatch(/npx luz-check/);
  });
});

/* ---- The build ----------------------------------------------------------------- */

describe("scripts/build-check.js: the build", () => {
  const script = readOr("scripts/build-check.js");
  const source = code(script);

  it("exists and exports buildCheck({ outdir })", async () => {
    expect(exists("scripts/build-check.js"), "scripts/build-check.js").toBe(true);
    expect(source).toMatch(/export (?:async )?function buildCheck\b|export const buildCheck\b/);
  });

  it("bundles packages/check/src/main.js with esbuild, as build-package.js does: node, ESM, node20, builtins external", () => {
    expect(source).toMatch(/from ["']esbuild["']/);
    expect(source).toMatch(/packages\/check\/src\/main\.js|"packages",\s*"check",\s*"src",\s*"main\.js"|["']src["'],\s*["']main\.js["']/);
    expect(source).toMatch(/bundle:\s*true/);
    expect(source).toMatch(/platform:\s*["']node["']/);
    expect(source).toMatch(/format:\s*["']esm["']/);
    expect(source).toMatch(/target:\s*["']node20["']/);
    expect(source).toMatch(/metafile:\s*true/);
  });

  it("does not minify (it is read by people and by the security audit) and writes no source map", () => {
    expect(script, "scripts/build-check.js exists").not.toBe("");
    expect(source).not.toMatch(/minify\w*\s*:\s*true/);
    expect(source).not.toMatch(/esbuild\.transform\(/);
    expect(source).not.toMatch(/sourcemap\s*:\s*(?!false)/);
  });

  it("puts nothing in the output that changes between runs: no clock, no file times, no random", () => {
    expect(script, "scripts/build-check.js exists").not.toBe("");
    expect(source).not.toMatch(/Date\.now|new Date|toISOString|\.mtime|Math\.random|randomUUID|process\.pid|hrtime/);
  });

  it("builds only when node runs it: importing it writes nothing, and it checks import.meta.url", async () => {
    const built = await builtOnce();
    expect(built.error, "the builder is importable and builds").toBeNull();
    expect(script).toMatch(/import\.meta\.url/);
    const after = existsSync(distOfRepo) ? statSync(distOfRepo).mtimeMs : null;
    expect(after, "packages/check/dist/luz-check.js is untouched by an import and by a build into outdir").toBe(distBefore);
  });

  describe("the bundle", () => {
    let built;
    beforeAll(async () => {
      built = await builtOnce();
    });

    it("is one file, luz-check.js, in the folder it was given", () => {
      expect(built.error, "buildCheck({ outdir }) builds").toBeNull();
      expect(readdirSync(built.outdir).filter((f) => f.endsWith(".js"))).toEqual([BUNDLE]);
      expect(readdirSync(built.outdir).filter((f) => f.endsWith(".map"))).toEqual([]);
    });

    it("starts with the shebang `#!/usr/bin/env node`, once", () => {
      expect(built.error).toBeNull();
      expect(built.code.split("\n")[0]).toBe("#!/usr/bin/env node");
      expect(built.code.match(/^#!/gm)).toHaveLength(1);
    });

    it("is syntactically a module (node --check on a copy named .mjs)", () => {
      expect(built.error).toBeNull();
      const copy = join(built.outdir, "check.mjs");
      writeFileSync(copy, built.code);
      expect(() => execFileSync(process.execPath, ["--check", copy], { stdio: "pipe" })).not.toThrow();
    });

    it("is the same bytes twice (deterministic: two builds into two folders)", async () => {
      expect(built.error).toBeNull();
      const second = await buildCheckTo("b");
      expect(second.error).toBeNull();
      expect(second.code.length).toBeGreaterThan(0);
      expect(second.code === built.code, "luz-check.js differs between two builds").toBe(true);
    });

    it("holds no absolute path of this machine and no date (nothing of the builder's environment)", () => {
      expect(built.error).toBeNull();
      expect(built.code).not.toContain(root);
      expect(built.code).not.toContain(built.outdir);
      expect(built.code).not.toMatch(/\b20\d\d-\d\d-\d\dT\d\d:\d\d/);
    });

    it("was made from files under packages/ only, none from node_modules (security Q4: the metafile)", () => {
      expect(built.error).toBeNull();
      expect(built.metafile, "buildCheck() returns esbuild's metafile").toBeTypeOf("object");
      const inputs = Object.keys(built.metafile.inputs ?? {});
      expect(inputs.length, "at least the entry").toBeGreaterThan(0);
      const normalised = inputs.map((input) => relative(root, resolve(root, input)).split("\\").join("/"));
      expect(normalised.filter((path) => !path.startsWith("packages/") || path.startsWith("..") || path.includes("node_modules"))).toEqual([]);
      expect(normalised).toContain("packages/check/src/main.js");
      for (const path of normalised) expect(path, "a source, not a generated file").not.toMatch(/\/dist\//);
    });

    it("has one JavaScript output, the bundle: nothing is split into a chunk", () => {
      expect(built.error).toBeNull();
      const outputs = Object.keys(built.metafile?.outputs ?? {});
      expect(outputs.map((o) => o.split("/").pop())).toEqual([BUNDLE]);
    });
  });
});

/* ---- The lists the scripts read -------------------------------------------------- */

describe("scripts/luz-packages.js: tools are published and have no CSS", () => {
  it("TOOLS is [check]: after the libraries, not a kind of site, not a base package", () => {
    expect(TOOLS).toEqual(["check"]);
    expect(SITE_KINDS).not.toContain("check");
    expect(BASE).not.toContain("check");
    expect(PACKAGES, "PACKAGES stays the CSS libraries: the docs tests and the CSS probes read it").toEqual([...BASE, ...SITE_KINDS]);
    expect(PACKAGES).not.toContain("check");
  });

  it("PUBLISHED is [...PACKAGES, ...TOOLS]: check is published last, nothing depends on it", () => {
    expect(PUBLISHED).toEqual([...PACKAGES, ...TOOLS]);
    expect(PUBLISHED.at(-1)).toBe("check");
  });

  it("documents TOOLS in the header comment of the file", () => {
    expect(readOr("scripts/luz-packages.js")).toMatch(/TOOLS/);
  });
});

describe("the release scripts read PUBLISHED, and the CSS probes keep PACKAGES", () => {
  for (const file of ["scripts/check-pack.js", "scripts/publish.js"]) {
    it(`${file} imports PUBLISHED and has no PACKAGES left (security review: publish.js and check-pack.js)`, () => {
      const text = code(readOr(file));
      expect(text).toMatch(/import \{[^}]*\bPUBLISHED\b[^}]*\} from ["']\.\/luz-packages\.js["']/);
      expect(text).toMatch(/for \(const \w+ of PUBLISHED\)/);
      expect(text).not.toMatch(/\bPACKAGES\b/);
    });
  }

  it("scripts/smoke-consumer.js packs and installs PUBLISHED, and still probes PACKAGES for CSS", () => {
    const text = code(readOr("scripts/smoke-consumer.js"));
    expect(text).toMatch(/import \{[^}]*\bPUBLISHED\b[^}]*\} from ["']\.\/luz-packages\.js["']/);
    expect(text).toMatch(/const tarballs = PUBLISHED\.map\(/);
    expect(text, "the stylesheets are still probed for the libraries").toMatch(/\bPACKAGES\b/);
  });

  it("scripts/smoke-consumer.js runs the installed bin of check on the pass and fail fixtures", () => {
    const text = readOr("scripts/smoke-consumer.js");
    expect(text).toContain("luz-check");
    expect(text).toMatch(/fixtures\/check\/pass|["']pass["']/);
    expect(text).toMatch(/fixtures\/check\/fail|["']fail["']/);
  });

  it("scripts/check-dist.js has the bundle as the sentinel of check", () => {
    expect(readOr("scripts/check-dist.js")).toContain("../packages/check/dist/luz-check.js");
  });

  it("scripts/qa-release.js counts packages/check/src among the sources it reports", () => {
    const line = readOr("scripts/qa-release.js").split("\n").find((l) => l.startsWith("const uiFiles")) ?? "";
    const group = line.match(/\^packages\\\/\(([^)]*)\)\\\/src\\\//)?.[1] ?? "";
    expect(group.split("|").sort()).toEqual(["app", "check", "cms", "core", "landing", "site", "tokens"]);
  });

  it("the root build ends with the bundle of check, after app: root script luzcheck:build (spec 7.1)", () => {
    const pkg = json("package.json");
    expect(pkg.scripts?.["luzcheck:build"]).toBe("node scripts/build-check.js");
    expect(pkg.scripts?.build).toMatch(/pnpm app:build && pnpm luzcheck:build$/);
  });

  it("the root has no script that npm runs on its own for check (no pre or post hook of the release scripts)", () => {
    const names = Object.keys(json("package.json").scripts ?? {});
    expect(names, "the root script luzcheck:build exists").toContain("luzcheck:build");
    expect(names.filter((n) => /^(pre|post)(release:version|luzcheck:build)$/.test(n))).toEqual([]);
  });
});

/* ---- ESLint: the Node block of packages/check/src --------------------------------- */

describe("eslint.config.js: packages/check/src is Node code, with an allow-list", () => {
  const eslint = new ESLint();
  const file = "packages/check/src/main.js";
  /** Severity-2 messages as "line ruleId" for a module linted as that file. */
  const errors = async (text, filePath = file) => {
    const [result] = await eslint.lintText(text, { filePath });
    return result.messages.filter((m) => m.severity === 2).map((m) => `${m.line} ${m.ruleId ?? m.message}`);
  };

  const CLEAN = [
    'import { readFileSync } from "node:fs";',
    'import { resolve } from "node:path";',
    'import { fileURLToPath } from "node:url";',
    'import { run } from "./cli.js";',
    'import { contrast } from "../../tokens/lib/contrast.js";',
    "const text = readFileSync(resolve(fileURLToPath(import.meta.url)), 'utf-8');",
    "process.stdout.write(String(run(text, contrast)));",
    "process.exitCode = 1;",
    "",
  ].join("\n");

  it("lets node:fs, node:path, node:url, relative files and process.stdout.write through", async () => {
    expect(await errors(CLEAN)).toEqual([]);
  });

  it("is no longer the page-code block: a write() and a Node global are not HTML sinks there", async () => {
    expect(await errors('process.stdout.write("x");\nprocess.stderr.write("y");\nconsole.log(Buffer.from("z"));\n')).toEqual([]);
  });

  const FORBIDDEN = ["child_process", "net", "dgram", "dns", "tls", "http", "https", "http2", "vm", "worker_threads", "cluster", "module"];
  for (const name of FORBIDDEN) {
    for (const specifier of [name, `node:${name}`]) {
      it(`rejects import of "${specifier}"`, async () => {
        expect(await errors(CLEAN), "the Node block lets the allow-list through").toEqual([]);
        const found = await errors(`import * as x from "${specifier}";\nexport { x };\n`);
        expect(found.filter((e) => e.endsWith("no-restricted-imports"))).toHaveLength(1);
      });
    }
  }

  for (const specifier of ["node:os", "node:crypto", "node:stream", "node:readline", "lodash"]) {
    it(`rejects "${specifier}", which is not on the allow-list`, async () => {
      expect(await errors(CLEAN), "the Node block lets the allow-list through").toEqual([]);
      const found = await errors(`import * as x from "${specifier}";\nexport { x };\n`);
      expect(found.filter((e) => e.endsWith("no-restricted-imports"))).toHaveLength(1);
    });
  }

  const CAPABILITIES = {
    "eval": 'export const a = eval("1");',
    "new Function": 'export const a = new Function("return 1")();',
    "fetch": 'export const a = fetch("x");',
    "process.env": "export const a = process.env.HOME;",
    "a computed import()": 'const name = "./x.js";\nexport const a = await import(name);',
  };
  for (const [name, text] of Object.entries(CAPABILITIES)) {
    it(`rejects ${name}`, async () => {
      expect(await errors(CLEAN), "the Node block lets the allow-list through").toEqual([]);
      expect(await errors(`${text}\n`)).not.toEqual([]);
    });
  }

  it("still holds the page-code rules for every other package: core's source may not import a bare module", async () => {
    expect(await errors('import { x } from "lodash";\nexport { x };\n', "packages/core/src/x.js")).not.toEqual([]);
  });
});

/* ---- The release: a changeset, out of the fixed group, and the coupling rule ------ */

describe("the changesets: @luz-ds/check has its own version (D7)", () => {
  const config = JSON.parse(read(".changeset/config.json"));
  const dir = `${root}.changeset/`;
  const changesets = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((file) => {
      const text = readFileSync(`${dir}${file}`, "utf-8");
      const head = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      const bumps = [...head.matchAll(/^["']?(@luz-ds\/[\w-]+)["']?\s*:\s*(major|minor|patch)\s*$/gm)].map((m) => ({ name: m[1], level: m[2] }));
      return { file, text, bumps };
    });

  it("keeps check out of `fixed` and `linked` and out of `ignore`: tokens, core and site stay the only group", () => {
    expect(config.fixed).toEqual([["@luz-ds/tokens", "@luz-ds/core", "@luz-ds/site"]]);
    expect(JSON.stringify([config.fixed, config.linked, config.ignore])).not.toContain("@luz-ds/check");
  });

  it("has a minor changeset for @luz-ds/check that says what it is (it releases as 0.1.0)", () => {
    const own = changesets.filter((c) => c.bumps.some((b) => b.name === "@luz-ds/check" && b.level === "minor"));
    expect(own.length, "a changeset with \"@luz-ds/check\": minor").toBeGreaterThan(0);
    for (const c of own) expect(c.text.replace(/^---[\s\S]*?\n---/, "").trim().length, `${c.file} has a description`).toBeGreaterThan(40);
  });

  it("never bumps check by a major", () => {
    expect(changesets.filter((c) => c.bumps.some((b) => b.name === "@luz-ds/check" && b.level === "major")).map((c) => c.file)).toEqual([]);
  });

  it("couples: every changeset that names another @luz-ds package also names @luz-ds/check (7.3), so a release never ships a stale snapshot", () => {
    const uncoupled = changesets
      .filter((c) => c.bumps.some((b) => b.name !== "@luz-ds/check") && !c.bumps.some((b) => b.name === "@luz-ds/check"))
      .map((c) => c.file);
    expect(uncoupled).toEqual([]);
  });
});
