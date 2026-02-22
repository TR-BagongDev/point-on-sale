import { describe, it, expect } from 'vitest';
import {
  UserRoleEnum,
  OrderStatusEnum,
  PaymentMethodEnum,
  idSchema,
  paginationSchema,
  dateQuerySchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  userIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  createMenuSchema,
  updateMenuSchema,
  deleteMenuSchema,
  orderItemSchema,
  createOrderSchema,
  updateOrderSchema,
  patchOrderSchema,
  orderQuerySchema,
  orderIdParamSchema,
  updateSettingsSchema,
  updateReceiptTemplateSchema,
  analyticsQuerySchema,
} from '../validation';

describe('UserRoleEnum', () => {
  it('should accept valid user roles', () => {
    expect(UserRoleEnum.parse('ADMIN')).toBe('ADMIN');
    expect(UserRoleEnum.parse('KASIR')).toBe('KASIR');
  });

  it('should reject invalid user roles', () => {
    expect(() => UserRoleEnum.parse('INVALID')).toThrow();
    expect(() => UserRoleEnum.parse('admin')).toThrow();
    expect(() => UserRoleEnum.parse('')).toThrow();
  });
});

describe('OrderStatusEnum', () => {
  it('should accept valid order statuses', () => {
    expect(OrderStatusEnum.parse('PENDING')).toBe('PENDING');
    expect(OrderStatusEnum.parse('PROCESSING')).toBe('PROCESSING');
    expect(OrderStatusEnum.parse('COMPLETED')).toBe('COMPLETED');
    expect(OrderStatusEnum.parse('CANCELLED')).toBe('CANCELLED');
  });

  it('should reject invalid order statuses', () => {
    expect(() => OrderStatusEnum.parse('INVALID')).toThrow();
    expect(() => OrderStatusEnum.parse('pending')).toThrow();
    expect(() => OrderStatusEnum.parse('')).toThrow();
  });
});

describe('PaymentMethodEnum', () => {
  it('should accept valid payment methods', () => {
    expect(PaymentMethodEnum.parse('CASH')).toBe('CASH');
    expect(PaymentMethodEnum.parse('CARD')).toBe('CARD');
    expect(PaymentMethodEnum.parse('QRIS')).toBe('QRIS');
    expect(PaymentMethodEnum.parse('TRANSFER')).toBe('TRANSFER');
  });

  it('should reject invalid payment methods', () => {
    expect(() => PaymentMethodEnum.parse('INVALID')).toThrow();
    expect(() => PaymentMethodEnum.parse('cash')).toThrow();
    expect(() => PaymentMethodEnum.parse('')).toThrow();
  });
});

describe('idSchema', () => {
  it('should accept valid CUIDs', () => {
    expect(idSchema.parse('clk7xwyv7000008mg8mn4a2pe')).toBe('clk7xwyv7000008mg8mn4a2pe');
    expect(idSchema.parse('cm7xwyv7000008mg8mn4a2pe')).toBe('cm7xwyv7000008mg8mn4a2pe');
  });

  it('should reject invalid IDs', () => {
    expect(() => idSchema.parse('')).toThrow();
    expect(() => idSchema.parse('invalid')).toThrow();
    expect(() => idSchema.parse('123')).toThrow();
    expect(() => idSchema.parse('abc')).toThrow();
  });
});

describe('paginationSchema', () => {
  it('should accept valid pagination parameters', () => {
    expect(paginationSchema.parse({ page: 1, limit: 10 })).toEqual({ page: 1, limit: 10 });
    expect(paginationSchema.parse({ page: '5', limit: '20' })).toEqual({ page: 5, limit: 20 });
  });

  it('should accept optional pagination parameters', () => {
    expect(paginationSchema.parse({})).toEqual({});
    expect(paginationSchema.parse({ page: 1 })).toEqual({ page: 1 });
    expect(paginationSchema.parse({ limit: 10 })).toEqual({ limit: 10 });
  });

  it('should reject invalid pagination parameters', () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
    expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
    expect(() => paginationSchema.parse({ page: 1.5 })).toThrow();
    expect(() => paginationSchema.parse({ limit: 10.5 })).toThrow();
  });

  it('should coerce string numbers to integers', () => {
    expect(paginationSchema.parse({ page: '2', limit: '25' })).toEqual({ page: 2, limit: 25 });
  });
});

