// @ts-check
/**
 * The submenu of the site header (@luz-ds/site, <luz-submenu>, a CSS-only
 * tag: .claude/plans/specs/f3-package-model.md section 2.2, step 8): a native
 * <details name> in the header's list of links, wrapped in a tag that no
 * script defines and that has no classes inside it. On the page of
 * tests/fixtures/site-top.html, under a banner and the cookie band, so the
 * header is not at the top of the window. Runs in `chromium` and
 * `chromium-nojs`: the pattern has no script, and works the same in both.
 *
 * O1 (accessibility requirements): the accessibility tree of the links is the
 * one that `<details class="luz-site-submenu">` gave before the rename. The
 * two snapshots below were taken from that markup, at 1280 px.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const FIXTURE = '/tests/fixtures/site-top.html';

/** Open the fixture at `width`, in `dir`. */
async function open(page, width, dir = 'ltr') {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(FIXTURE);
  if (dir === 'rtl') await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
}

/** Add a rule. addStyleTag needs script, and this spec also runs without it. */
const style = (page, css) => page.evaluate((text) => document.head.append(Object.assign(document.createElement('style'), { textContent: text })), css);

const box = (page, selector) => page.evaluate((s) => {
  const r = document.querySelector(s).getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
}, selector);

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const focused = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent.trim());

/** The expanded state Chromium gives assistive technology, from its accessibility tree. */
async function expanded(page, selector) {
  const cdp = await page.context().newCDPSession(page);
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  await cdp.detach();
  return nodes[0].properties?.find((p) => p.name === 'expanded')?.value.value;
}

/** The tree of `nav[aria-label=Main]` as `details.luz-site-submenu` rendered it, closed. */
const NAV_CLOSED = `
- /children: equal
- navigation "Main":
  - list:
    - listitem:
      - link "Home":
        - /url: "#top"
    - listitem:
      - group: Wines
    - listitem:
      - link "Visits":
        - /url: "#visits"
    - listitem:
      - group: About us
`;

/** The same with the first submenu open. */
const NAV_WINES_OPEN = `
- /children: equal
- navigation "Main":
  - list:
    - listitem:
      - link "Home":
        - /url: "#top"
    - listitem:
      - group:
        - text: Wines
        - list:
          - listitem:
            - link "Red wines":
              - /url: "#red"
          - listitem:
            - link "White wines":
              - /url: "#white"
          - listitem:
            - link "Sweet wines":
              - /url: "#sweet"
    - listitem:
      - link "Visits":
        - /url: "#visits"
    - listitem:
      - group: About us
`;

