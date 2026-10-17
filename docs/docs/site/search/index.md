# Search

Finds a page, a section or an HTML element of a site by name, from a button in the header.

### Known issues
The search has not been tested with a screen reader yet. Ctrl+K opens this search instead of the browser’s own web search box: use the address bar to search the web. With `site.js`, a Ctrl+K pressed before the search’s script has loaded loads it, then opens the dialog, after a short wait on a slow connection. At 400 percent zoom the whole dialog scrolls, so the field can move out of view while you read the results.

### Copy the markup
One `<luz-search>` holds the link to your index, the button that replaces it, and the dialog. Put it where the search goes, usually at the end of the header: the link and the button share one place, so nothing moves when the button takes over, and the closed dialog takes no space. Every text is yours: write it in the page’s language.

Search markup
```html
<luz-search>
  <a class="luz-search__fallback" href="/a-z/" data-luz-search-fallback>
    <svg class="luz-search__trigger-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
    <span class="luz-search__fallback-label">A–Z index</span>
  </a>
  <button class="luz-search__trigger luz-search__trigger--compact" type="button" data-luz-search-open
          aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" hidden>
    <svg class="luz-search__trigger-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
    <span class="luz-search__trigger-label">Search docs…</span>
    <kbd class="luz-search__trigger-key" aria-hidden="true">Ctrl K</kbd>
  </button>
  <dialog class="luz-modal luz-search" aria-labelledby="search-title"
          data-luz-search-src="/search-index.json"
          data-luz-label-results="{n} results"
          data-luz-label-result="1 result"
          data-luz-label-capped="{shown} of {n} results. Type more to narrow."
          data-luz-label-none="No results for “{query}”. Check the spelling or try a shorter word."
          data-luz-label-loading="Loading the search index…"
          data-luz-label-error="Search is not available right now.">
    <search class="luz-search__body">
      <div class="luz-search__head">
        <h2 class="luz-search__title" id="search-title"><label for="search-q">Search the documentation</label></h2>
        <form method="dialog"><button class="luz-btn luz-btn--ghost luz-search__close" aria-label="Close search">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button></form>
      </div>
      <div class="luz-search__field">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input class="luz-input" id="search-q" type="text" maxlength="100" autocomplete="off"
               spellcheck="false" enterkeyhint="go" autofocus aria-describedby="search-hint">
      </div>
      <p class="luz-field__helper" id="search-hint">Results update as you type. Arrow keys move through them.</p>
      <p class="luz-search__status" role="status"></p>
      <div class="luz-search__results" data-luz-search-results>
        <div hidden><h3>Pages</h3><ul data-luz-search-list="pages"></ul></div>
        <div hidden><h3>Sections</h3><ul data-luz-search-list="sections"></ul></div>
        <div hidden><h3>HTML elements</h3><ul data-luz-search-list="elements"></ul></div>
      </div>
      <p class="luz-search__foot">Can’t find it? <a href="/a-z/">Browse the A–Z index</a></p>
    </search>
  </dialog>
</luz-search>

<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"></script>
```

### Variants and options
Every option is markup: a class or an attribute.

- `.luz-search__trigger--compact`: at 768 pixels and below, the trigger shows the magnifier only, 44 by 44 pixels, and so does the link next to it; their names stay their words, clipped, not removed. Give both an `<svg class="luz-search__trigger-icon">`.
- More than one trigger: every `[data-luz-search-open]` on the page opens the dialog, inside the element or not (this site has one in the header and one on the documentation home). One outside stays hidden until the search works, and takes no space until then: put it where its arrival moves nothing, such as the end of a section.
- An element with `data-luz-search-show="idle"` inside `[data-luz-search-results]` shows while the field is empty, for example a short list of popular pages; one with `data-luz-search-show="none"` shows when nothing matches.
- Leave out a `[data-luz-search-list]` to leave out that group.
- The texts the script writes are the `data-luz-label-*` attributes of the dialog: `results`, `result`, `capped`, `none`, `loading` and `error`, with `{n}`, `{shown}` and `{query}` in them. `data-luz-label-idle` is the text the status shows while the field is empty, for example “Type to search the documentation”. A missing label writes nothing.

