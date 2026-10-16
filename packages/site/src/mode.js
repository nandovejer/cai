/**
 * LUZ Site — color mode: <luz-mode> (light DOM, no Shadow DOM) wraps core's
 * color mode radios and gives them an "Auto" state. A lazy chunk: site.js
 * loads this file (dist/mode.min.js, one file with its own budget, which
 * loads nothing else) on idle when the page has a <luz-mode>; a page may
 * also load it on its own ("@luz-ds/site/mode").
 *
 * Markup (every text is the radios' labels: the script writes none; the
 * docs page, /docs/site/mode/, has the full example with the icons' paths).
 * The icons go in the labels: core's cycle button copies the checked label's
 * icon, and core has no Auto icon for data-mode-icon on the button.
 *
 *   <luz-mode remember by="clock">
 *     <fieldset class="luz-mode-switcher luz-mode-switcher--cycle">
 *       <legend class="luz-mode-switcher__label">Color mode</legend>
 *       <label class="luz-mode-btn"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="auto" checked><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">…</svg>Auto</label>
 *       <label class="luz-mode-btn" data-theme="light"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="light"><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">…</svg>Light</label>
 *       <label class="luz-mode-btn" data-theme="dark"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="dark"><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">…</svg>Dark</label>
 *       <label class="luz-mode-btn" data-theme="high-contrast"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="high-contrast"><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">…</svg>High contrast</label>
 *     </fieldset>
 *   </luz-mode>
 *
 * Without JavaScript the radios change the mode through the tokens'
 * :root:has(), and "Auto" leaves the page light.
 *
 * With it, "Auto" follows the system (prefers-contrast: more, then
 * prefers-color-scheme: dark) or, with by="clock", the phase of the day from
 * the local wall-clock hour (dawn, dusk and night are dark; prefers-contrast:
 * more still wins), written as data-light="<phase>" and checked again at
 * every minute and when the tab shows again. A chosen mode is applied as
 * data-theme; with the clock its light is pinned (light: afternoon, dark and
 * high contrast: night). With `remember` the choice is stored under core's
 * "luz-theme" key (auto removes it); without it the key is not read, and the
 * key core writes on a choice is removed. A custom theme of
 * <html data-luz-themes> on the target is core's: the element leaves it alone.
 * Core's cycle button, when luz.js is on the page, steps through the four
 * radios with no code here.
 *
 * API: `mode` ("auto" | "light" | "dark" | "high-contrast"), `light` (the
 * phase, or null without the clock), `preview(phase | hour 0-24 | null)`
 * (with the clock only: the light, and in auto the mode, follow that hour;
 * null returns to now; false when it does nothing).
 *
 * @element luz-mode - Core's color mode radios with an Auto state that follows the system or the clock of the day; it stores the choice on request.
 * @attr {boolean} remember - Store the chosen mode under core's luz-theme key; Auto removes it. Without it nothing is stored.
 * @attr {"clock"} by - What Auto follows: the local hour, which also writes the light attribute; without it (or by="system") the system's preferences.
 * @attr {string} for - The id of the element that gets data-theme and the light attribute; the default is <html>.
 * @attr {string} light-attr - The name of the attribute for the phase of the day, a data-* name; the default is data-light.
 * @fires luz-mode:change {CustomEvent} - Bubbles from the element after the upgrade and on every change, with detail { mode, theme, light, remembered, simulated }.
 */

const KEY = "luz-theme";
const MODES = ["light", "dark", "high-contrast"];
const CHOICES = ["auto", ...MODES];
const DARK = ["dawn", "dusk", "night"];
// The hour preview() takes for the name of a phase
const HOURS = { dawn: 6.25, morning: 9.5, afternoon: 14, sunset: 19, dusk: 21.25, night: 23.75 };
// Read through constants: the target's attributes and the page's list are not the tag's own
const THEME = "data-theme";
const THEMES = "data-luz-themes";

/** The phase of the day at a local hour (minutes as a fraction). */
export function phaseOf(hour) {
  return hour < 5 ? "night" : hour < 7.5 ? "dawn" : hour < 12 ? "morning" : hour < 17.5 ? "afternoon" : hour < 20.5 ? "sunset" : hour < 22.5 ? "dusk" : "night";
}

