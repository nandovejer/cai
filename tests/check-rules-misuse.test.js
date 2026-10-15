/**
 * F5 step 10, the rules of misuse and accessibility of @luz-ds/check
 * (.claude/plans/specs/f5-ai-ready.md 5.5 and 5.6 for misuse/host-element,
 * misuse/modifier-alone, misuse/part-orphan, misuse/state-class,
 * a11y/role-on-generic and a11y/link-no-href; D13; the review answers of
 * accessibility-engineer Q1, "False blocks to prevent" and "False passes to
 * prevent"; security-auditor Q3 and Q5).
 *
 * The load rules are tests/check-rules-load.test.js. The fixtures are read
 * by the runner of tests/helpers/check-fixtures.js, keyed by rule-id prefix.
 * The `@host` header grammar and the `hosts` key of classes.json are
 * tests/class-manifest.test.js; tests/check-data.test.js has the snapshot.
 *
 * The contract, new in this step:
 *
 *   hosts   a class entry of a manifest (installed or bundled) may carry
 *           `hosts`: an array of selectors, each a tag name with at most one
 *           attribute test: `a`, `input[type=submit]`, `a[href]`. The rules
 *           have no table of their own (D13): a class without `hosts` is
 *           never judged by host-element, and what the manifest lists is
 *           the whole truth. A manifest whose `hosts` is not an array of such
 *           selectors is not a usable manifest: that package falls back to
 *           the snapshot, like any other malformed one.
 *   An element matches a selector when its name is the tag and, when the
 *   selector has a test, the attribute is there (`[href]`) or equals the
 *   value, ASCII case-insensitively (`[type=submit]`). An attribute whose
 *   value is a template expression (`{{`, `<%`, `${`) or whose name is a
 *   binding (`:type`) may be anything and matches.
 *
 *   misuse/host-element   a class token that has `hosts` on an element that
 *       matches none of them: block, at the class attribute, once per
 *       element. Not judged: an element under `[inert]` (itself or an
 *       ancestor; what follows the inert element is judged again), and a tag
 *       that is not a lowercase HTML name: `<Button>`, `<RouterLink>`,
 *       `<router-link>`, `<Div>`, `{{ tag }}`. Token rules are those of
 *       class/unknown: a token with `{ } $ : @ [` is skipped.
 *   misuse/modifier-alone a class that is a modifier (`--`) on an element
 *       that does not also have the class it modifies: the name before the
 *       `--`, so `luz-dropdown__item--danger` needs `luz-dropdown__item`,
 *       not `luz-dropdown`. block, at the class attribute, once for each
 *       modifier. The tag of the element is the base when it is that custom
 *       element (`<luz-timeline class="luz-timeline--vertical">`). Not
 *       judged: an element whose class attribute may bring the base at run
 *       time (a token with `{ } $ < % @ (`, or a binding of the class:
 *       `:class`, `v-bind:class`, `[ngClass]`, `x-bind:class`).
 *   misuse/part-orphan    warn, at the class attribute: a `__part` class
 *       with no element of its block among the ancestors in the file, the
 *       block being a class on an ancestor or the custom-element tag.
 *   misuse/state-class    warn, at the class attribute: an `is-*` class that
 *       a manifest has, unless a stylesheet of the run (a .css file or a
 *       <style>) defines it: then it is the project's own.
 *   a11y/role-on-generic  warn, at the `role` attribute: `role` of button,
 *       link, checkbox, radio, textbox, switch, dialog, navigation, table,
 *       heading, list or main on a `div` or a `span`; and at the `onclick`
 *       attribute: `onclick` on a `div` or `span` with no `tabindex`. Not
 *       reported for an element that misuse/host-element reported.
 *   a11y/link-no-href     warn, at the `<` of the tag: an `<a>` with a class
 *       whose `hosts` has `a` and no `href`, `:href` or `[href]`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { run } from "../packages/check/src/cli.js";
import { checkModule } from "./helpers/check-modules.js";
import { MINI, VERSION, builtData, checkCase, checkJson, fixtureCases, key, miniSnapshot, passCases, put, removeWorkspaces, where, workspace } from "./helpers/check-fixtures.js";
import { check, ofRule, page, rulesOf, wordsOf } from "./helpers/check-run.js";

const messages = await checkModule("messages");

afterAll(removeWorkspaces);

const PREFIXES = ["misuse/", "a11y/"];
const MISUSE = (result) => ofRule(result, "misuse/");
const A11Y = (result) => ofRule(result, "a11y/");
const body = (...lines) => lines.map((line) => `  ${line}`).join("\n");

// A world with a class of our own that has hosts, and one with the dropdown (a modifier of a part)
const CORE = MINI.core.classes;
const PANEL = { name: "luz-panel", hosts: ["article", "section", "a[href]"] };
const CHIP = { name: "luz-chip", hosts: ["a", "span"] };
const DROPDOWN = ["luz-dropdown", "luz-dropdown__item", "luz-dropdown__item--danger", "luz-timeline--vertical"];
const WORLD = { snapshot: { overrides: { core: { classes: [...CORE, PANEL, CHIP, ...DROPDOWN] } } } };

/* ---- The fixtures ------------------------------------------------------------------------------ */

