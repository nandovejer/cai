# Table

Compares records across several attributes, in rows and columns that stay readable at 320 px.

### Known issues
Sorting in the browser (`data-luz-sort`) is checked in the Chromium accessibility tree only, and not yet tested with NVDA, JAWS, VoiceOver, TalkBack or Orca. The sorted column is exposed with `aria-sort` on its column header and each sort is announced in a status message; tabbing through the headings announces the column name, and the sort state is read on the header cell and in the status message.

- Only the rows loaded in the page are sorted, the sort is not remembered on reload, and the address bar does not change. A table with several header rows or a `colspan` heading is not supported, and anything in a sortable heading besides its text or one link is dropped when it becomes a button.
- Sorting a few thousand rows moves them all in one task: sort them on the server. The order of text depends on the browser's collation for the language of the table.

### Copy the markup
Table markup
```html
<div class="luz-table-wrap" role="region" aria-label="Invoices" tabindex="0">
  <table class="luz-table">
    <caption>Invoices</caption>
    <thead>
      <tr><th scope="col">Number</th><th scope="col">Date</th><th scope="col">Amount (€)</th></tr>
    </thead>
    <tbody>
      <tr><td data-label="Number">INV-0042</td><td data-label="Date">1 Oct 2026</td><td data-label="Amount (€)">120.00</td></tr>
    </tbody>
  </table>
</div>
```

### Variants and options
- `.luz-table`: Full width, header row on the strong surface, a rule between rows, a highlight on the row under the pointer
- `.luz-table-wrap`: Scrolls the table sideways when it is wider than its container
- `.luz-table--sticky-col`: Keeps the first column in view while the table scrolls sideways
- `.luz-table--compact`: Less space above and below each row (about 33 px for a line of text, not 49 px) and a narrower gutter between columns; the type size does not change
- `.luz-table__numeric` on a `<th>` and its `<td>`: Aligns a column of numbers to the end of the cell, in figures of equal width
- `data-luz-sort` on a `<th scope="col">`: The column can be sorted in the browser: its text becomes a button
- `data-sort-value` on a `<td>`: What the cell sorts by when its text is not that: a formatted number (`1,204`), a date shown as “13 Oct”, a price with its currency
- `aria-sort` on the sorted `<th>`: `ascending` or `descending`, on one heading only: a triangle shows the direction
- `data-label` on each `<td>`: The column name shown before the value when rows become cards

Numbers and dense data take a class each. Put the numeric class on the heading as well as on every cell of the column.

#### Sorting in the browser

Mark each sortable heading with `data-luz-sort`. The script turns its text into a button; the table keeps working without it.

Sortable table markup
```html
<table class="luz-table" id="routes">
  <caption>Parcels per route</caption>
  <thead>
    <tr>
      <!-- With a link: it sorts on the server without JavaScript -->
      <th scope="col" data-luz-sort><a href="?sort=route#routes">Route</a></th>
      <!-- Plain text: the script makes it a button -->
      <th scope="col" class="luz-table__numeric" data-luz-sort>Parcels</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Route">Sevilla to Madrid</td>
      <td class="luz-table__numeric" data-label="Parcels" data-sort-value="1204">1,204</td>
    </tr>
  </tbody>
</table>
```

- **The cell's text is what it sorts by,** unless it has `data-sort-value`. Two plain numbers (`12`, `0.5`, `-3`) sort as numbers; anything else sorts as text, in the order of the table's language, with `Room 2` before `Room 10`.
- **A number with a thousands separator, a unit or a currency needs `data-sort-value`** with the plain number (`1204` for `1,204`), or it sorts as text and “1,204” falls before “999”. A date is an ISO date (`2026-10-13`), whatever it shows.
- **Equal values keep their order.** The first press sorts ascending, the next descending, and so on; to go back to the first order, reload.
- **The heading says the column and nothing else.** No direction in its text and none in the caption: the triangle, `aria-sort` and the status line say it, and they follow the sort.

### How it works
A native `<table>` with `<caption>`, `<thead>` and `<th scope>`, styled by `components/table.css`. No JavaScript.