describe('dateQuerySchema', () => {
  it('should accept valid date query parameters', () => {
    expect(dateQuerySchema.parse({})).toEqual({});
    expect(dateQuerySchema.parse({ date: '2026-01-01T00:00:00.000Z' })).toEqual({
      date: '2026-01-01T00:00:00.000Z',
    });
    expect(dateQuerySchema.parse({ startDate: '2026-01-01T00:00:00.000Z' })).toEqual({
      startDate: '2026-01-01T00:00:00.000Z',
    });
  });

  it('should accept all date parameters together', () => {
    const input = {
      date: '2026-01-01T00:00:00.000Z',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.999Z',
    };
    expect(dateQuerySchema.parse(input)).toEqual(input);
  });

  it('should reject invalid datetime formats', () => {
    expect(() => dateQuerySchema.parse({ date: '2026-01-01' })).toThrow();
    expect(() => dateQuerySchema.parse({ date: 'invalid' })).toThrow();
    expect(() => dateQuerySchema.parse({ startDate: '2026-01-01' })).toThrow();
  });
});

describe('createUserSchema', () => {
  it('should accept valid user data', () => {
    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'ADMIN' as const,
    };
    expect(createUserSchema.parse(validUser)).toEqual(validUser);
  });

  it('should reject user with empty name', () => {
    const invalidUser = {
      name: '',
      email: 'john@example.com',
      password: 'password123',
      role: 'ADMIN' as const,
    };
    expect(() => createUserSchema.parse(invalidUser)).toThrow();
  });

  it('should reject user with name too long', () => {
    const invalidUser = {
      name: 'a'.repeat(101),
      email: 'john@example.com',
      password: 'password123',
      role: 'ADMIN' as const,
    };
    expect(() => createUserSchema.parse(invalidUser)).toThrow();
  });

  it('should reject user with invalid email', () => {
    const invalidUser = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'password123',
      role: 'ADMIN' as const,
    };
    expect(() => createUserSchema.parse(invalidUser)).toThrow();
  });

  it('should reject user with short password', () => {
    const invalidUser = {
      name: 'John Doe',
      email: 'john@example.com',
      password: '12345',
      role: 'ADMIN' as const,
    };
    expect(() => createUserSchema.parse(invalidUser)).toThrow();
  });

  it('should reject user with invalid role', () => {
    const invalidUser = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'INVALID',
    };
    expect(() => createUserSchema.parse(invalidUser)).toThrow();
  });
});

describe('updateUserSchema', () => {
  it('should accept valid user update data', () => {
    const validUpdate = {
      id: 'clk7xwyv7000008mg8mn4a2pe',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'KASIR' as const,
      isActive: true,
    };
    expect(updateUserSchema.parse(validUpdate)).toEqual(validUpdate);
  });

  it('should accept partial updates', () => {
    expect(
      updateUserSchema.parse({
        id: 'clk7xwyv7000008mg8mn4a2pe',
        name: 'Jane Doe',
      })
    ).toEqual({
      id: 'clk7xwyv7000008mg8mn4a2pe',
      name: 'Jane Doe',
    });

    expect(
      updateUserSchema.parse({
        id: 'clk7xwyv7000008mg8mn4a2pe',
        isActive: false,
      })
    ).toEqual({
      id: 'clk7xwyv7000008mg8mn4a2pe',
      isActive: false,
    });
  });

  it('should reject update with invalid ID', () => {
    expect(() =>
      updateUserSchema.parse({
        id: 'invalid',
        name: 'Jane Doe',
      })
    ).toThrow();
  });

  it('should reject update with invalid email', () => {
    expect(() =>
      updateUserSchema.parse({
        id: 'clk7xwyv7000008mg8mn4a2pe',
        email: 'invalid-email',
      })
    ).toThrow();
  });
});

