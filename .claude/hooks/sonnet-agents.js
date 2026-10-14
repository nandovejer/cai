#!/usr/bin/env node
/*
 * PreToolUse on Agent: the mechanical agents run on Sonnet 5.5 (their
 * frontmatter says so). A call that overrides `model` with anything else
 * is blocked, so a session on Opus cannot spend Opus on them by mistake.
 */
const SONNET_ONLY = new Set(['test-writer', 'chore', 'docs-writer', 'tester']);
const SONNET = /^(sonnet|claude-sonnet-5-5)$/;

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  const { subagent_type: type, model } = input.tool_input ?? {};
  if (SONNET_ONLY.has(type) && model && !SONNET.test(model)) {
    process.stderr.write(
      `Blocked: ${type} runs on Sonnet 5.5 only. Call it without "model" (its frontmatter sets it) or with model "sonnet".\n`,
    );
    process.exit(2);
  }
});
