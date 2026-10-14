/**
 * LUZ — the published packages, one list for the scripts that pack,
 * check and publish them (check-pack, publish, smoke-consumer).
 *
 * Order matters: a package comes after every package it depends on, so
 * publish.js never uploads one before its peers exist.
 *
 *   BASE       share one version (changesets `fixed`): tokens → core → site
 *   SITE_KINDS packages for one kind of site, built on site, each with its
 *              own version (0.x while it grows) and literal peer ranges on
 *              the base's major: landing, cms
 */
export const BASE = ["tokens", "core", "site"];
export const SITE_KINDS = ["landing", "cms"];
export const PACKAGES = [...BASE, ...SITE_KINDS];
