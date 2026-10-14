// @ts-check
/**
 * The product card (a .luz-card with a linked title and a button), on the
 * Product card example of /docs/components/card/. The accessibility review
 * of 2026-10-13 turned into checks (A1 to A4 of
 * .claude/plans/specs/product-card.md). Runs in `chromium` and
 * `chromium-nojs`: the card has no script and the form posts without one.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/components/card/';
const CARDS = '#red-wines ~ ul > li.luz-card';

/** The Product card example sits in the Code tab: show it. */
async function open(page, width = 1100) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(PAGE);
  // With JavaScript the Design tab may be the remembered one; without it both panels show
  await page.evaluate(() => document.querySelector('[data-docs-view="code"]')?.click());
  await page.evaluate(() => document.getElementById('red-wines').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(150);
}

test.describe('product card', () => {
  test('a click on the button is the button\'s; a click elsewhere in the card is the title link\'s', async ({ page }) => {
    await open(page);
    const cards = page.locator(CARDS);
    expect(await cards.count()).toBe(2);
    for (let i = 0; i < 2; i++) {
      const hit = await cards.nth(i).evaluate((card) => {
        const at = (x, y) => document.elementFromPoint(x, y);
        card.scrollIntoView({ block: 'center', behavior: 'instant' });
        const b = card.querySelector('button').getBoundingClientRect();
        const c = card.getBoundingClientRect();
        const onButton = at(b.x + b.width / 2, b.y + b.height / 2);
        const onPadding = at(c.x + 6, c.y + 6);
        const onImage = at(c.x + c.width / 2, c.y + 40);
        return {
          button: onButton.closest('button') !== null,
          padding: onPadding.closest('a')?.closest('.luz-card__title') !== null && onPadding.closest('a') !== null,
          image: onImage.closest('a') !== null,
        };
      });
      expect(hit, `card ${i + 1}`).toEqual({ button: true, padding: true, image: true });
    }
  });

  test('Tab goes link, button, link, button, in the order of the page; Shift+Tab reverses', async ({ page }) => {
    await open(page);
    const names = await page.evaluate((sel) => {
      return [...document.querySelectorAll(`${sel} a, ${sel} button`)].map((el) => [el.tagName, el.getBoundingClientRect().top + window.scrollY, el.getBoundingClientRect().left]);
    }, CARDS);
    expect(names.map((n) => n[0])).toEqual(['A', 'BUTTON', 'A', 'BUTTON']);
    // Left to right in a row: same top, increasing left
    expect(names[0][2]).toBeLessThan(names[2][2]);

    await page.locator(`${CARDS} a`).first().focus();
    const seen = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      seen.push(await page.evaluate(() => document.activeElement.tagName));
    }
    expect(seen).toEqual(['BUTTON', 'A', 'BUTTON']);
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement.tagName)).toBe('A');
  });

  test('the link rings the card, the button only itself', async ({ page }) => {
    await open(page);
    await page.locator(CARDS).first().locator('a').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const link = await page.evaluate(() => {
      const a = document.activeElement;
      return { link: getComputedStyle(a).outlineStyle, card: getComputedStyle(a, '::after').outlineStyle };
    });
    expect(link.card, 'ring round the card').toBe('solid');
    await page.keyboard.press('Tab');
    const button = await page.evaluate(() => {
      const a = document.activeElement;
      return { tag: a.tagName, ring: getComputedStyle(a).outlineStyle, card: getComputedStyle(a.closest('.luz-card').querySelector('.luz-card__title a'), '::after').outlineStyle };
    });
    expect(button.tag).toBe('BUTTON');
    expect(button.ring).toBe('solid');
    expect(button.card, 'no card ring on the button').toBe('none');
  });

  test('every button on the page has its own name, which starts with its visible text (2.5.3)', async ({ page }) => {
    await open(page);
    const client = await page.context().newCDPSession(page);
    await client.send('DOM.enable');
    const { root } = await client.send('DOM.getDocument', { depth: 0 });
    const names = [];
    const ids = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} button`)].map((b, i) => { b.setAttribute('data-test-index', String(i)); return i; }), CARDS);
    for (const i of ids) {
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-test-index="${i}"]` });
      const { nodes } = await client.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      names.push(nodes[0].name.value);
    }
    expect(names).toEqual(['Add to cart Malbec 2021', 'Add to cart Tempranillo reserva 2019']);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name.startsWith('Add to cart')).toBe(true);
  });

  test('the list is named by its heading, and a status region exists before any press (4.1.3)', async ({ page }) => {
    await open(page);
    const info = await page.evaluate(() => {
      const list = document.querySelector('#red-wines ~ ul');
      const status = document.getElementById('cart-status');
      return {
        labelledby: list.getAttribute('aria-labelledby'),
        label: list.getAttribute('aria-label'),
        heading: document.getElementById('red-wines').tagName,
        status: status?.tagName,
        statusRole: status ? status.getAttribute('role') : null,
        statusEmpty: status?.textContent === '',
      };
    });
    expect(info).toEqual({ labelledby: 'red-wines', label: null, heading: 'H5', status: 'OUTPUT', statusRole: null, statusEmpty: true });
  });

  test('the old price is <s>, with "Was" and "Now" for assistive technology', async ({ page }) => {
    await open(page);
    const price = page.locator(`${CARDS} .luz-card__price`).nth(1);
    await expect(price.locator('s')).toHaveCount(1);
    await expect(price.locator('del')).toHaveCount(0);
    expect(await price.evaluate((p) => p.textContent.replace(/\s+/g, ' ').trim())).toBe('Now 9,90 € Was 12,50 €');
    expect(await price.locator('s').evaluate((s) => getComputedStyle(s).textDecorationLine)).toBe('line-through');
  });

  for (const [width, scale] of [[320, '100%'], [320, '200%'], [1100, '200%']]) {
    test(`A1: a long label wraps inside the button at ${width} px with ${scale} text`, async ({ page }) => {
      await open(page, width);
      await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, scale);
      await page.evaluate((sel) => {
        const b = document.querySelector(`${sel} button`);
        b.firstChild.textContent = 'In den Warenkorb legen';
      }, CARDS);
      const { right, viewport, button } = await page.evaluate((sel) => {
        const b = document.querySelector(`${sel} button`);
        const cards = [...document.querySelectorAll(sel)];
        return {
          // The card and its button stay inside the window: the rest of the page is not under test
          right: Math.max(...cards.map((c) => c.getBoundingClientRect().right)),
          viewport: document.documentElement.clientWidth,
          button: b.scrollWidth - b.clientWidth,
        };
      }, CARDS);
      expect(right, 'cards inside the window').toBeLessThanOrEqual(viewport + 0.5);
      expect(button, 'label inside its button').toBeLessThanOrEqual(0);
    });
  }

  // .claude/plans/specs/button-block.md and its accessibility review (K1, K2)
  for (const width of [320, 1280]) {
    test(`block: each .luz-btn--block is as wide as its container at ${width} px`, async ({ page }) => {
      await open(page, width);
      const widths = await page.evaluate((sel) =>
        [...document.querySelectorAll(`${sel} .luz-btn--block`)].map((b) => {
          const box = b.parentElement.getBoundingClientRect();
          return [b.getBoundingClientRect().width, box.width];
        }), CARDS);
      expect(widths.length).toBe(2);
      for (const [button, container] of widths) expect(Math.abs(button - container)).toBeLessThanOrEqual(1);
    });
  }

  for (const scale of ['100%', '200%']) {
    test(`K1: one long word breaks inside a block button at 320 px with ${scale} text`, async ({ page }) => {
      await open(page, 320);
      await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, scale);
      const { button, right, viewport } = await page.evaluate((sel) => {
        const b = document.querySelector(`${sel} .luz-btn--block`);
        b.firstChild.textContent = 'Handschuhaufbewahrungsbox';
        const card = b.closest('.luz-card');
        return {
          button: b.scrollWidth - b.clientWidth,
          right: card.getBoundingClientRect().right,
          viewport: document.documentElement.clientWidth,
        };
      }, CARDS);
      expect(button, 'label inside its button').toBeLessThanOrEqual(0);
      expect(right, 'card inside the window').toBeLessThanOrEqual(viewport + 0.5);
    });
  }

  test('K1: a button without the modifier in a card breaks a long word too', async ({ page }) => {
    await open(page, 320);
    await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, '200%');
    const overflow = await page.evaluate((sel) => {
      const b = document.querySelector(`${sel} .luz-btn--block`);
      b.classList.remove('luz-btn--block');
      b.firstChild.textContent = 'Handschuhaufbewahrungsbox';
      return b.scrollWidth - b.clientWidth;
    }, CARDS);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('--sm with the full width is at least 24 px high, and the name still starts with its visible text', async ({ page }) => {
    await open(page, 320);
    const { height, name, text } = await page.evaluate((sel) => {
      const b = document.querySelector(`${sel} .luz-btn--block`);
      b.classList.add('luz-btn--sm');
      return { height: b.getBoundingClientRect().height, name: b.textContent.trim(), text: b.firstChild.textContent.trim() };
    }, CARDS);
    expect(height).toBeGreaterThanOrEqual(24);
    expect(name.startsWith(text)).toBe(true);
  });

  // .claude/plans/specs/band-and-featured-card.md (B5, B6) on the Card page
  test('featured: a featured card is as tall as its neighbour and has the 2 px border', async ({ page }) => {
    await open(page, 1100);
    const sizes = await page.evaluate(() => {
      const host = document.createElement('div');
      host.className = 'o-grid o-grid--2';
      host.innerHTML = ['', ' luz-card--featured'].map((m) => `<article class="luz-card${m}"><h4 class="luz-card__title">Two days</h4><p class="luz-card__body">One line.</p></article>`).join('');
      document.querySelector('#red-wines').after(host);
      const [plain, featured] = [...host.children];
      const border = parseFloat(getComputedStyle(featured).borderTopWidth);
      const out = { plain: plain.getBoundingClientRect().height, featured: featured.getBoundingClientRect().height, border, plainBorder: parseFloat(getComputedStyle(plain).borderTopWidth) };
      host.remove();
      return out;
    });
    expect(sizes.border).toBe(2);
    expect(sizes.plainBorder).toBe(1);
    expect(Math.abs(sizes.plain - sizes.featured)).toBeLessThanOrEqual(0.5);
  });

  test('featured: the ring of a linked featured card stands off by at least the border width (B6)', async ({ page }) => {
    await open(page, 1100);
    await page.evaluate((sel) => document.querySelector(sel).classList.add('luz-card--featured'), CARDS);
    await page.locator(`${CARDS} a`).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const after = getComputedStyle(document.activeElement, '::after');
      const card = document.activeElement.closest('.luz-card');
      return { offset: parseFloat(after.outlineOffset), border: parseFloat(getComputedStyle(card).borderTopWidth), style: after.outlineStyle };
    });
    expect(ring.style).toBe('solid');
    expect(ring.border).toBe(2);
    expect(ring.offset).toBeGreaterThanOrEqual(ring.border);
  });

  test('featured: forced colors keep the 2 px border of a featured card', async ({ page }) => {
    await open(page, 1100);
    await page.evaluate((sel) => document.querySelector(sel).classList.add('luz-card--featured'), CARDS);
    await page.emulateMedia({ forcedColors: 'active' });
    const border = await page.locator(CARDS).first().evaluate((c) => {
      const s = getComputedStyle(c);
      return { width: s.borderTopWidth, style: s.borderTopStyle, color: s.borderTopColor, text: getComputedStyle(document.body).color };
    });
    expect(border.width).toBe('2px');
    expect(border.style).toBe('solid');
    // The system colour, not the brand colour: forced colors replaced it
    expect(border.color).not.toBe('rgb(35, 101, 166)');
  });

  test('forced colors: the button keeps a border and the link its ring', async ({ page }) => {
    await open(page);
    await page.emulateMedia({ forcedColors: 'active' });
    const border = await page.locator(`${CARDS} button`).first().evaluate((b) => parseFloat(getComputedStyle(b).borderTopWidth));
    expect(border).toBeGreaterThan(0);
    await page.locator(`${CARDS} a`).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => getComputedStyle(document.activeElement, '::after').outlineStyle)).toBe('solid');
  });
});
