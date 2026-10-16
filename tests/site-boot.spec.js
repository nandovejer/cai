// @ts-check
/**
 * apps/site/boot.js in the browser (F2 of .claude/plans/luz-home-docs-identity.md,
 * section 3.4; EX-009). The rules are checked one by one in tests/site-boot.test.js:
 * here the real pages.
 *
 *   - a stored choice is on <html> before any module of the page has run, so
 *     the first frame is the visitor's mode;
 *   - with no choice, the light follows the clock: data-light is the phase,
 *     data-theme is dark for dawn, dusk and night, on the home page and on
 *     the docs, and the system's colour scheme does not decide;
 *   - the served HTML says nothing of the light: without JavaScript the page is
 *     Vejer light and core's radios switch it, so the script is the only
 *     writer of data-light.
 */
import { test, expect } from '@playwright/test';
import { LIGHTS, NO_CHOICE, TIMEZONE, atTime, colorOf, channels, lightToken, seedMode, vejer } from './helpers/site-lights.js';
import { faded } from './helpers/settle.js';

// A fixed zone, so "the local hour" is the same on every machine; and nothing
// stored unless a test seeds it (the project's state does not decide Auto)
test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const PAGES = ['/', '/docs/'];
// Every module the pages load, except the boot script, which is classic
const MODULES = /\/apps\/(?:landing\/landing|docs\/reference|site\/header)\.js/;

/**
 * Record every write to data-theme and data-light on <html> with the value it
 * replaced (attributeOldValue), so a value written and overwritten in the
 * same task is seen too, and what the parser had at DOMContentLoaded.
 */
const watch = (page) =>
  page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__log = [];
    w.__dcl = null;
    new MutationObserver((records) => {
      for (const r of records) if (r.target === document.documentElement) w.__log.push([r.attributeName, r.oldValue]);
    }).observe(document, { attributes: true, subtree: true, attributeOldValue: true, attributeFilter: ['data-theme', 'data-light'] });
    document.addEventListener('DOMContentLoaded', () => {
      w.__dcl = [document.documentElement.getAttribute('data-theme'), document.documentElement.getAttribute('data-light')];
    });
  });

/**
 * Every value an attribute of <html> took after the one the markup served
 * (the first old value), in order, ending with the value it has now. A
 * write of another value, even one corrected in the same task, is in it.
 */
const took = (page, name) =>
  page.evaluate((attribute) => {
    const olds = /** @type {any} */ (window).__log.filter(([a]) => a === attribute).map(([, old]) => old);
    return [...olds.slice(1), document.documentElement.getAttribute(attribute)];
  }, name);
const only = (values) => [...new Set(values)];

const state = (page) =>
  page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    light: document.documentElement.getAttribute('data-light'),
  }));

/** The modules have run: <luz-mode> is defined, core has had its turn and the page is quiet. */
async function modulesRan(page) {
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-mode'))).toBe(true);
  await page.waitForLoadState('networkidle');
}

/** Resolve when the next change of the system's colour scheme has been delivered to every listener. */
const nextSchemeChange = (page) =>
  page.evaluate(() => {
    /** @type {any} */ (window).__scheme = new Promise((resolve) =>
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTimeout(resolve, 100), { once: true }),
    );
  });

test.describe('a stored choice is applied before the first frame', () => {
  for (const path of PAGES) {
    for (const [mode, light] of [['dark', 'night'], ['high-contrast', 'night'], ['light', 'afternoon']]) {
      test(`${path} with ${mode} stored: ${mode}, light ${light}, before any module runs`, async ({ page }) => {
        await watch(page);
        await seedMode(page, mode);
        // Only the boot script can have set it: the page's modules never load
        await page.route(MODULES, (route) => route.abort());
        await page.goto(path);
        const dcl = await page.evaluate(() => /** @type {any} */ (window).__dcl);
        expect(dcl, 'on <html> when the parser is done').toEqual([mode, light]);
        // Every value the attributes took, the overwritten ones too: never another mode, even for one task
        expect(only(await took(page, 'data-theme'))).toEqual([mode]);
        expect(only(await took(page, 'data-light'))).toEqual([light]);
        expect(await state(page)).toEqual({ theme: mode, light });
      });

      test(`${path} with ${mode} stored at the other end of the day: once the modules have run it was never anything else`, async ({ page }) => {
        // The clock says the opposite (afternoon for dark, night for light): the choice wins, and nobody writes the clock's mode, even for a task
        await atTime(page, mode === 'light' ? '23:30' : '14:00');
        await watch(page);
        await seedMode(page, mode);
        await page.goto(path);
        await modulesRan(page);
        expect(only(await took(page, 'data-theme'))).toEqual([mode]);
        expect(only(await took(page, 'data-light'))).toEqual([light]);
        await expect(page.locator(`input[name="luz-theme"][value="${mode}"]`)).toBeChecked();
      });
    }
  }

  test('a value that is not a mode is no choice: the clock decides', async ({ page }) => {
    await atTime(page, '09:00');
    await seedMode(page, 'purple');
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await state(page)).toEqual({ theme: 'light', light: 'morning' });
  });

  test('the old key is not read', async ({ page }) => {
    await atTime(page, '09:00');
    await page.addInitScript(() => localStorage.setItem('luz-site-mode', 'dark'));
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await state(page)).toEqual({ theme: 'light', light: 'morning' });
  });
});

