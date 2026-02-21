import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, PUT } from '../../api/order/route';
import {
  mockAdminUser,
  mockCashierUser,
  mockCategory1,
  mockMenu1,
  mockMenu2,
  mockMenu3,
  mockUnavailableMenu,
} from '../../../test/mocks';
import { NextRequest } from 'next/server';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    menu: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

// ============================================================================
// Helper Functions
// ============================================================================

function createMockGetRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/order');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    url: url.toString(),
    json: async () => ({}),
  } as NextRequest;
}

function createMockPostRequest(body: any): NextRequest {
  return {
    url: 'http://localhost:3000/api/order',
    json: async () => body,
  } as NextRequest;
}

function createMockPutRequest(body: any): NextRequest {
  return {
    url: 'http://localhost:3000/api/order',
    json: async () => body,
  } as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// GET /api/order Tests
// ============================================================================

describe('GET /api/order', () => {
  it('should return empty array when no orders exist', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValueOnce([]);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            menu: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('should return all orders when no filters are provided', async () => {
    const mockOrders = [
      {
        id: 'order2',
        orderNumber: 'ORD-20240115-110000-002',
        userId: mockAdminUser.id,
        subtotal: 44000,
        tax: 4400,
        discount: 0,
        total: 48400,
        paymentMethod: 'CARD',
        status: 'COMPLETED',
        notes: null,
        createdAt: new Date('2024-01-15T11:00:00Z'),
        updatedAt: new Date('2024-01-15T11:30:00Z'),
        user: mockAdminUser,
        items: [
          {
            id: 'item1',
            menuId: mockMenu2.id,
            quantity: 2,
            price: 22000,
            notes: null,
            menu: mockMenu2,
          },
        ],
      },
      {
        id: 'order1',
        orderNumber: 'ORD-20240115-103000-001',
        userId: mockCashierUser.id,
        subtotal: 30000,
        tax: 3000,
        discount: 0,
        total: 33000,
        paymentMethod: 'CASH',
        status: 'PENDING',
        notes: 'Meja 5',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        user: mockCashierUser,
        items: [
          {
            id: 'item2',
            menuId: mockMenu1.id,
            quantity: 1,
            price: 25000,
            notes: null,
            menu: mockMenu1,
          },
        ],
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValueOnce(mockOrders);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('order2');
    expect(data[1].id).toBe('order1');
  });

  it('should filter orders by status', async () => {
    const mockOrders = [
      {
        id: 'order1',
        orderNumber: 'ORD-20240115-103000-001',
        userId: mockCashierUser.id,
        subtotal: 30000,
        tax: 3000,
        discount: 0,
        total: 33000,
        paymentMethod: 'CASH',
        status: 'PENDING',
        notes: 'Meja 5',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        user: mockCashierUser,
        items: [],
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValueOnce(mockOrders);

    const request = createMockGetRequest({ status: 'PENDING' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].status).toBe('PENDING');
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
        }),
      })
    );
  });

  it('should filter orders by userId', async () => {
    const mockOrders = [
      {
        id: 'order1',
        orderNumber: 'ORD-20240115-103000-001',
        userId: mockCashierUser.id,
        subtotal: 30000,
        tax: 3000,
        discount: 0,
        total: 33000,
        paymentMethod: 'CASH',
        status: 'PENDING',
        notes: 'Meja 5',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        user: mockCashierUser,
        items: [],
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValueOnce(mockOrders);

    const request = createMockGetRequest({ userId: mockCashierUser.id });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].userId).toBe(mockCashierUser.id);
  });

  it('should filter orders by single date', async () => {
    const mockOrders = [
      {
        id: 'order1',
        orderNumber: 'ORD-20240115-103000-001',
        userId: mockCashierUser.id,
        subtotal: 30000,
        tax: 3000,
        discount: 0,
        total: 33000,
        paymentMethod: 'CASH',
        status: 'PENDING',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        user: mockCashierUser,
        items: [],
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValueOnce(mockOrders);

    const request = createMockGetRequest({ date: '2024-01-15' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.any(Object),
        }),
      })
    );
  });

  it('should filter orders by date range', async () => {
    const mockOrders = [
      {
        id: 'order1',
        userId: mockCashierUser.id,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        user: mockCashierUser,
        items: [],
      },
      {
        id: 'order2',
        userId: mockAdminUser.id,
        createdAt: new Date('2024-01-16T11:00:00Z'),
        user: mockAdminUser,
        items: [],
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValueOnce(mockOrders);

    const request = createMockGetRequest({
      startDate: '2024-01-15',
      endDate: '2024-01-16',
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
  });

  it('should include user, menu, and items data', async () => {
    const mockOrders = [
      {
        id: 'order1',
        orderNumber: 'ORD-20240115-103000-001',
        userId: mockCashierUser.id,
        subtotal: 30000,
        tax: 3000,
        discount: 0,
        total: 33000,
        paymentMethod: 'CASH',
        status: 'PENDING',
        notes: null,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        user: {
          id: mockCashierUser.id,
          name: mockCashierUser.name,
          email: mockCashierUser.email,
        },
        items: [
          {
            id: 'item1',
            menuId: mockMenu1.id,
            quantity: 1,
            price: 25000,
            notes: null,
            menu: mockMenu1,
          },
          {
            id: 'item2',
            menuId: mockMenu3.id,
            quantity: 1,
            price: 5000,
            notes: null,
            menu: mockMenu3,
          },
        ],
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValueOnce(mockOrders);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].user).toBeDefined();
    expect(data[0].user.id).toBe(mockCashierUser.id);
    expect(data[0].items).toHaveLength(2);
    expect(data[0].items[0].menu).toBeDefined();
    expect(data[0].items[0].menu.name).toBe(mockMenu1.name);
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.order.findMany).mockRejectedValueOnce(new Error('Database error'));

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch orders');
  });
});

// ============================================================================
// POST /api/order Tests
// ============================================================================

describe('POST /api/order', () => {
  it('should create a new order with valid data', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
        {
          menuId: mockMenu3.id,
          quantity: 2,
          price: 5000,
        },
      ],
      subtotal: 35000,
      tax: 3500,
      discount: 0,
      total: 38500,
      paymentMethod: 'CASH',
      notes: 'Meja 5',
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1, mockMenu3]);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockCashierUser);
    vi.mocked(prisma.order.create).mockResolvedValueOnce({
      id: 'order1',
      orderNumber: 'ORD-20240115-100000-001',
      userId: mockCashierUser.id,
      subtotal: 35000,
      tax: 3500,
      discount: 0,
      total: 38500,
      paymentMethod: 'CASH',
      status: 'PENDING',
      notes: 'Meja 5',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: mockCashierUser.id,
        name: mockCashierUser.name,
      },
      items: [
        {
          id: 'item1',
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
          notes: null,
          menu: mockMenu1,
        },
        {
          id: 'item2',
          menuId: mockMenu3.id,
          quantity: 2,
          price: 5000,
          notes: null,
          menu: mockMenu3,
        },
      ],
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.orderNumber).toMatch(/^ORD-\d{8}-\d{6}-\d{3}$/);
    expect(data.subtotal).toBe(35000);
    expect(data.total).toBe(38500);
    expect(data.paymentMethod).toBe('CASH');
    expect(data.status).toBe('PENDING');
    expect(data.notes).toBe('Meja 5');
  });

  it('should create order with string price values', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: '25000',
        },
      ],
      subtotal: '25000',
      tax: '2500',
      discount: '0',
      total: '27500',
      paymentMethod: 'CASH',
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockCashierUser);
    vi.mocked(prisma.order.create).mockResolvedValueOnce({
      id: 'order1',
      orderNumber: 'ORD-20240115100000-001',
      subtotal: 25000,
      tax: 2500,
      total: 27500,
      items: [],
      user: { id: mockCashierUser.id, name: mockCashierUser.name },
    });

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(typeof data.subtotal).toBe('number');
    expect(data.subtotal).toBe(25000);
  });

  it('should create order with default values when optional fields are missing', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      discount: 0,
      total: 25000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockCashierUser);
    vi.mocked(prisma.order.create).mockResolvedValueOnce({
      id: 'order1',
      orderNumber: 'ORD-20240115100000-001',
      paymentMethod: 'CASH',
      status: 'PENDING',
      notes: null,
      items: [],
      user: { id: mockCashierUser.id, name: mockCashierUser.name },
    });

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.paymentMethod).toBe('CASH');
    expect(data.status).toBe('PENDING');
    expect(data.notes).toBeNull();
  });

  it('should reject order with missing items array', async () => {
    const requestBody = {
      subtotal: 25000,
      tax: 0,
      total: 25000,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Items must be an array');
  });

  it('should reject order with empty items array', async () => {
    const requestBody = {
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('At least one item is required');
  });

  it('should reject order with invalid menuId', async () => {
    const requestBody = {
      items: [
        {
          menuId: 'invalid-menu-id',
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 25000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Menu items not found');
  });

  it('should reject order with unavailable menu item', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockUnavailableMenu.id,
          quantity: 1,
          price: 28000,
        },
      ],
      subtotal: 28000,
      tax: 0,
      total: 28000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockUnavailableMenu]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not available');
    expect(data.error).toContain(mockUnavailableMenu.name);
  });

  it('should reject order with invalid item quantity', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: -1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 25000,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Each item must have a valid positive quantity');
  });

  it('should reject order with missing item price', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 25000,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Each item must have a price');
  });

  it('should reject order with invalid item price', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 'invalid',
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 25000,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Item price must be a valid positive number');
  });

  it('should reject order with negative item price', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: -1000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 25000,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Item price must be a valid positive number');
  });

  it('should reject order with missing subtotal', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      tax: 0,
      total: 25000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Subtotal is required');
  });

  it('should reject order with invalid subtotal', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 'invalid',
      tax: 0,
      total: 25000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Subtotal must be a valid positive number');
  });

  it('should reject order with negative subtotal', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: -1000,
      tax: 0,
      total: 25000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Subtotal must be a valid positive number');
  });

  it('should reject order with invalid tax', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 'invalid',
      total: 25000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Tax must be a valid positive number');
  });

  it('should reject order with negative tax', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: -500,
      total: 25000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Tax must be a valid positive number');
  });

  it('should reject order with invalid discount', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      discount: 'invalid',
      total: 25000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Discount must be a valid positive number');
  });

  it('should reject order with negative discount', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      discount: -1000,
      total: 25000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Discount must be a valid positive number');
  });

  it('should reject order with missing total', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      discount: 0,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Total is required');
  });

  it('should reject order with invalid total', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 'invalid',
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Total must be a valid positive number');
  });

  it('should reject order with negative total', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: -1000,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Total must be a valid positive number');
  });

  it('should reject order with invalid payment method', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 25000,
      paymentMethod: 'INVALID_METHOD',
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Payment method must be one of');
    expect(data.error).toContain('CASH');
    expect(data.error).toContain('CARD');
    expect(data.error).toContain('QRIS');
    expect(data.error).toContain('TRANSFER');
  });

  it('should reject order with invalid notes type', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 25000,
      notes: 123,
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Notes must be a string');
  });

  it('should trim notes whitespace', async () => {
    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 25000,
      notes: '  Meja 5  ',
    };

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([mockMenu1]);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockCashierUser);
    vi.mocked(prisma.order.create).mockResolvedValueOnce({
      id: 'order1',
      notes: 'Meja 5',
      items: [],
      user: { id: mockCashierUser.id, name: mockCashierUser.name },
    });

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.notes).toBe('Meja 5');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.menu.findMany).mockRejectedValueOnce(new Error('Database error'));

    const requestBody = {
      items: [
        {
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
        },
      ],
      subtotal: 25000,
      tax: 0,
      total: 25000,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create order');
  });
});

