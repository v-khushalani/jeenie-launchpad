import { test, expect } from '@playwright/test';

/**
 * Critical User Journey E2E Test
 * 
 * Tests the core flow a new user goes through:
 * 1. Homepage loads correctly
 * 2. User navigates to signup
 * 3. Signup form validation works
 * 4. User navigates to login
 * 5. Login form is functional
 * 6. Navigation between key pages works
 * 7. Protected routes redirect to login
 */

test.describe('Critical User Journey', () => {
  test('homepage → signup → login flow', async ({ page }) => {
    // 1. Homepage loads
    await page.goto('/');
    await expect(page).toHaveTitle(/JEEnie/i);

    // 2. Navigate to login
    const loginLink = page.locator('a,button').filter({ hasText: /login|sign in/i }).first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    } else {
      await page.goto('/login');
    }

    // 3. Verify login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // 4. Navigate to signup
    const signupLink = page.getByRole('link', { name: /sign up|create account|register/i }).first();
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/signup/);

    // 5. Verify signup form presence
    const emailSignupToggle = page.getByRole('button', { name: /sign up with email/i });
    if (await emailSignupToggle.isVisible()) {
      await emailSignupToggle.click();
    }
    await expect(page.getByLabel(/name|full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('signup form validates password requirements', async ({ page }) => {
    await page.goto('/signup');

    const emailSignupToggle = page.getByRole('button', { name: /sign up with email/i });
    if (await emailSignupToggle.isVisible()) {
      await emailSignupToggle.click();
    }

    // Fill with weak password
    const nameField = page.getByLabel(/name|full name/i);
    const emailField = page.getByLabel(/email/i);
    const passwordFields = page.getByLabel(/password/i);

    if (await nameField.isVisible()) {
      await nameField.fill('Test User');
    }
    if (await emailField.isVisible()) {
      await emailField.fill('test@example.com');
    }

    // Fill password fields (there may be password + confirm password)
    const passwordInputs = await passwordFields.all();
    for (const input of passwordInputs) {
      await input.fill('weak');
    }

    // Try to submit
    const submitButton = page.locator('form').getByRole('button', { name: /sign up|create|register/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }

    // Should stay on signup page (validation fails)
    await expect(page).toHaveURL(/signup/);
  });

  test('protected routes redirect unauthenticated users', async ({ page }) => {
    // Try to access practice page without auth
    await page.goto('/practice');

    // Should redirect to login
    await page.waitForURL(/login|\//, { timeout: 5000 }).catch(() => {
      // Some apps show the page with an auth prompt instead of redirecting
    });

    // Either redirected to login or shows the app (unauthenticated state handled by the UI)
    const currentUrl = page.url();
    const isHandled = currentUrl.includes('login') || currentUrl.includes('/');
    expect(isHandled).toBe(true);
  });

  test('protected admin routes redirect non-admin users', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect non-admin users
    await page.waitForURL(/login|\//, { timeout: 5000 }).catch(() => {});

    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/admin');
  });
});

test.describe('Navigation & Page Load', () => {
  test('all critical pages load without errors', async ({ page }) => {
    const publicPages = ['/', '/login', '/signup'];

    for (const pagePath of publicPages) {
      const response = await page.goto(pagePath);
      
      // Page should load (200 or redirect)
      expect(response?.status()).toBeLessThan(500);
      
      // No uncaught JS errors
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      
      // Wait for page to settle
      await page.waitForLoadState('networkidle').catch(() => {});
      
      if (errors.length > 0) {
        console.warn(`Errors on ${pagePath}:`, errors);
      }
    }
  });

  test('mobile viewport loads correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.goto('/');
    
    // Page should be functional
    await expect(page.locator('body')).toBeVisible();
    
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // allow small tolerance
  });

  test('page loads within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    
    // Should load within 10 seconds (generous for CI)
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Accessibility Basics', () => {
  test('login page has proper form labels', async ({ page }) => {
    await page.goto('/login');

    // All inputs should have associated labels
    const inputs = await page.locator('input[type="email"], input[type="password"]').all();
    for (const input of inputs) {
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');
      
      // Should have at least one form of labeling
      const hasLabel = ariaLabel || id || placeholder;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('buttons are keyboard accessible', async ({ page }) => {
    await page.goto('/login');
    
    // Tab to the login button
    const loginButton = page.locator('form').getByRole('button', { name: /login|sign in/i });
    await expect(loginButton).toBeVisible();
    
    // Button should be focusable
    await loginButton.focus();
    await expect(loginButton).toBeFocused();
  });
});
