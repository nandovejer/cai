/**
 * <luz-map>: a city map grown street by street: highways, bright arteries,
 * thousands of short streets that stop where they meet, a coast with piers,
 * a lake or two; periodic sideways, so it tiles for any width. One of the
 * three visuals of the home's <luz-light> (light.js loads this file when the
 * map is the look); it imports nothing and writes no style (the rules are
 * light.css). Ink on paper by day; as the sun goes down it lights up into
 * neon, with light flowing along the highways (CSS, stopped under reduced
 * motion).
 *
 *   <luz-map seed="3" puzzle></luz-map>
 *
 * Property `light` = { alt, az, night } in degrees, set by the controller.
 * Attribute `puzzle`: every street carries a jigsaw tab now and then, sized
 * to its class. The map grows once, in idle time, the first time it has a
 * size.
 */

// eslint-disable-next-line no-restricted-syntax -- RL-12: the SVG namespace name, an identifier that is never fetched
const SVG = "http://www.w3.org/2000/svg", DEG = Math.PI / 180, W = 1200, H = 675;
const el = (tag, attrs, parent) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.append(n); return n; };
// In style, not in attributes: a presentation attribute takes no var()
const stops = (grad, list) => list.forEach(([offset, color, opacity]) => el("stop", { offset, style: `stop-color:${color};stop-opacity:${opacity}` }, grad));
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const q = (v) => Math.round(v * 10) / 10;
// a jigsaw tab, head radius 1, along x with y pointing out of the piece: a dip, a neck, a round head, the other neck, a dip
const TAB = (() => {
  const pts = [[-1.25, 0], [-0.8, -0.1], [-0.5, 0.2], [-0.5, 0.6]];
  const cx = 0, cy = 1.35, r = 0.85, a0 = Math.atan2(0.6 - cy, -0.5 - cx), a1 = Math.atan2(0.6 - cy, 0.5 - cx) - Math.PI * 2;
  for (let i = 1; i < 10; i++) { const a = a0 + (a1 - a0) * i / 10; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  pts.push([0.5, 0.6], [0.5, 0.2], [0.8, -0.1], [1.25, 0]);
  return pts;
})();


// ---- the city grower: segments that grow, branch, and stop where they meet another one.
//      The city is periodic in x: whatever leaves on the right comes back on the left, so the map tiles for any width.
const CELL = 24, CW = W / CELL, TAU = Math.PI * 2;
const wrapX = (x) => ((x % W) + W) % W;
const dxW = (a, b) => { const d = (a - b) % W; return d > W / 2 ? d - W : d < -W / 2 ? d + W : d; }; // shortest signed distance in x
function grow(seed) {
  const rnd = mulberry(seed);
  // the coast: water on top, a bay, piers of reclaimed land, a lake or two
  const bayX = rnd() * W, bayW = 110 + rnd() * 170, bayD = 50 + rnd() * 80, ph = rnd() * TAU, ph2 = rnd() * TAU;
  const coastLow = (x) => 130 + 30 * Math.sin(TAU * 2 * x / W + ph) + Math.exp(-Math.pow(dxW(x, bayX) / bayW, 2)) * bayD; // the shape of the coast
  const coastY = (x) => coastLow(x) + 14 * Math.sin(TAU * 7 * x / W + ph2) + 6 * Math.sin(TAU * 19 * x / W); // and its detail
  const piers = [];
  for (let k = 0; k < 5; k++) { const x = rnd() * W, w = 16 + rnd() * 30, h = 30 + rnd() * 70; piers.push({ x: x - w / 2, y: coastY(x) - h + 8, w, h }); }
  const lakes = [];
  for (let k = 0; k < 2; k++) lakes.push({ x: rnd() * W, y: 270 + rnd() * (H - 330), rx: 30 + rnd() * 32, ry: 20 + rnd() * 22, ph: rnd() * TAU });
  const inPier = (x, y) => { for (const p of piers) { const dx = dxW(x, p.x + p.w / 2); if (Math.abs(dx) <= p.w / 2 && y >= p.y && y <= p.y + p.h) return true; } return false; };
  const inLake = (x, y) => { for (const l of lakes) { const dx = dxW(x, l.x) / (l.rx * 1.25), dy = (y - l.y) / (l.ry * 1.25); if (dx * dx + dy * dy < 1) return true; } return false; };
  const inLand = (x, y) => y > -20 && y < H + 20 && !inLake(x, y) && (y > coastY(x) || inPier(x, y));
  // density: a centre, a few voids (parks, yards, the old town), thinner towards the bottom
  const cx = rnd() * W, cy = 300 + rnd() * 200;
  const voids = [];
  for (let k = 0; k < 4; k++) voids.push({ x: rnd() * W, y: 230 + rnd() * (H - 280), r: 40 + rnd() * 50 });
  const dens = (x, y) => {
    let d = 0.3 + 0.75 * Math.exp(-(dxW(x, cx) ** 2 + (y - cy) ** 2) / (2 * 420 * 420)) + 0.12 * Math.sin(TAU * 13 * x / W + y / 70);
    for (const v of voids) { const r2 = (dxW(x, v.x) ** 2 + (y - v.y) ** 2) / (v.r * v.r); if (r2 < 1) d *= 0.12 + 0.6 * r2; }
    return Math.max(0.05, Math.min(1, d));
  };

  const segs = [], cells = new Map();
  const cellsOf = (x1, y1, x2, y2, fn) => {
    const a = Math.floor(Math.min(x1, x2) / CELL) - 1, b = Math.floor(Math.max(x1, x2) / CELL) + 1;
    const c = Math.floor(Math.min(y1, y2) / CELL) - 1, d = Math.floor(Math.max(y1, y2) / CELL) + 1;
    for (let i = a; i <= b; i++) for (let j = c; j <= d; j++) fn((((i % CW) + CW) % CW) * 4096 + j);
  };
  const add = (s) => { const i = segs.push(s) - 1; cellsOf(s.x1, s.y1, s.x2, s.y2, (k) => { let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(i); }); return i; };
  const nearby = (x1, y1, x2, y2) => { const out = new Set(); cellsOf(x1, y1, x2, y2, (k) => { const a = cells.get(k); if (a) for (const i of a) out.add(i); }); return out; };
  const shifted = (s, x) => { const o = Math.round((x - s.x1) / W) * W; return o ? { x1: s.x1 + o, y1: s.y1, x2: s.x2 + o, y2: s.y2, k: s.k, b: s.b } : s; }; // the copy of s in the frame of x
  const distPS = (px, py, s) => { // point to segment
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / l2));
    const qx = s.x1 + dx * t, qy = s.y1 + dy * t; return [Math.hypot(px - qx, py - qy), qx, qy];
  };
  // kind: 0 highway, 1 artery, 2 street, 3 lane
  const P = [
    { len: 24, drift: 0.03, branch: 0, sep: 60, snap: 0, max: 400 },
    { len: 18, drift: 0.08, branch: 0.06, sep: 24, snap: 9, max: 900 },
    { len: 11, drift: 0.1, branch: 0.2, sep: 10, snap: 6, max: 5000 },
    { len: 7.5, drift: 0.12, branch: 0.28, sep: 5.4, snap: 4, max: 9000 },
  ];
  let branches = 0;
  const step = (g, p, closeTo) => { // returns the continuation(s), or nothing when the segment ends
    const { x, y, dir, k } = g;
    let nx = x + Math.cos(dir) * p.len, ny = y + Math.sin(dir) * p.len;
    if (closeTo) { nx = closeTo[0]; ny = closeTo[1]; }
    if (!inLand(nx, ny)) { if (k === 0 && inLand(x, y)) { const sx = x + Math.cos(dir) * 60, sy = y + Math.sin(dir) * 60; if (inLand(sx, sy)) return [{ ...g, x: wrapX(sx), y: sy, steps: g.steps + 1 }]; } return null; } // a highway bridges a lake or an inlet
    const near = nearby(x, y, nx, ny);
    let bestT = 1, ended = false;
    for (const i of near) { // the first segment this one would cross: stop there, a junction
      const s = shifted(segs[i], x);
      if (k === 0 && s.k === 0) continue; // highways cross each other: interchanges
      const rx = s.x2 - s.x1, ry = s.y2 - s.y1, dx = nx - x, dy = ny - y, den = dx * ry - dy * rx;
      if (Math.abs(den) < 1e-6) continue;
      const t = ((s.x1 - x) * ry - (s.y1 - y) * rx) / den, u = ((s.x1 - x) * dy - (s.y1 - y) * dx) / den;
      if (t > 0.03 && t < bestT && u >= 0 && u <= 1) { bestT = t; ended = true; }
    }
    if (ended) { nx = x + (nx - x) * bestT; ny = y + (ny - y) * bestT; }
    else if (p.snap && !closeTo) { // close to an existing street: join it
      let best = p.snap, bx = 0, by = 0, hit = false;
      for (const i of near) { const s = shifted(segs[i], x); if (s.b === g.b) continue; const [d, qx, qy] = distPS(nx, ny, s); if (d < best) { best = d; bx = qx; by = qy; hit = true; } }
      if (hit) { nx = bx; ny = by; ended = true; }
    }
    if (!ended && !closeTo) { // too close and parallel to another street: there is no room for this one
      for (const i of near) {
        const s = shifted(segs[i], x); if (s.k > k || s.b === g.b) continue;
        const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1); let da = Math.abs(((a - dir) % Math.PI + Math.PI) % Math.PI); da = Math.min(da, Math.PI - da);
        if (da < 0.5 && distPS((x + nx) / 2, (y + ny) / 2, s)[0] < p.sep) return null;
      }
    }
    if (Math.hypot(nx - x, ny - y) < 1) return null;
    add({ x1: x, y1: y, x2: nx, y2: ny, k, id: g.id, b: g.b });
    if (ended || closeTo || g.steps > g.life) return null;
    const out = [];
    const pr = k === 0 ? 1 : dens(nx, ny);
    if (k === 0 || rnd() < 0.78 + pr * 0.22) out.push({ ...g, x: wrapX(nx), y: ny, dir: dir + (rnd() - 0.5) * p.drift + (g.bend || 0), steps: g.steps + 1 });
    if (p.branch && rnd() < p.branch * (0.3 + pr)) out.push({ x: wrapX(nx), y: ny, dir: dir + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2 + (rnd() - 0.5) * 0.12, k, steps: 0, life: g.life, id: g.id, b: ++branches });
    return out;
  };
  const run = (seeds, k) => {
    const p = P[k]; let queue = seeds, n = 0, head = 0;
    while (head < queue.length && n < p.max) {
      const g = queue[head++]; if (!inLand(g.x, g.y)) continue;
      const out = step(g, p); if (!out) continue; n++;
      for (const o of out) queue.push(o);
      if (head > 2048) { queue = queue.slice(head); head = 0; }
    }
  };
  // highways: two rings around the world (one along the coast, one inland), periodic in x so they close exactly at the seam,
  // and two that come up from the south to the sea
  const y1 = Math.max(coastY(0) + 260, 400 + rnd() * 160), ph3 = rnd() * TAU, ph4 = rnd() * TAU;
  const rings = [
    (x) => coastLow(x + 40) + 100 + 10 * Math.sin(TAU * 3 * x / W + ph3),
    (x) => y1 + 26 * Math.sin(TAU * 2 * x / W + ph4) + 9 * Math.sin(TAU * 5 * x / W + ph3),
  ];
  rings.forEach((f, ri) => { const b = ++branches; for (let x = 0; x < W; x += 24) { const x2 = Math.min(W, x + 24); add({ x1: x, y1: f(x), x2, y2: f(x2), k: 0, id: ri, b }); } });
  const ns = [];
  for (let i = 0; i < 2; i++) ns.push({ x: wrapX(i * W / 2 + rnd() * W / 2), y: H + 10, dir: -Math.PI / 2 + (rnd() - 0.5) * 0.5, k: 0, steps: 0, life: 1e9, id: 2 + i, b: ++branches, bend: (rnd() - 0.5) * 0.02 });
  run(ns, 0);
  // arteries: off the highways every so often, and from a few places of their own
  const seedsA = [];
  let acc = 0;
  for (const s of segs) {
    acc += Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (acc > 95 + rnd() * 70) { acc = 0; const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1), side = rnd() < 0.5 ? 1 : -1; seedsA.push({ x: wrapX(s.x2), y: s.y2, dir: a + side * Math.PI / 2 + (rnd() - 0.5) * 0.2, k: 1, steps: 0, life: 40, id: 10, b: ++branches }); if (rnd() < 0.6) seedsA.push({ x: wrapX(s.x2), y: s.y2, dir: a - side * Math.PI / 2 + (rnd() - 0.5) * 0.2, k: 1, steps: 0, life: 40, id: 10, b: ++branches }); }
  }
  for (let i = 0; i < 12; i++) { const x = rnd() * W, y = 180 + rnd() * (H - 200), a = rnd() * Math.PI; seedsA.push({ x, y, dir: a, k: 1, steps: 0, life: 36, id: 11, b: ++branches }, { x, y, dir: a + Math.PI, k: 1, steps: 0, life: 36, id: 11, b: ++branches }); }
  run(seedsA, 1);
  // streets: off arteries and highways; lanes: off streets. Each takes its direction from its parent, so every district has its own grain
  const offspring = (kinds, every, k, life, both) => {
    const out = []; let a2 = 0;
    for (const s of segs) {
      if (!kinds.includes(s.k)) continue; a2 += Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      if (a2 < every) continue; a2 = 0;
      const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1), side = rnd() < 0.5 ? 1 : -1;
      out.push({ x: wrapX(s.x2), y: s.y2, dir: a + side * Math.PI / 2 + (rnd() - 0.5) * 0.1, k, steps: 0, life, id: k * 10, b: ++branches });
      if (both && rnd() < 0.7) out.push({ x: wrapX(s.x2), y: s.y2, dir: a - side * Math.PI / 2 + (rnd() - 0.5) * 0.1, k, steps: 0, life, id: k * 10, b: ++branches });
    }
    return out;
  };
  run(offspring([0, 1], 22, 2, 32, true), 2);
  const pierSeeds = piers.map((p) => ({ x: wrapX(p.x + p.w / 2), y: p.y + p.h - 2, dir: -Math.PI / 2, k: 3, steps: 0, life: 30, id: 30, b: ++branches }));
  run(offspring([1, 2], 10, 3, 26, true).concat(pierSeeds), 3);
  return { segs, coastY, piers, lakes };
}

