/**
 * <home-light>: the light of the visitor's sky on the home page. It draws the
 * sun and the moon where the visitor is, from the time zone of the browser's
 * clock (Intl, never the network or GPS), over one of three visuals: a globe
 * of dots, a skyline or a city map. A line under the visual opens a bar to
 * scrub the day and change the look.
 *
 *   <home-light looks="globe city map" look="random" remember bleed favicon></home-light>
 *
 * looks     the visuals offered, any of globe, city, map ("none": no visual)
 * look      the first look, or random; ?look= in the URL wins, then the
 *           visitor's last click (with remember), then this
 * remember  keep the look the visitor clicks in localStorage["luz-home-light"]
 * bleed     the visual runs to the edges of the page's frame (light.css)
 * favicon   the tab's icon follows the sky (a data: URL of an SVG)
 *
 * It does not own the colour mode: <luz-mode> is the only writer of
 * data-theme and data-light. This element reads them, follows luz-mode:change
 * and, while the visitor scrubs the day, asks <luz-mode> to preview that
 * hour (Live gives it back); without a <luz-mode> only the visuals follow
 * the slider. On <html> it writes custom properties only: --sun-alt and
 * --sun-az (degrees), --sun-x (where the sun stands, left to right) and
 * --day-left (the share of today's daylight still to come).
 *
 * Its texts are the page's: data-luz-label-light-* on the element or an
 * ancestor (the home's <body>, from apps/landing/i18n). It imports nothing
 * statically: each visual is its own file, loaded the first time it is
 * wanted. The rules are apps/landing/light/light.css.
 */

const KEY = "luz-home-light";
const LOOKS = ["globe", "city", "map"];
const DEG = Math.PI / 180;
// The three visuals: each one a file, loaded the first time it is wanted
const LOAD = { globe: () => import("./globe.js"), city: () => import("./city.js"), map: () => import("./map.js") };
// What each visual is made with
const MAKE = {
  globe: (place) => ({ spin: "", cities: "", twilight: "", glint: "", rim: "", torch: "", lat: place.lat, lon: place.lon }),
  city: () => ({ seed: 7 }),
  map: () => ({ seed: 3, puzzle: "" }),
};
const ICONS = {
  globe: "M28.6 16A12.6 12.6 0 1 1 3.4 16a12.6 12.6 0 1 1 25.2 0M21.4 16A5.4 12.6 0 1 1 10.6 16a5.4 12.6 0 1 1 10.8 0M3.4 16h25.2M6 9.2h20M6 22.8h20",
  city: "M3 29h26M5 29V15h6v14M13 29V7h6v22M21 29V18h6v11M8 19v.02M8 23v.02M16 11v.02M16 15v.02M16 19v.02M16 23v.02M24 22v.02",
  map: "M3 8 11 5l10 4 8-3v18l-8 3-10-4-8 3zM11 5v18M21 9v18",
};
// eslint-disable-next-line no-restricted-syntax -- RL-12: the SVG namespace name, an identifier that is never fetched
const SVG = "http://www.w3.org/2000/svg";
// A place for each common time zone, latitude and longitude; another zone gets its offset's meridian at 30°
const PLACES = {
  "Europe/Madrid": [40.42, -3.7], "Atlantic/Canary": [28.1, -15.4], "Europe/Lisbon": [38.72, -9.14],
  "Europe/London": [51.5, -0.12], "Europe/Dublin": [53.35, -6.26], "Europe/Paris": [48.86, 2.35],
  "Europe/Brussels": [50.85, 4.35], "Europe/Amsterdam": [52.37, 4.9], "Europe/Berlin": [52.52, 13.4],
  "Europe/Zurich": [47.38, 8.54], "Europe/Vienna": [48.21, 16.37], "Europe/Rome": [41.9, 12.5],
  "Europe/Prague": [50.08, 14.44], "Europe/Warsaw": [52.23, 21.01], "Europe/Copenhagen": [55.68, 12.57],
  "Europe/Oslo": [59.91, 10.75], "Europe/Stockholm": [59.33, 18.07], "Europe/Helsinki": [60.17, 24.94],
  "Europe/Athens": [37.98, 23.73], "Europe/Istanbul": [41.01, 28.98], "Europe/Kyiv": [50.45, 30.52],
  "Europe/Moscow": [55.76, 37.62], "Africa/Casablanca": [33.57, -7.59], "Africa/Algiers": [36.75, 3.06],
  "Africa/Cairo": [30.04, 31.24], "Africa/Lagos": [6.52, 3.38], "Africa/Nairobi": [-1.29, 36.82],
  "Africa/Johannesburg": [-26.2, 28.05], "America/New_York": [40.71, -74.01], "America/Toronto": [43.65, -79.38],
  "America/Chicago": [41.88, -87.63], "America/Denver": [39.74, -104.99], "America/Phoenix": [33.45, -112.07],
  "America/Los_Angeles": [34.05, -118.24], "America/Vancouver": [49.28, -123.12],
  "America/Mexico_City": [19.43, -99.13], "America/Bogota": [4.71, -74.07], "America/Lima": [-12.05, -77.04],
  "America/Santiago": [-33.45, -70.67], "America/Caracas": [10.48, -66.9],
  "America/Argentina/Buenos_Aires": [-34.6, -58.38], "America/Sao_Paulo": [-23.55, -46.63],
  "America/Montevideo": [-34.9, -56.16], "America/Havana": [23.11, -82.37], "Asia/Jerusalem": [31.77, 35.21],
  "Asia/Riyadh": [24.71, 46.68], "Asia/Dubai": [25.2, 55.27], "Asia/Tehran": [35.69, 51.39],
  "Asia/Karachi": [24.86, 67.01], "Asia/Kolkata": [19.08, 72.88], "Asia/Dhaka": [23.81, 90.41],
  "Asia/Bangkok": [13.76, 100.5], "Asia/Jakarta": [-6.21, 106.85], "Asia/Singapore": [1.35, 103.82],
  "Asia/Manila": [14.6, 120.98], "Asia/Hong_Kong": [22.32, 114.17], "Asia/Shanghai": [31.23, 121.47],
  "Asia/Taipei": [25.03, 121.57], "Asia/Seoul": [37.57, 126.98], "Asia/Tokyo": [35.68, 139.69],
  "Australia/Perth": [-31.95, 115.86], "Australia/Melbourne": [-37.81, 144.96], "Australia/Sydney": [-33.87, 151.21],
  "Australia/Brisbane": [-27.47, 153.03], "Pacific/Auckland": [-36.85, 174.76], "Pacific/Honolulu": [21.31, -157.86],
};

