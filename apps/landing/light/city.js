/**
 * <home-city>: a skyline of line-drawn towers, isometric and periodic
 * sideways, so it tiles for any width. One of the three visuals of the home's
 * <home-light> (light.js loads this file when the city is the look); it
 * imports nothing and writes no style (the rules are light.css). Ink on paper
 * by day; as the sun goes down it lights up into neon, with beacons, traffic
 * and flying things.
 *
 *   <home-city seed="7"></home-city>
 *
 * Property `light` = { alt, az, night, moon?: { alt, az, age, lit } }, in
 * degrees, set by the controller (night 0 keeps it ink on paper). The city
 * is drawn once, in idle time, the first time it has a size. The traffic
 * moves in an animation frame only while the city is on screen, it is dark
 * enough to see it, and the reader has not asked for reduced motion.
 */

// eslint-disable-next-line no-restricted-syntax -- RL-12: the SVG namespace name, an identifier that is never fetched
const SVG = "http://www.w3.org/2000/svg", DEG = Math.PI / 180, W = 1400, H = 675;
const C = 0.8660254, S = 0.5, K = 0.70710678;          // isometric: X = (x − y)·C, Y = (x + y)·S − z
const UX = 2 * C * K;                                   // screen X per unit of u, the direction along the rows
const el = (tag, attrs, parent) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.append(n); return n; };
// In style, not in attributes: a presentation attribute takes no var()
const stops = (grad, list) => list.forEach(([offset, color, opacity]) => el("stop", { offset, style: `stop-color:${color};stop-opacity:${opacity}` }, grad));
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const q = (v) => Math.round(v * 10) / 10;
const pt = (x, y, z) => [(x - y) * C, (x + y) * S - z];
const poly = (pts) => pts.map(([x, y], i) => (i ? "L" : "M") + q(x) + " " + q(y)).join("") + "Z";
const line = (a, b) => `M${q(a[0])} ${q(a[1])}L${q(b[0])} ${q(b[1])}`;
const hull = (pts) => { // convex hull (monotone chain): the light mask needs a cheap outline per building, not every face
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const x of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], x) <= 0) lo.pop(); lo.push(x); }
  for (let i = p.length - 1; i >= 0; i--) { const x = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], x) <= 0) up.pop(); up.push(x); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
// the moon's lit part around (0, 0): the lit limb and the terminator, an ellipse that bulges one way or the other
const moonD = (age, r) => {
  const waxing = age < 0.5, rx = Math.abs(Math.cos(age * Math.PI * 2)) * r, gibbous = age > 0.25 && age < 0.75;
  const limb = waxing ? `A${r} ${r} 0 0 1 0 ${r}` : `A${r} ${r} 0 0 0 0 ${r}`;              // down the lit side
  const back = (waxing ? gibbous : !gibbous) ? `A${q(rx)} ${r} 0 0 1 0 ${-r}` : `A${q(rx)} ${r} 0 0 0 0 ${-r}`; // and up along the terminator
  return `M0 ${-r}${limb}${back}Z`;
};
// a jigsaw edge from world point p to q, its tab of head radius r sticking out along n (a unit vector in the face's plane)
const P3 = (p) => pt(p[0], p[1], p[2]);
const tab3 = (p, q0, n, r, side) => {
  const d = [q0[0] - p[0], q0[1] - p[1], q0[2] - p[2]], L = Math.hypot(d[0], d[1], d[2]), u = d.map((v) => v / L);
  const m = [(p[0] + q0[0]) / 2, (p[1] + q0[1]) / 2, (p[2] + q0[2]) / 2];
  const at = (a, b) => P3([m[0] + u[0] * a * r + n[0] * b * r * side, m[1] + u[1] * a * r + n[1] * b * r * side, m[2] + u[2] * a * r + n[2] * b * r * side]);
  const f = (pp) => q(pp[0]) + " " + q(pp[1]);
  const A = at(-0.55, 0), B = at(-0.5, 0.35), c1 = at(-1.05, 0.85), c2 = at(-1.0, 2.1), T = at(0, 2.1), c3 = at(1.0, 2.1), c4 = at(1.05, 0.85), Bq = at(0.5, 0.35), E = at(0.55, 0);
  return `M${f(P3(p))}L${f(A)}L${f(B)}C${f(c1)} ${f(c2)} ${f(T)}C${f(c3)} ${f(c4)} ${f(Bq)}L${f(E)}L${f(P3(q0))}`;
};


