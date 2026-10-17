// @ts-check
/**
 * <home-light> on the home page (F3 of .claude/plans/luz-home-docs-identity.md,
 * section 3.7; D8, D11). The element sits in section#light after the hero:
 *
 *   <home-light bleed favicon>
 *
 * It draws the sun and the moon where the visitor is (the zone of Intl, no
 * network), over the puzzle globe: one piece per country, the land loaded
 * from globe-data.js once the globe is on screen and the browser is idle
 * (<home-globe land> says it is drawn). There is one look and no way to
 * choose another: no look buttons, no ?look=, nothing remembered. It does not own the colour mode:
 * <luz-mode> (the footer's) is the only writer of data-theme and data-light,
 * and <home-light> asks it to preview an hour (the slider) or to return to now
 * (Live). What it writes on <html> are custom properties: --sun-alt, --sun-az,
 * --sun-x and --day-left. Its texts are data-luz-label-* of <body>, from the
 * catalog (apps/landing/i18n). The files and their budgets are in
 * tests/home-light.test.js.
 *
 * What the controller renders, as this file reads it (the class names of the
 * mockup, kept by light.css): `.home-light__line` the button under the visual
 * (the phrase of the look, it opens the bar), `.home-light__bar` the bar,
 * the slider (a range input named "Scrub the day"), `.home-light__q` the
 * phrase (closing the bar brings the light back to now), and <home-globe> for the drawing.
 *
 * Without JavaScript the element is empty and light.css reserves its height.
 * That block turns JavaScript off for itself, so it runs in the chromium
 * project; every other test needs JavaScript and skips itself where it is off.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';
import { LIGHTS, NO_CHOICE, TIMEZONE, atTime } from './helpers/site-lights.js';

const jsOff = () => test.info().project.use.javaScriptEnabled === false;

const catalog = (lang) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${lang}.json`, import.meta.url), 'utf-8'));
const EN = catalog('en');
/** The text of an English string in a language: the key is found by its English value. */
const text = (lang, english) => {
  const key = Object.keys(EN).find((k) => EN[k] === english);
  if (!key) throw new Error(`no key of en.json has the value "${english}"`);
  return catalog(lang)[key];
};
const PHRASE = 'A design system is a world with its own laws of light.';
const ROUTES = [
  ['/', 'en'],
  ['/es/', 'es'],
  ['/ar/', 'ar'],
];
const ORIGIN = 'http://localhost:5173';

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

/**
 * Open the home and wait until the visual is there.
 * @param {import('@playwright/test').Page} page
 * @param {string} [path]
 * @param {{ time?: string }} [options] time: the clock (hh:mm, Madrid)
 */
async function open(page, path = '/', { time } = {}) {
  if (time) await atTime(page, time);
  await page.goto(path);
  await expect(page.locator('home-light .home-light__line')).toBeVisible();
  await expect(page.locator('home-light').locator('home-globe').filter({ visible: true })).toHaveCount(1);
}

/** The state of the page the light reads and writes. */
const html = (page) =>
  page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    light: document.documentElement.getAttribute('data-light'),
    sunX: document.documentElement.style.getPropertyValue('--sun-x').trim(),
    sunAlt: document.documentElement.style.getPropertyValue('--sun-alt').trim(),
  }));
const openBar = async (page) => {
  const bar = page.locator('home-light .home-light__bar');
  if (!(await bar.isVisible())) await page.locator('home-light .home-light__line').click();
  await expect(bar).toBeVisible();
};
const slider = (page) => page.locator('home-light input[type="range"]');
/** Scrub the day to `hh:mm`. */
const scrub = async (page, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  await openBar(page);
  await slider(page).fill(String(h * 60 + m));
};
/** Choose a mode in the footer's <luz-mode>, as a click on its radio does. */
const chooseMode = (page, value) => page.locator(`luz-mode input[value="${value}"]`).evaluate((input) => /** @type {HTMLInputElement} */ (input).click());
/** The hours <luz-mode>.preview() was given, in order. */
const spyPreview = (page) =>
  page.evaluate(() => {
    const mode = /** @type {any} */ (document.querySelector('luz-mode'));
    const calls = [];
    const original = mode.preview;
    mode.preview = function (x) {
      calls.push(x);
      return original.call(this, x);
    };
    /** @type {any} */ (window).__previews = calls;
  });
const previews = (page) => page.evaluate(() => /** @type {any} */ (window).__previews);

/** The files the page asks for under apps/landing/light/ (their names without .js). */
function trackChunks(page) {
  const seen = [];
  page.on('request', (request) => {
    const match = new URL(request.url()).pathname.match(/^\/apps\/landing\/light\/([\w-]+)\.js$/);
    if (match) seen.push(match[1]);
  });
  return seen;
}

