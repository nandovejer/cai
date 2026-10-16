// @ts-check
/**
 * F6, step 2: the entry loads the language of the page
 * (.claude/plans/specs/f6-languages.md, with its "Review answers", which are
 * binding). English is in the entry; every other language LUZ ships is a lazy
 * file, dist/i18n-<code>.js, fetched at boot for the languages the page uses
 * (<html lang>, the nearest lang of the root, and any lang that is not a link
 * or an option).
 *
 * The boot has two waves. Wave 1 never waits and writes no string: theme,
 * scroll spy, copy handlers, dialogs, tabs, and the click of the color-mode
 * cycle button; `data-luz-js` is NOT set yet, so no control is revealed
 * unbound. Wave 2 (code block names and copy buttons, players, the cycle
 * button's name, the timeline, sortable tables) runs when the language
 * arrives or after 2 s, then sets `data-luz-js`. A late arrival registers the
 * dictionary for the strings written afterwards and moves no focus.
 *
 * The fixture (tests/fixtures/i18n-languages.html) names Spanish in a link and
 * an option on every page, and carries authored English names, so what is
 * read at the end is what the scripts wrote. Runs in `chromium`; the
 * `chromium-nojs` project runs the last block only.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/tests/fixtures/i18n-languages.html';
/** The request for a language file (the fixture's own name has i18n- in it). */
const LANGUAGE_REQUEST = /\/i18n-[a-z]{2,3}(\.min)?\.js/;
const LANGUAGE_FILE = /\/i18n-es(\.min)?\.js/;

/** What the scripts of the page write, in English and in Spanish (the 23 strings of before, and previous and next). */
const EN = {
  code: 'HTML example',
  copy: 'Copy',
  copyName: 'Copy code example 1',
  play: 'Play',
  mute: 'Mute',
  cycle: 'Change color mode. Current: Light',
  previous: 'Previous',
  next: 'Next',
};
const ES = {
  code: 'Ejemplo de HTML',
  copy: 'Copiar',
  copyName: 'Copiar el ejemplo de código 1',
  play: 'Reproducir',
  mute: 'Silenciar',
  cycle: 'Cambiar el modo de color. Actual: Light',
  previous: 'Anterior',
  next: 'Siguiente',
};
/** What the markup says before any script has run. */
const AUTHORED = { play: 'Authored play', mute: 'Authored mute', cycle: 'Authored mode name' };

/** Called first in each block that needs JavaScript: the no-JS block is the last one. */
const needsJavaScript = () => test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

/** Requests for a language file, `[luz]` warnings and page errors, as they happen. */
function watch(page) {
  const seen = { requests: /** @type {string[]} */ ([]), warnings: /** @type {string[]} */ ([]), errors: /** @type {string[]} */ ([]) };
  page.on('request', (r) => { if (LANGUAGE_REQUEST.test(r.url())) seen.requests.push(r.url()); });
  page.on('console', (m) => { if (m.type() === 'warning' && m.text().startsWith('[luz]')) seen.warnings.push(m.text()); });
  page.on('pageerror', (e) => seen.errors.push(e.message));
  return seen;
}

/** Everything wave 2 writes, as the page has it now (null for what is not there yet). */
const labels = (page) =>
  page.evaluate(() => {
    const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name) ?? null;
    return {
      code: attr('#code-main', 'aria-label'),
      copy: document.querySelector('#code-main .luz-code-block__copy')?.textContent ?? null,
      copyName: attr('#code-main .luz-code-block__copy', 'aria-label'),
      play: attr('#player-main .luz-player-playpause', 'aria-label'),
      mute: attr('#player-main .luz-player-mute', 'aria-label'),
      cycle: attr('#cycle', 'aria-label'),
      previous: attr('#timeline .luz-timeline__arrow--previous', 'aria-label'),
      next: attr('#timeline .luz-timeline__arrow--next', 'aria-label'),
    };
  });

/** True once everything of wave 2 is in the page. */
const wave2 = (page) =>
  page.evaluate(
    () =>
      document.documentElement.hasAttribute('data-luz-js') &&
      !!document.querySelector('#timeline[data-luz-ready]') &&
      !!document.querySelector('#table-main th > button') &&
      !!document.querySelector('#code-main .luz-code-block__copy'),
  );

