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
  <!-- luz:include header -->
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
  const repoRoot = mkdtempSync(join(tmpdir(), "luz-i18n-"));
  temps.push(repoRoot);
  const files = {
    "apps/docs/site.json": JSON.stringify({ areas: [{ id: "components", label: "Components", slug: "components" }] }),
    "apps/docs/_layouts/page.html": '<!DOCTYPE html>\n<html lang="{{lang}}">\n<head><title>{{title}}</title></head>\n<body>\n<!-- luz:include header -->\n<main id="main-content">\n{{content}}\n</main>\n</body>\n</html>\n',
    "apps/site/_partials/header.html":
      header ?? '<header>\n  <nav aria-label="Site">\n    <a href="{{home}}">{{t:site.home}}</a>\n    <a href="/docs/">Docs</a>\n  </nav>\n  {{langswitch}}\n</header>\n',
    "apps/docs/pages/index.html": "<!-- luz:page\ntitle: Docs\ndescription: The docs.\narea: hub\n-->\n<p>Hello.</p>\n",
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
    expect(() => build(fixture({ header }))).toThrow('apps/site/_partials/header.html:2: "site.homme" is not in apps/landing/i18n/en.json');
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
    const url = "https://nandovejer.github.io/luz/";
    expect(renderAlternates(i18n, i18n.byCode.get("ar"), url).split(/\n\s*/)).toEqual([
      '<link rel="canonical" href="https://nandovejer.github.io/luz/ar/">',
      '<link rel="alternate" hreflang="en" href="https://nandovejer.github.io/luz/">',
      '<link rel="alternate" hreflang="es" href="https://nandovejer.github.io/luz/es/">',
      '<link rel="alternate" hreflang="ar" href="https://nandovejer.github.io/luz/ar/">',
      '<link rel="alternate" hreflang="x-default" href="https://nandovejer.github.io/luz/">',
    ]);
    const html = renderDocument(LANDING, "apps/landing/index.html", "/es/", site, { locale: i18n.byCode.get("es"), siteUrl: "https://example.org/" });
    expect(html).toContain('<link rel="canonical" href="https://example.org/es/">');
    for (const bad of ["http://example.org/", "https://example.org", "javascript:alert(1)//", 'https://example.org/"><script>/']) {
      expect(() => renderAlternates(i18n, i18n.default, bad), bad).toThrow(/https URL/);
    }
  });

  it("builds the switcher from the registry: links named in their own language, the current one marked, no flags, no script", () => {
    const html = renderSwitcher(i18n, i18n.byCode.get("es"), "Idioma");
    const links = [...html.matchAll(/<a class="luz-lang-switch__link" href="([^"]*)" hreflang="([^"]*)" lang="([^"]*)"( aria-current="page")?>([^<]*)<\/a>/g)].map((m) => [m[1], m[2], m[3], Boolean(m[4]), m[5]]);
    expect(links).toEqual([
      ["/", "en", "en", false, "English"],
      ["/es/", "es", "es", true, "Español"],
      ["/ar/", "ar", "ar", false, "العربية"],
    ]);
    // The tag is the block (<luz-lang-switch>, CSS-only): no wrapper div, no class on it
    expect(html.startsWith("<luz-lang-switch>")).toBe(true);
    expect(html.trimEnd().endsWith("</luz-lang-switch>")).toBe(true);
    expect(html).not.toContain("luz-site-lang-switcher");
    // A native popover: the button names it, says what it is and shows the current language
    expect(html).toContain('<button class="luz-lang-switch__button" type="button" popovertarget="luz-lang-menu">');
    expect(html).toContain('<span class="u-sr-only">Idioma: </span><span class="luz-lang-switch__name">Español</span></button>');
    expect(html).toContain('<nav class="luz-lang-switch__menu" id="luz-lang-menu" popover aria-labelledby="luz-lang-title">');
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

describe("the LUZ home page in every language", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const template = readFileSync(join(repo, "apps/landing/index.html"), "utf-8");
  const docs = landingDocuments(site, "apps/landing/index.html", template);
  const render = (doc) => renderDocument(doc.html, doc.file, doc.route, site, { locale: doc.locale });

  it("publishes at the GitHub Pages URL of the repository, whose path is PAGES_BASE", () => {
    expect(SITE_URL).toBe("https://nandovejer.github.io/luz/");
    expect(new URL(SITE_URL).pathname).toBe(PAGES_BASE);
    const options = { repoRoot: repo, relative: true, outRoot: join(repo, "docs"), pagesBase: PAGES_BASE };
    expect(() => docsSite({ ...options, siteUrl: SITE_URL })).not.toThrow();
    expect(() => docsSite({ ...options, siteUrl: "https://nandovejer.github.io/other/" })).toThrow(/whose path is pagesBase/);
    expect(() => docsSite({ ...options, siteUrl: "http://nandovejer.github.io/luz/" })).toThrow(/https URL/);
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
      for (const key of ["change-mode", "mode-changed", "copied", "copied-status", "copy-failed"]) expect(html, `${code} ${key}`).toMatch(new RegExp(`data-luz-label-${key}="[^"]+"`));
      // The search results are English pages
      expect(html.match(/<ul data-luz-search-list="[a-z]+" lang="en">/g), code).toHaveLength(3);
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

/* ---- The new home (F5): every string in three languages ------------------------ */

describe("the new home page: catalogs and rendered pages (F5)", () => {
  const catalog = (code) => JSON.parse(readFileSync(join(repo, `apps/landing/i18n/${code}.json`), "utf-8"));
  const catalogs = { en: catalog("en"), es: catalog("es"), ar: catalog("ar") };
  const site = scanSite(join(repo, "apps/docs"), repo);
  const template = readFileSync(join(repo, "apps/landing/index.html"), "utf-8");
  const docs = landingDocuments(site, "apps/landing/index.html", template);
  const { rendered, problems } = buildSite(site, { extra: docs });
  const SECTIONS = ["hero", "light", "why", "inside", "native", "modes", "type", "start"];
  const placeholders = (value) => [...value.matchAll(/\{[a-z]+(?::[a-z]+)?\}/g)].map((m) => m[0]).sort();
  /** Values that are the same word in the three languages: a brand, a command, a symbol. */
  const SAME = /^(?:[^\p{L}]*|GitHub|LUZ|ET Book|Core|Site|Tokens|Auto|Tokens \+ Core(?: \+ Site)?)$/u;

  it("the three catalogs have the same keys, and every key is used by a template: no orphan, no missing key", () => {
    expect(Object.keys(catalogs.es).sort()).toEqual(Object.keys(catalogs.en).sort());
    expect(Object.keys(catalogs.ar).sort()).toEqual(Object.keys(catalogs.en).sort());
    expect(problems).toEqual([]);
  });

  it("each key keeps its placeholders in every language", () => {
    for (const [key, value] of Object.entries(catalogs.en)) {
      expect(placeholders(catalogs.es[key]), `es ${key}`).toEqual(placeholders(value));
      expect(placeholders(catalogs.ar[key]), `ar ${key}`).toEqual(placeholders(value));
    }
  });

  it("es and ar are translated: no value is the English one but a brand, a command or a symbol", () => {
    for (const code of ["es", "ar"]) {
      const same = Object.keys(catalogs.en).filter((key) => catalogs[code][key] === catalogs.en[key] && !SAME.test(catalogs.en[key].replace(/<[^>]*>/g, "")));
      expect(same, `${code} values identical to English`).toEqual([]);
    }
  });

  it("ar is written in Arabic: every value that is not a brand or a symbol has an Arabic letter", () => {
    const bare = Object.keys(catalogs.en).filter((key) => !SAME.test(catalogs.en[key].replace(/<[^>]*>/g, "")) && !/[؀-ۿ]/.test(catalogs.ar[key]));
    expect(bare).toEqual([]);
  });

  it("the hero's brand line is English in every language: the eyebrow carries lang=\"en\"", () => {
    for (const doc of docs) {
      const html = rendered.get(doc.route);
      const tag = html.match(/<p\b[^>]*luz-landing-hero__eyebrow[^>]*>/);
      expect(tag, `${doc.route} has the hero's eyebrow`).not.toBeNull();
      expect(tag[0], doc.route).toMatch(/\slang="en"/);
      const text = html.slice(html.indexOf(tag[0]) + tag[0].length).match(/^\s*([^<]*)</)[1].replace(/&amp;/g, "&").trim();
      expect(text, doc.route).toBe("Light, usable & zero-dependency");
    }
  });

  it("each language renders the eight sections in order (fit is inside start), one h1 and no template syntax left", () => {
    for (const doc of docs) {
      const html = rendered.get(doc.route);
      const at = SECTIONS.map((id) => html.search(new RegExp(`<section\\b[^>]*\\sid="${id}"`)));
      expect(at.every((place) => place > -1), `${doc.route} has ${SECTIONS.join(", ")}: ${at.join()}`).toBe(true);
      expect([...at].sort((a, b) => a - b), `${doc.route} in order`).toEqual(at);
      expect(html.match(/<h1\b/g), doc.route).toHaveLength(1);
      expect(html, doc.route).not.toMatch(/\{\{|\}\}|\{n:/);
    }
  });

  it("the old sections are gone from every language", () => {
    for (const doc of docs) {
      const html = rendered.get(doc.route);
      for (const id of ["what", "see", "adopt", "fit"]) expect(html, `${doc.route} #${id}`).not.toMatch(new RegExp(`\\sid="${id}"`));
      expect(html, doc.route).not.toMatch(/landing-h2|landing-points|landing-point__title|landing-lead/);
    }
  });

  it("the footer is the brand and three columns, with the languages and the privacy line, in every language", () => {
    for (const doc of docs) {
      const html = rendered.get(doc.route);
      const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
      expect(footer, doc.route).toContain("luz-landing-footer__brand");
      expect(footer.match(/luz-landing-footer__col-title/g), doc.route).toHaveLength(3);
      expect(footer, doc.route).toMatch(/<luz-mode\b[^>]*\sremember\b[^>]*\sby="clock"/);
      for (const lang of ["en", "es", "ar"]) expect(footer, `${doc.route} → ${lang}`).toMatch(new RegExp(`hreflang="${lang}"`));
    }
    expect(rendered.get("/")).toContain("The light is computed from your clock, never from your location. Your choice stays in this browser.");
    expect(rendered.get("/es/")).not.toContain("Your choice stays in this browser.");
    expect(rendered.get("/ar/")).not.toContain("Your choice stays in this browser.");
  });

  it("the hero's lead is the longer one the owner kept, in every language", () => {
    expect(catalogs.en["hero.lead"]).toBe("LUZ is a design system of tokens, CSS and a little vanilla JavaScript that starts from what the browser already does. No framework and no build step: every component works before JavaScript loads, in light, dark and high-contrast modes.");
    for (const code of ["en", "es", "ar"]) expect(catalogs[code]["hero.lead"].replace(/<[^>]*>/g, "").length, code).toBeGreaterThan(120);
  });

  describe("Spanish", () => {
    /** A value as a reader meets it: tags gone, and what is marked as English (lang="en") left out. */
    const spanish = (value) => value.replace(/<span\b[^>]*\blang="en"[^>]*>[\s\S]*?<\/span>/g, "").replace(/<[^>]*>/g, "");

    it("the hero's lead says framework once at most", () => {
      const mentions = catalogs.es["hero.lead"].replace(/<[^>]*>/g, "").match(/framework/gi) ?? [];
      expect(mentions.length).toBeLessThanOrEqual(1);
    });

    it("a design system is \"sistema de diseño\" everywhere: no \"design system\" outside a lang=\"en\" span", () => {
      const offenders = Object.entries(catalogs.es).filter(([, value]) => /design system/i.test(spanish(value))).map(([key]) => key);
      expect(offenders).toEqual([]);
    });

    it("the progress bar counts steps \"completados\", not \"hechos\"", () => {
      expect(catalogs.es["native.progress.label"]).toContain("completados");
      expect(catalogs.es["native.progress.label"]).not.toContain("hechos");
    });

    it("the title of \"Get started\" writes the tag: <link>", () => {
      const title = catalogs.es["start.title"];
      expect(title.includes("<link>") || title.includes("&lt;link&gt;"), title).toBe(true);
    });
  });

  it("each rendered page stays under the 80 KiB the page ceiling allows", () => {
    for (const doc of docs) expect(Buffer.byteLength(rendered.get(doc.route)), doc.route).toBeLessThanOrEqual(80 * 1024);
  });
});
