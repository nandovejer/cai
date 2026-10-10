/**
 * CAI documentation site — the contrast check in the browser
 * (/docs/tokens/contrast/). The same engine as `cai-tokens check-contrast`
 * (packages/tokens/lib), on CSS pasted into a field, measured against the
 * installed tokens. Everything stays in the page: nothing is sent anywhere.
 *
 * An enhancement: the page explains the command without it, and the tool's
 * markup is `hidden` until this script has wired it. Its words are in the
 * page (data-* attributes of the result), not in this file.
 */
import { analyze } from "/packages/tokens/lib/check.js";
import { formatRatio } from "/packages/tokens/lib/contrast.js";
import { parseRules } from "/packages/tokens/lib/theme.js";
import tokensCss from "/packages/tokens/dist/tokens.css?raw";

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

function line(parent, text, tag = "li") {
  const el = document.createElement(tag);
  el.textContent = text;
  parent.append(el);
  return el;
}

/** @param {ParentNode} [root] */
export function initContrastTool(root = document) {
  const tool = root.querySelector("[data-contrast-tool]");
  if (!tool || tool.dataset.ready) return;
  const input = tool.querySelector("textarea");
  const button = tool.querySelector("button");
  const result = tool.querySelector("[data-contrast-result]");
  if (!input || !button || !result) return;
  const words = result.dataset;
  const shipped = { file: "tokens", rules: parseRules(tokensCss) };

  button.addEventListener("click", () => {
    let report;
    try {
      report = analyze([shipped, { file: words.file, rules: parseRules(input.value) }]);
    } catch (error) {
      result.replaceChildren();
      line(result, `${words.error} ${error.message}`, "p");
      return;
    }
    result.replaceChildren();
    const mode = report.modes.join(", ");
    line(result, fill(report.ok ? words.pass : words.fail, { checked: report.checked, modes: mode, failures: report.failures.length + report.unreadable.length }), "p");
    const list = document.createElement("ul");
    for (const f of report.failures) {
      const item = line(list, fill(words.item, { modes: f.mode, foreground: f.foreground, background: f.background, ratio: formatRatio(f.ratio), minimum: f.minimum }));
      for (const o of f.overrides) line(item, fill(words.set, { token: o.token, value: o.value, line: o.line }), "small").before(document.createElement("br"));
    }
    for (const u of report.unreadable) line(list, fill(words.unreadable, { foreground: u.foreground, background: u.background, reason: u.reason }));
    for (const w of report.warnings) line(list, fill(words.warning, { modes: w.mode, foreground: w.foreground, background: w.background, ratio: formatRatio(w.ratio), minimum: w.minimum }));
    for (const i of report.ignored) line(list, fill(words.ignored, { selector: i.selector, line: i.line }));
    if (list.children.length) result.append(list);
  });

  tool.dataset.ready = "";
  tool.hidden = false;
}