/** Open the fixture and wait until the entry has been evaluated (not for wave 2). */
async function open(page, query = '', options = {}) {
  await page.goto(`${FIXTURE}${query}`, options);
  await page.waitForFunction(() => 'luz' in window);
}

const done = async (page, timeout = 4000) => expect.poll(() => wave2(page), { timeout, intervals: [50] }).toBe(true);

/** Hold every request for a language file: nothing answers it until `release()`. */
async function hold(page) {
  const held = [];
  await page.route(LANGUAGE_FILE, (route) => held.push(route));
  return { release: () => Promise.all(held.splice(0).map((r) => r.continue())) };
}

/** What a visitor can do while the language is still on its way: tabs, the color mode and the dialog. */
async function theWholePageStillWorks(page) {
  await page.locator('#tab-b').click();
  await expect(page.locator('#tab-b')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel-a')).toHaveAttribute('hidden', /.*/);
  await expect(page.locator('#panel-b')).not.toHaveAttribute('hidden', /.*/);

  await page.locator('#cycle').click();
  await expect(page.locator('input[value="dark"]')).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.locator('#open-dialog').click();
  await expect(page.locator('#dialog')).toHaveJSProperty('open', true);
  await page.locator('#close-dialog').click();
  await expect(page.locator('#dialog')).toHaveJSProperty('open', false);
}

/* ---- Which page fetches which file ---------------------------------------- */

test.describe('a page in English', () => {
  needsJavaScript();
  test('requests no language file, though a link and an option name Spanish', async ({ page }) => {
    const seen = watch(page);
    await open(page, '?lang=en');
    await done(page);
    await page.waitForLoadState('networkidle');
    expect(seen.requests).toEqual([]);
    expect(await labels(page)).toEqual(EN);
    expect(seen.warnings).toEqual([]);
    expect(seen.errors).toEqual([]);
  });

  test('runs both waves in the same task: nothing is waiting, and the page is enhanced at once', async ({ page }) => {
    await page.goto(`${FIXTURE}?lang=en`);
    await page.waitForFunction(() => 'luz' in window);
    expect(await wave2(page)).toBe(true);
    expect(await page.evaluate(() => window.luz.loadLocales())).toBeUndefined();
  });
});

test.describe('a page in Spanish', () => {
  needsJavaScript();
  test('makes one request for i18n-es and writes every string in Spanish, none in English, with no warning', async ({ page }) => {
    const seen = watch(page);
    await open(page);
    await done(page);
    expect(seen.requests).toHaveLength(1);
    expect(seen.requests[0]).toMatch(/i18n-es(\.min)?\.js/);
    expect(await labels(page)).toEqual(ES);
    // no English string among them, and nothing the markup said before
    for (const [key, value] of Object.entries(await labels(page))) {
      expect(value, key).not.toBe(EN[key]);
      expect(value, key).not.toBe(AUTHORED[key] ?? null);
    }
    expect(seen.warnings, 'no spurious "No strings for lang=es"').toEqual([]);
    expect(seen.errors).toEqual([]);
  });

  test('a regional tag, es-MX, fetches the same one file', async ({ page }) => {
    const seen = watch(page);
    await open(page, '?lang=es-MX');
    await done(page);
    expect(seen.requests).toHaveLength(1);
    expect(await labels(page)).toEqual(ES);
    expect(seen.warnings).toEqual([]);
  });

  test('a sorted table says what changed in Spanish, and the status line carries lang="es"', async ({ page }) => {
    await open(page);
    await done(page);
    await page.locator('#table-main th > button', { hasText: 'Weight' }).click();
    const status = page.locator('#table-main').locator('xpath=ancestor::div[contains(@class,"luz-table-wrap")]/following-sibling::output[1]');
    await expect(status).toHaveText('Ordenado por Weight, ascendente');
    await expect(status).toHaveAttribute('lang', 'es');
  });

  test('the color mode is announced in Spanish', async ({ page }) => {
    await open(page);
    await done(page);
    await page.locator('#cycle').click();
    await expect(page.locator('.luz-mode-cycle__status')).toHaveText('Modo de color: Dark');
    await expect(page.locator('#cycle')).toHaveAttribute('aria-label', 'Cambiar el modo de color. Actual: Dark');
  });
});

test.describe('a Spanish fragment on a page in English', () => {
  needsJavaScript();
  test('fetches Spanish once, writes the fragment in Spanish and the rest in English', async ({ page }) => {
    const seen = watch(page);
    await open(page, '?lang=en&fragment');
    await done(page);
    expect(seen.requests).toHaveLength(1);
    expect(await labels(page)).toEqual(EN);
    const fragment = await page.evaluate(() => ({
      code: document.querySelector('#code-es').getAttribute('aria-label'),
      copy: document.querySelector('#code-es .luz-code-block__copy')?.textContent,
      copyName: document.querySelector('#code-es .luz-code-block__copy')?.getAttribute('aria-label'),
      play: document.querySelector('#player-es .luz-player-playpause')?.getAttribute('aria-label'),
    }));
    expect(fragment).toEqual({ code: 'Ejemplo de HTML', copy: 'Copiar', copyName: 'Copiar el ejemplo de código 2', play: 'Reproducir' });
    expect(seen.warnings).toEqual([]);
  });

  test('each table says it in its own language', async ({ page }) => {
    await open(page, '?lang=en&fragment');
    await done(page);
    await page.locator('#table-es th > button', { hasText: 'Peso' }).click();
    await page.locator('#table-main th > button', { hasText: 'Weight' }).click();
    const statusOf = (table) => page.locator(table).locator('xpath=ancestor::div[contains(@class,"luz-table-wrap")]/following-sibling::output[1]');
    await expect(statusOf('#table-es')).toHaveText('Ordenado por Peso, ascendente');
    await expect(statusOf('#table-es')).toHaveAttribute('lang', 'es');
    await expect(statusOf('#table-main')).toHaveText('Sorted by Weight, ascending');
    await expect(statusOf('#table-main')).toHaveAttribute('lang', 'en');
  });

  test('the copy announcement is in the language of the button, and the live region says so (WCAG 3.1.2)', async ({ page, context, browserName }) => {
    // Only Chromium knows these permission names (Firefox: unknown; WebKit: no clipboard-write); the copy runs inside a click everywhere
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, '?lang=en&fragment');
    await done(page);
    const region = page.locator('#luz-live-region');
    await page.locator('#code-es .luz-code-block__copy').click();
    await expect(region).toHaveText('Copiado al portapapeles');
    await expect(region).toHaveAttribute('lang', 'es');
    await page.locator('#code-main .luz-code-block__copy').click();
    await expect(region).toHaveText('Copied to clipboard');
    await expect(region).toHaveAttribute('lang', 'en');
  });
});