describe("the fixtures: every file makes the rules of misuse say what its expect comments say", () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await builtData();
  });

  const cases = fixtureCases(PREFIXES);

  it("has the files this step needs, each with an expect comment", () => {
    const paths = cases.map((c) => c.path);
    for (const path of ["fail/host-div.html", "fail/modifier-alone.html", "warn/markup.html"]) expect(paths, path).toContain(path);
  });

  it.each(cases)("$path: exactly its expected findings of misuse/ and a11y/, at the line and column it names", (entry) => {
    expect(snapshot.error, "the build writes dist/data (scripts/build-check.js)").toBeNull();
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.data, `stdout is JSON (stderr: ${result.stderr})`).not.toBeNull();
    expect(result.found.map(key)).toEqual(result.expected.map(key));
    for (const found of result.found) {
      const blocks = found.rule === "misuse/host-element" || found.rule === "misuse/modifier-alone";
      expect(found.severity, key(found)).toBe(blocks ? "block" : "warn");
      expect(found.file, key(found)).toBe(entry.path);
      expect(wordsOf(found.rule, found.message), `${key(found)} is worded by a template of messages.js`).toBe(true);
      expect(found.docs, key(found)).toBe(messages.docsUrl(found.rule));
    }
    if (entry.folder === "fail") expect(result.code).toBe(1);
    else expect(result.code, "a warning never fails").toBe(0);
  });

  it.each(passCases())("$path: nothing from the rules of misuse (a host of the table, a framework tag and an inert stage are not mistakes)", (entry) => {
    expect(snapshot.error).toBeNull();
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.found.map(key)).toEqual([]);
  });

  it("has the pass file that shows every element a button class may sit on", () => {
    expect(passCases().map((c) => c.path)).toContain("pass/hosts.html");
  });
});

/* ---- misuse/host-element ------------------------------------------------------------------------ */

