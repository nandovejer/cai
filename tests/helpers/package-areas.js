/**
 * The docs area of each package of patterns. Almost always it is the package's own name
 * (/docs/landing/, /docs/cms/, /docs/app/); @luz-ds/docs is the one exception: its area
 * is `documentation` (/docs/documentation/), because /docs/docs/ would read as a typo.
 * The tests that walk "the packages of patterns and their pages" read this one list.
 */
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
