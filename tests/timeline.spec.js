// @ts-check
/**
 * <luz-timeline> (.claude/plans/specs/timeline.md): an ordered list that works
 * without JavaScript; with it, a rail of date buttons under the cards
 * (horizontal) or a scroll-driven state on the items (vertical). The chunk
 * `timeline.js` is loaded by presence. Fixture: tests/fixtures/timeline.html
 * (`?none` removes every timeline).
 *
 * The no-JS describe turns JavaScript off itself, so it runs in `chromium`
 * too; the rest skips in `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/tests/fixtures/timeline.html';
const DATES = ['March 2020', 'June 2021', 'May 2022', 'October 2023'];
const YEARS = ['2020', '2021', '2022', '2023'];
const RAIL_BUTTON_FOR = (page, id, name) => page.locator(`luz-timeline#${id}`).getByRole('button', { name, exact: true });

const tl = (page, id) => page.locator(`luz-timeline#${id}`);

/** Load the fixture and fail, as an assertion, if the element is not defined. */
async function ready(page, query = '') {
  await page.goto(`${FIXTURE}${query}`);
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => !!customElements.get('luz-timeline')), 'luz-timeline is defined').toBe(true);
}

/**
 * What a timeline shows: the index of the rail button with aria-current, the
 * indexes that are tabbable, the cards that are not inert, the rail button
 * that has the focus. A rail button is a button, outside the list, whose text
 * is one of the items' dates.
 */
const state = (host) =>
  host.evaluate((el) => {
    const items = [...el.querySelectorAll('.luz-timeline__item')];
    const dates = items.map((li) => li.querySelector('time').textContent.trim());
    const rail = [...el.querySelectorAll('button')].filter((b) => !b.closest('.luz-timeline__item') && dates.includes(b.textContent.trim()));
    return {
      items: items.length,
      rail: rail.map((b) => b.textContent.trim()),
      current: rail.findIndex((b) => b.getAttribute('aria-current') === 'true'),
      currents: rail.filter((b) => b.hasAttribute('aria-current') && b.getAttribute('aria-current') !== 'false').length,
      tabbable: rail.map((b, i) => (b.tabIndex === 0 ? i : -1)).filter((i) => i >= 0),
      open: items.map((li, i) => (li.closest('[inert]') ? -1 : i)).filter((i) => i >= 0),
      focused: rail.findIndex((b) => b === document.activeElement),
    };
  });

const current = async (host) => (await state(host)).current;