/* ---- The sky, from the clock alone ---- */

/** The sun at instant t: its declination, the equation of time (minutes) and its unit vector in the Earth's frame. */
function solar(t) {
  const d = new Date(t);
  const doy = (t - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5;
  const decl = -23.44 * Math.cos((2 * Math.PI * (doy + 10)) / 365.25) * DEG;
  const B = (2 * Math.PI * (doy - 81)) / 365;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const h = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 + eot / 60;
  const lon = (12 - h) * 15 * DEG;
  return { decl, eot, vec: [Math.cos(decl) * Math.sin(lon), Math.sin(decl), Math.cos(decl) * Math.cos(lon)] };
}

/** Sunrise and sunset (ms) of the civil day { year, month, day } at a place, and the hours of light. */
function sunTimes(lat, lon, c) {
  const guess = Date.UTC(c.year, c.month - 1, c.day, 12) - (lon / 15) * 36e5;
  const { decl, eot } = solar(guess);
  const noon = guess - eot * 6e4, phi = lat * DEG;
  const cosw = (Math.sin(-0.833 * DEG) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
  if (cosw > 1) return { hours: 0 };
  if (cosw < -1) return { hours: 24 };
  const w = Math.acos(cosw) / DEG / 15;
  return { rise: noon - w * 36e5, set: noon + w * 36e5, hours: 2 * w };
}

/** The moon's age (0 new, 0.5 full) and the share of it that is lit. */
function moonPhase(t) {
  const age = ((((t - Date.UTC(2000, 0, 6, 18, 14)) / (29.530588853 * 864e5)) % 1) + 1) % 1;
  return { age, lit: (1 - Math.cos(2 * Math.PI * age)) / 2 };
}

/** The wall clock of a zone at instant t. */
function partsIn(tz, t) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const o = {};
  for (const p of f.formatToParts(new Date(t))) if (p.type !== "literal") o[p.type] = +p.value;
  o.hour %= 24;
  return o;
}

function zone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.includes("/") && !tz.startsWith("Etc/")) return tz;
  } catch {
    // No usable zone: the fallback
  }
  return "Europe/Madrid";
}

