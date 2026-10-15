/**
 * LUZ Design System — Timeline (lazy chunk; enhances a list that already works)
 *
 * <luz-timeline>, a light-DOM custom element around an ordered list:
 *
 *   <luz-timeline aria-label="History of LUZ">
 *     <ol class="luz-timeline">
 *       <li class="luz-timeline__item">
 *         <time class="luz-timeline__date" datetime="2024">2024</time>
 *         <p class="luz-timeline__title">First release</p>   (or a heading)
 *         <p class="luz-timeline__text">Tokens and core ship.</p>
 *       </li>
 *     </ol>
 *   </luz-timeline>
 *
 * Without JavaScript, and until this module defines the element, it is the
 * list: every item, a line with a dot per item (components/timeline.css).
 *
 * Horizontal (default): the element builds, with DOM APIs only, a rail of
 * date buttons under the cards (one aria-current="true", a roving tabindex)
 * and Previous / Next at the sides of the card. The other cards are inert
 * (CSS hides them). Dates, Previous / Next, the arrows on the rail (mirrored
 * right to left), Home / End and a horizontal swipe over 40 px change the
 * item; both ends wrap. The list is the live region: polite for a change the
 * visitor makes, off for one autoplay makes.
 *
 * Autoplay is opt-in (`autoplay`, `interval` in ms, at least 2000, default
 * 5000), with a visible Pause / Play button (WCAG 2.2.2). It holds while the
 * pointer moves over the element (4 s still, or leaving, resumes it), while
 * the keyboard focus is inside, while under half of it is on screen and while
 * the tab is hidden. With reduced motion it never starts and the button is
 * hidden.
 *
 * Vertical (`layout="vertical"`): the item crossing the middle of the
 * viewport gets data-luz-state="active", the ones before it "past".
 *
 * Strings: Previous, Next, Pause and Play, in the language of the nearest
 * `lang` (en, es), each overridden by data-luz-label-<key> on the element or
 * an ancestor. The chunk carries that small dictionary so that importing it
 * alone (@luz-ds/core/timeline) loads nothing else (EX-010). luz.js passes
 * its own `t` to initTimeline(), so with the entry on the page a language
 * added with registerLocale() reaches the timeline too.
 *
 * Importing this module defines the element (once).
 *
 * @element luz-timeline - A rail of dates, Previous / Next and opt-in autoplay around an ordered list.
 * @attr {"vertical"} layout - Every item stays visible down a line; the item in the middle of the screen is active.
 * @attr {boolean} autoplay - Opt in to moving on by itself, with a visible Pause and Play.
 * @attr {number} [interval=5000] - Milliseconds between items, at least 2000.
 * @attr {string} data-luz-label-previous - The text of the Previous button, on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-next - The text of the Next button, on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-pause - The text of the Pause button of autoplay, on the element or an ancestor; the language's own by default.
 * @attr {string} data-luz-label-play - The text of the Play button of autoplay, on the element or an ancestor; the language's own by default.
 */
// luz-exception: EX-010 — the chunk's own four strings, so it loads without the entry
const strings = {
  en: { previous: "Previous", next: "Next", pause: "Pause", play: "Play" },
  es: { previous: "Anterior", next: "Siguiente", pause: "Pausar", play: "Reproducir" },
};

/** The string for `key` in the language of `el`: data-luz-label-<key>, the nearest lang, English. */
function own(key, el) {
  const attr = `data-luz-label-${key}`;
  const lang = el.closest("[lang]")?.lang.toLowerCase().split("-")[0];
  return el.closest(`[${attr}]`)?.getAttribute(attr) ?? (Object.hasOwn(strings, lang) ? strings[lang] : strings.en)[key];
}

let t = own;
/** What each built timeline runs to write its labels again. */
const labels = new WeakMap();

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
const SWIPE = 40;
const IDLE = 4000;

/** A new element with the class luz-timeline__<name>; a button is type="button". */
function make(tag, name) {
  const el = document.createElement(tag);
  el.className = `luz-timeline__${name}`;
  if (tag === "button") el.type = "button";
  return el;
}

/** The hump: a flat line that rises to the current dot and falls back, over a
 * stroke of the ground that hides the rail's line beneath it. */
