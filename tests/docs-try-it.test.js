/**
 * LUZ docs site — "Try it" and the width selector (F6c): the markup the pages
 * must carry for apps/docs/reference.js to enhance. What the browser does with
 * it is tests/docs-try-it.spec.js; this file reads the page sources
 * (apps/docs/pages/components/*.html) and holds the contract between the two:
 *
 *   Try it    on the Button page, one `form.docs-try` with `hidden` (JavaScript
 *             shows it, so without JavaScript nothing that does nothing is
 *             shown), a child of `.docs-component`, after the example and before
 *             "Known issues". Three fieldsets, each with a legend:
 *               Variant     radios name="variant": primary secondary outline ghost danger
 *               Size        radios name="size": sm default lg
 *               Full width  one checkbox name="block"
 *             then `.docs-try__preview` (the one live button, with nothing on it
 *             but class and type, so its outerHTML is the code) and a
 *             `.docs-snippet` whose `code#code-button-try` is that outerHTML, with its
 *             `.luz-copy-btn[data-copy-from="code-button-try"]`.
 *   Width     on Button, Card, Form fields and Table, in the first
 *             `.docs-example` of the page: a `fieldset[hidden]` "Width" with the
 *             radios name="docs-width" phone / tablet / full (full checked), then
 *             `div.luz-docs-example__frame` around the demo.
 */
import { describe, expect, it } from "vitest";
import { decodeEntities } from "../scripts/docs-site/html.js";
import { descendants, find, findAll, hasClass, isInside, matcher, parse, query, textOf } from "./helpers/html-dom.js";
import { routeOf, site } from "./helpers/docs-site.js";

const root = (id) => parse(site.byRoute.get(routeOf(id)).body, id);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const outer = (node) => node.html.slice(node.open.index, node.close.end);
const after = (a, b) => a.open.index > b.open.index;

describe("Try it, on the Button page", () => {
  const page = root("c-button");
  const component = query(page, "div.docs-component");
  const form = findAll(page, matcher("form.docs-try"));

  it("is one form, hidden in the markup, a child of the component after the example and before Known issues", () => {
    expect(form).toHaveLength(1);
    const [f] = form;
    expect(f.attrs.has("hidden"), "hidden: only JavaScript shows it").toBe(true);
    expect(f.parent).toBe(component);
    const example = find(page, (n) => n.parent === component && hasClass(n, "docs-example"));
    const issues = find(page, (n) => n.attrs.get("id") === "known-issues");
    expect(after(f, example), "after the live example").toBe(true);
    expect(after(issues, f), "before Known issues").toBe(true);
  });

  it("has a fieldset with a legend for Variant, Size and Full width, in this order", () => {
    const sets = findAll(form[0], (n) => n.name === "fieldset");
    expect(sets.map((s) => textOf(find(s, (n) => n.name === "legend")))).toEqual(["Variant", "Size", "Full width"]);
    for (const s of sets) expect(s.children[0].name, "the legend comes first").toBe("legend");
  });

  const inputs = (name) => findAll(form[0], (n) => n.name === "input" && n.attrs.get("name") === name);

  it("offers the variants as native radios, Primary checked, each in a label of its own", () => {
    const radios = inputs("variant");
    expect(radios.map((r) => r.attrs.get("type"))).toEqual(Array(5).fill("radio"));
    expect(radios.map((r) => r.attrs.get("value"))).toEqual(["primary", "secondary", "outline", "ghost", "danger"]);
    expect(radios.filter((r) => r.attrs.has("checked")).map((r) => r.attrs.get("value"))).toEqual(["primary"]);
    expect(radios.map((r) => textOf(r.parent))).toEqual(["Primary", "Secondary", "Outline", "Ghost", "Danger"]);
    for (const r of radios) expect(r.parent.name).toBe("label");
  });

  it("offers the sizes as native radios, Default checked", () => {
    const radios = inputs("size");
    expect(radios.map((r) => r.attrs.get("type"))).toEqual(Array(3).fill("radio"));
    expect(radios.map((r) => r.attrs.get("value"))).toEqual(["sm", "default", "lg"]);
    expect(radios.filter((r) => r.attrs.has("checked")).map((r) => r.attrs.get("value"))).toEqual(["default"]);
    expect(radios.map((r) => textOf(r.parent))).toEqual(["Small", "Default", "Large"]);
  });

  it("offers the full width as one native checkbox, unchecked", () => {
    const boxes = inputs("block");
    expect(boxes).toHaveLength(1);
    expect(boxes[0].attrs.get("type")).toBe("checkbox");
    expect(boxes[0].attrs.get("value")).toBe("block");
    expect(boxes[0].attrs.has("checked")).toBe(false);
    expect(textOf(boxes[0].parent)).toBe("Fill the width of its container");
  });

  it("has no control other than those four inputs and the copy button, and no ARIA role standing in for one", () => {
    const controls = findAll(form[0], (n) => ["input", "select", "textarea", "button"].includes(n.name));
    expect(controls.filter((n) => n.name !== "input").map((n) => `${n.name}.${n.attrs.get("class")}`)).toEqual(["button.luz-copy-btn"]);
    expect(controls.filter((n) => n.name === "input")).toHaveLength(5 + 3 + 1);
    for (const n of descendants(form[0])) expect(n.attrs.get("role") ?? "", `<${n.name}>`).not.toMatch(/^(radio|checkbox|switch|slider|button|tab|listbox|combobox)$/);
  });

  it("previews one button with nothing on it but its class and type, so its outerHTML is the code", () => {
    expect(form, "the form").toHaveLength(1);
    const preview = query(form[0], "div.docs-try__preview");
    expect(preview, "div.docs-try__preview").toBeTruthy();
    expect(preview.children).toHaveLength(1);
    const [button] = preview.children;
    expect(button.name).toBe("button");
    expect([...button.attrs.keys()].sort()).toEqual(["class", "type"]);
    expect(button.attrs.get("class")).toBe("luz-btn luz-btn--primary");
    expect(button.attrs.get("type")).toBe("button");
  });

  it("shows that markup in code#code-button-try, with a copy button that points at it", () => {
    expect(form, "the form").toHaveLength(1);
    const preview = query(form[0], "div.docs-try__preview")?.children[0];
    expect(preview, "the preview button").toBeTruthy();
    const code = find(form[0], (n) => n.name === "code" && n.attrs.get("id") === "code-button-try");
    expect(code, "code#code-button-try").toBeTruthy();
    expect(isInside(code, find(form[0], (n) => n.name === "pre" && hasClass(n, "luz-code-block")))).toBe(true);
    expect(norm(decodeEntities(code.html.slice(code.open.end, code.close.index)))).toBe(norm(outer(preview)));
    const copy = find(form[0], (n) => n.name === "button" && hasClass(n, "luz-copy-btn"));
    expect(copy.attrs.get("data-copy-from")).toBe("code-button-try");
    expect(copy.attrs.get("type")).toBe("button");
    expect(copy.attrs.get("aria-label") || textOf(copy), "a name").toBeTruthy();
  });

  it("keeps the static example and the three markup snippets, which work without JavaScript", () => {
    for (const id of ["code-button", "code-button-link", "code-button-block"]) {
      expect(find(page, (n) => n.attrs.get("id") === id), id).toBeTruthy();
    }
  });
});

