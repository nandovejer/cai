/**
 * LUZ docs site: the snippet generator (F4 step 5, spec f4-customisation.md 3.4).
 *
 * The page "Choose your snippet" is written from the files that `npm pack`
 * ships, so a version and a hash are never typed by hand:
 *
 *   snippetData({ root, readFile, dev })  reads each package's package.json and
 *                                         the dist files of FILES; hashes them
 *   renderSnippets(data)                  pure: the HTML of the page (an index
 *                                         table, eight snippets, the chunks)
 *
 * `integrity` is `sha384-` + base64 of the SHA-384 of the bytes of
 * `packages/<name>/dist/<file>`, the algorithm of SECURITY.md. The URL carries
 * the `version` of that package.json. A missing file fails with the file name
 * and `run pnpm build`; with `dev: true` it warns and writes a placeholder, so
 * the page is never silently unsafe. This module reads nothing else: not
 * pack-files.txt, not budgets.json (tests check those against it).
 */
import { createHash } from "node:crypto";
import { join } from "node:path";

/** The files of each package that a snippet or the chunks table names (spec 3.4.1). */
export const FILES = {
  tokens: { css: "luz-tokens.min.css", js: null, chunks: [] },
  core: { css: "luz.min.css", js: "luz.min.js", chunks: ["midi.min.js", "table-sort.min.js", "timeline.min.js", "i18n-es.min.js"] },
  site: { css: "site.min.css", js: "site.min.js", chunks: ["search.min.js", "consent.min.js"] },
  landing: { css: "landing.min.css", js: null, chunks: [] },
  cms: { css: "cms.min.css", js: null, chunks: [] },
  app: { css: "app.min.css", js: null, chunks: [] },
};

/** What the reader is building: its id, its words, and the package that is its kind (null: none). */
export const KINDS = [
  { id: "atoms", label: "Components only", pkg: null },
  { id: "landing", label: "Landing page", pkg: "landing" },
  { id: "blog", label: "Blog or newspaper", pkg: "cms" },
  { id: "app", label: "Web application", pkg: "app" },
];

/** How it is loaded. */
export const WAYS = [
  { id: "npm", label: "npm and a bundler", heading: "With npm and a bundler" },
  { id: "cdn", label: "CDN with integrity hashes", heading: "From a CDN, with integrity hashes" },
];

/** The chunks: where each is loaded from, and when a page needs its line. */
const CHUNK_WHEN = {
  "midi.min.js": ["core", "a <code>.luz-player</code> with <code>data-type=\"midi\"</code>"],
  "table-sort.min.js": ["core", "a sortable table, with <code>th[data-luz-sort]</code>"],
  "timeline.min.js": ["core", "a <code>&lt;luz-timeline&gt;</code>"],
  "i18n-es.min.js": ["core", "an element with <code>lang=\"es\"</code>, on <code>&lt;html&gt;</code> or in the page, outside a link or an option"],
  "search.min.js": ["site", "a <code>&lt;luz-search&gt;</code>"],
  "consent.min.js": ["site", "a <code>&lt;luz-consent&gt;</code>"],
};

const CDN = "https://cdn.jsdelivr.net/npm";
const PLACEHOLDER = "sha384-(run pnpm build)";

/**
 * Read every file of FILES.
 * `root`: the repository; `readFile(path, encoding?)`: the bytes (a Buffer without an
 * encoding); `dev`: warn about a missing dist file instead of throwing; `warn`: where.
 * Returns { entries }: "<pkg>/<file>" → { pkg, version, file, url, integrity }.
 */
export function snippetData({ root, readFile, dev = false, warn = console.warn }) {
  const entries = {};
  for (const [pkg, spec] of Object.entries(FILES)) {
    const manifest = join(root, "packages", pkg, "package.json");
    let version;
    try {
      version = JSON.parse(readFile(manifest, "utf-8")).version;
    } catch (error) {
      throw new Error(`the snippets need ${manifest}: ${error.message}`);
    }
    if (typeof version !== "string" || !/^[0-9A-Za-z.+-]+$/.test(version)) throw new Error(`${manifest}: "version" is not a version`);
    for (const file of [spec.css, spec.js, ...spec.chunks].filter(Boolean)) {
      const path = join(root, "packages", pkg, "dist", file);
      let integrity;
      try {
        integrity = `sha384-${createHash("sha384").update(readFile(path)).digest("base64")}`;
      } catch {
        const message = `packages/${pkg}/dist/${file} is missing: run pnpm build`;
        if (!dev) throw new Error(message);
        warn(`[docs] ${message}`);
        integrity = PLACEHOLDER;
      }
      entries[`${pkg}/${file}`] = { pkg, version, file, url: `${CDN}/@luz-ds/${pkg}@${version}/dist/${file}`, integrity };
    }
  }
  return { entries };
}

/* ---- Markup -------------------------------------------------------------- */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** The lines of a snippet; a `null` is a blank line. */
const text = (lines) => lines.map((l) => (l === null ? "" : esc(l))).join("\n");

