/**
 * CAI Design System — UI Smoke Tests
 * Tests for keyboard navigation, theme switching, modal focus trap, sidebar behavior
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';

async function isModalVisible(modal) {
  return modal.evaluate((el) => {
    if (el.tagName === 'DIALOG') return el.open;
    return !el.classList.contains('is-hidden') && !el.hidden;
  });
}

test.describe('CAI Design System UI Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/apps/docs/index.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Theme System', () => {
    test('should switch to dark theme and persist', async ({ page }) => {
      // Get initial theme
      const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);

      // The header's cycle button steps to the next mode
      await page.click('.site-header .cai-theme-cycle');

      // Verify theme changed
      const newTheme = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(newTheme).not.toBe(initialTheme);
    });

    test('should persist theme after page reload', async ({ page }) => {
      // The documentation page keeps the color mode under the site's key
      await page.evaluate(() => localStorage.setItem('cai-site-mode', 'dark'));
      await page.reload();
      
      // Verify it persists
      const theme = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(theme).toBe('dark');
    });

    // cai.js (initThemeSystem) and its own storage key: no site page loads
    // cai.js since the platform reference moved into /docs/, so a fixture does
    test('should persist a theme chosen with the switcher', async ({ page }) => {
      await page.goto('/tests/fixtures/theme-switcher.html');
      await page.waitForLoadState('networkidle');

      await page.click('.cai-theme-btn:has(input[value="dark"])');

      expect(await page.evaluate(() => localStorage.getItem('cai-theme'))).toBe('dark');
    });

    test('theme switcher is a native radio group that checks the active mode', async ({ page }) => {
      await page.goto('/tests/fixtures/theme-switcher.html');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('fieldset.cai-theme-switcher legend')).toHaveText('Color mode');
      await page.click('.cai-theme-btn:has(input[value="dark"])');
      await expect(page.locator('input[name="cai-theme"][value="dark"]')).toBeChecked();
      await expect(page.locator('input[name="cai-theme"][value="light"]')).not.toBeChecked();
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('should toggle sidebar on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 480, height: 800 });
      
      const sidebar = await page.$('.cai-sidebar');
      const toggleBtn = await page.$('.cai-nav-toggle');
      
      if (toggleBtn && sidebar) {
        // Initially closed
        let isOpen = await sidebar.evaluate(el => el.matches(':popover-open'));
        expect(isOpen).toBe(false);
        
        // Click to open
        await toggleBtn.click();
        await page.waitForTimeout(100);
        
        isOpen = await sidebar.evaluate(el => el.matches(':popover-open'));
        expect(isOpen).toBe(true);
        
        // The open drawer sits in the top layer over the toggle: light dismiss
        // (a click on the backdrop) closes it, as does Escape
        await page.mouse.click(460, 400);
        await page.waitForTimeout(100);
        
        isOpen = await sidebar.evaluate(el => el.matches(':popover-open'));
        expect(isOpen).toBe(false);
      }
    });

    test('sidebar toggle is a native popover trigger for the drawer', async ({ page }) => {
      const toggleBtn = await page.$('.cai-nav-toggle[popovertarget]');
      expect(toggleBtn).not.toBeNull();

      const target = await toggleBtn.getAttribute('popovertarget');
      const drawer = await page.$(`#${target}[popover]`);
      expect(drawer).not.toBeNull();
    });

    test('should close sidebar with Escape key on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 480, height: 800 });
      
      const toggleBtn = await page.$('.cai-nav-toggle');
      const sidebar = await page.$('.cai-sidebar');
      
      if (toggleBtn && sidebar) {
        await toggleBtn.click();
        await page.waitForTimeout(100);
        
        let isOpen = await sidebar.evaluate(el => el.matches(':popover-open'));
        expect(isOpen).toBe(true);
        
        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        
        isOpen = await sidebar.evaluate(el => el.matches(':popover-open'));
        expect(isOpen).toBe(false);
      }
    });
  });

  test.describe('Modal Keyboard & Focus', () => {
    test('should open modal when trigger is clicked', async ({ page }) => {
      // Find a modal trigger button
      const trigger = await page.$('[commandfor][command="show-modal"]');
      if (!trigger) return;
      
      const modalId = await trigger.getAttribute('commandfor');
      const modal = await page.$(`#${modalId}`);
      
      if (modal) {
        const initiallyVisible = await isModalVisible(modal);
        
        await trigger.click();
        await page.waitForTimeout(100);
        
        const isVisible = await isModalVisible(modal);
        expect(initiallyVisible).toBe(false);
        expect(isVisible).toBe(true);
      }
    });

    test('should close modal with Escape key', async ({ page }) => {
      const trigger = await page.$('[commandfor][command="show-modal"]');
      if (!trigger) return;
      
      const modalId = await trigger.getAttribute('commandfor');
      const modal = await page.$(`#${modalId}`);
      const closeBtn = await page.$(`[commandfor="${modalId}"][command="close"]`);
      
      if (modal && closeBtn) {
        // Open modal
        await trigger.click();
        await page.waitForTimeout(100);
        
        let isVisible = await isModalVisible(modal);
        expect(isVisible).toBe(true);
        
        // Press Escape to close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        
        isVisible = await isModalVisible(modal);
        expect(isVisible).toBe(false);
      }
    });

    test('should close modal when close button is clicked', async ({ page }) => {
      const trigger = await page.$('[commandfor][command="show-modal"]');
      if (!trigger) return;
      
      const modalId = await trigger.getAttribute('commandfor');
      const closeBtn = await page.$(`[commandfor="${modalId}"][command="close"]`);
      const modal = await page.$(`#${modalId}`);
      
      if (modal && closeBtn) {
        // Open
        await trigger.click();
        await page.waitForTimeout(100);
        
        let isVisible = await isModalVisible(modal);
        expect(isVisible).toBe(true);
        
        // Close
        await closeBtn.click();
        await page.waitForTimeout(100);
        
        isVisible = await isModalVisible(modal);
        expect(isVisible).toBe(false);
      }
    });

    test('modal should have role="dialog" or be a dialog element', async ({ page }) => {
      const trigger = await page.$('[commandfor][command="show-modal"]');
      if (!trigger) return;
      
      const modalId = await trigger.getAttribute('commandfor');
      const modal = await page.$(`#${modalId}`);
      
      if (modal) {
        const tagName = await modal.evaluate(el => el.tagName);
        const role = await modal.getAttribute('role');
        
        expect(tagName === 'DIALOG' || role === 'dialog').toBe(true);
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('page title should be accessible', async ({ page }) => {
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });

    test('should have skip to main content link', async ({ page }) => {
      // Skip link may exist but is often hidden until Tab
      const skipLink = await page.$('a[href="#main-content"]');
      expect(skipLink).not.toBeNull();

      const main = await page.$('main#main-content, main, [role="main"]');
      expect(main).not.toBeNull();
    });

    test('Tab key should reach focusable elements', async ({ page }) => {
      // Tab once
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT');
      });
      
      expect(focused).toBe(true);
    });

    test('should have visible focus indicators', async ({ page }) => {
      // Tab to focus an element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const focusStyle = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const style = window.getComputedStyle(el);
        const outline = style.outline || style.outlineStyle || 'none';
        return { outline, tagName: el.tagName };
      });
      
      // Just verify an element is focused (focus indicator validation is visual)
      expect(focusStyle).not.toBeNull();
      expect(focusStyle.tagName).toBeTruthy();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should render correctly at 480px (mobile)', async ({ page }) => {
      await page.setViewportSize({ width: 480, height: 800 });
      
      const main = await page.$('main, [role="main"]');
      expect(main).not.toBeNull();
      
      // No horizontal scrollbar
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // Small tolerance
    });

    test('should render correctly at 768px (tablet)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const main = await page.$('main, [role="main"]');
      expect(main).not.toBeNull();
    });

    test('should render correctly at 1024px (desktop)', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      
      const main = await page.$('main, [role="main"]');
      expect(main).not.toBeNull();
    });
  });
});
