#!/usr/bin/env node
/*
 * PreToolUse on Edit|Write|NotebookEdit: frontend-engineer, ux-designer and accessibility-engineer
 * implement; they do not write the tests their change must pass. Tests are
 * test-writer's (TDD: the red test comes first, from someone else).
 */
import path from 'node:path';

const IMPLEMENTERS = new Set(['frontend-engineer', 'ux-designer', 'accessibility-engineer']);

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  if (!IMPLEMENTERS.has(input.agent_type)) process.exit(0);
  const file = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (!file) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const rel = path.relative(root, path.resolve(input.cwd || root, file));
  if (rel === 'tests' || rel.startsWith(`tests${path.sep}`)) {
    process.stderr.write(
      `Blocked: ${input.agent_type} does not edit tests/. Hand the test to test-writer and report what it must check.\n`,
    );
    process.exit(2);
  }
});
