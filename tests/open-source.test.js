/**
 * F7 · Open source (spec .claude/plans/specs/f7-open-source.md, steps 1 to 8):
 * what a stranger finds in the repository must be short, licensed, and
 * enforced by the same gates as everything else. This file reads the files
 * of the repository, no script; the scripts have tests of their own
 * (check-license.test.js, check-red-commit.test.js, open-source-message.test.js).
 *
 *   CONTRIBUTING.md        at most 70 lines; the MIT sentence (inbound = outbound),
 *                          `pnpm check:all`, the `test:` red commit, Discussions and the
 *                          public Project, links to CODE_OF_CONDUCT.md and to the files
 *                          the long sections moved to (dev/TESTING.md,
 *                          dev/DEFINITION-OF-DONE.md, VERSIONING.md), no emoji
 *   MOVED                  every section of the old CONTRIBUTING.md that is not kept is a
 *                          heading (and a marker phrase) of the file it moved to: nothing lost
 *   CODE_OF_CONDUCT.md     Contributor Covenant 2.1 unchanged, with the enforcement contact
 *                          "Report privately through GitHub: <advisory URL of SECURITY.md>"
 *                          and no e-mail address anywhere
 *   .github/labels.yml     a list of `- name:` / `color:` (six hex digits, no #) /
 *                          `description:`, the twelve labels of the spec
 *   .github/pull_request_template.md   first checkbox = MIT, then Test first, Browsers by issue
 *   .github/ISSUE_TEMPLATE/*.yml       every template has `labels:`, all of them in labels.yml
 *   .github/workflows/ci.yml           jobs `red-commit` and `visual-references`;
 *                          no pull_request_target; every `uses:` pinned by a 40-hex SHA
 *   package.json           `check:all` and `qa:release` are both `node scripts/qa-release.js`;
 *                          `check:license` is `node scripts/check-license.js`, run by qa-release
 *   VERSIONING.md          a "Supported" section; .github/DISCUSSION_TEMPLATE/proposal.yml
 *   dev/BROWSER-REVIEWS.md an "Open" section (Scope, Files, What to look at, Browser);
 *                          the security-auditor agent reads it
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = (rel) => join(repo, rel);
function read(rel) {
  if (!existsSync(path(rel))) throw new Error(`${rel} does not exist`);
  return readFileSync(path(rel), "utf-8");
}
const unquote = (s) => s.trim().replace(/^(["'])(.*)\1$/, "$2");
const flat = (s) => s.replace(/\s+/g, " ");
const linesOf = (text) => text.replace(/\n$/, "").split("\n");

/** `.github/labels.yml`: [{ name, color, description }] from `- name:` items with indented keys. */
function parseLabels(text) {
  const items = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (/^\s*(#.*)?$/.test(line)) continue;
    const start = /^-\s+(\w+):\s*(.*)$/.exec(line);
    if (start) {
      current = { [start[1]]: unquote(start[2]) };
      items.push(current);
      continue;
    }
    const key = /^\s+(\w+):\s*(.*)$/.exec(line);
    if (key && current) current[key[1]] = unquote(key[2]);
  }
  return items;
}

/** The `labels:` of an issue form: an inline list (`["bug"]`) or a block list. */
function labelsOfForm(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^labels:/.test(l));
  if (at < 0) return [];
  const inline = lines[at].slice("labels:".length).trim();
  if (inline.startsWith("[")) return inline.slice(1, inline.lastIndexOf("]")).split(",").map(unquote).filter(Boolean);
  const out = [];
  for (const l of lines.slice(at + 1)) {
    const m = /^\s+-\s+(.*)$/.exec(l);
    if (!m) break;
    out.push(unquote(m[1]));
  }
  return out;
}

/** The text of a job of a workflow: from `  <job>:` to the next two-space key. */
function jobOf(workflow, job) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((l) => l === `  ${job}:`);
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {2}\S/.test(lines[i]) || /^\S/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

/** The lines of the `path:` input of the upload-artifact step of a job (block or single value). */
function uploadPath(job) {
  const lines = job.split("\n");
  const at = lines.findIndex((l) => /^\s+path:/.test(l));
  if (at < 0) return [];
  const inline = lines[at].replace(/^\s+path:\s*/, "").trim();
  if (inline && inline !== "|" && inline !== ">") return [inline];
  const indent = /^\s*/.exec(lines[at])[0].length;
  const out = [];
  for (const l of lines.slice(at + 1)) {
    if (l.trim() === "") continue;
    if (/^\s*/.exec(l)[0].length <= indent) break;
    out.push(l.trim());
  }
  return out;
}

