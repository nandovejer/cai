/**
 * CAI Design System — documentation page checks
 * The documentation (apps/docs, served at /docs/) is one page: installation,
 * every token, every core component with its six guidance sections, the
 * platform patterns and the accessibility statement. These tests compare the
 * inventory it renders against the package sources, so the page cannot drift
 * from the system, and check the structure the accessibility review asked for
 * (h2 per component, h3 per guidance section, a way back to the top).
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

/* ---- What the packages actually contain -------------------------------- */

const tokens = JSON.parse(readFileSync(fromRepo('packages/tokens/tokens.json'), 'utf-8'));
const primitiveColors = Object.entries(tokens.color).flatMap(([family, steps]) =>
  Object.keys(steps).map((step) => `--cai-${family}-${step}`),
);

const semanticCss = readFileSync(fromRepo('packages/tokens/src/semantic.css'), 'utf-8');
const lightBlock = semanticCss.slice(
  semanticCss.indexOf('[data-theme="light"] {'),
  semanticCss.indexOf('[data-theme="dark"],'),
);
const semanticTokens = [...lightBlock.matchAll(/^\s*(--cai-[\w-]+):/gm)].map((m) => m[1]);

const componentFiles = readdirSync(fromRepo('packages/core/src/components')).filter(
  (file) => file.endsWith('.css') && file !== 'index.css',
);
const components = componentFiles.filter((file) => !file.startsWith('_'));

const objectsCss = readFileSync(fromRepo('packages/core/src/objects/_objects.css'), 'utf-8');
const layoutObjects = new Set([...objectsCss.matchAll(/^\.(o-[a-z]+)\b/gm)].map((m) => m[1]));

const utilitiesCss = readFileSync(fromRepo('packages/core/src/utilities/_utilities.css'), 'utf-8');
const utilities = new Set([...utilitiesCss.matchAll(/^\.(u-[a-z0-9-]+)\b/gm)].map((m) => m[1]));

const jsModules = readdirSync(fromRepo('packages/core/src')).filter((file) => file.endsWith('.js'));

const settingsCss = readFileSync(fromRepo('packages/core/src/settings/_settings.css'), 'utf-8');
const settingNames = (prefix) =>
  [...settingsCss.matchAll(new RegExp(`^\\s*(--cai-${prefix}-[\\w-]+):`, 'gm'))].map((m) => m[1]);

const platformCss = readFileSync(
  fromRepo('packages/platform/src/components/_components.css'),
  'utf-8',
);
const platformClasses = [...new Set(platformCss.match(/\.cai-platform-[a-z_-]+/g))];

const MODES = ['light', 'dark', 'high-contrast'];

// One guide per core component file. The color-mode switcher is documented
// in the sidebar guide, where it lives.
const GUIDE_ID = { 'copy-btn': 'c-copy', 'icon-grid': 'c-icons', 'theme-switcher': 'c-sidebar' };
const guideIds = [...new Set(components.map((file) => GUIDE_ID[file.replace('.css', '')] ?? `c-${file.replace('.css', '')}`))];
const SECTIONS = ['when', 'when-not', 'how', 'content', 'keyboard', 'issues'];

/* ---- Helpers ----------------------------------------------------------- */

/** Open the docs and collect failed requests and console problems. */
async function open(page, path = '/docs/') {
  const requests = [];
  const failed = [];
  const problems = [];
  page.on('request', (req) => requests.push(req.url()));
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(res.url());
  });
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  return { requests, failed, problems };
}

const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);