describe("the width selector", () => {
  for (const id of ["c-button", "c-card", "c-form", "c-table"]) {
    describe(`on ${id}`, () => {
      const page = root(id);
      const component = query(page, "div.docs-component");
      const example = find(page, (n) => n.parent === component && hasClass(n, "docs-example"));

      it("is a hidden fieldset with the legend Width, as the first thing in the Example frame", () => {
        const set = find(example, (n) => n.name === "fieldset" && n.parent === example);
        expect(set, "fieldset directly in .docs-example").toBeTruthy();
        expect(set.attrs.has("hidden"), "hidden: only JavaScript shows it").toBe(true);
        expect(set.children[0].name).toBe("legend");
        expect(textOf(set.children[0])).toBe("Width");
        expect(example.children[0]).toBe(set);
      });

      it("offers Phone, Tablet and Full as native radios named docs-width, Full checked", () => {
        const radios = findAll(example, (n) => n.name === "input" && n.attrs.get("name") === "docs-width");
        expect(radios.map((r) => r.attrs.get("type"))).toEqual(["radio", "radio", "radio"]);
        expect(radios.map((r) => r.attrs.get("value"))).toEqual(["phone", "tablet", "full"]);
        expect(radios.map((r) => textOf(r.parent))).toEqual(["Phone", "Tablet", "Full"]);
        expect(radios.filter((r) => r.attrs.has("checked")).map((r) => r.attrs.get("value"))).toEqual(["full"]);
      });

      it("wraps the demo in div.luz-docs-example__frame, after the selector", () => {
        const set = find(example, (n) => n.name === "fieldset");
        const frame = find(example, (n) => n.name === "div" && hasClass(n, "luz-docs-example__frame"));
        expect(frame, "the frame").toBeTruthy();
        expect(frame.parent).toBe(example);
        expect(after(frame, set)).toBe(true);
        expect(find(frame, (n) => hasClass(n, "docs-demo__stage")), "the demo is inside the frame").toBeTruthy();
      });
    });
  }
});
