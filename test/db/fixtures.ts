import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  mockAdminUser,
  mockCashierUser,
  mockCategory1,
  mockCategory2,
  mockCategory3,
  mockMenu1,
  mockMenu2,
  mockMenu3,
  mockMenu4,
  mockUnavailableMenu,
  mockSettings,
  mockReceiptTemplate,
} from '../mocks';

// ============================================================================
// Database Fixture Functions
// ============================================================================

const globalForFixturePrisma = globalThis as unknown as {
  fixturePrisma: PrismaClient | undefined;
};

/**
 * Get Prisma client for fixtures
 * Follows the same singleton pattern as lib/prisma.ts
 */
function getFixturePrisma(): PrismaClient {
  if (!globalForFixturePrisma.fixturePrisma) {
    globalForFixturePrisma.fixturePrisma = new PrismaClient({
      // @ts-expect-error - Prisma datasource type compatibility issue
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'file:./test.db',
        },
      },
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return globalForFixturePrisma.fixturePrisma;
}

/**
 * Seed basic test data
 */
export async function seedBasicFixtures() {
  const prisma = getFixturePrisma();

  // Create users
  const adminUser = await prisma.user.upsert({
    where: { email: mockAdminUser.email },
    update: {},
    create: {
      id: mockAdminUser.id,
      name: mockAdminUser.name,
      email: mockAdminUser.email,
      password: await bcrypt.hash('password123', 10),
      role: mockAdminUser.role,
      isActive: mockAdminUser.isActive,
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: mockCashierUser.email },
    update: {},
    create: {
      id: mockCashierUser.id,
      name: mockCashierUser.name,
      email: mockCashierUser.email,
      password: await bcrypt.hash('password123', 10),
      role: mockCashierUser.role,
      isActive: mockCashierUser.isActive,
    },
  });

  // Create settings
  await prisma.setting.upsert({
    where: { id: mockSettings.id },
    update: {},
    create: mockSettings,
  });

  // Create receipt template
  await prisma.receiptTemplate.upsert({
    where: { id: mockReceiptTemplate.id },
    update: {},
    create: mockReceiptTemplate,
  });

  return { adminUser, cashierUser };
}

/**
 * Seed categories
 */
export async function seedCategoryFixtures() {
  const prisma = getFixturePrisma();

  const category1 = await prisma.category.upsert({
    where: { id: mockCategory1.id },
    update: {},
    create: mockCategory1,
  });

  const category2 = await prisma.category.upsert({
    where: { id: mockCategory2.id },
    update: {},
    create: mockCategory2,
  });

  const category3 = await prisma.category.upsert({
    where: { id: mockCategory3.id },
    update: {},
    create: mockCategory3,
  });

  return { category1, category2, category3 };
}

/**
 * Seed menu items
 */
export async function seedMenuFixtures() {
  const prisma = getFixturePrisma();

  // Ensure categories exist first
  await seedCategoryFixtures();

  const menu1 = await prisma.menu.upsert({
    where: { id: mockMenu1.id },
    update: {},
    create: mockMenu1,
  });

  const menu2 = await prisma.menu.upsert({
    where: { id: mockMenu2.id },
    update: {},
    create: mockMenu2,
  });

  const menu3 = await prisma.menu.upsert({
    where: { id: mockMenu3.id },
    update: {},
    create: mockMenu3,
  });

  const menu4 = await prisma.menu.upsert({
    where: { id: mockMenu4.id },
    update: {},
    create: mockMenu4,
  });

  const unavailableMenu = await prisma.menu.upsert({
    where: { id: mockUnavailableMenu.id },
    update: {},
    create: mockUnavailableMenu,
  });

  return { menu1, menu2, menu3, menu4, unavailableMenu };
}

/**
 * Seed order data
 */
export async function seedOrderFixtures() {
  const prisma = getFixturePrisma();

  // Ensure prerequisites exist
  const { cashierUser, adminUser } = await seedBasicFixtures();
  const { menu1, menu3, menu4, menu2 } = await seedMenuFixtures();

  // Create orders
  const order1 = await prisma.order.create({
    data: {
      id: 'cm2ord111pending',
      orderNumber: 'ORD-001',
      subtotal: 30000,
      tax: 3000,
      discount: 0,
      total: 33000,
      paymentMethod: 'CASH',
      status: 'PENDING',
      notes: 'Meja 5',
      userId: cashierUser.id,
      items: {
        create: [
          {
            id: 'cm2oi111nasi',
            menuId: menu1.id,
            quantity: 1,
            price: 25000,
            notes: 'Tidak pedas',
          },
          {
            id: 'cm2oi222tea',
            menuId: menu3.id,
            quantity: 1,
            price: 5000,
            notes: undefined,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      id: 'cm2ord222completed',
      orderNumber: 'ORD-002',
      subtotal: 40000,
      tax: 4000,
      discount: 5000,
      total: 39000,
      paymentMethod: 'QRIS',
      status: 'COMPLETED',
      notes: 'Bungkus',
      userId: cashierUser.id,
      items: {
        create: [
          {
            id: 'cm2oi333coffee',
            menuId: menu4.id,
            quantity: 2,
            price: 18000,
            notes: 'Extra ice',
          },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      id: 'cm2ord333processing',
      orderNumber: 'ORD-003',
      subtotal: 50000,
      tax: 5000,
      discount: 0,
      total: 55000,
      paymentMethod: 'CARD',
      status: 'PROCESSING',
      notes: 'Dine in',
      userId: adminUser.id,
      items: {
        create: [
          {
            id: 'cm2oi444mie',
            menuId: menu2.id,
            quantity: 2,
            price: 22000,
            notes: undefined,
          },
        ],
      },
    },
  });

  return { order1, order2, order3 };
}

/**
 * Seed all fixtures
 */
export async function seedAllFixtures() {
  await seedBasicFixtures();
  await seedCategoryFixtures();
  await seedMenuFixtures();
  await seedOrderFixtures();
}

/**
 * Reset all fixtures (delete all data)
 */
export async function resetFixtures() {
  const prisma = getFixturePrisma();

  // Delete in correct order due to foreign keys
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menu.deleteMany({});
  await prisma.category.deleteMany({});
  // await prisma.session.deleteMany({}); // Session is managed by NextAuth, not Prisma
  // await prisma.account.deleteMany({}); // Account is managed by NextAuth, not Prisma
  await prisma.user.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.receiptTemplate.deleteMany({});
  await prisma.activityLog.deleteMany({});
}

/**
 * Close fixture database connection
 */
export async function closeFixtureDatabase() {
  if (globalForFixturePrisma.fixturePrisma) {
    await globalForFixturePrisma.fixturePrisma.$disconnect();
    globalForFixturePrisma.fixturePrisma = undefined;
  }
}

// ============================================================================
// Fixture Test Data Generators
// ============================================================================

/**
 * Create a test user in database
 */
export async function createTestUser(overrides: {
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'KASIR';
  isActive?: boolean;
} = {}) {
  const prisma = getFixturePrisma();
  const email = overrides.email || `test-${Date.now()}@example.com`;

  return prisma.user.create({
    data: {
      name: overrides.name || 'Test User',
      email,
      password: await bcrypt.hash('password123', 10),
      role: overrides.role || 'KASIR',
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    },
  });
}

/**
 * Create a test category in database
 */
export async function createTestCategory(overrides: {
  name?: string;
  icon?: string;
  color?: string;
  order?: number;
} = {}) {
  const prisma = getFixturePrisma();

  return prisma.category.create({
    data: {
      name: overrides.name || `Test Category ${Date.now()}`,
      icon: overrides.icon || '📁',
      color: overrides.color || '#000000',
      order: overrides.order || 0,
    },
  });
}

/**
 * Create a test menu item in database
 */
export async function createTestMenu(categoryId: string, overrides: {
  name?: string;
  description?: string;
  price?: number;
  isAvailable?: boolean;
} = {}) {
  const prisma = getFixturePrisma();

  return prisma.menu.create({
    data: {
      name: overrides.name || `Test Menu ${Date.now()}`,
      description: overrides.description || 'Test description',
      price: overrides.price || 10000,
      categoryId,
      isAvailable: overrides.isAvailable !== undefined ? overrides.isAvailable : true,
    },
  });
}

/**
 * Create a test order in database
 */
export async function createTestOrder(userId: string, overrides: {
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  paymentMethod?: 'CASH' | 'CARD' | 'QRIS' | 'TRANSFER';
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
} = {}) {
  const prisma = getFixturePrisma();

  return prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}`,
      subtotal: overrides.subtotal || 10000,
      tax: overrides.tax || 1000,
      discount: overrides.discount || 0,
      total: overrides.total || 11000,
      paymentMethod: overrides.paymentMethod || 'CASH',
      status: overrides.status || 'PENDING',
      notes: overrides.notes,
      userId,
    },
  });
}
