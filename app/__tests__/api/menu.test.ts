import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, PUT, DELETE } from '../../api/menu/route';
import {
  mockAdminUser,
  mockCategory1,
  mockCategory2,
  mockMenu1,
  mockMenu2,
  mockMenu3,
} from '../../../test/mocks';
import { NextRequest } from 'next/server';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    menu: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
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
    url: 'http://localhost:3000/api/menu',
    json: async () => ({}),
  } as NextRequest;
}

function createMockPostRequest(body: any): NextRequest {
  return {
    url: 'http://localhost:3000/api/menu',
    json: async () => body,
  } as NextRequest;
}

function createMockPutRequest(body: any): NextRequest {
  return {
    url: 'http://localhost:3000/api/menu',
    json: async () => body,
  } as NextRequest;
}

function createMockDeleteRequest(id: string): NextRequest {
  const url = new URL('http://localhost:3000/api/menu');
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
// GET /api/menu Tests
// ============================================================================

describe('GET /api/menu', () => {
  it('should return empty array when no menus exist', async () => {
    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce([]);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
    expect(prisma.menu.findMany).toHaveBeenCalledWith({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  });

  it('should return all menus with category data', async () => {
    const mockMenus = [
      {
        ...mockMenu1,
        category: mockCategory1,
      },
      {
        ...mockMenu2,
        category: mockCategory1,
      },
      {
        ...mockMenu3,
        category: mockCategory2,
      },
    ];

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce(mockMenus);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(3);
    expect(data[0].category).toBeDefined();
    expect(data[0].category.name).toBe(mockCategory1.name);
    expect(data[2].category.name).toBe(mockCategory2.name);
  });

  it('should order menus by createdAt asc', async () => {
    const mockMenus = [
      {
        ...mockMenu2,
        createdAt: new Date('2024-01-02T00:00:00Z'),
        category: mockCategory1,
      },
      {
        ...mockMenu1,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        category: mockCategory1,
      },
    ];

    vi.mocked(prisma.menu.findMany).mockResolvedValueOnce(mockMenus);

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].id).toBe(mockMenu2.id);
    expect(data[1].id).toBe(mockMenu1.id);
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.menu.findMany).mockRejectedValueOnce(new Error('Database error'));

    const request = createMockGetRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch menus');
  });
});

// ============================================================================
// POST /api/menu Tests
// ============================================================================

