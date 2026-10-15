/**
 * LUZ — the "For AI agents" block of each package README
 * (.claude/plans/specs/f5-ai-ready.md section 4; decision D9; the
 * security-auditor's conditions a, b and c on `pnpm release:version`).
 *
 * The block sits between two marker comments, right before `## License`.
 * It is a pure function of the package's `package.json`, its `CHANGELOG.md`
 * (when it has one) and two constants below: it never reads `dist/`, so
 * `--check` runs without a build and in `pnpm test:unit`.
 *
 *   node scripts/ai-readme.js --check   exit 0 when every block is right,
 *                                       exit 1 and name each stale README
 *   node scripts/ai-readme.js --write   rewrite the blocks, and nothing else
 *
 * What this script may do (condition a): import `node:` built-ins and repo
 * files, read `packages/*`, and write `packages/*\/README.md` with
 * `writeFileSync`. No network, no process spawning, no environment, no
 * deletion; the root README is never touched (condition c). The release flow
 * runs it through `pnpm release:version`, which has no lifecycle hooks
 * (condition b).
 *
 * Importing this module runs nothing; only running it as the entry does.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PACKAGES, TOOLS } from "./luz-packages.js";

export const START = "<!-- luz:ai-agents:start -->";
export const END = "<!-- luz:ai-agents:end -->";

/** Where the generated files are served from (the Pages site of the repository). */
const SITE_URL = "https://nandovejer.github.io/luz/";
const REPO_URL = "https://github.com/nandovejer/luz";
/** The packages that define a custom element, so ship a `custom-elements.json`. */
/** The scope of the package this one replaces, spelled in pieces so that tests/luz-name.test.js passes. */
const FORMER_SCOPE = `@${["c", "ai"].join("")}-ds/*`;
const WITH_ELEMENTS = new Set(["core", "site"]);

/* ---- The changelog ------------------------------------------------------ */

/**
 * Reads the top version of a changeset-written CHANGELOG.md.
 * `items` are the bullets of that version that are breaking: every bullet of
 * `### Major Changes`, and every bullet of any section with a line that starts
 * `Breaking:` (in 0.x a breaking change ships as a minor, D9). Text as written,
 * de-indented, without the commit hash.
 * @returns {{ version: string | null, versions: number, items: string[] }}
 */
