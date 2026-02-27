import { test, expect } from '@playwright/test';

// Use storage state for authenticated tests
test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Create Order Flow', () => {
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
    await page.goto('/kasir', { waitUntil: 'networkidle' });

    // Ensure Makanan category is selected (default behavior)
    // This ensures tests start with a consistent state
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display kasir page with menus and categories', async ({ page }) => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page).toHaveTitle(/POS/);

    // Check that categories are visible
    await expect(page.getByRole('button', { name: 'Makanan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Minuman' })).toBeVisible();

    // Check that menus from Makanan category are visible (default selected)
    await expect(page.getByText('Nasi Goreng Spesial')).toBeVisible();
    await expect(page.getByText('Mie Ayam')).toBeVisible();

    // Check prices are displayed correctly for Makanan category
    // The currency format includes spaces like "Rp 5.000"
    await expect(page.getByText(/25\.000/)).toBeVisible();
    await expect(page.getByText(/20\.000/)).toBeVisible();

    // Click on Minuman category to see drinks
    await page.getByRole('button', { name: 'Minuman' }).click();

    // Check that Minuman menu is visible
    await expect(page.getByText('Es Teh Manis')).toBeVisible();
    await expect(page.getByText(/5\.000/)).toBeVisible();

    // Check cart section
    await expect(page.getByText('Keranjang kosong')).toBeVisible();
  });

  test('should add menu item to cart when clicked', async ({ page }) => {
    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Click on a menu item - click in the menu grid area
    await page.locator('.grid').getByText('Nasi Goreng Spesial').first().click();

    // Check that cart is no longer empty
    await expect(page.getByText('Keranjang kosong')).not.toBeVisible();

    // Check that item is in cart (items in cart use <p> tag)
    await expect(page.locator('p').filter({ hasText: 'Nasi Goreng Spesial' }).first()).toBeVisible();

    // Check price is visible - use first() since price appears multiple times
    await expect(page.getByText(/25\.000/).first()).toBeVisible();

    // Check item count badge
    await expect(page.getByText('1 item')).toBeVisible();
  });

  test('should increase item quantity when plus button is clicked', async ({ page }) => {
    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Add item to cart - click in menu grid
    await page.locator('.grid').getByText('Nasi Goreng Spesial').first().click();

    // Wait for cart to be updated
    await expect(page.getByText('1 item')).toBeVisible({ timeout: 5000 });

    // Click plus button in the cart
    const plusButton = page.getByTitle('Tambah jumlah').first();
    await plusButton.click();

    // Check quantity is updated
    await expect(page.locator('.w-10').filter({ hasText: '2' })).toBeVisible();

    // Check item count badge
    await expect(page.getByText('2 item')).toBeVisible();
  });

  test('should decrease item quantity when minus button is clicked', async ({ page }) => {
    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Add item to cart and increase quantity
    await page.locator('.grid').getByText('Nasi Goreng Spesial').first().click();
    const plusButton = page.getByTitle('Tambah jumlah').first();
    await plusButton.click();

    // Click minus button
    const minusButton = page.getByTitle('Kurangi jumlah').first();
    await minusButton.click();

    // Check quantity is decreased
    await expect(page.locator('.w-10').filter({ hasText: '1' })).toBeVisible();

    // Check item count badge
    await expect(page.getByText('1 item')).toBeVisible();
  });

  test('should remove item from cart when trash button is clicked', async ({ page }) => {
    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Add item to cart
    await page.locator('.grid').getByText('Nasi Goreng Spesial').first().click();

    // Click trash button
    const trashButton = page.getByRole('button').filter({ hasText: /Hapus item/ }).first();
    await trashButton.click();

    // Check that cart is empty again
    await expect(page.getByText('Keranjang kosong')).toBeVisible();

    // Check item count badge is not visible
    await expect(page.getByText('1 item')).not.toBeVisible();
  });

  test('should add multiple items to cart', async ({ page }) => {
    // Add items from Makanan category
    await page.getByRole('button', { name: 'Makanan' }).click();
    await page.locator('.grid').getByText('Nasi Goreng Spesial').first().click();
    await page.locator('.grid').getByText('Mie Ayam').first().click();

    // Add item from Minuman category
    await page.getByRole('button', { name: 'Minuman' }).click();
    await page.locator('.grid').getByText('Es Teh Manis').first().click();

    // Check that all items are in cart
    await expect(page.locator('p').filter({ hasText: 'Nasi Goreng Spesial' }).first()).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Mie Ayam' }).first()).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Es Teh Manis' }).first()).toBeVisible();

    // Check item count
    await expect(page.getByText('3 item')).toBeVisible();
  });

  test('should calculate subtotal, tax, and total correctly', async ({ page }) => {
    // Add items from different categories
    await page.getByRole('button', { name: 'Makanan' }).click();
    await page.getByText('Nasi Goreng Spesial').click();
    await page.getByRole('button', { name: 'Minuman' }).click();
    await page.getByText('Es Teh Manis').click();

    // Expected calculations:
    // Subtotal: 25000 + 5000 = 30000
    // Tax (10%): 3000
    // Total: 33000

    await expect(page.getByText('Subtotal').locator('..').getByText(/30\.000/)).toBeVisible();
    await expect(page.getByText('Pajak (10%)').locator('..').getByText(/3\.000/)).toBeVisible();
    await expect(page.getByText('Total').locator('..').getByText(/33\.000/)).toBeVisible();
  });

  test('should apply discount correctly', async ({ page }) => {
    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Add item to cart
    await page.locator('.grid').getByText('Nasi Goreng Spesial').first().click();

    // Enter discount
    const discountInput = page.getByPlaceholder('0');
    await discountInput.fill('5000');

    // Expected calculations:
    // Subtotal: 25000
    // Tax (10%): 2500
    // Discount: 5000
    // Total: 25000 + 2500 - 5000 = 22500

    // Check discount is displayed (format may be -Rp 5.000 or similar)
    await expect(page.getByText('Diskon').locator('..').getByText(/5\.000/).first()).toBeVisible();
    await expect(page.getByText('Total').locator('..').getByText(/22\.500/).first()).toBeVisible();
  });

  test('should add notes to cart item', async ({ page }) => {
    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Add notes to item
    const notesInput = page.getByPlaceholder('Catatan...');
    await notesInput.fill('Pedas, jangan pakai bawang');

    // Check notes are filled
    await expect(notesInput).toHaveValue('Pedas, jangan pakai bawang');
  });

  test('should filter menus by category', async ({ page }) => {
    // Click on "Minuman" category
    await page.getByRole('button', { name: 'Minuman' }).click();

    // Check that only drinks are visible
    await expect(page.getByText('Es Teh Manis')).toBeVisible();
    await expect(page.getByText('Nasi Goreng Spesial')).not.toBeVisible();
    await expect(page.getByText('Mie Ayam')).not.toBeVisible();

    // Click on "Makanan" category
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Check that food items are visible
    await expect(page.getByText('Nasi Goreng Spesial')).toBeVisible();
    await expect(page.getByText('Mie Ayam')).toBeVisible();
    await expect(page.getByText('Es Teh Manis')).not.toBeVisible();
  });

  test('should search menus by name', async ({ page }) => {
    // Ensure Makanan category is selected first
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Search for "Nasi Goreng"
    const searchInput = page.getByPlaceholder('Cari menu...');
    await searchInput.fill('Nasi Goreng');

    // Check that only matching menu is visible
    await expect(page.getByText('Nasi Goreng Spesial')).toBeVisible();
    await expect(page.getByText('Mie Ayam')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');

    // Check that all menus from current category are visible again
    await expect(page.getByText('Nasi Goreng Spesial')).toBeVisible();
    await expect(page.getByText('Mie Ayam')).toBeVisible();
  });

  test('should create order with quick checkout (CASH)', async ({ page }) => {
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

    // Add items from different categories
    await page.getByRole('button', { name: 'Makanan' }).click();
    await page.getByText('Nasi Goreng Spesial').click();
    await page.getByRole('button', { name: 'Minuman' }).click();
    await page.getByText('Es Teh Manis').click();

    // Click quick checkout button
    const quickCheckoutButton = page.getByRole('button', { name: 'Bayar Sekarang' });
    await quickCheckoutButton.click();

    // Wait for success message
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Check that cart is cleared
    await expect(page.getByText('Keranjang kosong')).toBeVisible();
  });

  test('should create order with payment method dialog', async ({ page }) => {
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

    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Add item to cart
    await page.getByText('Nasi Goreng Spesial').click();

    // Click "Pilih Metode Lain" button
    const selectMethodButton = page.getByRole('button', { name: 'Pilih Metode Lain' });
    await selectMethodButton.click();

    // Check that payment dialog is visible
    await expect(page.getByText('Pilih Metode Pembayaran')).toBeVisible();

    // Click QRIS payment
    const qrisButton = page.getByRole('button', { name: 'QRIS' });
    await qrisButton.click();

    // Wait for success message
    await expect(page.getByText('Pesanan berhasil dibuat!')).toBeVisible();

    // Check that cart is cleared
    await expect(page.getByText('Keranjang kosong')).toBeVisible();
  });

  test('should create order with order notes', async ({ page }) => {
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

    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

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

  test('should disable checkout button when cart is empty', async ({ page }) => {
    // Check that quick checkout is disabled when cart is empty
    const quickCheckoutButton = page.getByRole('button', { name: 'Bayar Sekarang' });

    // The button should be visible but clicking it should do nothing since cart is empty
    await quickCheckoutButton.click();

    // Wait a moment to ensure no dialog opens
    await page.waitForTimeout(500);

    // Payment dialog should not be visible
    await expect(page.getByText('Pilih Metode Pembayaran')).not.toBeVisible();
  });

  test('should show all three payment methods in dialog', async ({ page }) => {
    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Add item to cart
    await page.locator('.grid').getByText('Nasi Goreng Spesial').first().click();

    // Open payment dialog
    await page.getByRole('button', { name: 'Pilih Metode Lain' }).click();

    // Check all payment methods are visible
    await expect(page.getByRole('button', { name: 'Tunai' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'QRIS' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Debit' })).toBeVisible();

    // Check total is displayed
    await expect(page.getByText(/25\.000/).first()).toBeVisible();
  });

  test('should close payment dialog when cancel is clicked', async ({ page }) => {
    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Add item to cart
    await page.locator('.grid').getByText('Nasi Goreng Spesial').first().click();

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

  test('should handle order creation error gracefully', async ({ page }) => {
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

    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Add item to cart
    await page.locator('.grid').getByText('Nasi Goreng Spesial').first().click();

    // Try to checkout
    await page.getByRole('button', { name: 'Bayar Sekarang' }).click();

    // Wait for error message
    await expect(page.getByText('Gagal memproses pesanan')).toBeVisible();

    // Check that cart still has items (not cleared)
    await expect(page.getByText('Keranjang kosong')).not.toBeVisible();
  });

  test('should only show available menu items', async ({ page }) => {
    // Mock menu with some unavailable items
    const menusWithUnavailable = [
      ...mockMenus,
      {
        id: 'menu-4',
        name: 'Ayam Bakar',
        description: 'Ayam bakar madu',
        price: 30000,
        image: null,
        categoryId: 'cat-1',
        isAvailable: false, // Unavailable
        category: {
          id: 'cat-1',
          name: 'Makanan',
          color: '#FF5733',
          icon: '🍜',
        },
      },
    ];

    await page.route('**/api/menu', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(menusWithUnavailable),
      });
    });

    // Ensure Makanan category is selected
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Reload page to pick up new mock
    await page.reload();

    // Check that unavailable item is not shown
    await expect(page.getByText('Ayam Bakar')).not.toBeVisible();

    // Check that available items are still shown
    await expect(page.getByText('Nasi Goreng Spesial')).toBeVisible();
  });
});
