/**
 * The agents of `.claude/agents/` follow one naming scheme (a role noun at the
 * end), the mechanical ones run on Sonnet 5.5, and the two hooks of
 * `.claude/hooks/` name agents by that scheme. This test keeps the three in
 * step: a renamed agent that a hook still calls by its old name fails here.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentsDir = resolve(root, ".claude/agents");
const sonnetHook = resolve(root, ".claude/hooks/sonnet-agents.js");
const testsHook = resolve(root, ".claude/hooks/no-tests-edit.js");

const EXPECTED = [
  "accessibility-engineer",
  "chore-runner",
  "docs-writer",
  "firefox-reviewer",
  "frontend-engineer",
  "outside-reviewer",
  "safari-reviewer",
  "security-auditor",
  "test-runner",
  "test-writer",
  "ux-designer",
];
const SONNET_AGENTS = ["test-writer", "chore-runner", "docs-writer", "test-runner"];
const IMPLEMENTERS = ["frontend-engineer", "ux-designer", "accessibility-engineer"];
const SCHEME = /^[a-z]+(-[a-z0-9]+)*-(engineer|designer|reviewer|auditor|runner|writer)$/;

const files = readdirSync(agentsDir)
  .filter((f) => f.endsWith(".md"))
  .sort();

function frontmatter(file) {
  const text = readFileSync(resolve(agentsDir, file), "utf-8");
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const data = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim();
  }
  return data;
}

function run(hook, input, env = {}) {
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify(input),
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf-8",
  });
}

describe("claude agents: naming scheme", () => {
  it("has exactly the eleven agents", () => {
    expect(files.map((f) => f.replace(/\.md$/, ""))).toEqual(EXPECTED);
  });

  it("gives every agent a frontmatter name equal to its file name", () => {
    for (const file of files) {
      const stem = file.replace(/\.md$/, "");
      expect(frontmatter(file).name, `${file}: name`).toBe(stem);
    }
  });

  it("ends every name in a role noun", () => {
    for (const file of files) {
      const stem = file.replace(/\.md$/, "");
      expect(stem, `${file} follows the scheme`).toMatch(SCHEME);
    }
  });
});

describe("claude agents: the mechanical ones run on Sonnet 5.5", () => {
  for (const name of SONNET_AGENTS) {
    it(`${name} sets model claude-sonnet-5-5 and effort high`, () => {
      expect(existsSync(resolve(agentsDir, `${name}.md`)), `${name}.md exists`).toBe(true);
      const fm = frontmatter(`${name}.md`);
      expect(fm.model).toBe("claude-sonnet-5-5");
      expect(fm.effort).toBe("high");
    });
  }
});

describe("hook sonnet-agents.js", () => {
  const call = (subagent_type, model) =>
    run(sonnetHook, { tool_input: { subagent_type, ...(model ? { model } : {}) } });

  for (const name of SONNET_AGENTS) {
    it(`blocks ${name} with model opus`, () => {
      expect(call(name, "opus").status).toBe(2);
    });
    it(`allows ${name} without a model`, () => {
      expect(call(name).status).toBe(0);
    });
    it(`allows ${name} with model sonnet`, () => {
      expect(call(name, "sonnet").status).toBe(0);
    });
    it(`allows ${name} with model claude-sonnet-5-5`, () => {
      expect(call(name, "claude-sonnet-5-5").status).toBe(0);
    });
  }

  it("allows frontend-engineer with model opus", () => {
    expect(call("frontend-engineer", "opus").status).toBe(0);
  });
});

describe("hook no-tests-edit.js", () => {
  const env = { CLAUDE_PROJECT_DIR: root };
  const edit = (agent_type, tool_input) =>
    run(testsHook, { ...(agent_type ? { agent_type } : {}), cwd: root, tool_input }, env);

  for (const agent of IMPLEMENTERS) {
    it(`blocks ${agent} from a relative path under tests/`, () => {
      expect(edit(agent, { file_path: "tests/x.spec.js" }).status).toBe(2);
    });
    it(`blocks ${agent} from an absolute path under tests/`, () => {
      expect(edit(agent, { file_path: resolve(root, "tests/fixtures/y.html") }).status).toBe(2);
    });
    it(`blocks ${agent} from a notebook under tests/`, () => {
      expect(edit(agent, { notebook_path: resolve(root, "tests/n.ipynb") }).status).toBe(2);
    });
    it(`allows ${agent} outside tests/`, () => {
      expect(edit(agent, { file_path: "packages/core/src/x.css" }).status).toBe(0);
    });
    it(`allows ${agent} on a sibling that only starts with tests`, () => {
      expect(edit(agent, { file_path: "testsuite/x" }).status).toBe(0);
    });
  }

  it("allows test-writer under tests/", () => {
    expect(edit("test-writer", { file_path: "tests/x.spec.js" }).status).toBe(0);
  });

  it("allows a call with no agent_type under tests/", () => {
    expect(edit(undefined, { file_path: "tests/x.spec.js" }).status).toBe(0);
  });
});

describe("hooks name agents that exist", () => {
  const names = (hook) => {
    const src = readFileSync(hook, "utf-8");
    return [...src.matchAll(/new Set\(\s*\[([^\]]*)\]/g)].flatMap((m) =>
      [...m[1].matchAll(/(['"`])([^'"`]+)\1/g)].map((s) => s[2]),
    );
  };

  for (const hook of [sonnetHook, testsHook]) {
    it(`${hook.split("/").pop()} lists at least one agent, and each has a file`, () => {
      const listed = names(hook);
      expect(listed.length).toBeGreaterThan(0);
      for (const name of listed) {
        expect(existsSync(resolve(agentsDir, `${name}.md`)), `${name} has .claude/agents/${name}.md`).toBe(true);
      }
    });
  }
});
