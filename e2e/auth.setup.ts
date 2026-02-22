import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // Fill in login form with admin credentials
  await page.getByLabel('Email').fill('admin@warung.com');
  await page.getByLabel('Password').fill('admin123');

  // Submit login form
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for navigation to complete - should redirect to /kasir after successful login
  await page.waitForURL(/\/kasir/, { timeout: 10000 });

  // Save storage state to preserve authentication
  await page.context().storageState({ path: authFile });
});
