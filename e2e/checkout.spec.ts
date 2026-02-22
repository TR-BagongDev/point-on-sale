import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  // Mock menu data
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

  test.beforeEach(async ({ page }) => {
    // Mock auth session API - this is called by DashboardLayout
    await page.route('**/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'admin-id',
            name: 'Admin',
            email: 'admin@warung.com',
            role: 'ADMIN',
          },
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

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

    // Navigate to kasir page
    await page.goto('/kasir', { waitUntil: 'domcontentloaded' });
  });

  test('should open payment dialog when "Pilih Metode Lain" is clicked', async ({ page }) => {
    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Click "Pilih Metode Lain" button
    const selectMethodButton = page.getByRole('button', { name: 'Pilih Metode Lain' });
    await selectMethodButton.click();

    // Check that payment dialog is visible
    await expect(page.getByText('Pilih Metode Pembayaran')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tunai' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'QRIS' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Debit' })).toBeVisible();
  });

  test('should close payment dialog when cancel is clicked', async ({ page }) => {
    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Check dialog is open
    await expect(page.getByText('Pilih Metode Pembayaran')).toBeVisible();

    // Click cancel button
    await page.getByRole('button', { name: 'Batal' }).click();

    // Check dialog is closed
    await expect(page.getByText('Pilih Metode Pembayaran')).not.toBeVisible();

    // Check cart still has items
    await expect(page.getByText('Keranjang kosong')).not.toBeVisible();
  });

  test('should process payment with CASH method successfully', async ({ page }) => {
    // Mock order creation API
    let capturedOrderData: any = null;
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        capturedOrderData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...capturedOrderData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: capturedOrderData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add items to cart
    await page.getByText('Nasi Goreng Spesial').click();
    await page.getByText('Es Teh Manis').click();

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Click CASH payment
    await page.getByRole('button', { name: 'Tunai' }).click();

    // Wait for success message
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Verify payment method was captured correctly
    expect(capturedOrderData?.paymentMethod).toBe('CASH');

    // Check that cart is cleared
    await expect(page.getByText('Keranjang kosong')).toBeVisible();
  });

  test('should process payment with QRIS method successfully', async ({ page }) => {
    // Mock order creation API
    let capturedOrderData: any = null;
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        capturedOrderData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...capturedOrderData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: capturedOrderData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Click QRIS payment
    await page.getByRole('button', { name: 'QRIS' }).click();

    // Wait for success message
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Verify payment method was captured correctly
    expect(capturedOrderData?.paymentMethod).toBe('QRIS');

    // Check that cart is cleared
    await expect(page.getByText('Keranjang kosong')).toBeVisible();
  });

  test('should process payment with DEBIT method successfully', async ({ page }) => {
    // Mock order creation API
    let capturedOrderData: any = null;
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        capturedOrderData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...capturedOrderData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: capturedOrderData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Click DEBIT payment
    await page.getByRole('button', { name: 'Debit' }).click();

    // Wait for success message
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Verify payment method was captured correctly
    expect(capturedOrderData?.paymentMethod).toBe('DEBIT');

    // Check that cart is cleared
    await expect(page.getByText('Keranjang kosong')).toBeVisible();
  });

  test('should process quick checkout with CASH method', async ({ page }) => {
    // Mock order creation API
    let capturedOrderData: any = null;
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        capturedOrderData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...capturedOrderData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: capturedOrderData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add items to cart
    await page.getByText('Nasi Goreng Spesial').click();
    await page.getByText('Es Teh Manis').click();

    // Click quick checkout button
    const quickCheckoutButton = page.getByRole('button', { name: 'Bayar Sekarang' });
    await quickCheckoutButton.click();

    // Wait for success message
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Verify payment method defaults to CASH
    expect(capturedOrderData?.paymentMethod).toBe('CASH');

    // Check that cart is cleared
    await expect(page.getByText('Keranjang kosong')).toBeVisible();
  });

  test('should add order notes during checkout', async ({ page }) => {
    // Mock order creation API
    let capturedOrderData: any = null;
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        capturedOrderData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...capturedOrderData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: capturedOrderData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Add order notes
    const notesTextarea = page.getByPlaceholder('Tambahkan catatan untuk pesanan ini...');
    await notesTextarea.fill('Pesanan untuk meja 5, urgent!');

    // Select payment method
    await page.getByRole('button', { name: 'Tunai' }).click();

    // Wait for success and verify notes were sent
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();
    expect(capturedOrderData?.notes).toBe('Pesanan untuk meja 5, urgent!');
  });

  test('should apply discount correctly in checkout', async ({ page }) => {
    // Mock order creation API
    let capturedOrderData: any = null;
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        capturedOrderData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...capturedOrderData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: capturedOrderData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Enter discount
    const discountInput = page.getByPlaceholder('0');
    await discountInput.fill('5000');

    // Expected calculations:
    // Subtotal: 25000
    // Tax (10%): 2500
    // Discount: 5000
    // Total: 25000 + 2500 - 5000 = 22500

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Verify total displayed in dialog includes discount
    await expect(page.getByText('Rp22.500')).toBeVisible();

    // Complete checkout
    await page.getByRole('button', { name: 'Tunai' }).click();

    // Wait for success
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Verify discount was captured correctly
    expect(capturedOrderData?.discount).toBe(5000);
    expect(capturedOrderData?.total).toBe(22500);
  });

  test('should calculate totals correctly with multiple items', async ({ page }) => {
    // Mock order creation API
    let capturedOrderData: any = null;
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        capturedOrderData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...capturedOrderData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: capturedOrderData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add multiple items with different quantities
    await page.getByText('Nasi Goreng Spesial').click(); // 25000
    await page.getByText('Nasi Goreng Spesial').click(); // 25000 (qty: 2)
    await page.getByText('Es Teh Manis').click(); // 5000

    // Expected calculations:
    // Subtotal: (25000 * 2) + 5000 = 55000
    // Tax (10%): 5500
    // Total: 60500

    // Open payment dialog and verify total
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();
    await expect(page.getByText('Rp60.500')).toBeVisible();

    // Complete checkout
    await page.getByRole('button', { name: 'Tunai' }).click();

    // Wait for success
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Verify calculations
    expect(capturedOrderData?.subtotal).toBe(55000);
    expect(capturedOrderData?.tax).toBe(5500);
    expect(capturedOrderData?.total).toBe(60500);
  });

  test('should handle checkout error gracefully', async ({ page }) => {
    // Mock order creation API to return error
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to create order' }),
        });
      }
    });

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Try to checkout
    await page.getByRole('button', { name: 'Bayar Sekarang' }).click();

    // Wait for error message
    await expect(page.getByText('Gagal memproses pesanan')).toBeVisible();

    // Check that cart still has items (not cleared)
    await expect(page.getByText('Keranjang kosong')).not.toBeVisible();
  });

  test('should show loading state during checkout', async ({ page }) => {
    // Mock order creation API with delay
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        // Add delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Click payment method
    await page.getByRole('button', { name: 'Tunai' }).click();

    // Check for loading state (button should be disabled and show spinner)
    await expect(page.getByText('Memproses...')).toBeVisible();
  });

  test('should show total in payment dialog with currency formatting', async ({ page }) => {
    // Add multiple items to get a significant total
    await page.getByText('Nasi Goreng Spesial').click();
    await page.getByText('Mie Ayam').click();
    await page.getByText('Es Teh Manis').click();

    // Expected: 25000 + 20000 + 5000 = 50000 subtotal
    // Tax (10%): 5000
    // Total: 55000

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Verify total is displayed with proper formatting
    await expect(page.getByText('Rp55.000')).toBeVisible();
  });

  test('should clear cart after successful checkout', async ({ page }) => {
    // Mock order creation API
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        const parsedData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...parsedData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: parsedData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add items to cart
    await page.getByText('Nasi Goreng Spesial').click();
    await page.getByText('Es Teh Manis').click();

    // Verify items are in cart
    await expect(page.getByText('Keranjang kosong')).not.toBeVisible();
    await expect(page.getByText('2 item')).toBeVisible();

    // Complete checkout
    await page.getByRole('button', { name: 'Bayar Sekarang' }).click();

    // Wait for success
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Verify cart is cleared
    await expect(page.getByText('Keranjang kosong')).toBeVisible();

    // Verify item count badge is gone
    await expect(page.getByText('2 item')).not.toBeVisible();
  });

  test('should maintain item notes during checkout', async ({ page }) => {
    // Mock order creation API
    let capturedOrderData: any = null;
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        capturedOrderData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...capturedOrderData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: capturedOrderData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Add notes to the item in cart
    const notesInput = page.getByPlaceholder('Catatan...');
    await notesInput.fill('Pedas, jangan pakai bawang');

    // Complete checkout
    await page.getByRole('button', { name: 'Bayar Sekarang' }).click();

    // Wait for success
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Verify item notes were preserved
    expect(capturedOrderData?.items?.[0]?.notes).toBe('Pedas, jangan pakai bawang');
  });

  test('should display all three payment methods with correct labels', async ({ page }) => {
    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Verify all payment methods are displayed with correct labels
    await expect(page.getByRole('button', { name: 'Tunai' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'QRIS' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Debit' })).toBeVisible();

    // Verify dialog title
    await expect(page.getByText('Pilih Metode Pembayaran')).toBeVisible();
  });

  test('should prevent checkout when cart is empty', async ({ page }) => {
    // Try to click quick checkout without adding items
    const quickCheckoutButton = page.getByRole('button', { name: 'Bayar Sekarang' });
    await quickCheckoutButton.click();

    // Wait a moment to ensure no action occurs
    await page.waitForTimeout(500);

    // Verify no success message appeared
    await expect(page.getByText('Pesanan berhasil dibuat!')).not.toBeVisible();

    // Verify cart is still empty
    await expect(page.getByText('Keranjang kosong')).toBeVisible();
  });

  test('should handle item quantity changes before checkout', async ({ page }) => {
    // Mock order creation API
    let capturedOrderData: any = null;
    await page.route('**/api/order', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const orderData = await request.postData();
        capturedOrderData = JSON.parse(orderData || '{}');

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-123',
            orderNumber: 'ORD-20250101-120000-001',
            ...capturedOrderData,
            status: 'PENDING',
            user: {
              id: 'user-1',
              name: 'Admin',
            },
            items: capturedOrderData.items?.map((item: any) => ({
              ...item,
              id: `item-${Math.random()}`,
              menu: mockMenus.find((m) => m.id === item.menuId),
            })) || [],
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Increase quantity
    const plusButton = page.getByRole('button').filter({ hasText: '+' }).first();
    await plusButton.click();
    await plusButton.click();

    // Verify quantity is 3
    await expect(page.locator('.w-10').filter({ hasText: '3' })).toBeVisible();

    // Complete checkout
    await page.getByRole('button', { name: 'Bayar Sekarang' }).click();

    // Wait for success
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Verify quantity was captured correctly
    expect(capturedOrderData?.items?.[0]?.quantity).toBe(3);
  });
});