describe("misuse/host-element", () => {
  it("blocks a class with hosts on another element, at its class attribute, and lists the elements it works on", () => {
    const html = page(body('<div class="luz-btn luz-btn--primary">Save changes</div>'));
    const result = check({ "index.html": html });
    const at = where(html, 'class="luz-btn');
    expect(result.code).toBe(1);
    expect(MISUSE(result)).toHaveLength(1);
    const [found] = MISUSE(result);
    expect(found).toMatchObject({ rule: "misuse/host-element", severity: "block", file: "index.html", line: at.line, column: at.column });
    expect(found.message.startsWith(".luz-btn is on <div>; use ")).toBe(true);
    expect(found.message).toContain("<a>");
    expect(found.message).toContain("<button>");
    expect(found.message.length).toBeLessThanOrEqual(messages.MAX_MESSAGE);
    expect(wordsOf("misuse/host-element", found.message)).toBe(true);
    expect(found.docs).toBe(messages.docsUrl("misuse/host-element"));
  });

  it.each([
    ['<a class="luz-btn" href="/pricing/">Pricing</a>'],
    ['<a class="luz-btn">No destination: a11y/link-no-href says so, not this rule</a>'],
    ['<button class="luz-btn" type="button">Open</button>'],
    ['<button class="luz-btn">Open</button>'],
    ['<input class="luz-btn" type="button" value="Open">'],
    ['<input class="luz-btn" type="submit" value="Send">'],
    ['<input class="luz-btn" type="reset" value="Clear">'],
    ['<input class="luz-btn" type="SUBMIT" value="Send">'],
    ['<input class="luz-btn" type="{{ kind }}" value="Send">'],
    ['<input class="luz-btn" :type="kind" value="Send">'],
  ])("lets the elements of the accessibility review through: %s", (markup) => {
    expect(MISUSE(check({ "index.html": page(body(markup)) }))).toEqual([]);
  });

  it.each([
    ["div", '<div class="luz-btn">x</div>'],
    ["span", '<span class="luz-btn">x</span>'],
    ["p", '<p class="luz-btn">x</p>'],
    ["li", '<li class="luz-btn">x</li>'],
    ["h2", '<h2 class="luz-btn">x</h2>'],
    ["section", '<section class="luz-btn">x</section>'],
    ["label", '<label class="luz-btn" for="x">x</label>'],
    ["summary", '<summary class="luz-btn">x</summary>'],
    ["input", '<input class="luz-btn" value="x">'],
    ["input", '<input class="luz-btn" type="text" value="x">'],
    ["input", '<input class="luz-btn" type="checkbox">'],
    ["select", '<select class="luz-btn"><option>x</option></select>'],
  ])("blocks it on <%s> (a label and a summary are not hosts: they have no focus ring and no :disabled): %s", (tag, markup) => {
    const html = page(body(markup));
    const found = MISUSE(check({ "index.html": html }));
    const at = where(html, 'class="luz-btn"');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "misuse/host-element", severity: "block", line: at.line, column: at.column });
    expect(found[0].message.startsWith(`.luz-btn is on <${tag}>; use `)).toBe(true);
  });

  it("is one finding for an element, however many tokens, and one for each element", () => {
    const html = page(body('<div class="luz-btn luz-btn luz-btn--primary luz-btn--lg">a</div>', '<span class="luz-btn">b</span>'));
    const found = MISUSE(check({ "index.html": html }));
    expect(found.map((f) => [f.rule, f.line])).toEqual([
      ["misuse/host-element", where(html, 'class="luz-btn luz-btn luz-btn--primary').line],
      ["misuse/host-element", where(html, '<span class="luz-btn">').line],
    ]);
  });

  it("does not judge what is inert: the element, its descendants, and only them", () => {
    const html = page(
      body(
        '<div class="luz-btn" inert>self</div>',
        '<div inert><section><p><span class="luz-btn">deep</span></p></section></div>',
        '<div class="docs-dodont__stage" inert aria-hidden="true"><div class="luz-btn luz-btn--primary">stage</div></div>',
        '<p class="luz-btn">after</p>',
      ),
    );
    const found = MISUSE(check({ "index.html": html }));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ line: where(html, 'class="luz-btn">after').line, column: where(html, 'class="luz-btn">after').column });
  });

  it("does not judge a tag that is not a lowercase HTML name: a framework's component, a custom element, a computed tag", () => {
    const html = page(
      body(
        '<Button class="luz-btn">a</Button>',
        '<RouterLink class="luz-btn" to="/x/">b</RouterLink>',
        '<router-link class="luz-btn" to="/x/">c</router-link>',
        '<Div class="luz-btn">d</Div>',
        '<{{ tag }} class="luz-btn">e</{{ tag }}>',
      ),
    );
    expect(MISUSE(check({ "index.html": html }))).toEqual([]);
  });

  it("does not judge a class that is computed, or a binding", () => {
    const html = page(
      body('<div class="luz-btn{{ x }}">a</div>', '<div class="luz-${kind}">b</div>', "<div :class=\"'luz-btn'\">c</div>", '<div className="luz-btn">d</div>', '<div class="{{ classes }}">e</div>'),
    );
    expect(MISUSE(check({ "index.html": html }))).toEqual([]);
  });

  it("judges a file of --ext the same way, and skips the component tags of its framework", () => {
    const view = ['<template>', '  <div class="luz-btn">plain div</div>', '  <Button class="luz-btn">component</Button>', "</template>", ""].join("\n");
    const result = check({ "view.vue": view }, { argv: [".", "--ext", ".vue"] });
    expect(MISUSE(result).map((f) => [f.rule, f.file, f.line])).toEqual([["misuse/host-element", "view.vue", 2]]);
  });

  it("takes the elements from the manifest, never from a table of its own (D13)", () => {
    const html = page(body('<div class="luz-panel">div</div>', '<article class="luz-panel">article</article>', '<section class="luz-panel">section</section>', '<a class="luz-panel" href="/x/">link</a>', '<a class="luz-panel">no href</a>'));
    const found = MISUSE(check({ "index.html": html }, WORLD));
    expect(found.map((f) => f.line)).toEqual([where(html, '<div class="luz-panel">').line, where(html, '<a class="luz-panel">').line]);
    expect(found[0].message.startsWith(".luz-panel is on <div>; use ")).toBe(true);
    expect(found[0].message).toContain("<article>");
  });

  it("judges nothing for a class whose manifest has no hosts, as an older release's has not", () => {
    const html = page(body('<div class="luz-btn">a</div>'));
    const old = { snapshot: { overrides: { core: { classes: ["luz-btn", "luz-btn--primary"] } } } };
    expect(MISUSE(check({ "index.html": html }, old))).toEqual([]);
    const installed = check({ "index.html": html }, { installed: { version: "0.0.9", overrides: { core: { classes: ["luz-btn", "luz-btn--primary"] } }, only: ["core"] } });
    expect(MISUSE(installed)).toEqual([]);
  });

  it("reads the hosts of the project's own node_modules before the snapshot's", () => {
    const html = page(body('<div class="luz-btn">a</div>', '<label class="luz-btn">b</label>'));
    const stricter = { version: "0.2.0", overrides: { core: { classes: [{ name: "luz-btn", hosts: ["label"] }, "luz-btn--primary"] } }, only: ["core"] };
    const found = MISUSE(check({ "index.html": html }, { installed: stricter }));
    expect(found.map((f) => f.line)).toEqual([where(html, '<div class="luz-btn">').line]);
    expect(found[0].message).toContain("<label>");
  });

  it("falls back to the snapshot for a manifest whose hosts are not selectors, and never echoes them", () => {
    const html = page(body('<div class="luz-btn">a</div>'));
    for (const hosts of ["div", ["a", "<script>alert(1)</script>"], ["a b"], [".luz-btn"], [5], ["a".repeat(100)]]) {
      const installed = { version: "0.2.0", overrides: { core: { classes: [{ name: "luz-btn", hosts }, "luz-btn--primary"] } }, only: ["core"] };
      const result = check({ "index.html": html }, { installed });
      expect(result.stderr, JSON.stringify(hosts)).toBe("");
      expect(result.data.manifests.find((m) => m.package === "@luz-ds/core"), JSON.stringify(hosts)).toMatchObject({ source: "bundled" });
      expect(MISUSE(result).map((f) => f.rule), JSON.stringify(hosts)).toEqual(["misuse/host-element"]);
      expect(result.stdout, JSON.stringify(hosts)).not.toContain("<script>");
    }
  });

  it("reports it once when the element also has a role or an onclick: the role is what to fix second", () => {
    const html = page(body('<div class="luz-btn" role="button" tabindex="0">a</div>', '<span class="luz-btn" onclick="go()">b</span>'));
    const result = check({ "index.html": html });
    expect(rulesOf(result, "misuse/", "a11y/")).toEqual(["misuse/host-element", "misuse/host-element"]);
  });
});

