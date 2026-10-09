/**
 * /html/ moved into the documentation page, /docs/#html-elements.
 * The page's meta refresh sends every visitor there, with or without
 * JavaScript. This module only keeps the element an old link asked for:
 * the cards, categories and demos kept their ids (el-*, cat-*, code-*, d-*),
 * and the A-Z index is now #html-index. Not part of any published package.
 */

const link = document.querySelector("[data-moved-to]");
if (link) {
  const old = decodeURIComponent(window.location.hash.slice(1));
  const target = new URL(link.href);
  if (old === "index") target.hash = "html-index";
  else if (/^(el|cat|code|d)-[\w-]+$/.test(old)) target.hash = old;
  window.location.replace(target.href);
}
