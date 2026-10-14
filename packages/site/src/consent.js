/**
 * LUZ Site — cookie consent: a banner that asks once, in a custom element,
 * <luz-consent> (light DOM, no Shadow DOM). A lazy chunk: site.js loads
 * this file (dist/consent.min.js, one file with its own budget, which
 * loads nothing else) on idle when the page has a <luz-consent>, so no
 * other page pays for it; a page may also load it on its own
 * ("@luz-ds/site/consent").
 *
 * Markup (every text is authored in the HTML: the script writes none; the
 * docs page, /docs/site/consent/, has the full example):
 *
 *   <luz-consent>
 *     <section class="luz-consent" data-luz-consent aria-labelledby="t" hidden>
 *       <div data-luz-consent-ask>
 *         <h2 class="luz-consent__title" id="t">Cookies on …</h2>
 *         <p>… <a href="/cookies/">Read the cookie policy</a>.</p>
 *         <form class="o-actions">
 *           <button class="luz-btn luz-btn--primary" value="all">Accept …</button>
 *           <button class="luz-btn luz-btn--primary" value="none">Reject …</button>
 *         </form>
 *         <details class="luz-consent__choices"><summary>…</summary>
 *           <form><fieldset>… <input type="checkbox" value="analytics"> …</fieldset>
 *             <div class="o-actions"><button …>Save my choices</button></div></form>
 *         </details>
 *       </div>
 *       <div data-luz-consent-done tabindex="-1" hidden>
 *         <p>Your choice is saved. …</p>
 *         <button class="luz-btn luz-btn--secondary" type="button" data-luz-consent-close>Close</button>
 *       </div>
 *     </section>
 *   </luz-consent>
 *   <button type="button" data-luz-consent-open hidden>Change cookie settings</button>
 *
 * Without JavaScript the banner stays hidden: none of the site's own
 * scripts run either, so there is nothing to consent to, and no button is
 * ever shown that does nothing. The cookie policy, linked from every page,
 * is the way in.
 *
 * With it, the banner shows, as a band fixed at the bottom of the window
 * (in the flow in a window under 30rem tall) and without taking focus, when no
 * valid choice is stored, the stored one has expired, or the form offers a
 * category the stored choice was not asked about. Accept grants every
 * category, Reject none, Save the ones ticked; Escape does nothing. The
 * choice is stored, `luz:consent` is dispatched on document with
 * { asked, granted, expires }, and the confirmation takes the place of the
 * question and takes focus. The confirmation goes away with its
 * [data-luz-consent-close] button (focus goes back to the button that
 * opened the banner, else the first [data-luz-consent-open], else <main>),
 * or when focus leaves the band for the page (focus stays where it went).
 * A [data-luz-consent-open] button, hidden until now (its space kept),
 * shows the banner again with the stored choice ticked, and takes focus to it.
 * While the banner shows, its height is on :root as --luz-consent-h (from
 * a ResizeObserver, rounded up to px): the page keeps that much room at
 * its end and scrolls what Tab reaches out from under it (WCAG 2.4.11).
 *
 * Stored in localStorage, under "luz-consent" or the section's
 * data-luz-consent-key (it must start with "luz-"), as JSON:
 *   {"version":1,"expires":<ms since 1970>,"asked":["analytics"],"granted":[]}
 * Categories are the checkboxes' values: a lowercase letter, then letters,
 * digits or hyphens, 32 at most. A choice lasts data-luz-consent-days days
 * (180 by default, 395 at most: 13 months).
 */

const KEY = /^luz-[\w-]+$/;
const NAME = /^[a-z][a-z\d-]{0,31}$/;
const names = (list) => Array.isArray(list) && list.every((n) => NAME.test(n));

/**
 * The stored choice: { asked, granted, expires }, or null when there is
 * none, it has expired, it is malformed or storage is blocked.
 * @param {string} [key] the storage key, "luz-consent" by default
 */
export function getConsent(key = "luz-consent") {
  try {
    const { version, expires, asked, granted } = JSON.parse(localStorage.getItem(key));
    if (version === 1 && expires > Date.now() && names(asked) && names(granted) && granted.every((n) => asked.includes(n))) return { asked, granted, expires };
  } catch {
    // Nothing stored, not JSON, or storage blocked: ask again
  }
  return null;
}