/* ---- misuse/modifier-alone ---------------------------------------------------------------------- */

describe("misuse/modifier-alone", () => {
  it("blocks a modifier without the class it modifies, at the class attribute, and says to add it", () => {
    const html = page(body('<button class="luz-btn--primary" type="submit">Save</button>'));
    const result = check({ "index.html": html });
    const at = where(html, 'class="luz-btn--primary"');
    expect(result.code).toBe(1);
    expect(MISUSE(result)).toHaveLength(1);
    expect(MISUSE(result)[0]).toMatchObject({ rule: "misuse/modifier-alone", severity: "block", line: at.line, column: at.column });
    expect(MISUSE(result)[0].message).toBe(messages.message("misuse/modifier-alone", { modifier: "luz-btn--primary", block: "luz-btn" }));
    expect(MISUSE(result)[0].docs).toBe(messages.docsUrl("misuse/modifier-alone"));
  });

  it("is silent with the block on the same element, in any position, and for two modifiers of it", () => {
    const html = page(body('<button class="luz-btn luz-btn--primary">a</button>', '<button class="luz-btn--lg luz-btn--primary luz-btn" type="button">b</button>', '<div class="luz-alert luz-alert--error">c</div>'));
    expect(MISUSE(check({ "index.html": html }))).toEqual([]);
  });

  it("reports each modifier that has no base, and not the ones that have", () => {
    const html = page(body('<button class="luz-btn--primary luz-btn--lg" type="button">a</button>', '<button class="luz-btn luz-btn--lg luz-alert--error" type="button">b</button>'));
    const found = MISUSE(check({ "index.html": html }));
    expect(found.map((f) => f.message)).toEqual([
      messages.message("misuse/modifier-alone", { modifier: "luz-btn--primary", block: "luz-btn" }),
      messages.message("misuse/modifier-alone", { modifier: "luz-btn--lg", block: "luz-btn" }),
      messages.message("misuse/modifier-alone", { modifier: "luz-alert--error", block: "luz-alert" }),
    ]);
  });

  it("asks for the class a modifier modifies: the part, for the modifier of a part (the docs' dropdown is right)", () => {
    const ok = page(body('<div class="luz-dropdown"><button class="luz-dropdown__item luz-dropdown__item--danger" type="button">Delete</button></div>'));
    expect(MISUSE(check({ "index.html": ok }, WORLD))).toEqual([]);
    const alone = page(body('<div class="luz-dropdown"><span class="luz-dropdown__item--danger">Delete</span></div>'));
    const found = MISUSE(check({ "index.html": alone }, WORLD));
    expect(found.map((f) => f.message)).toEqual([messages.message("misuse/modifier-alone", { modifier: "luz-dropdown__item--danger", block: "luz-dropdown__item" })]);
  });

  it("takes the custom-element tag as the base", () => {
    const html = page(body('<luz-timeline class="luz-timeline--vertical"><ol><li>1</li></ol></luz-timeline>'));
    expect(MISUSE(check({ "index.html": html }, WORLD))).toEqual([]);
  });

  it("is silent when the class attribute may bring the base at run time", () => {
    const html = page(
      body(
        '<button class="{{ base }} luz-btn--primary" type="button">a</button>',
        '<button class="${base} luz-btn--primary" type="button">b</button>',
        '<button :class="base" class="luz-btn--primary" type="button">c</button>',
        '<button v-bind:class="base" class="luz-btn--primary" type="button">d</button>',
        '<button [ngClass]="base" class="luz-btn--primary" type="button">e</button>',
        '<button x-bind:class="base" class="luz-btn--primary" type="button">f</button>',
      ),
    );
    expect(MISUSE(check({ "index.html": html }))).toEqual([]);
  });

  it("is silent for a name no manifest has: that is class/unknown's", () => {
    const result = check({ "index.html": page(body('<button class="luz-btn--nope" type="button">a</button>')) });
    expect(rulesOf(result, "misuse/")).toEqual([]);
    expect(rulesOf(result, "class/")).toEqual(["class/unknown"]);
  });

  it("does not take another element's class for the base", () => {
    const html = page(body('<div class="luz-btn"><span class="luz-btn--primary">x</span></div>'));
    const found = MISUSE(check({ "index.html": html }));
    expect(found.map((f) => f.rule)).toEqual(["misuse/host-element", "misuse/modifier-alone"]);
  });
});