test.describe('Documentation page', () => {
  test.describe('loading and color modes', () => {
    test('loads cleanly, with base color modes only', async ({ page }) => {
      const { requests, failed, problems } = await open(page);

      expect(failed).toEqual([]);
      expect(problems).toEqual([]);
      expect(requests.filter((url) => /themes\//.test(url))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBeUndefined();
      expect(MODES).toContain(await theme(page));
      // cai.js would apply its own default theme: the modules are imported one by one
      expect(requests.filter((url) => /\/cai(\.min)?\.js/.test(url))).toEqual([]);
    });

    test('the switcher in the navigation sets the mode, under the site key', async ({ page }) => {
      await open(page);
      expect(await theme(page)).toBe('light');

      for (const mode of ['dark', 'high-contrast', 'light']) {
        await page.click(`#docs-nav .cai-theme-btn:has(input[value="${mode}"])`);
        expect(await theme(page)).toBe(mode);
        await expect(page.locator('#docs-nav input[name="cai-theme"]:checked')).toHaveValue(mode);
      }
      await page.click('#docs-nav .cai-theme-btn:has(input[value="dark"])');
      expect(await page.evaluate(() => localStorage.getItem('cai-site-mode'))).toBe('dark');
      await page.reload();
      expect(await theme(page)).toBe('dark');
    });

    test('a mode can be scoped to any element', async ({ page }) => {
      await open(page);

      const backgrounds = await page
        .locator('#t-modes .docs-scope')
        .evaluateAll((scopes) => scopes.map((el) => getComputedStyle(el).backgroundColor));
      expect(backgrounds).toHaveLength(3);
      expect(backgrounds[0]).not.toBe(backgrounds[1]);
    });
  });

  test.describe('layout', () => {
    for (const width of [360, 768, 1280]) {
      test(`no horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page);

        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        ).toBe(0);
      });
    }
  });

  test.describe('structure', () => {
    test('a unique title, one h1 and no skipped heading level', async ({ page }) => {
      await open(page);

      expect(await page.title()).toMatch(/^CAI documentation/);
      await expect(page.locator('h1')).toHaveCount(1);
      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((headings) =>
          headings
            .filter((el) => el.offsetParent !== null)
            .map((el) => ({ level: Number(el.tagName[1]), text: el.textContent.trim() })),
        );
      expect(levels[0].level).toBe(1);
      for (let i = 1; i < levels.length; i += 1) {
        expect(
          levels[i].level - levels[i - 1].level,
          `"${levels[i - 1].text}" (h${levels[i - 1].level}) → "${levels[i].text}" (h${levels[i].level})`,
        ).toBeLessThanOrEqual(1);
      }
    });

    test('one main, one contentinfo, uniquely named navs, unique ids', async ({ page }) => {
      await open(page);

      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('body > footer')).toHaveCount(1);
      const names = await page
        .locator('nav')
        .evaluateAll((navs) => navs.map((el) => el.getAttribute('aria-label')));
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names).size).toBe(names.length);
      const ids = await page.locator('[id]').evaluateAll((els) => els.map((el) => el.id));
      expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    });

    test('every in-page link points at an element that exists', async ({ page }) => {
      await open(page);

      const broken = await page.locator('a[href^="#"]').evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href) => !document.getElementById(href.slice(1))),
      );
      expect(broken).toEqual([]);
    });

    test('the page navigation links to every component', async ({ page }) => {
      await open(page);

      const hrefs = await page
        .locator('#docs-nav .cai-sidebar__link')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      for (const id of guideIds) expect(hrefs, id).toContain(`#${id}`);
    });

    test('scroll-spy marks the section in view with aria-current="true", never "page"', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      await page.locator('#c-table').scrollIntoViewIfNeeded();
      await expect(page.locator('#docs-nav [aria-current="true"]')).toHaveCount(1);
      await expect(page.locator('#docs-nav [aria-current="page"]')).toHaveCount(0);
      // The only aria-current="page" is the site navigation's own entry (the
      // breadcrumb specimen shows one inside its own demo)
      await expect(page.locator('[aria-current="page"]:not(.cai-breadcrumb *)')).toHaveCount(1);
      await expect(page.locator('.docs-sitenav [aria-current="page"]')).toHaveText('Documentation');
      // The specimen sidebar takes no part in it
      await expect(page.locator('#c-sidebar .cai-sidebar [aria-current="page"]')).toHaveCount(0);
    });
  });

  test.describe('inventory', () => {
    test('the counts in the copy match the packages', async ({ page }) => {
      await open(page);

      const expected = {
        primitives: primitiveColors.length,
        families: Object.keys(tokens.color).length,
        semantic: semanticTokens.length,
        components: components.length,
        objects: layoutObjects.size,
        utilities: utilities.size,
        modules: jsModules.length,
      };
      const counts = await page.locator('[data-count]').evaluateAll((els) =>
        els.map((el) => [el.dataset.count, Number(el.textContent)]),
      );
      expect(counts.length).toBeGreaterThan(0);
      for (const [key, value] of counts) expect(value, key).toBe(expected[key]);
    });

    test('every primitive color has a swatch', async ({ page }) => {
      await open(page);

      const shown = await page
        .locator('#t-primitives .docs-swatch')
        .evaluateAll((swatches) => swatches.map((el) => el.style.getPropertyValue('--v')));
      expect(shown).toEqual(primitiveColors.map((name) => `var(${name})`));
    });

    test('every semantic token has a chip in the three modes', async ({ page }) => {
      await open(page);

      const chips = await page.locator('#t-semantic .docs-token').evaluateAll((all) =>
        all.map((el) => ({
          name: el.querySelector('code').textContent,
          modes: [...el.querySelectorAll('.docs-swatch')].map((swatch) => swatch.dataset.theme),
          values: [...el.querySelectorAll('.docs-swatch')].map((swatch) =>
            swatch.style.getPropertyValue('--v'),
          ),
        })),
      );
      expect(chips.map((chip) => chip.name)).toEqual(semanticTokens);
      for (const chip of chips) {
        expect(chip.modes, chip.name).toEqual(MODES);
        expect(new Set(chip.values), chip.name).toEqual(new Set([`var(${chip.name})`]));
      }
    });

    test('every scale token and setting is shown', async ({ page }) => {
      await open(page);

      const text = async (selector) => (await page.locator(selector).textContent()) ?? '';
      const expectAll = (haystack, names) => {
        for (const name of names) expect(haystack, name).toContain(name);
      };

      expectAll(await text('#t-spacing'), Object.keys(tokens.spacing).map((k) => `--cai-space-${k}`));
      expectAll(await text('#t-sizing'), Object.keys(tokens.sizing).map((k) => `--cai-size-${k}`));
      expectAll(await text('#t-type'), Object.keys(tokens.typography).map((k) => `--cai-${k}`));
      expectAll(await text('#t-radius'), Object.keys(tokens.radius).map((k) => `--cai-radius-${k}`));
      expectAll(await text('#t-shadow'), Object.keys(tokens.shadow).map((k) => `--cai-shadow-${k}`));
      expectAll(await text('#c-motion'), [...settingNames('duration'), ...settingNames('easing')]);
      expectAll(await text('#c-settings'), [...settingNames('z'), ...settingNames('bp')]);
    });

    test('every component has an h2 and the six guidance sections as h3, expanded', async ({ page }) => {
      await open(page);

      // Red line 18 for the first two sections, SR-5 for the rest
      expect(guideIds.length).toBeGreaterThanOrEqual(19);
      for (const id of guideIds) {
        await expect(page.locator(`#${id} > .docs-demo__head h2`), `${id} title`).toHaveCount(1);
        for (const section of SECTIONS) {
          const heading = page.locator(`#h-${id}-${section}`);
          await expect(heading, `${id} ${section}`).toHaveCount(1);
          expect(await heading.evaluate((el) => el.tagName), `${id} ${section}`).toBe('H3');
          // Not folded away: the guidance is part of the page
          await expect(heading, `${id} ${section}`).toBeVisible();
        }
        for (const section of ['when', 'when-not']) {
          const text = await page.locator(`#h-${id}-${section}`).evaluate((heading) => {
            let content = '';
            for (let el = heading.nextElementSibling; el && !/^H[1-6]$/.test(el.tagName); el = el.nextElementSibling) {
              content += el.textContent;
            }
            return content.trim();
          });
          expect(text.length, `${id} ${section} has content`).toBeGreaterThan(20);
        }
        await expect(page.locator(`#${id} .docs-top a[href="#main-content"]`), `${id} back to top`).toHaveText('Back to top');
      }
    });

    test('every core component file has a demo', async ({ page }) => {
      await open(page);

      const files = await page.locator('.docs-demo__file').allTextContents();
      for (const file of componentFiles) {
        expect(files, file).toContain(`components/${file}`);
      }
      const ids = { 'copy-btn': 'c-copy', 'icon-grid': 'c-icons' };
      for (const file of components) {
        const name = file.replace('.css', '');
        await expect(page.locator(`#${ids[name] ?? `c-${name}`}`)).toHaveCount(1);
      }
    });

    test('every platform class is used or named on the page', async ({ page }) => {
      await open(page);

      const html = await page.content();
      for (const selector of platformClasses) {
        expect(html, selector).toContain(selector.slice(1));
      }
    });
  });

  test.describe('demos', () => {
    test('tabs: arrow keys, Home and End move between tabs and show their panel', async ({ page }) => {
      await open(page);

      await page.focus('#tab-summary');
      await expect(page.locator('#tab-summary')).toHaveAttribute('role', 'tab');
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#tab-settings')).toBeFocused();
      await expect(page.locator('#tab-settings')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#panel-settings')).toBeVisible();
      await expect(page.locator('#panel-summary')).toBeHidden();

      await page.keyboard.press('End');
      await expect(page.locator('#tab-logs')).toBeFocused();
      await page.keyboard.press('Home');
      await expect(page.locator('#tab-summary')).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('#tab-logs')).toBeFocused();
    });

    test('the interactive demos are wired', async ({ page }) => {
      await open(page);

      // Toggle drives the motion demo without extra JS
      const dot = page.locator('#c-motion .docs-motion__dot').first();
      const before = await dot.evaluate((el) => getComputedStyle(el).insetInlineStart);
      await page.click('#c-motion .cai-toggle');
      await expect(page.locator('#c-motion .cai-toggle__input')).toBeChecked();
      await expect
        .poll(() => dot.evaluate((el) => getComputedStyle(el).insetInlineStart))
        .not.toBe(before);

      // Modal
      await page.click('[commandfor="docs-modal"][command="show-modal"]');
      await expect(page.locator('#docs-modal')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#docs-modal')).toBeHidden();

      // Players: the video knows its duration, the MIDI file was found and parsed
      await expect(page.locator('.cai-player[data-type="video"] .cai-player-duration')).not.toHaveText('0:00');
      await expect(page.locator('.cai-player[data-type="midi"] .cai-player-duration')).not.toHaveText('0:00');
      await expect(page.locator('.cai-player[data-type="midi"] .cai-player-playpause')).toBeEnabled();
    });

    test('code blocks are highlighted without an injected copy button', async ({ page }) => {
      await open(page);

      expect(await page.locator('pre.cai-code-block .tok-tag').count()).toBeGreaterThan(0);
      await expect(page.locator('.cai-code-block__copy')).toHaveCount(0);
    });

    test('the sidebar specimen is inert and says where the working switcher is', async ({ page }) => {
      await open(page);

      await expect(page.locator('#c-sidebar fieldset.cai-theme-switcher')).toHaveAttribute('disabled', '');
      for (const radio of await page.locator('#c-sidebar input[type="radio"]').all()) {
        await expect(radio).toBeDisabled();
      }
      await expect(page.locator('#c-sidebar .docs-demo__stage .cai-nav-toggle')).toBeDisabled();
      await expect(page.locator('#c-sidebar a[href="#docs-nav"]').first()).toBeVisible();
    });
  });

  test.describe('long lists fold on narrow screens', () => {
    const folds = (page) =>
      page.locator('details[data-fold-narrow]').evaluateAll((all) => all.map((el) => el.open));

    test('open on a wide screen', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      expect(await folds(page)).toEqual([true, true, true]);
    });

    test('closed at 360px, and opened by the native summary', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await open(page);

      expect(await folds(page)).toEqual([false, false, false]);
      await expect(page.locator('#t-semantic .docs-token').first()).toBeHidden();

      await page.click('#t-semantic summary');
      await expect(page.locator('#t-semantic .docs-token').first()).toBeVisible();
      await expect(page.locator('#t-semantic .docs-token')).toHaveCount(semanticTokens.length);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBe(0);
    });

    test('a link to a folded card still lands on that card', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/docs/#c-js');
      await page.waitForLoadState('networkidle');

      expect(await folds(page)).toEqual([false, false, false]);
      const top = () =>
        page.evaluate(() => Math.round(document.getElementById('c-js').getBoundingClientRect().top));
      await expect.poll(top).toBeGreaterThanOrEqual(0);
      await expect.poll(top).toBeLessThan(400);
    });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    for (const width of [360, 1280]) {
      test(`everything is readable at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/docs/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        await expect(page.locator('main [hidden]')).toHaveCount(0);
        expect(
          await page
            .locator('details[data-fold-narrow]')
            .evaluateAll((all) => all.every((el) => el.open)),
        ).toBe(true);
        await expect(page.locator('#t-semantic .docs-token').last()).toBeVisible();
        await expect(page.locator('#c-utilities tbody tr').last()).toBeVisible();
        for (const panel of ['#panel-summary', '#panel-settings', '#panel-logs']) {
          await expect(page.locator(panel)).toBeVisible();
        }
        await expect(page.locator('#h-c-button-when')).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        ).toBe(0);
      });
    }

    test('the color mode switcher works without JavaScript', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/docs/');
      const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const light = await background();
      await page.click('#docs-nav .cai-theme-btn:has(input[value="dark"])');
      await expect.poll(background).not.toBe(light);
    });
  });

  test.describe('copy and accessibility of the page itself', () => {
    test('labels say "color mode", never "theme", outside code', async ({ page }) => {
      await open(page);

      // "Themes and modes" documents the custom themes: it is the one place
      // where the word is the subject
      const offenders = await page.evaluate(() => {
        const found = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!/theme/i.test(node.textContent)) continue;
          if (node.parentElement.closest('code, pre, script, style, #themes, #tokens-model, #accessibility')) continue;
          if (node.parentElement.closest('a[href="#themes"]')) continue;
          found.push(node.textContent.trim());
        }
        document.querySelectorAll('[aria-label], [title], [alt]').forEach((el) => {
          if (el.closest('#themes')) return;
          for (const name of ['aria-label', 'title', 'alt']) {
            if (/theme/i.test(el.getAttribute(name) ?? '')) found.push(el.getAttribute(name));
          }
        });
        return found;
      });
      expect(offenders).toEqual([]);
    });

    test('standalone links are targets of 24px or more', async ({ page }) => {
      await open(page);

      const heights = await page
        .locator('.docs-ref a, .docs-toc a, .docs-sitenav a, .docs-top a')
        .evaluateAll((links) => links.map((el) => el.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(40);
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(24);
    });

    for (const mode of MODES) {
      test(`docs-local text has a contrast of 4.5:1 or more in ${mode}`, async ({ page }) => {
        await page.addInitScript((value) => {
          localStorage.setItem('cai-site-mode', value);
        }, mode);
        await open(page);
        expect(await theme(page)).toBe(mode);
        await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });

        const { checked, failures } = await page.evaluate(() => {
          const parse = (value) => {
            const parts = value.match(/rgba?\(([^)]+)\)/)[1].split(/[,\s/]+/).filter(Boolean).map(Number);
            return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
          };
          const over = (top, bottom) => ({
            r: top.r * top.a + bottom.r * (1 - top.a),
            g: top.g * top.a + bottom.g * (1 - top.a),
            b: top.b * top.a + bottom.b * (1 - top.a),
            a: 1,
          });
          const luminance = ({ r, g, b }) => {
            const channel = (v) => {
              const c = v / 255;
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
          };
          const backgroundOf = (el) => {
            const layers = [];
            for (let node = el; node; node = node.parentElement) {
              const color = parse(getComputedStyle(node).backgroundColor);
              if (color.a > 0) layers.push(color);
              if (color.a === 1) break;
            }
            let result = layers.pop() ?? { r: 255, g: 255, b: 255, a: 1 };
            while (layers.length) result = over(layers.pop(), result);
            return result;
          };

          // Text styled by this page: an element with a docs-* class, or a
          // plain element (no class of its own) directly inside one
          const isLocal = (el) =>
            /(^|\s)docs-/.test(el.className) ||
            (!el.className && /(^|\s)docs-/.test(el.parentElement?.className ?? ''));
          const failures = [];
          let checked = 0;
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const el = node.parentElement;
            if (!node.textContent.trim() || typeof el.className !== 'string' || !isLocal(el)) continue;
            if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
            checked += 1;
            const background = backgroundOf(el);
            const color = over(parse(getComputedStyle(el).color), background);
            const [a, b] = [luminance(color), luminance(background)];
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (ratio < 4.5) {
              failures.push(`${ratio.toFixed(2)} ${el.tagName}.${el.className} "${node.textContent.trim().slice(0, 30)}"`);
            }
          }
          return { checked, failures: [...new Set(failures)] };
        });
        expect(checked).toBeGreaterThan(200);
        expect(failures).toEqual([]);
      });
    }

    test('keyboard: skip link first, focus trapped in the modal and returned', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      await page.keyboard.press('Tab');
      await expect(page.locator('.cai-platform-skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();

      const trigger = page.locator('[commandfor="docs-modal"][command="show-modal"]');
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#docs-modal')).toBeVisible();
      for (let i = 0; i < 5; i += 1) {
        await page.keyboard.press('Tab');
        expect(
          await page.evaluate(
            () =>
              document.activeElement === document.body ||
              Boolean(document.activeElement.closest('#docs-modal')),
          ),
        ).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();

      const region = page.locator('#c-table .cai-table-wrap');
      await region.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(region).toBeFocused();
      expect(await region.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('no smooth scrolling, and the motion demos say so', async ({ page }) => {
      await open(page);

      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
      ).toBe('auto');
      await expect(page.locator('#c-motion .docs-motion__reduced')).toBeVisible();
    });
  });
});
