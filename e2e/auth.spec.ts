import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    
    // Check for email/password inputs
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should show signup option', async ({ page }) => {
    await page.goto('/login');
    
    // Check for signup link
    const signupLink = page.getByRole('link', { name: /sign up|create account|register/i });
    await expect(signupLink).toBeVisible();
  });

  test('should show forgot password option', async ({ page }) => {
    await page.goto('/login');
    
    const forgotLink = page.getByRole('link', { name: /forgot|forgot password/i });
    await expect(forgotLink).toBeVisible();
  });

  test('should validate empty form submission', async ({ page }) => {
    await page.goto('/login');
    
    // Click login without filling form
    const loginButton = page.locator('form').getByRole('button', { name: /login|sign in/i });
    await loginButton.click();
    
    // Should show validation error or stay on same page
    await expect(page).toHaveURL(/login/);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    
    const signupLink = page.getByRole('link', { name: /sign up|create account|register/i });
    await signupLink.click();
    
    await expect(page).toHaveURL(/signup/);
  });
});