/* ---- misuse/part-orphan ------------------------------------------------------------------------- */

describe("misuse/part-orphan", () => {
  it("warns about a part with no element of its block around it, at the class attribute, and does not fail", () => {
    const html = page(body("<main>", '  <h2 class="luz-card__title">A card part with no card</h2>', "</main>"));
    const result = check({ "index.html": html });
    const at = where(html, 'class="luz-card__title"');
    expect(result.code).toBe(0);
    expect(MISUSE(result)).toHaveLength(1);
    expect(MISUSE(result)[0]).toMatchObject({ rule: "misuse/part-orphan", severity: "warn", line: at.line, column: at.column });
    expect(MISUSE(result)[0].message).toBe(messages.message("misuse/part-orphan", { name: "luz-card__title", block: "luz-card" }));
    expect(MISUSE(result)[0].docs).toBe(messages.docsUrl("misuse/part-orphan"));
  });

  it("is silent for a part inside its block, however deep, and for the block as a custom-element tag", () => {
    const html = page(
      body(
        '<article class="luz-card"><div><div><h2 class="luz-card__title">a</h2></div></div><p class="luz-card__body">b</p></article>',
        '<luz-search><input class="luz-search__field" type="search" aria-label="Search"></luz-search>',
      ),
    );
    expect(MISUSE(check({ "index.html": html }))).toEqual([]);
  });

  it("does not take a sibling, or a block that has already closed, for an ancestor", () => {
    const html = page(body('<div class="luz-card"><p>a</p></div>', '<h2 class="luz-card__title">outside</h2>'));
    expect(MISUSE(check({ "index.html": html })).map((f) => f.rule)).toEqual(["misuse/part-orphan"]);
  });

  it("keeps a part inside its block through elements whose end tag is left out", () => {
    const html = page(body('<section class="luz-card">', "  <p>One", "  <p>Two", "  <ul><li>a<li>b</ul>", '  <h2 class="luz-card__title">x</h2>', "</section>"));
    expect(MISUSE(check({ "index.html": html }))).toEqual([]);
  });

  it("fails --strict, like any warning", () => {
    const dir = workspace({ "index.html": page(body('<h2 class="luz-card__title">x</h2>')) });
    expect(run([".", "--strict"], { version: VERSION, cwd: dir, data: miniSnapshot() }).code).toBe(1);
  });
});

