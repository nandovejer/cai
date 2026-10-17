/**
 * Wait until the page has stopped animating: every running CSS transition and
 * animation has finished. Used after a theme flip and before axe, which would
 * otherwise sample a colour mid-transition (Gecko, Safari review 2026-10-16:
 * `#6fb1ec` on `#5e5441` at t=0 of the banner's transition) and report a
 * contrast failure that the settled page does not have.
 * @param {import('@playwright/test').Page} page
 */
export async function settled(page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 10; round++) {
      // only rendered targets: Firefox keeps animations of closed <details> and hidden dialogs 'running' for good
      const running = document.getAnimations().filter((a) => (a.playState === 'running' || a.playState === 'pending') && a.effect?.target?.checkVisibility?.() !== false);
      if (!running.length) break;
      await Promise.allSettled(running.map((a) => a.finished));
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

/**
 * Wait until the colour fade of the page has ended: the CSS transitions on
 * <html> (apps/site/theme-light.css fades the colour tokens for 1.4 s when
 * motion is welcome). Unlike `settled`, it does not wait for an infinite
 * animation elsewhere on the page (a spinner), so it is safe on any page.
 * @param {import('@playwright/test').Page} page
 */
export async function faded(page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 10; round++) {
      const running = document.documentElement.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'pending');
      if (!running.length) break;
      await Promise.allSettled(running.map((a) => a.finished));
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

/**
 * Wait for the network to go quiet. WebKit's driver sometimes never reports it
 * on the Button page of the docs although no request is pending (Safari review
 * 2026-10-17, probed with Playwright's WebKit: the page loads, no request is
 * left, `networkidle` still times out in about one load in two), so there the
 * wait is bounded and the expectations that follow do the waiting. Everywhere
 * else it is exactly `waitForLoadState('networkidle')`.
 * @param {import('@playwright/test').Page} page
 */
export async function idle(page) {
  if (page.context().browser()?.browserType().name() === 'webkit') await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
  else await page.waitForLoadState('networkidle');
}