test.describe('a language LUZ does not ship', () => {
  needsJavaScript();
  test('lang="fr": no request, English strings, exactly one warning that says what to do', async ({ page }) => {
    const seen = watch(page);
    await open(page, '?lang=fr');
    await done(page);
    await page.waitForLoadState('networkidle');
    expect(seen.requests).toEqual([]);
    expect(await labels(page)).toEqual(EN);
    expect(seen.warnings).toHaveLength(1);
    expect(seen.warnings[0]).toContain('"fr"');
    expect(seen.warnings[0]).toContain('registerLocale()');
    expect(seen.errors).toEqual([]);
  });

  test('registerLocale("fr", …) gives it French strings for what is written afterwards, with no request', async ({ page }) => {
    const seen = watch(page);
    await open(page, '?lang=fr');
    await done(page);
    await page.evaluate(() => window.luz.registerLocale('fr', { sortedAsc: 'Trié par {column}, croissant' }));
    await page.locator('#table-main th > button', { hasText: 'Weight' }).click();
    const status = page.locator('#table-main').locator('xpath=ancestor::div[contains(@class,"luz-table-wrap")]/following-sibling::output[1]');
    await expect(status).toHaveText('Trié par Weight, croissant');
    expect(seen.requests).toEqual([]);
  });

  for (const lang of ['__proto__', 'constructor', 'toString']) {
    test(`lang="${lang}" reaches no function: no request, English, no error`, async ({ page }) => {
      const seen = watch(page);
      await open(page, `?lang=${lang}`);
      await done(page);
      expect(seen.requests).toEqual([]);
      expect(await labels(page)).toEqual(EN);
      expect(seen.errors).toEqual([]);
    });
  }
});

