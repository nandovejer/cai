/**
 * CAI Platform — image placeholders
 * Renders the two masters in packages/platform/src/placeholders/ (day:
 * placeholder.svg, night: placeholder-night.svg) to every aspect ratio and
 * width that .cai-platform-image uses, in AVIF and WebP, and in JPEG at the
 * smaller widths only (the fallback for browsers without either), next to
 * the masters. The rasters are committed: CI and the
 * release only copy them (scripts/build-platform.js), so a build never needs
 * ImageMagick. Run this after editing the master and commit the result.
 *
 * Needs ImageMagick 7 (`magick`) with AVIF and WebP write support. No npm
 * dependency (red line 1).
 *
 * Usage: node scripts/build-placeholders.js   (or `pnpm placeholders:build`)
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(repoRoot, "packages/platform/src/placeholders");
/** Variant → file prefix. The night variant is used in dark mode. */
export const VARIANTS = { day: "placeholder", night: "placeholder-night" };

/** Ratio name → [width, height]. The name is the class modifier. */
export const RATIOS = {
  "16x9": [16, 9],
  "4x3": [4, 3],
  "3x2": [3, 2],
  "1x1": [1, 1],
  "21x9": [21, 9],
  "9x16": [9, 16],
};
/** Long side in pixels, for srcset. The largest is the CSS background. */
export const LONG_SIDES = [640, 1280, 1920];
/** JPEG is only a fallback: it stops at 1280, the CSS fallback size. */
export const JPEG_LONG_SIDES = [640, 1280];

// Flat shapes: low quality settings stay clean on the edges and keep files
// small. AVIF below 50 starts to show blocks along the curves.
const FORMATS = {
  avif: ["-quality", "50"],
  webp: ["-quality", "55", "-define", "webp:method=6"],
  jpg: ["-quality", "60", "-sampling-factor", "4:2:0", "-interlace", "JPEG"],
};

export function sizeOf([w, h], long) {
  return w >= h ? [long, Math.round((long * h) / w)] : [Math.round((long * w) / h), long];
}

function magick(...args) {
  execFileSync("magick", args, { stdio: ["ignore", "ignore", "inherit"] });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
  } catch {
    console.error("✗ ImageMagick 7 (`magick`) is not installed. The committed placeholders are still valid.");
    process.exit(1);
  }

  // Remove the old rasters so a dropped ratio or width does not linger
  for (const name of readdirSync(dir)) {
    if (/^placeholder-.+\.(avif|webp|jpg)$/.test(name)) unlinkSync(join(dir, name));
  }

  const tmp = mkdtempSync(join(tmpdir(), "cai-placeholders-"));
  try {
    let count = 0;
    let bytes = 0;
    for (const prefix of Object.values(VARIANTS)) {
      // Render the master once at twice the largest size, then only downscale:
      // the master is square and every ratio is a centred crop (like `cover`).
      const big = join(tmp, `${prefix}.png`);
      magick("-background", "none", "-density", "307.2", join(dir, `${prefix}.svg`), "-resize", "3840x3840!", big);

      for (const [name, ratio] of Object.entries(RATIOS)) {
        for (const long of LONG_SIDES) {
          const [w, h] = sizeOf(ratio, long);
          const frame = join(tmp, `${prefix}-${name}-${w}.png`);
          magick(big, "-resize", `${w}x${h}^`, "-gravity", "center", "-extent", `${w}x${h}`, frame);
          for (const [ext, options] of Object.entries(FORMATS)) {
            if (ext === "jpg" && !JPEG_LONG_SIDES.includes(long)) continue;
            const out = join(dir, `${prefix}-${name}-${w}.${ext}`);
            magick(frame, "-strip", ...options, out);
            count++;
            bytes += statSync(out).size;
          }
        }
      }
    }
    console.log(`✓ ${count} placeholders → ${dir} (${(bytes / 1024).toFixed(1)} kB)`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
