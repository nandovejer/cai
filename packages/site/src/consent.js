/**
 * LUZ Site — cookie consent: a banner that asks once, in a custom element,
 * <luz-site-consent> (light DOM, no Shadow DOM). A module of its own:
 * site.js does not import it, so a page that asks for consent loads this
 * file (dist/consent.min.js, one file with its own budget) and no other
 * page pays for it.
 *
 * Markup (every text is authored in the HTML: the script writes none; the
 * docs page, /docs/site/consent/, has the full example):
 *
 *   <luz-site-consent>
 *     <section class="luz-site-consent" data-luz-consent aria-labelledby="t" hidden>
 *       <div data-luz-consent-ask>
 *         <h2 class="luz-site-consent__title" id="t">Cookies on …</h2>
 *         <p>… <a href="/cookies/">Read the cookie policy</a>.</p>
 *         <form class="luz-site-actions">
 *           <button class="luz-btn luz-btn--primary" value="all">Accept …</button>
 *           <button class="luz-btn luz-btn--primary" value="none">Reject …</button>
 *         </form>
 *         <details class="luz-site-consent__choices"><summary>…</summary>
 *           <form><fieldset>… <input type="checkbox" value="analytics"> …</fieldset>
 *             <div class="luz-site-actions"><button …>Save my choices</button></div></form>
 *         </details>
 *       </div>
 *       <p data-luz-consent-done tabindex="-1" hidden>Your choice is saved. …</p>
 *     </section>
 *   </luz-site-consent>
 *   <button type="button" data-luz-consent-open hidden>Change cookie settings</button>
 *
 * Without JavaScript the banner stays hidden: none of the site's own
 * scripts run either, so there is nothing to consent to, and no button is
 * ever shown that does nothing. The cookie policy, linked from every page,
 * is the way in.
 *
 * With it, the banner shows, in the flow and without taking focus, when no
 * valid choice is stored, the stored one has expired, or the form offers a
 * category the stored choice was not asked about. Accept grants every
 * category, Reject none, Save the ones ticked; Escape grants nothing. The
 * choice is stored, `luz:consent` is dispatched on document with
 * { asked, granted, expires }, and the confirmation takes the place of the
 * question and takes focus. A [data-luz-consent-open] button, hidden until
 * now, shows the banner again with the stored choice ticked.
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
  if (!stored || offered.some((n) => !stored.asked.includes(n))) show(stored);

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

  for (const button of document.querySelectorAll("[data-luz-consent-open]")) {
    button.hidden = false;
    button.addEventListener("click", () => {
      show(getConsent(key));
      box.tabIndex = -1;
      box.focus();
    });
  }
};

// <luz-site-consent> wraps the banner. Defined once, and only where there
// is a DOM, so importing this module in Node is harmless.
if (typeof customElements < "u" && !customElements.get("luz-site-consent")) {
  customElements.define("luz-site-consent", class extends HTMLElement {
    connectedCallback() {
      wire(this);
    }
  });
}