/* ---- When the file does not arrive ---------------------------------------- */

test.describe('a language file that fails', () => {
  needsJavaScript();
  test('aborted: English within 2.5 s, one warning, no error, and the page works', async ({ page }) => {
    const seen = watch(page);
    await page.route(LANGUAGE_FILE, (route) => route.abort());
    await open(page);
    await done(page, 2500);
    expect(await labels(page)).toEqual(EN);
    expect(seen.warnings).toHaveLength(1);
    expect(seen.warnings[0]).toMatch(/^\[luz\]/);
    expect(seen.warnings[0]).toMatch(/\bes\b/);
    expect(seen.errors).toEqual([]);
    await theWholePageStillWorks(page);
  });

  test('blocked by a Content-Security-Policy that names the entry and its other chunks, not the language: the same', async ({ page }) => {
    const seen = watch(page);
    await page.route('**/tests/fixtures/i18n-languages.html*', async (route) => {
      const response = await route.fetch();
      const origin = new URL(route.request().url()).origin;
      const allowed = ['luz.js', 'table-sort.js', 'timeline.js', 'midi.js'].map((f) => `${origin}/packages/core/dist/${f}`);
      await route.fulfill({
        response,
        headers: { ...response.headers(), 'content-security-policy': `script-src 'unsafe-inline' ${origin}/tests/fixtures/i18n-languages.html ${origin}/@vite/client ${allowed.join(' ')}` },
      });
    });
    await open(page);
    await done(page, 2500);
    expect(await labels(page)).toEqual(EN);
    expect(seen.warnings).toHaveLength(1);
    expect(seen.errors).toEqual([]);
    await theWholePageStillWorks(page);
  });

  test('held for 5 s: the first wave works at once, the second runs at about 2 s, in English', async ({ page }) => {
    const seen = watch(page);
    const file = await hold(page);
    const start = Date.now();
    await open(page, '', { waitUntil: 'domcontentloaded' });

    // Wave 1 ran, wave 2 has not, and no control has been revealed unbound
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-luz-js'))).toBe(false);
    expect(await page.locator('.luz-code-block__copy').count()).toBe(0);
    expect(await page.locator('.luz-timeline__arrow').count()).toBe(0);
    expect(await page.locator('#table-main th > button').count()).toBe(0);
    await expect(page.locator('#player-main audio')).toHaveAttribute('controls', /.*/);
    await expect(page.locator('#player-main .luz-player-controls')).toBeHidden();
    const pending = await labels(page);
    expect(pending.play).toBe(AUTHORED.play);
    expect(pending.cycle).toBe(AUTHORED.cycle);
    expect(pending.code).toBeNull();

    await theWholePageStillWorks(page);
    expect(await wave2(page), 'wave 2 does not wait for nothing, nor start before its time').toBe(false);

    await done(page, 4000);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(1500);
    expect(elapsed).toBeLessThan(4000);
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-luz-js'))).toBe(true);
    const after = await labels(page);
    expect({ ...after, cycle: undefined }).toEqual({ ...EN, cycle: undefined });
    expect(after.cycle).toMatch(/^Change color mode\. Current: /);
    expect(seen.errors).toEqual([]);
    await file.release();
  });

  test('a file that arrives after the bound is registered: what is written afterwards is Spanish, what was written stays', async ({ page }) => {
    const file = await hold(page);
    await open(page, '', { waitUntil: 'domcontentloaded' });
    await done(page, 4000);
    expect((await labels(page)).code).toBe(EN.code);

    await file.release();
    await expect
      .poll(() => page.evaluate(() => window.luz.t('sortedAsc', document.querySelector('#table-main'), { column: 'X' })), { timeout: 4000 })
      .toBe('Ordenado por X, ascendente');
    await page.locator('#table-main th > button', { hasText: 'Weight' }).click();
    const status = page.locator('#table-main').locator('xpath=ancestor::div[contains(@class,"luz-table-wrap")]/following-sibling::output[1]');
    await expect(status).toHaveText('Ordenado por Weight, ascendente');
    expect((await labels(page)).code, 'what was written before the file arrived is not rewritten').toBe(EN.code);
  });

  test('the focus stays where it is when the second wave lands (a tab, and the native media controls)', async ({ page }) => {
    const file = await hold(page);
    await open(page, '', { waitUntil: 'domcontentloaded' });
    await page.locator('#tab-a').focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tab-a');
    await done(page, 4000);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tab-a');
    await file.release();
  });

  test('a keyboard user in the native media controls is not dropped on the page when mountPlayer removes them', async ({ page }) => {
    const file = await hold(page);
    await open(page, '', { waitUntil: 'domcontentloaded' });
    await page.locator('#player-main audio').evaluate((audio) => audio.focus());
    expect(await page.evaluate(() => document.activeElement?.tagName), 'the audio element can take the focus').toBe('AUDIO');
    await done(page, 4000);
    const focus = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      inPlayer: !!document.activeElement?.closest('#player-main'),
    }));
    expect(focus.tag).not.toBe('BODY');
    expect(focus.inPlayer).toBe(true);
    await file.release();
  });

  test('at 320 px the page does not scroll sideways before the second wave, nor after', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const file = await hold(page);
    await open(page, '', { waitUntil: 'domcontentloaded' });
    const overflows = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(await overflows(), 'before wave 2').toBe(false);
    await done(page, 4000);
    expect(await overflows(), 'after wave 2').toBe(false);
    await file.release();
  });
});