describe('resetPasswordSchema', () => {
  it('should accept valid password reset data', () => {
    expect(resetPasswordSchema.parse({ newPassword: 'newpassword123' })).toEqual({
      newPassword: 'newpassword123',
    });
  });

  it('should reject password that is too short', () => {
    expect(() => resetPasswordSchema.parse({ newPassword: '12345' })).toThrow();
  });

  it('should reject empty password', () => {
    expect(() => resetPasswordSchema.parse({ newPassword: '' })).toThrow();
  });
});

describe('userIdParamSchema', () => {
  it('should accept valid user ID parameter', () => {
    expect(userIdParamSchema.parse({ id: 'clk7xwyv7000008mg8mn4a2pe' })).toEqual({
      id: 'clk7xwyv7000008mg8mn4a2pe',
    });
  });

  it('should reject invalid user ID', () => {
    expect(() => userIdParamSchema.parse({ id: 'invalid' })).toThrow();
    expect(() => userIdParamSchema.parse({})).toThrow();
  });
});

describe('createCategorySchema', () => {
  it('should accept valid category data', () => {
    const validCategory = {
      name: 'Beverages',
      icon: '🥤',
      color: '#FF0000',
      order: 1,
    };
    expect(createCategorySchema.parse(validCategory)).toEqual(validCategory);
  });

  it('should accept category with only required fields', () => {
    expect(createCategorySchema.parse({ name: 'Beverages' })).toEqual({ name: 'Beverages' });
  });

  it('should reject category with empty name', () => {
    expect(() => createCategorySchema.parse({ name: '' })).toThrow();
  });

  it('should reject category with name too long', () => {
    expect(() => createCategorySchema.parse({ name: 'a'.repeat(51) })).toThrow();
  });

  it('should reject category with negative order', () => {
    expect(() => createCategorySchema.parse({ name: 'Test', order: -1 })).toThrow();
  });

  it('should reject category with decimal order', () => {
    expect(() => createCategorySchema.parse({ name: 'Test', order: 1.5 })).toThrow();
  });
});

describe('updateCategorySchema', () => {
  it('should accept valid category update data', () => {
    const validUpdate = {
      id: 'clk7xwyv7000008mg8mn4a2pe',
      name: 'Hot Drinks',
      icon: '☕',
      color: '#00FF00',
      order: 2,
    };
    expect(updateCategorySchema.parse(validUpdate)).toEqual(validUpdate);
  });

  it('should accept partial updates', () => {
    expect(
      updateCategorySchema.parse({
        id: 'clk7xwyv7000008mg8mn4a2pe',
        name: 'Hot Drinks',
      })
    ).toEqual({
      id: 'clk7xwyv7000008mg8mn4a2pe',
      name: 'Hot Drinks',
    });
  });

  it('should reject update with invalid ID', () => {
    expect(() =>
      updateCategorySchema.parse({
        id: 'invalid',
        name: 'Test',
      })
    ).toThrow();
  });
});

describe('deleteCategorySchema', () => {
  it('should accept valid category ID', () => {
    expect(deleteCategorySchema.parse({ id: 'clk7xwyv7000008mg8mn4a2pe' })).toEqual({
      id: 'clk7xwyv7000008mg8mn4a2pe',
    });
  });

  it('should reject invalid category ID', () => {
    expect(() => deleteCategorySchema.parse({ id: 'invalid' })).toThrow();
  });
});

