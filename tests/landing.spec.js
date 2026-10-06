/**
 * CAI Design System — Landing page checks
 * The landing (apps/landing) is a level-3 consumer that shows the whole
 * system with the base color modes only. These tests cover the objectively
 * checkable items of its acceptance checklist, and compare the inventory it
 * renders (and the counts in its copy) against the package sources, so the
 * page cannot drift from the system.
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
  semanticCss.indexOf('[data-theme="dark"] {'),
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

/* ---- Helpers ----------------------------------------------------------- */

/** Open the landing and collect failed requests and console problems. */
async function open(page) {
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
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  return { requests, failed, problems };
}

const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);

test.describe('Landing page', () => {
  test.describe('loading and color modes', () => {
    test('loads cleanly, with base color modes only', async ({ page }) => {
      const { requests, failed, problems } = await open(page);

      expect(failed).toEqual([]);
      expect(problems).toEqual([]);
      // No custom theme is loaded, mentioned in markup, or applied
      expect(requests.filter((url) => /themes\//.test(url))).toEqual([]);
      expect(await page.locator('link[href*="themes/"]').count()).toBe(0);
      expect(await page.locator('[data-mode]').count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBeUndefined();
      expect(MODES).toContain(await theme(page));
      // The core behaviors are imported one by one: cai.js would apply its own theme
      expect(requests.filter((url) => /\/cai(\.min)?\.js/.test(url))).toEqual([]);
    });

    test('the mode switch changes data-theme and keeps both switches in sync', async ({ page }) => {
      await open(page);
      expect(await theme(page)).toBe('light');

      for (const mode of ['dark', 'high-contrast', 'light']) {
        await page.click(`.landing-modes [data-landing-mode="${mode}"]`);
        expect(await theme(page)).toBe(mode);
        expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBeUndefined();
        await expect(page.locator('.landing-modes [aria-pressed="true"]')).toHaveAttribute(
          'data-landing-mode',
          mode,
        );
        await expect(page.locator('.cai-theme-btn.is-active')).toHaveAttribute(
          'data-landing-mode',
          mode,
        );
      }

      // The sidebar specimen's buttons drive the same mode
      await page.click('.cai-theme-btn[data-landing-mode="dark"]');
      expect(await theme(page)).toBe('dark');
      await expect(page.locator('.landing-modes [aria-pressed="true"]')).toHaveAttribute(
        'data-landing-mode',
        'dark',
      );
    });

    test('the chosen mode survives a reload, under its own storage key', async ({ page }) => {
      await open(page);
      await page.click('.landing-modes [data-landing-mode="high-contrast"]');

      expect(await page.evaluate(() => localStorage.getItem('cai-landing-mode'))).toBe(
        'high-contrast',
      );
      // The docs apps read cai-theme: the landing must not touch it
      expect(await page.evaluate(() => localStorage.getItem('cai-theme'))).toBeNull();

      await page.reload();
      expect(await theme(page)).toBe('high-contrast');
    });

    test.describe('with a dark OS preference', () => {
      test.use({ colorScheme: 'dark' });

      test('follows the OS until the visitor chooses', async ({ page }) => {
        await open(page);
        expect(await theme(page)).toBe('dark');

        await page.emulateMedia({ colorScheme: 'light' });
        await expect.poll(() => theme(page)).toBe('light');
      });
    });

    test('a mode can be scoped to any element', async ({ page }) => {
      await open(page);

      const backgrounds = await page
        .locator('#t-modes .landing-scope')
        .evaluateAll((scopes) => scopes.map((el) => getComputedStyle(el).backgroundColor));
      expect(backgrounds).toHaveLength(3);
      // light and dark pages differ, whatever the mode of the page itself
      expect(backgrounds[0]).not.toBe(backgrounds[1]);
    });
  });

  test.describe('layout', () => {
    for (const width of [360, 768, 1280]) {
      test(`no horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page);

        const { scrollWidth, innerWidth, overflowX } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflowX: getComputedStyle(document.body).overflowX,
        }));
        expect(scrollWidth).toBe(innerWidth);
        // The overflow is absent, not hidden
        expect(overflowX).toBe('visible');
      });
    }

    test('content is centred at 1440px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page);

      const boxes = await page.locator('.landing-wrap').evaluateAll((wraps) =>
        wraps.map((el) => {
          const rect = el.getBoundingClientRect();
          return { left: rect.left, right: document.documentElement.clientWidth - rect.right };
        }),
      );
      expect(boxes.length).toBeGreaterThan(5);
      for (const { left, right } of boxes) {
        expect(left).toBeGreaterThan(100);
        expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('adoption levels', () => {
    const levels = [
      {
        install: 'npm install @cai-ds/tokens',
        files: ['@cai-ds/tokens@3.0.0/dist/cai-tokens.min.css'],
        absent: ['@cai-ds/core', '@cai-ds/platform'],
      },
      {
        install: 'npm install @cai-ds/tokens @cai-ds/core',
        files: [
          '@cai-ds/tokens@3.0.0/dist/cai-tokens.min.css',
          '@cai-ds/core@3.0.0/dist/cai.min.css',
          '@cai-ds/core@3.0.0/dist/cai.min.js',
        ],
        absent: ['@cai-ds/platform'],
      },
      {
        install: 'npm install @cai-ds/tokens @cai-ds/core @cai-ds/platform',
        files: [
          '@cai-ds/tokens@3.0.0/dist/cai-tokens.min.css',
          '@cai-ds/core@3.0.0/dist/cai.min.css',
          '@cai-ds/platform@3.0.0/dist/platform.min.css',
          '@cai-ds/core@3.0.0/dist/cai.min.js',
        ],
        absent: [],
      },
    ];

    test('each level has one install command and one CDN snippet', async ({ page }) => {
      await open(page);

      const cards = page.locator('#adopt .landing-level');
      await expect(cards).toHaveCount(3);

      for (const [index, level] of levels.entries()) {
        const card = cards.nth(index);
        await expect(card.locator('.cai-platform-command-block')).toHaveCount(1);
        await expect(card.locator('pre.cai-code-block')).toHaveCount(1);

        const command = await card.locator('.cai-platform-command-block__cmd').textContent();
        expect(command.replace(/^\$\s*/, '').trim()).toBe(level.install);

        const snippet = await card.locator('pre.cai-code-block code').textContent();
        let position = -1;
        for (const file of level.files) {
          // Present, and in load order
          const found = snippet.indexOf(file);
          expect(found, `${file} in level ${index + 1}`).toBeGreaterThan(position);
          position = found;
        }
        for (const name of level.absent) expect(snippet).not.toContain(name);
        // Every CDN URL pins the exact version
        const urls = snippet.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/\S+?(?=")/g);
        expect(urls).toHaveLength(level.files.length);
        for (const url of urls) expect(url).toMatch(/@cai-ds\/(tokens|core|platform)@3\.0\.0\//);
        if (snippet.includes('cai.min.js')) {
          expect(snippet).toMatch(/<script type="module" src="[^"]+cai\.min\.js"><\/script>/);
        }
      }
    });

    test('the three levels are layered: 1, 2, then 3 layers included', async ({ page }) => {
      await open(page);

      const included = await page
        .locator('#adopt .landing-stack--mini')
        .evaluateAll((stacks) => stacks.map((el) => el.querySelectorAll('.is-included').length));
      expect(included).toEqual([1, 2, 3]);
    });

    test('copy buttons carry exactly the visible text', async ({ page }) => {
      await open(page);

      const pairs = await page.locator('[data-copy-from]').evaluateAll((buttons) =>
        buttons.map((button) => ({
          label: button.getAttribute('aria-label'),
          copy: button.dataset.copy,
          visible: document.getElementById(button.dataset.copyFrom)?.textContent.trim(),
        })),
      );
      // 3 install commands + 3 CDN snippets + "the whole setup"
      expect(pairs).toHaveLength(7);
      for (const { copy, visible, label } of pairs) {
        expect(visible, label).toBeTruthy();
        expect(copy, label).toBe(visible);
      }
      // Each button says what it copies
      expect(new Set(pairs.map((pair) => pair.label)).size).toBe(pairs.length);
    });

    test('clicking a copy button puts the snippet on the clipboard', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await open(page);

      const button = page.locator('[data-copy-from="snip-l2"]');
      await button.click();

      await expect(button).toHaveClass(/is-copied/);
      await expect(page.locator('#cai-live-region')).toHaveText('Copied to clipboard');
      const expected = (await page.locator('#snip-l2').textContent()).trim();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    });
  });

  test.describe('structure', () => {
    test('exactly one h1 and no skipped heading level', async ({ page }) => {
      await open(page);

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

    test('one banner, one main, one contentinfo, and uniquely named navs', async ({ page }) => {
      await open(page);

      await expect(page.locator('body > header')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('footer')).toHaveCount(1);
      const names = await page
        .locator('nav')
        .evaluateAll((navs) => navs.map((el) => el.getAttribute('aria-label')));
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names).size).toBe(names.length);
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
      expect(counts.length).toBeGreaterThanOrEqual(Object.keys(expected).length);
      for (const [key, value] of counts) expect(value, key).toBe(expected[key]);
    });

    test('every primitive color has a swatch', async ({ page }) => {
      await open(page);

      const shown = await page
        .locator('#t-primitives .landing-swatch')
        .evaluateAll((swatches) => swatches.map((el) => el.style.getPropertyValue('--v')));
      expect(shown).toEqual(primitiveColors.map((name) => `var(${name})`));
    });

    test('every semantic token has a chip in the three modes', async ({ page }) => {
      await open(page);

      const chips = await page.locator('#t-semantic .landing-token').evaluateAll((tokens) =>
        tokens.map((el) => ({
          name: el.querySelector('code').textContent,
          modes: [...el.querySelectorAll('.landing-swatch')].map((swatch) => swatch.dataset.theme),
          values: [...el.querySelectorAll('.landing-swatch')].map((swatch) =>
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

    test('every scale token is shown', async ({ page }) => {
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

    test('every core component file has a demo', async ({ page }) => {
      await open(page);

      const files = await page.locator('#core .landing-demo__file').allTextContents();
      for (const file of componentFiles) {
        expect(files, file).toContain(`components/${file}`);
      }
      // One anchor per component (theme-switcher lives inside the sidebar demo)
      const ids = {
        'copy-btn': 'c-copy',
        'icon-grid': 'c-icons',
      };
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
    test('the interactive demos are wired', async ({ page }) => {
      await open(page);

      // Tabs
      await page.click('#tab-settings');
      await expect(page.locator('#panel-settings')).toBeVisible();
      await expect(page.locator('#panel-summary')).toBeHidden();

      // Toggle drives the motion demo without extra JS
      const dot = page.locator('#c-motion .landing-motion__dot').first();
      const before = await dot.evaluate((el) => getComputedStyle(el).insetInlineStart);
      await page.click('#c-motion .cai-toggle__track');
      await expect(page.locator('#c-motion .cai-toggle__track')).toHaveAttribute('aria-checked', 'true');
      await expect
        .poll(() => dot.evaluate((el) => getComputedStyle(el).insetInlineStart))
        .not.toBe(before);

      // Modal
      await page.click('[data-modal-trigger="landing-modal"]');
      await expect(page.locator('#landing-modal')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#landing-modal')).toBeHidden();

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
      await expect(page.locator('#t-semantic .landing-token').first()).toBeHidden();

      await page.click('#t-semantic summary');
      await expect(page.locator('#t-semantic .landing-token').first()).toBeVisible();
      await expect(page.locator('#t-semantic .landing-token')).toHaveCount(semanticTokens.length);
      // Opening a fold does not widen the page
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBe(0);
    });

    test('a link to a folded card still lands on that card', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/#c-js');
      await page.waitForLoadState('networkidle');

      // Folding shortens the page above the target: the page scrolls back to it
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
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        // Nothing is hidden waiting for a script
        await expect(page.locator('main [hidden]')).toHaveCount(0);
        expect(
          await page
            .locator('details[data-fold-narrow]')
            .evaluateAll((all) => all.every((el) => el.open)),
        ).toBe(true);
        await expect(page.locator('#t-semantic .landing-token').last()).toBeVisible();
        await expect(page.locator('#c-utilities tbody tr').last()).toBeVisible();
        for (const panel of ['#panel-summary', '#panel-settings', '#panel-logs']) {
          await expect(page.locator(panel)).toBeVisible();
        }

        // The adoption message does not depend on a script
        await expect(page.locator('#adopt .landing-level')).toHaveCount(3);
        for (const id of ['snip-l1', 'snip-l2', 'snip-l3']) {
          await expect(page.locator(`#${id}`)).toBeVisible();
          await expect(page.locator(`#${id}`)).toContainText('cai-tokens.min.css');
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        ).toBe(0);
      });
    }
  });

  test.describe('copy and accessibility of the page itself', () => {
    test('labels say "color mode", never "theme"', async ({ page }) => {
      await open(page);

      // Identifiers (file, class, attribute and export names) live in <code>
      const offenders = await page.evaluate(() => {
        const found = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!/theme/i.test(node.textContent)) continue;
          if (node.parentElement.closest('code, pre, script, style')) continue;
          found.push(node.textContent.trim());
        }
        document.querySelectorAll('[aria-label], [title], [alt]').forEach((el) => {
          for (const name of ['aria-label', 'title', 'alt']) {
            if (/theme/i.test(el.getAttribute(name) ?? '')) found.push(el.getAttribute(name));
          }
        });
        return found;
      });
      expect(offenders).toEqual([]);
    });

    test('the page background is one flat color', async ({ page }) => {
      await open(page);

      // The platform gradient fades to a lighter layer over the whole height
      // of the page: on a page this long, dark mode ends up with two tones.
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe(
        'none',
      );
    });

    test('standalone links and specimen controls are honest targets', async ({ page }) => {
      await open(page);

      const heights = await page
        .locator('.landing-ref a, .landing-level__body a, .landing-toc a, .landing-header__nav a')
        .evaluateAll((links) => links.map((el) => el.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(40);
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(24);

      // The navigation toggle in the sidebar specimen opens nothing: it says so
      await expect(page.locator('.landing-demo__stage .cai-nav-toggle')).toBeDisabled();
    });

    for (const mode of MODES) {
      test(`landing-local text has a contrast of 4.5:1 or more in ${mode}`, async ({ page }) => {
        await page.addInitScript((value) => {
          localStorage.setItem('cai-landing-mode', value);
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

          // Text styled by this page: an element with a landing-* class, or a
          // plain element (no class of its own) directly inside one.
          const isLocal = (el) =>
            /(^|\s)landing-/.test(el.className) ||
            (!el.className && /(^|\s)landing-/.test(el.parentElement?.className ?? ''));
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
      await open(page);

      await page.keyboard.press('Tab');
      await expect(page.locator('.cai-platform-skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();

      const trigger = page.locator('[data-modal-trigger="landing-modal"]');
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#landing-modal')).toBeVisible();
      for (let i = 0; i < 5; i += 1) {
        await page.keyboard.press('Tab');
        expect(
          await page.evaluate(() => Boolean(document.activeElement.closest('#landing-modal'))),
        ).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();

      // Focusable regions show a ring the page controls, in every mode
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
      await expect(page.locator('#c-motion .landing-motion__reduced')).toBeVisible();
    });
  });
});
