# The light of the home page (`<home-light>`)

The section under the home page's hero: the visitor's sky, the sun and the moon where they are, drawn over a globe whose land is a puzzle with one piece per country. A line under the globe opens a bar to scrub the day. It is part of the LUZ website, not of a package: nothing here is published, and only `apps/landing/index.html` links it.

It came from a mockup made outside the repository (`.claude/extra/landing/`, ported on 2026-10-16, F3 of the plan for the site's identity). The mockup was one classic script of 141 KB that also owned the colour mode; here it is three ES modules and one stylesheet, and the mode belongs to `<luz-mode>`. The skyline and the city map it also offered were removed on 2026-10-17, with the look switcher: the light shows the globe only.

## Files

| File | What it is |
| --- | --- |
| `light.js` | The controller: defines `<home-light>`, builds the line and the bar, works out the sun and the moon from the clock, and loads the globe. It imports nothing statically; the globe is a literal `import()` of its file. |
| `globe.js` | `<home-globe>`, the code of the globe: the sphere, the sun, the night, the reader's light, the spin, the drag and the drawing of the land. It imports nothing statically; the land is a literal `import()` of `globe-data.js`. |
| `globe-data.js` | The land: the coast, the borders and the countries, written by `scripts/globe-puzzle-data.js`. It imports nothing. |
| `light.css` | Every rule of the two elements. The interface reads LUZ's semantic tokens; the drawing has its own inks (`--light-*`), replaced by the page's text and surface in high contrast and forced colours. |

Each module guards `customElements.get()`, writes no HTML from a string (nodes, `textContent`, SVG through `createElementNS`), injects no style and asks the network for nothing: the place is the time zone of `Intl`, never GPS or an address lookup.

## How it works with the rest of the page

- `<luz-mode>` (the footer's) is the only writer of `data-theme` and `data-light` on `<html>`. `<home-light>` reads them, follows `luz-mode:change`, and while the visitor scrubs the day it calls `preview(hour)` on `<luz-mode>`; "Back to now" calls `preview(null)`. Without a `<luz-mode>` only the visuals follow the slider.
- On `<html>` it writes four custom properties, no attribute: `--sun-alt`, `--sun-az`, `--sun-x` (where the sun stands, left to right, for the page's glow) and `--day-left`.
- Its texts are the catalog's (`apps/landing/i18n/<lang>.json`, keys `light.*`), handed over as `data-luz-label-light-*` on `<body>`.
- The globe draws the sea, the sun, the night and the reader's light at once, and loads its land the first time it is on screen and the browser is idle (`requestIdleCallback`), even when the browser asks to save data: a globe without land says nothing. Once the land is drawn, `<home-globe>` carries the attribute `land`.
- The land: each country is a faint grey, one of five tones, no two neighbours alike; the borders between them are fine lines, barely there, each with a knob (one for every ~14° of its length); the coast is a fine dotted line. The lines are drawn in relief, a line of light towards the sun and a line of shade away from it.
- The line under the visual is a button that opens the bar: it shows the phrase, the light and the hour (on a pill of the page's paper, so it keeps its contrast over the drawing) and a mark that turns with `aria-expanded`. The bar follows it in the DOM, so Tab goes from the line into the bar; the CSS draws it above. The slider's `aria-valuetext` is the light and the hour, joined by `light.sep`; its `<output>` is `aria-live="off"`. The globe is an image (`role="img"`), not a control: a pointer may drag it, and it is not in the tab order.
- Without JavaScript the element is empty and `light.css` gives it its height, so the page does not move when the script arrives.
- Under `prefers-reduced-motion: reduce` nothing asks for an animation frame: the globe does not spin and a throw does not keep turning it.

## Why it weighs what it weighs

PRINCIPLES.md §3 asks for a written reason for weight. Each file has its own row in `budgets.json`, measured as the gzip of the source (it is served as written, with no build of its own).

- `light.js` (about 6.2 kB gzip): the solar and lunar arithmetic, the table of places for the common time zones, the bar and the favicon.
- `globe.js` (about 8.7 kB gzip): the drawing. The visible half of each ring of the land is stitched along the horizon so the countries can be filled; the knobs are built once, at load, from the borders.
- `globe-data.js` (about 9.3 kB gzip): the land, Natural Earth 1:110m countries, re-encoded without loss for the picture: the coast and the borders as deltas on a 0.3° grid written as Exp-Golomb bits, six to a character; the countries as references to those arcs. The land is the union of the countries, so it is not stored apart. It loads after the globe is on screen and the browser is idle, so it never holds up the page. Lighter versions (a coarser grid, small islands left out) were tried and rejected: the coast lost its shape.

## The land data's licence

The land of the globe is [Natural Earth](https://www.naturalearthdata.com/) 1:110m admin-0 countries, re-encoded into `globe-data.js` by `scripts/globe-puzzle-data.js` (from the TopoJSON of the world-atlas package, which is not a dependency: the script reads a file you give it). Natural Earth is in the public domain ("All versions of Natural Earth raster + vector map data found on this website are in the public domain", naturalearthdata.com/about/terms-of-use). Public-domain data with its origin noted next to it is accepted by red line 13 (owner decision D9, 2026-10-16); the note is in `globe-data.js` and here, and the data is listed in `dev/LICENSES.md`. The borders are Natural Earth's (its de facto lines); they are drawn barely visible, but each country's tone follows them. The code of the three modules is MIT, as the rest of the repository.
