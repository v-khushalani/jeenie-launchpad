import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check page title exists
    await expect(page).toHaveTitle(/JEEnie/i);
  });

  test('should have navigation menu', async ({ page }) => {
    await page.goto('/');
    
    // Check for main navigation elements
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Find and click login button/link
    const loginLink = page.getByRole('link', { name: /login|sign in/i });
    
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should still be functional on mobile
    await expect(page.locator('body')).toBeVisible();
  });
});