test.describe('timeline with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript: the no-JS tests are below');

  test('the rail is built: one date button per item, with the item date as its text', async ({ page }) => {
    await ready(page);
    const s = await state(tl(page, 'horizontal'));
    expect(s.rail).toEqual(DATES);
    await expect(tl(page, 'horizontal').locator('button[type="button"]').first()).toBeVisible();
  });

  test('exactly one date has aria-current="true", the first at the start', async ({ page }) => {
    await ready(page);
    const s = await state(tl(page, 'horizontal'));
    expect(s.currents).toBe(1);
    expect(s.current).toBe(0);
  });

  test('roving tabindex: only the current date is tabbable', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    expect((await state(host)).tabbable).toEqual([0]);
    await RAIL_BUTTON_FOR(page, 'horizontal', DATES[2]).click();
    expect((await state(host)).tabbable).toEqual([2]);
  });

  test('only the current card is not inert, and the others are hidden from view', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    expect((await state(host)).open).toEqual([0]);
    const titles = host.locator('.luz-timeline__title');
    await expect(titles.nth(0)).toBeVisible();
    for (const i of [1, 2, 3]) await expect(titles.nth(i)).toBeHidden();
    await RAIL_BUTTON_FOR(page, 'horizontal', DATES[3]).click();
    expect((await state(host)).open).toEqual([3]);
    await expect(titles.nth(3)).toBeVisible();
    await expect(titles.nth(0)).toBeHidden();
  });

  test('in the current card the date is visually hidden (it is on the rail)', async ({ page }) => {
    await ready(page);
    const box = await tl(page, 'horizontal').locator('.luz-timeline__item time').first().evaluate((t) => {
      const r = t.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    expect(box.w <= 1 || box.h <= 1).toBe(true);
  });

  test('clicking a date makes its item the current one', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    await RAIL_BUTTON_FOR(page, 'horizontal', DATES[2]).click();
    const s = await state(host);
    expect(s.current).toBe(2);
    expect(s.currents).toBe(1);
    expect(s.open).toEqual([2]);
  });

  test('Previous and Next have accessible names and move the current item', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    const next = host.getByRole('button', { name: 'Next', exact: true });
    const previous = host.getByRole('button', { name: 'Previous', exact: true });
    await expect(next).toBeVisible();
    await expect(previous).toBeVisible();
    await next.click();
    expect(await current(host)).toBe(1);
    await next.click();
    expect(await current(host)).toBe(2);
    await previous.click();
    expect(await current(host)).toBe(1);
    expect((await state(host)).open).toEqual([1]);
  });

  test('Previous and Next wrap at both ends', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    await host.getByRole('button', { name: 'Previous', exact: true }).click();
    expect(await current(host)).toBe(3);
    await host.getByRole('button', { name: 'Next', exact: true }).click();
    expect(await current(host)).toBe(0);
  });

  test('Previous and Next sit on the sides of the card, mirrored in right-to-left', async ({ page }) => {
    await ready(page);
    const centre = async (id, name) => (await tl(page, id).getByRole('button', { name, exact: true }).boundingBox()).x;
    expect(await centre('horizontal', 'Previous')).toBeLessThan(await centre('horizontal', 'Next'));
    expect(await centre('rtl', 'Previous')).toBeGreaterThan(await centre('rtl', 'Next'));
  });

  test('Right and Left on the rail move the current date, focus follows, and both ends wrap', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    await RAIL_BUTTON_FOR(page, 'horizontal', DATES[0]).focus();
    await page.keyboard.press('ArrowRight');
    let s = await state(host);
    expect([s.current, s.focused]).toEqual([1, 1]);
    await page.keyboard.press('ArrowLeft');
    s = await state(host);
    expect([s.current, s.focused]).toEqual([0, 0]);
    await page.keyboard.press('ArrowLeft');
    s = await state(host);
    expect([s.current, s.focused]).toEqual([3, 3]);
    await page.keyboard.press('ArrowRight');
    s = await state(host);
    expect([s.current, s.focused]).toEqual([0, 0]);
  });

  test('Home and End on the rail go to the first and the last date, focus follows', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    await RAIL_BUTTON_FOR(page, 'horizontal', DATES[0]).focus();
    await page.keyboard.press('End');
    let s = await state(host);
    expect([s.current, s.focused]).toEqual([3, 3]);
    await page.keyboard.press('Home');
    s = await state(host);
    expect([s.current, s.focused]).toEqual([0, 0]);
  });

  test('in dir="rtl" Left moves to the next date and Right to the previous one', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'rtl');
    await RAIL_BUTTON_FOR(page, 'rtl', YEARS[0]).focus();
    await page.keyboard.press('ArrowLeft');
    let s = await state(host);
    expect([s.current, s.focused]).toEqual([1, 1]);
    await page.keyboard.press('ArrowRight');
    s = await state(host);
    expect([s.current, s.focused]).toEqual([0, 0]);
    await page.keyboard.press('ArrowRight');
    s = await state(host);
    expect([s.current, s.focused]).toEqual([3, 3]);
  });

  test('a horizontal swipe over 40 px changes the item, a shorter one does not', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    const card = host.locator('.luz-timeline__item .luz-timeline__title').first();
    const box = await card.boundingBox();
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    const swipe = async (dx) => {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx / 2, y, { steps: 4 });
      await page.mouse.move(x + dx, y, { steps: 4 });
      await page.mouse.up();
    };
    await swipe(-20);
    expect(await current(host)).toBe(0);
    await swipe(-80);
    expect(await current(host)).toBe(1);
    const again = await host.locator('.luz-timeline__item .luz-timeline__title').nth(1).boundingBox();
    await page.mouse.move(again.x + again.width / 2, again.y + again.height / 2);
    await page.mouse.down();
    await page.mouse.move(again.x + again.width / 2 + 80, again.y + again.height / 2, { steps: 8 });
    await page.mouse.up();
    expect(await current(host)).toBe(0);
  });

  test('the current date is scrolled to the middle of a rail that overflows', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'many');
    await RAIL_BUTTON_FOR(page, 'many', 'Year 2006').click();
    const offset = () =>
      host.evaluate((el) => {
        const button = [...el.querySelectorAll('button')].find((b) => b.getAttribute('aria-current') === 'true');
        let rail = button.parentElement;
        while (rail && rail !== el && !/auto|scroll/.test(getComputedStyle(rail).overflowX)) rail = rail.parentElement;
        const r = rail.getBoundingClientRect();
        const b = button.getBoundingClientRect();
        return { scrolls: rail.scrollWidth > rail.clientWidth, delta: Math.abs(b.left + b.width / 2 - (r.left + r.width / 2)) };
      });
    await expect.poll(async () => (await offset()).scrolls).toBe(true);
    await expect.poll(async () => (await offset()).delta, { timeout: 3000 }).toBeLessThanOrEqual(6);
  });

  test('the cards container is aria-live="polite" after the visitor changes the item', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    await host.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(host.locator('[aria-live]')).toHaveCount(1);
    await expect(host.locator('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    // The live region holds the cards, not the rail
    expect(await host.locator('[aria-live]').evaluate((live) => live.querySelectorAll('.luz-timeline__item').length)).toBe(4);
  });

  test('data-luz-label-previous and -next override the names of the buttons', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'labels');
    await expect(host.getByRole('button', { name: 'Back one', exact: true })).toBeVisible();
    await expect(host.getByRole('button', { name: 'Forward one', exact: true })).toBeVisible();
    await expect(host.getByRole('button', { name: 'Previous', exact: true })).toHaveCount(0);
  });

  test('building the rail leaves no error and no warning in the console', async ({ page }) => {
    const messages = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    await ready(page);
    await tl(page, 'horizontal').getByRole('button', { name: 'Next', exact: true }).click();
    expect(messages.filter((m) => !/vite/i.test(m))).toEqual([]);
  });
});

