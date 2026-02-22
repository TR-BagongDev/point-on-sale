#!/usr/bin/env node
import { chromium, type BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(process.cwd(), 'e2e/.auth/admin.json');

async function saveAuthState() {
  console.log('Starting authentication setup...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Fill in login form
    console.log('Filling in credentials...');
    await page.getByLabel('Email').fill('admin@warung.com');
    await page.getByLabel('Password').fill('admin123');

    // Submit login form
    console.log('Submitting login form...');
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for navigation to /kasir
    console.log('Waiting for successful login...');
    await page.waitForURL(/\/kasir/, { timeout: 15000 });

    // Ensure auth directory exists
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Save storage state
    console.log('Saving authentication state...');
    await context.storageState({ path: authFile });

    console.log(`✓ Authentication state saved to ${authFile}`);
  } catch (error) {
    console.error('Failed to set up authentication:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

saveAuthState().catch((error) => {
  console.error(error);
  process.exit(1);
});
