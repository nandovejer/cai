import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  expect: {
    // Visual regression (tests/visual.spec.js). threshold is the per-pixel
    // colour distance (0 to 1; the default 0.2 lets a one-step token change
    // through, 0.1 does not). maxDiffPixelRatio is the share of the image that
    // may differ at all: 0.2 %, which leaves room for anti-aliasing and not
    // for a moved border or a changed fill.
    toHaveScreenshot: { threshold: 0.1, maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/nojs.spec.js',
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: '**/nojs.spec.js',
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: '**/nojs.spec.js',
    },
    // PRINCIPLES.md §3: every page must be usable with JavaScript off
    {
      name: 'chromium-nojs',
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
      testMatch: ['**/nojs.spec.js', '**/rtl.spec.js', '**/landing-i18n.spec.js', '**/site-header.spec.js', '**/product-card.spec.js', '**/section-band.spec.js', '**/site-hero.spec.js', '**/speakers.spec.js', '**/table-sort.spec.js', '**/meter.spec.js', '**/avatar.spec.js', '**/cms.spec.js', '**/prose.spec.js', '**/meta.spec.js', '**/site-submenu.spec.js', '**/site-banner.spec.js', '**/css-only-tags.spec.js', '**/site-consent.spec.js', '**/timeline.spec.js', '**/objects.spec.js', '**/navbar.spec.js', '**/band.spec.js', '**/image.spec.js', '**/skip-link.spec.js', '**/landing-header.spec.js', '**/landing-hero.spec.js', '**/landing-footer.spec.js', '**/landing-optional-site.spec.js', '**/cms-header.spec.js', '**/cms-page-header.spec.js', '**/cms-optional-site.spec.js'],
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