test.describe('timeline autoplay', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('a timeline without the autoplay attribute has no Pause or Play button and never moves', async ({ page }) => {
    await ready(page);
    await expect(tl(page, 'horizontal').getByRole('button', { name: /^(Pause|Play)$/ })).toHaveCount(0);
  });

  test('with autoplay the item advances after the interval, in a loop, with the live region off', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'autoplay');
    await host.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(host.locator('[aria-live]')).toHaveAttribute('aria-live', 'off');
    const first = await current(host);
    await expect.poll(() => current(host), { timeout: 6000 }).not.toBe(first);
    expect(await current(host)).toBe((first + 1) % 4);
    await expect.poll(() => current(host), { timeout: 12000 }).toBe(first);
  });

  test('a visible Pause button stops it, then reads Play, and Play resumes it', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'autoplay');
    await host.scrollIntoViewIfNeeded();
    const pause = host.getByRole('button', { name: 'Pause', exact: true });
    await expect(pause).toBeVisible();
    expect((await pause.boundingBox()).width).toBeGreaterThan(0);
    // Not a pressed-state toggle: the name says the action
    await expect(pause).not.toHaveAttribute('aria-pressed', /.*/);
    await pause.click();
    await page.mouse.move(0, 0);
    const play = host.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeVisible();
    await expect(host.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
    const stopped = await current(host);
    await page.waitForTimeout(4500);
    expect(await current(host)).toBe(stopped);
    await play.click();
    await page.mouse.move(0, 0);
    await expect(host.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect.poll(() => current(host), { timeout: 8000 }).not.toBe(stopped);
  });

  test('it holds while the keyboard focus is inside, and goes on when the focus leaves', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'autoplay');
    await host.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await host.getByRole('button', { name: 'Pause', exact: true }).focus();
    expect(await page.evaluate(() => document.activeElement.matches(':focus-visible'))).toBe(true);
    const held = await current(host);
    await page.waitForTimeout(4500);
    expect(await current(host)).toBe(held);
    await page.evaluate(() => document.activeElement.blur());
    await expect.poll(() => current(host), { timeout: 8000 }).not.toBe(held);
  });

  test('a programmatic click on Next while autoplay runs (pointer outside, no focus ring) leaves the list polite, and the next autoplay step turns it off', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'autoplay');
    await host.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const live = host.locator('[aria-live]');
    await expect(live).toHaveAttribute('aria-live', 'off');
    const first = await current(host);
    // el.click(): no mousemove, no focus, so :focus-visible does not match
    await host.getByRole('button', { name: 'Next', exact: true }).evaluate((b) => b.click());
    expect(await current(host)).toBe((first + 1) % 4);
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect.poll(() => current(host), { timeout: 6000 }).toBe((first + 2) % 4);
    await expect(live).toHaveAttribute('aria-live', 'off');
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('autoplay never starts and the Pause / Play button is not shown', async ({ page }) => {
      await ready(page);
      const host = tl(page, 'autoplay');
      await host.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      // The rail is built (this is not a timeline that failed to upgrade)
      expect((await state(host)).rail).toEqual(YEARS);
      await page.waitForTimeout(4500);
      expect(await current(host)).toBe(0);
      await expect(host.getByRole('button', { name: /^(Pause|Play)$/ })).toHaveCount(0);
    });
  });
});