test.describe('with no choice, the light follows the clock', () => {
  for (const path of PAGES) {
    for (const [light, time, mode] of LIGHTS) {
      test(`${path} at ${time}: ${light}, ${mode}`, async ({ page }) => {
        await atTime(page, time);
        await watch(page);
        await page.route(MODULES, (route) => route.abort());
        await page.goto(path);
        // Before any module: the boot script alone
        expect(await page.evaluate(() => /** @type {any} */ (window).__dcl)).toEqual([mode, light]);
        expect(await state(page)).toEqual({ theme: mode, light });
      });

      test(`${path} at ${time}: still ${light}, ${mode}, once the modules have run, and never another value on the way`, async ({ page }) => {
        await atTime(page, time);
        await watch(page);
        await page.goto(path);
        await modulesRan(page);
        await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue('auto');
        expect(await state(page)).toEqual({ theme: mode, light });
        // Core's theme module and <luz-mode> both run: neither writes the other mode, not even to correct it in a later task
        expect(only(await took(page, 'data-theme'))).toEqual([mode]);
        expect(only(await took(page, 'data-light'))).toEqual([light]);
      });
    }
  }

  test('the system colour scheme does not decide: dark at 14:00 is light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await atTime(page, '14:00');
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });
  });

  test('prefers-contrast: more is the high contrast mode, at night', async ({ page }) => {
    await page.emulateMedia({ contrast: 'more' });
    await atTime(page, '14:00');
    await page.route(MODULES, (route) => route.abort());
    await page.goto('/');
    expect(await state(page)).toEqual({ theme: 'high-contrast', light: 'night' });
  });
});

test.describe('with no choice, core\'s own theme handling runs under every system colour scheme and stays on the clock', () => {
  // core's initThemeSystem and <luz-mode> both listen to prefers-color-scheme
  for (const path of PAGES) {
    test(`${path}: a dark system at 14:00, modules loaded: light, afternoon, and a change of the system does not move it`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await atTime(page, '14:00');
      await watch(page);
      await page.goto(path);
      await modulesRan(page);
      expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });

      await nextSchemeChange(page);
      await page.emulateMedia({ colorScheme: 'light' });
      await page.evaluate(() => /** @type {any} */ (window).__scheme);
      expect(await state(page)).toEqual({ theme: 'light', light: 'afternoon' });
      expect(only(await took(page, 'data-theme'))).toEqual(['light']);
      await expect(page.locator('input[name="luz-theme"]:checked')).toHaveValue('auto');
    });

    test(`${path}: a light system at 21:00, modules loaded: dark, dusk, and a change of the system does not move it`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await atTime(page, '21:00');
      await watch(page);
      await page.goto(path);
      await modulesRan(page);
      expect(await state(page)).toEqual({ theme: 'dark', light: 'dusk' });

      await nextSchemeChange(page);
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => /** @type {any} */ (window).__scheme);
      expect(await state(page)).toEqual({ theme: 'dark', light: 'dusk' });
      expect(only(await took(page, 'data-theme'))).toEqual(['dark']);
      await nextSchemeChange(page);
      await page.emulateMedia({ colorScheme: 'light' });
      await page.evaluate(() => /** @type {any} */ (window).__scheme);
      expect(await state(page)).toEqual({ theme: 'dark', light: 'dusk' });
      expect(only(await took(page, 'data-theme'))).toEqual(['dark']);
    });
  }
});