/* ---- misuse/state-class ------------------------------------------------------------------------- */

describe("misuse/state-class", () => {
  it("warns about a state class LUZ's script sets, written in the markup, at the class attribute", () => {
    const html = page(body('<ul class="luz-tabs"><li class="is-active">One</li></ul>'));
    const result = check({ "index.html": html });
    const at = where(html, 'class="is-active"');
    expect(result.code).toBe(0);
    expect(MISUSE(result)).toHaveLength(1);
    expect(MISUSE(result)[0]).toMatchObject({ rule: "misuse/state-class", severity: "warn", line: at.line, column: at.column });
    expect(MISUSE(result)[0].message).toBe(messages.message("misuse/state-class", { name: "is-active" }));
    expect(MISUSE(result)[0].docs).toBe(messages.docsUrl("misuse/state-class"));
  });

  it("is only for the names LUZ has: the project's own is-featured is not a mistake", () => {
    const html = page(body('<li class="is-featured is-open">x</li>'));
    expect(MISUSE(check({ "index.html": html }))).toEqual([]);
  });

  it("leaves the project's own is-active, when a stylesheet of the run defines it, in a file or in a <style>", () => {
    const html = page(body('<li class="is-active">x</li>'));
    expect(MISUSE(check({ "index.html": html }))).toHaveLength(1);
    expect(MISUSE(check({ "index.html": html, "css/own.css": ".is-active {\n  font-weight: bold;\n}\n" }))).toEqual([]);
    const inline = page(body('<li class="is-active">x</li>'), '  <style>\n    .is-active {\n      font-weight: bold;\n    }\n  </style>\n');
    expect(MISUSE(check({ "index.html": inline }))).toEqual([]);
  });
});

