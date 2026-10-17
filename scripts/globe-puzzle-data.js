/**
 * The data of the home's globe (apps/landing/light/globe-data.js): the
 * land, from Natural Earth 1:110m admin-0 countries (public domain,
 * naturalearthdata.com) read as the TopoJSON of the world-atlas package
 * (countries-110m.json): the coast, the borders and the countries.
 *
 *   node scripts/globe-puzzle-data.js <countries-110m.json> [--area=<deg2>] [--write]
 *
 * Prints the sizes; with --write it replaces the data block of globe-data.js,
 * between its two marker lines. The encoding (decoded by globe.js):
 *
 * - A char is 6 bits of a 64-char alphabet. In COUNTRIES a number is 5 bits
 *   of payload a char, the sixth a "more follows" flag; ARCS and BORDERS are
 *   one stream of bits, 6 a char, first bit first, of Exp-Golomb numbers (a
 *   number v with order k: w = v + 2^k written in binary, after as many
 *   zeros as it has bits beyond k + 1; the order of each kind is in K). A
 *   signed number is zigzag-encoded.
 * - ARCS: the coast only (an arc used by one country), simplified
 *   (Visvalingam, --area square degrees) and on a grid of QX x QY steps: the
 *   count of arcs (order K[0]), then for each arc the count of its points
 *   (K[0]), then for each point the delta of its longitude (K[1]) and of its
 *   latitude (K[2]) from the point before (the first point: from the last
 *   point of the arc before). Antarctica's southern cut (-85.6°) is pushed
 *   to the pole.
 * - BORDERS: the borders between countries (an arc used by two), encoded as
 *   ARCS; each is a cut of the puzzle, so every country is one piece.
 * - COUNTRIES: the pieces, ";"-separated: a char, the country's tone (0 to
 *   TONES - 1, never the tone of a neighbour), then its rings, ","-separated,
 *   each a list of references into the coast arcs then the border arcs, every
 *   one counter-clockwise seen from outside (a lake is a ring inside another:
 *   the even-odd rule): per arc, the zigzag of its index minus the index of
 *   the arc before in the ring (the first: minus 0), times 2, plus reversed.
 *   The land is the union of the countries.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const QX = 1200,
  QY = 600;
const args = process.argv.slice(2);
const [src] = args.filter((a) => !a.startsWith("--")),
  write = args.includes("--write");
// Visvalingam: a point goes when the triangle it makes with its neighbours is under AREA square degrees
const AREA = parseFloat(
  (args.find((a) => a.startsWith("--area=")) ?? "--area=0").slice(7)
);
if (!src)
  throw new Error(
    "usage: node scripts/globe-puzzle-data.js <countries-110m.json> [--area=<deg2>] [--write]"
  );
const topo = JSON.parse(readFileSync(src, "utf8"));
const { scale, translate } = topo.transform;

/* ---- arcs: dequantised, simplified, then requantised on the coarser grid ---- */
const triangle = ([ax, ay], [bx, by], [cx, cy]) => {
  const k = Math.cos(by * (Math.PI / 180));
  return Math.abs((bx - ax) * k * (cy - ay) - (cx - ax) * k * (by - ay)) / 2;
};
const simplify = (pts) => {
  if (!AREA) return pts;
  pts = pts.slice();
  for (;;) {
    let min = Infinity,
      at = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = triangle(pts[i - 1], pts[i], pts[i + 1]);
      if (a < min) {
        min = a;
        at = i;
      }
    }
    if (at < 0 || min >= AREA) return pts;
    pts.splice(at, 1);
  }
};
const arcs = topo.arcs.map((arc) => {
  let x = 0,
    y = 0;
  const raw = [];
  for (const [dx, dy] of arc) {
    x += dx;
    y += dy;
    raw.push([x * scale[0] + translate[0], y * scale[1] + translate[1]]);
  }
  const out = [];
  for (const [lon, latitude] of simplify(raw)) {
    const lat = latitude < -85.5 ? -90 : latitude;
    const qx = Math.max(0, Math.min(QX, Math.round(((lon + 180) / 360) * QX)));
    const qy = Math.max(0, Math.min(QY, Math.round(((lat + 90) / 180) * QY)));
    const last = out[out.length - 1];
    if (!last || last[0] !== qx || last[1] !== qy) out.push([qx, qy]);
  }
  return out;
});

/* ---- the coast: every arc one country uses ---- */
const uses = new Uint8Array(arcs.length);
for (const g of topo.objects.countries.geometries)
  for (const ref of (g.type === "Polygon" ? [g.arcs] : g.arcs).flat(2))
    uses[ref < 0 ? ~ref : ref]++;
const coast = [];
uses.forEach((n, i) => n === 1 && coast.push(i));
/* ---- orientation: every ring counter-clockwise seen from outside. A lake is
   a ring inside another; the globe fills with the even-odd rule, so it needs
   no orientation of its own, and the horizon stitching wants every ring the
   same way round. The sign is the sum of the spherical triangles each edge
   makes with the ring's centre, so the seam of the antimeridian and the
   points at the pole (one point on the sphere) weigh nothing ---- */
const ringPoints = (ring) =>
  ring.flatMap((ref) => (ref < 0 ? arcs[~ref].slice().reverse() : arcs[ref]));