describe('POST /api/menu', () => {
  it('should create a new menu with valid data', async () => {
    const requestBody = {
      name: 'Ayam Bakar',
      description: 'Ayam bakar madu',
      price: 28000,
      image: 'https://example.com/ayam-bakar.jpg',
      categoryId: mockCategory1.id,
      isAvailable: true,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.create).mockResolvedValueOnce({
      id: 'cm2menu555new',
      ...requestBody,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: mockCategory1,
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Ayam Bakar');
    expect(data.price).toBe(28000);
    expect(data.categoryId).toBe(mockCategory1.id);
    expect(data.isAvailable).toBe(true);
  });

  it('should create menu with default isAvailable when not provided', async () => {
    const requestBody = {
      name: 'Es Jeruk',
      description: 'Es jeruk segar',
      price: 8000,
      categoryId: mockCategory2.id,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory2);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.create).mockResolvedValueOnce({
      id: 'cm2menu666new',
      ...requestBody,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: mockCategory2,
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.isAvailable).toBe(true);
  });

  it('should create menu with null description when not provided', async () => {
    const requestBody = {
      name: 'Teh Manis',
      price: 5000,
      categoryId: mockCategory2.id,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory2);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.create).mockResolvedValueOnce({
      id: 'cm2menu777new',
      ...requestBody,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: mockCategory2,
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.description).toBeNull();
  });

  it('should create menu with null image when not provided', async () => {
    const requestBody = {
      name: 'Air Mineral',
      description: 'Air mineral botol',
      price: 5000,
      categoryId: mockCategory2.id,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory2);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.create).mockResolvedValueOnce({
      id: 'cm2menu888new',
      ...requestBody,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: mockCategory2,
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.image).toBeNull();
  });

  it('should trim whitespace from name', async () => {
    const requestBody = {
      name: '  Nasi Goreng  ',
      price: 25000,
      categoryId: mockCategory1.id,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.create).mockResolvedValueOnce({
      id: 'cm2menu999new',
      name: 'Nasi Goreng',
      price: 25000,
      categoryId: mockCategory1.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: mockCategory1,
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Nasi Goreng');
  });

  it('should trim whitespace from description', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      description: '  Nasi goreng enak  ',
      price: 25000,
      categoryId: mockCategory1.id,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.create).mockResolvedValueOnce({
      id: 'cm2menu000new',
      name: 'Nasi Goreng',
      description: 'Nasi goreng enak',
      price: 25000,
      categoryId: mockCategory1.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: mockCategory1,
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.description).toBe('Nasi goreng enak');
  });

  it('should reject menu with missing name', async () => {
    const requestBody = {
      price: 25000,
      categoryId: mockCategory1.id,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required and must be a non-empty string');
  });

  it('should reject menu with empty string name', async () => {
    const requestBody = {
      name: '   ',
      price: 25000,
      categoryId: mockCategory1.id,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required and must be a non-empty string');
  });

  it('should reject menu with non-string name', async () => {
    const requestBody = {
      name: 123,
      price: 25000,
      categoryId: mockCategory1.id,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required and must be a non-empty string');
  });

  it('should reject menu with missing price', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      categoryId: mockCategory1.id,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Price is required');
  });

  it('should reject menu with null price', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      price: null,
      categoryId: mockCategory1.id,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Price is required');
  });

  it('should reject menu with empty string price', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      price: '',
      categoryId: mockCategory1.id,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Price is required');
  });

  it('should reject menu with invalid price', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      price: 'invalid',
      categoryId: mockCategory1.id,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Price must be a valid positive number');
  });

  it('should reject menu with negative price', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      price: -1000,
      categoryId: mockCategory1.id,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Price must be a valid positive number');
  });

  it('should accept menu with zero price', async () => {
    const requestBody = {
      name: 'Free Item',
      price: 0,
      categoryId: mockCategory1.id,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.create).mockResolvedValueOnce({
      id: 'cm2menu000free',
      name: 'Free Item',
      price: 0,
      categoryId: mockCategory1.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: mockCategory1,
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.price).toBe(0);
  });

  it('should accept string price and convert to number', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      price: '25000',
      categoryId: mockCategory1.id,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.create).mockResolvedValueOnce({
      id: 'cm2menuaaa',
      name: 'Nasi Goreng',
      price: 25000,
      categoryId: mockCategory1.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: mockCategory1,
    } as any);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(typeof data.price).toBe('number');
    expect(data.price).toBe(25000);
  });

  it('should reject menu with missing categoryId', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      price: 25000,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Category ID is required');
  });

  it('should reject menu with non-string categoryId', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      price: 25000,
      categoryId: 123,
    };

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Category ID is required');
  });

  it('should reject menu with non-existent category', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      price: 25000,
      categoryId: 'non-existent-id',
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Category not found');
  });

  it('should reject menu with duplicate name', async () => {
    const requestBody = {
      name: 'Nasi Goreng Spesial',
      price: 25000,
      categoryId: mockCategory1.id,
    };

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(mockMenu1);

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Menu item with this name already exists');
  });

  it('should return 500 on database error', async () => {
    const requestBody = {
      name: 'Nasi Goreng',
      price: 25000,
      categoryId: mockCategory1.id,
    };

    vi.mocked(prisma.category.findUnique).mockRejectedValueOnce(new Error('Database error'));

    const request = createMockPostRequest(requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create menu');
  });
});

// ============================================================================
// PUT /api/menu Tests
// ============================================================================