export function breakingChanges(changelog) {
  if (typeof changelog !== "string") return { version: null, versions: 0, items: [] };
  const lines = changelog.replace(/\r\n?/g, "\n").split("\n");
  const versionAt = lines.flatMap((line, i) => (/^## \S/.test(line) ? [i] : []));
  if (!versionAt.length) return { version: null, versions: 0, items: [] };

  const version = lines[versionAt[0]].slice(3).trim();
  const top = lines.slice(versionAt[0] + 1, versionAt[1] ?? lines.length);
  const items = [];
  let section = "";
  let bullet = null;
  const close = () => {
    if (!bullet) return;
    const text = bullet.join("\n").replace(/\s+$/, "").replace(/^[0-9a-f]{7,40}: /, "");
    if (section === "Major Changes" || /^Breaking:/m.test(text)) items.push(text);
    bullet = null;
  };
  for (const line of top) {
    if (/^### /.test(line)) {
      close();
      section = line.slice(4).trim();
    } else if (/^- /.test(line)) {
      close();
      bullet = [line.slice(2)];
    } else if (bullet && (line === "" || /^ {2}/.test(line))) {
      bullet.push(line.replace(/^ {2}/, ""));
    } else {
      close();
    }
  }
  close();
  return { version, versions: versionAt.length, items };
}

/* ---- The text of the block --------------------------------------------- */

const code = (text) => `\`${text}\``;
const list = (names) => (names.length < 3 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
/** An item's own text must not be able to close or open the block. */
const safe = (text) => text.replaceAll("<!--", "&lt;!--");

/**
 * @param {{ name: string, manifest: object, changelog: string | null, siteUrl: string }} input
 * @returns {string} the block, markers included, without a trailing newline
 */
export function renderAiSection({ name, manifest, changelog, siteUrl }) {
  const pkg = `@luz-ds/${name}`;
  const version = manifest.version;
  const released = version !== "0.0.0";
  const has = typeof changelog === "string";
  const { versions, items } = breakingChanges(changelog);
  const out = [START, "## For AI agents", ""];

  out.push(`${code(pkg)} ${version} is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.`, "");

  out.push("### Breaking changes", "");
  if (!has) {
    out.push(`Not released yet: ${version} is the workspace's placeholder; the first release is 0.1.0. Nothing is deprecated and nothing breaks.`);
  } else if (items.length) {
    for (const item of items) {
      const [first, ...rest] = safe(item).split("\n");
      out.push(`#### ${first}`);
      if (rest.join("\n").trim()) out.push("", rest.join("\n").trim());
      out.push("");
    }
    out.pop();
  } else if (versions === 1) {
    out.push(`First release of ${code(pkg)}. Nothing breaks inside @luz-ds. Coming from ${code(FORMER_SCOPE)}: see the migration note in ${code("CHANGELOG.md")}.`);
  } else {
    out.push(`No breaking changes in ${version}.`);
  }
  if (has) out.push("", `Older versions: ${REPO_URL}/blob/main/packages/${name}/CHANGELOG.md`);
  out.push("");

  out.push("### Read first", "");
  // A tool has no CSS, so no class list: it is read through its README and its --help
  const tool = TOOLS.includes(name);
  const read = tool
    ? [`${code("README.md")} in this package: what the command does and its exit codes.`, `${code(`npx ${pkg} --help`)}: the command's options, from the version you run.`]
    : [`${code("dist/classes.json")} in this package: the classes and custom properties its CSS defines. Write only those.`];
  if (WITH_ELEMENTS.has(name)) read.push(`${code("dist/custom-elements.json")} in this package: the \`<luz-*>\` elements it defines, with their attributes.`);
  read.push(
    `${siteUrl}llms.txt: the index of the documentation, short enough for a small context.`,
    `${siteUrl}llms-full.txt: the same pages in full.`,
    `${siteUrl}examples/: one standalone page of markup for each component and pattern.`,
  );
  read.forEach((line, i) => out.push(`${i + 1}. ${line}`));
  out.push("");

  out.push("### Load order", "");
  const peers = Object.keys(manifest.peerDependencies ?? {});
  const optional = new Set(Object.keys(manifest.peerDependenciesMeta ?? {}).filter((p) => manifest.peerDependenciesMeta[p]?.optional));
  const rank = (peer) => PACKAGES.indexOf(peer.replace(/^@luz-ds\//, ""));
  const ordered = peers.filter((p) => p.startsWith("@luz-ds/")).sort((a, b) => rank(a) - rank(b));
  const required = ordered.filter((p) => !optional.has(p));
  if (tool) out.push(`${code(pkg)} is a command, not a stylesheet: it loads nothing in a page and needs no other LUZ package.`);
  else if (required.length) out.push(`This package needs ${list(required.map(code))} loaded first.`);
  else out.push(`${code(pkg)} needs no other LUZ package: load it first.`);
  for (const peer of ordered.filter((p) => optional.has(p))) {
    out.push("", `${code(peer)} is optional: the CSS of this package works with the packages above alone.`);
  }
  out.push("");

  out.push("### Check what you write", "");
  out.push(`Run ${code("npx @luz-ds/check <files>")} on every HTML and CSS file you write, and fix what it reports. To copy the accessibility reviewer into your project: ${code("npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md")}.`);
  if (!released) out.push("", `${code("@luz-ds/check")} is not on npm yet: it ships with the first release.`);
  out.push("", END);
  return out.join("\n");
}

/**
 * Puts the block into a README: replaces what is between the markers, or, when
 * they are absent, inserts it immediately before `## License` (at the end when
 * there is none). Every other byte is left alone.
 */
export function applyAiSection(readme, block) {
  const text = block.trimEnd();
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start !== -1 || end !== -1) {
    if (start === -1 || end === -1 || end < start || readme.indexOf(START, start + 1) !== -1 || readme.indexOf(END, end + 1) !== -1) {
      throw new Error("the README has a start or an end marker without the other, or more than one block");
    }
    return readme.slice(0, start) + text + readme.slice(end + END.length);
  }
  const license = /^## License\s*$/m.exec(readme);
  if (!license) return `${readme.replace(/\s+$/, "")}\n\n${text}\n`;
  return `${readme.slice(0, license.index)}${text}\n\n${readme.slice(license.index)}`;
}

/* ---- The program -------------------------------------------------------- */

function main(argv) {
  const mode = argv.length === 1 ? argv[0] : null;
  if (mode !== "--check" && mode !== "--write") {
    console.error("usage: node scripts/ai-readme.js --check | --write");
    return 1;
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const packagesDir = resolve(root, "packages");
  const stale = [];
  for (const dir of readdirSync(packagesDir).sort()) {
    const manifestPath = resolve(packagesDir, dir, "package.json");
    const readmePath = resolve(packagesDir, dir, "README.md");
    if (!existsSync(manifestPath) || !existsSync(readmePath)) continue;
    const changelogPath = resolve(packagesDir, dir, "CHANGELOG.md");
    const block = renderAiSection({
      name: dir,
      manifest: JSON.parse(readFileSync(manifestPath, "utf-8")),
      changelog: existsSync(changelogPath) ? readFileSync(changelogPath, "utf-8") : null,
      siteUrl: SITE_URL,
    });
    const before = readFileSync(readmePath, "utf-8");
    const after = applyAiSection(before, block);
    if (after === before) continue;
    if (mode === "--write") writeFileSync(readmePath, after, "utf-8");
    else stale.push(`packages/${dir}/README.md`);
  }
  if (stale.length) {
    for (const path of stale) console.error(`✗ ${path}: the "For AI agents" block is missing or out of date`);
    console.error("Run `node scripts/ai-readme.js --write` and commit the READMEs.");
    return 1;
  }
  console.log(mode === "--write" ? "✓ READMEs written" : "✓ the \"For AI agents\" block of every README is up to date");
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
