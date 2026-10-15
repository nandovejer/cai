/**
 * F5 step 9, the data @luz-ds/check reads (.claude/plans/specs/f5-ai-ready.md
 * 5.1 layout, 5.4 "Where the facts come from", 5.6 attr/unknown-hook; the
 * review answers of security-auditor Q5 and the notes from step 8 on the
 * budget).
 *
 * Two things that the rules of tests/check-rules-names.test.js stand on:
 *
 * 1. `hooks` in classes.json. attr/unknown-hook has to know the data-luz-*
 *    names that LUZ reads but no element declares (data-luz-classless,
 *    data-luz-sort, data-luz-spy, data-luz-themes). The class manifest of
 *    step 2 holds none, so the generator (scripts/ai-manifests.js) adds
 *      "hooks": ["data-luz-classless", ...]
 *    as the LAST key, only when the package reads at least one, so a package
 *    with none keeps the manifest of step 2 byte for byte. The names are the
 *    attribute selectors of the unminified CSS of dist/ ([data-luz-x],
 *    [data-luz-x="y"]) and, in the unminified .js of dist/, `dataset.luzFooBar`
 *    (data-luz-foo-bar) and the literals "data-luz-x"; never a data-luz-label-*
 *    (that family is accepted by prefix), never from a .min file; sorted, once.
 *
 * 2. The snapshot: scripts/build-check.js writes, beside luz-check.js, the
 *    facts of the six packages of this release, for a project that has no
 *    node_modules/@luz-ds (it uses a CDN). It is DATA, read at run time, never
 *    inlined in the bundle, so the bundle stays under the `check CLI` row of
 *    budgets.json (40,960 B gzip) however many classes LUZ has:
 *
 *      dist/data/index.json
 *          { "schema": 1, "packages": [{ "package": "@luz-ds/tokens", "version": "0.0.0" }, ...] }
 *          the six, in dependency order, the version of each package.json
 *      dist/data/<pkg>/classes.json          for each of tokens, core, site, landing, cms, app
 *          { schema, package, version, classes, properties, hooks? }
 *          the package's dist/classes.json with only what a rule reads:
 *          classes [{ name, kind, defined, block?, modifier?, part?, hosts? }],
 *          properties [{ name, scope }], hooks as in the manifest. No layer,
 *          no files, no text.
 *      dist/data/<core|site>/custom-elements.json    only the packages that have one
 *          the Custom Elements Manifest reduced to { schemaVersion, modules:
 *          [{ kind, path, declarations: [{ kind, name, customElement, tagName,
 *          attributes: [{ name }] }] }] }: names, no description, type,
 *          default, demos, exports or readme.
 *      dist/data/tokens/tokens.css                       (step 11)
 *          LUZ's tokens as the theme rules read them: what the contrast
 *          engine of packages/tokens/lib reads (the --luz-* declarations,
 *          the colour ones at least), in the shape its parser reads; the
 *          tests/check-theme.test.js proves the verdicts are the engine's on
 *          the full dist/tokens.css. No comments and nothing it does not
 *          read: with the full file the folder would pass 56 KiB.
 *
 *    The same parser reads it and the package's own dist/ files. Two builds
 *    write the same bytes; the folder is under 56 KiB; packages/check/
 *    pack-files.txt lists every file of it.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { buildClassManifest, formatClassManifest, writeManifests } from "../scripts/ai-manifests.js";
import { LAYERS } from "../scripts/luz-layers.js";
import { buildCheckTo, builtOnce, removeBuilds, root } from "./helpers/check-build.js";

afterAll(removeBuilds);

const LIBRARIES = ["tokens", "core", "site", "landing", "cms", "app"];
const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));

/* ---- hooks in classes.json ------------------------------------------------------------------- */

