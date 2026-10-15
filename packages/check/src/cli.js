/**
 * LUZ check — the command line as a function: run(argv, env) -> { code,
 * stdout, stderr }, the shape of tokens/lib/cli.js, so tests run it without a
 * shell and src/main.js only connects it to the process.
 *
 * Exit codes: 0 nothing blocks; 1 at least one blocking finding; 2 the
 * command was used wrongly, or there is nothing it can read.
 *
 * It reads nothing from the machine itself: the version comes in through
 * `env`, and when files are read they will come through `env` too.
 */

export const USAGE = `Usage: luz-check [paths…]
       luz-check --version | --help

Reads the HTML and CSS you wrote and says which LUZ classes, elements, load
order and theme colours are wrong. It runs offline and writes nothing.

  --version    print the version
  --help       show this text

Exit code 0 when nothing blocks, 1 when a finding blocks, 2 for a usage error.`;

/**
 * @param {string[]} argv arguments after the program name
 * @param {{ version: string }} env
 * @returns {{ code: number, stdout: string, stderr: string }}
 */
export function run(argv, env) {
  const args = argv.filter((arg) => typeof arg === "string");
  if (args.includes("--help") || args.includes("-h")) return { code: 0, stdout: `${USAGE}\n`, stderr: "" };
  if (args.includes("--version") || args.includes("-v")) return { code: 0, stdout: `@luz-ds/check ${env.version}\n`, stderr: "" };
  const unknown = args.find((arg) => arg.startsWith("-"));
  if (unknown) return { code: 2, stdout: "", stderr: `Unknown option ${unknown.slice(0, 40)}.\n\n${USAGE}\n` };
  return { code: 2, stdout: "", stderr: `Checking files is not available in this version; run luz-check --help.\n` };
}
