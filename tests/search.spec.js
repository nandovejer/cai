/**
 * CAI — the site search of @cai-ds/platform, in the docs (a11y.md §2 SRCH-*,
 * TEST-5; security.md SEC-IDX, SEC-NET-6). The pure half (index checks,
 * matching, the shortcut filter) is tests/search.test.js; the no-JavaScript
 * state is in tests/nojs.spec.js.
 * Run with: pnpm test:ui
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routeOf, site } from './helpers/docs-site.js';

const BUTTON = routeOf('c-button');
const THEMES = ['light', 'dark', 'high-contrast'];

const dialog = (page) => page.getByRole('dialog', { name: 'Search the documentation' });
const field = (page) => dialog(page).getByRole('textbox', { name: 'Search the documentation' });
const status = (page) => dialog(page).getByRole('status');
const results = (page) => dialog(page).locator('[data-cai-search-list] a');

async function open(page, url = BUTTON) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/** Open the dialog with the header button and type a query; wait for the count. */
async function searchFor(page, query) {
  await page.getByRole('banner').getByRole('button', { name: /^Search docs/ }).click();
  await expect(field(page)).toBeFocused();
  await field(page).fill(query);
  await expect(status(page)).not.toBeEmpty();
}

test.describe('search: opening and closing', () => {
  test('the header button opens the dialog with the focus in the field (SRCH-1, 2, 9, 12)', async ({ page }) => {
    await open(page);
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('link', { name: 'A–Z index' })).toBeHidden();
    const button = banner.getByRole('button', { name: /^Search docs/ });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    await button.click();
    await expect(dialog(page)).toBeVisible();
    expect(await dialog(page).evaluate((d) => d.matches(':modal'))).toBe(true);
    await expect(field(page)).toBeFocused();
    // The status region is there, and empty, when it opens (SRCH-24)
    await expect(status(page)).toBeEmpty();
    await expect(dialog(page).getByRole('heading', { name: 'Popular' })).toBeVisible();
  });

  test('Ctrl+K and ⌘K open it; a single key never does (SRCH-6, SRCH-8)', async ({ page }) => {
    await open(page);
    for (const key of ['k', '/', 's', 'Alt+k']) {
      await page.keyboard.press(key);
      await expect(dialog(page), key).toBeHidden();
    }
    for (const key of ['Control+k', 'Meta+k']) {
      await page.keyboard.press(key);
      await expect(dialog(page), key).toBeVisible();
      await expect(field(page)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog(page)).toBeHidden();
    }
  });

  test('Ctrl+K again selects the query; in a text area it is left alone (SRCH-8)', async ({ page }) => {
    await open(page);
    await page.keyboard.press('Control+k');
    await field(page).fill('button');
    await dialog(page).getByRole('button', { name: 'Close search' }).focus();
    await page.keyboard.press('Control+k');
    await expect(field(page)).toBeFocused();
    expect(await field(page).evaluate((input) => [input.selectionStart, input.selectionEnd])).toEqual([0, 6]);
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      const area = document.createElement('textarea');
      area.setAttribute('aria-label', 'Notes');
      document.querySelector('main').prepend(area);
      area.focus();
    });
    await page.keyboard.press('Control+k');
    await expect(dialog(page)).toBeHidden();
  });

  test('Escape closes it in one press with text in the field, and the focus goes back (SRCH-13, W9)', async ({ page }) => {
    await open(page);
    // After Ctrl+K the focus returns to what had it, not to the button
    const link = page.getByRole('banner').getByRole('link', { name: 'Components' });
    await link.focus();
    await page.keyboard.press('Control+k');
    await field(page).fill('tabs');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(link).toBeFocused();
    // The next search starts empty
    await page.keyboard.press('Control+k');
    await expect(field(page)).toHaveValue('');
    // The close button closes it too, back to the button that opened it
    await dialog(page).getByRole('button', { name: 'Close search' }).click();
    await expect(dialog(page)).toBeHidden();
    const button = page.getByRole('banner').getByRole('button', { name: /^Search docs/ });
    await button.click();
    await dialog(page).getByRole('button', { name: 'Close search' }).click();
    await expect(button).toBeFocused();
  });

  test('after Ctrl+K and Escape with nothing focused, Tab starts at the skip link (2.4.3)', async ({ page }) => {
    // The browser starts the next Tab from the closed dialog: it comes first in <body>
    await open(page);
    await page.keyboard.press('Control+k');
    await expect(field(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  });
});

