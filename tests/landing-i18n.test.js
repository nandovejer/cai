/**
 * The home page in several languages (scripts/docs-site/i18n.js and its use
 * in site.js): the registry and the catalogs, the {{t:…}} and {{html:…}}
 * strings with file:line on every mistake, the unused-key check, the
 * language switcher and the <link rel="alternate"> generated from the
 * registry, and the real catalogs of apps/landing/i18n.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { markDocsLinks, renderAlternates, renderSwitcher } from "../scripts/docs-site/i18n.js";
import { docsSite } from "../scripts/docs-site/plugin.js";
import { PAGES_BASE, SITE_URL } from "../vite.config.js";
import { buildSite, currentOf, landingDocuments, relativizeLinks, renderDocument, scanSite } from "../scripts/docs-site/site.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- Fixtures ----------------------------------------------------------- */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const REGISTRY = [
  { code: "en", name: "English", dir: "ltr", route: "/" },
  { code: "es", name: "Español", dir: "ltr", route: "/es/" },
  { code: "ar", name: "العربية", dir: "rtl", route: "/ar/" },
];
const CATALOGS = {
  en: { "lang.label": "Language", "site.home": "Home", "hero.title": "Plain HTML", "hero.lead": "Add a <code>&lt;link&gt;</code> tag." },
  es: { "lang.label": "Idioma", "site.home": "Inicio", "hero.title": "HTML sin más", "hero.lead": "Añade una etiqueta <code>&lt;link&gt;</code>." },
  ar: { "lang.label": "اللغة", "site.home": "الرئيسية", "hero.title": "HTML فقط", "hero.lead": "أضف وسم <code>&lt;link&gt;</code>." },
};
const LANDING = `<!DOCTYPE html>
<html lang="{{lang}}" dir="{{dir}}">
<head>
  <title>{{t:hero.title}}</title>
  {{alternates}}
</head>
<body>
  <!-- cai:include header -->
  <main id="main-content">
    <h1>{{t:hero.title}}</h1>
    <p>{{html:hero.lead}}</p>
    <a href="/docs/">Docs</a>
  </main>
</body>
</html>
`;

/** A repository with a one-page docs site and a translated landing. */
function fixture({ registry = REGISTRY, catalogs = CATALOGS, landing = LANDING, header } = {}) {
  const repoRoot = mkdtempSync(join(tmpdir(), "cai-i18n-"));
  temps.push(repoRoot);
  const files = {
    "apps/docs/site.json": JSON.stringify({ areas: [{ id: "components", label: "Components", slug: "components" }] }),
    "apps/docs/_layouts/page.html": '<!DOCTYPE html>\n<html lang="{{lang}}">\n<head><title>{{title}}</title></head>\n<body>\n<!-- cai:include header -->\n<main id="main-content">\n{{content}}\n</main>\n</body>\n</html>\n',
    "apps/docs/_partials/header.html":
      header ?? '<header>\n  <nav aria-label="Site">\n    <a href="{{home}}">{{t:site.home}}</a>\n    <a href="/docs/">Docs</a>\n  </nav>\n  {{langswitch}}\n</header>\n',
    "apps/docs/pages/index.html": "<!-- cai:page\ntitle: Docs\ndescription: The docs.\narea: hub\n-->\n<p>Hello.</p>\n",
    "apps/landing/index.html": landing,
    "apps/landing/i18n/locales.json": registry === null ? null : JSON.stringify(registry, null, 2),
    ...Object.fromEntries(Object.entries(catalogs).map(([code, strings]) => [`apps/landing/i18n/${code}.json`, strings && JSON.stringify(strings, null, 2)])),
  };
  for (const [path, text] of Object.entries(files)) {
    if (text === null || text === undefined) continue;
    mkdirSync(dirname(join(repoRoot, path)), { recursive: true });
    writeFileSync(join(repoRoot, path), text);
  }
  return repoRoot;
}

const scan = (repoRoot) => scanSite(join(repoRoot, "apps/docs"), repoRoot);
const build = (repoRoot) => {
  const site = scan(repoRoot);
  const html = readFileSync(join(repoRoot, "apps/landing/index.html"), "utf-8");
  return buildSite(site, { extra: landingDocuments(site, "apps/landing/index.html", html) });
};

/* ---- The registry and the catalogs --------------------------------------- */