class LuzMap extends HTMLElement {
  constructor() {
    super();
    this._light = { alt: 30, az: 180, night: 1 };
  }

  get light() {
    return this._light;
  }

  set light(v) {
    if (!v || !Number.isFinite(v.alt) || !Number.isFinite(v.az)) return;
    this._light = { night: Number.isFinite(v.night) ? v.night : 1, alt: v.alt, az: v.az };
    this._shade();
  }

  connectedCallback() {
    if (!this._svg) this._build();
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this);
  }

  disconnectedCallback() {
    this._ro.disconnect();
  }

  _build() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "img");
    this._uid = "luz-map-" + Math.random().toString(36).slice(2, 8);
    this._vw = W;
    const layer = (cls) => el("svg", { class: cls, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true" }, this);
    this._svg = layer("luz-map__city");
    // The moving light lives in its own layer: the city never repaints
    this._fx = layer("luz-map__fx");
    this._bindPointer();
  }

  /** The tile is H tall; the view is as wide as the element, in tile units. The first time it has a size, the map grows in idle time. */
  _fit() {
    const r = this.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (!this._fill) {
      if (this._growing) return;
      this._growing = true;
      const go = () => {
        this._growing = false;
        this._render();
        this._fit();
      };
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(go, { timeout: 300 });
      else setTimeout(go, 0);
      return;
    }
    const vw = Math.max(W / 4, Math.round((H * r.width) / r.height));
    if (vw === this._vw) return;
    this._vw = vw;
    for (const s of [this._svg, this._fx]) s.setAttribute("viewBox", `0 0 ${vw} ${H}`);
    for (const n of [this._fill, this._fxFill, this._sunlight, this._maskFill]) n.setAttribute("width", vw);
    this._shade();
  }

  _render() {
    const svg = this._svg, fx = this._fx; svg.replaceChildren(); fx.replaceChildren();
    const seed = parseInt(this.getAttribute("seed") || "3", 10) || 3, uid = this._uid;
    const { segs, coastY, piers, lakes } = grow(seed);
    const defs = el("defs", {}, svg);
    const tile = el("pattern", { id: uid + "-tile", width: W, height: H, patternUnits: "userSpaceOnUse" }, defs);
    const puzzle = this.hasAttribute("puzzle");
    const tabPts = (s, o, r, side) => { // the points of segment s with a jigsaw tab in its middle, of head radius r, on one side
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy * side, ny = ux * side, mx = s.x1 + o + dx / 2, my = s.y1 + dy / 2;
      const pts = [[s.x1 + o, s.y1]];
      for (const [tx, ty] of TAB) pts.push([mx + ux * tx * r + nx * ty * r, my + uy * tx * r + ny * ty * r]);
      pts.push([s.x2 + o, s.y2]); return pts;
    };
    // the shore, piers included, as one outline: sampled every 20 px; as a puzzle, with a tab on many of its stretches,
    // decided by a hash of the position so the seam stays exact, and drawn with a line like the streets
    const hash = (i) => { let t = (Math.imul(i | 0, 374761393) + Math.imul(seed, 668265263)) | 0; t = Math.imul(t ^ (t >>> 13), 1274126177); return ((t ^ (t >>> 16)) >>> 0) / 4294967296; };
    const corners = []; // the outline's vertices, left to right
    const pierList = [];
    piers.forEach((pr, i) => { for (const o of [-W, 0, W]) { const x = pr.x + o; if (x + pr.w > -60 && x < W + 60) pierList.push({ x, y: pr.y, w: pr.w, i }); } });
    pierList.sort((a, b) => a.x - b.x);
    let px = -60, pi = 0;
    while (px <= W + 60) {
      const pr = pierList[pi];
      if (pr && pr.x <= px + 20) { // a pier: up its left side, across the top, down its right side
        if (pr.x > px) corners.push([px, coastY(px)]);
        const x0 = Math.max(px, pr.x), x1 = pr.x + pr.w;
        corners.push({ pier: pr.i, pts: [[x0, coastY(x0)], [x0, pr.y], [x1, pr.y], [x1, coastY(x1)]] });
        px = Math.ceil(x1 / 20) * 20; pi++; while (pierList[pi] && pierList[pi].x < x1) pi++;
        continue;
      }
      corners.push([px, coastY(px)]); px += 20;
    }
    const outline = []; // the outline's points, tabs included
    const run = (a, b, key) => { // one straight stretch of the outline
      if (!outline.length) outline.push(a);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), r = Math.min(6.5, L / 2.8);
      if (puzzle && r >= 4 && hash(key) < 0.5) { const pts = tabPts({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, 0, r, hash(key + 7919) < 0.5 ? 1 : -1); outline.push(...pts.slice(1)); }
      else outline.push(b);
    };
    let prev = null;
    for (const c of corners) {
      if (Array.isArray(c)) { if (prev) run(prev, c, Math.round((((c[0] % W) + W) % W) / 20)); prev = c; continue; }
      const [p0, p1, p2, p3] = c.pts;
      if (prev) run(prev, p0, Math.round((((p0[0] % W) + W) % W) / 20));
      run(p0, p1, 100000 + c.pier * 4); run(p1, p2, 100000 + c.pier * 4 + 1); run(p2, p3, 100000 + c.pier * 4 + 2);
      prev = p3;
    }
    const outlineD = outline.map(([x, y], i) => (i ? "L" : "M") + q(x) + " " + q(y)).join("");
    const landD = outlineD + `L${W + 60} ${H + 40}L-60 ${H + 40}Z`;
    // the sea is transparent: the page shows through
    el("path", { class: "luz-map__land", d: landD }, tile);
    el("path", { class: "luz-map__coast", d: outlineD }, tile);
    for (const l of lakes) {
      let d = "";
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = 1 + 0.18 * Math.sin(a * 3 + l.ph) + 0.1 * Math.sin(a * 5 + 1); d += (i ? "L" : "M") + q(l.x + Math.cos(a) * l.rx * r) + " " + q(l.y + Math.sin(a) * l.ry * r); }
      [0, -W, W].forEach((o) => el("path", { class: "luz-map__lake", d: d + "Z", transform: `translate(${o} 0)` }, tile));
    }
    // one path per class; the highways one per road, so the light can run along each. A segment over the seam is drawn on both sides
    const d = ["", "", "", ""], hwD = {};
    // puzzle: a tab every so often along each street, sized to its class, on a random side; the network itself is the same
    const prnd = mulberry(seed * 7 + 1), TAB_R = [7, 4.8, 3.1, 2], TAB_EVERY = [90, 52, 30, 17], since = new Map();
    const line = (s, o) => `M${q(s.x1 + o)} ${q(s.y1)}L${q(s.x2 + o)} ${q(s.y2)}`;
    const tabbed = (s, o, r, side) => tabPts(s, o, r, side).map(([x, y], i) => (i ? "L" : "M") + q(x) + " " + q(y)).join("");
    for (const s of segs) {
      const lo = Math.min(s.x1, s.x2), hi = Math.max(s.x1, s.x2), offs = [0]; if (lo < 0) offs.push(W); if (hi > W) offs.push(-W);
      let tab = 0;
      if (puzzle) {
        const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1), r = Math.min(TAB_R[s.k], L / 2.7), acc = (since.has(s.b) ? since.get(s.b) : prnd() * TAB_EVERY[s.k]) + L;
        if (acc >= TAB_EVERY[s.k] && r >= TAB_R[s.k] * 0.6) { tab = r; since.set(s.b, 0); } else since.set(s.b, acc);
      }
      const side = tab && prnd() < 0.5 ? 1 : -1;
      for (const o of offs) { const seg = tab ? tabbed(s, o, tab, side) : line(s, o); if (s.k === 0) hwD[s.id] = (hwD[s.id] || "") + seg; else d[s.k] += seg; }
    }
    el("path", { class: "luz-map__lane", d: d[3] }, tile);
    el("path", { class: "luz-map__street", d: d[2] }, tile);
    el("path", { class: "luz-map__main-glow", d: d[1] }, tile);
    el("path", { class: "luz-map__main", d: d[1] }, tile);
    const hws = Object.values(hwD);
    hws.forEach((hd) => el("path", { class: "luz-map__highway-glow", d: hd }, tile));
    hws.forEach((hd) => el("path", { class: "luz-map__highway", d: hd }, tile));
    hws.forEach((hd) => el("path", { class: "luz-map__highway-core", d: hd }, tile));
    this._fill = el("rect", { x: 0, y: 0, width: this._vw, height: H, fill: `url(#${uid}-tile)` }, svg);
    // the light: pulses along the highways and the big arteries, the sun's warmth by day, your torch by night
    const fdefs = el("defs", {}, fx);
    const ftile = el("pattern", { id: uid + "-fx", width: W, height: H, patternUnits: "userSpaceOnUse" }, fdefs);
    hws.forEach((hd, i) => el("path", { class: "luz-map__pulse", d: hd, style: `animation-delay:${-i * 1.1}s` }, ftile));
    el("path", { class: "luz-map__pulse luz-map__pulse--main", d: d[1] }, ftile);
    const sun = el("radialGradient", { id: uid + "-sun", gradientUnits: "userSpaceOnUse", cx: W / 2, cy: 0, r: 700 }, fdefs);
    stops(sun, [[0, "var(--_sun)", 0.3], [1, "var(--_sun)", 0]]);
    const torch = el("radialGradient", { id: uid + "-torch" }, fdefs);
    stops(torch, [[0, "var(--_neon)", 0.5], [1, "var(--_neon)", 0]]);
    this._fxFill = el("rect", { x: 0, y: 0, width: this._vw, height: H, fill: `url(#${uid}-fx)` }, fx);
    // the sun and the torch light the land only: the sea is transparent, so no light may tint it (it would show the element's edge)
    const lpat = el("pattern", { id: uid + "-landpat", width: W, height: H, patternUnits: "userSpaceOnUse" }, fdefs);
    el("path", { class: "luz-map__mask", d: landD }, lpat);
    const mask = el("mask", { id: uid + "-landmask", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 100000, height: H }, fdefs);
    this._maskFill = el("rect", { x: 0, y: 0, width: this._vw, height: H, fill: `url(#${uid}-landpat)` }, mask);
    const lit = el("g", { mask: `url(#${uid}-landmask)` }, fx);
    this._sunlight = el("rect", { class: "luz-map__sunlight", x: 0, y: 0, width: this._vw, height: H, fill: `url(#${uid}-sun)`, opacity: 0 }, lit);
    this._sunG = sun;
    this._torch = el("circle", { class: "luz-map__torch", r: 150, fill: `url(#${uid}-torch)` }, lit);

  }

  _shade() {
    if (!this._fill) return;
    const { alt, az } = this._light;
    // How much neon: none while the sun is up, all of it below -8°, and none while the page is light
    const g = Math.min(this._light.night, alt >= 6 ? 0 : alt <= -8 ? 1 : (6 - alt) / 14);
    this.style.setProperty("--luz-map-glow", (Math.round(g * 50) / 50).toFixed(2));
    this._sunG.setAttribute("cx", q(this._vw / 2 + this._vw * 0.35 * Math.sin(az * DEG)));
    this._sunlight.setAttribute("opacity", (alt > 0 ? Math.min(1, alt / 30) * (1 - g) : 0).toFixed(2));
    this._g = g;
  }

  _bindPointer() {
    this.addEventListener("pointermove", (e) => {
      if (!this._torch) return;
      const r = this.getBoundingClientRect();
      this._torch.setAttribute("cx", q(((e.clientX - r.left) / r.width) * this._vw));
      this._torch.setAttribute("cy", q(((e.clientY - r.top) / r.height) * H));
      this._torch.style.opacity = (this._g || 0).toFixed(2);
    });
    this.addEventListener("pointerleave", () => {
      if (this._torch) this._torch.style.opacity = "0";
    });
  }
}

if (!customElements.get("luz-map")) customElements.define("luz-map", LuzMap);
