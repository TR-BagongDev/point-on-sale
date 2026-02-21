import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, PUT, DELETE } from '../../api/category/route';
import {
  mockAdminUser,
  mockCategory1,
  mockCategory2,
  mockCategory3,
} from '../../../test/mocks';
import { NextRequest } from 'next/server';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock NextAuth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// ============================================================================
// Helper Functions
// ============================================================================

function createMockGetRequest(): NextRequest {
  return {
    url: 'http://localhost:3000/api/category',
    json: async () => ({}),
  } as NextRequest;
}

function createMockPostRequest(body: any): NextRequest {
  return {
    url: 'http://localhost:3000/api/category',
    json: async () => body,
  } as NextRequest;
}

function createMockPutRequest(body: any): NextRequest {
  return {
    url: 'http://localhost:3000/api/category',
    json: async () => body,
  } as NextRequest;
}

function createMockDeleteRequest(id: string): NextRequest {
  const url = new URL('http://localhost:3000/api/category');
  url.searchParams.set('id', id);

  return {
    url: url.toString(),
    json: async () => ({}),
  } as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Mock auth to return admin session by default
  vi.mocked(auth).mockResolvedValueOnce({
    user: {
      id: mockAdminUser.id,
      name: mockAdminUser.name,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

// ============================================================================
// GET /api/category Tests
// ============================================================================

describe('GET /api/category', () => {
  it('should return empty array when no categories exist', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValueOnce([]);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      include: {
        menus: true,
      },
      orderBy: {
        order: 'asc',
      },
    });
  });

  it('should return all categories with menu data', async () => {
    const mockCategories = [
      {
        ...mockCategory1,
        menus: [],
      },
      {
        ...mockCategory2,
        menus: [],
      },
      {
        ...mockCategory3,
        menus: [],
      },
    ];

    vi.mocked(prisma.category.findMany).mockResolvedValueOnce(mockCategories);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(3);
    expect(data[0].menus).toBeDefined();
    expect(data[0].name).toBe(mockCategory1.name);
  });

  it('should order categories by order field asc', async () => {
    const mockCategories = [
      {
        ...mockCategory2,
        order: 2,
        menus: [],
      },
      {
        ...mockCategory1,
        order: 1,
        menus: [],
      },
      {
        ...mockCategory3,
        order: 3,
        menus: [],
      },
    ];

    vi.mocked(prisma.category.findMany).mockResolvedValueOnce(mockCategories);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].order).toBe(2);
    expect(data[1].order).toBe(1);
    expect(data[2].order).toBe(3);
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.category.findMany).mockRejectedValueOnce(new Error('Database error'));

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch categories');
  });
});

// ============================================================================
// POST /api/category Tests
// ============================================================================

