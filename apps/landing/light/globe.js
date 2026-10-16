/**
 * <luz-globe>: a globe of dots lit by the sun. One of the three visuals of
 * the home's <luz-light> (apps/landing/light/light.js loads this file when
 * the globe is the look); it imports nothing and writes no style (the rules
 * are light.css). Light DOM, SVG built with createElementNS.
 *
 *   <luz-globe lat="40.42" lon="-3.7" spin cities twilight glint rim torch></luz-globe>
 *
 * lat, lon   the reader's place: where the globe faces at first
 * spin       slow rotation, only while the globe is on screen and the reader
 *            has not asked for reduced motion
 * cities     city lights on the night side; twilight: the day/night line in
 *            the sun's colour; glint: the sun on the sea; rim: a lit edge;
 *            torch: the dots near the pointer wake up
 * Property `sun`: the sun's unit vector in the Earth's frame, set by the
 * controller. Event luz-globe:sun ({ x }: -1 the sun on the left, 1 on the
 * right), so the page's glow can follow it.
 *
 * Land: Natural Earth 1:50m land polygons (public domain,
 * naturalearthdata.com), rasterised once onto the dot lattice below, one bit
 * per dot, base64. See apps/landing/light/README.md.
 */

// Natural Earth 1:50m land (public domain): one bit per dot of the lattice, row by row from the south pole
const LAND = "/u//////+//////////1//////P//////+H//////x/8/+v/////gP//8P////8B/P8p/v////8A+P9Dw/////8/QP7/CeP//////wHg//+A/f//////H8D//x+A////////PwD4/38A8P///////w8A/P//A4D/////////AAD8b/8HAP7///////8HAAAC/P8AoP////////8PAAAQwLcPAPj/////////DwAAABAADADg////9/////8BAAAAIEAHAID////f/////x8AAAAAAPgAADD+///v/////w8AAAAAAIAGAAAADP7/8f////8BAAAAAACABgAAAAAg/x//////DwAAAAAAAAACAAAAAAD+P/z///8XAAAAAAAAACAAAAAAAAD+H/z///8BAAAAAAAAAIABAAAAAAAAFwD+//o/AAAAAAAAAAAAAwAAAAAAABwAADgDPAAAAAAAAAAAAMAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8AQAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAD4AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAD8AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOABAAAAAAAAAAAAAACAfwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAQAAAAAAAAAAAAAAAH8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAADAHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAMAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAwAAAAAAAAAAAAAAAPAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAADAAAAAAAAAAAAAAAAMD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAADwfwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAgP8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAEAAAAAAAAAAAAAAADg/w8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaAAAADwAAAAAAAAAAAAAAAMD/fwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwPAAAgAAAAAAAAAAAAAAAAAOD/PwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwPAAAAAAAAAAAAAAAAAAAAAMD/PwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOT/AAAAAAAAAAAAAAAAAAAAAADg/w8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD0/wAAgAAAAAAAAAAAAAAAAAAA4P/3AAAAAAAAAAAAOAAAAAAAAAAAAAAAgAcA6P8HAAAAAAAAAAAAAAAAAAAAAAD8/z8AAAAAAAAAAAD/AQAAAAAAAAAAAADgPwDs/wcAAAAAAAAAAAAAAAAAAAAAAPz/PwAAAAAAAAAAAP8HAAAAAAAAAAAAAMD/APz/HwAAAAAAAAAAAAAAAAAAAAAAwP//AwAAAAAAAAAA4P8AAAAAAAAAAAAAAPD/w///BwAAAAAAAAAAAAAAAAAAAAAA8P//AQAAAAAAAAAA8P8BAAAAAAAAAAAAAPD/////DwAAAAAAAAAAAAAAAAAAAAAAwP//DwAAAAAAAAAAwP8fAAAAAAAAAAAAAID//////wEAAAAAAAAAAAAAAAAAAAAAAPj//wMAAAAAAAAAAPj/AwAAAAAAAAAAAADg/////38AAAAAAAAAAAAAAAAAAAAAAAD4//8PAAAAAAAAAADw/x8AAAAAAAAAAAAAgP//////AwAAAAAAAAAAAAAAAAAAAAAAwP//fwAAAAAAAAAAwP//AAAAAAAAAAAAAAD8/////z8AAAAAAAAAAAAAAAAAAAAAAADg//8/AAAAAAAAAADw//8AAAAAAAAAAAAAAPz/////PwAAAAAAAAAAAAAAAAAAAAAAAOD//z8AAAAAAAAAAOD//wEAAAAAAAAAAAAA+P//////AAAAAAAAAAAAAAAAAAAAAAAAAPz//wcAAAAAAAAAAPz/fwAAAAAAAAAAAAAA/P////8/AAAAAAAAAAAAAAAAAAAAAAAAAP///wMAAAAAAAAAAP7/fwAcAAAAAAAAAAAA/v////8fAAAAAAAAAAAAAAAAAAAAAAAAAP7//x8AAAAAAAAAAPj//wfwAAAAAAAAAAAA8P////9/AAAAAAAAAAAAAAAAAAAAAAAAAOD///8HAAAAAAAAAID//38AHwAAAAAAAAAAAP7/////BwAAAAAAAAAAAAAAAAAAAAAAAADw////HwAAAAAAAADA//9/gB8AAAAAAAAAAAD8/////wsAAAAAAAAAAAAAAAAAAAAAAAAA4P///z8AAAAAAAAAwP//fwA/AAAAAAAAAAAA8P////8PAEAAAAAAAAAAAAAAAAAAAAAAAAD/////AwAAAAAAAAD8//8H4AcAAAAAAAAAAAD8/////wAABAAAAAAAAAAAAAAAAAAAAAAA4P////8AAAAAAAAAgP///wDwAQAAAAAAAAAAAPj///8/AAAAAAAAAAAAAAAAAAAAAAAAAADg/////wEAAAAAAACA////A/ADAAAAAAAAAAAAgP///x8AAAAAAAAAAAAAAAAAAAAAAAAAAMD/////AwAAAAAAAAD///8fwA8AAAAAAAAAAAAA/P//fwAAAAAAAAAAAAAAAAAAAAAAAAAAAP7///9/AAAAAAAAAPD///8H/AEAAAAAAAAAAAAA////DwAAQAAGAAAAAAAAAAAAAAAAAAAA4P////8fAAAAAAAAAPz///8DfgAAAAAAAAAAAABA///zAwAAAAACAAAAAAAAAAAAAAAAAAAA+P////8fAAAAAAAAAPz///8P+AAAAAAAAAAAAAAA/P/BBwAAAAAAAAAAAAAAAAAAAAAAAAAA/P////8/AAAAAAAAAPD///8/wAMAAAAAAAAAAAAAcP8BDwAAQAAAAAAAAAAAAAAAAAAAAAAA8P//////AQAAAAAAAID/////AxwAAAAAAAAAAAAAAOYf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////HwAAAAAAAADw////P4ABAAAAAAAAAAAAAAD8AwcAAAAAAAAAAAAAAAAAAAAAAAAAAMD//////w8AAAAAAAAA+P///w+AAAAAAAAAAAAAAAAA/AEDAAAAAAAAAAAAAAAAAAAAAAAAAADw//////8PAAAAAAAAAPj///8PAAAAAAAAAAAAAAAAADAAAQAAAAAAAAAAAAAAAAAAAAAAAAAA8P//////HwAAAAAAAADw////HwAAAAAAAAAAAAAAAAAABAIAAAAAAAAAAAAAAAAAAAAAAAAAAOD///////8AAAAAAAAA4P///z8AAAAAAAAAAAAAAAAAAAAAIAAIAAAAAAAAAAAAAAAAAAAAAAAA////////HwAAAAAAAAD+////AQAAAAAAAAAAAAAAGAYAAMAF4AAAAAAAAAAAAAAAAAAAAAAAAPj///////8BAAAAAAAA4P///x8AAAAAAAAAAAAAAHCGAQA8DAAAAAAAAAAAAAAAAAAAAAAAAAAA////////fwAAAAAAAAD4////BwAAAAAAAAAAAAD4AAAAoI8DgAAAAAAAAAAAAAAAAAAAAAAAAOD///////8fAAAAAAAAAP////8BAAAAAAAAAAAA8B8AAAjwPwAEAAAAAAAAAAAAAAAAAAAAAAAA+P///////w8AAAAAAADA////fwAAAAAAAAAAAAA8AAAAAPh/AAAAAAAAAAAAAAAAAAAAAAAAAAD+////////AwAAAAAAAOD///8/AAAAAAAAAAAAAAMAAAAg/I8HAAAAAAAAAAAAAAAAAAAAAAAAAP7///////8AAAAAAAAA4P///38AAAAAAAAAAACAAwCIAAD/DwgAAAAAAAAAAAAAAAAAAAAAAAAA/v//////fwAAAAAAAADw/////wAAAAAAAAAAAMAHIFAA0P8HAAAAAAAAAAAAAAAAAAAAAAAAAADw//////9/AAAAAAAAAOD/////AwAAAAAAAAAAgA/4sSHn/gMAAAAAAAAAAAAAAAAAAAAAAAAAAPD//////wEAAAAAAAAA4P////8PAAAAAAAAAACAP/jHQQD5AAAAAAAAAAAAAAAAAAAAAAAAAAAAwP//////BwAAAAAAAACA//////8AAAAAAAAAAIC+4B8uCIcAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////98GAAAAAAAAAAD//////wMAAAAAAAAAADzA/0QAXgAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4/////wIAAAAAAAAAAPj/////HwAAAAAAAAAA8AH/IwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOD/////AwAAAAAAAAAA4P//////AAAAAAAAAADgA/6PHwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP7///8fAAAAAAAAAAAA//////8HAAAAAAAAAIAn8H8ACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+P///z8AAAAAAAAAAAD+/////z8AAAAAAAAAoHMA/wEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADA////fwAAAAAAAAAAAPj//////wEAAAAAAAAA5wjwAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID/////AAAAAAAAAAAA8P//////BwAAAAAAAADjQOADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8AAAAAAADAAID///////8PAAAAAAAAgMMBgA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////HwAAAAAAAPD/gP///////x8AAAAAAAAA4AAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8BAAAAAAAA+P/v////////HwAAAAAYAABwAAACDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwP//PwAAAAAAAID///////////8HAAAAAAYAAAIAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID5//8HAAAAAAAA4P///////////wMAAACAAQCAAQAg8AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfPv/PwAAAAAAAAD+////////////AAAAADMAABgIAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABvv8HAAAAAAAAwP///////////x8AAADgAAAAAQEAAQIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+D9DAAAAAAAAAD/////////////AAAAgA8AAAgeABAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgA7gAAAAAAAAAA/v//////////gQcAAAA+AAAg/AEANAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AFAAAAAAAAAAAP///////////wEAAAAAPwAAIPwDABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPgAAAAAAAAAAAAD///////////8HAAAAgD8AALD/AYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8A8AAAAAAAAAAADg///////////fBwAAAPAHAAD+PwCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgP8DAAAAAAAAAAAA/P//////////+QMAAAD+AADg/wcAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAP4fAAAAAAAAAAAQ4P//////////4X8AAAD8AwCA/w8ABAAAAAAAAAAAAAAAAAAAAAAAAAAA4PwAAAAAAAAAAACAgP//////////g/8DAAD4HwAg/x8AGAAAAAAAAAAAAAAAAAAAAAAAAAAA+P8BAAAAAAAAAAAAgP//////////wf8HAAD8HwCw/wcAGAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAAAAAAAAAAAAwP////////9/+P8HAAD/DwD8/wAABwAAAAAAAAAAAAAAAAAAAAAAAAD87w8A8WMAAAAAAAAA/v/////////D//8AAPj/APD/QwAwAAAAAAAAAAAAAACAAAAAAAAAAPg/8AAAHgAAAAAAAADw/////////4f//wcA4P8H4P+PAwAAAAAAAAAAAAAAAIAAAAAAAAAA+B/wAHgAAAAAAAAAAPj/////////w///AwDw/w/w/wcBAAAAAAAAAAAAAAAAYAAAAAAAAAD8B3gADAAAAAAAAAAA/v/////////4//8DAPz/B/7/IwAIAAAAAAAAAAAAAAABAAAAAAAAwH8AACAAAAAAAAAAAPD/////////5///HwDu/z/4/78DAAAAAAAAAAAAAAAAAAAAAAAAAID/AAA5AAAAAAAAAADA/////////4///38A/P//9///PwAAAAAAAAAAAAAAAAAAAAAAAADC/wAAAAAAAAAAAAAA4P/////////h//8PgP///////z8MAAAAAAAAAAAAAAAAAAAAAADA+B8AAAAAAAAAAAAAAPj///////8//v8+APz////////HAAAAAAAAAAAAAAAAAAAAAACA8X8AACAAAAAAAAAAAOD///////8///8wAPz///////+PAAAAAAAAAAAAAAAAAAAAAACA+P8AAAQAAAAAAAAAAOD///////+f/7+Q//////////8fAAAAAAAAAAAAAAAAAAAAAACY/w8AwAAAAAAAAAAAAPz////////8/wP+//////////8AAQAAAAAAAAAAAAAAAAAAAHD+fwAAAwAAAAAAAAAA4P////////n/w////////////wEAAAAAAAAAAAAAAAAAAAAAkP8/AMABAAAAAAAAAADx//////8//3/8//////////9/AAAAAAAAAAAAAAAAAAAAAAD//x8AGAAAAAAAAAAAAPz///////X/4////////////wcAAAAAAAAAAAAAAAAAAAAA+/8/DBgAAAAAAAAAAAD4//////////P///////////8DAAAAAAAAAAAAAAAAAAAAgPz//98PAAAAAAAAAAAA/v////7////+//////////8/AAAAAAAAAAAAAAAAAAAAAOb///9/AAAAAAAAAAAA+P////jn/P//////////////AAIAAAAAAAAAAAAAAAAAAPz/////AAAAAAAAAAAA8P//P3gA/P////////////9fAAEAAAAAAAAAAAAAAAAAwP////8fAAAAAAAAAAAA//9/gAHA//////////////8AHgAAAAAAAAAAAAAAAACA//////8AAAAAAAAAAAD8/x8AAID//////////////wC0AAAAAAAAAAAAAAAAAPj/////fwAAAAAAAAAAAP//AQAA+P////////////8DwQ4AAAAAAAAAAAAAAADg//////8DAAAAAAAAAAC8/w8ABuT/////////////Bxz/AAAAAAAAAAAAAAAA+P//////AgAAAAAAAAAAwP8BAAD8/////////////8ABDwAAAAAAAAAAAAAAgP//////HwAAAAAAAAAAPPCfgHjv/8f//////////4MDHgAAAAAAAAAAAAAA4P//////DwAAAAAAAADAPwA4sP//f/D/////////T3AAAwAAAAAAAAAAAAAA/v////+/AAAAAAAAAAD+AwAA+///g/////////8f8AAYAAAAAAAAAAAAAAD+/////z8AAAAAAAAAgP8AAHH8///g/////////08MAAMAAAAAAAAAAAAA4P//////HwAAAAAAAAD4DxCo5///h/////////9/fgAMAAAAAAAAAAAAAOD//////y8AAAAAAAAA/AcM58n//8H/////////3x+AAAAAAAAAAAAAAAD8//////8PAAAAAAAAwP9AHP/w4I/+/////////38AAAAAAAAAAAAAAAD+//////8HAAAAAAAA8H/Q4R8A/OD//////////x+AAAAAAAAAAAAAAOD//////z8AAAAAAADA/wHn/wD44////////////8EHAAAAAAAAAAAA8P//////PwMAAAAAAAD4Z/w/gH/8//////////8/eAAAAAAAAAAAAAD///////83AAAAAAAA4P/5/5D/+P//////////fwABAAAAAAAAAADA////////HwAAAAAAAPy//4/5D/7//////////wcAAAAAAAAAAAAA/v//////LwAAAAAAAPz//7/zP/7//////////wMAAAAAAAAAAACg////////AAIAAAAA4P//////////////////HwEAAAAAAAAAAID+///////gBwAAAAD4//////////////////8PAAAAAAAAAAAA/P//////Dg4AAAAAAP//////////////////TwAAAAAAAAAAAPL//////xEKAAAAAAD//////////////////wkAAAAAAAAAAOj///////8JAAAAADD8/////////////////wUAAAAAAAAAAP7///////8CAAAAAHz/////////////////LwABAAAAAAAA/P///z///wEAAABgPv////////////////8FIAAAAAAAAID/////9/8fAAAAAPf5////////////////C2AAAAAAAAD0//////z/BwAAAOAM/v//////////////WwAHAAAAAACA//////P/DwAAAIAZEPb/////////////AYADAAAAAAD4////H/4/AAAAAGAAAP////////////8BAA8AAIAAAPz///8D/A8AAAAAMGDD/////////////wDwAQAAAADg////B/A/AAAAADBAxv///////////38AeAAAACwA+v//PwD+AwAAAAAHcPH///////////8D4AEAABgA/f//H4DfAQAAAIDAHv3//////////z8ADAAA8AH4//9/AHwEAAAAAIB/+P//////////f0AMAEB/w////wfAAwAAAAAA/AP+//////////9/eAAA/Pf///8PwAcABgAAAP74////////////nz4A+P////8/AIcAHgAAAP74////////////px8A/P////8PGgTgAQAA4M//////////////fwD4/////0fEAnwAAAD4/f////////////8PgP////8/lQ/4ATgA8PP3////////////Gf//////mz/gB+ADgM+v//////////9/Pf//////Bi/4A3QA4Pv4////////////9P////8HN/wPAgDwv/3//v//////f4P////7f/DwPwAAwP/D//3//////3/w//+H6eYH/wMAAP5P/u///////z/g//9v1OQB/g8AAP8BvP3//////wH/h+RD3AH/HwCAPwBk/////38dgA8QeMQf+H8AAHAAwP7///8fIEAAwIf8Af8XAAAACO////sHAAAA+Gd+gP8HAAAAwfb/PywAAADg0TeA/wcAAIAg/v8HAAAAABy9BvxfAAAAAuhvAAEAAAABAMD/BwAAEMD/AAAAAAAke+D/AQAADPAPsAAAAHSL4P8BAAAM8AMGAAAAQ8//DwAAIIABAAAAgIDw/wAKAAACAAAAgN7/PwAAACAAAAAA8vk/IAAAAQAAAIDv/wBBgAEAAAD4/geAAgIAAAB4/wEAAAAAAPA8AAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
// Cities lit on the night side: latitude, longitude
const CITIES = [40.42, -3.7, 28.1, -15.4, 38.72, -9.14, 51.5, -0.12, 53.35, -6.26, 48.86, 2.35, 50.85, 4.35, 52.37, 4.9, 52.52, 13.4, 47.38, 8.54, 48.21, 16.37, 41.9, 12.5, 50.08, 14.44, 52.23, 21.01, 55.68, 12.57, 59.91, 10.75, 59.33, 18.07, 60.17, 24.94, 37.98, 23.73, 41.01, 28.98, 50.45, 30.52, 55.76, 37.62, 33.57, -7.59, 36.75, 3.06, 30.04, 31.24, 6.52, 3.38, -1.29, 36.82, -26.2, 28.05, 40.71, -74.01, 43.65, -79.38, 41.88, -87.63, 39.74, -104.99, 33.45, -112.07, 34.05, -118.24, 49.28, -123.12, 19.43, -99.13, 4.71, -74.07, -12.05, -77.04, -33.45, -70.67, 10.48, -66.9, -34.6, -58.38, -23.55, -46.63, -34.9, -56.16, 23.11, -82.37, 31.77, 35.21, 24.71, 46.68, 25.2, 55.27, 35.69, 51.39, 24.86, 67.01, 19.08, 72.88, 23.81, 90.41, 13.76, 100.5, -6.21, 106.85, 1.35, 103.82, 14.6, 120.98, 22.32, 114.17, 31.23, 121.47, 25.03, 121.57, 37.57, 126.98, 35.68, 139.69, -31.95, 115.86, -37.81, 144.96, -33.87, 151.21, -27.47, 153.03, -36.85, 174.76, 21.31, -157.86, 41.39, 2.17, 39.47, -0.38, 37.39, -5.99, 43.26, -2.93, 41.15, -8.61, 43.3, 5.37, 45.76, 4.84, 45.46, 9.19, 40.85, 14.27, 48.14, 11.58, 53.55, 9.99, 50.11, 8.68, 55.95, -3.19, 53.48, -2.24, 64.15, -21.94, 59.93, 30.34, 56.84, 60.6, 43.12, 131.89, 31.63, -7.99, 36.8, 10.18, 32.9, 13.18, 5.6, -0.19, 14.69, -17.44, 9.03, 38.74, -4.32, 15.31, -8.84, 13.23, -33.93, 18.42, -6.79, 39.28, 15.5, 32.56, 32.08, 34.78, 33.31, 44.37, 28.61, 77.21, 12.97, 77.59, 22.57, 88.36, 31.55, 74.34, 34.53, 69.17, 41.3, 69.24, 43.24, 76.89, 55.03, 82.92, 39.9, 116.4, 30.57, 104.07, 30.59, 114.3, 23.13, 113.26, 34.69, 135.5, 43.06, 141.35, 10.82, 106.63, 21.03, 105.85, 3.14, 101.69, -7.26, 112.75, -34.93, 138.6, -12.46, 130.84, -22.91, -43.17, -15.79, -47.88, -12.97, -38.5, -8.05, -34.9, -0.18, -78.47, -16.5, -68.15, 20.66, -103.35, 25.69, -100.32, 25.76, -80.19, 33.75, -84.39, 29.76, -95.37, 32.78, -96.8, 47.61, -122.33, 37.77, -122.42, 42.36, -71.06, 38.9, -77.04, 42.33, -83.05, 44.98, -93.27, 45.5, -73.57, 51.05, -114.07, 61.22, -149.9];