function placeFor(tz, t) {
  if (PLACES[tz]) return { lat: PLACES[tz][0], lon: PLACES[tz][1] };
  const p = partsIn(tz, t);
  const offset = (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000) / 36e5;
  return { lat: 30, lon: offset * 15 };
}

/** The lit part of a moon of radius r at (cx, cy), as path data. */
function moonPath(age, cx, cy, r) {
  const c = Math.cos(2 * Math.PI * age), right = age < 0.5, rx = Math.max(0.01, r * Math.abs(c));
  return `M${cx} ${cy - r}A${r} ${r} 0 0 ${right ? 1 : 0} ${cx} ${cy + r}A${rx} ${r} 0 0 ${right === c > 0 ? 0 : 1} ${cx} ${cy - r}Z`;
}

/** An element with attributes and, optionally, text. */
function h(tag, attrs = {}, text = "") {
  const n = document.createElement(tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text) n.textContent = text;
  return n;
}

function icon(d) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", d);
  svg.append(path);
  return svg;
}

/** The <luz-mode> of the page, once it is upgraded. */
const mode = () => {
  const el = document.querySelector("luz-mode");
  return el && typeof el.preview === "function" ? el : null;
};

let uid = 0;

class LuzLight extends HTMLElement {
  static get observedAttributes() {
    return ["look"];
  }

  constructor() {
    super();
    this._sim = 0; // the offset of the simulated instant, in ms; 0 is now
    this._views = {};
  }

  connectedCallback() {
    if (!this._stage) this._build();
    this._tick();
    this._abort = new window.AbortController();
    const signal = this._abort.signal;
    document.addEventListener("luz-mode:change", () => this._tick(), { signal });
    document.addEventListener("pointerdown", (e) => this._bar && !this._bar.contains(e.target) && !this._line.contains(e.target) && this.close(), { signal });
    document.addEventListener(
      "keydown",
      (e) => {
        // eslint-disable-next-line no-restricted-syntax -- RL-3: the bar is a disclosure in the flow, not a dialog or a popover (a popover drifted from its line on scroll), so Escape is closed here
        if (e.key === "Escape" && !this._bar.hidden) {
          const inside = this.contains(document.activeElement);
          this.close();
          if (inside) this._line.focus();
        }
      },
      { signal },
    );
    document.addEventListener("visibilitychange", () => !document.hidden && this._tick(), { signal });
  }

  disconnectedCallback() {
    this._abort.abort();
    clearTimeout(this._timer);
    clearTimeout(this._favTimer);
  }

  attributeChangedCallback(name, old, value) {
    if (this._stage && !this._reflecting && old !== value) this._setLook(value, false);
  }

  /** A text of the page: data-luz-label-light-<key> here or on an ancestor. */
  _text(key) {
    const name = `data-luz-label-light-${key}`;
    return this.closest(`[${name}]`)?.getAttribute(name) ?? "";
  }

  open() {
    this._bar.hidden = false;
    this._line.setAttribute("aria-expanded", "true");
  }

  close() {
    if (this._bar.hidden) return;
    this._bar.hidden = true;
    this._line.setAttribute("aria-expanded", "false");
  }

