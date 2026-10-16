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
      const running = document.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'pending');
      if (!running.length) break;
      await Promise.allSettled(running.map((a) => a.finished));
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
