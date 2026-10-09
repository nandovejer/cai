/**
 * CAI — shipped-strings check (PRINCIPLES.md §4, strong rule SR-1).
 * Scans the visible text of every HTML file under apps/ (pages, and the docs site's layouts, partials and
 * page fragments in apps/docs/) for wording the principles forbid:
 * vague link/button text and Title Case headings. Code samples are skipped.
 *
 * Usage: node scripts/check-strings.js
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, relative, resolve, sep } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = resolve(root, "apps");

// Whole text of a button, link or label that says nothing on its own
const VAGUE = /^(ok|okay|submit|yes|no|click here|here|read more|learn more|more|this page|this link)$/i;

// Words that may be capitalised inside a sentence-case heading
const ALLOWED_CAPS = /^(CAI|CSS|HTML|JS|JavaScript|JSON|ARIA|WCAG|MIDI|API|npm|pnpm|URL|UI|UX|ITCSS|BEM|CDN|ES|SVG|MDN|DOM|OK|Tokens|Core|Platform|Level|Components)$/;

// Removed parts keep their line breaks, so the reported line numbers stay right
const blank = (text) => text.replace(/[^\n]/g, "");

function visibleHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<(pre|code|script|style|svg|template)\b[\s\S]*?<\/\1>/gi, blank);
}

function textOf(fragment) {
  return fragment.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

/** Every .html file under apps/, outside node_modules, sorted. */
function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.name === "node_modules") continue;
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.isFile() && entry.name.endsWith(".html")) yield path;
  }
}

const problems = [];

for (const file of htmlFiles(appsDir)) {
  const name = relative(root, file).split(sep).join("/");
  const html = visibleHtml(readFileSync(file, "utf-8"));
  const lines = html.split("\n");
  const where = (needle) => {
    const i = lines.findIndex((l) => l.includes(needle));
    return `${name}:${i + 1}`;
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