test.describe('site submenu', () => {
  test('is <luz-submenu> around a native details: no class on any part, the old class gone, display: contents', async ({ page }) => {
    await open(page, 1280);
    const shape = await page.evaluate(() => ({
      hosts: [...document.querySelectorAll('luz-submenu')].map((host) => ({
        child: [...host.children].map((c) => c.localName),
        parentIs: host.parentElement.localName,
        details: host.firstElementChild.hasAttribute('name'),
        classes: [host, ...host.querySelectorAll('*')].filter((el) => el.hasAttribute('class')).length,
        display: getComputedStyle(host).display,
      })),
      oldClass: document.querySelectorAll('[class*="luz-site-submenu"]').length,
    }));
    expect(shape).toEqual({
      hosts: [
        { child: ['details'], parentIs: 'li', details: true, classes: 0, display: 'contents' },
        { child: ['details'], parentIs: 'li', details: true, classes: 0, display: 'contents' },
      ],
      oldClass: 0,
    });
  });

  test('O1: the accessibility tree of the links is what the classed details gave, closed and open', async ({ page }) => {
    await open(page, 1280);
    await expect(page.locator('#site-nav')).toMatchAriaSnapshot(NAV_CLOSED);
    await page.click('#wines-button');
    await expect(page.locator('#site-nav')).toMatchAriaSnapshot(NAV_WINES_OPEN);
  });

  test('the tag adds no role and no name: the button is the summary, the links are in a list', async ({ page }) => {
    await open(page, 1280);
    const added = await page.locator('luz-submenu').evaluateAll((hosts) => hosts.map((h) => h.getAttributeNames()));
    expect(added).toEqual([[], []]);
  });

  for (const theme of ['light', 'dark', 'high-contrast']) {
    test(`axe finds nothing serious with a submenu open, in ${theme}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(page, 1280);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await page.click('#wines-button');
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }

  test('wide: Tab skips a closed submenu; Enter opens it, its links come next, and the state is exposed', async ({ page }) => {
    await open(page, 1280);
    await page.focus('#brand');
    const order = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      order.push(await focused(page));
    }
    expect(order).toEqual(['Home', 'wines-button', 'Visits', 'about-button', 'login']);
    expect(await expanded(page, '#wines-button')).toBe(false);

    await page.focus('#wines-button');
    await page.keyboard.press('Enter');
    await expect(page.locator('#wines > ul')).toBeVisible();
    expect(await expanded(page, '#wines-button')).toBe(true);
    await page.keyboard.press('Tab');
    expect(await focused(page)).toBe('Red wines');

    // Enter on the button again closes it, and focus stays there
    await page.focus('#wines-button');
    await page.keyboard.press('Enter');
    await expect(page.locator('#wines > ul')).toBeHidden();
    expect(await focused(page)).toBe('wines-button');
    expect(await expanded(page, '#wines-button')).toBe(false);
  });

  test('wide: a box under its button, over the page, which does not move; hovering opens nothing', async ({ page }) => {
    await open(page, 1280);
    await page.hover('#wines-button');
    await expect(page.locator('#wines > ul')).toBeHidden();

    const before = await box(page, 'h1');
    await page.click('#wines-button');
    const button = await box(page, '#wines-button');
    const list = await box(page, '#wines > ul');
    expect(list.top).toBeGreaterThanOrEqual(button.bottom - 1);
    // Starts a gutter before the button, so the link text lines up with it
    expect(Math.abs(list.left + 16 - button.left)).toBeLessThanOrEqual(1);
    expect(await page.locator('#wines > ul').evaluate((ul) => getComputedStyle(ul).position)).toBe('absolute');
    expect(await box(page, 'h1')).toEqual(before);
  });

  test('wide: opening one closes the other (details name)', async ({ page }) => {
    await open(page, 1280);
    await page.click('#wines-button');
    await page.click('#about-button');
    await expect(page.locator('#about > ul')).toBeVisible();
    await expect(page.locator('#wines > ul')).toBeHidden();
  });

  test('wide: the last item opens toward the start, and stays in the window, in both directions', async ({ page }) => {
    for (const dir of ['ltr', 'rtl']) {
      await open(page, 1280, dir);
      await page.click('#about-button');
      const button = await box(page, '#about-button');
      const list = await box(page, '#about > ul');
      if (dir === 'ltr') expect(Math.abs(list.right - 16 - button.right), dir).toBeLessThanOrEqual(1);
      else expect(Math.abs(list.left + 16 - button.left), dir).toBeLessThanOrEqual(1);
      expect(list.left, dir).toBeGreaterThanOrEqual(0);
      expect(list.right, dir).toBeLessThanOrEqual(1280);
      expect(await sideways(page), dir).toBeLessThanOrEqual(0);
    }
  });

  test('narrow: inside the header panel the links are in the flow, under their button; Escape closes the panel and returns focus to the menu button', async ({ page }) => {
    await open(page, 600);
    await page.click('#toggle');
    await expect(page.locator('#site-nav')).toBeVisible();
    // The panel opens under the header, not at the top of the window: a notice and the banner are above it
    const header = await box(page, '#hdr');
    expect(Math.abs((await box(page, '#site-nav')).top - header.bottom)).toBeLessThanOrEqual(1);

    await page.click('#wines-button');
    expect(await page.locator('#wines > ul').evaluate((ul) => getComputedStyle(ul).position)).toBe('static');
    const button = await box(page, '#wines-button');
    const list = await box(page, '#wines > ul');
    const visits = await box(page, '#site-nav > ul > li:nth-child(3) > a');
    expect(list.top).toBeGreaterThanOrEqual(button.bottom - 1);
    expect((await box(page, '#wines > ul a')).left, 'indented').toBeGreaterThan(button.left);
    expect(visits.top, 'the next link moves down').toBeGreaterThanOrEqual(list.bottom - 1);

    await page.focus('#wines > ul a');
    await page.keyboard.press('Escape');
    await expect(page.locator('#site-nav')).toBeHidden();
    expect(await focused(page)).toBe('toggle');
  });

  test('320 px and 200 % text: nothing scrolls sideways, closed or open, in the panel and in the row', async ({ page }) => {
    await open(page, 320);
    await style(page, 'html { font-size: 200% }');
    await page.click('#toggle');
    await page.click('#wines-button');
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    const beyond = await page.evaluate(() => [...document.querySelectorAll('#site-nav *')].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).length);
    expect(beyond).toBe(0);

    await open(page, 769);
    await style(page, 'html { font-size: 200% }');
    await page.click('#about-button');
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    const list = await box(page, '#about > ul');
    expect(list.left).toBeGreaterThanOrEqual(0);
    expect(list.right).toBeLessThanOrEqual(769);
  });

  test('the chevron is decoration: no text in the button but its label', async ({ page }) => {
    await open(page, 1280);
    expect(await page.locator('#wines-button').evaluate((s) => getComputedStyle(s, '::after').content)).toBe('""');
    await expect(page.locator('#wines-button')).toHaveText('Wines');
  });
});
