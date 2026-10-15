/**
 * LUZ check: what may reach a terminal or a model (f5-ai-ready.md 8 "Output
 * escaping" and "Prompt injection", the review answers of security-auditor
 * Q3). Everything the tool prints that came from a file, a path or an
 * argument goes through one of these three functions.
 *
 *   echoName(value)     the value when it is a name of the echo alphabet
 *                       (^[A-Za-z0-9_:.\-/]{1,64}$), else UNREADABLE. Used for
 *                       a class, an attribute, a tag, a token: never a sentence.
 *   displayPath(path)   a path as it is printed: what is outside the readable
 *                       alphabet (control characters, escape, bidi, invisible
 *                       and private-use characters) is written \u{hex}, never
 *                       dropped, so two different names stay different.
 *                       Letters of any script, accents and spaces stay.
 *   cleanText(value, max = 80)
 *                       free text taken from somewhere (an error message of
 *                       the system, say): escape sequences and every
 *                       character of those ranges removed, cut at `max`.
 *
 * The unsafe ranges are a list of code points, not a regexp over \p{…}, so
 * they do not change with the Unicode tables of the Node that runs them.
 */

export const UNREADABLE = "<an unreadable name>";

const ECHO_NAME = /^[A-Za-z0-9_:.\-/]{1,64}$/;

// Inclusive ranges that are never printed as they are: C0, DEL and C1 (ESC,
// BEL, NEL…), the soft hyphen and the format characters that are invisible or
// reorder text (Arabic letter mark, zero-width, bidi marks, overrides and
// isolates, word joiner and invisible operators, BOM), the line and paragraph
// separators, the specials, private use (both planes) and the tag characters
// (U+E0000-E007F: ASCII a model can read and a person cannot), surrogates.
const UNSAFE = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0xad, 0xad],
  [0x600, 0x605],
  [0x61c, 0x61c],
  [0x6dd, 0x6dd],
  [0x70f, 0x70f],
  [0x180e, 0x180e],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x206f],
  [0xd800, 0xf8ff],
  [0xfeff, 0xfeff],
  [0xfff9, 0xfffb],
  [0xfffe, 0xffff],
  [0x1d173, 0x1d17a],
  [0xe0000, 0xe0fff],
  [0xf0000, 0x10ffff],
];

function isUnsafe(code) {
  for (const [from, to] of UNSAFE) if (code >= from && code <= to) return true;
  return false;
}

/** The name when it can be printed as it is, else "<an unreadable name>". */
export function echoName(value) {
  return typeof value === "string" && ECHO_NAME.test(value) ? value : UNREADABLE;
}

/** A path for a terminal or a report: unsafe characters and backslashes as \u{hex}. */
export function displayPath(path) {
  let out = "";
  for (const char of String(path)) {
    const code = char.codePointAt(0);
    out += isUnsafe(code) || code === 0x5c ? `\\u{${code.toString(16)}}` : char;
  }
  return out;
}

/** Free text with no escape sequence and no unsafe character, cut at `max` characters. */
export function cleanText(value, max = 80) {
  const text = String(value);
  const chars = [...text];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].codePointAt(0);
    if (code === 0x1b) {
      const next = chars[i + 1];
      if (next === "[") {
        // CSI: parameters, intermediates, one final byte 0x40-0x7e
        i += 2;
        while (i < chars.length && !(chars[i].codePointAt(0) >= 0x40 && chars[i].codePointAt(0) <= 0x7e)) i++;
      } else if (next === "]") {
        // OSC: up to BEL or ST (ESC \)
        i += 2;
        while (i < chars.length && chars[i] !== "\x07" && !(chars[i] === "\x1b" && chars[i + 1] === "\\")) i++;
        if (chars[i] === "\x1b") i++;
      } else i += 1;
      continue;
    }
    if (!isUnsafe(code)) out += chars[i];
  }
  const kept = [...out];
  if (kept.length <= max) return out;
  return max > 1 ? `${kept.slice(0, max - 1).join("")}…` : kept.slice(0, max).join("");
}