- The wrapper is a container: below 480 px of its own width, a container query turns each row into a card of label and value pairs and reduces the cell padding. It follows the width of the wrapper, not the window, so a narrow table in a wide page stacks too.
- The labels come from `data-label`; a cell without one shows its value only.
- A cell that holds more than one element needs a wrapper `<div>` inside it, so the value stays together.
- `.luz-table__numeric` sets `text-align: end` and `font-variant-numeric: tabular-nums`, so the digits of a column line up whatever the language. In the stacked card layout the value is already at the end of its row.
- `.luz-table--compact` changes only the padding of the cells: the type keeps its size, so the table is denser but no harder to read.
- **Sorted by the server**, for paginated or filtered results and for every table without JavaScript: each heading is a link to the same page sorted by that column, and only the sorted column's `<th scope="col">` carries `aria-sort="ascending"` or `"descending"`. Say the direction in the visible text of the link too, for example “Amount (€), ascending”; make the link's text start with the heading's own words; end its `href` with the table's `id` (`?sort=amount&dir=desc#invoices`) so the next Tab starts at the table after the page reloads; and state the sort in the caption (“Invoices, sorted by amount, ascending”).
- **Sorted in the browser**, for a table that holds all its rows: `data-luz-sort` on the headings. `luz.js` loads `table-sort.js` on demand, only on a page that has such a heading, and each heading's text (or the content of its link) moves into a `<button type="button">`. A press sorts every `<tbody>` in place, writes `aria-sort` on that heading alone and says “Sorted by Parcels, ascending” in an `<output>` that reads politely and is hidden visually. Focus stays on the button. A table that sorts in the browser has no direction in its caption or headings: they would be wrong after one press.
- The triangle after the sorted heading is drawn by CSS from `aria-sort` (a shape, not text), so a server-sorted heading gets it too. Up is ascending, down is descending.
- Below 480 px a heading row that holds a link or a button stays visible: its headings show as a row above the cards, and wrap, so the controls can be seen and reached. A heading row of plain text is hidden there, as before, because each card carries its labels.
- Cards change the `display` of the table elements, which can hide the table from some screen readers. The stylesheet recommends `role="table"`, `"row"` and `"cell"` on a table that stacks.

### Without JavaScript
Nothing changes: scrolling, the sticky column and the cards are all CSS. A heading with a link sorts on the server; a plain heading is just a heading.

Rows are never hidden, and if the script does not load the table stays whole.

#### Loading the sort on its own

The module has no imports and no effect until you call it. Pass the `t` of core's strings so the status line is written in the table's language; without it the table still sorts and the status line stays empty.

Table sort code
```js
import { initTableSort } from "@luz-ds/core/table-sort";
import { t } from "@luz-ds/core/i18n";

initTableSort(document, t);
```

### Keyboard and ARIA
The wrapper takes focus (`tabindex="0"`) so keyboard users can scroll it with the arrow keys.

- Give the wrapper `role="region"` and an `aria-label`, so that focus stop has a name.
- `scope="col"` on column headers, and `scope="row"` on a header cell that names its row.
- A sortable heading is a button: Tab reaches it, Enter or Space sorts, and focus stays on it while the rows move. A link that the script replaces keeps the focus it had.
- `aria-sort` is on the one sorted `<th scope="col">`. Each sort is announced by the status line (`<output>`, role `status`), in the language of the table; the strings are `sortedAsc` and `sortedDesc` of core's strings (see [JavaScript modules](https://nandovejer.github.io/luz/docs/get-started/javascript/); `data-luz-label-sorted-asc` and `data-luz-label-sorted-desc` override them).
- The column name is the heading's text only: no arrow character, no “ascending” in the markup.

### When to use
Use a table to compare records across the same attributes: services and their status, invoices and their amounts.

### When not to use
Do not use a table for layout.

- For one attribute per item, use a list.
- For a few items of equal weight, use [cards](https://nandovejer.github.io/luz/docs/components/card/).
- For a data grid (filters, selecting rows, editing cells or thousands of rows), use a library built for it. LUZ's table shows rows and sorts them; it does not manage them. For paginated results, sort on the server.
- For a trend over time, use a chart library and keep the table as its text alternative. A bar for each row is a [meter](https://nandovejer.github.io/luz/docs/components/meter/) in the cell of its figure.
