/**
 * CAI Design System — Landing page checks
 * The landing (apps/landing, served at /) says what CAI is for and why to
 * use it, and how to adopt it. It is a level-3 consumer with the base color
 * modes only. The documentation, with every component and its guidance,
 * lives on its own page (tests/docs.spec.js); old links to the sections that
 * moved there still say where they went.
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

const components = readdirSync(fromRepo('packages/core/src/components')).filter(
  (file) => file.endsWith('.css') && file !== 'index.css' && !file.startsWith('_'),
);

const objectsCss = readFileSync(fromRepo('packages/core/src/objects/_objects.css'), 'utf-8');
const layoutObjects = new Set([...objectsCss.matchAll(/^\.(o-[a-z]+)\b/gm)].map((m) => m[1]));

const MODES = ['light', 'dark', 'high-contrast'];

/* ---- Helpers ----------------------------------------------------------- */

/** Open the landing and collect failed requests and console problems. */
async function open(page, path = '/') {
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

    test('the header switcher is a native radio group in a fieldset', async ({ page }) => {
      await open(page);

      const switcher = page.locator('.landing-header fieldset.cai-theme-switcher');
      await expect(switcher).toHaveCount(1);
      await expect(switcher.locator('legend')).toHaveText('Color mode');
      await expect(switcher.locator('input[type="radio"][name="cai-theme"]')).toHaveCount(3);
      expect(await theme(page)).toBe('light');

      for (const mode of ['dark', 'high-contrast', 'light']) {
        await page.click(`.landing-header .cai-theme-btn:has(input[value="${mode}"])`);
        expect(await theme(page)).toBe(mode);
        expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBeUndefined();
        await expect(page.locator('input[name="cai-theme"]:checked')).toHaveValue(mode);
      }
    });

    test('the arrow keys move between the modes', async ({ page }) => {
      await open(page);

      await page.focus('.landing-header input[value="light"]');
      await page.keyboard.press('ArrowRight');
      expect(await theme(page)).toBe('dark');
    });

    test('the chosen mode survives a reload, under the site key', async ({ page }) => {
      await open(page);
      await page.click('.landing-header .cai-theme-btn:has(input[value="high-contrast"])');

      expect(await page.evaluate(() => localStorage.getItem('cai-site-mode'))).toBe('high-contrast');
      // The platform docs read cai-theme: the landing must not touch it
      expect(await page.evaluate(() => localStorage.getItem('cai-theme'))).toBeNull();

      await page.reload();
      expect(await theme(page)).toBe('high-contrast');
      // The documentation page follows the same choice
      await page.goto('/docs/');
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

    test('color mode options are targets of 24px or more at 360px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await open(page);

      const boxes = await page
        .locator('.landing-header .cai-theme-btn')
        .evaluateAll((labels) => labels.map((el) => el.getBoundingClientRect()));
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
      }
    });

    for (const width of [320, 360, 1280]) {
      test(`header: the visual order follows the DOM order at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page);

        const [brand, nav, modes] = await Promise.all(
          ['.landing-header__brand', '.landing-header__nav', '.landing-header .cai-theme-switcher'].map((selector) =>
            page.locator(selector).evaluate((el) => el.getBoundingClientRect().toJSON()),
          ),
        );
        const before = (a, b) => a.bottom <= b.top + 1 || (Math.abs(a.top - b.top) < a.height && a.left < b.left);
        expect(before(brand, nav)).toBe(true);
        expect(before(nav, modes)).toBe(true);
      });
    }

    test('content is centred at 1440px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page);

      const boxes = await page.locator('.landing-wrap').evaluateAll((wraps) =>
        wraps
          .filter((el) => el.checkVisibility())
          .map((el) => {
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

    test('the page stays short: five screens or fewer at 1280px', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page);

      expect(await page.evaluate(() => document.body.scrollHeight)).toBeLessThanOrEqual(5 * 1000);
    });
  });

  test.describe('first screen', () => {
    test('says what CAI is for, then offers one primary action', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page);

      await expect(page.locator('h1')).toHaveText('Build accessible websites with plain HTML and CSS');
      const hero = page.locator('.landing-hero');
      await expect(hero.locator('.cai-btn--primary')).toHaveCount(2); // the CTA, and the example form's button
      await expect(hero.locator('.landing-hero__copy .cai-btn--primary')).toHaveText('Get started');
      await expect(hero.locator('.landing-hero__copy .cai-btn--primary')).toBeInViewport();
    });

    test('the example form is real, sends nothing and says so', async ({ page }) => {
      await open(page);

      const form = page.locator('form.landing-try');
      await expect(form).toHaveAttribute('aria-labelledby', 'try-title');
      await expect(page.locator('#try-title')).toHaveText('Example form (nothing is sent)');
      // Real controls: typed into and toggled, never inert
      await page.fill('#try-name', 'my-site');
      await page.check('#try-platform');
      await expect(page.locator('#try-platform')).toBeChecked();
      // No personal data is asked for or remembered
      await expect(form.locator('#try-name')).toHaveAttribute('autocomplete', 'off');
      // The button does not submit: it opens a native popover that says nothing was sent
      const button = form.locator('button');
      await expect(button).toHaveAttribute('type', 'button');
      await expect(page.locator('#try-status')).toHaveText('');
      await expect(page.locator('#try-status')).toHaveAttribute('role', 'status');
      await button.click();
      await expect(page.locator('#try-note')).toBeVisible();
      // Repeated in the status region; the popover has no role of its own
      await expect(page.locator('#try-status')).toHaveText('This is an example: nothing was created or sent.');
      expect(await page.locator('#try-note').getAttribute('role')).toBeNull();
      await expect(page.locator('#try-note')).toContainText('nothing was created or sent');
      await page.keyboard.press('Escape');
      await expect(page.locator('#try-note')).toBeHidden();
      expect(new URL(page.url()).search).toBe('');
    });
  });

  test.describe('old links to sections that moved to the docs', () => {
    test('are hidden until targeted', async ({ page }) => {
      await open(page);

      await expect(page.locator('.landing-moved-list')).toBeHidden();
    });

    for (const id of ['c-button', 't-semantic', 'p-footer', 'core']) {
      test(`/#${id} says where it went and links to /docs/#${id}`, async ({ page }) => {
        await open(page, `/#${id}`);

        const notice = page.locator(`#${id}.landing-moved`);
        await expect(notice).toBeVisible();
        await expect(notice).toBeInViewport();
        await expect(notice.locator('a')).toHaveAttribute('href', `/docs/#${id}`);
        await expect(page.locator('#moved-title')).toBeVisible();
        // Only the targeted notice shows
        await expect(page.locator('.landing-moved:visible')).toHaveCount(1);
      });
    }

    test('every old anchor leads to an element of the docs page', async ({ page }) => {
      await open(page);

      const hrefs = await page
        .locator('.landing-moved a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      expect(hrefs.length).toBeGreaterThan(40);
      await page.goto('/docs/');
      for (const href of hrefs) {
        const hash = href.split('#')[1];
        if (hash) await expect(page.locator(`[id="${hash}"]`), href).toHaveCount(1);
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
    test('a unique title, one h1 and no skipped heading level', async ({ page }) => {
      await open(page);

      expect(await page.title()).toMatch(/^CAI: /);
      await expect(page.locator('h1')).toHaveCount(1);
      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((headings) =>
          headings
            .filter((el) => el.offsetParent !== null || el.classList.contains('u-sr-only'))
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

    test('the counts in the copy match the packages', async ({ page }) => {
      await open(page);

      const expected = {
        primitives: primitiveColors.length,
        families: Object.keys(tokens.color).length,
        semantic: semanticTokens.length,
        components: components.length,
        objects: layoutObjects.size,
      };
      const counts = await page.locator('[data-count]').evaluateAll((els) =>
        els.map((el) => [el.dataset.count, Number(el.textContent)]),
      );
      expect(counts.length).toBeGreaterThanOrEqual(Object.keys(expected).length);
      for (const [key, value] of counts) expect(value, key).toBe(expected[key]);
    });

    test('code blocks are highlighted without an injected copy button', async ({ page }) => {
      await open(page);

      expect(await page.locator('pre.cai-code-block .tok-tag').count()).toBeGreaterThan(0);
      await expect(page.locator('.cai-code-block__copy')).toHaveCount(0);
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

    test('the color mode switcher and the example form work', async ({ page }) => {
      await page.goto('/');
      const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const light = await background();
      await page.click('.landing-header .cai-theme-btn:has(input[value="dark"])');
      await expect.poll(background).not.toBe(light);

      await page.click('form.landing-try button');
      await expect(page.locator('#try-note')).toBeVisible();
    });
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

    test('the beta and version tags are text', async ({ page }) => {
      await open(page);

      await expect(page.locator('.landing-header__brand')).toContainText('v3.0.0');
      await expect(page.locator('.landing-header__brand')).toContainText('Beta');
    });

    test('the page background is one flat color', async ({ page }) => {
      await open(page);

      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe(
        'none',
      );
    });

    test('standalone links are honest targets', async ({ page }) => {
      await open(page);

      const heights = await page
        .locator('.landing-level__body a, .landing-guides a, .landing-header__nav a')
        .evaluateAll((links) => links.map((el) => el.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(10);
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(24);
    });

    for (const mode of MODES) {
      test(`landing-local text has a contrast of 4.5:1 or more in ${mode}`, async ({ page }) => {
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
        expect(checked).toBeGreaterThan(60);
        expect(failures).toEqual([]);
      });
    }

    test('keyboard: skip link first, then the main content', async ({ page }) => {
      await open(page);

      await page.keyboard.press('Tab');
      await expect(page.locator('.cai-platform-skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
    });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('no smooth scrolling', async ({ page }) => {
      await open(page);

      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
      ).toBe('auto');
    });
  });
});
