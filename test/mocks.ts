import { PrismaClient } from '@prisma/client';
import type { User, Category, Menu, Order, OrderItem, Setting } from '@prisma/client';

// ============================================================================
// Mock User Data
// ============================================================================

export const mockAdminUser = {
  id: 'cm2abc123admin',
  name: 'Test Admin',
  email: 'admin@test.com',
  role: 'ADMIN',
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as User;

export const mockCashierUser = {
  id: 'cm2xyz456cashier',
  name: 'Test Cashier',
  email: 'cashier@test.com',
  role: 'KASIR',
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as User;

export const mockInactiveUser = {
  id: 'cm2def789inactive',
  name: 'Inactive User',
  email: 'inactive@test.com',
  role: 'KASIR',
  isActive: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as User;

// ============================================================================
// Mock Category Data
// ============================================================================

export const mockCategory1 = {
  id: 'cm2cat111main',
  name: 'Makanan Utama',
  icon: '🍛',
  color: '#FF6B6B',
  order: 1,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as Category;

export const mockCategory2 = {
  id: 'cm2cat222side',
  name: 'Minuman',
  icon: '🥤',
  color: '#4ECDC4',
  order: 2,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as Category;

export const mockCategory3 = {
  id: 'cm2cat333snack',
  name: 'Snack',
  icon: '🍿',
  color: '#FFE66D',
  order: 3,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as Category;

// ============================================================================
// Mock Menu Data
// ============================================================================

export const mockMenu1 = {
  id: 'cm2menu111nasi',
  name: 'Nasi Goreng Spesial',
  description: 'Nasi goreng dengan telur, ayam, dan sayuran',
  price: 25000,
  image: 'https://example.com/nasi-goreng.jpg',
  categoryId: mockCategory1.id,
  isAvailable: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as Menu;

export const mockMenu2 = {
  id: 'cm2menu222mie',
  name: 'Mie Goreng Jawa',
  description: 'Mie goreng gaya Jawa dengan telur dan sayuran',
  price: 22000,
  image: 'https://example.com/mie-goreng.jpg',
  categoryId: mockCategory1.id,
  isAvailable: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as Menu;

export const mockMenu3 = {
  id: 'cm2menu333tea',
  name: 'Es Teh Manis',
  description: 'Teh manis dingin segar',
  price: 5000,
  image: 'https://example.com/es-teh.jpg',
  categoryId: mockCategory2.id,
  isAvailable: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as Menu;

export const mockMenu4 = {
  id: 'cm2menu444coffee',
  name: 'Kopi Susu Gula Aren',
  description: 'Kopi susu dengan gula aren asli',
  price: 18000,
  image: 'https://example.com/kopi-susu.jpg',
  categoryId: mockCategory2.id,
  isAvailable: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as Menu;

export const mockUnavailableMenu = {
  id: 'cm2menu555unavail',
  name: 'Ayam Bakar (Habis)',
  description: 'Ayam bakar madu',
  price: 28000,
  image: 'https://example.com/ayam-bakar.jpg',
  categoryId: mockCategory1.id,
  isAvailable: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as Menu;

// ============================================================================
// Mock Order Data
// ============================================================================

export const mockOrder1 = {
  id: 'cm2ord111pending',
  subtotal: 30000,
  tax: 3000,
  discount: 0,
  total: 33000,
  paymentMethod: 'CASH',
  status: 'PENDING',
  notes: 'Meja 5',
  userId: mockCashierUser.id,
  createdAt: new Date('2024-01-15T10:30:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
} as Order;

export const mockOrder2 = {
  id: 'cm2ord222completed',
  subtotal: 40000,
  tax: 4000,
  discount: 5000,
  total: 39000,
  paymentMethod: 'QRIS',
  status: 'COMPLETED',
  notes: 'Bungkus',
  userId: mockCashierUser.id,
  createdAt: new Date('2024-01-15T11:00:00Z'),
  updatedAt: new Date('2024-01-15T11:30:00Z'),
} as Order;

export const mockOrder3 = {
  id: 'cm2ord333processing',
  subtotal: 50000,
  tax: 5000,
  discount: 0,
  total: 55000,
  paymentMethod: 'CARD',
  status: 'PROCESSING',
  notes: 'Dine in',
  userId: mockAdminUser.id,
  createdAt: new Date('2024-01-15T12:00:00Z'),
  updatedAt: new Date('2024-01-15T12:00:00Z'),
} as Order;

// ============================================================================
// Mock OrderItem Data
// ============================================================================

export const mockOrderItem1 = {
  id: 'cm2oi111nasi',
  orderId: mockOrder1.id,
  menuId: mockMenu1.id,
  quantity: 1,
  price: 25000,
  notes: 'Tidak pedas',
} as OrderItem;

export const mockOrderItem2 = {
  id: 'cm2oi222tea',
  orderId: mockOrder1.id,
  menuId: mockMenu3.id,
  quantity: 1,
  price: 5000,
  notes: null,
} as OrderItem;

export const mockOrderItem3 = {
  id: 'cm2oi333coffee',
  orderId: mockOrder2.id,
  menuId: mockMenu4.id,
  quantity: 2,
  price: 18000,
  notes: 'Extra ice',
} as OrderItem;

export const mockOrderItem4 = {
  id: 'cm2oi444mie',
  orderId: mockOrder3.id,
  menuId: mockMenu2.id,
  quantity: 2,
  price: 22000,
  notes: null,
} as OrderItem;

// ============================================================================
// Mock Settings Data
// ============================================================================

export const mockSettings = {
  id: 'cm2set111default',
  storeName: 'Warung Nasi Goreng Test',
  address: 'Jl. Test No. 123',
  phone: '08123456789',
  taxRate: 10,
  currency: 'IDR',
  npwp: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
} as Setting;

// ============================================================================
// Mock Receipt Template Data
// ============================================================================

export const mockReceiptTemplate = {
  id: 'cm2rcpt111default',
  name: 'Default Template',
  header: 'WARUNG NASI GORENG\\nTerima kasih atas kunjungan Anda',
  footer: 'Barang yang sudah dibeli tidak dapat ditukar\\nSelamat menikmati!',
  showDate: true,
  showTime: true,
  showCashier: true,
  showTax: true,
  paperWidth: 58,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

// ============================================================================
// Mock Session Data
// ============================================================================

export const mockSession = {
  id: 'cm2sess111test',
  userId: mockAdminUser.id,
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  sessionToken: 'test-session-token-' + Math.random().toString(36).substring(7),
};

// ============================================================================
// Helper Functions to Create Mock Data
// ============================================================================

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    ...mockAdminUser,
    id: 'cm2' + Math.random().toString(36).substring(2, 15),
    email: `test-${Math.random().toString(36).substring(7)}@example.com`,
    ...overrides,
  };
}

export function createMockCategory(overrides: Partial<Category> = {}): Category {
  return {
    ...mockCategory1,
    id: 'cm2' + Math.random().toString(36).substring(2, 15),
    ...overrides,
  };
}

export function createMockMenu(overrides: Partial<Menu> = {}): Menu {
  return {
    ...mockMenu1,
    id: 'cm2' + Math.random().toString(36).substring(2, 15),
    ...overrides,
  };
}

export function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    ...mockOrder1,
    id: 'cm2' + Math.random().toString(36).substring(2, 15),
    ...overrides,
  };
}

export function createMockOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    ...mockOrderItem1,
    id: 'cm2' + Math.random().toString(36).substring(2, 15),
    ...overrides,
  };
}

// ============================================================================
// Mock API Responses
// ============================================================================

export const mockSuccessResponse = <T>(data: T) => ({
  success: true,
  data,
  error: null,
});

export const mockErrorResponse = (message: string, code?: string) => ({
  success: false,
  data: null,
  error: {
    message,
    code,
  },
});

export const mockPaginatedResponse = <T>(
  data: T[],
  page = 1,
  limit = 10,
  total?: number
) => ({
  success: true,
  data,
  pagination: {
    page,
    limit,
    total: total || data.length,
    totalPages: Math.ceil((total || data.length) / limit),
  },
  error: null,
});
