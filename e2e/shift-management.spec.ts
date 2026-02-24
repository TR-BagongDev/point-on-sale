import { test, expect } from '@playwright/test';

// Use storage state for authenticated tests
test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Shift Management End-to-End Flow', () => {
  // Mock menu data for order creation
  const mockMenus = [
    {
      id: 'menu-1',
      name: 'Nasi Goreng Spesial',
      description: 'Nasi goreng dengan telur dan ayam',
      price: 25000,
      image: null,
      categoryId: 'cat-1',
      isAvailable: true,
      category: {
        id: 'cat-1',
        name: 'Makanan',
        color: '#FF5733',
        icon: '🍜',
      },
    },
    {
      id: 'menu-2',
      name: 'Mie Ayam',
      description: 'Mie ayam dengan pangsit goreng',
      price: 20000,
      image: null,
      categoryId: 'cat-1',
      isAvailable: true,
      category: {
        id: 'cat-1',
        name: 'Makanan',
        color: '#FF5733',
        icon: '🍜',
      },
    },
    {
      id: 'menu-3',
      name: 'Es Teh Manis',
      description: 'Es teh manis segar',
      price: 5000,
      image: null,
      categoryId: 'cat-2',
      isAvailable: true,
      category: {
        id: 'cat-2',
        name: 'Minuman',
        color: '#3498DB',
        icon: '🥤',
      },
    },
  ];

  // Mock category data
  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Makanan',
      color: '#FF5733',
      icon: '🍜',
      order: 0,
    },
    {
      id: 'cat-2',
      name: 'Minuman',
      color: '#3498DB',
      icon: '🥤',
      order: 1,
    },
  ];

  let shiftId: string | null = null;
  let orderIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Mock menu API
    await page.route('**/api/menu', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMenus),
      });
    });

    // Mock category API
    await page.route('**/api/category', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCategories),
      });
    });
  });

  test('should complete full shift lifecycle: open → create orders → close', async ({ page }) => {
    // Step 1: Navigate to cashier page
    await page.goto('/kasir', { waitUntil: 'domcontentloaded' });

    // Step 2: Verify no active shift initially
    await expect(page.getByText('No Active Shift')).toBeVisible();

    // Step 3: Open a new shift with starting cash
    let shiftCreated = false;

    // Mock shift creation API
    await page.route('**/api/shift', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const shiftData = await request.postData();
        const parsedData = JSON.parse(shiftData || '{}');

        shiftId = `shift-${Date.now()}`;

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: shiftId,
            status: 'OPEN',
            startingCash: parsedData.startingCash,
            endingCash: null,
            expectedCash: null,
            discrepancy: null,
            notes: null,
            openedAt: new Date().toISOString(),
            closedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: 'admin-id',
            user: {
              id: 'admin-id',
              name: 'Admin',
              email: 'admin@warung.com',
              role: 'ADMIN',
            },
            orders: [],
          }),
        });
        shiftCreated = true;
      } else if (request.method() === 'GET') {
        // Return list of shifts including the one we just created
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: shiftId || `shift-${Date.now()}`,
              status: 'OPEN',
              startingCash: 500000,
              endingCash: null,
              expectedCash: null,
              discrepancy: null,
              notes: null,
              openedAt: new Date().toISOString(),
              closedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId: 'admin-id',
              user: {
                id: 'admin-id',
                name: 'Admin',
                email: 'admin@warung.com',
                role: 'ADMIN',
              },
              orders: [],
            },
          ]),
        });
      }
    });

    // Mock current shift API
    await page.route('**/api/shift/current', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: shiftId || `shift-${Date.now()}`,
          status: 'OPEN',
          startingCash: 500000,
          endingCash: null,
          expectedCash: null,
          discrepancy: null,
          notes: null,
          openedAt: new Date().toISOString(),
          closedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: 'admin-id',
          user: {
            id: 'admin-id',
            name: 'Admin',
            email: 'admin@warung.com',
            role: 'ADMIN',
          },
          orders: orderIds.map((id) => ({
            id,
            orderNumber: `ORD-${Date.now()}-${orderIds.indexOf(id)}`,
            status: 'COMPLETED',
            totalAmount: 30000,
            paymentMethod: 'CASH',
            shiftId: shiftId || `shift-${Date.now()}`,
          })),
        }),
      });
    });

    // Click "Open Shift" button
    const openShiftButton = page.getByRole('button', { name: 'Buka Shift' });
    await expect(openShiftButton).toBeVisible();
    await openShiftButton.click();

    // Wait for dialog to appear
    await page.waitForTimeout(500);

    // Fill in starting cash amount
    const startingCashInput = page.getByPlaceholder('0');
    await startingCashInput.fill('500000');

    // Submit the form
    const confirmButton = page.getByRole('button', { name: 'Buka Shift' }).filter({ hasText: 'Buka Shift' });
    await confirmButton.click();

    // Wait for shift to be created
    await page.waitForTimeout(1000);

    // Verify shift was created successfully
    expect(shiftCreated).toBe(true);

    // Verify shift status indicator shows open shift
    await expect(page.getByText('Admin')).toBeVisible();

    // Step 4: Create multiple orders
    let orderCount = 0;

    // Mock order creation API
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        const parsedData = JSON.parse(orderData || '{}');

        const newOrderId = `order-${Date.now()}-${orderCount++}`;
        orderIds.push(newOrderId);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: newOrderId,
            orderNumber: `ORD-${Date.now()}-${orderCount}`,
            ...parsedData,
            status: 'COMPLETED',
            paymentMethod: 'CASH',
            totalAmount: parsedData.items?.reduce((sum: number, item: any) => {
              const menu = mockMenus.find((m) => m.id === item.menuId);
              return sum + (menu?.price || 0) * item.quantity;
            }, 0) || 30000,
            taxAmount: parsedData.items?.reduce((sum: number, item: any) => {
              const menu = mockMenus.find((m) => m.id === item.menuId);
              return sum + (menu?.price || 0) * item.quantity;
            }, 0) * 0.1 || 3000,
            userId: 'admin-id',
            shiftId: shiftId || `shift-${Date.now()}`,
            user: {
              id: 'admin-id',
              name: 'Admin',
            },
            items: parsedData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      } else if (request.method() === 'GET') {
        // Return orders linked to the shift
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            orderIds.map((id) => ({
              id,
              orderNumber: `ORD-${Date.now()}-${orderIds.indexOf(id)}`,
              status: 'COMPLETED',
              totalAmount: 30000,
              paymentMethod: 'CASH',
              shiftId: shiftId || `shift-${Date.now()}`,
              userId: 'admin-id',
              user: {
                id: 'admin-id',
                name: 'Admin',
              },
              items: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }))
          ),
        });
      }
    });

    // Create first order
    await page.getByText('Nasi Goreng Spesial').click();
    await page.getByText('Es Teh Manis').click();
    await page.getByRole('button', { name: 'Bayar Sekarang' }).click();

    // Wait for success message
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();
    await page.waitForTimeout(1000);

    // Create second order
    await page.getByText('Mie Ayam').click();
    await page.getByText('Es Teh Manis').click();
    await page.getByRole('button', { name: 'Bayar Sekarang' }).click();

    // Wait for success message
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();
    await page.waitForTimeout(1000);

    // Create third order
    await page.getByText('Nasi Goreng Spesial').click();
    await page.getByRole('button', { name: 'Bayar Sekarang' }).click();

    // Wait for success message
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();
    await page.waitForTimeout(1000);

    // Verify we created 3 orders
    expect(orderIds.length).toBe(3);

    // Step 5: Verify orders are linked to shift
    // Navigate to shift management page
    await page.goto('/shift', { waitUntil: 'domcontentloaded' });

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Verify shift is displayed in the list
    await expect(page.getByText('Admin')).toBeVisible();

    // Verify shift shows order count
    const orderCountText = page.getByText(/3/);
    await expect(orderCountText).toBeVisible();

    // Step 6: Close the shift with ending cash
    // Find and click the "Close Shift" button for our shift
    const closeShiftButton = page.getByRole('button', { name: /Tutup Shift/i }).first();
    await closeShiftButton.click();

    // Wait for dialog to appear
    await page.waitForTimeout(500);

    // The dialog should show expected cash calculation
    // Starting cash: 500000
    // Order 1: 25000 + 5000 = 30000 + 3000 tax = 33000
    // Order 2: 20000 + 5000 = 25000 + 2500 tax = 27500
    // Order 3: 25000 + 2500 tax = 27500
    // Total expected: 500000 + 33000 + 27500 + 27500 = 588000

    await expect(page.getByText(/588000/)).toBeVisible();

    // Fill in ending cash (with slight discrepancy)
    const endingCashInput = page.getByPlaceholder('0');
    await endingCashInput.fill('590000'); // 2000 more than expected

    // Submit the form
    const confirmCloseButton = page.getByRole('button', { name: 'Tutup Shift' });
    await confirmCloseButton.click();

    // Wait for shift to close
    await page.waitForTimeout(1000);

    // Step 7: Verify shift report shows correct totals and discrepancies
    // The shift should now show CLOSED status
    await page.reload();

    // Wait for page to reload
    await page.waitForTimeout(1000);

    // Verify shift status is CLOSED
    await expect(page.getByText('CLOSED')).toBeVisible();

    // Verify discrepancy is shown (2000 positive)
    await expect(page.getByText(/\+Rp2\.000/)).toBeVisible();

    // Verify starting cash is displayed
    await expect(page.getByText(/Rp500\.000/)).toBeVisible();

    // Verify ending cash is displayed
    await expect(page.getByText(/Rp590\.000/)).toBeVisible();
  });

  test('should display shift management page with all components', async ({ page }) => {
    // Mock shift API
    await page.route('**/api/shift', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'shift-1',
            status: 'CLOSED',
            startingCash: 500000,
            endingCash: 750000,
            expectedCash: 750000,
            discrepancy: 0,
            notes: 'Shift normal',
            openedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
            closedAt: new Date().toISOString(),
            createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            userId: 'admin-id',
            user: {
              id: 'admin-id',
              name: 'Admin',
              email: 'admin@warung.com',
              role: 'ADMIN',
            },
            orders: [
              {
                id: 'order-1',
                orderNumber: 'ORD-001',
                status: 'COMPLETED',
                totalAmount: 250000,
                paymentMethod: 'CASH',
              },
            ],
          },
          {
            id: 'shift-2',
            status: 'OPEN',
            startingCash: 500000,
            endingCash: null,
            expectedCash: null,
            discrepancy: null,
            notes: null,
            openedAt: new Date().toISOString(),
            closedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: 'admin-id',
            user: {
              id: 'admin-id',
              name: 'Admin',
              email: 'admin@warung.com',
              role: 'ADMIN',
            },
            orders: [],
          },
        ]),
      });
    });

    // Navigate to shift management page
    await page.goto('/shift', { waitUntil: 'domcontentloaded' });

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check page title
    await expect(page).toHaveTitle(/POS/);

    // Verify both shifts are displayed
    await expect(page.getByText('Admin')).toBeVisible();

    // Verify OPEN status badge
    await expect(page.getByText('OPEN')).toBeVisible();

    // Verify CLOSED status badge
    await expect(page.getByText('CLOSED')).toBeVisible();

    // Verify starting cash is displayed
    await expect(page.getByText(/Rp500\.000/)).toBeVisible();

    // Verify ending cash is displayed for closed shift
    await expect(page.getByText(/Rp750\.000/)).toBeVisible();
  });

  test('should verify shift status indicator on cashier page', async ({ page }) => {
    // Mock current shift API - no active shift
    await page.route('**/api/shift/current', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No active shift found' }),
      });
    });

    // Mock shift list API
    await page.route('**/api/shift?status=OPEN**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navigate to cashier page
    await page.goto('/kasir', { waitUntil: 'domcontentloaded' });

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Verify "No Active Shift" is shown
    await expect(page.getByText('No Active Shift')).toBeVisible();

    // Verify "Buka Shift" button is visible
    await expect(page.getByRole('button', { name: 'Buka Shift' })).toBeVisible();

    // Now mock an active shift
    await page.route('**/api/shift/current', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'shift-active',
          status: 'OPEN',
          startingCash: 500000,
          endingCash: null,
          expectedCash: null,
          discrepancy: null,
          notes: null,
          openedAt: new Date().toISOString(),
          closedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: 'admin-id',
          user: {
            id: 'admin-id',
            name: 'Admin',
            email: 'admin@warung.com',
            role: 'ADMIN',
          },
          orders: [],
        }),
      });
    });

    // Reload page
    await page.reload();

    // Wait for page to reload
    await page.waitForTimeout(1000);

    // Verify shift status shows cashier name
    await expect(page.getByText('Admin')).toBeVisible();
  });
});