const OPTIONAL_SITE = "Optional: site adds the search, the cookie banner and the language switch. Delete the site lines if the page has none of them.";
const OPTIONAL_SITE_SCRIPT = "Optional, with the site stylesheet: the search and the cookie banner";

function cdnCode(data, kind) {
  const at = (pkg, file) => data.entries[`${pkg}/${file}`];
  const link = (e) => `<link rel="stylesheet" href="${e.url}" integrity="${e.integrity}" crossorigin="anonymous">`;
  const script = (e) => `<script type="module" src="${e.url}" integrity="${e.integrity}" crossorigin="anonymous"></script>`;
  const lines = [link(at("tokens", FILES.tokens.css)), link(at("core", FILES.core.css))];
  if (kind.pkg) {
    lines.push(`<!-- ${OPTIONAL_SITE} -->`, link(at("site", FILES.site.css)), link(at(kind.pkg, FILES[kind.pkg].css)));
  }
  lines.push(null, "<!-- Optional: copy buttons, tabs, players, the color mode -->", script(at("core", FILES.core.js)));
  if (kind.pkg) lines.push(`<!-- ${OPTIONAL_SITE_SCRIPT} -->`, script(at("site", FILES.site.js)));
  return text(lines);
}

function npmCode(kind) {
  const lines = ['import "@luz-ds/tokens/css";', 'import "@luz-ds/core/css";'];
  if (kind.pkg) {
    lines.push(`// ${OPTIONAL_SITE}`, 'import "@luz-ds/site/css";', `import "@luz-ds/${kind.pkg}/css";`);
  }
  lines.push(null, "// Optional: copy buttons, tabs, players, the color mode", 'import "@luz-ds/core";');
  if (kind.pkg) lines.push(`// ${OPTIONAL_SITE_SCRIPT}`, 'import "@luz-ds/site";');
  return text(lines);
}

const installCommand = (kind) => `pnpm add ${["@luz-ds/tokens", "@luz-ds/core", ...(kind.pkg ? ["@luz-ds/site", `@luz-ds/${kind.pkg}`] : [])].join(" ")}`;

/** A code block with its copy button, in the markup of the Install page. */
function codeBlock({ id, lang, label, aria, code }) {
  return `        <div class="docs-snippet">
          <div class="docs-snippet__bar">
            <span class="docs-snippet__lang">${esc(label)}</span>
            <button class="luz-copy-btn" type="button" data-copy-from="code-${id}" aria-label="Copy ${esc(aria)}">Copy</button>
          </div>
          <pre class="luz-code-block" data-lang="${lang}" tabindex="0" role="region" aria-label="${esc(aria[0].toUpperCase() + aria.slice(1))}"><code id="code-${id}">${code}</code></pre>
        </div>`;
}

function renderSnippet(data, kind, way) {
  const id = `${kind.id}-${way.id}`;
  const open = `      <div data-snippet data-kind="${kind.id}" data-via="${way.id}" id="${id}">\n        <h3>${esc(`${kind.label}: ${way.heading[0].toLowerCase()}${way.heading.slice(1)}`)}</h3>`;
  if (way.id === "npm") {
    const command = installCommand(kind);
    const note = kind.pkg
      ? `\n        <p>Site is optional: leave <code>@luz-ds/site</code> out of the command and out of the imports if the page has no search, cookie banner or language switch.</p>`
      : "";
    return `${open}
        <div class="docs-command-block">
          <code class="docs-command-block__cmd">
            <span class="docs-command-block__prefix" aria-hidden="true">$</span>
            ${esc(command)}
          </code>
          <button class="luz-copy-btn" type="button" data-copy="${esc(command)}" aria-label="Copy the install command, ${esc(kind.label.toLowerCase())}">Copy</button>
        </div>${note}
${codeBlock({ id, lang: "js", label: "Bundler", aria: `the bundler imports, ${kind.label.toLowerCase()}`, code: npmCode(kind) })}
      </div>`;
  }
  return `${open}
${codeBlock({ id, lang: "html", label: "HTML", aria: `the CDN tags, ${kind.label.toLowerCase()}`, code: cdnCode(data, kind) })}
      </div>`;
}

/**
 * The index table, and the picker that replaces it with JavaScript. The picker is
 * inside a <template>: without a script it is not in the page at all (docs.spec.js
 * allows no `hidden` element in main), and the script clones it in (step 6).
 */