// ---- the city planner ----
function plan(seed) {
  const rnd = mulberry(seed), pick = (a) => a[Math.floor(rnd() * a.length)], between = (a, b) => a + rnd() * (b - a);
  // rows, far to near: the ground line on screen, the heights, and which ones get the towers
  const ROWS = [
    { y: 245, h: [40, 120], tiers: 1, cls: "sil" },
    { y: 300, h: [60, 170], tiers: 2, cls: "far" },
    { y: 380, h: [120, 410], tiers: 3, cls: "mid" },
    { y: 460, h: [100, 330], tiers: 3, cls: "mid" },
    { y: 548, h: [80, 260], tiers: 3, cls: "near" },
    { y: 640, h: [50, 190], tiers: 2, cls: "near" },
  ];
  const items = []; // everything to draw, each with a depth; sorted later
  const U = W / UX;
  const beacons = [], streets = [];
  ROWS.forEach((row, ri) => {
    const v = row.y / S; // x + y of the row's centre line
    let u = rnd() * 40, lot = 0, prev = null;
    while (u < U) {
      const a = between(22, 56) * (ri === 2 ? 1.15 : 1), b = between(22, 56), ext = (a + b) * K;
      const street = lot > 0 && lot % (3 + Math.floor(rnd() * 3)) === 0;
      if (street) u += between(34, 52);
      if (u + ext > U + 20) break;
      const uc = u + ext / 2, xc = (uc + v) * K, yc = (v - uc) * K;
      const empty = rnd() < 0.08;
      if (!empty) {
        const h = between(row.h[0], row.h[1]) * (rnd() < 0.15 && ri > 0 ? 1.25 : 1);
        const bld = building(rnd, pick, between, { x0: xc - a / 2, x1: xc + a / 2, y0: yc - b / 2, y1: yc + b / 2 }, h, row.tiers, ri);
        bld.depth = bld.x1 + bld.y1; bld.row = ri; bld.u0 = u; bld.u1 = u + ext;
        items.push(bld);
        if (bld.beacon) beacons.push(bld.beacon);
        // a bridge across the street to the one before, when both are tall enough
        if (street && prev && !prev.empty && prev.h > 80 && h > 80 && rnd() < 0.55) {
          const z = Math.min(prev.h, h) * between(0.35, 0.7);
          items.push(bridge(prev, bld, z, ri));
        }
        prev = bld;
      } else prev = { empty: true };
      u += ext + between(3, 9); lot++;
    }
    // the street in front of the row: a dashed centre line
    if (ri > 0 && ri < ROWS.length - 1) { const y = row.y + 44; streets.push(y); items.push({ kind: "street", depth: y / S, y, ri }); } // in front of the row's nearest corners, behind the next row's farthest
  });
  // an elevated highway between the two near rows, with pillars
  const hy = (ROWS[4].y + ROWS[5].y) / 2 + 6, hz = 62;
  items.push({ kind: "highway", depth: hy / S + 1, y: hy, z: hz });
  return { items, beacons, streets, highway: { y: hy, z: hz }, rows: ROWS };
}