describe('createMenuSchema', () => {
  it('should accept valid menu item data', () => {
    const validMenu = {
      name: 'Cappuccino',
      description: 'Delicious coffee drink',
      price: 25000,
      image: 'https://example.com/image.jpg',
      categoryId: 'clk7xwyv7000008mg8mn4a2pe',
      isAvailable: true,
    };
    expect(createMenuSchema.parse(validMenu)).toEqual(validMenu);
  });

  it('should accept menu item with only required fields', () => {
    const minimalMenu = {
      name: 'Espresso',
      price: 15000,
      categoryId: 'clk7xwyv7000008mg8mn4a2pe',
    };
    expect(createMenuSchema.parse(minimalMenu)).toEqual(minimalMenu);
  });

  it('should reject menu item with empty name', () => {
    const invalidMenu = {
      name: '',
      price: 15000,
      categoryId: 'clk7xwyv7000008mg8mn4a2pe',
    };
    expect(() => createMenuSchema.parse(invalidMenu)).toThrow();
  });

  it('should reject menu item with name too long', () => {
    const invalidMenu = {
      name: 'a'.repeat(101),
      price: 15000,
      categoryId: 'clk7xwyv7000008mg8mn4a2pe',
    };
    expect(() => createMenuSchema.parse(invalidMenu)).toThrow();
  });

  it('should reject menu item with description too long', () => {
    const invalidMenu = {
      name: 'Coffee',
      description: 'a'.repeat(501),
      price: 15000,
      categoryId: 'clk7xwyv7000008mg8mn4a2pe',
    };
    expect(() => createMenuSchema.parse(invalidMenu)).toThrow();
  });

  it('should reject menu item with non-positive price', () => {
    expect(() =>
      createMenuSchema.parse({
        name: 'Coffee',
        price: 0,
        categoryId: 'clk7xwyv7000008mg8mn4a2pe',
      })
    ).toThrow();

    expect(() =>
      createMenuSchema.parse({
        name: 'Coffee',
        price: -100,
        categoryId: 'clk7xwyv7000008mg8mn4a2pe',
      })
    ).toThrow();
  });

  it('should reject menu item with invalid image URL', () => {
    const invalidMenu = {
      name: 'Coffee',
      price: 15000,
      image: 'not-a-url',
      categoryId: 'clk7xwyv7000008mg8mn4a2pe',
    };
    expect(() => createMenuSchema.parse(invalidMenu)).toThrow();
  });

  it('should reject menu item with invalid category ID', () => {
    const invalidMenu = {
      name: 'Coffee',
      price: 15000,
      categoryId: 'invalid',
    };
    expect(() => createMenuSchema.parse(invalidMenu)).toThrow();
  });

  it('should coerce string price to number', () => {
    const menu = {
      name: 'Coffee',
      price: '15000',
      categoryId: 'clk7xwyv7000008mg8mn4a2pe',
    };
    expect(createMenuSchema.parse(menu)).toEqual({
      name: 'Coffee',
      price: 15000,
      categoryId: 'clk7xwyv7000008mg8mn4a2pe',
    });
  });
});

describe('updateMenuSchema', () => {
  it('should accept valid menu update data', () => {
    const validUpdate = {
      id: 'clk7xwyv7000008mg8mn4a2pe',
      name: 'Latte',
      price: 28000,
      isAvailable: false,
    };
    expect(updateMenuSchema.parse(validUpdate)).toEqual(validUpdate);
  });

  it('should accept partial updates', () => {
    expect(
      updateMenuSchema.parse({
        id: 'clk7xwyv7000008mg8mn4a2pe',
        name: 'Latte',
      })
    ).toEqual({
      id: 'clk7xwyv7000008mg8mn4a2pe',
      name: 'Latte',
    });
  });

  it('should reject update with invalid ID', () => {
    expect(() =>
      updateMenuSchema.parse({
        id: 'invalid',
        name: 'Latte',
      })
    ).toThrow();
  });

  it('should reject update with non-positive price', () => {
    expect(() =>
      updateMenuSchema.parse({
        id: 'clk7xwyv7000008mg8mn4a2pe',
        price: -100,
      })
    ).toThrow();
  });
});