function renderIndex() {
  const rows = KINDS.map((kind) => {
    const cell = (way) => {
      const how = way.id === "npm" ? "with npm" : "from a CDN";
      return `<td data-label="${esc(way.label)}"><div><a href="#${kind.id}-${way.id}">${esc(kind.label)}, ${how}</a></div></td>`;
    };
    return `            <tr><th scope="row">${esc(kind.label)}</th>${cell(WAYS[0])}${cell(WAYS[1])}</tr>`;
  });
  return `    <section class="docs-block" aria-labelledby="choose">
      <h2 class="docs-chapter__title" id="choose">Choose</h2>
      <template data-docs-picker>
      <form class="docs-picker">
        <fieldset>
          <legend>What are you building?</legend>
${KINDS.map((k, i) => `          <label><input type="radio" name="kind" value="${k.id}"${i === 0 ? " checked" : ""}> ${esc(k.label)}</label>`).join("\n")}
        </fieldset>
        <fieldset>
          <legend>How do you load it?</legend>
${WAYS.map((w, i) => `          <label><input type="radio" name="via" value="${w.id}"${i === 0 ? " checked" : ""}> ${esc(w.label)}</label>`).join("\n")}
        </fieldset>
        <output data-picker-status></output>
      </form>
      </template>
      <div class="luz-table-wrap" role="region" aria-label="Every snippet" tabindex="0">
        <table class="luz-table">
          <caption>Every snippet</caption>
          <thead>
            <tr><th scope="col">What you are building</th><th scope="col">${esc(WAYS[0].label)}</th><th scope="col">${esc(WAYS[1].label)}</th></tr>
          </thead>
          <tbody>
${rows.join("\n")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderChunks(data) {
  const rows = Object.entries(CHUNK_WHEN).map(([file, [pkg, when]]) => {
    const e = data.entries[`${pkg}/${file}`];
    const id = `chunk-${pkg}-${file.replace(/\.min\.js$/, "")}`;
    const line = `<link rel="modulepreload" href="${e.url}" integrity="${e.integrity}" crossorigin="anonymous">`;
    return `            <tr>
              <th scope="row"><code>${esc(file)}</code></th>
              <td data-label="Add the line only if the page has"><div>${when}</div></td>
              <td data-label="Line to add"><div class="docs-snippet">
                <div class="docs-snippet__bar">
                  <span class="docs-snippet__lang">HTML</span>
                  <button class="luz-copy-btn" type="button" data-copy-from="code-${id}" aria-label="Copy the line for ${esc(file)}">Copy</button>
                </div>
                <pre class="luz-code-block" data-lang="html" tabindex="0" role="region" aria-label="Line for ${esc(file)}"><code id="code-${id}">${esc(line)}</code></pre>
              </div></td>
            </tr>`;
  });
  return `    <section class="docs-block" aria-labelledby="chunks">
      <h2 class="docs-chapter__title" id="chunks">Lazy chunks</h2>
      <p>Core and site load some files only when the page needs them: a sortable table, a timeline, a MIDI player, a page in Spanish, the search, the cookie banner. A hash on a script covers that file only, so give each chunk its own hash in a <code>modulepreload</code> link before the script that loads it. The browser checks the file there, and a file with a wrong hash never runs.</p>
      <p>These lines are not in the snippets above on purpose: a <code>modulepreload</code> fetches at once, so one in every snippet would download a MIDI parser for a page with no player. Add a line only if the page has what its row names.</p>
      <div class="luz-table-wrap" role="region" aria-label="Lazy chunks" tabindex="0">
        <table class="luz-table">
          <caption>Lazy chunks</caption>
          <thead>
            <tr><th scope="col">File</th><th scope="col">Add the line only if the page has</th><th scope="col">Line to add</th></tr>
          </thead>
          <tbody>
${rows.join("\n")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderVerify() {
  return `    <section class="docs-block" aria-labelledby="verify">
      <h2 class="docs-chapter__title" id="verify">Verify a hash yourself</h2>
      <p>Every hash on this page is computed from the file that the package publishes, when the documentation is built. To check one, download the file you load and hash it the same way:</p>
      <div class="docs-snippet">
        <div class="docs-snippet__bar">
          <span class="docs-snippet__lang">Shell</span>
          <button class="luz-copy-btn" type="button" data-copy-from="code-verify" aria-label="Copy the command that computes a hash">Copy</button>
        </div>
        <pre class="luz-code-block" data-lang="text" tabindex="0" role="region" aria-label="Computing a hash"><code id="code-verify">${esc("curl -s <url of the file> | openssl dgst -sha384 -binary | openssl base64 -A")}</code></pre>
      </div>
      <p>The result, after <code>sha384-</code>, is the value of <code>integrity</code>. If it differs from the page, do not load the file: the version in the URL or the file itself has changed.</p>
    </section>`;
}

/**
 * The HTML of the page: the index table (and the form that JavaScript reveals), a
 * section per kind with its two snippets, the chunks and the note on verifying.
 */
export function renderSnippets(data) {
  const sections = KINDS.map(
    (kind) => `    <section data-snippet-kind="${kind.id}" aria-labelledby="${kind.id}">
      <h2 class="docs-chapter__title" id="${kind.id}">${esc(kind.label)}</h2>
${WAYS.map((way) => renderSnippet(data, kind, way)).join("\n")}
    </section>`,
  );
  return [renderIndex(), ...sections, renderChunks(data), renderVerify()].join("\n");
}