describe('POST /api/category', () => {
  it('should create a new category with valid data', async () => {
    const requestBody = {
      name: 'Dessert',
      icon: '🍰',
      color: '#FFB6C1',
      order: 4,
    };

    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.create).mockResolvedValueOnce({
      id: 'cm2cat444dessert',
      ...requestBody,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Dessert');
    expect(data.icon).toBe('🍰');
    expect(data.color).toBe('#FFB6C1');
    expect(data.order).toBe(4);
  });

  it('should create category with default order when not provided', async () => {
    const requestBody = {
      name: 'Appetizer',
      icon: '🥗',
    };

    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.create).mockResolvedValueOnce({
      id: 'cm2cat555appetizer',
      name: 'Appetizer',
      icon: '🥗',
      color: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.order).toBe(0);
  });

  it('should create category with null color when not provided', async () => {
    const requestBody = {
      name: 'Main Course',
      icon: '🍽️',
      order: 1,
    };

    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.create).mockResolvedValueOnce({
      id: 'cm2cat666main',
      name: 'Main Course',
      icon: '🍽️',
      color: null,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.color).toBeNull();
  });

  it('should create category with null icon when not provided', async () => {
    const requestBody = {
      name: 'Beverages',
      color: '#87CEEB',
      order: 2,
    };

    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.create).mockResolvedValueOnce({
      id: 'cm2cat777beverages',
      name: 'Beverages',
      icon: null,
      color: '#87CEEB',
      order: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.icon).toBeNull();
  });

  it('should trim whitespace from name', async () => {
    const requestBody = {
      name: '  Dessert  ',
      icon: '🍰',
    };

    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.create).mockResolvedValueOnce({
      id: 'cm2cat888dessert',
      name: 'Dessert',
      icon: '🍰',
      color: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Dessert');
  });

  it('should accept string order and convert to number', async () => {
    const requestBody = {
      name: 'Soup',
      icon: '🍲',
      order: '5',
    };

    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.create).mockResolvedValueOnce({
      id: 'cm2cat999soup',
      name: 'Soup',
      icon: '🍲',
      color: null,
      order: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(typeof data.order).toBe('number');
    expect(data.order).toBe(5);
  });

  it('should accept zero as valid order', async () => {
    const requestBody = {
      name: 'Special',
      icon: '⭐',
      order: 0,
    };

    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.create).mockResolvedValueOnce({
      id: 'cm2cat000special',
      name: 'Special',
      icon: '⭐',
      color: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.order).toBe(0);
  });

  it('should reject category with missing name', async () => {
    const requestBody = {
      icon: '🍰',
      color: '#FFB6C1',
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required and must be a non-empty string');
  });

  it('should reject category with empty string name', async () => {
    const requestBody = {
      name: '   ',
      icon: '🍰',
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required and must be a non-empty string');
  });

  it('should reject category with non-string name', async () => {
    const requestBody = {
      name: 123,
      icon: '🍰',
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required and must be a non-empty string');
  });

  it('should reject category with invalid order', async () => {
    const requestBody = {
      name: 'Test',
      icon: '🧪',
      order: 'invalid',
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Order must be a valid non-negative number');
  });

  it('should reject category with negative order', async () => {
    const requestBody = {
      name: 'Test',
      icon: '🧪',
      order: -1,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Order must be a valid non-negative number');
  });

  it('should reject category with duplicate name', async () => {
    const requestBody = {
      name: 'Makanan Utama',
      icon: '🍛',
    };

    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(mockCategory1);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Category with this name already exists');
  });

  it('should return 500 on database error', async () => {
    const requestBody = {
      name: 'Test',
      icon: '🧪',
    };

    vi.mocked(prisma.category.findFirst).mockRejectedValueOnce(new Error('Database error'));

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create category');
  });
});

// ============================================================================
// PUT /api/category Tests
// ============================================================================

describe('PUT /api/category', () => {
  it('should update category name', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      name: 'Main Dish',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      ...mockCategory1,
      name: 'Main Dish',
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Main Dish');
  });

  it('should update category icon', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      icon: '🍽️',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      ...mockCategory1,
      icon: '🍽️',
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.icon).toBe('🍽️');
  });

  it('should update category color', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      color: '#FF5733',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      ...mockCategory1,
      color: '#FF5733',
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.color).toBe('#FF5733');
  });

  it('should update category order', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      order: 5,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      ...mockCategory1,
      order: 5,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.order).toBe(5);
  });

  it('should update multiple fields at once', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      name: 'Main Dish',
      icon: '🍽️',
      color: '#FF5733',
      order: 5,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      ...mockCategory1,
      name: 'Main Dish',
      icon: '🍽️',
      color: '#FF5733',
      order: 5,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Main Dish');
    expect(data.icon).toBe('🍽️');
    expect(data.color).toBe('#FF5733');
    expect(data.order).toBe(5);
  });

  it('should set icon to null when empty string is provided', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      icon: '',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      ...mockCategory1,
      icon: null,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.icon).toBeNull();
  });

  it('should set color to null when empty string is provided', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      color: '',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      ...mockCategory1,
      color: null,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.color).toBeNull();
  });

  it('should reject update with missing id', async () => {
    const requestBody = {
      name: 'New Name',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Category ID is required');
  });

  it('should reject update for non-existent category', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null);

    const requestBody = {
      id: 'non-existent-id',
      name: 'New Name',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Category not found');
  });

  it('should reject update with empty string name', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      name: '   ',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name must be a non-empty string');
  });

  it('should reject update with non-string name', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      name: 123,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name must be a non-empty string');
  });

  it('should reject update with invalid order', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      order: 'invalid',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Order must be a valid non-negative number');
  });

  it('should reject update with negative order', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      order: -1,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Order must be a valid non-negative number');
  });

  it('should reject update with duplicate name', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      name: 'Minuman',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(mockCategory2);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Category with this name already exists');
  });

  it('should allow updating name to same name', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      name: 'Makanan Utama',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      ...mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Makanan Utama');
  });

  it('should trim whitespace from name', async () => {
    const categoryId = mockCategory1.id;
    const requestBody = {
      id: categoryId,
      name: '  Main Dish  ',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      ...mockCategory1,
      name: 'Main Dish',
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Main Dish');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.category.findUnique).mockRejectedValueOnce(new Error('Database error'));

    const requestBody = {
      id: 'some-id',
      name: 'New Name',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update category');
  });
});

// ============================================================================
// DELETE /api/category Tests
// ============================================================================

describe('DELETE /api/category', () => {
  it('should delete category with valid id', async () => {
    const categoryId = mockCategory1.id;

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.category.delete).mockResolvedValueOnce(mockCategory1);

    const request = createMockDeleteRequest(categoryId);
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.category.delete).toHaveBeenCalledWith({
      where: { id: categoryId },
    });
  });

  it('should reject delete with missing id', async () => {
    const url = new URL('http://localhost:3000/api/category');

    const request = {
      url: url.toString(),
      json: async () => ({}),
    } as NextRequest;

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Category ID is required');
  });

  it('should reject delete for non-existent category', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null);

    const request = createMockDeleteRequest('non-existent-id');
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Category not found');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.category.findUnique).mockRejectedValueOnce(new Error('Database error'));

    const request = createMockDeleteRequest('some-id');
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete category');
  });
});
