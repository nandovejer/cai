/**
 * CAI — shipped-strings check (PRINCIPLES.md §4, red line 10).
 * Scans the visible text of the four apps for wording the principles forbid:
 * vague link/button text and Title Case headings. Code samples are skipped.
 *
 * Usage: node scripts/check-strings.js
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = resolve(root, "apps");

// Whole text of a button, link or label that says nothing on its own
const VAGUE = /^(ok|okay|submit|yes|no|click here|here|read more|learn more|more|this page|this link)$/i;

// Words that may be capitalised inside a sentence-case heading
const ALLOWED_CAPS = /^(CAI|CSS|HTML|JS|JSON|ARIA|WCAG|MIDI|API|npm|pnpm|URL|UI|UX|ITCSS|BEM|CDN|ES|SVG|MDN|DOM|OK|Tokens|Core|Platform|Level|Components)$/;

function visibleHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(pre|code|script|style|svg|template)\b[\s\S]*?<\/\1>/gi, "");
}

function textOf(fragment) {
  return fragment.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

const problems = [];

for (const app of readdirSync(appsDir)) {
  const file = resolve(appsDir, app, "index.html");
  if (!existsSync(file)) continue;
  const html = visibleHtml(readFileSync(file, "utf-8"));
  const lines = html.split("\n");
  const where = (needle) => {
    const i = lines.findIndex((l) => l.includes(needle));
    return `apps/${app}/index.html:${i + 1}`;
  };

  for (const m of html.matchAll(/<(a|button|label|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = textOf(m[2]);
    if (VAGUE.test(text)) problems.push(`${where(m[0].slice(0, 60))}: vague <${m[1]}> text "${text}"`);
  }

  for (const m of html.matchAll(/aria-label="([^"]+)"/gi)) {
    if (VAGUE.test(m[1].trim())) problems.push(`${where(m[0])}: vague aria-label "${m[1]}"`);
  }

  for (const m of html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const words = textOf(m[2]).split(" ").filter((w) => /^[A-Za-z]/.test(w));
    const rest = words.slice(1).filter((w) => !ALLOWED_CAPS.test(w));
    const caps = rest.filter((w) => /^[A-Z][a-z]/.test(w));
    if (caps.length >= 1 && caps.length === rest.length) {
      problems.push(`${where(m[0].slice(0, 60))}: Title Case heading "${textOf(m[2])}" — use sentence case`);
    }
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} string problem(s):\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("✓ Shipped strings follow the principles");
