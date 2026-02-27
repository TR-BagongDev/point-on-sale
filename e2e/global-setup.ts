import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects?.[0]?.use || { baseURL: 'http://localhost:3000' };
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
  });
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Fill in login form with admin credentials
    await page.getByLabel('Email').fill('admin@warung.com');
    await page.getByLabel('Password').fill('admin123');

    // Submit login form
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for navigation to complete - should redirect to /kasir after successful login
    await page.waitForURL(/\/kasir/, { timeout: 10000 });

    // Save storage state to preserve authentication
    await context.storageState({ path: 'e2e/.auth/admin.json' });

    console.log('✓ Authentication state saved to e2e/.auth/admin.json');
  } catch (error) {
    console.error('Failed to set up authentication:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