const wired = new WeakSet();
const H = "--luz-consent-h";
const unpublish = () => document.documentElement.style.removeProperty(H);

/** Wire the banner inside `host`, and the page's open buttons. Once per banner. */
const wire = (host) => {
  const box = host.querySelector("[data-luz-consent]");
  const ask = box?.querySelector("[data-luz-consent-ask]");
  const done = box?.querySelector("[data-luz-consent-done]");
  if (!ask || !done || wired.has(box)) return;
  wired.add(box);
  const key = KEY.test(box.dataset.luzConsentKey) ? box.dataset.luzConsentKey : undefined;
  const days = Math.min(+box.dataset.luzConsentDays || 180, 395);
  const boxes = [...box.querySelectorAll("input[type=checkbox]")].filter((input) => NAME.test(input.value));
  const offered = boxes.map((input) => input.value);

  const show = (stored) => {
    for (const input of boxes) input.checked = !!stored?.granted.includes(input.value);
    ask.hidden = false;
    done.hidden = true;
    box.hidden = false;
  };

  const stored = getConsent(key);
  // In a frame of its own, so its height is published (below) before
  // anything can see it shown
  if (!stored || offered.some((n) => !stored.asked.includes(n))) requestAnimationFrame(() => show(stored));

  box.addEventListener("submit", (e) => {
    // eslint-disable-next-line no-restricted-syntax -- the forms have nowhere to send the choice: it is stored on this device instead (PRINCIPLES §3, §8)
    e.preventDefault();
    const how = e.submitter?.value;
    const granted = how === "all" ? offered : how === "none" ? [] : boxes.filter((input) => input.form === e.target && input.checked).map((input) => input.value);
    const detail = { asked: offered, granted, expires: Date.now() + days * 864e5 };
    try {
      localStorage.setItem(key ?? "luz-consent", JSON.stringify({ version: 1, ...detail }));
    } catch {
      // Storage blocked: the choice holds for this page only
    }
    ask.hidden = true;
    done.hidden = false;
    done.focus();
    document.dispatchEvent(new CustomEvent("luz:consent", { detail }));
  });

  // The saved state goes away (C3): with its Close button, focus going back
  // to where the band was opened from (C2), and when focus leaves the band
  // for the page, focus staying where it went. Escape does nothing (C8).
  let opener;
  const close = (focus) => {
    if (box.hidden) return;
    const to = focus && box.contains(document.activeElement) && ((opener?.isConnected && opener) || document.querySelector("[data-luz-consent-open]") || document.querySelector("main"));
    box.hidden = true;
    unpublish();
    if (to) {
      if (!to.hasAttribute("tabindex") && to.localName === "main") to.tabIndex = -1;
      to.focus();
    }
  };
  box.addEventListener("click", (e) => e.target.closest?.("[data-luz-consent-close]") && close(true));
  box.addEventListener("focusout", (e) => !done.hidden && e.relatedTarget && !box.contains(e.relatedTarget) && close());

  // Its height, for the room the page keeps while it shows (C4, C6):
  // the border box, rounded up, from the observer's number only
  new ResizeObserver(([entry]) => {
    const h = entry.borderBoxSize?.[0]?.blockSize;
    if (h > 0) document.documentElement.style.setProperty(H, `${Math.ceil(h)}px`);
    else unpublish();
  }).observe(box);

  for (const button of document.querySelectorAll("[data-luz-consent-open]")) {
    button.hidden = false;
    button.addEventListener("click", () => {
      opener = button;
      show(getConsent(key));
      box.tabIndex = -1;
      box.focus();
    });
  }
};

// <luz-consent> wraps the banner. Defined once, whatever the number of
// copies of this file (SEC-CHUNK-5), and only where there is a DOM, so
// importing this module in Node is harmless.
if (typeof customElements < "u" && !customElements.get("luz-consent")) {
  customElements.define("luz-consent", class extends HTMLElement {
    connectedCallback() {
      wire(this);
    }

    disconnectedCallback() {
      unpublish();
    }
  });
}
