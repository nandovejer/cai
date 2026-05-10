/**
 * CAI Design System — Token Builder
 * Regenerates ONLY the primitive layer in cai-tokens.css from tokens.json.
 * The semantic layer (light/dark/high-contrast themes) lives in cai-tokens.css
 * and MUST NOT be overwritten by this script.
 *
 * Usage: node scripts/build-tokens.js (from the repo root)
 *
 * For a full generation solution including semantics,
 * migrate to Style Dictionary (see audit 2.2).
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokensPath = resolve(__dirname, "../packages/tokens/tokens.json");
const outputPath = resolve(__dirname, "../packages/tokens/dist/cai-tokens.css");

const tokens = JSON.parse(readFileSync(tokensPath, "utf-8"));

// ---- Read existing file to preserve the semantic layer ----
let existingContent = "";
try {
  existingContent = readFileSync(outputPath, "utf-8");
} catch (_) {
  /* first run, file doesn't exist yet */
}

// Semantic layer starts at the first [data-theme or :root,\n[data-theme
const semanticMarker = /\n\n\/\* -{5,}\n {3}LAYER 2/;
const semanticStart = existingContent.search(semanticMarker);
const semanticLayer =
  semanticStart !== -1
    ? existingContent.slice(semanticStart)
    : "\n\n/* Semantic layer not found — add manually or run full token build */\n";

// ---- Generate primitives ----
function generatePrimitives(tokens) {
  const lines = [];

  for (const [family, shades] of Object.entries(tokens.color)) {
    lines.push(`  /* ${family.charAt(0).toUpperCase() + family.slice(1)} */`);
    for (const [shade, token] of Object.entries(shades)) {
      lines.push(`  --cai-${family}-${shade}: ${token.value};`);
    }
    lines.push("");
  }

  lines.push("  /* Spacing (base 4px) */");
  const spacingKeys = Object.keys(tokens.spacing).sort((a, b) => a.localeCompare(b));
  for (const key of spacingKeys) {
    lines.push(`  --cai-space-${key}: ${tokens.spacing[key].value};`);
  }

  lines.push("\n  /* Sizing */");
  for (const [key, token] of Object.entries(tokens.sizing)) {
    lines.push(`  --cai-size-${key}: ${token.value};`);
  }

  lines.push("\n  /* Typography */");
  for (const [key, token] of Object.entries(tokens.typography)) {
    lines.push(`  --cai-${key}: ${token.value};`);
  }

  lines.push("\n  /* Radius */");
  for (const [key, token] of Object.entries(tokens.radius)) {
    lines.push(`  --cai-radius-${key}: ${token.value};`);
  }

  lines.push("\n  /* Shadows */");
  for (const [key, token] of Object.entries(tokens.shadow)) {
    lines.push(`  --cai-shadow-${key}: ${token.value};`);
  }

  return `:root {\n${lines.join("\n")}\n}`;
}

mkdirSync(resolve(__dirname, "../packages/tokens/dist"), { recursive: true });

const header = `/* ==========================================================================
   CAI Design System — Tokens
   Generated from tokens.json · Do not edit manually
   ========================================================================== */

/* -------------------------------------------------------------------------
   LAYER 1: PRIMITIVOS
   Los valores base. Nunca cambian entre temas.
   Regla: los componentes NUNCA usan estas variables directamente.
   -------------------------------------------------------------------------- */`;

const css = `${header}\n${generatePrimitives(tokens)}${semanticLayer}`;

writeFileSync(outputPath, css, "utf-8");
console.log(`✓ Primitives regenerated → ${outputPath}`);
console.log("  Semantic layer preserved.");

let tokenCount = 0;
for (const [key, group] of Object.entries(tokens)) {
  if (key === "$meta") continue;
  for (const item of Object.values(group)) {
    if (item && typeof item === "object" && !item.value) {
      tokenCount += Object.keys(item).length;
    } else {
      tokenCount++;
    }
  }
}
console.log(`  ${tokenCount} tokens primitivos procesados`);