test.describe('search: results', () => {
  test('results are links grouped under headings, 8 at most, and the count is announced (SRCH-18, 19, 24, 25)', async ({ page }) => {
    await open(page);
    await searchFor(page, 't');
    const groups = dialog(page).locator('[data-cai-search-results] > :not([hidden])');
    await expect(groups.locator('h3')).toHaveText(['Pages', 'Sections', 'HTML elements']);
    for (const list of await dialog(page).locator('[data-cai-search-list]').all()) {
      expect(await list.locator('li > a').count()).toBeLessThanOrEqual(8);
    }
    await expect(status(page)).toHaveText(/^\d+ of \d+ results\. Type more to narrow them\.$/);
    await field(page).fill('keyboard tooltip');
    await expect(status(page)).toHaveText('1 result');
    await expect(results(page)).toHaveText(['Keyboard and ARIA, Tooltip › Code']);
  });

  test('the count waits until the reader stops typing (SRCH-24)', async ({ page }) => {
    await open(page);
    await page.keyboard.press('Control+k');
    const changes = await page.evaluate(() => {
      const region = document.querySelector('[data-cai-search] [role="status"]');
      const seen = [];
      new MutationObserver(() => seen.push(region.textContent)).observe(region, { childList: true, characterData: true, subtree: true });
      window.__statusChanges = seen;
      return seen.length;
    });
    expect(changes).toBe(0);
    await field(page).pressSequentially('button', { delay: 40 });
    await expect(status(page)).not.toBeEmpty();
    await page.waitForTimeout(400);
    const seen = await page.evaluate(() => window.__statusChanges.filter(Boolean));
    expect(seen).toHaveLength(1);
  });

  test('no results: the query, a hint and the A–Z link; the query is text, never a pattern (SRCH-26, SEC-IDX-10)', async ({ page }) => {
    await open(page);
    await searchFor(page, "zz$&$'$`{n}");
    await expect(status(page)).toHaveText("No results for “zz$&$'$`{n}”.");
    await expect(dialog(page).getByText('Check the spelling or try a shorter word.')).toBeVisible();
    await expect(dialog(page).getByRole('heading', { name: 'Popular' })).toBeHidden();
    await expect(dialog(page).getByRole('link', { name: 'Browse the A–Z index' })).toBeVisible();
  });

  test('the first result is the page of that name', async ({ page }) => {
    await open(page);
    const sample = site.pages.filter((p) => p.meta.search !== 'false' && ['components', 'tokens', 'platform', 'html'].includes(p.meta.area));
    const titles = sample.filter((_, i) => i % 4 === 0);
    expect(titles.length).toBeGreaterThan(10);
    await page.keyboard.press('Control+k');
    for (const p of titles) {
      await field(page).fill(p.meta.title);
      await expect(results(page).first(), p.meta.title).toHaveAttribute('href', new RegExp(`${p.route}$`));
    }
  });
});

test.describe('search: keyboard (SRCH-20)', () => {
  test('Down from the field, Down and Up across groups, Home and End, Up back to the field', async ({ page }) => {
    await open(page);
    await searchFor(page, 'tab');
    const links = results(page);
    const count = await links.count();
    expect(count).toBeGreaterThan(9);
    await page.keyboard.press('ArrowDown');
    await expect(links.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(links.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(links.nth(count - 1)).toBeFocused();
    // No wrap at the end
    await page.keyboard.press('ArrowDown');
    await expect(links.nth(count - 1)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(links.nth(0)).toBeFocused();
    // Across the groups: the last page, then the first section
    const pages = await dialog(page).locator('[data-cai-search-list="pages"] a').count();
    for (let i = 1; i <= pages; i++) await page.keyboard.press('ArrowDown');
    await expect(dialog(page).locator('[data-cai-search-list="sections"] a').first()).toBeFocused();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowUp');
    await expect(field(page)).toBeFocused();
  });

  test('typing on a result goes back to the field and edits the query', async ({ page }) => {
    await open(page);
    await searchFor(page, 'tab');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('s');
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveValue('tabs');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Backspace');
    await expect(field(page)).toBeFocused();
  });

  test('Enter in the field follows the first result; Enter on a result follows it', async ({ page }) => {
    await open(page);
    await searchFor(page, 'tabs');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${routeOf('c-tabs')}$`));
    await searchFor(page, 'modal');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${routeOf('c-modal')}$`));
  });

  test('the Enter that ends an IME composition does not follow a result (3.2.2)', async ({ page }) => {
    await open(page);
    await searchFor(page, 'tabs');
    await field(page).dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true });
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(new RegExp(`${BUTTON}$`));
    await expect(dialog(page)).toBeVisible();
  });

  test('the focused result has the focus ring (SRCH-21) and is at least 24px high (SRCH-22)', async ({ page }) => {
    await open(page);
    await searchFor(page, 'tab');
    await page.keyboard.press('ArrowDown');
    const link = results(page).first();
    const style = await link.evaluate((a) => ({ width: getComputedStyle(a).outlineWidth, style: getComputedStyle(a).outlineStyle, height: a.getBoundingClientRect().height }));
    expect(style.style).not.toBe('none');
    expect(parseFloat(style.width)).toBeGreaterThanOrEqual(2);
    expect(style.height).toBeGreaterThanOrEqual(24);
  });
});