/** Storage that may throw (sandboxed iframes): no argument reads, null removes, a string stores. */
function store(value) {
  try {
    if (value === undefined) return localStorage.getItem(KEY);
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    // No persistence, the same page
  }
  return null;
}

/**
 * Check the radio of the choice as a click would, so its own change event
 * tells core's cycle button (which core's boot may have set to another
 * radio); that event is not a choice.
 */
function sync(el) {
  for (const r of el.querySelectorAll("input[type=radio]")) {
    if (r.value === el.c && !r.checked) {
      el.q = true;
      r.click();
      el.q = false;
    }
  }
}

function choose(el, v, fromRadio) {
  el.c = v;
  if (!fromRadio) sync(el);
  // After the radio's change event: core may have written the key
  store(el.r && v !== "auto" ? v : null);
  render(el);
}

/** Once a minute, at the minute: one timeout, never an interval. */
function tick(el) {
  const d = new Date();
  el.i = setTimeout(() => {
    render(el);
    tick(el);
  }, 6e4 - d.getSeconds() * 1e3 - d.getMilliseconds());
}

function render(el) {
  const { t, c, k, p, m } = el;
  const d = new Date();
  const phase = phaseOf(p ?? d.getHours() + d.getMinutes() / 60);
  const current = t.getAttribute(THEME);
  const auto = c === "auto";
  let theme = auto ? (m[0].matches ? "high-contrast" : (k ? DARK.includes(phase) : m[1].matches) ? "dark" : "light") : c;
  let light = k ? (p !== null || auto ? phase : c === "light" ? "afternoon" : "night") : null;
  if (auto && !MODES.includes(current) && (document.documentElement.getAttribute(THEMES) || "").split(/\s+/).includes(current)) {
    // A custom theme: core's
    theme = current;
    light = null;
    t.removeAttribute(el.a);
  } else {
    if (current !== theme) t.setAttribute(THEME, theme);
    if (light && t.getAttribute(el.a) !== light) t.setAttribute(el.a, light);
  }
  el.l = light;
  const detail = { mode: c, theme, light, remembered: el.r && !auto && store() === c, simulated: p !== null };
  const key = JSON.stringify(detail);
  if (key !== el.e) {
    el.e = key;
    el.dispatchEvent(new CustomEvent("luz-mode:change", { bubbles: true, detail }));
  }
}

if (typeof customElements !== "undefined" && !customElements.get("luz-mode")) {
  customElements.define(
    "luz-mode",
    class extends HTMLElement {
      connectedCallback() {
        this.t = document.getElementById(this.getAttribute("for")) || document.documentElement;
        const name = this.getAttribute("light-attr");
        this.a = /^data-[a-z][a-z0-9-]*$/.test(name) ? name : "data-light";
        this.k = this.getAttribute("by") === "clock";
        this.r = this.hasAttribute("remember");
        const saved = this.r && store();
        this.c = MODES.includes(saved) ? saved : "auto";
        this.p = null;
        this.e = "";
        this.x = new window.AbortController();
        const options = { signal: this.x.signal };
        const update = () => render(this);
        this.m = [window.matchMedia("(prefers-contrast: more)"), window.matchMedia("(prefers-color-scheme: dark)")];
        for (const q of this.m) q.addEventListener("change", update, options);
        document.addEventListener("visibilitychange", update, options);
        // On window: after core's listener on document, so the key it writes can be taken back
        window.addEventListener(
          "change",
          (e) => {
            const r = e.target;
            if (!this.q && this.contains(r) && r.type === "radio" && r.checked && CHOICES.includes(r.value)) choose(this, r.value, true);
          },
          options,
        );
        sync(this);
        render(this);
        if (this.k) tick(this);
      }

      disconnectedCallback() {
        this.x.abort();
        clearTimeout(this.i);
      }

      get mode() {
        return this.c;
      }

      set mode(v) {
        if (CHOICES.includes(v)) choose(this, v);
      }

      get light() {
        return this.l ?? null;
      }

      preview(x) {
        const hour = x === null || x === undefined ? null : (HOURS[x] ?? x);
        if (!this.k || (hour !== null && !(typeof hour === "number" && hour >= 0 && hour <= 24))) return false;
        this.p = hour;
        render(this);
        return true;
      }
    },
  );
}