function building(rnd, pick, between, fp, h, maxTiers, ri) {
  // tiers: each one narrower and set back, flush with the far corner so the setback shows on both faces
  const tiers = []; let { x0, x1, y0, y1 } = fp, z = 0, left = h;
  const n = h > 160 ? 1 + Math.floor(rnd() * maxTiers) : 1 + (rnd() < 0.3 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const hz = i === n - 1 ? left : left * between(0.45, 0.7); left -= hz;
    tiers.push({ x0, x1, y0, y1, z0: z, z1: z + hz }); z += hz;
    const sx = between(0.6, 0.85), sy = between(0.6, 0.85), nx = (x1 - x0) * sx, ny = (y1 - y0) * sy;
    const ax = rnd() < 0.5 ? x0 : x1 - nx, ay = rnd() < 0.5 ? y0 : y1 - ny; // flush with one of the corners
    x0 = ax; x1 = ax + nx; y0 = ay; y1 = ay + ny;
  }
  const top = tiers[tiers.length - 1];
  const roof = pick(["none", "none", "spire", "spire", "antenna", "tank", "dome", "helipad", "antenna"]);
  // the facade: jigsaw pieces, one cell grid per face; a lit floor in magenta now and then
  const style = ri === 0 ? "bare" : "puzzle";
  const b = { kind: "bld", x0: fp.x0, x1: fp.x1, y0: fp.y0, y1: fp.y1, h, tiers, roof: ri === 0 && roof !== "spire" ? "none" : roof, ri, style, cellH: between(11, 19), cellW: between(13, 24), magRows: rnd() < 0.6 ? 1 : 0, magAt: rnd(), sign: h > 150 && ri > 0 && rnd() < 0.5, seed: rnd() * 1e6 };
  if (roof === "spire") { const t = between(30, 110); b.spire = t; const cx = (top.x0 + top.x1) / 2, cy = (top.y0 + top.y1) / 2; b.beacon = pt(cx, cy, top.z1 + t); }
  if (roof === "antenna") { b.ant = [between(18, 40), between(10, 30)]; if (rnd() < 0.5) { const cx = top.x0 + (top.x1 - top.x0) * 0.25, cy = top.y0 + (top.y1 - top.y0) * 0.25; b.beacon = pt(cx, cy, top.z1 + b.ant[0]); } }
  return b;
}

function bridge(a, b, z, ri) {
  // from the right face of a to the left face of b, in screen space: a deck, a railing and a zigzag truss
  const pa = pt(a.x1, a.y0, z), pb = pt(b.x0, b.y1, z);
  return { kind: "bridge", depth: Math.max(a.depth, b.depth) + 0.5, ri, x0: pa[0], y0: pa[1], x1: pb[0], y1: pb[1] };
}

