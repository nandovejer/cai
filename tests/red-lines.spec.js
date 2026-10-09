/**
 * CAI — the red lines of PRINCIPLES.md that can only be checked in a browser.
 * Every test runs on the home page and every page of the docs site; the visual ones run in the three base
 * themes. The static half lives in tests/red-lines.test.js, stylelint and
 * ESLint; the no-JavaScript half (RL-2) in tests/nojs.spec.js.
 *
 * Breaches that need a decision before they can be fixed are listed in
 * tests/fixtures/red-line-debt.json. That list must be empty on main.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { notFoundRoute, routeOf, routes } from './helpers/docs-site.js';

// The landing and every page of the docs site (a11y.md TEST-7)
const APPS = ['/', ...routes(), notFoundRoute];
const THEMES = ['light', 'dark', 'high-contrast'];
const FIXTURES = ['level-1-tokens.html', 'level-2-core.html', 'level-3-platform.html', 'core-without-tokens.html'];

const { debt } = JSON.parse(readFileSync(new URL('./fixtures/red-line-debt.json', import.meta.url), 'utf-8'));
/** Offenders of one check, minus the breaches already registered as debt. */
const unregistered = (check, offenders) =>
  [...new Set(offenders)].filter(
    (text) => !debt.some((entry) => entry.check === check && text.includes(entry.match)),
  );

async function open(page, url, theme) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  if (theme) {
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
    }, theme);
  }
}

/* ---- RL-12: no third-party request ------------------------------------- */