describe('deleteMenuSchema', () => {
  it('should accept valid menu ID', () => {
    expect(deleteMenuSchema.parse({ id: 'clk7xwyv7000008mg8mn4a2pe' })).toEqual({
      id: 'clk7xwyv7000008mg8mn4a2pe',
    });
  });

  it('should reject invalid menu ID', () => {
    expect(() => deleteMenuSchema.parse({ id: 'invalid' })).toThrow();
  });
});

describe('orderItemSchema', () => {
  it('should accept valid order item', () => {
    const validItem = {
      menuId: 'clk7xwyv7000008mg8mn4a2pe',
      quantity: 2,
      price: 30000,
      notes: 'No sugar',
    };
    expect(orderItemSchema.parse(validItem)).toEqual(validItem);
  });

  it('should accept order item without notes', () => {
    const itemWithoutNotes = {
      menuId: 'clk7xwyv7000008mg8mn4a2pe',
      quantity: 1,
      price: 15000,
    };
    expect(orderItemSchema.parse(itemWithoutNotes)).toEqual(itemWithoutNotes);
  });

  it('should reject order item with invalid menu ID', () => {
    expect(() =>
      orderItemSchema.parse({
        menuId: 'invalid',
        quantity: 1,
        price: 15000,
      })
    ).toThrow();
  });

  it('should reject order item with non-positive quantity', () => {
    expect(() =>
      orderItemSchema.parse({
        menuId: 'clk7xwyv7000008mg8mn4a2pe',
        quantity: 0,
        price: 15000,
      })
    ).toThrow();

    expect(() =>
      orderItemSchema.parse({
        menuId: 'clk7xwyv7000008mg8mn4a2pe',
        quantity: -1,
        price: 15000,
      })
    ).toThrow();
  });

  it('should reject order item with decimal quantity', () => {
    expect(() =>
      orderItemSchema.parse({
        menuId: 'clk7xwyv7000008mg8mn4a2pe',
        quantity: 1.5,
        price: 15000,
      })
    ).toThrow();
  });

  it('should reject order item with negative price', () => {
    expect(() =>
      orderItemSchema.parse({
        menuId: 'clk7xwyv7000008mg8mn4a2pe',
        quantity: 1,
        price: -100,
      })
    ).toThrow();
  });

  it('should reject order item with notes too long', () => {
    expect(() =>
      orderItemSchema.parse({
        menuId: 'clk7xwyv7000008mg8mn4a2pe',
        quantity: 1,
        price: 15000,
        notes: 'a'.repeat(201),
      })
    ).toThrow();
  });

  it('should coerce string quantity and price to numbers', () => {
    const item = {
      menuId: 'clk7xwyv7000008mg8mn4a2pe',
      quantity: '2',
      price: '30000',
    };
    expect(orderItemSchema.parse(item)).toEqual({
      menuId: 'clk7xwyv7000008mg8mn4a2pe',
      quantity: 2,
      price: 30000,
    });
  });
});