  _build() {
    this._tz = zone();
    this._place = placeFor(this._tz, Date.now());
    const { lat, lon } = this._place, la = lat * DEG, lo = lon * DEG;
    this._placeVec = [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
    this._east = [Math.cos(lo), 0, -Math.sin(lo)];
    this._north = [-Math.sin(la) * Math.sin(lo), Math.cos(la), -Math.sin(la) * Math.cos(lo)];
    const lang = this.closest("[lang]")?.getAttribute("lang") || "en";
    const clock = { timeZone: this._tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
    try {
      this._clock = new Intl.DateTimeFormat(lang, clock);
    } catch {
      this._clock = new Intl.DateTimeFormat("en", clock);
    }
    this._remember = this.hasAttribute("remember");
    this._looks = (this.getAttribute("looks") ?? LOOKS.join(" ")).split(/\s+/).filter((k) => LOOKS.includes(k));

    const id = `home-light-${++uid}`;
    this._stage = h("div", { class: "home-light__stage" });
    this._stage.append(h("div", { class: "home-light__glow", "aria-hidden": "true" }));
    const foot = h("div", { class: "home-light__foot" });
    const bar = (this._bar = h("div", { class: "home-light__bar", id: `${id}-bar`, hidden: "" }));
    if (this._looks.length) {
      const group = h("div", { class: "home-light__group", role: "group", "aria-label": this._text("looks") });
      for (const k of this._looks) {
        const name = this._text(k);
        const b = h("button", { type: "button", "data-look": k, "aria-pressed": "false", "aria-label": name, title: name });
        b.append(icon(ICONS[k]));
        b.addEventListener("click", () => this._setLook(k, true));
        group.append(b);
      }
      bar.append(group);
    }
    const day = h("div", { class: "home-light__day" });
    day.append(h("label", { class: "home-light__sr", for: `${id}-scrub` }, this._text("scrub")));
    this._scrub = h("input", { type: "range", id: `${id}-scrub`, min: 0, max: 1439, step: 1, value: 720, "aria-describedby": `${id}-out` });
    this._scrub.addEventListener("input", () => this._preview(this._scrub.value / 60));
    this._live = h("button", { type: "button", class: "home-light__live", hidden: "" }, this._text("live"));
    this._live.addEventListener("click", () => {
      this._preview(null);
      this._scrub.focus();
    });
    this._out = h("output", { id: `${id}-out`, for: `${id}-scrub` });
    day.append(this._scrub, this._live, this._out);
    bar.append(day);
    this._line = h("button", { type: "button", class: "home-light__line", "aria-expanded": "false", "aria-controls": bar.id });
    this._q = h("span", { class: "home-light__q" });
    this._when = h("span", { class: "home-light__sr" });
    this._line.append(this._q, this._when);
    this._line.addEventListener("click", () => (this._bar.hidden ? this.open() : this.close()));
    foot.append(bar, this._line);
    this.append(this._stage, foot);

    if (this.hasAttribute("favicon")) {
      this._favicon = document.querySelector('link[rel~="icon"][type="image/svg+xml"]') || document.querySelector('link[rel~="icon"]');
      if (!this._favicon) document.head.append((this._favicon = h("link", { rel: "icon", type: "image/svg+xml" })));
    }

    // The first look: ?look= of the URL, then the visitor's last click, then the attribute, then one at random
    let stored = null;
    if (this._remember) {
      try {
        stored = localStorage.getItem(KEY);
      } catch {
        // Storage refused (a sandboxed frame): nothing remembered
      }
    }
    const asked = [new window.URLSearchParams(location.search).get("look"), stored, this.getAttribute("look")].find((k) => this._looks.includes(k));
    this._setLook(asked ?? this._looks[Math.floor(Math.random() * this._looks.length)], false);
  }

  /** Show a look, loading its visual the first time; a click is remembered. */
  _setLook(k, byUser) {
    if (!this._looks.includes(k)) k = this._looks.includes(this._look) ? this._look : this._looks[0];
    this._look = k;
    this._reflecting = true;
    if (k) this.setAttribute("look", k);
    this._reflecting = false;
    for (const b of this.querySelectorAll("[data-look]")) b.setAttribute("aria-pressed", String(b.dataset.look === k));
    if (byUser && this._remember) {
      try {
        localStorage.setItem(KEY, k);
      } catch {
        // Not remembered: the same page
      }
    }
    for (const v in this._views) this._views[v].hidden = v !== k;
    if (k && !this._views[k]) {
      LOAD[k]().then(() => {
        if (this._views[k]) return;
        const view = h(`home-${k}`, { ...MAKE[k](this._place), "aria-label": this._text(`${k}-alt`), hidden: "" });
        if (k === "globe") view.addEventListener("home-globe:sun", (e) => this._setSunX(50 + 32 * e.detail.x));
        this._views[k] = view;
        this._stage.append(view);
        view.hidden = this._look !== k;
        this._tick();
      });
    }
    this._tick();
  }

  /** Scrub to an hour (0 to 24), or back to now (null), and ask <luz-mode> to follow. */
  _preview(hour) {
    if (hour === null) this._sim = 0;
    else {
      const p = partsIn(this._tz, Date.now());
      this._sim = (hour - (p.hour + p.minute / 60 + p.second / 3600)) * 36e5;
    }
    this._live.hidden = hour === null;
    this._line.dataset.preview = String(hour !== null);
    mode()?.preview(hour);
    this._tick();
  }

  _setSunX(x) {
    const value = x.toFixed(1) + "%";
    this.style.setProperty("--_sun-x", value);
    document.documentElement.style.setProperty("--sun-x", value);
  }

  /** The sun's altitude and azimuth (degrees) at the place, at instant t. */
  _sun(t) {
    const v = solar(t).vec, p = this._placeVec, e = this._east, n = this._north;
    const alt = Math.asin(p[0] * v[0] + p[1] * v[1] + p[2] * v[2]) / DEG;
    const az = (Math.atan2(v[0] * e[0] + v[2] * e[2], v[0] * n[0] + v[1] * n[1] + v[2] * n[2]) / DEG + 360) % 360;
    return { alt, az, vec: v };
  }

  /** Bring everything to the (simulated) instant, then again at the next minute. */
  _tick() {
    clearTimeout(this._timer);
    const now = Date.now(), t = now + this._sim, p = partsIn(this._tz, t);
    this._timer = setTimeout(() => this._tick(), 6e4 - (now % 6e4));
    const root = document.documentElement, rs = root.style;
    const light = root.getAttribute("data-light");
    const time = this._clock.format(new Date(t));
    this._scrub.value = p.hour * 60 + p.minute;
    this._out.textContent = time;
    const say = this._look ? this._text(`say-${this._look}`) : "";
    const phase = light ? this._text(light) : "";
    this._q.textContent = say || [phase, time].filter(Boolean).join(" · ");
    this._when.textContent = ` ${[phase, time].filter(Boolean).join(", ")}. ${this._text("open")}`;

    const { alt, az, vec } = this._sun(t);
    rs.setProperty("--sun-alt", alt.toFixed(2));
    rs.setProperty("--sun-az", az.toFixed(2));
    if (this._look !== "globe" || !this._views.globe) this._setSunX(50 + 32 * Math.sin(az * DEG));
    const st = sunTimes(this._place.lat, this._place.lon, p);
    const left = st.hours > 0 && st.hours < 24 ? Math.min(1, Math.max(0, (st.set - t) / (st.set - st.rise))) : st.hours ? 1 : 0;
    rs.setProperty("--day-left", (left * 100).toFixed(1) + "%");

    const { age, lit } = moonPhase(t);
    // Neon only on a dark page: the visuals stay ink on paper while the page is light
    const night = root.getAttribute("data-theme") === "light" ? 0 : 1;
    const v = this._views;
    if (v.globe) v.globe.sun = vec;
    const moon = { ...this._sun(t - age * 864e5), age, lit };
    if (v.city) v.city.light = { alt, az, moon, night };
    if (v.map) v.map.light = { alt, az, night };
    if (this._favicon) this._updateFavicon(-Math.max(-8, Math.min(15, alt)) * 0.6, alt < -6, age);
  }

  /** The tab's icon: the sun over the horizon by day, the moon by night, in the page's colours. */
  _updateFavicon(sunY, moonUp, age) {
    clearTimeout(this._favTimer);
    this._favTimer = setTimeout(() => {
      const css = getComputedStyle(document.body), ink = css.color, bg = css.backgroundColor;
      const moon = moonUp ? `<path d="${moonPath(age, 16, 11, 6)}" fill="${ink}"/>` : "";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${bg}"/><clipPath id="c"><rect width="32" height="19"/></clipPath><circle clip-path="url(#c)" cx="16" cy="${(19 + sunY * 1.6).toFixed(1)}" r="6.5" fill="${ink}"/>${moon}<path d="M6 19h20" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></svg>`;
      this._favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
    }, 1500);
  }
}

if (!customElements.get("home-light")) customElements.define("home-light", LuzLight);