test.describe('search: results inside a tab (F1, SRCH-14)', () => {
  test('a section of another page opens on its tab', async ({ page }) => {
    await open(page, '/docs/');
    await searchFor(page, 'when to use button');
    await results(page).first().click();
    await expect(page).toHaveURL(new RegExp(`${BUTTON}#when$`));
    await expect(page.locator('#design-panel')).toBeVisible();
    await expect(page.locator('#when')).toBeInViewport();
  });

  test('a section of this page closes the dialog, opens its tab and takes the focus', async ({ page }) => {
    await open(page);
    // The Code tab is open; the result is in the Design tab
    await expect(page.locator('#design-panel')).toBeHidden();
    await searchFor(page, 'when not to use button');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeHidden();
    await expect(page.locator('#design-panel')).toBeVisible();
    await expect(page.locator('#when-not')).toBeFocused();
    await expect(page.locator('#when-not')).toBeInViewport();
  });
});

test.describe('search: the index (SRCH-17, SEC-IDX, SEC-NET)', () => {
  test('loads on the first open only, from this origin, and shows an error with the A–Z link when it fails', async ({ page }) => {
    const requests = [];
    await page.route('**/search-index.json', (route) => {
      requests.push(route.request().url());
      return route.fulfill({ status: 500, body: 'no' });
    });
    await open(page);
    expect(requests).toEqual([]);
    await page.keyboard.press('Control+k');
    await expect(status(page)).toHaveText('Search is not available right now.');
    await expect(dialog(page).getByRole('link', { name: 'Browse the A–Z index' })).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0]).origin).toBe(new URL(page.url()).origin);
  });

  test('a label with a placeholder the state does not have still shows, and the next open retries (SEC-IDX-9)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let requests = 0;
    await page.route('**/search-index.json', (route) => {
      requests++;
      return route.fulfill({ status: 500, body: 'no' });
    });
    await open(page);
    await page.locator('[data-cai-search]').evaluate((d) => {
      d.setAttribute('data-cai-label-error', 'Down {n}');
      d.setAttribute('data-cai-label-loading', 'Loading {n}');
    });
    for (let i = 1; i <= 2; i++) {
      await page.keyboard.press('Control+k');
      await expect(status(page)).toHaveText('Down');
      await page.keyboard.press('Escape');
      expect(requests).toBe(i);
    }
    expect(errors).toEqual([]);
  });

  test('a same-page result with a malformed hash navigates without an error (SEC-MISC-11)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/search-index.json', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 1, pages: [['broken hash', `${BUTTON}#%E0%A4%A`]] }) }),
    );
    await open(page);
    await searchFor(page, 'broken');
    await results(page).first().click();
    await expect(dialog(page)).toBeHidden();
    await page.waitForTimeout(100);
    expect(errors).toEqual([]);
  });

  test('says it is loading while the index is on its way', async ({ page }) => {
    let release;
    const held = new Promise((resolve) => (release = resolve));
    await page.route('**/search-index.json', async (route) => {
      await held;
      await route.continue();
    });
    await open(page);
    await page.keyboard.press('Control+k');
    await expect(status(page)).toHaveText('Loading the search index…');
    release();
    await expect(status(page)).toBeEmpty();
    await field(page).fill('button');
    await expect(results(page).first()).toBeVisible();
  });

  test('never loads an index from another origin or a data: URL (SEC-NET-1, SEC-NET-6)', async ({ page }) => {
    for (const src of ['https://example.com/x.json', 'data:application/json,{"version":1,"pages":[["Evil","https://example.com/"]]}', '//example.com/x.json']) {
      const external = [];
      await page.route('**/*', (route) => {
        const { hostname } = new URL(route.request().url());
        if (hostname === 'localhost') return route.continue();
        external.push(route.request().url());
        return route.abort();
      });
      await open(page);
      await page.locator('[data-cai-search]').evaluate((d, value) => d.setAttribute('data-cai-search-src', value), src);
      await page.keyboard.press('Control+k');
      await expect(status(page), src).toHaveText('Search is not available right now.');
      expect(external, src).toEqual([]);
      await page.unrouteAll();
    }
  });

  test('writes every text as text, keeps only http(s) links and a valid lang (SEC-IDX-1/4/6, SRCH-31)', async ({ page }) => {
    await page.route('**/search-index.json', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          version: 1,
          pages: [
            ['<img src=x onerror=alert(1)> evil', 'components/button/', '<b>meta</b>'],
            ['evil script', 'javascript:alert(1)'],
            ['evil data', 'data:text/html,<b>x</b>'],
            ['evil español', 'components/button/', 'Componentes', 'es'],
            ['evil lang', 'components/button/', '', 'en" onfocus="x'],
          ],
        }),
      }),
    );
    await open(page);
    await searchFor(page, 'evil');
    await expect(results(page)).toHaveCount(3);
    await expect(dialog(page).locator('img, b')).toHaveCount(0);
    await expect(results(page).filter({ hasText: 'onerror' })).toHaveText('<img src=x onerror=alert(1)> evil <b>meta</b>');
    for (const href of await results(page).evaluateAll((links) => links.map((a) => a.href))) expect(href).toMatch(/^http:\/\/localhost:5173\//);
    await expect(results(page).filter({ hasText: 'español' })).toHaveAttribute('lang', 'es');
    expect(await results(page).filter({ hasText: 'evil lang' }).evaluate((a) => [a.getAttribute('lang'), a.getAttribute('onfocus')])).toEqual([null, null]);
  });
});

