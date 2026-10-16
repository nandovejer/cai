// @ts-check
/**
 * <home-light> on the home page (F3 of .claude/plans/luz-home-docs-identity.md,
 * section 3.7; D8, D11). The element sits in section#light after the hero:
 *
 *   <home-light looks="globe city map" look="random" remember bleed favicon>
 *
 * It draws the sun and the moon where the visitor is (the zone of Intl, no
 * network), over a globe, a city or a map. It does not own the colour mode:
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
 * `[data-look]` the buttons of the looks, the slider (a range input named
 * "Scrub the day"), `.home-light__live` the Live button, `.home-light__q` the
 * phrase, and one of <home-globe>, <home-city>, <home-map> for the look.
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
const PHRASE = {
  globe: 'A design system is a world with its own laws of light.',
  city: 'A city is built piece by piece. So is a design system.',
  map: 'The map is not the territory, but it looks like it.',
};
const LOOKS = ['globe', 'city', 'map'];
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
 * @param {{ look?: string, time?: string }} [options] look: the ?look= of the URL, time: the clock (hh:mm, Madrid)
 */
async function open(page, path = '/', { look, time } = {}) {
  if (time) await atTime(page, time);
  await page.goto(look ? `${path}?look=${look}` : path);
  await expect(page.locator('home-light .home-light__line')).toBeVisible();
  await expect(page.locator('home-light').locator('home-globe, home-city, home-map').filter({ visible: true })).toHaveCount(1);
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

/** The files the page asks for under apps/landing/light/. */
function trackChunks(page) {
  const seen = [];
  page.on('request', (request) => {
    const match = new URL(request.url()).pathname.match(/^\/apps\/landing\/light\/(\w+)\.js$/);
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
    for (const look of [undefined, ...LOOKS]) {
      test(`${route}${look ? `?look=${look}` : ''}: no page error, no failed request, nothing from another origin`, async ({ page }) => {
        const problems = [];
        const foreign = [];
        page.on('pageerror', (e) => problems.push(e.message));
        page.on('response', (r) => {
          if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`);
        });
        page.on('request', (r) => {
          if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) foreign.push(r.url());
        });
        await open(page, route, { look });
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
    await open(page, '/', { look: 'city', time: '14:00' });
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

  test('--sun-x also follows the globe\'s own sun when the look is the globe', async ({ page }) => {
    await open(page, '/', { look: 'globe', time: '14:00' });
    await expect.poll(async () => (await html(page)).sunX).toMatch(/^\d+(\.\d+)?%$/);
  });

  /* -- The slider and Live call <luz-mode>.preview() --------------------- */

  test('in Auto the slider scrubs the page: data-light and data-theme follow the hour, and Live returns', async ({ page }) => {
    await open(page, '/', { look: 'city', time: '14:00' });
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

    const live = page.locator('home-light .home-light__live');
    await expect(live).toBeVisible();
    await expect(live).toHaveText(text('en', 'Live'));
    await live.click();
    await expect.poll(async () => (await html(page)).light).toBe('afternoon');
    expect((await html(page)).theme).toBe('light');
    expect((await previews(page)).at(-1)).toBeNull();
    await expect(live).toBeHidden();
  });

  test('with a fixed mode the theme stays and data-light follows the hour; Live gives the mode\'s own light back', async ({ page }) => {
    await open(page, '/', { look: 'city', time: '14:00' });
    await chooseMode(page, 'dark');
    await expect.poll(async () => (await html(page)).theme).toBe('dark');
    await expect.poll(async () => (await html(page)).light).toBe('night');

    await scrub(page, '09:30');
    await expect.poll(async () => (await html(page)).light).toBe('morning');
    expect((await html(page)).theme, 'the chosen mode stays').toBe('dark');
    await scrub(page, '19:00');
    await expect.poll(async () => (await html(page)).light).toBe('sunset');
    expect((await html(page)).theme).toBe('dark');

    await page.locator('home-light .home-light__live').click();
    await expect.poll(async () => (await html(page)).light).toBe('night');
    expect((await html(page)).theme).toBe('dark');
  });

  test('the slider is a keyboard control named from the catalog, and its output shows the hour', async ({ page }) => {
    await open(page, '/', { look: 'map', time: '14:00' });
    await openBar(page);
    const range = page.getByRole('slider', { name: text('en', 'Scrub the day') });
    await expect(range).toHaveCount(1);
    await range.focus();
    await page.keyboard.press('End');
    await expect.poll(async () => (await html(page)).light).toBe('night');
    await expect(page.locator('home-light output')).toHaveText(/23:59/);
    await page.keyboard.press('Home');
    await expect(page.locator('home-light output')).toHaveText(/00:00/);
    await page.keyboard.press('Escape');
    await expect(page.locator('home-light .home-light__bar')).toBeHidden();
  });

  test('the button under the visual opens and closes the bar, and says so by aria-expanded', async ({ page }) => {
    await open(page, '/', { look: 'city' });
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
    await open(page, '/', { look: 'city', time: '14:00' });
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
    await page.locator('home-light .home-light__live').click();
    await page.locator('home-light [data-look="map"]').click();
    await expect(page.locator('home-map')).toBeVisible();
    await page.waitForTimeout(2500); // two ticks of the controller
    expect(await page.evaluate(() => /** @type {any} */ (window).__writes)).toEqual([]);
    expect(await html(page)).toMatchObject({ theme: before.theme, light: before.light });
  });

  /* -- The looks ---------------------------------------------------------- */

  for (const look of LOOKS) {
    test(`?look=${look} wins over the random pick and loads only that visual's chunk`, async ({ page }) => {
      const chunks = trackChunks(page);
      await open(page, '/', { look });
      await expect(page.locator('home-light')).toHaveAttribute('look', look);
      await expect(page.locator(`home-${look}`)).toBeVisible();
      for (const other of LOOKS.filter((l) => l !== look)) await expect(page.locator(`home-${other}`).filter({ visible: true })).toHaveCount(0);
      expect(chunks.filter((c) => c !== 'light' && !LOOKS.includes(c))).toEqual([]);
      expect(chunks).toContain('light');
      expect(chunks.filter((c) => LOOKS.includes(c))).toEqual([look]);
    });
  }

  test('?look= wins over a remembered look, and an unknown value is ignored', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('luz-home-light', 'city'));
    await open(page, '/', { look: 'map' });
    await expect(page.locator('home-light')).toHaveAttribute('look', 'map');
    await page.goto('/?look=%3Cscript%3E');
    await expect(page.locator('home-light .home-light__line')).toBeVisible();
    expect(LOOKS).toContain(await page.locator('home-light').getAttribute('look'));
  });

  test('a look is picked at random from the three on a load without ?look=: all three appear', async ({ page }) => {
    // Math.random is seeded, so the test does not depend on luck (nine real loads miss one look 8 % of the time)
    const seen = new Set();
    for (const r of [0.05, 0.5, 0.95]) {
      const fresh = await page.context().newPage();
      await fresh.addInitScript((value) => {
        Math.random = () => value;
      }, r);
      await open(fresh, '/');
      seen.add(await fresh.locator('home-light').getAttribute('look'));
      await fresh.close();
    }
    expect([...seen].sort()).toEqual(['city', 'globe', 'map']);
  });

  test('the buttons of the looks switch the visual; each look loads its chunk once, when it is first wanted', async ({ page }) => {
    const chunks = trackChunks(page);
    await open(page, '/', { look: 'globe' });
    await openBar(page);
    await expect(page.locator('home-light [data-look]')).toHaveCount(3);
    await expect(page.locator('home-light [data-look="globe"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('home-light [data-look="city"]').click();
    await expect(page.locator('home-city')).toBeVisible();
    await expect(page.locator('home-globe').filter({ visible: true })).toHaveCount(0);
    await expect(page.locator('home-light [data-look="city"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('home-light [data-look="globe"]').click();
    await expect(page.locator('home-globe')).toBeVisible();
    expect(chunks.filter((c) => c === 'globe')).toHaveLength(1);
    expect(chunks.filter((c) => c === 'city')).toHaveLength(1);
    expect(chunks).not.toContain('map');
  });

  test('looks="none" requests no visual chunk', async ({ page }) => {
    const chunks = trackChunks(page);
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.route(/\/$/, async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch();
      const body = (await response.text()).replace(/(<home-light\b[^>]*?)\blooks="[^"]*"/, '$1looks="none"');
      await route.fulfill({ response, body });
    });
    await page.goto('/');
    await expect(page.locator('home-light[looks="none"]')).toHaveCount(1);
    await expect(page.locator('home-light .home-light__line')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(chunks.filter((c) => LOOKS.includes(c))).toEqual([]);
    for (const tag of LOOKS) expect(await page.locator(`home-${tag}`).count()).toBe(0);
    expect(problems).toEqual([]);
  });

  /* -- remember ----------------------------------------------------------- */

  test('remember stores luz-home-light only after a click on a look, and the stored value is the look', async ({ page }) => {
    await open(page, '/', { look: 'globe' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => localStorage.getItem('luz-home-light')), 'nothing is stored by a load').toBeNull();
    await scrub(page, '10:00');
    await page.locator('home-light [data-look="map"]').click();
    await expect(page.locator('home-map')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('luz-home-light'))).toBe('map');
    // core's key is not the light's
    expect(await page.evaluate(() => localStorage.getItem('luz-theme'))).toBeNull();
  });

  test('a remembered look is used on the next visit, and a value that is not an offered look is ignored', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('luz-home-light', 'city');
        sessionStorage.setItem('seeded', '1');
      }
    });
    await open(page, '/');
    await expect(page.locator('home-light')).toHaveAttribute('look', 'city');

    for (const bad of ['bogus', 'none', '{"look":"map"}', '<img src=x>', '']) {
      const fresh = await page.context().newPage();
      const errors = [];
      fresh.on('pageerror', (e) => errors.push(e.message));
      await fresh.addInitScript((value) => localStorage.setItem('luz-home-light', value), bad);
      await open(fresh, '/');
      expect(LOOKS, `a stored "${bad}" falls back to an offered look`).toContain(await fresh.locator('home-light').getAttribute('look'));
      expect(errors).toEqual([]);
      await fresh.close();
    }
  });

  test('storage that throws (a sandboxed frame) is not an error: the look is not remembered', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('denied', 'SecurityError');
        },
      });
    });
    await open(page, '/', { look: 'city' });
    await openBar(page);
    await page.locator('home-light [data-look="map"]').click();
    await expect(page.locator('home-map')).toBeVisible();
    expect(errors).toEqual([]);
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

  for (const look of LOOKS) {
    test(`reduced motion: the ${look} look asks for no continuous animation frame`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await countFrames(page);
      await open(page, '/', { look });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      expect(await framesAsked(page, 1500)).toBe(0);
    });
  }

  for (const look of ['globe', 'city']) {
    test(`control: with motion welcome the ${look} look does ask for frames (the probe sees them)`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await countFrames(page);
      await open(page, '/', { look });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      expect(await framesAsked(page, 1500)).toBeGreaterThan(10);
    });
  }

  /* -- Texts from the catalog ----------------------------------------------- */

  for (const [route, lang] of ROUTES) {
    test(`${route}: the phrase under the visual and the names in the bar are the catalog's (${lang})`, async ({ page }) => {
      for (const look of LOOKS) {
        await open(page, route, { look });
        await expect(page.locator('home-light .home-light__q')).toHaveText(text(lang, PHRASE[look]));
      }
      await openBar(page);
      await scrub(page, '10:00');
      await expect(page.locator('home-light .home-light__live')).toHaveText(text(lang, 'Live'));
      await expect(page.getByRole('slider', { name: text(lang, 'Scrub the day') })).toHaveCount(1);
      for (const [look, english] of [['globe', 'Globe'], ['city', 'City'], ['map', 'Map']]) {
        await expect(page.locator(`home-light [data-look="${look}"]`)).toHaveAccessibleName(text(lang, english));
      }
      await expect(page.locator('home-light .home-light__line')).toHaveAccessibleName(new RegExp(text(lang, 'Show the light bar').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  }

  test('the three English phrases are what the catalog says (D11), and the other languages differ', async () => {
    for (const look of LOOKS) {
      expect(text('en', PHRASE[look])).toBe(PHRASE[look]);
      expect(text('es', PHRASE[look])).not.toBe(PHRASE[look]);
      expect(text('ar', PHRASE[look])).not.toBe(PHRASE[look]);
    }
  });

  /* -- The favicon ------------------------------------------------------------ */

  test('favicon: the page\'s icon becomes a data: SVG of the sun and the moon', async ({ page }) => {
    await open(page, '/', { look: 'city' });
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll('link[rel~="icon"]')].some((link) => /** @type {HTMLLinkElement} */ (link).href.startsWith('data:image/svg+xml'))), { timeout: 8000 })
      .toBe(true);
  });

  /* -- Layout ----------------------------------------------------------------- */

  for (const look of LOOKS) {
    for (const [route, lang] of [['/', 'en'], ['/ar/', 'ar']]) {
      test(`320 px: no horizontal scroll with the ${look} look (${lang}), the bar closed and open`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 800 });
        await open(page, route, { look });
        const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(await overflow()).toBeLessThanOrEqual(1);
        await openBar(page);
        expect(await overflow()).toBeLessThanOrEqual(1);
        const bar = await page.locator('home-light .home-light__bar').boundingBox();
        expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeLessThanOrEqual(321);
        expect(bar?.x ?? 0).toBeGreaterThanOrEqual(-1);
      });
    }
  }

  for (const [width, height] of [[1280, 800], [375, 800]]) {
    test(`no layout shift at ${width} px: the hero and the light section are where JavaScript off puts them`, async ({ page, browser }) => {
      await page.setViewportSize({ width, height });
      await open(page, '/', { look: 'city', time: '14:00' });
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
    for (const look of LOOKS) {
      test(`axe: / with the ${look} look in the ${light} light (${time}, ${mode})`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'Chromium only');
        await open(page, '/', { look, time });
        await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
        await page.waitForLoadState('networkidle');
        await faded(page);
        expect(await violations(page), 'serious/critical axe violations').toEqual([]);
      });
    }

    test(`axe: / with the bar open in the ${light} light (${time})`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium only');
      await open(page, '/', { look: 'map', time });
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
      await open(page, route, { look: 'city', time: '14:00' });
      await openBar(page);
      await faded(page);
      expect(await violations(page), 'serious/critical axe violations').toEqual([]);
    });
  }
});
