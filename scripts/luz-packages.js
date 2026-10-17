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
 *              the base's major: landing, cms, app, docs
 *   PACKAGES   BASE and SITE_KINDS: the CSS libraries. The docs tests and the
 *              CSS probes read this one.
 *   TOOLS      published and with no CSS of their own: dev tools with a bin
 *              (check). Own version, out of the `fixed` group, no layer.
 *   PUBLISHED  PACKAGES then TOOLS: what check-pack, publish and
 *              smoke-consumer pack, check and upload. A tool comes last: its
 *              tarball is built from the others' dist and nothing depends on it.
 */
export const BASE = ["tokens", "core", "site"];
export const SITE_KINDS = ["landing", "cms", "app", "docs"];
export const PACKAGES = [...BASE, ...SITE_KINDS];
export const TOOLS = ["check"];
export const PUBLISHED = [...PACKAGES, ...TOOLS];