/* ---- a11y/role-on-generic ----------------------------------------------------------------------- */

describe("a11y/role-on-generic", () => {
  const ROLES = ["button", "link", "checkbox", "radio", "textbox", "switch", "dialog", "navigation", "table", "heading", "list", "main"];

  it.each(ROLES.flatMap((role) => ["div", "span"].map((tag) => [role, tag])))("warns about role=%s on <%s>, at the role attribute", (role, tag) => {
    const html = page(body(`<${tag} role="${role}" tabindex="0">x</${tag}>`));
    const result = check({ "index.html": html });
    const at = where(html, "role=");
    expect(result.code).toBe(0);
    expect(A11Y(result)).toHaveLength(1);
    expect(A11Y(result)[0]).toMatchObject({ rule: "a11y/role-on-generic", severity: "warn", line: at.line, column: at.column });
    expect(A11Y(result)[0].message).toContain(role);
    expect(A11Y(result)[0].message).toContain(`<${tag}>`);
    expect(wordsOf("a11y/role-on-generic", A11Y(result)[0].message)).toBe(true);
    expect(A11Y(result)[0].docs).toBe(messages.docsUrl("a11y/role-on-generic"));
  });

  it("warns about onclick on a div or a span with no tabindex, at the onclick attribute", () => {
    const html = page(body('<div onclick="go()">a</div>', '<span onclick="go()">b</span>'));
    const found = A11Y(check({ "index.html": html }));
    const first = where(html, "onclick");
    const second = where(html, "onclick", html.indexOf("<span onclick"));
    expect(found.map((f) => [f.rule, f.severity, f.line, f.column])).toEqual([
      ["a11y/role-on-generic", "warn", first.line, first.column],
      ["a11y/role-on-generic", "warn", second.line, second.column],
    ]);
    expect(found[0].message).toContain("onclick");
    expect(wordsOf("a11y/role-on-generic", found[0].message)).toBe(true);
  });

  it("is silent for what is native or not a widget: other elements, other roles, a tabindex with the onclick, no role", () => {
    const html = page(
      body(
        '<button role="button" type="button">a</button>',
        '<a role="button" href="/x/">b</a>',
        '<li role="button">c</li>',
        '<div role="region" aria-label="Plans" tabindex="0">d</div>',
        '<div role="tablist">e</div>',
        '<div role="presentation">f</div>',
        '<div role="status">g</div>',
        '<div role="{{ role }}">h</div>',
        '<div onclick="go()" tabindex="0">i</div>',
        '<button onclick="go()" type="button">j</button>',
        '<a onclick="go()" href="/x/">k</a>',
        '<div>l</div>',
      ),
    );
    expect(A11Y(check({ "index.html": html }))).toEqual([]);
  });

  it("is not reported twice for an element host-element already reported", () => {
    const html = page(body('<div class="luz-btn" role="button" tabindex="0">a</div>', '<span class="luz-btn" onclick="go()">b</span>', '<div role="button" tabindex="0">c</div>'));
    const result = check({ "index.html": html });
    expect(result.findings.filter((f) => ["misuse/host-element", "a11y/role-on-generic"].includes(f.rule)).map((f) => [f.rule, f.line])).toEqual([
      ["misuse/host-element", where(html, 'class="luz-btn" role="button"').line],
      ["misuse/host-element", where(html, 'class="luz-btn" onclick').line],
      ["a11y/role-on-generic", where(html, '<div role="button" tabindex="0">c').line],
    ]);
  });
});

