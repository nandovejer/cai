# Cookie consent

Asks a visitor once whether the site may use optional cookies, with Accept and Reject side by side, and remembers the answer.

### Known issues
Without JavaScript the banner is not shown at all: there is nothing to answer, because none of the site’s own scripts run either. A server that sets optional cookies itself, without a script, must ask some other way.

- The answer is kept in the browser’s local storage, so a server cannot read it, and clearing site data asks again.
- In a window less than 30 rem (480 px) tall the banner is not fixed: it is in the flow at the top of the page, where its markup is, so the page moves down when it appears.
- The saved state hides when focus leaves it for the page, but not when you click an empty part of the page. Use its Close button.
- It has not been tested with a screen reader.

### Copy the markup
Right after the [skip link](https://nandovejer.github.io/luz/docs/components/skip-link/), before a [banner](https://nandovejer.github.io/luz/docs/site/banner/) and the header of the page (a [landing](https://nandovejer.github.io/luz/docs/landing/header/) or [CMS](https://nandovejer.github.io/luz/docs/cms/header/) header): it shows at the bottom of the window, but it comes first in the reading and Tab order. One checkbox per category of optional cookies, its `value` the category’s name.

`site.min.js` loads the banner’s own file, `consent.min.js`, when the browser is idle; a page without `site.min.js` loads that file on its own.

Cookie consent markup
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"></script>

<a class="luz-skip-link" href="#main">Skip to main content</a>
<luz-consent>
  <section class="luz-consent" data-luz-consent aria-labelledby="consent-title" hidden>
    <div data-luz-consent-ask>
      <h2 class="luz-consent__title" id="consent-title">Cookies on Bodega Albar</h2>
      <p>We use cookies that this site needs to work. We would also like to measure how you
        use it, to improve it. <a href="/cookies/">Read the cookie policy</a>.</p>
      <form class="o-actions">
        <button class="luz-btn luz-btn--primary" type="submit" value="all">Accept optional cookies</button>
        <button class="luz-btn luz-btn--primary" type="submit" value="none">Reject optional cookies</button>
      </form>
      <details class="luz-consent__choices">
        <summary>Choose which cookies to allow</summary>
        <form class="o-stack">
          <fieldset class="luz-fieldset">
            <legend>Optional cookies</legend>
            <div class="luz-check-group">
              <label class="luz-check-item"><input type="checkbox" value="analytics"> Measuring visits</label>
              <label class="luz-check-item"><input type="checkbox" value="marketing"> Adverts on other sites</label>
            </div>
          </fieldset>
          <div class="o-actions">
            <button class="luz-btn luz-btn--secondary" type="submit">Save my choices</button>
          </div>
        </form>
      </details>
    </div>
    <div data-luz-consent-done tabindex="-1" hidden>
      <p>Your choice is saved. You can change it at any time on the
        <a href="/cookies/">cookie policy</a> page.</p>
      <button class="luz-btn luz-btn--secondary" type="button" data-luz-consent-close>Close</button>
    </div>
  </section>
</luz-consent>
<header>…</header>

<!-- On the cookie policy page -->
<button class="luz-btn luz-btn--outline" type="button" data-luz-consent-open hidden>Change cookie settings</button>
```

Your scripts read the answer and listen for a new one. Load an optional script only for a category the visitor granted:

Script that reads the answer
```js
import { getConsent } from "@luz-ds/site/consent";

const granted = (answer) => answer?.granted.includes("analytics");

if (granted(getConsent())) startMeasuring();
document.addEventListener("luz:consent", (event) => {
  if (granted(event.detail)) startMeasuring();
  // Withdrawn: the simplest correct answer is to reload the page
  else location.reload();
});
```

### Variants and options
There are no variants. The hooks are `data-luz-consent-*` attributes.

- `.luz-consent`: The banner: a band fixed at the bottom of the window, as wide as it, at most half its height and scrolling inside, its text in the header’s column, in the sans. In a window less than 30 rem tall it is in the flow instead. Keep `hidden` on it: the script shows it
- `.luz-consent__title`: Its heading, in the sans; it names the banner’s region through `aria-labelledby`
- `.luz-consent__choices`: The `<details>` with the categories, under the two buttons
- `<luz-consent>`: The custom element the module defines. It wires the banner inside it when it connects
- `data-luz-consent`: On the `<section>`: the banner. Optional `data-luz-consent-days`, how long an answer lasts (180 days by default, 395 at most), and `data-luz-consent-key`, the storage key (it must start with `luz-`)
- `data-luz-consent-ask`, `data-luz-consent-done`: The question, and the confirmation that takes its place. The confirmation has `tabindex="-1"`: it takes focus
- `data-luz-consent-close`: On a button inside the confirmation: hides the banner and returns focus to the button that opened it, or the first `data-luz-consent-open` button, or `<main>`. The confirmation also hides when focus leaves it for the page
- `value="all"`, `value="none"`: On the submit buttons: Accept grants every category, Reject none. A submit button with another value, or none, grants the ticked ones of its form
- `data-luz-consent-open`: On a button anywhere, with `hidden`: its space is kept, the script shows it, and it shows the banner again, with the stored answer ticked
- `--luz-consent-h`: Set on `:root` by the script while the banner shows: its height. The page, `.o-main` and `.luz-sidebar` keep that much room at their end, and scroll what Tab reaches above the banner

### How it works
CSS from `@luz-ds/site`, two native forms and a file of its own, `@luz-ds/site/consent` (`dist/consent.min.js`, under 1 kB compressed), which defines `<luz-consent>`. `site.min.js` loads it when the browser is idle, and only on a page with a `<luz-consent>`, so no other page pays for it.

A banner added after the page has loaded needs the file imported by hand; two copies of it on one page define the element once.

- **When it asks:** when no answer is stored, when the stored one has expired, or when the banner offers a category the stored answer was not asked about. Then it shows, as a band at the bottom of the window, so nothing on the page moves: it traps nothing and takes no focus, and the page keeps room for it at its end and scrolls what Tab reaches above it, so the page can be read and used before answering.
- **The answer:** Accept grants every category, Reject none, Save my choices the ones ticked. Enter in a checkbox saves the ticked ones, never all. Escape is not an answer: nothing happens. The confirmation then takes the place of the question and takes focus, and is read. It goes away with its Close button, or when focus leaves the banner for the page; focus stays where it went.
- **Where it is kept:** in the browser’s `localStorage`, under `luz-consent`, as JSON: `{"version":1,"expires":…,"asked":["analytics","marketing"],"granted":["analytics"]}`, with `expires` in milliseconds since 1970. Not in a cookie: a cookie would travel to the server with every request, and asking about cookies should not need one. No personal data, and nothing leaves the browser. A malformed value counts as no answer. If storage is blocked, the answer holds for the page and the next page asks again.
- **Your scripts:** `getConsent()` returns the stored answer, `{ asked, granted, expires }`, or `null`. Each new answer dispatches `luz:consent` on `document`, with the same object as `detail`. Category names are a lowercase letter, then lowercase letters, digits or hyphens, 32 at most.
- **Changing the answer:** as easy as giving it. A button with `data-luz-consent-open`, on the cookie policy page, shows the banner again. Put one banner on a page: every such button opens it.
- The script writes no text: every word is in your markup, in the page’s language.

### Without JavaScript
The banner and the button that shows it again stay hidden, by their `hidden` attribute. Without a script none of the site’s own scripts run, so there is nothing to ask about, and buttons that would do nothing are never shown.

Link the cookie policy from the footer of every page, so it can always be read.

### Keyboard and ARIA
- **Order:** the skip link stays first, so a returning visitor can still jump to the content. The banner comes next, before the header, although it shows at the bottom: the policy link, Accept, Reject, then the button that opens the categories.
- **Keys:** Enter or Space on a button; Space ticks a checkbox. Escape does nothing: it does not hide the banner.
- **Landmark:** a `<section>` named by its heading is a region, listed among the landmarks, before the banner landmark of the header. It is not a dialog: it does not block the page, so it needs no `role="dialog"`.
- **Focus:** none when the page loads. After an answer, the confirmation; after the button that shows it again, the banner. Close returns it to that button, or to the first such button, or to `<main>`; never to the top of the page.

### When to use
Use it when your site sets cookies, or stores data in the browser, that it does not need to work, such as measuring visits or adverts: the law in the EU and the UK asks for the visitor’s consent before that.

### When not to use
Do not use it when the site sets only the cookies it needs to work (a session, a basket, a language or colour choice): those need no consent. Say so in the cookie policy and show no banner.

- Do not use it as a wall that hides or blocks the page until the visitor answers.
- Do not use it for news or a sale: that is a [banner](https://nandovejer.github.io/luz/docs/site/banner/).

It replaces a third-party consent script. Nothing in LUZ is removed.