describe("languages of the home page: registry and catalogs", () => {
  it("renders the template once per language, default first at /", () => {
    const { rendered, problems } = build(fixture());
    expect(problems).toEqual([]);
    expect(rendered.get("/")).toContain('<html lang="en" dir="ltr">');
    expect(rendered.get("/es/")).toContain('<html lang="es" dir="ltr">');
    expect(rendered.get("/ar/")).toContain('<html lang="ar" dir="rtl">');
    expect(rendered.get("/es/")).toContain("<title>HTML sin más</title>");
    expect(rendered.get("/ar/")).toContain("<h1>HTML فقط</h1>");
  });

  it("works without a registry: one home page, the {{t:…}} of a source left as written", () => {
    const repoRoot = fixture({ registry: null, header: "<header></header>\n", landing: "<!DOCTYPE html>\n<html lang=\"{{lang}}\">\n<head><title>x</title></head>\n<body><main id=\"main-content\"></main></body>\n</html>\n" });
    const site = scan(repoRoot);
    expect(site.i18n).toBeNull();
    expect(landingDocuments(site, "apps/landing/index.html", "")).toEqual([{ route: "/", file: "apps/landing/index.html", html: "" }]);
    expect(build(repoRoot).problems).toEqual([]);
  });

  it("refuses a registry that is not a list of { code, name, dir, route }, the default at /", () => {
    const bad = [
      [[], /a list of/],
      [[{ ...REGISTRY[0], route: "/en/" }], /route is "\/"/],
      [[REGISTRY[0], { ...REGISTRY[1], route: "/espanol/" }], /route is "\/es\/"/],
      [[REGISTRY[0], { ...REGISTRY[2], dir: "auto" }], /dir is "ltr" or "rtl"/],
      [[REGISTRY[0], { ...REGISTRY[1], code: "ES" }], /not a lowercase language tag/],
      [[REGISTRY[0], { ...REGISTRY[1], code: "../x", route: "/../x/" }], /not a lowercase language tag/],
      [[REGISTRY[0], REGISTRY[0]], /listed twice/],
      [[REGISTRY[0], { ...REGISTRY[1], flag: "🇪🇸" }], /exactly code, name, dir and route/],
      [[REGISTRY[0], { ...REGISTRY[1], name: " " }], /name is the language's name/],
    ];
    for (const [registry, message] of bad) expect(() => scan(fixture({ registry })), JSON.stringify(registry)).toThrow(message);
  });

  it("refuses a catalog that misses a key of the default one, or has one it does not, with file:line", () => {
    const missing = Object.fromEntries(Object.entries(CATALOGS.es).filter(([key]) => key !== "hero.lead"));
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, es: missing } }))).toThrow(
      'apps/landing/i18n/es.json: missing "hero.lead" (apps/landing/i18n/en.json:5)',
    );
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, ar: { ...CATALOGS.ar, "hero.extra": "زائد" } } }))).toThrow(
      'apps/landing/i18n/ar.json:6: "hero.extra" is not in apps/landing/i18n/en.json',
    );
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, es: undefined } }))).toThrow(/es\.json: missing/);
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, en: { ...CATALOGS.en, "Hero Title": "x" } } }))).toThrow(/en\.json:6: "Hero Title" is not a valid key/);
    expect(() => scan(fixture({ catalogs: { ...CATALOGS, en: { ...CATALOGS.en, "hero.title": "" } } }))).toThrow(/en\.json:4: "hero.title" is not a non-empty string/);
  });

  it("fails on a key a template uses and no catalog has, with the template's file:line", () => {
    const landing = LANDING.replace("<h1>{{t:hero.title}}</h1>", "<h1>{{t:hero.titel}}</h1>");
    expect(() => build(fixture({ landing }))).toThrow('apps/landing/index.html:10: "hero.titel" is not in apps/landing/i18n/en.json');
    const header = '<header>\n  <a href="/">{{t:site.homme}}</a>\n</header>\n';
    expect(() => build(fixture({ header }))).toThrow('apps/docs/_partials/header.html:2: "site.homme" is not in apps/landing/i18n/en.json');
  });

  it("reports a key no template uses, at its line in the default catalog", () => {
    const catalogs = Object.fromEntries(Object.entries(CATALOGS).map(([code, strings]) => [code, { ...strings, "old.key": "x" }]));
    expect(build(fixture({ catalogs })).problems).toEqual(['apps/landing/i18n/en.json:6: "old.key" is used by no template']);
  });

  it("escapes {{t:…}} and lets {{html:…}} carry only inline markup", () => {
    const xss = '<img src=x onerror="alert(1)">';
    const catalogs = { ...CATALOGS, es: { ...CATALOGS.es, "hero.title": xss } };
    expect(build(fixture({ catalogs })).rendered.get("/es/")).toContain("<h1>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</h1>");
    for (const bad of ['<script>alert(1)</script>', '<a href="javascript:alert(1)">x</a>', '<span onclick="x()">x</span>', '<img src="x">', '<a href="//evil.example/">x</a>']) {
      const html = { ...CATALOGS, ar: { ...CATALOGS.ar, "hero.lead": bad } };
      expect(() => build(fixture({ catalogs: html })), bad).toThrow(/catalog's HTML/);
    }
    const ok = { ...CATALOGS, es: { ...CATALOGS.es, "hero.lead": 'Ve a <a href="/docs/">la guía</a> con <span data-count="n">3</span> <strong>pasos</strong>.' } };
    expect(build(fixture({ catalogs: ok })).rendered.get("/es/")).toContain('<p>Ve a <a href="/docs/" hreflang="en">la guía</a> con <span data-count="n">3</span> <strong>pasos</strong>.</p>');
  });
});