/* ---- a11y/link-no-href -------------------------------------------------------------------------- */

describe("a11y/link-no-href", () => {
  it("warns about a link styled as a button with no destination, at the < of the tag, and does not fail", () => {
    const html = page(body('<a class="luz-btn luz-btn--primary">Save</a>'));
    const result = check({ "index.html": html });
    const at = where(html, "<a class");
    expect(result.code).toBe(0);
    expect(A11Y(result)).toHaveLength(1);
    expect(A11Y(result)[0]).toMatchObject({ rule: "a11y/link-no-href", severity: "warn", line: at.line, column: at.column });
    expect(A11Y(result)[0].message).toBe(messages.message("a11y/link-no-href", { tag: "a", name: "luz-btn" }));
    expect(A11Y(result)[0].docs).toBe(messages.docsUrl("a11y/link-no-href"));
    expect(MISUSE(result)).toEqual([]);
  });

  it("counts an href, an empty href and a binding of one as a destination", () => {
    const html = page(
      body(
        '<a class="luz-btn" href="/pricing/">a</a>',
        '<a class="luz-btn" href="">b</a>',
        '<a class="luz-btn" :href="url">c</a>',
        '<a class="luz-btn" [href]="url">d</a>',
        '<a class="luz-btn" href="{{ url }}">e</a>',
      ),
    );
    expect(A11Y(check({ "index.html": html }))).toEqual([]);
  });

  it("is only about a link that carries a class whose hosts include a, not any anchor", () => {
    const html = page(body('<a id="top" name="top"></a>', '<a class="promo">b</a>', '<a class="luz-card">c</a>', '<button class="luz-btn" type="button">d</button>'));
    expect(A11Y(check({ "index.html": html }))).toEqual([]);
  });

  it("reads the class from the manifest: a class of our own with a as a host", () => {
    const html = page(body('<a class="luz-chip">x</a>', '<span class="luz-chip">y</span>'));
    const found = A11Y(check({ "index.html": html }, WORLD));
    expect(found.map((f) => f.rule)).toEqual(["a11y/link-no-href"]);
    expect(found[0].message).toBe(messages.message("a11y/link-no-href", { tag: "a", name: "luz-chip" }));
  });
});

/* ---- the whole run ---------------------------------------------------------------------------- */

describe("the rules of misuse over a folder", () => {
  it("runs them with the bundled snapshot when the project has no node_modules, and says which release", () => {
    const dir = workspace({ "index.html": page(body('<div class="luz-btn">x</div>')) });
    const result = checkJson(["."], dir, { data: miniSnapshot({ version: "0.1.0" }) });
    expect(result.code).toBe(1);
    expect(result.data.findings.map((f) => f.rule)).toEqual(["misuse/host-element"]);
    expect(result.data.manifests.every((m) => m.source === "bundled")).toBe(true);
  });

  it("lets the project's config switch one of the warnings off, and keeps the blocking finding", () => {
    const html = page(body('<li class="is-active">x</li>', '<div class="luz-btn">y</div>'));
    const dir = workspace({ "index.html": html });
    const data = miniSnapshot();
    expect(checkJson(["."], dir, { data }).data.findings.map((f) => f.rule)).toEqual(["misuse/state-class", "misuse/host-element"]);
    put(dir, "luz-check.json", JSON.stringify({ rules: { "misuse/state-class": "off" } }));
    const quiet = checkJson(["."], dir, { data });
    expect(quiet.data.findings.map((f) => f.rule)).toEqual(["misuse/host-element"]);
    expect(quiet.data.summary.off).toBe(1);
  });
});