/* ---- Without JavaScript ------------------------------------------------- */

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [route] of ROUTES) {
    test(`${route}: the hero is complete, and the light section is an empty element with a heading`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.luz-landing-hero h1')).toBeVisible();
      await expect(page.locator('.luz-landing-hero .luz-landing-hero__lead')).toBeVisible();
      await expect(page.locator('.luz-landing-hero a.luz-btn')).toHaveCount(2);
      const light = page.locator('section#light');
      await expect(light).toHaveCount(1);
      await expect(light.locator('h2')).toHaveText(/\S/);
      await expect(light.locator('home-light')).toHaveCount(1);
      expect(await light.locator('home-light').evaluate((el) => ({ children: el.childElementCount, text: (el.textContent ?? '').trim() }))).toEqual({ children: 0, text: '' });
    });

    test(`${route}: light.css reserves the height of the visual, so it does not jump in`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route);
      await expect(page.locator('home-light')).toHaveCount(1);
      const box = await page.locator('home-light').boundingBox();
      expect(box?.height ?? 0).toBeGreaterThan(200);
      await page.setViewportSize({ width: 320, height: 800 });
      expect((await page.locator('home-light').boundingBox())?.height ?? 0).toBeGreaterThan(150);
    });
  }

  test('no script, no stylesheet other than the page\'s: light.css loads, and no light.js request is made', async ({ page }) => {
    const requests = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(requests).toContain('/apps/landing/light/light.css');
    expect(requests.filter((p) => p.endsWith('.js'))).toEqual([]);
  });
});

/* ---- With JavaScript ---------------------------------------------------- */