// ============================================================================
// PUT /api/order Tests
// ============================================================================

describe('PUT /api/order', () => {
  it('should update order status', async () => {
    const orderId = 'order1';
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-20240115-103000-001',
      userId: mockCashierUser.id,
      subtotal: 30000,
      tax: 3000,
      discount: 0,
      total: 33000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      notes: null,
      items: [
        {
          id: 'item1',
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
          notes: null,
          menu: mockMenu1,
        },
      ],
    };

    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValueOnce(mockOrder as any);

    const requestBody = {
      id: orderId,
      status: 'COMPLETED',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('COMPLETED');
    expect(data.id).toBe(orderId);
  });

  it('should update order notes', async () => {
    const orderId = 'order1';
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-20240115-103000-001',
      userId: mockCashierUser.id,
      status: 'PENDING',
      notes: 'Meja 10 - VIP',
      items: [],
    };

    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValueOnce(mockOrder as any);

    const requestBody = {
      id: orderId,
      notes: 'Meja 10 - VIP',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notes).toBe('Meja 10 - VIP');
  });

  it('should update both status and notes', async () => {
    const orderId = 'order1';
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-20240115-103000-001',
      userId: mockCashierUser.id,
      status: 'PROCESSING',
      notes: 'Sedang diproses',
      items: [],
    };

    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValueOnce(mockOrder as any);

    const requestBody = {
      id: orderId,
      status: 'PROCESSING',
      notes: 'Sedang diproses',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('PROCESSING');
    expect(data.notes).toBe('Sedang diproses');
  });

  it('should reject update with missing order id', async () => {
    const requestBody = {
      status: 'COMPLETED',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Order ID is required');
  });

  it('should reject update for non-existent order', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

    const requestBody = {
      id: 'non-existent-id',
      status: 'COMPLETED',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Order not found');
  });

  it('should reject update with invalid status', async () => {
    const orderId = 'order1';
    const mockOrder = {
      id: orderId,
      status: 'PENDING',
    };

    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrder as any);

    const requestBody = {
      id: orderId,
      status: 'INVALID_STATUS',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Status must be one of');
    expect(data.error).toContain('PENDING');
    expect(data.error).toContain('PROCESSING');
    expect(data.error).toContain('READY');
    expect(data.error).toContain('COMPLETED');
    expect(data.error).toContain('CANCELLED');
  });

  it('should reject update with invalid notes type', async () => {
    const orderId = 'order1';
    const mockOrder = {
      id: orderId,
      status: 'PENDING',
    };

    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrder as any);

    const requestBody = {
      id: orderId,
      notes: 123,
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Notes must be a string');
  });

  it('should trim notes whitespace', async () => {
    const orderId = 'order1';
    const mockOrder = {
      id: orderId,
      notes: 'Meja 10',
      items: [],
    };

    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValueOnce(mockOrder as any);

    const requestBody = {
      id: orderId,
      notes: '  Meja 10  ',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notes).toBe('Meja 10');
  });

  it('should include items and menu data in response', async () => {
    const orderId = 'order1';
    const mockOrder = {
      id: orderId,
      status: 'PROCESSING',
      items: [
        {
          id: 'item1',
          menuId: mockMenu1.id,
          quantity: 1,
          price: 25000,
          notes: null,
          menu: mockMenu1,
        },
        {
          id: 'item2',
          menuId: mockMenu3.id,
          quantity: 1,
          price: 5000,
          notes: null,
          menu: mockMenu3,
        },
      ],
    };

    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValueOnce(mockOrder as any);

    const requestBody = {
      id: orderId,
      status: 'PROCESSING',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toBeDefined();
    expect(data.items).toHaveLength(2);
    expect(data.items[0].menu).toBeDefined();
    expect(data.items[0].menu.name).toBe(mockMenu1.name);
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.order.findUnique).mockRejectedValueOnce(new Error('Database error'));

    const requestBody = {
      id: 'some-id',
      status: 'COMPLETED',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update order');
  });
});