describe('createOrderSchema', () => {
  const validOrderItem = {
    menuId: 'clk7xwyv7000008mg8mn4a2pe',
    quantity: 2,
    price: 30000,
  };

  it('should accept valid order data', () => {
    const validOrder = {
      items: [validOrderItem],
      subtotal: 60000,
      tax: 6000,
      discount: 0,
      total: 66000,
      paymentMethod: 'CASH' as const,
      notes: 'Table 5',
    };
    expect(createOrderSchema.parse(validOrder)).toEqual(validOrder);
  });

  it('should accept order with minimal required fields', () => {
    const minimalOrder = {
      items: [validOrderItem],
      subtotal: 60000,
      total: 66000,
    };
    const result = createOrderSchema.parse(minimalOrder);
    expect(result.items).toHaveLength(1);
    expect(result.tax).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.paymentMethod).toBe('CASH');
  });

  it('should accept order with multiple items', () => {
    const orderWithMultipleItems = {
      items: [
        validOrderItem,
        {
          menuId: 'clk7xwyv7000008mg8mn4a2pf',
          quantity: 1,
          price: 15000,
        },
      ],
      subtotal: 75000,
      total: 75000,
    };
    const result = createOrderSchema.parse(orderWithMultipleItems);
    expect(result.items).toHaveLength(2);
  });

  it('should reject order with empty items array', () => {
    expect(() =>
      createOrderSchema.parse({
        items: [],
        subtotal: 0,
        total: 0,
      })
    ).toThrow();
  });

  it('should reject order with negative subtotal', () => {
    expect(() =>
      createOrderSchema.parse({
        items: [validOrderItem],
        subtotal: -100,
        total: 0,
      })
    ).toThrow();
  });

  it('should reject order with negative tax', () => {
    expect(() =>
      createOrderSchema.parse({
        items: [validOrderItem],
        subtotal: 60000,
        tax: -10,
        total: 59990,
      })
    ).toThrow();
  });

  it('should reject order with negative discount', () => {
    expect(() =>
      createOrderSchema.parse({
        items: [validOrderItem],
        subtotal: 60000,
        discount: -10,
        total: 60010,
      })
    ).toThrow();
  });

  it('should reject order with negative total', () => {
    expect(() =>
      createOrderSchema.parse({
        items: [validOrderItem],
        subtotal: 60000,
        total: -100,
      })
    ).toThrow();
  });

  it('should reject order with invalid payment method', () => {
    expect(() =>
      createOrderSchema.parse({
        items: [validOrderItem],
        subtotal: 60000,
        total: 60000,
        paymentMethod: 'INVALID',
      })
    ).toThrow();
  });

  it('should reject order with notes too long', () => {
    expect(() =>
      createOrderSchema.parse({
        items: [validOrderItem],
        subtotal: 60000,
        total: 60000,
        notes: 'a'.repeat(501),
      })
    ).toThrow();
  });

  it('should coerce string numbers to numeric values', () => {
    const order = {
      items: [validOrderItem],
      subtotal: '60000',
      tax: '6000',
      discount: '0',
      total: '66000',
    };
    const result = createOrderSchema.parse(order);
    expect(result.subtotal).toBe(60000);
    expect(result.tax).toBe(6000);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(66000);
  });
});

describe('updateOrderSchema', () => {
  it('should accept valid order update data', () => {
    const validUpdate = {
      id: 'clk7xwyv7000008mg8mn4a2pe',
      status: 'PROCESSING' as const,
      notes: 'Order updated',
    };
    expect(updateOrderSchema.parse(validUpdate)).toEqual(validUpdate);
  });

  it('should accept partial updates', () => {
    expect(
      updateOrderSchema.parse({
        id: 'clk7xwyv7000008mg8mn4a2pe',
        status: 'COMPLETED' as const,
      })
    ).toEqual({
      id: 'clk7xwyv7000008mg8mn4a2pe',
      status: 'COMPLETED',
    });
  });

  it('should reject update with invalid ID', () => {
    expect(() =>
      updateOrderSchema.parse({
        id: 'invalid',
        status: 'PROCESSING' as const,
      })
    ).toThrow();
  });

  it('should reject update with invalid status', () => {
    expect(() =>
      updateOrderSchema.parse({
        id: 'clk7xwyv7000008mg8mn4a2pe',
        status: 'INVALID',
      })
    ).toThrow();
  });

  it('should reject update with notes too long', () => {
    expect(() =>
      updateOrderSchema.parse({
        id: 'clk7xwyv7000008mg8mn4a2pe',
        notes: 'a'.repeat(501),
      })
    ).toThrow();
  });
});