test.describe('vertical timeline', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  const states = (page) => page.locator('luz-timeline#vertical .luz-timeline__item').evaluateAll((items) => items.map((li) => li.getAttribute('data-luz-state')));
  const centre = (page, index) =>
    page.locator('luz-timeline#vertical .luz-timeline__item').nth(index).evaluate((li) => li.scrollIntoView({ block: 'center' }));

  async function expectStateAt(page, index) {
    await ready(page);
    await centre(page, index);
    await expect.poll(() => states(page)).toEqual([0, 1, 2, 3].map((i) => (i < index ? 'past' : i === index ? 'active' : null)));
  }

  test('after scrolling, the item at the middle is active and the earlier ones are past', async ({ page }) => {
    await expectStateAt(page, 2);
  });

  test('the state follows the scroll back up', async ({ page }) => {
    await expectStateAt(page, 3);
    await centre(page, 1);
    await expect.poll(() => states(page)).toEqual(['past', 'active', null, null]);
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the state is still in the DOM', async ({ page }) => {
      await expectStateAt(page, 2);
    });
  });

  test('the vertical variant has no Pause / Play button', async ({ page }) => {
    await ready(page);
    await expect(tl(page, 'vertical').getByRole('button', { name: /^(Pause|Play)$/ })).toHaveCount(0);
  });
});