test.describe('the clock keeps running while the page is open', () => {
  test('Auto turns from sunset to dusk at 20:30, and light to dark with it', async ({ page }) => {
    await atTime(page, '20:29');
    await page.goto('/docs/');
    await modulesRan(page);
    expect(await state(page)).toEqual({ theme: 'light', light: 'sunset' });
    await page.clock.runFor(61_000);
    await expect.poll(() => state(page)).toEqual({ theme: 'dark', light: 'dusk' });
  });

  test('a chosen mode is left alone by the minute: a data-theme set by hand survives it', async ({ page }) => {
    // The suites that set data-theme by hand to measure a mode (a11y, docs-dodont, red-lines...) run for
    // longer than a minute now and then: the tick must not put a chosen mode back (it only follows the clock in Auto)
    await atTime(page, '14:00');
    await seedMode(page, 'light');
    await page.goto('/docs/');
    await modulesRan(page);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    await page.clock.runFor(61_000);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(await state(page)).toEqual({ theme: 'dark', light: 'afternoon' });
  });
});

test.describe('the four lights are in the page', () => {
  // theme-light.css is linked by the home page and by the docs: the computed tokens of <html> are the literal of the block
  const OVERRIDING = LIGHTS.filter(([light]) => ['morning', 'sunset', 'dawn', 'dusk'].includes(light));
  for (const path of PAGES) {
    for (const [light, time] of OVERRIDING) {
      test(`${path} at ${time}: <html>'s surface is the block of ${light}, and nothing fades at load`, async ({ page }) => {
        await atTime(page, time);
        await page.goto(path);
        await modulesRan(page);
        expect(await page.evaluate(() => document.documentElement.dataset.light)).toBe(light);
        expect(channels(await colorOf(page.locator('html'), '--luz-surface-page')), `--luz-surface-page in ${light}`).toEqual(lightToken(light, '--luz-surface-page'));
        expect(channels(await colorOf(page.locator('html'), '--luz-text-primary')), `--luz-text-primary in ${light}`).toEqual(lightToken(light, '--luz-text-primary'));
        // The boot script sets the light before the first frame: there is no fade to wait for
        expect(await page.evaluate(() => document.documentElement.getAnimations().map((a) => /** @type {any} */ (a).transitionProperty))).toEqual([]);
      });
    }
  }

  for (const [light, time, mode] of LIGHTS.filter(([light]) => ['afternoon', 'night'].includes(light))) {
    test(`/docs/ at ${time}: ${light} is Vejer ${mode}, no block applies`, async ({ page }) => {
      await atTime(page, time);
      await page.goto('/docs/');
      await modulesRan(page);
      expect(channels(await colorOf(page.locator('html'), '--luz-surface-page'))).toEqual(vejer(mode, '--luz-surface-page'));
    });
  }
});

test.describe('the cross-fade follows the visitor\'s motion setting', () => {
  test('with motion welcome, a switch of mode fades, and ends on the colours of the mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await seedMode(page, 'light');
    await page.goto('/docs/');
    await modulesRan(page);
    await page.locator('footer .luz-mode-cycle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const running = await page.evaluate(() => document.documentElement.getAnimations().filter((a) => a.playState === 'running').map((a) => /** @type {any} */ (a).transitionProperty));
    expect(running.filter((name) => String(name).startsWith('--luz-')).length, 'the colour tokens of <html> are transitioning').toBeGreaterThan(0);
    await faded(page);
    expect(channels(await colorOf(page.locator('html'), '--luz-surface-page'))).toEqual(vejer('dark', '--luz-surface-page'));
  });

  test('with reduced motion, a switch of mode takes effect at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedMode(page, 'light');
    await page.goto('/docs/');
    await modulesRan(page);
    await page.locator('footer .luz-mode-cycle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // No settling: the very next read is the colour of the mode
    expect(await page.evaluate(() => document.documentElement.getAnimations().filter((a) => String(/** @type {any} */ (a).transitionProperty).startsWith('--luz-')).length)).toBe(0);
    expect(channels(await colorOf(page.locator('html'), '--luz-surface-page'))).toEqual(vejer('dark', '--luz-surface-page'));
  });
});

test.describe('the served HTML says nothing of the light', () => {
  for (const path of ['/', '/es/', '/ar/', '/docs/', '/docs/components/button/']) {
    test(`${path}: no data-light, and the boot script is in <head>`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.ok()).toBe(true);
      const html = await response.text();
      expect(html).not.toMatch(/\sdata-light(?:=|\s|>)/);
      const head = html.slice(html.indexOf('<head'), html.indexOf('</head>'));
      expect(head).toMatch(/<script src="[^"]*boot\.js[^"]*"><\/script>/);
      // Classic and render-blocking, by design (EX-009): neither deferred, async nor a module
      expect(head).not.toMatch(/<script[^>]*(?:defer|async|type="module")[^>]*boot\.js/);
    });
  }

  test('the boot script is served, as a classic script with no import', async ({ request }) => {
    const response = await request.get('/apps/site/boot.js');
    expect(response.ok()).toBe(true);
    expect(await response.text()).not.toMatch(/^\s*(?:import|export)\b/m);
  });
});