// ---- drawing ----
function drawBuilding(b, g, tile, offs) {
  const grp = el("g", { class: "home-city__bld" }, g);
  let sign = ""; const hullPts = [];
  const parts = []; // per tier: its body, then its lines, so a tier never shows through the one above
  const tiers = b.tiers;
  tiers.forEach((t, i) => {
    let body = "", lines = "", mag = "";
    const { x0, x1, y0, y1, z0, z1 } = t;
    const top = [pt(x0, y0, z1), pt(x1, y0, z1), pt(x1, y1, z1), pt(x0, y1, z1)];
    const left = [pt(x0, y1, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x0, y1, z1)];
    const right = [pt(x1, y0, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x1, y0, z1)];
    body += poly(left) + poly(right) + poly(top); hullPts.push(...top, ...left, ...right);
    const litL = poly(left), litR = poly(right);
    if (b.style !== "bare") { // the faces as jigsaw grids: every edge between two cells carries one tab
      const prnd = mulberry(Math.floor(b.seed) + i);
      const nr = Math.max(1, Math.round((z1 - z0) / b.cellH)), ch = (z1 - z0) / nr;
      const magRow = b.magRows ? Math.floor(b.magAt * nr) : -1;
      const face = (w, px, ux, nx) => { // w: the face's width; px(t): a world point at t along it, at z; ux/nx: along / across unit vectors in the plane
        const nc = Math.max(1, Math.round(w / b.cellW)), cw = w / nc, r = Math.min(cw, ch) * 0.17;
        for (let ri2 = 1; ri2 < nr; ri2++) { // horizontal edges, one tab per cell
          const z = z0 + ri2 * ch, isMag = ri2 === magRow || ri2 === magRow + 1;
          for (let c = 0; c < nc; c++) { const seg = tab3(px(c * cw, z), px((c + 1) * cw, z), [0, 0, 1], r, prnd() < 0.5 ? 1 : -1); if (isMag) mag += seg; else lines += seg; }
        }
        for (let c = 1; c < nc; c++) { // vertical edges
          for (let ri2 = 0; ri2 < nr; ri2++) { lines += tab3(px(c * cw, z0 + ri2 * ch), px(c * cw, z0 + (ri2 + 1) * ch), nx, r, prnd() < 0.5 ? 1 : -1); }
        }
      };
      face(x1 - x0, (t, z) => [x0 + t, y1, z], [1, 0, 0], [1, 0, 0]);   // the left face runs along x
      face(y1 - y0, (t, z) => [x1, y0 + t, z], [0, 1, 0], [0, 1, 0]);   // the right face runs along y
    }
    if (i < tiers.length - 1) lines += line(pt(x0, y1, z1 - 2.5), pt(x1, y1, z1 - 2.5)) + line(pt(x1, y0, z1 - 2.5), pt(x1, y1, z1 - 2.5)); // a cornice at the setback
    parts.push({ body, lines, mag, litL, litR });
  });
  let lines = "", body = "";
  if (b.sign) { // a lit sign high on the right face of the first tier
    const t = tiers[0], z = t.z0 + (t.z1 - t.z0) * 0.72, hh = 9, ya = t.y0 + (t.y1 - t.y0) * 0.2, yb = t.y1 - (t.y1 - t.y0) * 0.2;
    sign += poly([pt(t.x1, ya, z), pt(t.x1, yb, z), pt(t.x1, yb, z + hh), pt(t.x1, ya, z + hh)]);
  }
  const top = tiers[tiers.length - 1], cx = (top.x0 + top.x1) / 2, cy = (top.y0 + top.y1) / 2;
  if (b.roof === "spire") { lines += line(pt(cx, cy, top.z1), pt(cx, cy, top.z1 + b.spire)); lines += line(pt(cx - 3, cy - 3, top.z1), pt(cx, cy, top.z1 + b.spire * 0.35)) + line(pt(cx + 3, cy + 3, top.z1), pt(cx, cy, top.z1 + b.spire * 0.35)); }
  if (b.roof === "antenna") { const [h1, h2] = b.ant; const ax = top.x0 + (top.x1 - top.x0) * 0.25, ay = top.y0 + (top.y1 - top.y0) * 0.25, bx = top.x1 - (top.x1 - top.x0) * 0.25, by = top.y1 - (top.y1 - top.y0) * 0.25; lines += line(pt(ax, ay, top.z1), pt(ax, ay, top.z1 + h1)) + line(pt(bx, by, top.z1), pt(bx, by, top.z1 + h2)) + line(pt(ax, ay, top.z1 + h1 * 0.6), pt(ax + 4, ay - 4, top.z1 + h1 * 0.6)); }
  if (b.roof === "tank") { const s = Math.min(top.x1 - top.x0, top.y1 - top.y0) * 0.3, tx = top.x0 + s * 0.6, ty = top.y0 + s * 0.6; body += poly([pt(tx, ty + s, top.z1), pt(tx + s, ty + s, top.z1), pt(tx + s, ty + s, top.z1 + s), pt(tx, ty + s, top.z1 + s)]) + poly([pt(tx + s, ty, top.z1), pt(tx + s, ty + s, top.z1), pt(tx + s, ty + s, top.z1 + s), pt(tx + s, ty, top.z1 + s)]) + poly([pt(tx, ty, top.z1 + s), pt(tx + s, ty, top.z1 + s), pt(tx + s, ty + s, top.z1 + s), pt(tx, ty + s, top.z1 + s)]); }
  const [tcx, tcy] = pt(cx, cy, top.z1);
  const r = Math.min(top.x1 - top.x0, top.y1 - top.y0) * 0.32;
  const grpAttrs = (o) => (o ? { transform: `translate(${o} 0)` } : {});
  for (const o of offs) {
    const gg = o ? el("g", grpAttrs(o), grp) : grp;
    parts.forEach((pr) => {
      el("path", { class: "home-city__body", d: pr.body }, gg);
      el("path", { class: "home-city__lit-l", d: pr.litL }, gg); el("path", { class: "home-city__lit-r", d: pr.litR }, gg);
      if (pr.lines) el("path", { class: "home-city__lines", d: pr.lines }, gg);
      if (pr.mag) el("path", { class: "home-city__mag", d: pr.mag }, gg);
    });
    if (body) el("path", { class: "home-city__body", d: body }, gg);
    if (b.roof === "dome") el("path", { class: "home-city__body", d: `M${q(tcx - r * 1.2)} ${q(tcy)}A${q(r * 1.2)} ${q(r * 0.95)} 0 0 1 ${q(tcx + r * 1.2)} ${q(tcy)}A${q(r * 1.2)} ${q(r * 0.7)} 0 0 1 ${q(tcx - r * 1.2)} ${q(tcy)}Z` }, gg);
    if (b.roof === "helipad") { el("ellipse", { class: "home-city__lines", cx: q(tcx), cy: q(tcy), rx: q(r * 1.22), ry: q(r * 0.71) }, gg); el("ellipse", { class: "home-city__lines", cx: q(tcx), cy: q(tcy), rx: q(r * 0.7), ry: q(r * 0.41) }, gg); }
    if (lines) el("path", { class: "home-city__lines", d: lines }, gg);
    if (sign) el("path", { class: "home-city__sign", d: sign }, gg);
  }
  return poly(hull(hullPts));
}