test.describe('with JavaScript', () => {
  test.beforeEach(() => {
    test.skip(jsOff(), 'needs JavaScript');
  });

  /* -- No errors, no third party ----------------------------------------- */

  for (const [route] of ROUTES) {
    for (const query of ['', '?look=city']) {
      test(`${route}${query}: no page error, no failed request, nothing from another origin`, async ({ page }) => {
        const problems = [];
        const foreign = [];
        page.on('pageerror', (e) => problems.push(e.message));
        page.on('response', (r) => {
          if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`);
        });
        page.on('request', (r) => {
          if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) foreign.push(r.url());
        });
        await open(page, route + query);
        await page.waitForLoadState('networkidle');
        await openBar(page);
        await scrub(page, '03:00');
        await scrub(page, '15:00');
        expect(problems).toEqual([]);
        expect(foreign).toEqual([]);
      });
    }
  }

  /* -- The page reads the light ------------------------------------------ */

  test('writes --sun-x, --sun-alt on <html>; the sun moves from the east side to the west side over the day', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await scrub(page, '07:30');
    await expect.poll(async () => (await html(page)).sunX).toMatch(/^\d+(\.\d+)?%$/);
    const morning = await html(page);
    await scrub(page, '19:30');
    await expect.poll(async () => (await html(page)).sunX).not.toBe(morning.sunX);
    const evening = await html(page);
    expect(parseFloat(morning.sunX), 'the morning sun is on the right of the centre (east)').toBeGreaterThan(50);
    expect(parseFloat(evening.sunX), 'the evening sun is on the left of the centre (west)').toBeLessThan(50);
    expect(parseFloat(morning.sunAlt)).not.toBe(parseFloat(evening.sunAlt));
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--day-left'))).toMatch(/%$/);
  });

  test('--sun-x follows the globe\'s own sun', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await expect.poll(async () => (await html(page)).sunX).toMatch(/^\d+(\.\d+)?%$/);
  });

  /* -- The slider and Live call <luz-mode>.preview() --------------------- */

  test('in Auto the slider scrubs the page: data-light and data-theme follow the hour, and Live returns', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await expect.poll(async () => (await html(page)).light).toBe('afternoon');
    expect((await html(page)).theme).toBe('light');
    await spyPreview(page);

    await scrub(page, '23:30');
    await expect.poll(async () => (await html(page)).light).toBe('night');
    expect((await html(page)).theme).toBe('dark');
    await scrub(page, '06:00');
    await expect.poll(async () => (await html(page)).light).toBe('dawn');
    expect((await html(page)).theme).toBe('dark');
    await scrub(page, '09:30');
    await expect.poll(async () => (await html(page)).light).toBe('morning');
    expect((await html(page)).theme).toBe('light');

    // <luz-mode> was asked, with an hour from 0 to 24
    const hours = await previews(page);
    expect(hours.length).toBeGreaterThan(0);
    expect(hours.every((h) => typeof h === 'number' && h >= 0 && h <= 24)).toBe(true);
    expect(Math.abs(hours.at(-1) - 9.5)).toBeLessThan(0.02);

    // No Back to now button any more: closing the bar brings the light back to now
    await expect(page.locator('home-light .home-light__live')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await html(page)).light).toBe('afternoon');
    expect((await html(page)).theme).toBe('light');
    expect((await previews(page)).at(-1)).toBeNull();
  });

  test('with a fixed mode the theme stays and data-light follows the hour; Live gives the mode\'s own light back', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await chooseMode(page, 'dark');
    await expect.poll(async () => (await html(page)).theme).toBe('dark');
    await expect.poll(async () => (await html(page)).light).toBe('night');

    await scrub(page, '09:30');
    await expect.poll(async () => (await html(page)).light).toBe('morning');
    expect((await html(page)).theme, 'the chosen mode stays').toBe('dark');
    await scrub(page, '19:00');
    await expect.poll(async () => (await html(page)).light).toBe('sunset');
    expect((await html(page)).theme).toBe('dark');

    await page.keyboard.press('Escape');
    await expect.poll(async () => (await html(page)).light).toBe('night');
    expect((await html(page)).theme).toBe('dark');
  });

  test('the slider is a keyboard control named from the catalog, and its value text says the hour', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    const range = page.getByRole('slider', { name: text('en', 'Scrub the day') });
    await expect(range).toHaveCount(1);
    await range.focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await html(page)).light).toBe('night');
    await expect(range).toHaveAttribute('aria-valuetext', /23:59$/);
    await page.keyboard.press('Home');
    await expect(range).toHaveAttribute('aria-valuetext', /00:00$/);
    await page.keyboard.press('Escape');
    await expect(page.locator('home-light .home-light__bar')).toBeHidden();
  });

  test('the button under the visual opens and closes the bar, and says so by aria-expanded', async ({ page }) => {
    await open(page);
    const line = page.locator('home-light .home-light__line');
    await expect(line).toHaveAttribute('aria-expanded', 'false');
    await expect(line).toHaveAccessibleName(new RegExp(text('en', 'Show the light bar').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await line.click();
    await expect(line).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('home-light .home-light__bar')).toBeVisible();
    await line.click();
    await expect(line).toHaveAttribute('aria-expanded', 'false');
  });

  /* -- <luz-mode> is the only writer ------------------------------------- */

  test('without <luz-mode> the visuals follow the slider and nothing writes data-theme or data-light', async ({ page }) => {
    // The module that defines <luz-mode> is replaced by an empty one: the page has the element, nobody upgrades it
    for (const file of ['mode.js', 'mode.min.js']) {
      await page.route(`**/packages/site/dist/${file}`, (route) => route.fulfill({ contentType: 'text/javascript', body: 'export {};' }));
    }
    await open(page, '/', { time: '14:00' });
    expect(await page.evaluate(() => !!customElements.get('luz-mode'))).toBe(false);
    const before = await html(page);
    // From here on every write of the two attributes is recorded; the boot script ran before
    await page.evaluate(() => {
      const writes = [];
      /** @type {any} */ (window).__writes = writes;
      new MutationObserver((records) => {
        for (const r of records) writes.push({ name: r.attributeName, from: r.oldValue, to: document.documentElement.getAttribute(r.attributeName ?? '') });
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-light'], attributeOldValue: true });
    });
    await scrub(page, '03:00');
    await expect.poll(async () => (await html(page)).sunAlt).not.toBe(before.sunAlt);
    const night = await html(page);
    await scrub(page, '13:00');
    await expect.poll(async () => (await html(page)).sunAlt).not.toBe(night.sunAlt);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2500); // two ticks of the controller
    expect(await page.evaluate(() => /** @type {any} */ (window).__writes)).toEqual([]);
    expect(await html(page)).toMatchObject({ theme: before.theme, light: before.light });
  });

  /* -- One look: the puzzle globe ------------------------------------------ */

  test('the bar has no look buttons: there is one look and nothing to choose', async ({ page }) => {
    await open(page);
    await openBar(page);
    await expect(page.locator('[data-look]')).toHaveCount(0);
    await expect(page.locator('home-light .home-light__group')).toHaveCount(0);
    await expect(page.locator('home-city, home-map')).toHaveCount(0);
  });

  test('the city and the map are gone: only light.js, globe.js and globe-data.js are ever requested from apps/landing/light/', async ({ page }) => {
    const chunks = trackChunks(page);
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    expect(chunks).not.toContain('city');
    expect(chunks).not.toContain('map');
    expect(chunks).not.toContain('puzzle');
    expect([...new Set(chunks)].sort()).toEqual(['globe', 'globe-data', 'light']);
  });

  test('globe-data.js is requested once, and after it the globe carries the attribute land and its pieces have a shape', async ({ page }) => {
    const chunks = trackChunks(page);
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
    const pieces = page.locator('home-globe path.home-globe__piece');
    expect(await pieces.count(), 'a path.home-globe__piece for the countries').toBeGreaterThan(0);
    const shapes = await pieces.evaluateAll((paths) => paths.map((path) => path.getAttribute('d') ?? ''));
    expect(shapes.some((d) => d.trim().length > 0), 'at least one piece has a non-empty d').toBe(true);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(chunks.filter((c) => c === 'globe-data'), 'globe-data.js requested once').toHaveLength(1);
    expect(chunks.filter((c) => c === 'globe')).toHaveLength(1);
  });

  test('until the data has arrived the globe is drawn without land, and has no land attribute; when it comes the land appears', async ({ page }) => {
    let release = () => {};
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/apps/landing/light/globe-data.js', async (route) => {
      await gate;
      await route.continue();
    });
    const asked = page.waitForRequest('**/apps/landing/light/globe-data.js', { timeout: 15000 });
    await open(page);
    await asked; // the data is asked for once the globe is on screen and the browser is idle
    const globe = page.locator('home-globe');
    await expect(globe).toBeVisible();
    await expect(globe).not.toHaveAttribute('land', /.*/);
    await expect(globe.locator('.home-globe__sea')).toHaveCount(1);
    const drawn = () => globe.locator('path.home-globe__piece').evaluateAll((paths) => paths.map((path) => path.getAttribute('d') ?? '').filter((d) => d.trim()));
    expect(await drawn(), 'no piece of land yet').toEqual([]);
    release();
    await expect(globe).toHaveAttribute('land', /.*/, { timeout: 15000 });
    expect((await drawn()).length, 'land is drawn').toBeGreaterThan(0);
  });

  test('the land is loaded even when the browser asks to save data (Save-Data, by the owner\'s decision)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '2g', addEventListener() {}, removeEventListener() {} } });
    });
    await page.route('**/*', (route) => route.continue({ headers: { ...route.request().headers(), 'save-data': 'on' } }));
    const chunks = trackChunks(page);
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
    expect(chunks).toContain('globe-data');
  });

  test('?look=city is ignored: the globe is shown, whatever the parameter says', async ({ page }) => {
    const chunks = trackChunks(page);
    await open(page, '/?look=city');
    await expect(page.locator('home-globe')).toBeVisible();
    await expect(page.locator('home-city, home-map')).toHaveCount(0);
    await expect(page.locator('home-light')).not.toHaveAttribute('look', /.*/);
    expect(chunks).not.toContain('city');
  });

  test('nothing is remembered: a load and a scrub write no luz-home-light key', async ({ page }) => {
    await open(page);
    await page.waitForLoadState('networkidle');
    await scrub(page, '10:00');
    expect(await page.evaluate(() => localStorage.getItem('luz-home-light'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('luz-theme'))).toBeNull();
  });

  /* -- Reduced motion ------------------------------------------------------ */

  /** Count the animation frames the light's own files ask for during `ms`. */
  async function framesAsked(page, ms) {
    await page.evaluate(() => {
      /** @type {any} */ (window).__frames = 0;
    });
    await page.waitForTimeout(ms);
    return page.evaluate(() => /** @type {any} */ (window).__frames);
  }
  const countFrames = (page) =>
    page.addInitScript(() => {
      const ask = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => {
        if (/\/apps\/landing\/light\//.test(new Error().stack ?? '')) /** @type {any} */ (window).__frames = ((/** @type {any} */ (window).__frames) ?? 0) + 1;
        return ask(callback);
      };
    });

  test('reduced motion: the globe asks for no continuous animation frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await countFrames(page);
    await open(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    expect(await framesAsked(page, 1500)).toBe(0);
  });

  test('control: with motion welcome the globe does ask for frames (the probe sees them)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await countFrames(page);
    await open(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    expect(await framesAsked(page, 1500)).toBeGreaterThan(10);
  });

  test('reduced motion: the land still comes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
  });

  /* -- Texts from the catalog ----------------------------------------------- */

  for (const [route, lang] of ROUTES) {
    test(`${route}: the phrase under the visual and the names in the bar are the catalog's (${lang})`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('home-light .home-light__q')).toHaveText(text(lang, PHRASE));
      await openBar(page);
      await scrub(page, '10:00');
      await expect(page.getByRole('slider', { name: text(lang, 'Scrub the day') })).toHaveCount(1);
      await expect(page.locator('home-light .home-light__line')).toHaveAccessibleName(new RegExp(text(lang, 'Show the light bar').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  }

  test('the English phrase is what the catalog says (D11), and the other languages differ', async () => {
    expect(text('en', PHRASE)).toBe(PHRASE);
    expect(text('es', PHRASE)).not.toBe(PHRASE);
    expect(text('ar', PHRASE)).not.toBe(PHRASE);
  });

  /* -- The favicon ------------------------------------------------------------ */

  test('favicon: the page\'s icon becomes a data: SVG of the sun and the moon', async ({ page }) => {
    await open(page);
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll('link[rel~="icon"]')].some((link) => /** @type {HTMLLinkElement} */ (link).href.startsWith('data:image/svg+xml'))), { timeout: 8000 })
      .toBe(true);
  });

  /* -- Layout ----------------------------------------------------------------- */

  for (const [route, lang] of [['/', 'en'], ['/ar/', 'ar']]) {
    test(`320 px: no horizontal scroll (${lang}), the bar closed and open`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await open(page, route);
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(await overflow()).toBeLessThanOrEqual(1);
      await openBar(page);
      expect(await overflow()).toBeLessThanOrEqual(1);
      const bar = await page.locator('home-light .home-light__bar').boundingBox();
      expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeLessThanOrEqual(321);
      expect(bar?.x ?? 0).toBeGreaterThanOrEqual(-1);
    });
  }

  for (const [width, height] of [[1280, 800], [375, 800]]) {
    test(`no layout shift at ${width} px: the hero and the light section are where JavaScript off puts them`, async ({ page, browser }) => {
      await page.setViewportSize({ width, height });
      await open(page, '/', { time: '14:00' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      const boxes = (/** @type {import('@playwright/test').Page} */ p) =>
        p.evaluate(() => {
          const box = (/** @type {string} */ selector) => {
            const r = document.querySelector(selector)?.getBoundingClientRect();
            return r ? { top: Math.round(r.top + window.scrollY), height: Math.round(r.height), width: Math.round(r.width) } : null;
          };
          return { hero: box('.luz-landing-hero'), light: box('section#light'), element: box('home-light') };
        });
      const withScript = await boxes(page);

      const bare = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height }, timezoneId: TIMEZONE });
      const off = await bare.newPage();
      await off.goto('/');
      const withoutScript = await boxes(off);
      await bare.close();

      expect(withScript.light, 'section#light exists').not.toBeNull();
      expect(withoutScript.light, 'section#light exists without JavaScript').not.toBeNull();
      for (const part of ['hero', 'light', 'element']) {
        expect(Math.abs(withScript[part].top - withoutScript[part].top), `${part} top`).toBeLessThanOrEqual(1);
        expect(Math.abs(withScript[part].height - withoutScript[part].height), `${part} height`).toBeLessThanOrEqual(1);
        expect(Math.abs(withScript[part].width - withoutScript[part].width), `${part} width`).toBeLessThanOrEqual(1);
      }
    });
  }

  /* -- axe under the six lights ------------------------------------------------ */

  const BLOCKING = ['serious', 'critical'];
  const violations = async (page) => {
    const { violations: found } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    return found.filter((v) => BLOCKING.includes(v.impact ?? '')).map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) - ${v.nodes[0]?.target?.join(' ')}`);
  };

  for (const [light, time, mode] of LIGHTS) {
    test(`axe: / in the ${light} light (${time}, ${mode}), the land drawn`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await open(page, '/', { time });
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
      await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      await faded(page);
      expect(await violations(page), 'serious/critical axe violations').toEqual([]);
    });

    test(`axe: / with the bar open in the ${light} light (${time})`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await open(page, '/', { time });
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
      await page.waitForLoadState('networkidle');
      await openBar(page);
      await faded(page);
      expect(await violations(page), 'serious/critical axe violations').toEqual([]);
    });
  }

  for (const [route] of ROUTES.slice(1)) {
    test(`axe: ${route} with the bar open`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await open(page, route, { time: '14:00' });
      await openBar(page);
      await faded(page);
      expect(await violations(page), 'serious/critical axe violations').toEqual([]);
    });
  }
});

/* ---- Review fixes (F3, review of 2026-10-16) ------------------------------ */

test.describe('review fixes', () => {
  test.beforeEach(() => {
    test.skip(jsOff(), 'needs JavaScript');
  });

  const line = (page) => page.locator('home-light .home-light__line');
  const output = (page) => page.locator('home-light output');

  /** The text of the line a reader sees: text nodes with a box, not the screen-reader-only ones (1 px, clipped). */
  const visibleText = (locator) =>
    locator.evaluate((el) => {
      const out = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = range.getBoundingClientRect();
        const style = getComputedStyle(parent);
        if (box.width > 2 && box.height > 2 && style.visibility !== 'hidden' && style.clipPath === 'none') out.push(node.textContent);
      }
      return out.join('');
    });

  /* -- 1. Tab order -------------------------------------------------------- */

  test('after opening the bar from the line, the next Tab lands inside the bar, and the bar is still drawn above the line', async ({ page }) => {
    await open(page);
    await line(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('home-light .home-light__bar')).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('home-light .home-light__bar')), 'focus is inside the bar').toBe(true);
    // Both boxes in one frame: the page scrolls smoothly to the focused control, so two reads apart would race it
    const [bar, under] = await page.evaluate(() => [document.querySelector('home-light .home-light__bar'), document.querySelector('home-light .home-light__line')].map((el) => el?.getBoundingClientRect().y ?? NaN));
    expect(bar, 'the bar is above the line').toBeLessThan(under);
  });

  /* -- 2. aria-valuetext --------------------------------------------------- */

  for (const [route, lang] of ROUTES) {
    test(`${route}: the slider's aria-valuetext is the phase name and the hour, joined by the catalog's separator (${lang})`, async ({ page }) => {
      const cat = catalog(lang);
      expect(typeof cat['light.sep'], 'light.sep is a key of the catalog').toBe('string');
      await open(page, route, { time: '14:00' });
      await scrub(page, '09:30');
      await expect.poll(async () => (await html(page)).light).toBe('morning');
      // The hour is not shown in the bar any more (the owner's cut, 2026-10-17): the slider still says it
      const prefix = `${cat['light.morning']}${cat['light.sep']}`;
      await expect.poll(async () => (await slider(page).getAttribute('aria-valuetext')) ?? '').toMatch(/[0-9\u0660-\u0669]{2}\D[0-9\u0660-\u0669]{2}$/);
      const expected = (await slider(page).getAttribute('aria-valuetext')) ?? '';
      expect(expected.startsWith(prefix), `"${expected}" starts with "${prefix}"`).toBe(true);
      if (lang === 'en') expect(expected).toBe('Morning light, 09:30');
      if (lang === 'ar') {
        const valuetext = (await slider(page).getAttribute('aria-valuetext')) ?? '';
        expect(valuetext).toContain('\u060C');
        expect(valuetext).not.toContain(', ');
      }
    });
  }

  /* -- 3. The bar shows no hour, and nothing is a live region ------------------- */

  test('the bar shows no hour (no <output>), and nothing in the light is a status or a polite live region', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    await expect(output(page)).toHaveCount(0);
    await slider(page).fill('600');
    expect(await visibleText(page.locator('home-light .home-light__bar')), 'no hour in the bar').not.toMatch(/[0-9\u0660-\u0669]{1,2}\D[0-9\u0660-\u0669]{2}/);
    expect(await page.locator('home-light').evaluate((el) => el.querySelectorAll('[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"])').length)).toBe(0);
  });

  /* -- 4. Forced colours ------------------------------------------------------- */

  test('forced colors: the slider track has a background colour of its own', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    await faded(page);
    const clear = (colour) => /^(transparent|rgba\(.*,\s*0\))$/.test(colour);
    const track = await slider(page).evaluate((input) => getComputedStyle(input, '::-webkit-slider-runnable-track').backgroundColor);
    expect(clear(track), `the track is drawn in a colour of the system, not "${track}"`).toBe(false);
  });

  /* -- 5. The globe is an image, not a control ---------------------------------- */

  test('the globe is not focusable, and its name does not talk about arrow keys', async ({ page }) => {
    await open(page);
    const globe = page.locator('home-globe');
    expect(await globe.evaluate((el) => ({ attribute: el.hasAttribute('tabindex'), index: /** @type {HTMLElement} */ (el).tabIndex }))).toEqual({ attribute: false, index: -1 });
    await globe.evaluate((el) => /** @type {HTMLElement} */ (el).focus());
    expect(await page.evaluate(() => document.activeElement?.tagName.toLowerCase())).not.toBe('home-globe');
    const name = (await globe.getAttribute('aria-label')) ?? '';
    expect(name.length).toBeGreaterThan(0);
    expect(name).not.toMatch(/arrow/i);
  });

  test('dragging the globe with the pointer still turns it', async ({ page }) => {
    await open(page);
    const globe = page.locator('home-globe');
    await expect(globe).toHaveAttribute('land', /.*/, { timeout: 15000 });
    const dots = () => globe.evaluate((el) => [...el.querySelectorAll('path.home-globe__piece')].map((p) => p.getAttribute('d')).join('|'));
    const before = await dots();
    expect(before.replace(/\|/g, ''), 'the pieces are drawn before the drag').not.toBe('');
    const box = await globe.boundingBox();
    const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const y = (box?.y ?? 0) + (box?.height ?? 0) / 3;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 6 });
    await page.mouse.move(x + 120, y + 10, { steps: 6 });
    await page.mouse.up();
    await expect.poll(dots).not.toBe(before);
  });

  /* -- 6. The line shows the phrase only: no light's name, no hour (the owner's cut, 2026-10-17) -- */

  for (const [route, lang] of ROUTES) {
    test(`${route}: the line's visible text is the phrase, with no light's name and no hour (${lang})`, async ({ page }) => {
      const cat = catalog(lang);
      const phases = ['dawn', 'morning', 'afternoon', 'sunset', 'dusk', 'night'].map((phase) => cat[`light.${phase}`]);
      await open(page, route, { time: '14:00' });
      const shown = await visibleText(line(page));
      expect(shown).toContain(cat['light.say.globe']);
      expect(phases.filter((name) => shown.includes(name)), 'no light name on the line').toEqual([]);
      expect(shown, 'no hour on the line').not.toMatch(/[0-9\u0660-\u0669]{1,2}\D[0-9\u0660-\u0669]{2}/);
    });
  }

  /* -- 6b. The globe rises behind the hero's buttons (the owner's sketch, 2026-10-17) -- */

  for (const width of [375, 1024, 1440]) {
    test(`${width} px: the globe's top edge is behind the hero's buttons, which stay on top and can be clicked`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, '/');
      await expect(page.locator('home-globe[land]')).toHaveCount(1);
      const m = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('#hero .luz-btn')];
        const low = buttons.map((b) => b.getBoundingClientRect()).reduce((a, r) => (r.bottom > a.bottom ? r : a));
        const rim = document.querySelector('home-globe .home-globe__rim').getBoundingClientRect();
        const onTop = buttons.every((b) => {
          const r = b.getBoundingClientRect();
          return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        });
        return { rimTop: rim.top, top: low.top, bottom: low.bottom, onTop };
      });
      expect(m.rimTop, "the globe's top edge is not above the lowest button").toBeGreaterThanOrEqual(m.top);
      expect(m.rimTop, "the globe's top edge is not below the lowest button").toBeLessThanOrEqual(m.bottom);
      expect(m.onTop, 'each button is the element at its centre').toBe(true);
    });
  }

  test('the line has no mark under the phrase: the phrase alone opens the bar', async ({ page }) => {
    await open(page, '/');
    await expect(line(page).locator('svg, .home-light__mark')).toHaveCount(0);
    await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
  });

  /* -- 6c. The slider's thumb is a sun by day and a moon by night -------------- */

  test("the slider's thumb is a sun while the scrubbed hour is day, a moon while it is night", async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    await scrub(page, '12:00');
    await expect(page.locator('home-light')).toHaveAttribute('data-sky', 'day');
    await scrub(page, '23:30');
    await expect(page.locator('home-light')).toHaveAttribute('data-sky', 'night');
    // Chromium's getComputedStyle does not reach the thumb: read the rules that draw it
    const rules = await page.evaluate(() => {
      const all = [...document.styleSheets].flatMap((sheet) => {
        try {
          return [...sheet.cssRules];
        } catch {
          return [];
        }
      });
      const thumb = all.filter((r) => r.selectorText?.includes('::-webkit-slider-thumb') && r.selectorText.includes('home-light'));
      const night = thumb.find((r) => r.selectorText.includes('[data-sky="night"]'));
      const day = thumb.find((r) => !r.selectorText.includes('[data-sky'));
      return { day: day?.style.background || day?.style.backgroundColor || '', night: night?.style.background || night?.style.backgroundColor || '' };
    });
    expect(rules.night, 'a rule draws the thumb at night').not.toBe('');
    expect(rules.night, 'the night thumb is not the day thumb').not.toBe(rules.day);
  });

  /* -- 6d. The phrase sits 10 px lower than the light's box ---------------------- */

  test('the line sits 10 px below the bottom of the light', async ({ page }) => {
    await open(page, '/');
    const d = await page.evaluate(() => document.querySelector('home-light .home-light__line').getBoundingClientRect().bottom - document.querySelector('home-light').getBoundingClientRect().bottom);
    expect(Math.abs(d - 10), `the line's bottom is ${d}px below the light's`).toBeLessThanOrEqual(1);
  });

  /* -- 7. No Back to now: closing the bar brings the light back to now ------------ */

  test('the bar has no Back to now button, and clicking the line to close it brings the light back to now', async ({ page }) => {
    await open(page, '/', { time: '14:00' });
    await openBar(page);
    await expect(page.locator('home-light .home-light__live')).toHaveCount(0);
    await scrub(page, '23:30');
    await expect.poll(async () => (await html(page)).light).toBe('night');
    await line(page).click();
    await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(async () => (await html(page)).light).toBe('afternoon');
  });

  /* -- 7b. The line spans the whole width, on the bar's frosted glass ------------- */

  test('the line spans the width of the light, on the same frosted background as the bar', async ({ page }) => {
    await open(page, '/');
    await openBar(page);
    const m = await page.evaluate(() => {
      const light = document.querySelector('home-light').getBoundingClientRect();
      const lineEl = document.querySelector('home-light .home-light__line');
      const bar = getComputedStyle(document.querySelector('home-light .home-light__bar'));
      const ls = getComputedStyle(lineEl);
      return { light: light.width, line: lineEl.getBoundingClientRect().width, lineBlur: ls.backdropFilter, barBlur: bar.backdropFilter, lineBg: ls.backgroundColor, barBg: bar.backgroundColor };
    });
    expect(m.line, 'the line is as wide as the light').toBeGreaterThanOrEqual(m.light - 1);
    expect(m.lineBlur).toBe(m.barBlur);
    expect(m.lineBg).toBe(m.barBg);
  });

  /* -- 7c. Stars at the top of the page, in the dark lights only -------------------- */

  for (const [light, time, mode] of LIGHTS) {
    const dark = ['dawn', 'dusk', 'night'].includes(light);
    test(`${light} (${time}): ${dark ? 'faint stars at the top of the page' : 'no stars'}`, async ({ page }) => {
      await open(page, '/', { time });
      await expect.poll(async () => (await html(page)).light).toBe(light);
      expect(mode).toBe(dark ? 'dark' : 'light');
      await expect
        .poll(() => page.evaluate(() => {
          const s = getComputedStyle(document.body, '::before');
          return { stars: s.content !== 'none' && /radial-gradient/.test(s.backgroundImage) && parseFloat(s.opacity) > 0, events: s.pointerEvents };
        }))
        .toEqual({ stars: dark, events: 'none' });
    });
  }

  /* -- 8. The line is readable over what is behind it ------------------------------- */

  /**
   * The worst contrast of the line's text over the pixels actually drawn behind it:
   * the text is made transparent, the area of the text is photographed, and every
   * pixel is measured against the text colour, the worst one counts. Decoded in a
   * second page, with a canvas.
   */
  async function behindTheLine(page) {
    const target = line(page);
    await target.scrollIntoViewIfNeeded();
    const prepared = await target.evaluate(async (el) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.fillStyle = getComputedStyle(el).color;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      const style = document.createElement('style');
      style.id = 'probe-hide-text';
      style.textContent = 'home-light .home-light__line, home-light .home-light__line * { color: transparent !important; text-shadow: none !important; transition: none !important; }';
      document.head.append(style);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const box of range.getClientRects()) {
          if (box.width < 2 || box.height < 2) continue;
          left = Math.min(left, box.left);
          top = Math.min(top, box.top);
          right = Math.max(right, box.right);
          bottom = Math.max(bottom, box.bottom);
        }
      }
      return { text: [r, g, b, a / 255], clip: { x: Math.floor(left), y: Math.floor(top), width: Math.ceil(right - left) + 1, height: Math.ceil(bottom - top) + 1 } };
    });
    let png;
    try {
      png = await page.screenshot({ clip: prepared.clip, animations: 'disabled' });
    } finally {
      await page.evaluate(() => document.getElementById('probe-hide-text')?.remove());
    }
    const reader = await page.context().newPage();
    try {
      await reader.goto('about:blank');
      return await reader.evaluate(
        async ({ data, text }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${data}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const lum = (r, g, b) => {
            const c = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
          };
          const ratios = [];
          for (let i = 0; i < pixels.length; i += 4) {
            const [pr, pg, pb] = [pixels[i], pixels[i + 1], pixels[i + 2]];
            const mix = (fg, bg) => fg * text[3] + bg * (1 - text[3]);
            const a = lum(mix(text[0], pr), mix(text[1], pg), mix(text[2], pb)), b = lum(pr, pg, pb);
            ratios.push((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
          }
          ratios.sort((x, y) => x - y);
          return { worst: ratios[0], pixels: ratios.length };
        },
        { data: png.toString('base64'), text: prepared.text },
      );
    } finally {
      await reader.close();
    }
  }

  for (const width of [375, 1280]) {
    for (const [light, time, mode] of LIGHTS) {
      test(`${width} px, ${light} light: the line's text has 4.5:1 over what is behind it, the land drawn`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page, '/', { time });
        await expect(page.locator('home-globe[land]')).toHaveCount(1, { timeout: 15000 });
        await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
        await page.waitForLoadState('networkidle');
        await faded(page);
        await page.waitForTimeout(1500); // the colour of the line and the glow of the visual settle
        const { worst, pixels } = await behindTheLine(page);
        expect(pixels).toBeGreaterThan(50);
        expect(worst, `the worst contrast of the line's text over its background: ${worst.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