function hump() {
  // eslint-disable-next-line no-restricted-syntax -- RL-12: the SVG namespace name, an identifier that is never fetched
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "luz-timeline__hump");
  svg.setAttribute("viewBox", "0 0 160 40");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  for (const d of ["M0 40H160", "M0 40H30C55 40 60 1 80 1S105 40 130 40H160"]) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

/** The item crossing the middle of the viewport is active, the ones before it past. */
function vertical(items) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        const active = items.indexOf(entry.target);
        if (!entry.isIntersecting) return;
        items.forEach((li, i) =>
          i > active ? li.removeAttribute("data-luz-state") : li.setAttribute("data-luz-state", i < active ? "past" : "active"),
        );
      }),
    { rootMargin: "-50% 0px" },
  );
  return () => {
    items.forEach((li) => io.observe(li));
    return () => io.disconnect();
  };
}

/** Builds the horizontal timeline; returns what connects it to the page (and undoes it). */
function horizontal(host, list, items) {
  const count = items.length;
  const auto = host.hasAttribute("autoplay");
  const interval = Math.max(2000, Number(host.getAttribute("interval")) || 5000);
  const stage = make("div", "stage");
  const rail = make("div", "rail");
  const track = make("div", "track");
  const previous = make("button", "arrow");
  const next = make("button", "arrow");
  const toggle = auto && make("button", "toggle");
  let current = 0;
  let paused = false; // by the visitor, with the button
  let hovering = false;
  let focused = false;
  let seen = false;
  let swiped = false;
  let start;
  let clock;
  let idle;

  const rtl = () => getComputedStyle(host).direction === "rtl";
  const playing = () => auto && !reduce.matches && !paused && !hovering && !focused && seen && !document.hidden;

  function schedule() {
    clearTimeout(clock);
    const on = playing();
    if (on) clock = setTimeout(() => select(current + 1, false, true), interval);
    if (toggle) {
      toggle.hidden = reduce.matches;
      toggle.textContent = t(paused ? "play" : "pause", host);
    }
  }

  const dates = items.map((li, i) => {
    const date = make("button", "stop");
    date.textContent = li.querySelector(".luz-timeline__date")?.textContent.trim() || String(i + 1);
    date.addEventListener("click", () => select(i));
    track.append(date);
    return date;
  });

  function select(index, focus, auto) {
    // A card that changes by itself is not announced; one the visitor picks is,
    // so the region is polite before the change, however autoplay stands
    list.setAttribute("aria-live", auto ? "off" : "polite");
    const was = items[current];
    const inside = was.contains(document.activeElement);
    current = (index + count) % count;
    items.forEach((li, i) => (li.inert = i !== current));
    dates.forEach((date, i) => {
      date.tabIndex = i === current ? 0 : -1;
      if (i === current) date.setAttribute("aria-current", "true");
      else date.removeAttribute("aria-current");
    });
    // The current date in the middle of the rail, measured on screen
    const box = track.getBoundingClientRect();
    const date = dates[current].getBoundingClientRect();
    track.scrollTo({
      left: track.scrollLeft + date.left + date.width / 2 - box.left - box.width / 2,
      behavior: reduce.matches ? "auto" : "smooth",
    });
    // The focus never falls to the page: out of a card that turns inert it goes to the new date (WCAG 2.4.3)
    if (focus || (inside && was.inert)) dates[current].focus({ preventScroll: true });
    schedule();
  }

  track.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key] * (rtl() ? -1 : 1);
    const to = event.key === "Home" ? 0 : event.key === "End" ? count - 1 : step ? current + step : null;
    if (to === null) return;
    // eslint-disable-next-line no-restricted-syntax -- RL-3: the arrows, Home and End move between the dates (roving tabindex); without this the rail would scroll as well
    event.preventDefault();
    select(to, true);
  });

  // A swipe, finger or mouse: toward inline-start is the next item
  host.addEventListener("pointerdown", (event) => {
    swiped = false;
    start = event.button === 0 && [event.clientX, event.clientY];
  });
  host.addEventListener("pointerup", (event) => {
    if (!start) return;
    const dx = event.clientX - start[0];
    const dy = event.clientY - start[1];
    start = null;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      select(current - Math.sign(dx) * (rtl() ? -1 : 1));
    }
  });
  host.addEventListener("pointercancel", () => (start = null));
  // A swipe that ends on a link is not a click on it
  host.addEventListener(
    "click",
    (event) => {
      if (swiped) {
        // eslint-disable-next-line no-restricted-syntax -- RL-3: a swipe that ends on a link or a button is a drag, not a click on it
        event.preventDefault();
        event.stopPropagation();
      }
      swiped = false;
    },
    true,
  );

  // The pointer holds it only while it moves: IDLE ms still and it plays again
  host.addEventListener("mousemove", () => {
    clearTimeout(idle);
    if (!hovering) {
      hovering = true;
      schedule();
    }
    idle = setTimeout(() => {
      hovering = false;
      schedule();
    }, IDLE);
  });
  host.addEventListener("mouseleave", () => {
    clearTimeout(idle);
    hovering = false;
    schedule();
  });
  // Only the keyboard's focus holds it: a click leaves the focus on a button too
  host.addEventListener("focusin", (event) => {
    focused = event.target.matches(":focus-visible");
    schedule();
  });
  // Focus that moves inside is caught again by focusin
  host.addEventListener("focusout", () => {
    focused = false;
    schedule();
  });

  previous.classList.add("luz-timeline__arrow--previous");
  next.classList.add("luz-timeline__arrow--next");
  const label = () => {
    previous.setAttribute("aria-label", t("previous", host));
    next.setAttribute("aria-label", t("next", host));
    schedule();
  };
  labels.set(host, label);
  previous.addEventListener("click", () => select(current - 1));
  next.addEventListener("click", () => select(current + 1));
  if (toggle) {
    toggle.classList.add("luz-btn", "luz-btn--ghost", "luz-btn--sm");
    toggle.addEventListener("click", () => {
      paused = !paused;
      schedule();
    });
  }

  list.replaceWith(stage);
  stage.append(previous, list, next);
  rail.append(hump(), track);
  host.append(rail);
  if (toggle) host.append(toggle);
  host.setAttribute("data-luz-ready", "");
  items.forEach((li, i) => {
    li.setAttribute("aria-posinset", i + 1);
    li.setAttribute("aria-setsize", count);
  });
  label();
  select(0, false, auto);

  return () => {
    const io = new IntersectionObserver(
      ([entry]) => {
        seen = entry.intersectionRatio >= 0.5;
        schedule();
      },
      { threshold: 0.5 },
    );
    document.addEventListener("visibilitychange", schedule);
    reduce.addEventListener("change", schedule);
    io.observe(host);
    return () => {
      document.removeEventListener("visibilitychange", schedule);
      reduce.removeEventListener("change", schedule);
      io.disconnect();
      clearTimeout(clock);
    };
  };
}

class LuzTimeline extends HTMLElement {
  #wire;
  #unwire;

  connectedCallback() {
    if (!this.#wire) {
      const list = this.querySelector(".luz-timeline");
      if (!list) return;
      const items = [...list.querySelectorAll(":scope > .luz-timeline__item")];
      // A labelled group: an aria-label on an element with no role names nothing
      if (!this.hasAttribute("role")) this.setAttribute("role", "group");
      this.#wire = this.getAttribute("layout") === "vertical" ? vertical(items) : horizontal(this, list, items);
    }
    this.#unwire = this.#wire();
  }

  disconnectedCallback() {
    this.#unwire?.();
  }
}

if (!customElements.get("luz-timeline")) customElements.define("luz-timeline", LuzTimeline);

/**
 * Write the labels of the timelines under `root` with `translate` (luz.js
 * passes core's `t`, as it does to initTableSort); a key it has no string
 * for keeps this chunk's own.
 * @param {ParentNode} root
 * @param {(key: string, el: Element) => string} translate
 */
export function initTimeline(root, translate) {
  t = (key, el) => {
    const text = translate(key, el);
    return text === key ? own(key, el) : text;
  };
  root.querySelectorAll("luz-timeline").forEach((el) => labels.get(el)?.());
}
