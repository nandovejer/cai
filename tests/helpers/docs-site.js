/**
 * The docs site's routes, for the browser tests: read with the same
 * scanSite() the Vite plugin uses (scripts/docs-site), so a new page is
 * tested without editing a list, and a test that needs an element finds its
 * page by id (gotoId) instead of knowing where the content lives.
 */
import { fileURLToPath } from "node:url";
import { readHtml } from "../../scripts/docs-site/html.js";
import { NOT_FOUND_ROUTE, scanSite } from "../../scripts/docs-site/site.js";

const repo = fileURLToPath(new URL("../../", import.meta.url));
export const site = scanSite(`${repo}apps/docs`, repo);

/** Every docs route (the hub first), without the not-found page. */
export const routes = () => site.pages.map((p) => p.route).sort((a, b) => (a === "/docs/" ? -1 : b === "/docs/" ? 1 : a.localeCompare(b)));

/** The routes of one area (its index first), from the front matter. */
export const routesOf = (area) => routes().filter((r) => site.byRoute.get(r).meta.area === area);

/** The not-found page, served at /404.html. */
export const notFoundRoute = NOT_FOUND_ROUTE;

const owner = new Map();
for (const page of site.pages) {
  for (const id of readHtml(page.body, page.file).ids.keys()) owner.set(id, page.route);
}

/** The route of the page whose content has this id. */
export function routeOf(id) {
  const route = owner.get(id);
  if (!route) throw new Error(`no docs page has the id "${id}"`);
  return route;
}

/** The routes whose source contains `text` (a class, an attribute…). */
export const routesWith = (text) => site.pages.filter((p) => p.body.includes(text)).map((p) => p.route);

/** Open the page that holds `id` (without a fragment) and wait for it to settle. */
export async function gotoId(page, id, { hash = false } = {}) {
  const route = routeOf(id);
  await page.goto(hash ? `${route}#${id}` : route);
  await page.waitForLoadState("networkidle");
  return route;
}

/** True once an area has its own pages (its index page exists). */
export const moved = (area) => site.byRoute.has(`/docs/${site.areas.find((a) => a.id === area).slug}/`);
