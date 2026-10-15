/**
 * LUZ check: luz-check.json (f5-ai-ready.md 5.3 "Config", 8 "Config", the
 * review answers of security-auditor and accessibility-engineer).
 *
 *   { "ignore": ["vendor/**"], "rules": { "css/literal-size": "off" },
 *     "themes": ["src/theme.css"], "strict": false }
 *
 * Plain JSON, at most 64 kB, no key the tool does not know, no `__proto__`.
 * A warning may be set to "off", nothing else: a blocking rule is silenced
 * only by `ignore`, and `file/skipped` is never switched off (that would hide
 * a file the tool did not read). A rule id that does not exist is an error,
 * so a typo does not leave a rule on that the file says is off.
 *
 * parseConfig throws a ConfigError whose message starts with the file name.
 * It never quotes the text of the file, apart from a key that is a name of
 * the echo alphabet.
 */
import { MESSAGES } from "./messages.js";
import { displayPath, echoName } from "./sanitize.js";

export const MAX_CONFIG_BYTES = 65536;
const MAX_LIST = 1000;
const KEYS = ["ignore", "rules", "themes", "strict"];
const ALWAYS_ON = new Set(["file/skipped"]);

/** The rules a config may switch off: every warning but file/skipped. */
const OFFABLE = new Set(
  Object.entries(MESSAGES)
    .filter(([key, entry]) => entry.severity === "warn" && !key.includes(":") && !ALWAYS_ON.has(key))
    .map(([key]) => key),
);
const KNOWN = new Set(Object.keys(MESSAGES).map((key) => key.split(":")[0]));

export class ConfigError extends Error {
  constructor(file, message) {
    super(`${displayPath(file)}: ${message}`);
    this.name = "ConfigError";
  }
}

const isList = (value) => Array.isArray(value) && value.length <= MAX_LIST && value.every((item) => typeof item === "string");

/**
 * @param {string} text the file as read
 * @param {string} [file] its name, for the messages
 * @returns {{ ignore: string[], rules: Record<string, "off">, themes: string[], strict: boolean }}
 */
export function parseConfig(text, file = "luz-check.json") {
  const fail = (message) => {
    throw new ConfigError(file, message);
  };
  if (typeof text !== "string") fail("is not text");
  if (Buffer.byteLength(text, "utf-8") > MAX_CONFIG_BYTES) fail("is larger than 64 kB");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("is not valid JSON");
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) return fail("must be a JSON object");

  const result = { ignore: [], rules: Object.create(null), themes: [], strict: false };
  for (const key of Object.keys(data)) {
    if (!KEYS.includes(key)) fail(`has a key luz-check does not know: ${echoName(key)}`);
  }
  if (Object.hasOwn(data, "ignore")) {
    if (!isList(data.ignore)) fail(`"ignore" must be a list of patterns`);
    result.ignore = data.ignore.slice();
  }
  if (Object.hasOwn(data, "themes")) {
    if (!isList(data.themes)) fail(`"themes" must be a list of files`);
    result.themes = data.themes.slice();
  }
  if (Object.hasOwn(data, "strict")) {
    if (typeof data.strict !== "boolean") fail('"strict" must be true or false');
    result.strict = data.strict;
  }
  if (Object.hasOwn(data, "rules")) {
    const { rules } = data;
    if (rules === null || typeof rules !== "object" || Array.isArray(rules)) fail('"rules" must be an object of rule ids');
    for (const id of Object.keys(rules)) {
      const shown = echoName(id);
      if (!KNOWN.has(id)) fail(`"rules" names a rule that does not exist: ${shown}`);
      if (!OFFABLE.has(id)) fail(`"rules" cannot switch off ${shown}; a blocking rule is silenced with "ignore" only`);
      if (rules[id] !== "off") fail(`"rules" may set ${shown} to "off" and nothing else`);
      result.rules[id] = "off";
    }
  }
  return result;
}
