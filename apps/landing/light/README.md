# The light of the home page (`<luz-light>`)

The section under the home page's hero: the visitor's sky, the sun and the moon where they are, drawn over a globe of dots, a skyline or a city map. A line under the visual opens a bar to scrub the day and change the look. It is part of the LUZ website, not of a package: nothing here is published, and only `apps/landing/index.html` links it.

It came from a mockup made outside the repository (`.claude/extra/landing/`, ported on 2026-10-16, F3 of the plan for the site's identity). The mockup was one classic script of 141 KB that also owned the colour mode; here it is four ES modules and one stylesheet, and the mode belongs to `<luz-mode>`.

## Files

| File | What it is |
| --- | --- |
| `light.js` | The controller: defines `<luz-light>`, builds the line and the bar, works out the sun and the moon from the clock, and loads the chosen visual. It imports nothing statically; each visual is a literal `import()` of its file. |
| `globe.js` | `<luz-globe>`, the globe of dots, with the land data. |
| `city.js` | `<luz-city>`, the skyline. |
| `map.js` | `<luz-map>`, the city map. |
| `light.css` | Every rule of the four elements. The interface reads LUZ's semantic tokens; the drawing has its own inks (`--light-*`), replaced by the page's text and surface in high contrast and forced colours. |

Each module guards `customElements.get()`, writes no HTML from a string (nodes, `textContent`, SVG through `createElementNS`), injects no style and asks the network for nothing: the place is the time zone of `Intl`, never GPS or an address lookup.

## How it works with the rest of the page

- `<luz-mode>` (the footer's) is the only writer of `data-theme` and `data-light` on `<html>`. `<luz-light>` reads them, follows `luz-mode:change`, and while the visitor scrubs the day it calls `preview(hour)` on `<luz-mode>`; Live calls `preview(null)`. Without a `<luz-mode>` only the visuals follow the slider.
- On `<html>` it writes four custom properties, no attribute: `--sun-alt`, `--sun-az`, `--sun-x` (where the sun stands, left to right, for the page's glow) and `--day-left`.
- Its texts are the catalog's (`apps/landing/i18n/<lang>.json`, keys `light.*`), handed over as `data-luz-label-light-*` on `<body>`.
- The look: `?look=globe|city|map` in the URL, else the look the visitor last clicked (`localStorage["luz-light"]`, only after a click), else one at random. Only that visual's file is loaded; another one loads the first time its button is pressed.
- Without JavaScript the element is empty and `light.css` gives it its height, so the page does not move when the script arrives.
- Under `prefers-reduced-motion: reduce` nothing asks for an animation frame: the globe does not spin, the traffic stands still, and the stars, beacons and highway lights stop.

## Why it weighs what it weighs

PRINCIPLES.md §3 asks for a written reason for weight. Each file has its own row in `budgets.json`, measured as the gzip of the source (it is served as written, with no build of its own), and only two of the four reach a visitor: the controller and one visual.

- `light.js` (about 7.5 kB gzip): the solar and lunar arithmetic, the table of places for the common time zones, the bar and the favicon.
- `globe.js` (about 9.5 kB gzip): most of it is the land, one bit per dot of a 0.8° lattice (about 10.8 kB of base64). Drawing coastlines from vectors would weigh more.
- `city.js` (about 10 kB gzip) and `map.js` (about 8 kB gzip): no data at all. The skyline and the streets are generated from a seed, the first time the visual has a size, in idle time; their weight is the generator.

## The land data's licence

The land of the globe is [Natural Earth](https://www.naturalearthdata.com/) 1:50m land polygons, rasterised once onto the lattice in `globe.js`. Natural Earth is in the public domain ("All versions of Natural Earth raster + vector map data found on this website are in the public domain", naturalearthdata.com/about/terms-of-use). Public-domain data with its origin noted next to it is accepted by red line 13 (owner decision D9, 2026-10-16); the note is in `globe.js` and here, and the data is listed in `dev/LICENSES.md`. The code of the four modules is MIT, as the rest of the repository.
