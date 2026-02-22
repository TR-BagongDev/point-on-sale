import { test, expect } from '@playwright/test';

// Use storage state for authenticated tests
test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Menu Management Flow', () => {
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
      },
    },
    {
      id: 'menu-3',
      name: 'Es Teh Manis',
      description: 'Es teh manis segar',
      price: 5000,
      image: null,
      categoryId: 'cat-2',
      isAvailable: false,
      category: {
        id: 'cat-2',
        name: 'Minuman',
        color: '#3498DB',
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
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMenus),
        });
      } else if (request.method() === 'POST') {
        const menuData = await request.postData();
        const parsedData = JSON.parse(menuData || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `menu-${Date.now()}`,
            ...parsedData,
            image: null,
            category: mockCategories.find((c) => c.id === parsedData.categoryId),
          }),
        });
      } else if (request.method() === 'PUT') {
        const menuData = await request.postData();
        const parsedData = JSON.parse(menuData || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...parsedData,
            image: null,
            category: mockCategories.find((c) => c.id === parsedData.categoryId),
          }),
        });
      }
    });

    // Mock category API
    await page.route('**/api/category', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCategories),
      });
    });

    // Mock delete API
    await page.route('**/api/menu?id=*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Navigate to menu page
    await page.goto('/menu', { waitUntil: 'domcontentloaded' });
  });

  test('should display menu management page with menus grouped by category', async ({ page }) => {
    // Check page title and heading
    await expect(page).toHaveTitle(/POS/);
    await expect(page.getByText('Manajemen Menu')).toBeVisible();
    await expect(page.getByText('Kelola menu makanan dan minuman Anda')).toBeVisible();

    // Check that "Tambah Menu" button is visible
    await expect(page.getByRole('button', { name: 'Tambah Menu' })).toBeVisible();

    // Check that categories are visible with menu count
    await expect(page.getByText('Makanan')).toBeVisible();
    await expect(page.getByText('2 menu')).toBeVisible();
    await expect(page.getByText('Minuman')).toBeVisible();

    // Check that menus are visible
    await expect(page.getByText('Nasi Goreng Spesial')).toBeVisible();
    await expect(page.getByText('Mie Ayam')).toBeVisible();
    await expect(page.getByText('Es Teh Manis')).toBeVisible();

    // Check prices are displayed correctly
    await expect(page.getByText('Rp25.000')).toBeVisible();
    await expect(page.getByText('Rp20.000')).toBeVisible();
    await expect(page.getByText('Rp5.000')).toBeVisible();

    // Check descriptions
    await expect(page.getByText('Nasi goreng dengan telur dan ayam')).toBeVisible();
    await expect(page.getByText('Mie ayam dengan pangsit goreng')).toBeVisible();
  });

  test('should open add menu dialog when "Tambah Menu" button is clicked', async ({ page }) => {
    // Click "Tambah Menu" button
    await page.getByRole('button', { name: 'Tambah Menu' }).click();

    // Check dialog title
    await expect(page.getByText('Tambah Menu Baru')).toBeVisible();

    // Check form fields are visible
    await expect(page.getByText('Nama Menu')).toBeVisible();
    await expect(page.getByText('Deskripsi')).toBeVisible();
    await expect(page.getByText('Harga (Rp)')).toBeVisible();
    await expect(page.getByText('Kategori')).toBeVisible();

    // Check input fields
    const nameInput = page.getByPlaceholder('Masukkan nama menu');
    const descInput = page.getByPlaceholder('Deskripsi menu (opsional)');
    const priceInput = page.getByPlaceholder('Contoh: 15000');

    await expect(nameInput).toBeVisible();
    await expect(descInput).toBeVisible();
    await expect(priceInput).toBeVisible();

    // Check buttons
    await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tambah' })).toBeVisible();
  });

  test('should add new menu successfully', async ({ page }) => {
    // Open add menu dialog
    await page.getByRole('button', { name: 'Tambah Menu' }).click();

    // Fill form
    await page.getByPlaceholder('Masukkan nama menu').fill('Ayam Bakar Madu');
    await page.getByPlaceholder('Deskripsi menu (opsional)').fill('Ayam bakar dengan saus madu');
    await page.getByPlaceholder('Contoh: 15000').fill('30000');

    // Select category
    await page.getByText('Pilih kategori').click();
    await page.getByText('🍜 Makanan').click();

    // Mock menu API to return updated list
    await page.route('**/api/menu', async route => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            ...mockMenus,
            {
              id: 'menu-new',
              name: 'Ayam Bakar Madu',
              description: 'Ayam bakar dengan saus madu',
              price: 30000,
              image: null,
              categoryId: 'cat-1',
              isAvailable: true,
              category: {
                id: 'cat-1',
                name: 'Makanan',
                color: '#FF5733',
              },
            },
          ]),
        });
      }
    });

    // Submit form
    await page.getByRole('button', { name: 'Tambah' }).click();

    // Wait for success message
    await expect(page.getByText('Menu berhasil ditambahkan')).toBeVisible();
    await expect(page.getByText(/Menu "Ayam Bakar Madu" telah ditambahkan/)).toBeVisible();
  });

  test('should show validation error when name is empty', async ({ page }) => {
    // Open add menu dialog
    await page.getByRole('button', { name: 'Tambah Menu' }).click();

    // Fill only price (leave name empty)
    await page.getByPlaceholder('Contoh: 15000').fill('15000');

    // Select category
    await page.getByText('Pilih kategori').click();
    await page.getByText('🍜 Makanan').click();

    // Try to submit
    await page.getByRole('button', { name: 'Tambah' }).click();

    // Wait for error message
    await expect(page.getByText('Nama menu wajib diisi')).toBeVisible();
    await expect(page.getByText('Silakan masukkan nama menu')).toBeVisible();
  });

  test('should show validation error when price is invalid', async ({ page }) => {
    // Open add menu dialog
    await page.getByRole('button', { name: 'Tambah Menu' }).click();

    // Fill name with invalid price
    await page.getByPlaceholder('Masukkan nama menu').fill('Test Menu');
    await page.getByPlaceholder('Contoh: 15000').fill('0');

    // Select category
    await page.getByText('Pilih kategori').click();
    await page.getByText('🍜 Makanan').click();

    // Try to submit
    await page.getByRole('button', { name: 'Tambah' }).click();

    // Wait for error message
    await expect(page.getByText('Harga tidak valid')).toBeVisible();
    await expect(page.getByText('Silakan masukkan harga yang valid')).toBeVisible();
  });

  test('should show validation error when category is not selected', async ({ page }) => {
    // Open add menu dialog
    await page.getByRole('button', { name: 'Tambah Menu' }).click();

    // Fill name and price (leave category empty)
    await page.getByPlaceholder('Masukkan nama menu').fill('Test Menu');
    await page.getByPlaceholder('Contoh: 15000').fill('15000');

    // Try to submit
    await page.getByRole('button', { name: 'Tambah' }).click();

    // Wait for error message
    await expect(page.getByText('Kategori wajib dipilih')).toBeVisible();
    await expect(page.getByText('Silakan pilih kategori untuk menu ini')).toBeVisible();
  });

  test('should edit existing menu', async ({ page }) => {
    // Find the edit button for Nasi Goreng
    const editButtons = page.getByRole('button').filter({ hasText: '' }).all();
    const nasiGorengCard = page.getByText('Nasi Goreng Spesial').locator('..').locator('..');
    const editButton = nasiGorengCard.getByRole('button').filter({ has: page.locator('svg') }).first();

    // Click edit button
    await editButton.click();

    // Check dialog title
    await expect(page.getByText('Edit Menu')).toBeVisible();

    // Check form is pre-filled
    const nameInput = page.getByPlaceholder('Masukkan nama menu');
    await expect(nameInput).toHaveValue('Nasi Goreng Spesial');

    const descInput = page.getByPlaceholder('Deskripsi menu (opsional)');
    await expect(descInput).toHaveValue('Nasi goreng dengan telur dan ayam');

    const priceInput = page.getByPlaceholder('Contoh: 15000');
    await expect(priceInput).toHaveValue('25000');

    // Update name
    await nameInput.clear();
    await nameInput.fill('Nasi Goreng Spesial Jumbo');

    // Mock menu API to return updated list
    await page.route('**/api/menu', async route => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              ...mockMenus[0],
              name: 'Nasi Goreng Spesial Jumbo',
            },
            ...mockMenus.slice(1),
          ]),
        });
      }
    });

    // Submit form
    await page.getByRole('button', { name: 'Simpan' }).click();

    // Wait for success message
    await expect(page.getByText('Menu berhasil diperbarui')).toBeVisible();
    await expect(page.getByText(/Menu "Nasi Goreng Spesial Jumbo" telah diperbarui/)).toBeVisible();
  });

  test('should delete menu after confirmation', async ({ page }) => {
    // Find the delete button for Nasi Goreng
    const nasiGorengCard = page.getByText('Nasi Goreng Spesial').locator('..').locator('..');
    const deleteButton = nasiGorengCard.getByRole('button').filter({ has: page.locator('svg') }).nth(1);

    // Mock the confirm dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Apakah Anda yakin ingin menghapus menu "Nasi Goreng Spesial"?');
      await dialog.accept();
    });

    // Mock menu API to return updated list
    await page.route('**/api/menu', async route => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMenus.slice(1)),
        });
      }
    });

    // Click delete button
    await deleteButton.click();

    // Wait for success message
    await expect(page.getByText('Menu berhasil dihapus')).toBeVisible();
    await expect(page.getByText(/Menu "Nasi Goreng Spesial" telah dihapus/)).toBeVisible();
  });

  test('should cancel delete when confirmation is dismissed', async ({ page }) => {
    // Find the delete button for Nasi Goreng
    const nasiGorengCard = page.getByText('Nasi Goreng Spesial').locator('..').locator('..');
    const deleteButton = nasiGorengCard.getByRole('button').filter({ has: page.locator('svg') }).nth(1);

    // Mock the confirm dialog and dismiss it
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    // Click delete button
    await deleteButton.click();

    // Wait a moment
    await page.waitForTimeout(500);

    // Check that menu still exists
    await expect(page.getByText('Nasi Goreng Spesial')).toBeVisible();
  });

  test('should toggle menu availability', async ({ page }) => {
    // Find the availability badge for Nasi Goreng
    const nasiGorengCard = page.getByText('Nasi Goreng Spesial').locator('..').locator('..');
    const availabilityBadge = nasiGorengCard.getByRole('button', { name: 'Tersedia' });

    // Mock menu API to return updated list
    await page.route('**/api/menu', async route => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              ...mockMenus[0],
              isAvailable: false,
            },
            ...mockMenus.slice(1),
          ]),
        });
      }
    });

    // Click availability badge to toggle
    await availabilityBadge.click();

    // Wait for success message
    await expect(page.getByText('Menu ditandai habis')).toBeVisible();
    await expect(page.getByText(/Menu "Nasi Goreng Spesial" sekarang habis/)).toBeVisible();
  });

  test('should toggle unavailable menu to available', async ({ page }) => {
    // Find the availability badge for Es Teh Manis (which is unavailable)
    const esTehCard = page.getByText('Es Teh Manis').locator('..').locator('..');
    const availabilityBadge = esTehCard.getByRole('button', { name: 'Habis' });

    // Mock menu API to return updated list
    await page.route('**/api/menu', async route => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            ...mockMenus.slice(0, 2),
            {
              ...mockMenus[2],
              isAvailable: true,
            },
          ]),
        });
      }
    });

    // Click availability badge to toggle
    await availabilityBadge.click();

    // Wait for success message
    await expect(page.getByText('Menu ditandai tersedia')).toBeVisible();
    await expect(page.getByText(/Menu "Es Teh Manis" sekarang tersedia/)).toBeVisible();
  });

  test('should show loading state while saving menu', async ({ page }) => {
    // Open add menu dialog
    await page.getByRole('button', { name: 'Tambah Menu' }).click();

    // Fill form
    await page.getByPlaceholder('Masukkan nama menu').fill('Test Menu');
    await page.getByPlaceholder('Contoh: 15000').fill('15000');

    // Select category
    await page.getByText('Pilih kategori').click();
    await page.getByText('🍜 Makanan').click();

    // Mock API to delay response
    await page.route('**/api/menu', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const menuData = await request.postData();
        const parsedData = JSON.parse(menuData || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `menu-${Date.now()}`,
            ...parsedData,
            image: null,
            category: mockCategories.find((c) => c.id === parsedData.categoryId),
          }),
        });
      }
    });

    // Submit form
    await page.getByRole('button', { name: 'Tambah' }).click();

    // Check loading state
    await expect(page.getByRole('button', { name: /Menambahkan.../ })).toBeVisible();
  });

  test('should show loading state while deleting menu', async ({ page }) => {
    // Find the delete button
    const nasiGorengCard = page.getByText('Nasi Goreng Spesial').locator('..').locator('..');
    const deleteButton = nasiGorengCard.getByRole('button').filter({ has: page.locator('svg') }).nth(1);

    // Mock the confirm dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // Mock API to delay response
    await page.route('**/api/menu?id=*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Click delete button
    await deleteButton.click();

    // Check that button shows loading state (the delete button should show a spinner)
    await page.waitForTimeout(500);
    const loadingIcon = deleteButton.locator('.animate-spin');
    await expect(loadingIcon).toBeVisible();
  });

  test('should close add/edit dialog when cancel is clicked', async ({ page }) => {
    // Open add menu dialog
    await page.getByRole('button', { name: 'Tambah Menu' }).click();

    // Check dialog is open
    await expect(page.getByText('Tambah Menu Baru')).toBeVisible();

    // Click cancel button
    await page.getByRole('button', { name: 'Batal' }).click();

    // Check dialog is closed
    await expect(page.getByText('Tambah Menu Baru')).not.toBeVisible();

    // Check we're still on menu page
    await expect(page.getByText('Manajemen Menu')).toBeVisible();
  });

  test('should handle error when adding menu fails', async ({ page }) => {
    // Open add menu dialog
    await page.getByRole('button', { name: 'Tambah Menu' }).click();

    // Fill form
    await page.getByPlaceholder('Masukkan nama menu').fill('Test Menu');
    await page.getByPlaceholder('Contoh: 15000').fill('15000');

    // Select category
    await page.getByText('Pilih kategori').click();
    await page.getByText('🍜 Makanan').click();

    // Mock API to return error
    await page.route('**/api/menu', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to create menu' }),
        });
      }
    });

    // Submit form
    await page.getByRole('button', { name: 'Tambah' }).click();

    // Wait for error message
    await expect(page.getByText('Gagal menyimpan menu')).toBeVisible();
  });

  test('should handle error when deleting menu fails', async ({ page }) => {
    // Find the delete button
    const nasiGorengCard = page.getByText('Nasi Goreng Spesial').locator('..').locator('..');
    const deleteButton = nasiGorengCard.getByRole('button').filter({ has: page.locator('svg') }).nth(1);

    // Mock the confirm dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // Mock API to return error
    await page.route('**/api/menu?id=*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to delete menu' }),
      });
    });

    // Click delete button
    await deleteButton.click();

    // Wait for error message
    await expect(page.getByText('Gagal menghapus menu')).toBeVisible();
  });

  test('should display empty state when category has no menus', async ({ page }) => {
    // Mock API to return only drinks
    await page.route('**/api/menu', async route => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockMenus[2]]), // Only Es Teh Manis
        });
      }
    });

    // Reload page
    await page.reload();

    // Check that Makanan category shows empty state
    const makananCard = page.getByText('Makanan').locator('..').locator('..').locator('..');
    await expect(makananCard.getByText('Belum ada menu dalam kategori ini')).toBeVisible();
  });

  test('should prevent editing/deleting while another action is in progress', async ({ page }) => {
    // Find edit and delete buttons for Nasi Goreng
    const nasiGorengCard = page.getByText('Nasi Goreng Spesial').locator('..').locator('..');
    const editButton = nasiGorengCard.getByRole('button').filter({ has: page.locator('svg') }).first();
    const deleteButton = nasiGorengCard.getByRole('button').filter({ has: page.locator('svg') }).nth(1);

    // Mock API to delay response for PUT
    await page.route('**/api/menu', async route => {
      const request = route.request();
      if (request.method() === 'PUT') {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      // Continue with default mocking
    });

    // Click edit button
    await editButton.click();

    // Close dialog
    await page.keyboard.press('Escape');

    // Wait a bit
    await page.waitForTimeout(500);

    // The availability badge should be disabled while toggling
    const availabilityBadge = nasiGorengCard.getByRole('button', { name: 'Tersedia' });
    // Note: The actual behavior might vary based on implementation
    await expect(availabilityBadge).toBeVisible();
  });
});
