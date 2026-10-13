/**
 * CAI — shipped-strings check (PRINCIPLES.md §4, strong rule SR-1).
 * Scans the visible text of every HTML file under apps/ (pages, and the docs site's layouts, partials and
 * page fragments in apps/docs/) for wording the principles forbid:
 * vague link/button text and Title Case headings. Code samples are skipped.
 *
 * The home page is one template whose text is in a catalog per language
 * (apps/landing/i18n/): it is checked as rendered, once per language, by the
 * same generator as the site (scripts/docs-site). Each check knows the
 * language of the text it reads (the element's own lang, else the page's):
 * vague wording has a list per language, and Title Case is checked in
 * English and Spanish only (Arabic has no letter case).
 *
 * Usage: node scripts/check-strings.js
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, relative, resolve, sep } from "path";
import { fileURLToPath } from "url";
import { tags } from "./docs-site/html.js";
import { landingDocuments, renderDocument, scanSite } from "./docs-site/site.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = resolve(root, "apps");
const LANDING = "apps/landing/index.html";

// Whole text of a button, link or label that says nothing on its own, per language
const VAGUE = {
  en: /^(ok|okay|submit|yes|no|click here|here|read more|learn more|more|this page|this link)$/i,
  es: /^(ok|vale|aceptar|enviar|sí|si|no|haz clic aquí|pulsa aquí|clic aquí|aquí|leer más|lee más|más información|más|ver más|esta página|este enlace)$/iu,
  ar: /^(موافق|إرسال|نعم|لا|انقر هنا|اضغط هنا|هنا|اقرأ المزيد|المزيد|هذه الصفحة|هذا الرابط)$/u,
};

// Languages with letter case, where a heading is checked for Title Case
const CASED = new Set(["en", "es"]);

// Words that may be capitalised inside a sentence-case heading
const ALLOWED_CAPS = /^(CAI|CSS|HTML|JS|JavaScript|JSON|ARIA|WCAG|MIDI|API|npm|pnpm|URL|UI|UX|ITCSS|BEM|CDN|ES|SVG|MDN|DOM|OK|Tokens|Core|Site|Level|Components)$/;

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

/**
 * The language at each start tag of `html`: a Map index → primary subtag,
 * from the nearest lang attribute (the element's own included), else
 * `fallback`. A source that does not tokenize keeps the fallback.
 */
function languages(html, fallback) {
  const at = new Map();
  const stack = [];
  try {
    for (const tag of tags(html)) {
      if (tag.type === "start") {
        const own = tag.attrs.get("lang");
        const lang = own ? own.toLowerCase().split("-")[0] : (stack.at(-1)?.lang ?? fallback);
        at.set(tag.index, lang);
        if (!tag.selfClosing && !/^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/.test(tag.name)) stack.push({ name: tag.name, lang });
      } else {
        const i = stack.findLastIndex((t) => t.name === tag.name);
        if (i !== -1) stack.length = i;
      }
    }
  } catch {
    // A fragment with unbalanced markup: every element is in the fallback language
  }
  return at;
}

const problems = [];

/** Check one HTML document or fragment; `name` says where, `fallback` is its language. */
function check(name, source, fallback) {
  const html = visibleHtml(source);
  const lang = languages(html, fallback);
  const langOf = (index) => lang.get(index) ?? fallback;
  const lines = html.split("\n");
  const where = (needle) => {
    const i = lines.findIndex((l) => l.includes(needle));
    return `${name}:${i + 1}`;
  };

  for (const m of html.matchAll(/<(a|button|label|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = textOf(m[2]);
    if (VAGUE[langOf(m.index)]?.test(text)) problems.push(`${where(m[0].slice(0, 60))}: vague <${m[1]}> text "${text}"`);
  }

  for (const m of html.matchAll(/<[a-z][\w-]*\b[^>]*\saria-label="([^"]+)"/gi)) {
    if (VAGUE[langOf(m.index)]?.test(m[1].trim())) problems.push(`${where(m[0])}: vague aria-label "${m[1]}"`);
  }

  for (const m of html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const headingLang = langOf(m.index);
    if (!CASED.has(headingLang)) continue;
    // English words are ASCII; Spanish ones may start with an accented letter (Índice)
    const [word, capital] = headingLang === "en" ? [/^[A-Za-z]/, /^[A-Z][a-z]/] : [/^\p{Script=Latin}/u, /^\p{Lu}\p{Ll}/u];
    const words = textOf(m[2]).split(" ").filter((w) => word.test(w));
    const rest = words.slice(1).filter((w) => !ALLOWED_CAPS.test(w));
    const caps = rest.filter((w) => capital.test(w));
    if (caps.length >= 1 && caps.length === rest.length) {
      problems.push(`${where(m[0].slice(0, 60))}: Title Case heading "${textOf(m[2])}" — use sentence case`);
    }
  }
}

// Every source file, in English unless it says otherwise (the docs are English only)
for (const file of htmlFiles(appsDir)) {
  const name = relative(root, file).split(sep).join("/");
  check(name, readFileSync(file, "utf-8"), "en");
}

// The home page, as rendered in each language
const site = scanSite(resolve(root, "apps/docs"), root);
const template = readFileSync(resolve(root, LANDING), "utf-8");
for (const doc of landingDocuments(site, LANDING, template)) {
  const html = renderDocument(doc.html, doc.file, doc.route, site, { locale: doc.locale });
  const code = doc.locale?.code ?? "en";
  check(`${LANDING} as ${doc.route} (${doc.locale?.file ?? LANDING})`, html, code);
}

if (problems.length) {
  console.error(`✗ ${problems.length} string problem(s):\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log("✓ Shipped strings follow the principles");
