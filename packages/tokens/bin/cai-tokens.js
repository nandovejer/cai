#!/usr/bin/env node
/**
 * CAI — `cai-tokens` command (see lib/cli.js). Dependency-free; Node 18+.
 *   npx @cai-ds/tokens check-contrast my-theme.css
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { run } from "../lib/cli.js";

const tokensPath = fileURLToPath(new URL("../dist/tokens.css", import.meta.url));
const read = (path) => {
  try {
    return readFileSync(path, "utf-8");
  } catch (error) {
    throw new Error(`cannot read ${path}: ${error.code === "ENOENT" ? "no such file" : error.message}`);
  }
};

const { code, stdout, stderr } = run(process.argv.slice(2), { read, tokensPath });
if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);
process.exitCode = code;