test.describe('timeline, accessibility', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds no serious or critical violation in ${theme}`, async ({ page }) => {
      await ready(page);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
    });
  }
});

test.describe('timeline: focus, rail clipping, touch, position, paper', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  /** Open the third card (it holds a link), put the focus on the link. */
  async function focusLinkInThirdCard(page) {
    await ready(page);
    const host = tl(page, 'horizontal');
    await RAIL_BUTTON_FOR(page, 'horizontal', DATES[2]).click();
    expect(await current(host)).toBe(2);
    await host.getByRole('link', { name: 'A link in a card' }).evaluate((a) => a.focus());
    expect(await page.evaluate(() => document.activeElement.tagName)).toBe('A');
    return host;
  }

  test('focus is not lost when Next changes the card the focus was in: it goes to the new current date', async ({ page }) => {
    const host = await focusLinkInThirdCard(page);
    // dispatchEvent: the click does not move the focus by itself
    await host.getByRole('button', { name: 'Next', exact: true }).dispatchEvent('click');
    expect(await current(host)).toBe(3);
    expect(await page.evaluate(() => document.activeElement.tagName)).not.toBe('BODY');
    expect((await state(host)).focused).toBe(3);
  });

  test('focus is not lost when Previous changes the card the focus was in: it goes to the new current date', async ({ page }) => {
    const host = await focusLinkInThirdCard(page);
    await host.getByRole('button', { name: 'Previous', exact: true }).dispatchEvent('click');
    expect(await current(host)).toBe(1);
    expect(await page.evaluate(() => document.activeElement.tagName)).not.toBe('BODY');
    expect((await state(host)).focused).toBe(1);
  });

  test('the focus ring of the current date is not clipped by the rail: at least 4px of room under the button', async ({ page }) => {
    await ready(page);
    const host = tl(page, 'horizontal');
    await RAIL_BUTTON_FOR(page, 'horizontal', DATES[0]).focus();
    const room = await host.evaluate((el) => {
      const button = el.querySelector('button[aria-current="true"]');
      const track = button.parentElement;
      const box = track.getBoundingClientRect();
      const bottom = box.top + track.clientTop + track.clientHeight; // the bottom of the scroll box
      return bottom - button.getBoundingClientRect().bottom;
    });
    // outline-width 2px + outline-offset 2px
    expect(room).toBeGreaterThanOrEqual(4);
  });

  test('the stage lets the browser pinch-zoom: touch-action keeps pinch-zoom next to pan-y', async ({ page }) => {
    await ready(page);
    const action = await tl(page, 'horizontal').locator('.luz-timeline__stage').evaluate((el) => getComputedStyle(el).touchAction);
    expect(action).toContain('pinch-zoom');
    expect(action).toContain('pan-y');
  });

  test('every card says where it is in the set: aria-posinset and aria-setsize on the list items', async ({ page }) => {
    await ready(page);
    for (const id of ['horizontal', 'many']) {
      const positions = await tl(page, id).locator('.luz-timeline__item').evaluateAll((list) =>
        list.map((li) => [li.getAttribute('aria-posinset'), li.getAttribute('aria-setsize')]),
      );
      const n = positions.length;
      expect(positions, id).toEqual(positions.map((_, i) => [String(i + 1), String(n)]));
    }
  });

  test('--luz-timeline-paper set on the luz-timeline element reaches the hump and the dots', async ({ page }) => {
    await ready(page);
    const PAPER = 'rgb(1, 2, 3)';
    await page.evaluate((paper) => document.querySelectorAll('luz-timeline').forEach((el) => el.style.setProperty('--luz-timeline-paper', paper)), PAPER);
    // Horizontal: the stroke of the ground under the hump
    const stroke = await tl(page, 'horizontal').locator('.luz-timeline__hump path').first().evaluate((p) => getComputedStyle(p).stroke);
    expect(stroke).toBe(PAPER);
    // Vertical: the fill of a dot that is neither past nor active
    const dot = await tl(page, 'vertical').locator('.luz-timeline__item').last().evaluate((li) => getComputedStyle(li, '::after').backgroundColor);
    expect(dot).toBe(PAPER);
  });
});

test.describe('timeline imported on its own', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  for (const [mode, file] of [['', 'timeline.js'], ['min', 'timeline.min.js']]) {
    test(`${file} alone defines the element and builds the rail, without loading luz.js, with English names`, async ({ page }) => {
      const requested = [];
      page.on('request', (r) => { if (/\/luz(\.min)?\.js/.test(new URL(r.url()).pathname)) requested.push(r.url()); });
      await ready(page, mode ? `?standalone=${mode}` : '?standalone');
      expect(requested, 'the entry is not loaded').toEqual([]);
      const host = tl(page, 'horizontal');
      expect((await state(host)).rail).toEqual(DATES);
      await expect(host.getByRole('button', { name: 'Previous', exact: true })).toHaveCount(1);
      await expect(host.getByRole('button', { name: 'Next', exact: true })).toHaveCount(1);
      await host.getByRole('button', { name: 'Next', exact: true }).click();
      expect(await current(host)).toBe(1);
    });
  }
});

test.describe('timeline loading', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('the chunk is not requested on a page without a timeline, and is on a page with one', async ({ page }) => {
    const requested = [];
    page.on('request', (r) => { if (/\/timeline(\.min)?\.js/.test(r.url())) requested.push(r.url()); });
    await page.goto(`${FIXTURE}?none`);
    await page.waitForLoadState('networkidle');
    expect(requested).toEqual([]);
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
    expect(requested.length).toBeGreaterThan(0);
  });
});

test.describe('timeline without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const id of ['horizontal', 'vertical']) {
    test(`${id}: an ordered list with every item visible, a dot per item, and no button`, async ({ page }) => {
      await page.goto(FIXTURE);
      const host = tl(page, id);
      await expect(host.locator('ol.luz-timeline')).toHaveCount(1);
      const items = host.locator('.luz-timeline__item');
      await expect(items).toHaveCount(4);
      for (let i = 0; i < 4; i++) {
        await items.nth(i).scrollIntoViewIfNeeded();
        await expect(items.nth(i)).toBeVisible();
        await expect(items.nth(i).locator('.luz-timeline__title')).toBeVisible();
        await expect(items.nth(i).locator('time')).toBeVisible();
      }
      await expect(host.locator('button')).toHaveCount(0);
      // The line and its dots: a pseudo-element on every item, in the no-JS look
      const dots = await items.evaluateAll((list) =>
        list.map((li) => ['::before', '::after'].some((p) => getComputedStyle(li, p).content !== 'none')),
      );
      expect(dots).toEqual([true, true, true, true]);
      // Stacked down the page
      const tops = await items.evaluateAll((list) => list.map((li) => li.getBoundingClientRect().top + window.scrollY));
      expect([...tops].sort((a, b) => a - b)).toEqual(tops);
      expect(new Set(tops).size).toBe(4);
    });
  }
});