test.describe('search: rendering', () => {
  for (const theme of THEMES) {
    test(`axe with the dialog open, with results and with none, in ${theme}`, async ({ page }) => {
      await open(page);
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
      for (const query of ['tab', 'zzqx']) {
        await searchFor(page, query);
        await page.waitForTimeout(400);
        const { violations } = await new AxeBuilder({ page })
          .include('[data-cai-search]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`);
        expect(blocking, `${theme} "${query}"`).toEqual([]);
        await page.keyboard.press('Escape');
      }
    });
  }

  test('forced colors: the dialog keeps a border and the focused result an outline (SRCH-16, TEST-9)', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page);
    await searchFor(page, 'tab');
    const border = await dialog(page).evaluate((d) => getComputedStyle(d).borderTopStyle + ' ' + getComputedStyle(d).borderTopWidth);
    expect(border).toBe('solid 1px');
    await page.keyboard.press('ArrowDown');
    const outline = await results(page).first().evaluate((a) => getComputedStyle(a).outlineStyle);
    expect(outline).not.toBe('none');
  });

  test('reduced motion: the dialog opens without an animation (SRCH-16, TEST-10)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.keyboard.press('Control+k');
    const duration = await dialog(page).evaluate((d) => parseFloat(getComputedStyle(d).animationDuration) || 0);
    expect(duration).toBe(0);
  });

  test('320 × 256 (400 % zoom): the dialog fits the screen and scrolls, nothing is cut off (SRCH-15)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    await open(page);
    await page.getByRole('banner').getByRole('button', { name: /^Search docs/ }).click();
    await field(page).fill('tab');
    const box = await dialog(page).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.width).toBeLessThanOrEqual(320);
    expect(box.height).toBeLessThanOrEqual(256);
    await expect(field(page)).toBeInViewport();
    await expect(dialog(page).getByRole('button', { name: 'Close search' })).toBeInViewport();
    const overflow = await dialog(page).evaluate((d) => d.scrollWidth - d.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    // The results are reachable: the last one scrolls into view when focused
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await expect(results(page).last()).toBeInViewport();
  });
});