describe("classes.json: the hooks a package reads", () => {
  const roots = [];
  afterEach(() => {
    for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function fixtureRoot(files) {
    const dir = mkdtempSync(join(tmpdir(), "luz-hooks-"));
    roots.push(dir);
    const put = (path, text) => {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    };
    put("packages/core/package.json", JSON.stringify({ name: "@luz-ds/core", version: "1.2.3", exports: { "./css": "./dist/luz.css" } }));
    for (const [path, text] of Object.entries(files)) put(`packages/core/dist/${path}`, text);
    return dir;
  }

  const ORDER = `@layer ${LAYERS.map((l) => `luz.${l}`).join(", ")};\n`;
  const CSS = `${ORDER}@layer luz.components {\n  .luz-btn { color: red; }\n  th[data-luz-sort] { cursor: pointer; }\n  [data-luz-classless] .luz-btn { margin: 0; }\n  [data-luz-state="open"] .luz-btn { margin: 0; }\n}\n`;
  const JS = [
    "export function go(root) {",
    '  root.dataset.luzFooBar = "1";',
    '  root.querySelector("[data-luz-spy]");',
    '  root.setAttribute("data-luz-ready", "");',
    '  return root.getAttribute("data-luz-label-next");',
    "}",
    "",
  ].join("\n");

  it("lists the data-luz-* names of the attribute selectors and of the script, sorted and once", () => {
    const dir = fixtureRoot({ "luz.css": CSS, "luz.js": JS, "components/button.css": `${ORDER}@layer luz.components {\n  [data-luz-sort] .luz-btn { margin: 0; }\n}\n` });
    const manifest = buildClassManifest("core", { root: dir });
    expect(manifest.hooks).toEqual(["data-luz-classless", "data-luz-foo-bar", "data-luz-ready", "data-luz-sort", "data-luz-spy", "data-luz-state"]);
  });

  it("leaves out the label overrides and every minified file", () => {
    const dir = fixtureRoot({
      "luz.css": CSS,
      "luz.js": JS,
      "luz.min.css": "[data-luz-minonly]{margin:0}",
      "luz.min.js": 'a.dataset.luzMinOnly="1";',
    });
    const hooks = buildClassManifest("core", { root: dir }).hooks;
    expect(hooks, "hooks in the manifest").toBeDefined();
    expect(hooks.filter((name) => name.startsWith("data-luz-label-"))).toEqual([]);
    expect(hooks.filter((name) => /minonly/i.test(name))).toEqual([]);
  });

  it("is last in the manifest, written and parsed back the same", () => {
    const dir = fixtureRoot({ "luz.css": CSS, "luz.js": JS });
    const manifest = buildClassManifest("core", { root: dir });
    expect(Object.keys(manifest)).toEqual(["schema", "package", "version", "classes", "properties", "hooks"]);
    const text = formatClassManifest(manifest);
    expect(JSON.parse(text)).toStrictEqual(manifest);
    expect(text.endsWith("}\n")).toBe(true);
    const written = writeManifests("core", { root: dir });
    expect(readJson(join(dir, "packages/core/dist/classes.json"))).toStrictEqual(written);
  });

  it("has no `hooks` key when the package reads none: the manifest of step 2 is unchanged", () => {
    const dir = fixtureRoot({ "luz.css": `${ORDER}@layer luz.components {\n  .luz-btn { color: red; }\n}\n`, "luz.js": "export {};\n" });
    const manifest = buildClassManifest("core", { root: dir });
    expect("hooks" in manifest).toBe(false);
    expect(Object.keys(manifest)).toEqual(["schema", "package", "version", "classes", "properties"]);
  });

  it("is in the six real manifests: core reads classless, sort, spy and themes; tokens reads none", () => {
    const core = buildClassManifest("core");
    expect(core.hooks, "hooks in the manifest of core").toBeDefined();
    for (const name of ["data-luz-classless", "data-luz-sort", "data-luz-spy", "data-luz-themes"]) expect(core.hooks, name).toContain(name);
    expect("hooks" in buildClassManifest("tokens")).toBe(false);
    for (const name of LIBRARIES) {
      const { hooks = [] } = buildClassManifest(name);
      expect(hooks, name).toEqual([...new Set(hooks)].sort());
      for (const hook of hooks) {
        expect(hook, `${name}: ${hook}`).toMatch(/^data-luz-[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(hook.startsWith("data-luz-label-"), `${name}: ${hook}`).toBe(false);
      }
    }
  });

  it("is what the built dist/classes.json of each package says (the build has run since the generator changed)", () => {
    for (const name of LIBRARIES) {
      const path = `${root}packages/${name}/dist/classes.json`;
      expect(existsSync(path), `${name} is built (pnpm build)`).toBe(true);
      expect(readJson(path), name).toStrictEqual(buildClassManifest(name));
    }
  });
});

/* ---- dist/data ------------------------------------------------------------------------------------- */

describe("dist/data: the snapshot of this release, beside the bundle", () => {
  let built;
  beforeAll(async () => {
    built = await builtOnce();
  });

  const dataDir = () => {
    expect(built.error, "buildCheck({ outdir }) builds").toBeNull();
    expect(existsSync(join(built.outdir, "data")), "buildCheck writes data/ beside luz-check.js").toBe(true);
    return join(built.outdir, "data");
  };
  const snapshot = (...parts) => readJson(join(dataDir(), ...parts));
  const manifestOf = (name) => readJson(`${root}packages/${name}/dist/classes.json`);
  const filesUnder = (dir, prefix = "") =>
    readdirSync(join(dir, prefix))
      .sort()
      .flatMap((entry) => {
        const rel = prefix ? `${prefix}/${entry}` : entry;
        return statSync(join(dir, rel)).isDirectory() ? filesUnder(dir, rel) : [rel];
      });

  it("is written by buildCheck({ outdir }) next to luz-check.js", () => {
    expect(existsSync(join(dataDir(), "index.json")), "data/index.json").toBe(true);
  });

  it("holds exactly index.json, the six classes.json, the custom-elements.json of core and site, and LUZ's tokens for the theme rules", () => {
    expect(built.error).toBeNull();
    expect(filesUnder(dataDir())).toEqual([
      "app/classes.json",
      "cms/classes.json",
      "core/classes.json",
      "core/custom-elements.json",
      "index.json",
      "landing/classes.json",
      "site/classes.json",
      "site/custom-elements.json",
      "tokens/classes.json",
      "tokens/tokens.css",
    ]);
  });

  it("says which release it is: the six packages in dependency order, with their versions", () => {
    expect(built.error).toBeNull();
    const index = snapshot("index.json");
    expect(Object.keys(index)).toEqual(["schema", "packages"]);
    expect(index.schema).toBe(1);
    expect(index.packages).toEqual(LIBRARIES.map((name) => ({ package: `@luz-ds/${name}`, version: readJson(`${root}packages/${name}/package.json`).version })));
  });

  it.each(LIBRARIES)("%s/classes.json has the names, kinds, definitions and BEM split of the package's manifest, and nothing else", (name) => {
    expect(built.error).toBeNull();
    const source = manifestOf(name);
    const copy = snapshot(name, "classes.json");
    expect(copy.schema).toBe(1);
    expect(copy.package).toBe(source.package);
    expect(copy.version).toBe(source.version);
    expect(Object.keys(copy).every((k) => ["schema", "package", "version", "classes", "properties", "hooks"].includes(k)), Object.keys(copy).join()).toBe(true);
    expect(copy.classes.map((c) => c.name)).toEqual(source.classes.map((c) => c.name));
    copy.classes.forEach((entry, i) => {
      const from = source.classes[i];
      expect(Object.keys(entry).every((k) => ["name", "kind", "defined", "block", "modifier", "part", "hosts"].includes(k)), entry.name).toBe(true);
      for (const field of ["kind", "defined", "block", "modifier", "part", "hosts"]) expect(entry[field], `${entry.name}.${field}`).toEqual(from[field]);
    });
    expect(copy.properties).toEqual(source.properties.map(({ name: property, scope }) => ({ name: property, scope })));
    expect(copy.hooks).toEqual(source.hooks);
  });

  it("carries `hosts` where the manifest has them: luz-btn's list in core, so the misuse rules work for a project that has no node_modules", () => {
    expect(built.error).toBeNull();
    const buttons = snapshot("core", "classes.json").classes.find((c) => c.name === "luz-btn");
    expect(buttons.hosts).toStrictEqual(["a", "button", "input[type=button]", "input[type=submit]", "input[type=reset]"]);
    expect(Object.keys(buttons).at(-1), "hosts is the last key, as in the manifest").toBe("hosts");
    for (const name of LIBRARIES) {
      const from = new Map(manifestOf(name).classes.map((c) => [c.name, c]));
      for (const c of snapshot(name, "classes.json").classes) {
        expect("hosts" in c, `${name} ${c.name}`).toBe("hosts" in from.get(c.name));
      }
    }
  });

  it.each(["core", "site"])("%s/custom-elements.json keeps the tags and the attribute names of the manifest, with no text", (name) => {
    expect(built.error).toBeNull();
    const source = readJson(`${root}packages/${name}/dist/custom-elements.json`);
    const copy = snapshot(name, "custom-elements.json");
    expect(Object.keys(copy)).toEqual(["schemaVersion", "modules"]);
    expect(copy.schemaVersion).toBe(source.schemaVersion);
    const declarations = (manifest) => manifest.modules.flatMap((m) => m.declarations ?? []);
    expect(declarations(copy).map((d) => d.tagName)).toEqual(declarations(source).map((d) => d.tagName));
    declarations(copy).forEach((declaration, i) => {
      expect(Object.keys(declaration).every((k) => ["kind", "name", "customElement", "tagName", "attributes"].includes(k)), declaration.tagName).toBe(true);
      expect(declaration.attributes).toEqual((declarations(source)[i].attributes ?? []).map(({ name: attribute }) => ({ name: attribute })));
    });
    expect(JSON.stringify(copy)).not.toMatch(/"(?:description|demos|type|default|exports|readme|superclass)"/);
  });

  it("is small: each classes.json is smaller than its manifest, and the whole folder is under 56 KiB", () => {
    expect(built.error).toBeNull();
    for (const name of LIBRARIES) {
      expect(statSync(join(dataDir(), name, "classes.json")).size, name).toBeLessThan(statSync(`${root}packages/${name}/dist/classes.json`).size);
    }
    const total = filesUnder(dataDir()).reduce((sum, file) => sum + statSync(join(dataDir(), file)).size, 0);
    expect(total).toBeLessThanOrEqual(56 * 1024);
  });

  it("is the same bytes in two builds", async () => {
    const first = dataDir();
    const second = await buildCheckTo("data-b");
    expect(second.error).toBeNull();
    const again = join(second.outdir, "data");
    expect(existsSync(again), "the second build writes data/").toBe(true);
    expect(filesUnder(again)).toEqual(filesUnder(first));
    for (const file of filesUnder(first)) expect(readFileSync(join(again, file), "utf-8"), file).toBe(readFileSync(join(first, file), "utf-8"));
  });

  it("has no date and no path of this machine", () => {
    expect(built.error).toBeNull();
    for (const file of filesUnder(dataDir())) {
      const text = readFileSync(join(dataDir(), file), "utf-8");
      expect(text, file).not.toContain(root);
      expect(text, file).not.toContain(built.outdir);
      expect(text, file).not.toMatch(/\b20\d\d-\d\d-\d\dT\d\d:\d\d/);
    }
  });

  it("is not inlined in the bundle: a class of the manifests that no source of the tool names is not in luz-check.js", () => {
    expect(built.error).toBeNull();
    const sources = [`${root}packages/check/src`, `${root}packages/tokens/lib`]
      .flatMap((dir) => filesUnder(dir).map((file) => readFileSync(join(dir, file), "utf-8")))
      .join("\n");
    const names = LIBRARIES.flatMap((name) => manifestOf(name).classes.map((c) => c.name)).filter((n) => n.length >= 12 && !sources.includes(n));
    expect(names.length).toBeGreaterThan(50);
    expect(names.filter((n) => built.code.includes(n))).toEqual([]);
  });

  it("is listed in packages/check/pack-files.txt, file by file", () => {
    const listed = readFileSync(`${root}packages/check/pack-files.txt`, "utf-8").split("\n");
    for (const file of filesUnder(dataDir())) expect(listed, `dist/data/${file}`).toContain(`dist/data/${file}`);
  });
});
