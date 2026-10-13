/**
 * Pixels from a Playwright screenshot, read in the page (a browser decodes
 * the PNG; no image library is needed). `png` is the Buffer that
 * `locator.screenshot()` or `page.screenshot()` returns.
 */

/** One row of the image: an array of [r, g, b, a], left to right. */
export async function readRow(page, png, y) {
  return page.evaluate(async ({ b64, row }) => {
    const bytes = Uint8Array.from(globalThis.atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await globalThis.createImageBitmap(new globalThis.Blob([bytes], { type: 'image/png' }));
    const ctx = new globalThis.OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const { data, width } = ctx.getImageData(0, row, bitmap.width, 1);
    return Array.from({ length: width }, (_, i) => [...data.slice(i * 4, i * 4 + 4)]);
  }, { b64: png.toString('base64'), row: y });
}

/** The pixels at [x, y] points: an array of [r, g, b, a]. */
export async function readPoints(page, png, points) {
  return page.evaluate(async ({ b64, pts }) => {
    const bytes = Uint8Array.from(globalThis.atob(b64), (c) => c.charCodeAt(0));
    const bitmap = await globalThis.createImageBitmap(new globalThis.Blob([bytes], { type: 'image/png' }));
    const ctx = new globalThis.OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    return pts.map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
  }, { b64: png.toString('base64'), pts: points });
}

/** The colour a CSS value paints, as [r, g, b], read from a probe element. */
export async function paintOf(page, value) {
  return page.evaluate((v) => {
    const probe = document.createElement('span');
    probe.style.color = v;
    probe.style.forcedColorAdjust = 'none'; // forced colors would otherwise paint it CanvasText
    document.body.append(probe);
    const [r, g, b] = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
    probe.remove();
    return [r, g, b];
  }, value);
}

/** Two colours are the same within a few steps of anti-aliasing. */
export const near = (a, b, tolerance = 6) => a.slice(0, 3).every((v, i) => Math.abs(v - b[i]) <= tolerance);