const D = 0.8, ROWS = Math.round(180 / D), DEG = Math.PI / 180;
const VB = 600, CX = 300, CY = 300, R = 272;
// eslint-disable-next-line no-restricted-syntax -- RL-12: the SVG namespace name, an identifier that is never fetched
const SVG = "http://www.w3.org/2000/svg";
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const q = (v) => Math.round(v * 10) / 10;
const el = (tag, attrs, parent) => {
  const n = document.createElementNS(SVG, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.append(n);
  return n;
};
const vec = (lat, lon) => [Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG)];

/* The lattice, built once, the first time a globe has a size */
let lattice = null;
function getLattice() {
  if (lattice) return lattice;
  const s = window.atob(LAND), bits = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bits[i] = s.charCodeAt(i);
  let N = 0;
  const rowLen = new Uint16Array(ROWS), rowStart = new Uint32Array(ROWS);
  for (let i = 0; i < ROWS; i++) {
    rowLen[i] = Math.max(1, Math.round((Math.cos((-90 + D / 2 + i * D) * DEG) * 360) / D));
    rowStart[i] = N;
    N += rowLen[i];
  }
  const X = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N);
  const kindFull = new Uint8Array(N), kindLite = new Uint8Array(N);
  for (let i = 0, k = 0; i < ROWS; i++) {
    const lat = -90 + D / 2 + i * D, m = rowLen[i], off = (i % 2) * 0.5;
    for (let j = 0; j < m; j++, k++) {
      [X[k], Y[k], Z[k]] = vec(lat, -180 + ((j + off) * 360) / m);
      const land = (bits[k >> 3] >> (k & 7)) & 1;
      const e2 = i % 2 === 0 && j % 2 === 0, e4 = i % 4 === 0 && j % 4 === 0;
      kindFull[k] = land ? 2 : e2 ? 1 : 0;
      kindLite[k] = land ? (e2 ? 2 : 0) : e4 ? 1 : 0;
    }
  }
  const n = CITIES.length / 2, city = { n, x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n) };
  for (let i = 0; i < n; i++) [city.x[i], city.y[i], city.z[i]] = vec(CITIES[2 * i], CITIES[2 * i + 1]);
  return (lattice = { N, X, Y, Z, kindFull, kindLite, rowLen, rowStart, bits, city });
}

