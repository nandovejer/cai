/**
 * CAI Design System — Token Builder
 * Composes dist/ from tracked sources:
 *   cai-tokens.css → fonts/fonts.css (@font-face) + Layer 1 primitives
 *                    (generated from tokens.json) + Layer 2 semantic
 *                    (packages/tokens/src/semantic.css)
 *   tokens.css     → primitives + semantic, no @font-face (bring your own fonts)
 *   fonts.css      → @font-face only
 *   tokens.json    → primitives source, for tooling
 *   fonts/         → IBM Plex woff2 files + OFL.txt
 *
 * Usage: node scripts/build-tokens.js (from the repo root)
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  copyFileSync,
  readdirSync,
  statSync,
  existsSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokensPath = resolve(__dirname, "../packages/tokens/tokens.json");
const distRoot = resolve(__dirname, "../packages/tokens/dist");
const outputPath = resolve(distRoot, "cai-tokens.css");

const semanticPath = resolve(__dirname, "../packages/tokens/src/semantic.css");

const tokens = JSON.parse(readFileSync(tokensPath, "utf-8"));
const semanticLayer = `\n\n${readFileSync(semanticPath, "utf-8")}`;

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
  const spacingKeys = Object.keys(tokens.spacing).sort((a, b) =>
    a.localeCompare(b),
  );
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

// Start from a clean dist so removed sources never linger in the tarball
rmSync(distRoot, { recursive: true, force: true });
mkdirSync(distRoot, { recursive: true });

// ---- Include IBM Plex fonts (@font-face) ----
let fontFaces = "";
const fontsCssPath = resolve(__dirname, "../packages/tokens/fonts/fonts.css");
try {
  // fonts.css references ./serif/… next to itself; in dist the files live
  // under ./fonts/, so the URLs are rewritten to stay resolvable.
  fontFaces = readFileSync(fontsCssPath, "utf-8").replace(
    /url\((["']?)\.\//g,
    "url($1./fonts/",
  );
} catch (_) {
  console.log(`ℹ️ fonts.css not found at ${fontsCssPath}, skipping font-faces`);
}

const header = `/* ==========================================================================
   CAI Design System — Tokens
   Generated from tokens.json · Do not edit manually
   ========================================================================== */

/* -------------------------------------------------------------------------
   WEB FONTS (self-hosted)
   -------------------------------------------------------------------------- */`;

const tokensHeader = `/* ==========================================================================
   CAI Design System — Tokens (no web fonts)
   Generated from tokens.json · Do not edit manually
   ========================================================================== */`;

const layers = `/* -------------------------------------------------------------------------
   LAYER 1: PRIMITIVOS
   Los valores base. Nunca cambian entre temas.
   Regla: los componentes NUNCA usan estas variables directamente.
   -------------------------------------------------------------------------- */\n${generatePrimitives(tokens)}${semanticLayer}`;

async function writeCssWithMin(outPath, css) {
  writeFileSync(outPath, css, "utf-8");
  const { code } = await esbuild.transform(css, { loader: "css", minify: true });
  writeFileSync(outPath.replace(/\.css$/, ".min.css"), code, "utf-8");
}

await writeCssWithMin(outputPath, `${header}\n${fontFaces}\n\n${layers}`);
console.log(`✓ Tokens built (fonts + primitives + semantic) → ${outputPath} (+ min)`);

await writeCssWithMin(resolve(distRoot, "tokens.css"), `${tokensHeader}\n\n${layers}`);
await writeCssWithMin(resolve(distRoot, "fonts.css"), fontFaces);
console.log("✓ Split entries built → tokens.css, fonts.css (+ min)");

copyFileSync(tokensPath, resolve(distRoot, "tokens.json"));
console.log("✓ tokens.json copied → dist/");

// Copy font files (IBM Plex) and their licence
function copyFontDir(fontName) {
  const fontSrc = resolve(__dirname, `../packages/tokens/fonts/${fontName}`);
  const fontDest = resolve(distRoot, `fonts/${fontName}`);
  if (existsSync(fontSrc)) {
    mkdirSync(fontDest, { recursive: true });
    for (const file of readdirSync(fontSrc)) {
      const srcPath = resolve(fontSrc, file);
      const destPath = resolve(fontDest, file);
      if (statSync(srcPath).isFile()) {
        copyFileSync(srcPath, destPath);
      }
    }
    console.log(`✓ ${fontName} fonts copied → ${fontDest}`);
  }
}

["serif", "sans", "mono"].forEach(copyFontDir);
copyFileSync(
  resolve(__dirname, "../packages/tokens/fonts/OFL.txt"),
  resolve(distRoot, "fonts/OFL.txt"),
);

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
console.log(`✓ ${tokenCount} primitive tokens generated`);
