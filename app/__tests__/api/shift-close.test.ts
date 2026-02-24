import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../../api/shift/[id]/close/route';
import { mockAdminUser, mockMenu1 } from '../../../test/mocks';
import { NextRequest } from 'next/server';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    shift: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock shift utils
vi.mock('@/lib/shift-utils', () => ({
  checkUnresolvedOrders: vi.fn(),
}));

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { checkUnresolvedOrders } from '@/lib/shift-utils';
import { auth } from '@/auth';

// ============================================================================
// Helper Functions
// ============================================================================

function createMockPostRequest(id: string, body: any): NextRequest {
  return {
    url: `http://localhost:3000/api/shift/${id}/close`,
    json: async () => body,
  } as NextRequest;
}

function createMockShift(overrides: any = {}) {
  return {
    id: 'shift-123',
    userId: 'user-123',
    status: 'OPEN',
    startingCash: 500000,
    endingCash: null,
    expectedCash: null,
    discrepancy: null,
    notes: null,
    openedAt: new Date(),
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockAdminUser,
    orders: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: mockAdminUser,
  });
});

// ============================================================================
// POST /api/shift/[id]/close Tests
// ============================================================================

describe('POST /api/shift/[id]/close', () => {
  it('should block shift closure with unresolved orders', async () => {
    const shiftId = 'shift-123';
    const unresolvedOrders = [
      {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'PENDING',
      },
      {
        id: 'order-2',
        orderNumber: 'ORD-002',
        status: 'PROCESSING',
      },
    ];

    // Mock auth
    vi.mocked(auth).mockResolvedValue({
      user: mockAdminUser,
    });

    // Mock shift exists and is open
    vi.mocked(prisma.shift.findUnique).mockResolvedValueOnce(
      createMockShift({
        orders: unresolvedOrders as any,
      })
    );

    // Mock unresolved orders check returns orders
    vi.mocked(checkUnresolvedOrders).mockResolvedValueOnce(unresolvedOrders);

    const request = createMockPostRequest(shiftId, {
      endingCash: 600000,
      notes: 'Evening shift',
    });

    const response = await POST(request, { params: Promise.resolve({ id: shiftId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot close shift with unresolved orders');
    expect(data.details).toContain('ORD-001 (PENDING)');
    expect(data.details).toContain('ORD-002 (PROCESSING)');
    expect(checkUnresolvedOrders).toHaveBeenCalledWith(shiftId);
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('should allow shift closure when no unresolved orders', async () => {
    const shiftId = 'shift-123';
    const completedOrders = [
      {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'COMPLETED',
        total: 50000,
      },
    ];

    // Mock shift exists and is open
    vi.mocked(prisma.shift.findUnique).mockResolvedValueOnce(
      createMockShift({
        orders: completedOrders as any,
      })
    );

    // Mock no unresolved orders
    vi.mocked(checkUnresolvedOrders).mockResolvedValueOnce([]);

    // Mock successful update
    const updatedShift = createMockShift({
      status: 'CLOSED',
      endingCash: 550000,
      expectedCash: 550000,
      discrepancy: 0,
      closedAt: new Date(),
      notes: 'Evening shift',
    });
    vi.mocked(prisma.shift.update).mockResolvedValueOnce(updatedShift as any);

    const request = createMockPostRequest(shiftId, {
      endingCash: 550000,
      notes: 'Evening shift',
    });

    const response = await POST(request, { params: Promise.resolve({ id: shiftId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('CLOSED');
    expect(data.endingCash).toBe(550000);
    expect(data.expectedCash).toBe(550000);
    expect(data.discrepancy).toBe(0);
    expect(checkUnresolvedOrders).toHaveBeenCalledWith(shiftId);
    expect(prisma.shift.update).toHaveBeenCalledWith({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        endingCash: 550000,
        expectedCash: 550000,
        discrepancy: 0,
        closedAt: expect.any(Date),
        notes: 'Evening shift',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    const shiftId = 'shift-123';

    // Mock no auth session
    vi.mocked(auth).mockResolvedValue(null);

    const request = createMockPostRequest(shiftId, {
      endingCash: 600000,
    });

    const response = await POST(request, { params: Promise.resolve({ id: shiftId }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
    expect(checkUnresolvedOrders).not.toHaveBeenCalled();
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('should return 400 if ending cash is missing', async () => {
    const shiftId = 'shift-123';

    const request = createMockPostRequest(shiftId, {
      notes: 'Evening shift',
    });

    const response = await POST(request, { params: Promise.resolve({ id: shiftId }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Ending cash is required');
    expect(checkUnresolvedOrders).not.toHaveBeenCalled();
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('should return 400 if ending cash is negative', async () => {
    const shiftId = 'shift-123';

    const request = createMockPostRequest(shiftId, {
      endingCash: -100,
    });

    const response = await POST(request, { params: Promise.resolve({ id: shiftId }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Ending cash must be a valid non-negative number');
    expect(checkUnresolvedOrders).not.toHaveBeenCalled();
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('should return 404 if shift does not exist', async () => {
    const shiftId = 'nonexistent-shift';

    // Mock shift not found
    vi.mocked(prisma.shift.findUnique).mockResolvedValueOnce(null);

    // Mock no unresolved orders (validation still runs but will find no shift)
    vi.mocked(checkUnresolvedOrders).mockResolvedValueOnce([]);

    const request = createMockPostRequest(shiftId, {
      endingCash: 600000,
    });

    const response = await POST(request, { params: Promise.resolve({ id: shiftId }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Shift not found');
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('should return 400 if shift is already closed', async () => {
    const shiftId = 'shift-123';

    // Mock shift already closed
    vi.mocked(prisma.shift.findUnique).mockResolvedValueOnce(
      createMockShift({
        status: 'CLOSED',
        closedAt: new Date(),
      })
    );

    // Mock no unresolved orders
    vi.mocked(checkUnresolvedOrders).mockResolvedValueOnce([]);

    const request = createMockPostRequest(shiftId, {
      endingCash: 600000,
    });

    const response = await POST(request, { params: Promise.resolve({ id: shiftId }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Shift is already closed');
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });
});