### How it works
Load `site.min.js`, as a module. It loads nothing on a page without a `<luz-search>`. On a page with one, it loads the search’s own file, `search.min.js`, the first time the reader points at it or moves the focus into it, presses `Ctrl` + `K`, or when the browser is idle, whichever comes first. That file defines `<luz-search>`, a custom element in the light DOM (no Shadow DOM), and every one on the page wires itself.

- The button takes the link’s place, in the same space, so nothing moves. If the link has the keyboard focus or a pressed pointer at that moment, the swap waits until the reader leaves it, follows it or lets go: the focus is never moved.
- The button opens the native `<dialog>` with `showModal()`: the browser keeps the focus inside, closes it with Escape and returns the focus.
- The first time the dialog opens, the script reads the index.
- If `search.min.js` cannot load, the page stays as it is without JavaScript: the link works and the button stays hidden.
- A `<luz-search>` added after the page has loaded, by a router or a framework, is not seen by `site.min.js`: import `@luz-ds/site/search` (or `search.min.js`) yourself, and it wires itself when it connects. Two copies of the file on one page define the element once.

The index is a JSON file, version 1. Each list holds `[text, url, meta, lang]`; `meta` (shown muted after the text) and `lang` are optional, and URLs are relative to the file:

Search index format
```json
{
  "version": 1,
  "pages": [["Button", "components/button/", "Components"]],
  "sections": [["When to use", "components/button/#when", "Button › Design"]],
  "elements": [["<table> element, Tables", "html/tables/#el-table"]]
}
```

A result matches when its text and meta together contain every word typed, without regard to case or accents; the ones that start with the words come first. Each group shows 8 results at most, and the status line says how many there are.

What the component accepts, so that an index built from a CMS cannot harm the page:

- The JSON comes only from the page’s own origin, over http or https, and a redirect fails the request. Your Content-Security-Policy needs `connect-src 'self'`; to use an index from another site, host a copy on yours. The browser caches it like any file.
- Links are only `http:` and `https:` URLs; any other item is left out. Text is written as text, never as HTML.
- Limits: 1,000,000 characters of JSON, 10,000 results, 300 characters a text, 8 words a search, 100 characters in the field. Unknown fields are ignored. An index that is not version 1 shows the error text.

### Without JavaScript
The button stays hidden, takes no focus and is not read, and the link shows in its place: write a page that lists every page by name, such as an A–Z index. The dialog is never opened.

### Keyboard and ARIA
Everything works from the keyboard, with one shortcut.

- `Ctrl` + `K` or `⌘` + `K` opens the search from anywhere on the page, except while typing in a text area or an editable region, or while another dialog is open. Pressed again, it selects the text in the field. Pressed before `search.min.js` has loaded, it loads it and then opens the dialog; on a page without a `<luz-search>` the browser keeps the key.
- Down arrow moves from the field to the first result; Down and Up move between results, across groups; Home and End go to the first and last. Up on the first result goes back to the field.
- Enter in the field opens the first result; on a result it follows the link. Typing on a result goes back to the field.
- Escape or the close button (an × icon named *Close search* by its `aria-label`) closes the dialog, whatever the field holds, and the focus returns to where it was. The field is `type="text"` for that reason: in a `type="search"` field, Chrome and Safari use the first Escape to clear the text. A result on the same page closes it and moves the focus to that section’s heading. If nothing had the focus when it opened (Ctrl+K on a page just loaded, or a click in a browser that does not focus buttons), the script moves it to the button that opened the dialog, or to the search’s own button after Ctrl+K, so the next Tab continues from the header.
- The heading names the dialog and labels the field. The count is announced once the reader stops typing (`role="status"`). Results are links in lists under headings, not a combobox.

### When to use
Use search on a site of more than a few pages, where readers look for something by its name: a component, a setting, an article title.

### When not to use
Do not use search instead of navigation: keep the menu and an index page.

- Search needs typing, and a name the reader may not know.
- It matches titles and headings only: it cannot search inside long texts or across many sites.
