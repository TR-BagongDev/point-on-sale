import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { PrismaClient } from '@prisma/client';

// ============================================================================
// Test Rendering Helpers
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

/**
 * Custom render function that includes router context if needed
 */
export function renderWithRouter(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  // For now, just use standard render
  // Can be extended to include router/provider context later
  return render(ui, options);
}

/**
 * Wait for async operations to complete
 */
export async function waitForAnimations() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock function that tracks calls
 */
export function createMockFn<T extends (...args: any[]) => any>(
  implementation?: T
): T & { _mockCalls: any[][] } {
  const calls: any[][] = [];
  const fn = ((...args: any[]) => {
    calls.push(args);
    if (implementation) {
      return implementation(...args);
    }
  }) as T & { _mockCalls: any[][] };

  fn._mockCalls = calls;
  return fn;
}

// ============================================================================
// Database Helpers
// ============================================================================

const globalForPrisma = globalThis as unknown as {
  testPrisma: PrismaClient | undefined;
};

/**
 * Get or create test database client
 * Uses a singleton pattern similar to lib/prisma.ts
 */
export function getTestPrisma(): PrismaClient {
  if (!globalForPrisma.testPrisma) {
    globalForPrisma.testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'file:./test.db',
        },
      },
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return globalForPrisma.testPrisma;
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase() {
  const prisma = getTestPrisma();

  // Delete all data in correct order due to foreign key constraints
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menu.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.settings.deleteMany({});
  await prisma.receiptTemplate.deleteMany({});
  await prisma.activityLog.deleteMany({});
}

/**
 * Close test database connection
 */
export async function closeTestDatabase() {
  if (globalForPrisma.testPrisma) {
    await globalForPrisma.testPrisma.$disconnect();
    globalForPrisma.testPrisma = undefined;
  }
}

// ============================================================================
// API Test Helpers
// ============================================================================

/**
 * Create a mock response object
 */
export function createMockResponse(data: any, status = 200) {
  return {
    json: async () => data,
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(),
  };
}

/**
 * Create a mock request object
 */
export function createMockRequest(body: any, headers?: Record<string, string>) {
  return {
    json: async () => body,
    headers: new Headers(headers),
    method: 'POST',
  };
}

// ============================================================================
// Date/Time Test Helpers
// ============================================================================

/**
 * Get a fixed date for testing
 */
export function getTestDate(dateString?: string): Date {
  return dateString ? new Date(dateString) : new Date('2024-01-15T10:30:00Z');
}

/**
 * Get a relative test date
 */
export function getRelativeTestDate(daysOffset: number): Date {
  const baseDate = new Date('2024-01-15T10:30:00Z');
  baseDate.setDate(baseDate.getDate() + daysOffset);
  return baseDate;
}

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generate a random CUID
 */
export function generateTestCuid(prefix = 'test'): string {
  return `${prefix}${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a test email
 */
export function generateTestEmail(identifier?: string): string {
  const id = identifier || Math.random().toString(36).substring(7);
  return `test-${id}@example.com`;
}