test.describe('RL-12: no third-party network request', () => {
  const pages = [...APPS, ...FIXTURES.map((f) => `/tests/fixtures/${f}`)];
  for (const url of pages) {
    test(url, async ({ page }) => {
      const external = [];
      await page.route('**/*', (route) => {
        const { protocol, hostname, href } = new URL(route.request().url());
        if (['data:', 'blob:'].includes(protocol) || ['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
          return route.continue();
        }
        external.push(href);
        return route.abort();
      });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      // Lazy images, players and anything below the fold
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForLoadState('networkidle');
      expect(unregistered('third-party', external), 'requests to other hosts').toEqual([]);
    });
  }
});

// security.md SEC-NET-6: the code path that fetches, the site search
test.describe('RL-12: searching makes no third-party request', () => {
  for (const url of ['/', '/docs/', routeOf('c-button')]) {
    test(url, async ({ page }) => {
      const external = [];
      await page.route('**/*', (route) => {
        const { protocol, hostname, href } = new URL(route.request().url());
        if (['data:', 'blob:'].includes(protocol) || ['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return route.continue();
        external.push(href);
        return route.abort();
      });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      // Opened with the button, then with Ctrl+K, with a query each time
      const dialog = page.getByRole('dialog', { name: 'Search the documentation' });
      await page.getByRole('banner').getByRole('button', { name: /^Search docs/ }).click();
      await dialog.getByRole('textbox').fill('button');
      await expect(dialog.locator('[data-cai-search-list] a').first()).toBeVisible();
      await page.keyboard.press('Escape');
      await page.keyboard.press('Control+k');
      await dialog.getByRole('textbox').fill('table');
      await expect(dialog.locator('[data-cai-search-list] a').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(external, 'requests to other hosts').toEqual([]);
    });
  }
});

/* ---- RL-4, RL-9: semantics and names ------------------------------------ */

for (const app of APPS) {
  test.describe(`${app}`, () => {
    test('RL-4: no div or span carries the role of a native element', async ({ page }) => {
      await open(page, app);
      const offenders = await page.evaluate(() => {
        // Role → the native element that has it. Roles with no native
        // element (tab, tablist, tabpanel, note, status, region, group, img
        // for a text avatar…) are not listed.
        const NATIVE = {
          button: 'button', link: 'a', checkbox: 'input', radio: 'input', switch: 'input type=checkbox',
          slider: 'input type=range', spinbutton: 'input type=number', textbox: 'input or textarea',
          searchbox: 'input type=search', combobox: 'select or input list', listbox: 'select', option: 'option',
          progressbar: 'progress', meter: 'meter', dialog: 'dialog', alertdialog: 'dialog', navigation: 'nav',
          main: 'main', banner: 'header', contentinfo: 'footer', complementary: 'aside', form: 'form',
          table: 'table', row: 'tr', cell: 'td', gridcell: 'td', columnheader: 'th', rowheader: 'th',
          rowgroup: 'thead, tbody or tfoot', heading: 'h1–h6', list: 'ul or ol', listitem: 'li',
          separator: 'hr', figure: 'figure', article: 'article', paragraph: 'p', term: 'dfn or dt',
          definition: 'dd', blockquote: 'blockquote', caption: 'caption', code: 'code', group: null,
        };
        return [...document.querySelectorAll('div[role], span[role]')]
          .map((el) => [el, el.getAttribute('role').trim().split(/\s+/)[0]])
          .filter(([, role]) => NATIVE[role])
          .map(([el, role]) => `<${el.tagName.toLowerCase()} role="${role}" class="${el.className}"> → use ${NATIVE[role]}`);
      });
      expect(offenders).toEqual([]);
    });

    test('RL-9: no placeholder as a label, no control without a name', async ({ page }) => {
      await open(page, app);
      const { placeholders, nameless } = await page.evaluate(() => {
        const describe = (el) => `${el.tagName.toLowerCase()}#${el.id}.${[...el.classList].join('.')}`;
        // Placeholder: the field also needs a <label> or aria-labelledby
        const placeholders = [...document.querySelectorAll('input[placeholder], textarea[placeholder]')]
          .filter((el) => !el.labels?.length && !el.getAttribute('aria-labelledby'))
          .map(describe);

        // A name from the DOM: text that is not aria-hidden, an image alt, an
        // svg title, aria-labelledby, aria-label, title, or an input's value.
        // Hidden controls (closed dialogs, popovers, details) are included.
        const textOf = (root) => {
          let text = '';
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
          for (let node = walker.currentNode; node; node = walker.nextNode()) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node !== root && node.closest('[aria-hidden="true"]') !== root.closest('[aria-hidden="true"]')) continue;
              if (node.matches('img[alt], area[alt], input[type="image"][alt]')) text += node.alt;
              if (node.matches('svg') && node.querySelector('title')) text += node.querySelector('title').textContent;
            } else if (!node.parentElement.closest('[aria-hidden="true"]') || root.closest('[aria-hidden="true"]')) {
              text += node.textContent;
            }
          }
          return text.trim();
        };
        const nameOf = (el) => {
          const by = el.getAttribute('aria-labelledby');
          if (by) return by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
          return (
            el.getAttribute('aria-label')?.trim() ||
            textOf(el) ||
            (el.matches('input') ? el.value || (el.labels?.length ? 'label' : '') : '') ||
            (el.matches('select') && el.labels?.length ? 'label' : '') ||
            el.getAttribute('title')?.trim() ||
            ''
          );
        };
        const controls = 'button, a[href], summary, select, input[type="button"], input[type="submit"], input[type="reset"], input[type="image"], [role="button"], [role="link"], [role="tab"], [role="switch"]';
        const nameless = [...document.querySelectorAll(controls)]
          .filter((el) => !el.closest('template'))
          .filter((el) => !nameOf(el))
          .map(describe);
        return { placeholders, nameless };
      });
      expect(placeholders, 'fields labelled only by their placeholder').toEqual([]);
      expect(nameless, 'controls without an accessible name').toEqual([]);
    });

    /* ---- RL-5, RL-6, RL-7: per theme -------------------------------------- */

    for (const theme of THEMES) {
      test(`RL-5: every focusable element shows a 3:1 focus indicator in ${theme}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page, app, theme);
        await page.keyboard.press('Tab'); // keyboard modality, so :focus-visible applies
        const { checked, offenders } = await page.evaluate(() => {
          const parse = (value) => {
            const m = value.match(/rgba?\(([^)]+)\)/);
            if (!m) return null;
            const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
            return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
          };
          const over = (top, bottom) => ({
            r: top.r * top.a + bottom.r * (1 - top.a),
            g: top.g * top.a + bottom.g * (1 - top.a),
            b: top.b * top.a + bottom.b * (1 - top.a),
            a: 1,
          });
          const luminance = ({ r, g, b }) => {
            const c = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
          };
          const ratio = (x, y) => {
            const [a, b] = [luminance(x), luminance(y)];
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          };
          const backgroundOf = (el) => {
            const layers = [];
            for (let node = el; node; node = node.parentElement) {
              const color = parse(getComputedStyle(node).backgroundColor);
              if (color?.a > 0) layers.push(color);
              if (color?.a === 1) break;
            }
            let result = layers.pop() ?? { r: 255, g: 255, b: 255, a: 1 };
            while (layers.length) result = over(layers.pop(), result);
            return result;
          };
          const ring = (el) => {
            const s = getComputedStyle(el);
            return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} | ${s.boxShadow}`;
          };
          const describe = (el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`;

          const offenders = [];
          let checked = 0;
          const focusable = 'a[href], button, input, select, textarea, summary, [tabindex], audio[controls], video[controls]';
          for (const el of document.querySelectorAll(focusable)) {
            if (el.disabled || el.tabIndex < 0 || !el.checkVisibility({ visibilityProperty: true })) continue;
            // A visually hidden input (switch, colour-mode radio) draws its
            // ring on the label around it
            const box = el.getBoundingClientRect();
            const drawn = box.width <= 2 || box.height <= 2 ? el.closest('label') ?? el.parentElement : el;
            const parts = [drawn, ...drawn.querySelectorAll('*')].filter((part) => drawn === el || part !== el);
            el.blur();
            const before = parts.map(ring);
            el.focus({ preventScroll: true });
            if (document.activeElement !== el) continue;
            checked += 1;
            const changed = parts.filter((part, i) => ring(part) !== before[i] || (part === el && getComputedStyle(el).outlineStyle !== 'none'));
            if (!changed.length) {
              offenders.push(`${describe(el)}: no visible focus indicator`);
              continue;
            }
            // Contrast of an outline against what is next to it: the parent's
            // background outside, the element's own inside (negative offset)
            for (const part of changed) {
              const s = getComputedStyle(part);
              // A box-shadow ring is not measured here; "auto" is the browser's
              // own two-tone ring (native controls keep it: PRINCIPLES.md §2)
              if (s.outlineStyle === 'none' || s.outlineStyle === 'auto') continue;
              if (parseFloat(s.outlineWidth) < 2) offenders.push(`${describe(el)}: outline ${s.outlineWidth} is under 2px`);
              const color = parse(s.outlineColor);
              if (!color) continue;
              const adjacent = parseFloat(s.outlineOffset) < 0 ? backgroundOf(part) : backgroundOf(part.parentElement);
              const value = ratio(over(color, adjacent), adjacent);
              if (value < 3) offenders.push(`${describe(el)}: focus ring ${value.toFixed(2)}:1 (${s.outlineColor})`);
            }
          }
          return { checked, offenders };
        });
        expect(checked).toBeGreaterThan(5);
        expect(unregistered('focus', offenders)).toEqual([]);
      });

      test(`RL-6: selected, current, pressed, invalid and disabled states have a non-colour cue in ${theme}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page, app, theme);
        const offenders = await page.evaluate(() => {
          // What a state may change besides colour: weight, style, decoration,
          // a visible border or outline, a shadow, an image or a pseudo-element
          const visibleLine = (s, side) =>
            s[`border${side}Style`] !== 'none' && parseFloat(s[`border${side}Width`]) > 0 && !/rgba\(.*,\s*0\)$|transparent/.test(s[`border${side}Color`])
              ? s[`border${side}Width`] + s[`border${side}Style`]
              : '-';
          const shape = (el) => {
            const s = getComputedStyle(el);
            const pseudo = ['::before', '::after'].map((p) => {
              const ps = getComputedStyle(el, p);
              return ps.content === 'none' ? '-' : `${ps.content} ${ps.width} ${ps.height} ${ps.backgroundImage} ${visibleLine(ps, 'Bottom')}`;
            });
            return [
              s.fontWeight, s.fontStyle, s.textDecorationLine, s.textDecorationStyle,
              ...['Top', 'Right', 'Bottom', 'Left'].map((side) => visibleLine(s, side)),
              s.outlineStyle === 'none' ? '-' : s.outlineStyle, s.boxShadow === 'none' ? '-' : 'shadow',
              s.backgroundImage, s.opacity === '1' ? '-' : 'faded', ...pseudo,
            ].join('|');
          };
          const STATES = [
            ['current', '[aria-current]:not([aria-current="false"])', (p) => !p.matches('[aria-current]:not([aria-current="false"])')],
            ['selected', '[aria-selected="true"]', (p) => p.getAttribute('aria-selected') === 'false'],
            ['pressed', '[aria-pressed="true"]', (p) => p.getAttribute('aria-pressed') === 'false'],
            ['invalid', '[aria-invalid="true"]', (p) => !p.matches('[aria-invalid="true"]')],
            ['disabled', 'button:disabled, input:disabled, select:disabled, textarea:disabled', (p) => !p.matches(':disabled')],
          ];
          // A visually hidden radio or checkbox shows its state on its label
          const face = (el) =>
            el.matches('input') && el.closest('label') && getComputedStyle(el).opacity === '0' ? el.closest('label') : el;
          const kind = (el) => `${el.tagName}|${el.type ?? ''}|${[...el.classList].filter((c) => !/^is-|--error$/.test(c)).sort().join('.')}`;
          const offenders = [];
          for (const [name, selector, isPeer] of STATES) {
            for (const el of document.querySelectorAll(selector)) {
              if (!el.checkVisibility({ visibilityProperty: true })) continue;
              const peer = [...document.querySelectorAll(el.tagName)].find(
                (p) => p !== el && isPeer(p) && kind(p) === kind(el) && p.checkVisibility({ visibilityProperty: true }),
              );
              if (peer && shape(face(peer)) === shape(face(el))) {
                offenders.push(`${name} ${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent || el.value || '').trim().slice(0, 30)}"`);
              }
            }
          }
          // An invalid field points at a visible message: text, not colour
          for (const el of document.querySelectorAll('[aria-invalid="true"]')) {
            const ids = `${el.getAttribute('aria-describedby') ?? ''} ${el.getAttribute('aria-errormessage') ?? ''}`.trim().split(/\s+/);
            const message = ids.map((id) => document.getElementById(id)).find((m) => m?.textContent.trim() && m.checkVisibility());
            if (!message && el.checkVisibility()) offenders.push(`invalid ${el.tagName.toLowerCase()}#${el.id}: no visible error message`);
          }
          // A status alert carries an icon or a title, not only its colour
          for (const el of document.querySelectorAll('.cai-alert')) {
            if (!el.querySelector('.cai-alert__icon, svg, .cai-alert__title')?.textContent.trim() && !el.querySelector('svg')) {
              offenders.push(`status .cai-alert "${el.textContent.trim().slice(0, 30)}": no icon or title`);
            }
          }
          return offenders;
        });
        expect(unregistered('state-cue', offenders)).toEqual([]);
      });

      test(`RL-7: text keeps 4.5:1 when hovered and 3:1 when disabled in ${theme}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page, app, theme);

        // Disabled text is exempt in WCAG, not in CAI: it keeps 3:1 (RL-7)
        const disabled = await page.evaluate(() => {
          const parse = (value) => {
            const p = value.match(/rgba?\(([^)]+)\)/)[1].split(/[,\s/]+/).filter(Boolean).map(Number);
            return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
          };
          const over = (top, bottom) => ({
            r: top.r * top.a + bottom.r * (1 - top.a),
            g: top.g * top.a + bottom.g * (1 - top.a),
            b: top.b * top.a + bottom.b * (1 - top.a),
            a: 1,
          });
          const luminance = ({ r, g, b }) => {
            const c = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
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
          const offenders = [];
          for (const el of document.querySelectorAll(':disabled, [aria-disabled="true"]')) {
            const text = (el.matches('input:not([type="checkbox"], [type="radio"], [type="range"], [type="color"])') ? el.value || el.placeholder : el.textContent).trim();
            if (!text || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true, checkOpacity: true })) continue;
            const background = backgroundOf(el);
            const color = over(parse(getComputedStyle(el).color), background);
            const [a, b] = [luminance(color), luminance(background)];
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (ratio < 3) offenders.push(`${el.tagName.toLowerCase()}:disabled.${[...el.classList].join('.')} "${text.slice(0, 20)}" ${ratio.toFixed(2)}:1`);
          }
          return offenders;
        });
        expect(unregistered('disabled-contrast', disabled), 'disabled text under 3:1').toEqual([]);

        // Hover: every :hover rule is copied right after itself with :hover
        // replaced by :is(*, :hover) (same specificity, matches everything),
        // so the whole page is drawn in its hover state; then axe measures.
        await page.evaluate(() => {
          const force = (list) => {
            for (let i = list.cssRules.length - 1; i >= 0; i--) {
              const rule = list.cssRules[i];
              if (rule instanceof CSSStyleRule) {
                if (!rule.selectorText.includes(':hover')) continue;
                try {
                  list.insertRule(`${rule.selectorText.replaceAll(':hover', ':is(*, :hover)')} { ${rule.style.cssText} }`, i + 1);
                } catch {
                  /* a selector the browser cannot parse once rewritten */
                }
              } else if (rule.cssRules) {
                force(rule);
              }
            }
          };
          for (const sheet of document.styleSheets) {
            try {
              force(sheet);
            } catch {
              /* cross-origin sheet: there are none (RL-12) */
            }
          }
        });
        const { violations } = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
        const hovered = violations.flatMap((v) =>
          v.nodes.map((n) => `${n.target.join(' ')} — ${n.any[0]?.message ?? v.help}`),
        );
        expect(unregistered('hover-contrast', hovered), 'text under 4.5:1 in its hover state').toEqual([]);
      });
    }
  });
}

/* ---- RL-7: syntax colours ------------------------------------------------ */

const SYNTAX = ['comment', 'keyword', 'name', 'property', 'string', 'literal'];

test.describe('RL-7: syntax colours on the code block', () => {
  for (const theme of THEMES) {
    test(`every --cai-code-* colour keeps 4.5:1 (7:1 in high contrast) in ${theme}`, async ({ page }) => {
      // No background transition between the light first paint and the mode
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page, routeOf('c-code-syntax'), theme);

      const { seen, offenders } = await page.evaluate(() => {
        const rgb = (value) => value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
        const luminance = (color) => {
          const [r, g, b] = rgb(color).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const seen = {};
        const offenders = [];
        for (const span of document.querySelectorAll('pre.cai-code-block code [class^="tok-"]')) {
          const pre = span.closest('pre');
          const mode = pre.closest('[data-theme]').dataset.theme;
          const [a, b] = [luminance(getComputedStyle(span).color), luminance(getComputedStyle(pre).backgroundColor)];
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          const kind = span.className.slice(4);
          (seen[mode] ??= new Set()).add(kind);
          const minimum = mode === 'high-contrast' ? 7 : 4.5;
          if (ratio < minimum) offenders.push(`${mode} .tok-${kind} "${span.textContent.slice(0, 20)}" ${ratio.toFixed(2)}:1`);
        }
        return { seen: Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v].sort()])), offenders };
      });

      expect(offenders).toEqual([]);
      // The page mode and the three specimen columns each show all six classes
      for (const mode of new Set([theme, ...THEMES])) expect(seen[mode], mode).toEqual([...SYNTAX].sort());
    });
  }
});