describe('patchOrderSchema', () => {
  it('should accept valid order patch data', () => {
    expect(patchOrderSchema.parse({ status: 'CANCELLED' as const })).toEqual({
      status: 'CANCELLED',
    });
    expect(patchOrderSchema.parse({ notes: 'Updated notes' })).toEqual({
      notes: 'Updated notes',
    });
  });

  it('should accept empty patch', () => {
    expect(patchOrderSchema.parse({})).toEqual({});
  });

  it('should reject patch with invalid status', () => {
    expect(() => patchOrderSchema.parse({ status: 'INVALID' })).toThrow();
  });

  it('should reject patch with notes too long', () => {
    expect(() => patchOrderSchema.parse({ notes: 'a'.repeat(501) })).toThrow();
  });
});

describe('orderQuerySchema', () => {
  it('should accept valid order query parameters', () => {
    expect(orderQuerySchema.parse({})).toEqual({});
    expect(orderQuerySchema.parse({ status: 'PENDING' })).toEqual({ status: 'PENDING' });
    expect(orderQuerySchema.parse({ userId: 'clk7xwyv7000008mg8mn4a2pe' })).toEqual({
      userId: 'clk7xwyv7000008mg8mn4a2pe',
    });
  });

  it('should accept date query parameters', () => {
    expect(
      orderQuerySchema.parse({
        date: '2026-01-01T00:00:00.000Z',
      })
    ).toEqual({
      date: '2026-01-01T00:00:00.000Z',
    });

    expect(
      orderQuerySchema.parse({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.999Z',
      })
    ).toEqual({
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.999Z',
    });
  });

  it('should accept combined query parameters', () => {
    const query = {
      status: 'COMPLETED' as const,
      userId: 'clk7xwyv7000008mg8mn4a2pe',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.999Z',
    };
    expect(orderQuerySchema.parse(query)).toEqual(query);
  });

  it('should reject invalid status', () => {
    expect(() => orderQuerySchema.parse({ status: 'INVALID' })).toThrow();
  });

  it('should reject invalid user ID', () => {
    expect(() => orderQuerySchema.parse({ userId: 'invalid' })).toThrow();
  });

  it('should reject invalid date format', () => {
    expect(() => orderQuerySchema.parse({ date: '2026-01-01' })).toThrow();
  });
});

describe('orderIdParamSchema', () => {
  it('should accept valid order ID', () => {
    expect(orderIdParamSchema.parse({ id: 'clk7xwyv7000008mg8mn4a2pe' })).toEqual({
      id: 'clk7xwyv7000008mg8mn4a2pe',
    });
  });

  it('should reject invalid order ID', () => {
    expect(() => orderIdParamSchema.parse({ id: 'invalid' })).toThrow();
  });
});

describe('updateSettingsSchema', () => {
  it('should accept valid settings update', () => {
    const validSettings = {
      storeName: 'My Coffee Shop',
      address: '123 Main Street',
      phone: '+1234567890',
      taxRate: 10,
    };
    expect(updateSettingsSchema.parse(validSettings)).toEqual(validSettings);
  });

  it('should accept settings with required fields', () => {
    const result = updateSettingsSchema.parse({ storeName: 'My Store', taxRate: 10 });
    expect(result.storeName).toBe('My Store');
    expect(result.taxRate).toBe(10);
  });

  it('should reject settings with empty store name', () => {
    expect(() => updateSettingsSchema.parse({ storeName: '' })).toThrow();
  });

  it('should reject settings with store name too long', () => {
    expect(() => updateSettingsSchema.parse({ storeName: 'a'.repeat(101) })).toThrow();
  });

  it('should reject settings with address too long', () => {
    expect(() =>
      updateSettingsSchema.parse({
        storeName: 'My Store',
        address: 'a'.repeat(201),
      })
    ).toThrow();
  });

  it('should reject settings with phone too long', () => {
    expect(() =>
      updateSettingsSchema.parse({
        storeName: 'My Store',
        phone: 'a'.repeat(21),
      })
    ).toThrow();
  });

  it('should reject settings with negative tax rate', () => {
    expect(() =>
      updateSettingsSchema.parse({
        storeName: 'My Store',
        taxRate: -1,
      })
    ).toThrow();
  });

  it('should reject settings with tax rate over 100', () => {
    expect(() =>
      updateSettingsSchema.parse({
        storeName: 'My Store',
        taxRate: 101,
      })
    ).toThrow();
  });

  it('should coerce string tax rate to number', () => {
    expect(
      updateSettingsSchema.parse({
        storeName: 'My Store',
        taxRate: '10',
      })
    ).toEqual({
      storeName: 'My Store',
      taxRate: 10,
    });
  });
});