let count = 0;

class LuzGlobe extends HTMLElement {
  constructor() {
    super();
    this._raf = 0;
    this._last = 0;
    this._yaw = this._pitch = this._vyaw = this._vpitch = 0;
    this._dragging = false;
    this._torch = { x: 0, y: 0, on: false };
    this._sun = [0, 0, 1];
    this._sunX = NaN;
    this._seen = false;
  }

  get sun() {
    return this._sun.slice();
  }

  set sun(v) {
    if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite)) return;
    this._sun = v.slice();
    this._shadeAll();
  }

  connectedCallback() {
    if (!this._svg) this._build();
    this._read();
    this._ro = new ResizeObserver(() => this._setLod());
    this._ro.observe(this);
    this._io = new IntersectionObserver(([entry]) => {
      this._seen = entry.isIntersecting;
      this._request();
    });
    this._io.observe(this);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._ro.disconnect();
    this._io.disconnect();
  }

  _read() {
    const has = (a) => this.hasAttribute(a);
    this._opts = { cities: has("cities"), twilight: has("twilight"), glint: has("glint"), rim: has("rim"), torch: has("torch"), spin: has("spin") };
    const lat = parseFloat(this.getAttribute("lat")), lon = parseFloat(this.getAttribute("lon"));
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      this._yaw = -lon * DEG;
      this._pitch = Math.max(-50, Math.min(50, lat * 0.35)) * DEG;
    }
    this._cityG.style.display = this._opts.cities ? "" : "none";
    this._glint.style.display = this._opts.glint ? "" : "none";
    this._rimLight.style.display = this._opts.rim ? "" : "none";
  }

  /* ---- DOM ---- */
  _build() {
    this._reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    this._reduced.addEventListener("change", () => this._request());
    // An image the arrows turn: its name is the aria-label the page gives it
    if (!this.hasAttribute("role")) this.setAttribute("role", "img");
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    const id = "luz-globe-" + ++count;
    const halo = document.createElement("div");
    halo.className = "luz-globe__halo";
    this.append(halo);
    const svg = (this._svg = el("svg", { viewBox: `0 0 ${VB} ${VB}`, "aria-hidden": "true" }, this));
    const defs = el("defs", {}, svg);
    // In style, not in attributes: a presentation attribute takes no var()
    const stops = (grad, list) => list.forEach(([offset, color, opacity]) => el("stop", { offset, style: `stop-color:${color};stop-opacity:${opacity}` }, grad));
    const userSpace = { gradientUnits: "userSpaceOnUse", cx: CX, cy: CY, r: 330 };
    this._gSun = el("radialGradient", { id: id + "-sun", ...userSpace }, defs);
    stops(this._gSun, [[0, "var(--_sun)", 0.7], [0.55, "var(--_sun)", 0.18], [1, "var(--_sun)", 0]]);
    this._gShade = el("radialGradient", { id: id + "-shade", ...userSpace }, defs);
    stops(this._gShade, [[0, "var(--_shade)", "var(--_shade-opacity)"], [1, "var(--_shade)", 0]]);
    stops(el("radialGradient", { id: id + "-glint" }, defs), [[0, "var(--_glint)", 0.95], [0.35, "var(--_sun)", 0.6], [1, "var(--_sun)", 0]]);
    this._gRim = el("linearGradient", { id: id + "-rim", gradientUnits: "userSpaceOnUse", x1: CX, y1: 28, x2: CX, y2: 572 }, defs);
    stops(this._gRim, [[0, "var(--_sun)", 0.9], [0.45, "var(--_sun)", 0]]);
    el("circle", { cx: CX, cy: CY, r: R }, el("clipPath", { id: id + "-disc" }, defs));
    const disc = () => el("g", { "clip-path": `url(#${id}-disc)` }, svg);
    const whole = { cx: CX, cy: CY, r: R };

    el("circle", { class: "luz-globe__sea", ...whole }, svg);
    this._sunlight = el("circle", { ...whole, fill: `url(#${id}-sun)` }, disc());
    const dots = el("g", { class: "luz-globe__dots" }, svg);
    // Fourteen widths and opacities: six of sunlight on land, the same six near the edge, two of sea, two of twilight
    this._buckets = [];
    for (let b = 0; b < 6; b++) this._buckets.push({ w: 1.25 + 0.4 * b, o: 0.5 + 0.1 * b });
    for (let b = 0; b < 6; b++) this._buckets.push({ w: (1.25 + 0.4 * b) * 0.7, o: 0.5 + 0.1 * b });
    this._buckets.push({ w: 1.1, o: 0.34, cls: "luz-globe__ocean" }, { w: 0.85, o: 0.22, cls: "luz-globe__ocean" });
    this._buckets.push({ w: 2.45, o: 0.95, cls: "luz-globe__twilight" }, { w: 1.1, o: 0.6, cls: "luz-globe__twilight" });
    this._paths = this._buckets.map(({ o, cls }) => el("path", cls ? { "stroke-opacity": o, class: cls } : { "stroke-opacity": o }, dots));
    this._glint = el("circle", { class: "luz-globe__glint", r: 24, fill: `url(#${id}-glint)`, opacity: 0 }, disc());
    this._nightshade = el("circle", { class: "luz-globe__night", ...whole, fill: `url(#${id}-shade)` }, disc());
    this._cityG = el("g", {}, svg);
    this._cityGlow = el("path", { class: "luz-globe__cities", "stroke-opacity": 0.28 }, this._cityG);
    this._cityCore = el("path", { class: "luz-globe__cities", "stroke-opacity": 0.95 }, this._cityG);
    el("circle", { class: "luz-globe__rim", ...whole }, svg);
    this._rimLight = el("circle", { class: "luz-globe__rim-light", ...whole, stroke: `url(#${id}-rim)` }, svg);
    this._bindPointer();
    this._bindKeyboard();
  }

  /** On the first size: the lattice; on every size: the level of detail. */
  _setLod() {
    const w = this.clientWidth;
    if (!w) return;
    if (!this._L) {
      this._L = getLattice();
      this._shade = new Uint8Array(this._L.N);
      this._twilight = new Uint8Array(this._L.N);
    }
    const lite = w < 420, lod = lite ? 1.9 : 1;
    this._kinds = lite ? this._L.kindLite : this._L.kindFull;
    this._cut = ((this.clientHeight || w) / w) * VB + 12;
    this._buckets.forEach(({ w: width }, i) => this._paths[i].setAttribute("stroke-width", (width * lod).toFixed(2)));
    this._cityGlow.setAttribute("stroke-width", (6 * lod).toFixed(2));
    this._cityCore.setAttribute("stroke-width", (2.2 * lod).toFixed(2));
    this._shadeAll();
  }

  /* ---- light ---- */
  _shadeAll() {
    const L = this._L;
    if (!L) return;
    const sun = this._sun, { X, Y, Z, N } = L, shade = this._shade, tw = this._twilight;
    for (let k = 0; k < N; k++) {
      const l = X[k] * sun[0] + Y[k] * sun[1] + Z[k] * sun[2];
      shade[k] = Math.round(clamp01((l + 0.1) / 0.6) * 5);
      tw[k] = l > -0.08 && l < 0.08 ? 1 : 0;
    }
    // Is the sun's reflection on land? Then it is dimmer
    const slat = Math.asin(sun[1]) / DEG, slon = Math.atan2(sun[0], sun[2]) / DEG;
    const i = Math.max(0, Math.min(ROWS - 1, Math.round((slat + 90 - D / 2) / D)));
    const m = L.rowLen[i], j = ((Math.round(((slon + 180) / 360) * m - (i % 2) * 0.5) % m) + m) % m, kk = L.rowStart[i] + j;
    this._glintOnLand = ((L.bits[kk >> 3] >> (kk & 7)) & 1) === 1;
    this._dirty = true;
    // A still globe draws now, with no animation frame (reduced motion asks for none)
    if (this._raf) return;
    this._draw();
  }

  /* ---- draw ---- */
  _draw() {
    if (!this._L || this.hidden) return;
    const { X, Y, Z, N, city } = this._L, kinds = this._kinds, shade = this._shade, tw = this._twilight, sun = this._sun, opts = this._opts, cut = this._cut;
    const cy = Math.cos(this._yaw), sy = Math.sin(this._yaw), cp = Math.cos(this._pitch), sp = Math.sin(this._pitch);
    const buf = this._buckets.map(() => "");
    const torchOn = opts.torch && this._torch.on, tx = this._torch.x, ty = this._torch.y;
    for (let k = 0; k < N; k++) {
      const kind = kinds[k];
      if (!kind) continue;
      const x = X[k], y = Y[k], z = Z[k];
      const x1 = x * cy + z * sy, z1 = z * cy - x * sy, z2 = y * sp + z1 * cp;
      if (z2 <= 0.015) continue;
      const sy2 = CY - R * (y * cp - z1 * sp);
      if (sy2 > cut) continue;
      const sx2 = CX + R * x1;
      let b;
      if (opts.twilight && tw[k]) b = kind === 2 ? 14 : 15;
      else {
        let sh = shade[k];
        if (torchOn) {
          const dx = sx2 - tx, dy = sy2 - ty, d2 = dx * dx + dy * dy;
          if (d2 < 4900) sh = Math.min(5, sh + (d2 < 1225 ? 3 : 2));
        }
        b = kind === 2 ? sh + (z2 < 0.32 ? 6 : 0) : sh > 2 ? 12 : 13;
      }
      buf[b] += "M" + q(sx2) + " " + q(sy2) + "h.1";
    }
    buf.forEach((d, b) => this._paths[b].setAttribute("d", d));

    // The sun in view space
    const sx1 = sun[0] * cy + sun[2] * sy, sz1 = sun[2] * cy - sun[0] * sy;
    const sz2 = sun[1] * sp + sz1 * cp, sy2 = sun[1] * cp - sz1 * sp;
    this._gSun.setAttribute("cx", q(CX + R * sx1 * 1.1));
    this._gSun.setAttribute("cy", q(CY - R * sy2 * 1.1));
    this._sunlight.setAttribute("opacity", clamp01((sz2 + 0.35) / 0.7).toFixed(2));
    this._gShade.setAttribute("cx", q(CX - R * sx1 * 1.1));
    this._gShade.setAttribute("cy", q(CY + R * sy2 * 1.1));
    this._nightshade.setAttribute("opacity", clamp01((-sz2 + 0.35) / 0.7).toFixed(2));
    if (Number.isNaN(this._sunX) || Math.abs(sx1 - this._sunX) > 0.015) {
      this._sunX = sx1;
      this.dispatchEvent(new CustomEvent("luz-globe:sun", { bubbles: true, detail: { x: sx1 } }));
    }
    if (opts.glint) {
      this._glint.setAttribute("transform", `translate(${q(CX + R * sx1)} ${q(CY - R * sy2)})`);
      this._glint.setAttribute("opacity", (clamp01((sz2 - 0.2) / 0.6) * (this._glintOnLand ? 0.3 : 1)).toFixed(2));
    }
    if (opts.rim) {
      const sl = Math.hypot(sx1, sy2) || 1, ux = sx1 / sl, uy = sy2 / sl;
      this._gRim.setAttribute("x1", q(CX + R * ux));
      this._gRim.setAttribute("y1", q(CY - R * uy));
      this._gRim.setAttribute("x2", q(CX - R * ux));
      this._gRim.setAttribute("y2", q(CY + R * uy));
      this._rimLight.setAttribute("opacity", (0.35 + 0.65 * clamp01(-sz2)).toFixed(2));
    }
    if (opts.cities) {
      let d = "";
      for (let i = 0; i < city.n; i++) {
        const x = city.x[i], y = city.y[i], z = city.z[i];
        if (x * sun[0] + y * sun[1] + z * sun[2] > -0.08) continue;
        const x1 = x * cy + z * sy, z1 = z * cy - x * sy;
        if (y * sp + z1 * cp <= 0.05) continue;
        const py = CY - R * (y * cp - z1 * sp);
        if (py <= cut) d += "M" + q(CX + R * x1) + " " + q(py) + "h.1";
      }
      this._cityCore.setAttribute("d", d);
      this._cityGlow.setAttribute("d", d);
    }
    this._dirty = false;
  }

  /* ---- motion: a frame only while something moves ---- */
  _spinning() {
    return this._opts.spin && this._seen && !this.hidden && !this._reduced.matches && !document.hidden;
  }

  _moving() {
    return this._dragging || Math.abs(this._vyaw) > 2e-6 || Math.abs(this._vpitch) > 2e-6 || this._spinning();
  }

  _request() {
    if (!this._raf && (this._dirty || this._moving())) {
      this._last = 0;
      this._raf = requestAnimationFrame((t) => this._frame(t));
    }
  }

  _frame(t) {
    this._raf = 0;
    const dt = Math.min(48, this._last ? t - this._last : 16);
    this._last = t;
    if (!this._dragging) {
      if (Math.abs(this._vyaw) > 2e-6 || Math.abs(this._vpitch) > 2e-6) {
        this._yaw += this._vyaw * dt;
        this._pitch += this._vpitch * dt;
        this._vyaw *= 0.94;
        this._vpitch *= 0.94;
        this._dirty = true;
      } else if (this._spinning()) {
        this._yaw += ((1.6 * DEG) / 1000) * dt;
        this._dirty = true;
      }
    }
    this._pitch = Math.max(-75 * DEG, Math.min(75 * DEG, this._pitch));
    if (this._dirty) this._draw();
    if (this._moving()) this._raf = requestAnimationFrame((next) => this._frame(next));
  }

  _changed() {
    this._dirty = true;
    this._request();
  }

  /* ---- pointer and keyboard ---- */
  _bindPointer() {
    let px = 0, py = 0, pt = 0;
    const perPx = () => VB / (this.clientWidth || VB) / R;
    this.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      this._dragging = true;
      this._vyaw = this._vpitch = 0;
      px = e.clientX;
      py = e.clientY;
      pt = e.timeStamp;
      this.setPointerCapture(e.pointerId);
      this.setAttribute("dragging", "");
      this._request();
    });
    this.addEventListener("pointermove", (e) => {
      if (this._opts.torch && (e.pointerType === "mouse" || this._dragging)) {
        const r = this.getBoundingClientRect();
        this._torch = { x: ((e.clientX - r.left) / r.width) * VB, y: ((e.clientY - r.top) / r.width) * VB, on: true };
        this._changed();
      }
      if (!this._dragging) return;
      const k = perPx(), dx = e.clientX - px, dy = e.clientY - py, dt = Math.max(1, e.timeStamp - pt);
      this._yaw += dx * k;
      this._pitch += dy * k;
      this._vyaw = (dx * k) / dt;
      this._vpitch = (dy * k) / dt;
      px = e.clientX;
      py = e.clientY;
      pt = e.timeStamp;
      this._changed();
    });
    this.addEventListener("pointerleave", () => {
      this._torch.on = false;
      this._changed();
    });
    const release = (e) => {
      if (!this._dragging) return;
      this._dragging = false;
      this.removeAttribute("dragging");
      // Under reduced motion a throw does not keep turning
      if (e.timeStamp - pt > 80 || this._reduced.matches) this._vyaw = this._vpitch = 0;
      if (e.pointerType !== "mouse") this._torch.on = false;
      this._changed();
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) this.addEventListener(type, release);
  }

  _bindKeyboard() {
    this.addEventListener("keydown", (e) => {
      const step = 8 * DEG;
      const turn = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!turn) return;
      this._yaw += turn[0];
      this._pitch += turn[1];
      this._vyaw = this._vpitch = 0;
      this._changed();
      // eslint-disable-next-line no-restricted-syntax -- RL-3: the arrows turn the focused globe; without this the page would scroll as well
      e.preventDefault();
    });
  }
}

if (!customElements.get("luz-globe")) customElements.define("luz-globe", LuzGlobe);