const vec = ([x, y]) => {
  const lon = ((x / QX) * 360 - 180) * (Math.PI / 180),
    lat = ((y / QY) * 180 - 90) * (Math.PI / 180);
  return [
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  ];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
// Positive when counter-clockwise seen from outside
const orientation = (pts) => {
  const v = pts.map(vec),
    c = [0, 0, 0];
  for (const q of v) for (let i = 0; i < 3; i++) c[i] += q[i];
  const l = Math.hypot(...c) || 1;
  for (let i = 0; i < 3; i++) c[i] /= l;
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    const a = v[i],
      b = v[(i + 1) % v.length];
    s +=
      2 *
      Math.atan2(dot(c, cross(a, b)), 1 + dot(a, b) + dot(b, c) + dot(c, a));
  }
  return s;
};
/* ---- encode ---- */
const varint = (n) => {
  let s = "";
  do {
    const bits = n & 31;
    n >>>= 5;
    s += ALPHABET[bits | (n ? 32 : 0)];
  } while (n);
  return s;
};
const signed = (n) => (n < 0 ? -2 * n - 1 : 2 * n);
const expGolomb = (list, [kn, kx, ky]) => {
  const bits = [];
  const put = (v, k) => {
    const w = v + 2 ** k,
      top = Math.floor(Math.log2(w));
    for (let i = k; i < top; i++) bits.push(0);
    for (let i = top; i >= 0; i--) bits.push(Math.floor(w / 2 ** i) % 2);
  };
  let px = 0,
    py = 0;
  put(list.length, kn);
  for (const i of list) {
    put(arcs[i].length, kn);
    for (const [x, y] of arcs[i]) {
      put(signed(x - px), kx);
      put(signed(y - py), ky);
      px = x;
      py = y;
    }
  }
  let out = "";
  for (let i = 0; i < bits.length; i += 6) {
    let c = 0;
    for (let j = 0; j < 6; j++) c = c * 2 + (bits[i + j] ?? 0);
    out += ALPHABET[c];
  }
  return out;
};
// The orders: the ones that make the coast and the borders shortest together
let K = null,
  shortest = Infinity;
const borderList = [];
uses.forEach((n, i) => n === 2 && arcs[i].length > 1 && borderList.push(i));
for (let kn = 0; kn < 6; kn++)
  for (let kx = 0; kx < 6; kx++)
    for (let ky = 0; ky < 6; ky++) {
      const k = [kn, kx, ky],
        n = expGolomb(coast, k).length + expGolomb(borderList, k).length;
      if (n < shortest) [shortest, K] = [n, k];
    }
const ARCS = expGolomb(coast, K);
const borders = [];
uses.forEach((n, i) => n === 2 && arcs[i].length > 1 && borders.push(i));
const BORDERS = expGolomb(borders, K);

/* ---- the countries: their rings over the coast and the border arcs, and a
   tone each, greedy, the most neighbours first, so no two neighbours share one ---- */
const TONES = 5;
const piece = new Map([
  ...coast.map((i, n) => [i, n]),
  ...borders.map((i, n) => [i, coast.length + n]),
]);
const geoms = topo.objects.countries.geometries.map((g) =>
  g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : []
);
const owners = new Map();
geoms.forEach((polys, c) => {
  for (const ref of polys.flat(2)) {
    const i = ref < 0 ? ~ref : ref;
    if (!owners.has(i)) owners.set(i, new Set());
    owners.get(i).add(c);
  }
});
const near = geoms.map(() => new Set());
for (const set of owners.values())
  for (const a of set) for (const b of set) if (a !== b) near[a].add(b);
const tone = new Array(geoms.length).fill(-1);
for (const c of geoms
  .map((_, c) => c)
  .sort((a, b) => near[b].size - near[a].size)) {
  const taken = new Set([...near[c]].map((n) => tone[n]));
  let t = 0;
  while (taken.has(t) && t < TONES - 1) t++;
  tone[c] = t;
}
const COUNTRIES = geoms
  .map((polys, c) => {
    const rings = polys
      .flat(1)
      .map((ring) =>
        orientation(ringPoints(ring)) > 0
          ? ring
          : ring
              .slice()
              .reverse()
              .map((ref) => ~ref)
      )
      .map((ring) => {
        let prev = 0;
        return ring
          .filter((ref) => piece.has(ref < 0 ? ~ref : ref))
          .map((ref) => {
            const i = piece.get(ref < 0 ? ~ref : ref),
              d = i - prev;
            prev = i;
            return varint((d < 0 ? -2 * d - 1 : 2 * d) * 2 + (ref < 0 ? 1 : 0));
          })
          .join("");
      })
      .filter(Boolean);
    return rings.length ? ALPHABET[tone[c]] + rings.join(",") : "";
  })
  .filter(Boolean)
  .join(";");

const gz = (s) => gzipSync(Buffer.from(s)).length;
const npts = coast.reduce((n, i) => n + arcs[i].length, 0);
console.log(
  `${coast.length} coast arcs of ${arcs.length}, ${npts} points, grid ${QX}x${QY}, area ${AREA}`
);
console.log(
  `${borders.length} border arcs; ARCS ${gz(ARCS)} gzip, BORDERS ${gz(
    BORDERS
  )} gzip, COUNTRIES ${gz(COUNTRIES)} gzip, all ${gz(
    ARCS + BORDERS + COUNTRIES
  )} gzip`
);

if (write) {
  const file = new URL("../apps/landing/light/globe-data.js", import.meta.url);
  const source = readFileSync(file, "utf8");
  const START = "// luz:puzzle-data:start",
    END = "// luz:puzzle-data:end";
  const a = source.indexOf(START),
    b = source.indexOf(END);
  if (a < 0 || b < 0) throw new Error("globe-data.js has no data markers");
  const block = `${START}\nexport const QX = ${QX}, QY = ${QY};\nexport const K = [${K}];\nexport const ARCS = "${ARCS}";\nexport const BORDERS = "${BORDERS}";\nexport const COUNTRIES = "${COUNTRIES}";\n`;
  writeFileSync(file, source.slice(0, a) + block + source.slice(b));
  console.log("written to apps/landing/light/globe-data.js");
}
