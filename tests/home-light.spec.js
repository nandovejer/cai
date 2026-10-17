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
    await expect(live).toHaveText(catalog('en')['light.live']);
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
      await expect(page.locator('home-light .home-light__live')).toHaveText(catalog(lang)['light.live']);
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
    await open(page, '/', { look: 'city' });
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
      await open(page, route, { look: 'map', time: '14:00' });
      await scrub(page, '09:30');
      await expect.poll(async () => (await html(page)).light).toBe('morning');
      const hour = (await output(page).textContent())?.trim() ?? '';
      expect(hour).toMatch(/\S/);
      const expected = `${cat['light.morning']}${cat['light.sep']}${hour}`;
      await expect(slider(page)).toHaveAttribute('aria-valuetext', expected);
      if (lang === 'en') expect(expected).toBe('Morning light, 09:30');
      if (lang === 'ar') {
        const valuetext = (await slider(page).getAttribute('aria-valuetext')) ?? '';
        expect(valuetext).toContain('\u060C');
        expect(valuetext).not.toContain(', ');
      }
    });
  }

  /* -- 3. The output is not a live region ------------------------------------ */

  test('the <output> is aria-live="off", and nothing in the light is a status or a polite live region', async ({ page }) => {
    await open(page, '/', { look: 'city', time: '14:00' });
    await openBar(page);
    await expect(output(page)).toHaveAttribute('aria-live', 'off');
    await slider(page).fill('600');
    await expect(output(page)).toHaveAttribute('aria-live', 'off');
    expect(await page.locator('home-light').evaluate((el) => el.querySelectorAll('[role="status"], [role="alert"], [role="log"], [aria-live]:not([aria-live="off"])').length)).toBe(0);
  });

  /* -- 4. Forced colours ------------------------------------------------------- */

  test('forced colors: the slider track has a background colour of its own, and the pressed look button differs from the others', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page, '/', { look: 'city', time: '14:00' });
    await openBar(page);
    await faded(page);
    const clear = (colour) => /^(transparent|rgba\(.*,\s*0\))$/.test(colour);
    const track = await slider(page).evaluate((input) => getComputedStyle(input, '::-webkit-slider-runnable-track').backgroundColor);
    expect(clear(track), `the track is drawn in a colour of the system, not "${track}"`).toBe(false);

    // What tells the pressed button from the others to a reader: a border, an outline, the text colour, or a fill that is not the bar's own
    const barFill = await page.locator('home-light .home-light__bar').evaluate((bar) => getComputedStyle(bar).backgroundColor);
    const looks = await page.locator('home-light [data-look]').evaluateAll((buttons, bar) =>
      buttons.map((b) => {
        const s = getComputedStyle(b);
        const fill = s.backgroundColor;
        const filled = !/^(transparent|rgba\(.*,\s*0\))$/.test(fill) && fill !== bar;
        return {
          pressed: b.getAttribute('aria-pressed') === 'true',
          look: [
            s.borderTopStyle === 'none' ? 'no border' : `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
            s.outlineStyle === 'none' ? 'no outline' : `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`,
            s.color,
            filled ? fill : 'no fill',
          ].join(' | '),
        };
      }),
    barFill);
    const pressed = looks.filter((b) => b.pressed);
    const others = looks.filter((b) => !b.pressed);
    expect(pressed).toHaveLength(1);
    expect(others.length).toBeGreaterThan(0);
    for (const other of others) expect(pressed[0].look, 'the pressed button looks like an unpressed one').not.toBe(other.look);
  });

  /* -- 5. The globe is an image, not a control ---------------------------------- */

  test('the globe is not focusable, and its name does not talk about arrow keys', async ({ page }) => {
    await open(page, '/', { look: 'globe' });
    const globe = page.locator('home-globe');
    expect(await globe.evaluate((el) => ({ attribute: el.hasAttribute('tabindex'), index: /** @type {HTMLElement} */ (el).tabIndex }))).toEqual({ attribute: false, index: -1 });
    await globe.evaluate((el) => /** @type {HTMLElement} */ (el).focus());
    expect(await page.evaluate(() => document.activeElement?.tagName.toLowerCase())).not.toBe('home-globe');
    const name = (await globe.getAttribute('aria-label')) ?? '';
    expect(name.length).toBeGreaterThan(0);
    expect(name).not.toMatch(/arrow/i);
  });

  test('dragging the globe with the pointer still turns it', async ({ page }) => {
    await open(page, '/', { look: 'globe' });
    const globe = page.locator('home-globe');
    const dots = () => globe.evaluate((el) => [...el.querySelectorAll('.home-globe__dots path')].map((p) => p.getAttribute('d')).join('|'));
    const before = await dots();
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

  /* -- 6. The line shows the phase and the hour -------------------------------- */

  for (const [route, lang] of ROUTES) {
    test(`${route}: the line's visible text has the phase name and the hour (${lang})`, async ({ page }) => {
      const cat = catalog(lang);
      await open(page, route, { look: 'city', time: '14:00' });
      const hour = (await output(page).textContent())?.trim() ?? '';
      expect(hour).toMatch(/\S/);
      const shown = await visibleText(line(page));
      expect(shown).toContain(cat['light.afternoon']);
      expect(shown).toContain(hour.slice(0, 2));
      expect(shown).toMatch(/[0-9\u0660-\u0669]{2}\D[0-9\u0660-\u0669]{2}/);
    });
  }

  // F5 follow-up: a chosen mode pins a light (high contrast and dark: night), which is not the hour it is: the line shows the hour alone
  for (const [route, lang] of ROUTES) {
    test(`${route}: with a fixed mode the line shows the hour and no light's name (${lang})`, async ({ page }) => {
      const cat = catalog(lang);
      const phases = ['dawn', 'morning', 'afternoon', 'sunset', 'dusk', 'night'].map((phase) => cat[`light.${phase}`]);
      await open(page, route, { look: 'city', time: '14:00' });
      await chooseMode(page, 'high-contrast');
      await expect.poll(async () => (await html(page)).theme).toBe('high-contrast');
      await expect.poll(async () => (await html(page)).light, 'the mode pins its own light').toBe('night');
      const hour = (await output(page).textContent())?.trim() ?? '';
      expect(hour).toMatch(/\S/);
      await expect
        .poll(async () => {
          const shown = await visibleText(line(page));
          return { hour: shown.includes(hour.slice(0, 2)), names: phases.filter((name) => shown.includes(name)) };
        }, { message: 'the line has the hour and none of the six names' })
        .toEqual({ hour: true, names: [] });
      expect(await visibleText(line(page))).toMatch(/[0-9٠-٩]{2}\D[0-9٠-٩]{2}/);

      // Scrubbing an hour in a fixed mode does not bring a name back either
      await scrub(page, '09:30');
      await expect.poll(async () => (await html(page)).light).toBe('morning');
      const shown = await visibleText(line(page));
      expect(phases.filter((name) => shown.includes(name))).toEqual([]);
      expect(shown).toMatch(/[0-9\u0660-\u0669]{2}\D[0-9\u0660-\u0669]{2}/);
    });
  }

  test('back in Auto the line names the light again', async ({ page }) => {
    await open(page, '/', { look: 'city', time: '14:00' });
    await chooseMode(page, 'dark');
    await expect.poll(async () => (await html(page)).theme).toBe('dark');
    await chooseMode(page, 'auto');
    await expect.poll(async () => (await html(page)).light).toBe('afternoon');
    await expect.poll(() => visibleText(line(page))).toContain(catalog('en')['light.afternoon']);
  });

  test('the line has a visible open/close mark, hidden from assistive technology, that changes with aria-expanded', async ({ page }) => {
    await open(page, '/', { look: 'city', time: '14:00' });
    const mark = line(page).locator('[aria-hidden="true"]').first();
    await expect(mark).toBeVisible();
    expect((await mark.boundingBox())?.width ?? 0).toBeGreaterThan(4);
    // Everything about the mark a reader could see change: its text, its markup, and the transforms and pseudo-element content of it and of what is in it
    const look = () =>
      mark.evaluate((el) => {
        const state = (node) => {
          const s = getComputedStyle(node);
          return [s.transform, s.rotate, s.scale, s.opacity, getComputedStyle(node, '::before').content, getComputedStyle(node, '::after').content, node.getAttribute('d'), node.getAttribute('class')];
        };
        return JSON.stringify({ text: el.textContent, html: el.innerHTML, self: state(el), inner: [...el.querySelectorAll('*')].map(state) });
      });
    const closed = await look();
    await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
    await line(page).click();
    await expect(line(page)).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(look).not.toBe(closed);
    await line(page).click();
    await expect(line(page)).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(look).toBe(closed);
    // The mark is not read: the name of the line is the same, whatever the mark says
    await expect(line(page)).toHaveAccessibleName(new RegExp(catalog('en')['light.open'].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  /* -- 7. The Live button -------------------------------------------------------- */

  for (const [lang, value] of [['en', 'Back to now'], ['es', 'Volver a ahora'], ['ar', 'العودة إلى الآن']]) {
    test(`the Live button reads "${value}" in ${lang}, as its visible text and as its name`, async ({ page }) => {
      expect(catalog(lang)['light.live']).toBe(value);
      const route = ROUTES.find(([, code]) => code === lang)?.[0] ?? '/';
      await open(page, route, { look: 'map', time: '14:00' });
      await scrub(page, '09:30');
      const live = page.locator('home-light .home-light__live');
      await expect(live).toBeVisible();
      await expect(live).toHaveText(value);
      await expect(live).toHaveAccessibleName(value);
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
    for (const [light, time, mode] of LIGHTS) for (const look of LOOKS) {
      test(`${width} px, ${light} light, ${look} look: the line's text has 4.5:1 over what is behind it`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page, '/', { look, time });
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

  /* -- 9. The map fades at the top as well as at the bottom -------------------------- */

  test('the mask of <home-map> starts transparent at 0% and ends transparent', async ({ page }) => {
    await open(page, '/', { look: 'map' });
    const masks = await page.locator('home-map').evaluate((map) => {
      const found = [];
      for (let node = map; node && node.localName !== 'home-light'; node = node.parentElement) {
        const s = getComputedStyle(node);
        found.push(s.maskImage !== 'none' ? s.maskImage : s.webkitMaskImage);
      }
      return found.filter((value) => value && value !== 'none');
    });
    expect(masks.length, 'home-map or its wrapper has a mask-image').toBeGreaterThan(0);
    const clear = '(?:rgba\\(0, 0, 0, 0\\)|transparent)';
    const topFade = new RegExp(`linear-gradient\\((?:[^,()]+(?:\\([^)]*\\))?,\\s*)?${clear}(?:\\s*0%)?\\s*(?:,|\\))`);
    const bottomFade = new RegExp(`${clear}(?:\\s*100%)?\\)$`);
    expect(masks.some((value) => topFade.test(value)), `a gradient starting transparent in: ${masks.join(' ; ')}`).toBe(true);
    expect(masks.some((value) => bottomFade.test(value)), `a gradient ending transparent in: ${masks.join(' ; ')}`).toBe(true);
  });

  /* -- 10. Sunset is not afternoon in the city and the map ---------------------------- */

  // The drawing's inks, which the page's tokens do not decide (the tokens of the sunset differ from the afternoon's anyway)
  const INKS = ['--light-sun', '--light-neon', '--light-neon-2', '--light-neon-core', '--light-glint', '--light-moon', '--light-shade', '--light-shade-opacity', '--light-night-fill', '--light-night-land', '--light-night-lake', '--_sun', '--_neon', '--_neon2', '--_moon', '--_glint', '--_shade', '--_shade-opacity', '--_g', '--_sky-glow', '--_sun-l', '--_sun-r'];
  for (const look of ['city', 'map']) {
    test(`the ${look} look draws the sunset with other inks than the afternoon`, async ({ page }) => {
      await open(page, '/', { look, time: '14:00' });
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe('afternoon');
      await faded(page);
      const ink = () => page.locator(`home-${look}`).evaluate((el, names) => Object.fromEntries(names.map((n) => [n, getComputedStyle(el).getPropertyValue(n).trim()])), INKS);
      await page.waitForTimeout(2000);
      const afternoon = await ink();
      await scrub(page, '19:00');
      await expect.poll(() => page.evaluate(() => document.documentElement.dataset.light)).toBe('sunset');
      await faded(page);
      await page.waitForTimeout(2500); // the glow of the visual is a registered property, it transitions
      const sunset = await ink();
      const changed = INKS.filter((name) => afternoon[name] !== sunset[name] && !(name === '--_sun-l' || name === '--_sun-r'));
      expect(changed, `an ink of home-${look} that differs between the afternoon and the sunset`).not.toEqual([]);
    });
  }
});