function drawBridge(br, g, offs) {
  const { x0, y0, x1, y1 } = br; if (x1 - x0 < 10) return;
  const d = 6, deck = poly([[x0, y0], [x1, y1], [x1, y1 + d], [x0, y0 + d]]);
  let truss = "", rail = line([x0, y0 - 5], [x1, y1 - 5]) + line([x0, y0 - 5], [x0, y0]) + line([x1, y1 - 5], [x1, y1]);
  const n = Math.max(2, Math.round((x1 - x0) / 9));
  for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 0.5) / n, t2 = (i + 1) / n; truss += line([x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0 + d], [x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1]) + line([x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1], [x0 + (x1 - x0) * t2, y0 + (y1 - y0) * t2 + d]); }
  for (let i = 1; i < 4; i++) { const t = i / 4; rail += line([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 5], [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); }
  for (const o of offs) { const gg = o ? el("g", { transform: `translate(${o} 0)` }, g) : g; el("path", { class: "home-city__body", d: deck }, gg); el("path", { class: "home-city__lines", d: truss + rail }, gg); }
}

function drawHighway(hw, g) {
  const y = hw.y - hw.z, d = 9;
  el("path", { class: "home-city__lines", d: (() => { let s = ""; for (let x = 30; x < W; x += 74) { s += line([x, y + d], [x - 3, hw.y]) + line([x + 8, y + d], [x + 11, hw.y]) + line([x - 1, y + d + 14], [x + 9, hw.y - 8]) + line([x + 9, y + d + 14], [x - 1, hw.y - 8]); } return s; })() }, g);
  el("path", { class: "home-city__body", d: poly([[-10, y], [W + 10, y], [W + 10, y + d], [-10, y + d]]) }, g);
  el("path", { class: "home-city__lines", d: line([-10, y - 4], [W + 10, y - 4]) + line([-10, y + d + 2], [W + 10, y + d + 2]) }, g);
  el("path", { class: "home-city__dash", d: line([-10, y + d / 2], [W + 10, y + d / 2]) }, g);
}


class LuzCity extends HTMLElement {
  constructor() {
    super();
    this._light = { alt: 30, az: 180, night: 1 };
    this._movers = [];
    this._raf = 0;
    this._seen = false;
  }

  get light() {
    return this._light;
  }

  set light(v) {
    if (!v || !Number.isFinite(v.alt) || !Number.isFinite(v.az)) return;
    this._light = { night: Number.isFinite(v.night) ? v.night : 1, alt: v.alt, az: v.az, moon: v.moon && Number.isFinite(v.moon.alt) ? v.moon : null };
    this._shade();
  }