/* ---- What the generator writes ------------------------------------------- */

describe("languages of the home page: generated markup", () => {
  // A fresh fixture per test: afterEach removes it
  let site;
  let i18n;
  beforeEach(() => {
    site = scan(fixture());
    i18n = site.i18n;
  });

  it("lists every language as an alternate, x-default as the default one, and the page as canonical (dev: root-absolute)", () => {
    expect(renderAlternates(i18n, i18n.byCode.get("es")).split(/\n\s*/)).toEqual([
      '<link rel="canonical" href="/es/">',
      '<link rel="alternate" hreflang="en" href="/">',
      '<link rel="alternate" hreflang="es" href="/es/">',
      '<link rel="alternate" hreflang="ar" href="/ar/">',
      '<link rel="alternate" hreflang="x-default" href="/">',
    ]);
  });

  it("writes them absolute from the site's URL in the pages build, and refuses a URL that is not https or has no final slash", () => {
    const url = "https://nandovejer.github.io/cai/";
    expect(renderAlternates(i18n, i18n.byCode.get("ar"), url).split(/\n\s*/)).toEqual([
      '<link rel="canonical" href="https://nandovejer.github.io/cai/ar/">',
      '<link rel="alternate" hreflang="en" href="https://nandovejer.github.io/cai/">',
      '<link rel="alternate" hreflang="es" href="https://nandovejer.github.io/cai/es/">',
      '<link rel="alternate" hreflang="ar" href="https://nandovejer.github.io/cai/ar/">',
      '<link rel="alternate" hreflang="x-default" href="https://nandovejer.github.io/cai/">',
    ]);
    const html = renderDocument(LANDING, "apps/landing/index.html", "/es/", site, { locale: i18n.byCode.get("es"), siteUrl: "https://example.org/" });
    expect(html).toContain('<link rel="canonical" href="https://example.org/es/">');
    for (const bad of ["http://example.org/", "https://example.org", "javascript:alert(1)//", 'https://example.org/"><script>/']) {
      expect(() => renderAlternates(i18n, i18n.default, bad), bad).toThrow(/https URL/);
    }
  });

  it("builds the switcher from the registry: links named in their own language, the current one marked, no flags, no script", () => {
    const html = renderSwitcher(i18n, i18n.byCode.get("es"), "Idioma");
    const links = [...html.matchAll(/<a class="cai-platform-lang-switcher__link" href="([^"]*)" hreflang="([^"]*)" lang="([^"]*)"( aria-current="page")?>([^<]*)<\/a>/g)].map((m) => [m[1], m[2], m[3], Boolean(m[4]), m[5]]);
    expect(links).toEqual([
      ["/", "en", "en", false, "English"],
      ["/es/", "es", "es", true, "Español"],
      ["/ar/", "ar", "ar", false, "العربية"],
    ]);
    // A native popover: the button names it, says what it is and shows the current language
    expect(html).toContain('<button class="cai-platform-lang-switcher__button" type="button" popovertarget="cai-lang-menu">');
    expect(html).toContain('<span class="u-sr-only">Idioma: </span><span class="cai-platform-lang-switcher__name">Español</span></button>');
    expect(html).toContain('<nav class="cai-platform-lang-switcher__menu" id="cai-lang-menu" popover aria-labelledby="cai-lang-title">');
    expect(html).not.toMatch(/<script|onclick|🇪|flag/i);
  });

  it("marks the home page of each language as current, and Home links to it", () => {
    const homes = ["/", "/es/", "/ar/"];
    expect(Object.fromEntries(currentOf("/es/", homes))).toEqual({ "/es/": "page" });
    expect(Object.fromEntries(currentOf("/docs/", homes))).toEqual({ "/docs/": "page" });
    const html = renderDocument(LANDING, "apps/landing/index.html", "/ar/", site, { locale: i18n.byCode.get("ar") });
    expect(html).toContain('<a href="/ar/" aria-current="page">الرئيسية</a>');
  });

  it("says hreflang=\"en\" on links to the English documentation, only on the other languages", () => {
    const es = renderDocument(LANDING, "apps/landing/index.html", "/es/", site, { locale: i18n.byCode.get("es") });
    const en = renderDocument(LANDING, "apps/landing/index.html", "/", site, { locale: i18n.default });
    expect(es).toContain('<a href="/docs/" hreflang="en">Docs</a>');
    expect(en).toContain('<a href="/docs/">Docs</a>');
    expect(markDocsLinks('<a href="/docs/" hreflang="fr">x</a>', "/docs/", "en")).toBe('<a href="/docs/" hreflang="fr">x</a>');
  });

  it("makes the languages' links relative in the pages build", () => {
    const routes = new Set(["/", "/es/", "/ar/", "/docs/"]);
    expect(relativizeLinks('<link rel="alternate" hreflang="en" href="/"><a href="/ar/">x</a><a href="/docs/">d</a>', "/es/", routes)).toBe(
      '<link rel="alternate" hreflang="en" href="../"><a href="../ar/">x</a><a href="../docs/">d</a>',
    );
  });
});

