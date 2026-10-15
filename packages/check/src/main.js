/**
 * LUZ check — the bin: process glue only (argv, files, stdout, exit code).
 * Bundled with its own modules into dist/luz-check.js by
 * scripts/build-check.js. Everything it decides is in cli.js.
 *
 * Imports node:fs, node:path and node:url and nothing else; reads no
 * environment variable and opens no connection (f5-ai-ready.md 8).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { run } from "./cli.js";

// src/ and dist/ sit in the package folder, so ../package.json is its manifest
const manifest = fileURLToPath(new URL("../package.json", import.meta.url));
const { version } = JSON.parse(readFileSync(manifest, "utf-8"));

const { code, stdout, stderr } = run(process.argv.slice(2), { version });
if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);
process.exitCode = code;