  connectedCallback() {
    if (!this._svg) this._build();
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this);
    this._io = new IntersectionObserver(([entry]) => {
      this._seen = entry.isIntersecting;
      this._go();
    });
    this._io.observe(this);
    this._reduced.addEventListener("change", this._onMotion);
  }

  disconnectedCallback() {
    this._ro.disconnect();
    this._io.disconnect();
    this._reduced.removeEventListener("change", this._onMotion);
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _build() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "img");
    this._reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    this._onMotion = () => this._go();
    this._uid = "home-city-" + Math.random().toString(36).slice(2, 8);
    this._vw = W;
    const layer = (cls) => el("svg", { class: cls, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true" }, this);
    this._skySvg = layer("home-city__skylayer");
    this._svg = layer("home-city__city");
    this._fx = layer("home-city__fx");
    this._bindPointer();
  }

  /** The tile is H tall; the view is as wide as the element, in tile units. The first time it has a size, the city is drawn in idle time. */
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
    for (const s of [this._skySvg, this._svg, this._fx]) s.setAttribute("viewBox", `0 0 ${vw} ${H}`);
    for (const n of [this._fill, this._fxFill, this._sunlight, this._moonlight, this._maskFill]) n.setAttribute("width", vw);
    this._shade();
  }

  _render() {
    const svg = this._svg, fx = this._fx, sky = this._skySvg;
    svg.replaceChildren();
    fx.replaceChildren();
    sky.replaceChildren();
    const seed = parseInt(this.getAttribute("seed") || "7", 10) || 7, uid = this._uid;
    const { items, beacons, streets, highway } = plan(seed);
    items.sort((a, b) => a.depth - b.depth);
    const defs = el("defs", {}, svg);
    const tile = el("pattern", { id: uid + "-tile", width: W, height: H, patternUnits: "userSpaceOnUse" }, defs);
    const wrap = el("g", { class: "home-city__row" }, tile);
    el("use", { class: "home-city__halo", href: "#" + uid + "-city" }, wrap);
    const city = el("g", { id: uid + "-city" }, wrap);
    let silhouette = "";
    const groupFor = (ri) => el("g", { class: `home-city__row home-city__row--${ri === 0 ? "sil" : ri === 1 ? "far" : ri <= 3 ? "mid" : "near"}` }, city);
    for (const it of items) {
      if (it.kind === "bld") {
        const xs = it.tiers.flatMap((t) => [pt(t.x0, t.y1, 0)[0], pt(t.x1, t.y0, 0)[0]]);
        const lo = Math.min(...xs), hi = Math.max(...xs), offs = [0];
        if (lo < 0) offs.push(W);
        if (hi > W) offs.push(-W);
        const body = drawBuilding(it, groupFor(it.ri), tile, offs);
        silhouette += body; // the mask of the lights: the near copy, and the copy over the seam
        if (offs.length > 1) silhouette += body.replace(/([ML])([\d.]+) /g, (m, c, x) => c + q(parseFloat(x) + offs[1]) + " ");
      } else if (it.kind === "bridge") {
        const offs = [0];
        if (Math.min(it.x0, it.x1) < 0) offs.push(W);
        if (Math.max(it.x0, it.x1) > W) offs.push(-W);
        drawBridge(it, groupFor(it.ri), offs);
      } else if (it.kind === "street") {
        el("path", { class: "home-city__dash", d: line([-10, it.y], [W + 10, it.y]) }, groupFor(it.ri));
      } else if (it.kind === "highway") drawHighway(it, groupFor(5));
    }
    // The sky: the sun or the moon and its glow, behind the towers (the pattern's fills hide them)
    const sdefs = el("defs", {}, sky);
    const glow = el("radialGradient", { id: uid + "-glow" }, sdefs);
    stops(glow, [[0, "var(--_sky-glow)", 0.5], [0.4, "var(--_sky-glow)", 0.14], [1, "var(--_sky-glow)", 0]]);
    // A few stars, each one slowly coming and going on its own clock (light.css stops them under reduced motion)
    const srnd = mulberry(seed + 7), stars = el("g", { class: "home-city__stars" }, sky);
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 11; i++) {
        const x = k * W + srnd() * W, y = 14 + srnd() * 190, r = 0.8 + srnd() * 0.8, dur = 10 + srnd() * 10;
        el("circle", { class: "home-city__star", cx: q(x), cy: q(y), r: q(r), style: `animation-duration:${dur.toFixed(1)}s;animation-delay:${(-srnd() * dur).toFixed(1)}s` }, stars);
      }
    }
    this._sky = el("g", { class: "home-city__sky", opacity: 0 }, sky);
    this._skyGlow = el("circle", { r: 150, style: `fill:url(#${uid}-glow)` }, this._sky); // inline: the generic circle rule says fill none
    this._sunDisc = el("circle", { class: "home-city__sun", r: 20 }, this._sky);
    this._moonG = el("g", {}, this._sky);
    el("circle", { class: "home-city__moon-dark", r: 15 }, this._moonG);
    this._moonLit = el("path", { class: "home-city__moon-lit", d: "" }, this._moonG);
    this._fill = el("rect", { x: 0, y: 0, width: this._vw, height: H, fill: `url(#${uid}-tile)` }, svg);

    // The light: beacons, traffic, the sun on the faces by day, the torch by night
    const fdefs = el("defs", {}, fx);
    const ftile = el("pattern", { id: uid + "-fx", width: W, height: H, patternUnits: "userSpaceOnUse" }, fdefs);
    const night = el("g", { class: "home-city__night" }, ftile);
    beacons.forEach(([x, y], i) => el("circle", { class: "home-city__beacon", cx: q(x), cy: q(y), r: 1.8, style: `animation-delay:${-(i * 0.7) % 1.8}s` }, night));
    const rnd = mulberry(seed + 99);
    // Each mover crosses the tile in its own time, one way or the other: { node, x, speed in px/ms, phase }
    this._movers = [];
    const mover = (node, x, dur, back) => this._movers.push({ node, x, v: ((back ? -1 : 1) * W) / (dur * 1000), at: rnd() * W });
    const lanes = streets.map((y) => ({ y: y - 1, z: 0 })).concat([{ y: highway.y - highway.z + 4.5, z: 1 }, { y: highway.y - highway.z + 4.5, z: 1 }]);
    for (const ln of lanes) {
      for (let i = 0; i < 3 + Math.floor(rnd() * 3); i++) {
        const back = rnd() < 0.45, dur = (ln.z ? 14 : 22) + rnd() * 16, x = rnd() * W;
        mover(el("rect", { class: "home-city__car" + (rnd() < 0.5 ? " home-city__car--cyan" : ""), x: q(x), y: q(ln.y - 2), width: 7, height: 2.6, rx: 0.8 }, night), x, dur, back);
      }
    }
    for (let i = 0; i < 4; i++) {
      // Flying things, drifting over the skyline
      const y = 120 + rnd() * 160, x = rnd() * W, back = rnd() < 0.5, dur = 36 + rnd() * 30;
      const g = el("g", {}, night);
      el("path", { class: "home-city__flyer", d: `M${q(x)} ${q(y)}h13l3 2-3 2h-13z`, transform: back ? `scale(-1 1) translate(${-2 * x - 16} 0)` : "" }, g);
      el("path", { class: "home-city__trail", d: back ? line([x + 16, y + 2], [x + 34, y + 2]) : line([x - 18, y + 2], [x, y + 2]) }, g);
      mover(g, x, dur, back);
    }
    this._move(0);
    const sun = el("radialGradient", { id: uid + "-sun", gradientUnits: "userSpaceOnUse", cx: W / 2, cy: 0, r: 700 }, fdefs);
    stops(sun, [[0, "var(--_sun)", 0.22], [1, "var(--_sun)", 0]]);
    const torch = el("radialGradient", { id: uid + "-torch" }, fdefs);
    stops(torch, [[0, "var(--_neon)", 0.45], [1, "var(--_neon)", 0]]);
    const spat = el("pattern", { id: uid + "-silpat", width: W, height: H, patternUnits: "userSpaceOnUse" }, fdefs);
    el("path", { class: "home-city__mask", d: silhouette }, spat);
    const mask = el("mask", { id: uid + "-silmask", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 100000, height: H }, fdefs);
    this._maskFill = el("rect", { x: 0, y: 0, width: this._vw, height: H, fill: `url(#${uid}-silpat)` }, mask);
    this._fxFill = el("rect", { x: 0, y: 0, width: this._vw, height: H, fill: `url(#${uid}-fx)` }, fx);
    const lit = el("g", { mask: `url(#${uid}-silmask)` }, fx);
    this._sunlight = el("rect", { x: 0, y: 0, width: this._vw, height: H, fill: `url(#${uid}-sun)`, opacity: 0 }, lit);
    this._moonGrad = el("radialGradient", { id: uid + "-moonlight", gradientUnits: "userSpaceOnUse", cx: W / 2, cy: 0, r: 600 }, fdefs);
    stops(this._moonGrad, [[0, "var(--_moon)", 0.26], [1, "var(--_moon)", 0]]);
    this._moonlight = el("rect", { x: 0, y: 0, width: this._vw, height: H, fill: `url(#${uid}-moonlight)`, opacity: 0 }, lit);
    this._sunG = sun;
    this._torch = el("circle", { class: "home-city__torch", r: 150, style: `fill:url(#${uid}-torch)` }, lit);
    this._shade();
  }

  _shade() {
    if (!this._fill) return;
    const { alt, az } = this._light;
    // How much neon: none while the sun is up, all of it below -8°, and none while the page is light
    const g = Math.min(this._light.night, alt >= 6 ? 0 : alt <= -8 ? 1 : (6 - alt) / 14);
    this.style.setProperty("--home-city-glow", (Math.round(g * 50) / 50).toFixed(2));
    const day = alt > 0 ? Math.min(1, alt / 25) * (1 - g) : 0;
    const vw = this._vw, skyX = (a) => vw / 2 + vw * 0.42 * Math.sin(a * DEG), skyY = (h) => 232 - h * 3.2; // the horizon sits behind the far silhouettes
    // The moon is up whenever the sun is down: at its own place when it is high enough, otherwise across the sky from the
    // sun, where a full moon would be. Its phase is always the real one; its light never fades below a third
    const real = this._light.moon, moonUp = !!real && alt < 2;
    const moon = moonUp ? (real.alt > 6 ? real : { alt: Math.min(55, Math.max(14, -alt * 0.8)), az: az + 180, age: real.age, lit: real.lit }) : null;
    const moonStrength = moonUp ? (0.35 + 0.65 * moon.lit) * g : 0;
    // The faces that look at the light: the sun's warmth by day, the moon's cool by night, in steps of 2 % (a change repaints the city)
    const east = Math.sin(az * DEG) > 0, moonEast = moonUp && Math.sin(moon.az * DEG) > 0;
    const tint = (on, colour, pct) => (on && pct > 0.5 ? `color-mix(in oklab, ${colour} ${pct.toFixed(0)}%, transparent)` : "transparent");
    const sunPct = Math.round((day * 30) / 2) * 2, moonPct = Math.round((moonStrength * 28) / 2) * 2;
    this.style.setProperty("--_sun-r", sunPct > 0.5 ? tint(east, "var(--_sun)", sunPct) : tint(moonEast, "var(--_moon)", moonPct));
    this.style.setProperty("--_sun-l", sunPct > 0.5 ? tint(!east, "var(--_sun)", sunPct) : tint(!moonEast, "var(--_moon)", moonPct));
    this._sunG.setAttribute("cx", q(skyX(az)));
    this._sunlight.setAttribute("opacity", day.toFixed(2));
    if (moonUp) {
      this._moonGrad.setAttribute("cx", q(skyX(moon.az)));
      this._moonGrad.setAttribute("cy", q(skyY(moon.alt)));
    }
    this._moonlight.setAttribute("opacity", moonStrength.toFixed(2));
    // The sky: the sun while it is up, the moon once the sun has set
    const sunUp = alt > -3;
    this.style.setProperty("--_sky-glow", sunUp ? "var(--_sun)" : "var(--_moon)");
    this._sunDisc.setAttribute("opacity", sunUp ? 1 : 0);
    this._moonG.setAttribute("opacity", moonUp && !sunUp ? 1 : 0);
    if (sunUp) {
      const x = q(skyX(az)), y = q(skyY(alt));
      for (const [n, a, b] of [[this._sunDisc, "cx", x], [this._sunDisc, "cy", y], [this._skyGlow, "cx", x], [this._skyGlow, "cy", y], [this._skyGlow, "r", 120]]) n.setAttribute(a, b);
    } else if (moonUp) {
      const x = q(skyX(moon.az)), y = q(skyY(moon.alt));
      this._moonG.setAttribute("transform", `translate(${x} ${y})`);
      this._moonLit.setAttribute("d", moonD(moon.age, 15));
      for (const [a, b] of [["cx", x], ["cy", y], ["r", 70 + 60 * moon.lit]]) this._skyGlow.setAttribute(a, b);
    }
    this._sky.setAttribute("opacity", sunUp || moonUp ? 1 : 0);
    this._g = g;
    this._go();
  }

  /* ---- the traffic: an animation frame only while it can be seen ---- */
  _go() {
    const on = this._seen && this._movers.length && !this._reduced.matches;
    if (on && !this._raf) this._raf = requestAnimationFrame((t) => this._frame(t));
    else if (!on && this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  _frame(t) {
    // By day the traffic is not drawn (the night layer is transparent): nothing to move
    if (this._g > 0) this._move(t);
    this._raf = requestAnimationFrame((next) => this._frame(next));
  }

  /** Each mover at its place at time t (ms), wrapped round the tile. */
  _move(t) {
    for (const m of this._movers) {
      const x = (((m.at + m.v * t) % W) + W) % W;
      m.node.setAttribute("transform", `translate(${q(x - m.x)} 0)`);
    }
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

if (!customElements.get("home-city")) customElements.define("home-city", LuzCity);
