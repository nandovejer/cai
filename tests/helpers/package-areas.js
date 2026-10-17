/**
 * The docs area of each package of patterns. Almost always it is the package's own name
 * (/docs/landing/, /docs/cms/, /docs/app/); @luz-ds/docs is the one exception: its area
 * is `documentation` (/docs/documentation/), because /docs/docs/ would read as a typo.
 * The tests that walk "the packages of patterns and their pages" read this one list.
 */
import { readFileSync } from "node:fs";
import { SITE_KINDS } from "../../scripts/luz-packages.js";

const AREA_OF = { docs: "documentation" };

/** The docs area (its id and its slug) of a package of patterns. */
export const areaOfPackage = (name) => AREA_OF[name] ?? name;

/** The package a docs area documents. */
export const packageOfArea = (area) => Object.entries(AREA_OF).find(([, value]) => value === area)?.[0] ?? area;

/** The areas of the packages of patterns, site first: site, landing, cms, app, documentation. */
export const PATTERN_AREAS = ["site", ...SITE_KINDS.map(areaOfPackage)];

/** The areas of the packages for one kind of site. */
export const KIND_AREAS = SITE_KINDS.map(areaOfPackage);

/**
 * The npm package an area's index names in its eyebrow ("Components · @luz-ds/core"), or null for an
 * area that documents no package (Get started, Accessibility, HTML elements). Components document core,
 * Tokens document tokens, and each pattern area its own package; the name is read from the package.json.
 */
export function eyebrowPackageOf(area) {
  const dir = area === "components" ? "core" : area === "tokens" ? "tokens" : PATTERN_AREAS.includes(area) ? packageOfArea(area) : null;
  if (dir === null) return null;
  return JSON.parse(readFileSync(new URL(`../../packages/${dir}/package.json`, import.meta.url), "utf-8")).name;
}