describe('PUT /api/menu', () => {
  it('should update menu name', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      name: 'Nasi Goreng Spesial Baru',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      name: 'Nasi Goreng Spesial Baru',
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Nasi Goreng Spesial Baru');
  });

  it('should update menu description', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      description: 'Deskripsi baru',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      description: 'Deskripsi baru',
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.description).toBe('Deskripsi baru');
  });

  it('should update menu price', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      price: 27000,
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      price: 27000,
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.price).toBe(27000);
  });

  it('should update menu image', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      image: 'https://example.com/new-image.jpg',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      image: 'https://example.com/new-image.jpg',
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.image).toBe('https://example.com/new-image.jpg');
  });

  it('should update menu categoryId', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      categoryId: mockCategory2.id,
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockCategory2);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      categoryId: mockCategory2.id,
      category: mockCategory2,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.categoryId).toBe(mockCategory2.id);
    expect(data.category.id).toBe(mockCategory2.id);
  });

  it('should update menu isAvailable', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      isAvailable: false,
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      isAvailable: false,
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isAvailable).toBe(false);
  });

  it('should update multiple fields at once', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      name: 'Nasi Goreng Spesial Baru',
      description: 'Deskripsi baru',
      price: 27000,
      isAvailable: false,
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      name: 'Nasi Goreng Spesial Baru',
      description: 'Deskripsi baru',
      price: 27000,
      isAvailable: false,
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Nasi Goreng Spesial Baru');
    expect(data.description).toBe('Deskripsi baru');
    expect(data.price).toBe(27000);
    expect(data.isAvailable).toBe(false);
  });

  it('should set description to null when empty string is provided', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      description: '',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      description: null,
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.description).toBeNull();
  });

  it('should set image to null when empty string is provided', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      image: '',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      image: null,
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.image).toBeNull();
  });

  it('should reject update with missing id', async () => {
    const requestBody = {
      name: 'Nasi Goreng Baru',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Menu ID is required');
  });

  it('should reject update for non-existent menu', async () => {
    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(null);

    const requestBody = {
      id: 'non-existent-id',
      name: 'Nasi Goreng Baru',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Menu item not found');
  });

  it('should reject update with empty string name', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      name: '   ',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name must be a non-empty string');
  });

  it('should reject update with non-string name', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      name: 123,
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name must be a non-empty string');
  });

  it('should reject update with invalid price', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      price: 'invalid',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Price must be a valid positive number');
  });

  it('should reject update with negative price', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      price: -1000,
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Price must be a valid positive number');
  });

  it('should reject update with non-string categoryId', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      categoryId: 123,
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Category ID must be a string');
  });

  it('should reject update with non-existent category', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      categoryId: 'non-existent-category',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Category not found');
  });

  it('should reject update with duplicate name', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      name: 'Mie Goreng Jawa',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(mockMenu2);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Menu item with this name already exists');
  });

  it('should allow updating name to same name', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      name: 'Nasi Goreng Spesial',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Nasi Goreng Spesial');
  });

  it('should trim whitespace from name', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      name: '  Nasi Goreng Baru  ',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      name: 'Nasi Goreng Baru',
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Nasi Goreng Baru');
  });

  it('should trim whitespace from description', async () => {
    const menuId = mockMenu1.id;
    const requestBody = {
      id: menuId,
      description: '  Deskripsi baru  ',
    };

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.update).mockResolvedValueOnce({
      ...mockMenu1,
      description: 'Deskripsi baru',
      category: mockCategory1,
    } as any);

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.description).toBe('Deskripsi baru');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.menu.findUnique).mockRejectedValueOnce(new Error('Database error'));

    const requestBody = {
      id: 'some-id',
      name: 'Nasi Goreng Baru',
    };

    const request = createMockPutRequest(requestBody);
    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update menu');
  });
});

// ============================================================================
// DELETE /api/menu Tests
// ============================================================================

describe('DELETE /api/menu', () => {
  it('should delete menu with valid id', async () => {
    const menuId = mockMenu1.id;

    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(mockMenu1);
    vi.mocked(prisma.menu.delete).mockResolvedValueOnce(mockMenu1);

    const request = createMockDeleteRequest(menuId);
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.menu.delete).toHaveBeenCalledWith({
      where: { id: menuId },
    });
  });

  it('should reject delete with missing id', async () => {
    const url = new URL('http://localhost:3000/api/menu');

    const request = {
      url: url.toString(),
      json: async () => ({}),
    } as NextRequest;

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Menu ID is required');
  });

  it('should reject delete for non-existent menu', async () => {
    vi.mocked(prisma.menu.findUnique).mockResolvedValueOnce(null);

    const request = createMockDeleteRequest('non-existent-id');
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Menu item not found');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(prisma.menu.findUnique).mockRejectedValueOnce(new Error('Database error'));

    const request = createMockDeleteRequest('some-id');
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete menu');
  });
});