/* ---- The pieces of the API ------------------------------------------------ */

test.describe('loadLocales()', () => {
  needsJavaScript();
  test('is exported by the entry, asks nothing on a page in English, and loads the language of a fragment added later', async ({ page }) => {
    const seen = watch(page);
    await open(page, '?lang=en');
    await done(page);
    expect(await page.evaluate(() => typeof window.luz.loadLocales)).toBe('function');
    expect(await page.evaluate(() => window.luz.loadLocales())).toBeUndefined();
    expect(seen.requests).toEqual([]);

    const copy = await page.evaluate(async () => {
      const late = document.createElement('div');
      late.lang = 'es';
      late.id = 'late';
      document.body.append(late);
      await window.luz.loadLocales(late);
      return window.luz.t('copy', late);
    });
    expect(copy).toBe('Copiar');
    expect(seen.requests).toHaveLength(1);
  });
});

test.describe('the legacy apply buttons of a custom theme (a known issue, written in the accessibility statement)', () => {
  needsJavaScript();
  test('are written by the first wave, so on a Spanish page they are English until the theme changes', async ({ page }) => {
    await open(page);
    await done(page);
    const texts = () => page.evaluate(() => [document.querySelector('#apply-light').textContent, document.querySelector('#apply-dark').textContent]);
    expect(await texts()).toEqual(['Applied', 'Apply theme']);
    await page.locator('#cycle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await texts()).toEqual(['Aplicar tema', 'Aplicado']);
  });
});

/* ---- axe, in the three modes, on the Spanish page ------------------------- */

test.describe('axe on the Spanish page', () => {
  needsJavaScript();
  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`no serious or critical violation in ${theme}`, async ({ page }) => {
      await open(page, '?fragment');
      await done(page);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
    });
  }
});

/* ---- Without JavaScript --------------------------------------------------- */

test.describe('the Spanish page without JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled !== false, 'the no-JS project only');

  test('is the markup as it was written: no request, nothing added, the native controls and the links', async ({ page }) => {
    const requests = [];
    page.on('request', (r) => { if (LANGUAGE_REQUEST.test(r.url())) requests.push(r.url()); });
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
    expect(requests).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-luz-js'))).toBe(false);
    await expect(page.locator('.luz-code-block__copy')).toHaveCount(0);
    await expect(page.locator('#table-main th > button')).toHaveCount(0);
    await expect(page.locator('#code-main')).not.toHaveAttribute('aria-label', /.*/);
    await expect(page.locator('#player-main audio')).toHaveAttribute('controls', /.*/);
    await expect(page.locator('#player-main .luz-player-controls')).toBeHidden();
    await expect(page.locator('#player-main .luz-player-playpause')).toHaveAttribute('aria-label', AUTHORED.play);
    await expect(page.locator('#cycle')).toBeHidden();
    await expect(page.locator('#modes input[value="dark"]')).toBeVisible();
    await expect(page.locator('#panel-a')).toBeVisible();
    await expect(page.locator('#panel-b')).toBeVisible();
  });
});