/* ---- The real catalogs ---------------------------------------------------- */

describe("the CAI home page in every language", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const template = readFileSync(join(repo, "apps/landing/index.html"), "utf-8");
  const docs = landingDocuments(site, "apps/landing/index.html", template);
  const render = (doc) => renderDocument(doc.html, doc.file, doc.route, site, { locale: doc.locale });

  it("publishes at the GitHub Pages URL of the repository, whose path is PAGES_BASE", () => {
    expect(SITE_URL).toBe("https://nandovejer.github.io/cai/");
    expect(new URL(SITE_URL).pathname).toBe(PAGES_BASE);
    const options = { repoRoot: repo, relative: true, outRoot: join(repo, "docs"), pagesBase: PAGES_BASE };
    expect(() => docsSite({ ...options, siteUrl: SITE_URL })).not.toThrow();
    expect(() => docsSite({ ...options, siteUrl: "https://nandovejer.github.io/other/" })).toThrow(/whose path is pagesBase/);
    expect(() => docsSite({ ...options, siteUrl: "http://nandovejer.github.io/cai/" })).toThrow(/https URL/);
  });

  it("ships English (default), Spanish and Arabic, each named in itself", () => {
    expect(site.i18n.locales.map((l) => [l.code, l.name, l.dir, l.route])).toEqual([
      ["en", "English", "ltr", "/"],
      ["es", "Español", "ltr", "/es/"],
      ["ar", "العربية", "rtl", "/ar/"],
    ]);
  });

  it("gives each language its own title, description, lang and dir, alternates for all, and no template syntax left", () => {
    const titles = new Set();
    for (const doc of docs) {
      const html = render(doc);
      const { code, dir } = doc.locale;
      expect(html, code).toContain(`<html lang="${code}" dir="${dir}"`);
      const title = html.match(/<title>([^<]+)<\/title>/)[1];
      expect(titles.has(title), code).toBe(false);
      titles.add(title);
      expect(html, code).toMatch(/<meta name="description" content="[^"]{60,}">/);
      for (const l of [...site.i18n.locales.map((x) => x.code), "x-default"]) expect(html, `${code} ${l}`).toContain(`hreflang="${l}" href=`);
      expect(html, code).not.toMatch(/\{\{|\}\}/);
      // The strings core's scripts write come from the page, so Arabic needs no dictionary of its own
      for (const key of ["change-mode", "mode-changed", "copied", "copied-status", "copy-failed"]) expect(html, `${code} ${key}`).toMatch(new RegExp(`data-cai-label-${key}="[^"]+"`));
      // The search results are English pages
      expect(html.match(/<ul data-cai-search-list="[a-z]+" lang="en">/g), code).toHaveLength(3);
    }
  });

  it("marks every link to the English documentation with hreflang on /es/ and /ar/", () => {
    for (const doc of docs.filter((d) => d.route !== "/")) {
      const html = render(doc);
      const docsLinks = [...html.matchAll(/<a\b[^>]*href="\/docs\/[^"]*"[^>]*>/g)].map((m) => m[0]);
      expect(docsLinks.length, doc.route).toBeGreaterThan(20);
      for (const a of docsLinks) expect(a, doc.route).toContain('hreflang="en"');
    }
  });
});