/** The comment lines (# ...) directly above `  <job>:` in a workflow. */
function commentAbove(workflow, job) {
  const lines = workflow.split("\n");
  const at = lines.findIndex((l) => l === `  ${job}:`);
  const out = [];
  for (let i = at - 1; i >= 0 && /^\s*#/.test(lines[i]); i--) out.unshift(lines[i].replace(/^\s*#\s?/, ""));
  return out.join(" ");
}

/* ---- CONTRIBUTING.md ------------------------------------------------------- */

describe("CONTRIBUTING.md is short and says the five things a stranger needs", () => {
  const text = () => read("CONTRIBUTING.md");

  it("has at most 70 lines", () => {
    expect(linesOf(text()).length).toBeLessThanOrEqual(70);
  });

  it("says the contributor licenses the work under MIT, inbound = outbound", () => {
    expect(flat(text())).toContain("By opening a pull request you license your work under the MIT licence, the same as the project: inbound = outbound");
  });

  it("names the one command that runs every check, `pnpm check:all`", () => {
    expect(text()).toContain("pnpm check:all");
  });

  it("asks for the red `test:` commit first, and for the test that reproduces a bug", () => {
    const t = flat(text());
    expect(t).toContain("`test:`");
    expect(t).toMatch(/bug[^.]*starts with the test that reproduces it/i);
  });

  it("asks for the origin of code you did not write, and welcomes AI-written code that you can explain", () => {
    const t = flat(text());
    expect(t).toMatch(/code you did not write/i);
    expect(t).toMatch(/\bAI\b[^.]*(welcome|accepted)/i);
    expect(t).toMatch(/explain/i);
  });

  it("sends proposals to Discussions and work to the public Project", () => {
    expect(flat(text())).toContain("Proposals go to Discussions, work to the public Project");
  });

  it("links the Code of Conduct, the language recipe and the files the long sections moved to", () => {
    const t = text();
    for (const target of ["CODE_OF_CONDUCT.md", "dev/TESTING.md", "dev/DEFINITION-OF-DONE.md", "VERSIONING.md", "AGENTS.md"]) {
      expect(t, target).toContain(`](./${target}`);
    }
    expect(t).toMatch(/AGENTS\.md#[^)]*adding-a-language-to-cores-scripts/);
  });

  it("every relative link points at a file that exists (GitHub's ../../issues style aside)", () => {
    const links = [...text().matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]).filter((h) => !/^(https?:|mailto:|#|\.\.\/\.\.\/)/.test(h));
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect(existsSync(path(href.split("#")[0])), href).toBe(true);
  });

  it("is plain text: no emoji", () => {
    expect(text()).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("nothing of the old CONTRIBUTING.md is lost when it moves", () => {
  /** [file, heading text it must carry, a phrase from the section's body]. */
  const MOVED = [
    ["dev/TESTING.md", "Minimum Automated Baseline", "Theme switch and persistence"],
    ["dev/TESTING.md", "Keyboard Testing", "Escape closes modals/details"],
    ["dev/TESTING.md", "Focus Testing", "No focus traps (unless intended)"],
    ["dev/TESTING.md", "Visual Testing", "High contrast mode readable"],
    ["dev/TESTING.md", "A11y Checklist", "No flashing >3/second"],
    ["dev/TESTING.md", "Modals and dialogs", "Do not write a focus trap"],
    ["dev/DEFINITION-OF-DONE.md", "What a new component has to be", "Something you needed once belongs in your own app."],
    ["dev/DEFINITION-OF-DONE.md", "Adding a token", "packages/tokens/src/semantic.css"],
    ["dev/DEFINITION-OF-DONE.md", "What We Check", "Package boundaries"],
    ["dev/DEFINITION-OF-DONE.md", "Definition of done for a component", "An unticked line blocks the merge."],
    ["dev/DEFINITION-OF-DONE.md", "Documentation", "No page may exceed 80 kB of HTML"],
    ["VERSIONING.md", "Publishing", "Nobody publishes from a local machine."],
    ["VERSIONING.md", "Before opening a PR", "node scripts/check-pack.js --update"],
    ["VERSIONING.md", "Dependency ranges between packages", "Do not use the `workspace:` protocol there"],
  ];

  it.each(MOVED)("%s has the section %s", (file, heading, phrase) => {
    const text = read(file);
    const headings = text.split("\n").filter((l) => /^#{1,6}\s/.test(l));
    expect(
      headings.some((h) => h.toLowerCase().includes(heading.toLowerCase())),
      `a heading containing "${heading}" in ${file}`,
    ).toBe(true);
    expect(text, phrase).toContain(phrase);
  });

  it("dev/DEFINITION-OF-DONE.md carries the twelve ticks of the component checklist", () => {
    const ticks = read("dev/DEFINITION-OF-DONE.md").split("\n").filter((l) => /^- \[ \] (Native element or API|Works with JS disabled|Keyboard:|Screen reader:|320 px|forced-colors|Contrast >=|Only semantic tokens|Strings:|Docs:|Tests added|dist\/ regenerated)/.test(l));
    expect(ticks).toHaveLength(12);
  });
});

/* ---- CODE_OF_CONDUCT.md ------------------------------------------------------ */

describe("CODE_OF_CONDUCT.md is the Contributor Covenant 2.1 with a private GitHub contact", () => {
  const text = () => read("CODE_OF_CONDUCT.md");

  it("names the Contributor Covenant, version 2.1, and keeps its sections", () => {
    const t = text();
    expect(t).toMatch(/Contributor Covenant/);
    expect(t).toContain("version/2/1/code_of_conduct.html");
    for (const section of ["Our Pledge", "Our Standards", "Enforcement Responsibilities", "Scope", "Enforcement", "Enforcement Guidelines", "Correction", "Warning", "Temporary Ban", "Permanent Ban", "Attribution"]) {
      expect(t, section).toMatch(new RegExp(`^#{1,6}\\s+(\\d\\.\\s+)?${section}\\s*$`, "m"));
    }
  });

  it("keeps the wording of the covenant (the pledge and a standard)", () => {
    const t = flat(text());
    expect(t).toContain("We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone");
    expect(t).toContain("Demonstrating empathy and kindness toward other people");
  });

  it("sends reports to the security advisory form of SECURITY.md, with no e-mail address", () => {
    const advisory = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/security\/advisories\/new/.exec(read("SECURITY.md"))?.[0];
    expect(advisory).toBeTruthy();
    const t = text();
    expect(t).toContain(`Report privately through GitHub: ${advisory}`);
    expect(t).not.toContain("[INSERT CONTACT METHOD]");
    expect(t).not.toContain("@");
  });

  it("is linked from CONTRIBUTING.md instead of a five-line section", () => {
    expect(read("CONTRIBUTING.md")).toContain("](./CODE_OF_CONDUCT.md)");
    expect(read("CONTRIBUTING.md")).not.toMatch(/^## Code of Conduct\s*\n\s*\n- Be respectful/m);
  });
});

/* ---- Labels, pull request template, issue templates ----------------------------- */

const LABELS = ["bug", "accessibility", "component", "docs", "language", "tokens", "needs-browser-review", "good first issue", "help wanted", "breaking", "security", "wontfix"];

describe(".github/labels.yml", () => {
  const labels = () => parseLabels(read(".github/labels.yml"));

  it("has the twelve labels, and no other", () => {
    expect(labels().map((l) => l.name).sort()).toEqual([...LABELS].sort());
  });

  it("gives each a six-digit hex colour (no #) and a description", () => {
    for (const l of labels()) {
      expect(l.color, l.name).toMatch(/^[0-9a-fA-F]{6}$/);
      expect((l.description ?? "").length, l.name).toBeGreaterThan(10);
      expect(l.description.length, l.name).toBeLessThanOrEqual(100); // GitHub's limit
    }
  });

  it("says in the description of `security` that reports go private", () => {
    expect(labels().find((l) => l.name === "security")?.description).toMatch(/private/i);
  });
});

describe("issue forms use labels that exist", () => {
  const forms = () => readdirSync(path(".github/ISSUE_TEMPLATE")).filter((f) => f.endsWith(".yml") && f !== "config.yml");

  it("has the three forms", () => {
    expect(forms().sort()).toEqual(["accessibility.yml", "bug.yml", "component.yml"]);
  });

  it.each(["accessibility.yml", "bug.yml", "component.yml"])("%s has labels: and each is in labels.yml", (file) => {
    const known = parseLabels(read(".github/labels.yml")).map((l) => l.name);
    const used = labelsOfForm(read(`.github/ISSUE_TEMPLATE/${file}`));
    expect(used.length, `${file} labels`).toBeGreaterThan(0);
    for (const label of used) expect(known, `${file}: ${label}`).toContain(label);
  });
});

describe(".github/pull_request_template.md", () => {
  const text = () => read(".github/pull_request_template.md");
  const boxes = () => text().split("\n").filter((l) => /^- \[ \] /.test(l));

  it("opens with the MIT box: inbound = outbound, and say where it comes from", () => {
    expect(boxes()[0]).toBe("- [ ] I license this work under the MIT licence (inbound = outbound) and I wrote it or say where it comes from");
  });

  it("has the Test first box", () => {
    expect(boxes()).toContain("- [ ] The first commit is `test:` and fails without the change");
  });

  it("asks for the browser review through the `needs-browser-review` issue, not through Claude's memory", () => {
    const browsers = text().slice(text().indexOf("## Browsers"));
    expect(browsers).toContain("## Browsers");
    expect(browsers).toContain("needs-browser-review");
    expect(text()).not.toMatch(/Claude|memory|luz-browser-review-pending/);
  });
});

describe("proposals, support and the browser reviews are public", () => {
  it("has a Discussions form for proposals with problem, who it affects, and alternatives that use the platform", () => {
    const form = read(".github/DISCUSSION_TEMPLATE/proposal.yml");
    expect(form).toMatch(/^body:/m);
    expect(form).toMatch(/label:\s*.*problem/i);
    expect(form).toMatch(/label:\s*.*who[^\n]*affect/i);
    expect(form).toMatch(/label:\s*.*alternatives/i);
    expect(form).toMatch(/platform/i);
  });

  it("VERSIONING.md has a Supported section: Baseline Widely available, Node LTS, the latest minor of 0.x", () => {
    const text = read("VERSIONING.md");
    const at = text.search(/^##\s+Supported\s*$/m);
    expect(at, "a `## Supported` heading").toBeGreaterThanOrEqual(0);
    const section = text.slice(at).split(/\n## /)[0];
    expect(section).toMatch(/Baseline Widely available/);
    expect(section).toMatch(/active LTS/);
    expect(section).toMatch(/maintenance LTS/);
    expect(section).toMatch(/latest minor/);
  });

  it("README links VERSIONING.md for what is supported", () => {
    expect(read("README.md")).toMatch(/\]\(\.\/VERSIONING\.md(#[^)]*)?\)/);
  });

  it("dev/BROWSER-REVIEWS.md has an Open section: Scope, Files, What to look at, Browser", () => {
    const text = read("dev/BROWSER-REVIEWS.md");
    const at = text.search(/^##\s+Open\s*$/m);
    expect(at, "a `## Open` heading").toBeGreaterThanOrEqual(0);
    const section = text.slice(at).split(/\n## /)[0];
    const header = section.split("\n").find((l) => l.startsWith("|"));
    expect(header?.split("|").map((c) => c.trim()).filter(Boolean)).toEqual(["Scope", "Files", "What to look at", "Browser"]);
    expect(section).toMatch(/needs-browser-review/);
  });

  it("the security-auditor agent reads the Open section, the issues and the private list", () => {
    const agent = read(".claude/agents/security-auditor.md");
    expect(agent).toContain("dev/BROWSER-REVIEWS.md");
    expect(agent).toMatch(/Open/);
    expect(agent).toContain("needs-browser-review");
    expect(agent).toMatch(/\bgh\b/);
    expect(agent).toContain("luz-browser-review-pending.md");
  });
});

/* ---- CI ----------------------------------------------------------------------- */

describe(".github/workflows/ci.yml", () => {
  const ci = () => read(".github/workflows/ci.yml");

  it("never uses pull_request_target", () => {
    expect(ci()).not.toContain("pull_request_target");
  });

  it("keeps `permissions: contents: read` at the top, and grants no write to the new jobs", () => {
    expect(ci()).toMatch(/^permissions:\n {2}contents: read\n/m);
    for (const job of ["red-commit", "visual-references"]) {
      expect(jobOf(ci(), job), `a \`${job}\` job`).not.toBe("");
      expect(jobOf(ci(), job), job).not.toMatch(/:\s*write\b/);
    }
  });

  it("pins every `uses:` by a 40-hex commit SHA", () => {
    const uses = [...ci().matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)/gm)].map((m) => m[1]).filter((u) => !u.startsWith("./"));
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u, u).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/);
  });

  it("has a `red-commit` job on pull requests only, with the history, running scripts/check-red-commit.js on base and head", () => {
    const job = jobOf(ci(), "red-commit");
    expect(job, "a `red-commit` job").not.toBe("");
    expect(job).toMatch(/if:.*github\.event_name == 'pull_request'/);
    expect(job).toContain("fetch-depth: 0");
    expect(job).toContain("scripts/check-red-commit.js");
    expect(job).toContain("github.event.pull_request.base.sha");
    expect(job).toContain("github.event.pull_request.head.sha");
    expect(job).not.toContain("secrets.");
  });

  it("has a `visual-references` job: chromium on Linux, --update-snapshots, an artifact kept 14 days, never committed", () => {
    const job = jobOf(ci(), "visual-references");
    expect(job, "a `visual-references` job").not.toBe("");
    expect(job).toMatch(/runs-on:\s*ubuntu-/);
    expect(job).toContain("--update-snapshots");
    expect(job).toContain("--project=chromium");
    expect(job).toMatch(/actions\/upload-artifact@[0-9a-f]{40}/);
    expect(job).toMatch(/retention-days:\s*14\b/);
    expect(uploadPath(job)).toEqual(["tests/visual.spec.js-snapshots/*.png"]);
    expect(job).not.toMatch(/git (add|commit|push)/);
    expect(job).not.toContain("secrets.");
  });

  it("bounds both new jobs with `timeout-minutes` of 30 at most", () => {
    for (const job of ["red-commit", "visual-references"]) {
      const text = jobOf(ci(), job);
      expect(text, `a \`${job}\` job`).not.toBe("");
      const minutes = /^\s+timeout-minutes:\s*(\d+)\s*$/m.exec(text)?.[1];
      expect(minutes, `${job} timeout-minutes`).toBeDefined();
      expect(Number(minutes), job).toBeGreaterThan(0);
      expect(Number(minutes), job).toBeLessThanOrEqual(30);
    }
  });

  it("uploads only the PNG references of the visual spec, with no `**` glob", () => {
    expect(existsSync(path("tests/visual.spec.js-snapshots")), "the references the artifact is made of").toBe(true);
    expect(readdirSync(path("tests/visual.spec.js-snapshots")).some((f) => f.endsWith(".png"))).toBe(true);
    expect(uploadPath(jobOf(ci(), "visual-references"))).toEqual(["tests/visual.spec.js-snapshots/*.png"]);
  });

  it("says what is true of the references: the CI copies are artifacts only, not committed by CI (the tree tracks others)", () => {
    const comment = commentAbove(ci(), "visual-references");
    expect(comment, "a comment above the job").not.toBe("");
    expect(comment).not.toMatch(/never committed/i);
    expect(comment).toMatch(/artifacts? only/i);
    expect(comment).toMatch(/not committed by (the )?CI/i);
  });

  it("never runs the firefox or webkit projects", () => {
    expect(ci()).not.toMatch(/--project=(firefox|webkit)/);
  });
});

/* ---- package.json ----------------------------------------------------------------- */

describe("one command runs every check", () => {
  const scripts = () => JSON.parse(read("package.json")).scripts;

  it("`check:all` and `qa:release` are the same command, `node scripts/qa-release.js`", () => {
    expect(scripts()["qa:release"]).toBe("node scripts/qa-release.js");
    expect(scripts()["check:all"]).toBe("node scripts/qa-release.js");
  });

  it("`check:license` runs scripts/check-license.js, and qa-release runs it", () => {
    expect(scripts()["check:license"]).toBe("node scripts/check-license.js");
    expect(read("scripts/qa-release.js")).toMatch(/\[pnpm, "check:license"\]/);
  });
});