describe('updateReceiptTemplateSchema', () => {
  it('should accept valid receipt template update', () => {
    const validTemplate = {
      header: 'Welcome to our store!',
      footer: 'Thank you for visiting!',
      showDate: true,
      showTime: true,
      showCashier: true,
      showTax: true,
      paperWidth: 80,
    };
    expect(updateReceiptTemplateSchema.parse(validTemplate)).toEqual(validTemplate);
  });

  it('should accept partial updates', () => {
    expect(updateReceiptTemplateSchema.parse({ header: 'New Header' })).toEqual({
      header: 'New Header',
    });

    expect(updateReceiptTemplateSchema.parse({ showDate: false })).toEqual({
      showDate: false,
    });
  });

  it('should accept empty update', () => {
    expect(updateReceiptTemplateSchema.parse({})).toEqual({});
  });

  it('should reject header that is too long', () => {
    expect(() => updateReceiptTemplateSchema.parse({ header: 'a'.repeat(501) })).toThrow();
  });

  it('should reject footer that is too long', () => {
    expect(() => updateReceiptTemplateSchema.parse({ footer: 'a'.repeat(501) })).toThrow();
  });

  it('should reject non-positive paper width', () => {
    expect(() => updateReceiptTemplateSchema.parse({ paperWidth: 0 })).toThrow();
    expect(() => updateReceiptTemplateSchema.parse({ paperWidth: -1 })).toThrow();
  });

  it('should reject paper width over 100', () => {
    expect(() => updateReceiptTemplateSchema.parse({ paperWidth: 101 })).toThrow();
  });

  it('should reject decimal paper width', () => {
    expect(() => updateReceiptTemplateSchema.parse({ paperWidth: 80.5 })).toThrow();
  });

  it('should coerce string paper width to number', () => {
    expect(updateReceiptTemplateSchema.parse({ paperWidth: '58' })).toEqual({
      paperWidth: 58,
    });
  });
});

describe('analyticsQuerySchema', () => {
  it('should accept valid analytics query parameters', () => {
    expect(analyticsQuerySchema.parse({})).toEqual({});
    expect(analyticsQuerySchema.parse({ period: 'today' })).toEqual({ period: 'today' });
    expect(analyticsQuerySchema.parse({ period: 'week' })).toEqual({ period: 'week' });
    expect(analyticsQuerySchema.parse({ period: 'month' })).toEqual({ period: 'month' });
    expect(analyticsQuerySchema.parse({ period: 'year' })).toEqual({ period: 'year' });
    expect(analyticsQuerySchema.parse({ period: 'custom' })).toEqual({ period: 'custom' });
  });

  it('should accept custom date range with period', () => {
    const query = {
      period: 'custom' as const,
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.999Z',
    };
    expect(analyticsQuerySchema.parse(query)).toEqual(query);
  });

  it('should reject invalid period', () => {
    expect(() => analyticsQuerySchema.parse({ period: 'invalid' })).toThrow();
    expect(() => analyticsQuerySchema.parse({ period: 'TODAY' })).toThrow();
  });

  it('should reject invalid start date format', () => {
    expect(() =>
      analyticsQuerySchema.parse({
        startDate: '2026-01-01',
      })
    ).toThrow();
  });

  it('should reject invalid end date format', () => {
    expect(() =>
      analyticsQuerySchema.parse({
        endDate: '2026-12-31',
      })
    ).toThrow();
  });
});
