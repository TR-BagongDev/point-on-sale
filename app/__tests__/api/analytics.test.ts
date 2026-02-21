import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../../api/analytics/route';
import { mockAdminUser, mockCashierUser } from '../../../test/mocks';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock analytics functions
vi.mock('@/lib/analytics', () => ({
  getSalesByHour: vi.fn(),
  getTopSellingItems: vi.fn(),
  getPaymentDistribution: vi.fn(),
  getSalesTrend: vi.fn(),
  getPeriodComparison: vi.fn(),
}));

import { auth } from '@/auth';
import {
  getSalesByHour,
  getTopSellingItems,
  getPaymentDistribution,
  getSalesTrend,
  getPeriodComparison,
} from '@/lib/analytics';

// ============================================================================
// Helper Functions
// ============================================================================

function createMockGetRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/analytics');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    url: url.toString(),
    json: async () => ({}),
  } as NextRequest;
}

function createMockAdminSession() {
  return {
    user: {
      id: mockAdminUser.id,
      name: mockAdminUser.name,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function createMockCashierSession() {
  return {
    user: {
      id: mockCashierUser.id,
      name: mockCashierUser.name,
      email: mockCashierUser.email,
      role: mockCashierUser.role,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(null);
  vi.mocked(getSalesByHour).mockResolvedValue([]);
  vi.mocked(getTopSellingItems).mockResolvedValue([]);
  vi.mocked(getPaymentDistribution).mockResolvedValue([]);
  vi.mocked(getSalesTrend).mockResolvedValue([]);
  vi.mocked(getPeriodComparison).mockResolvedValue({
    currentPeriod: {
      totalSales: 100000,
      orderCount: 10,
      averageOrderValue: 10000,
    },
    previousPeriod: {
      totalSales: 80000,
      orderCount: 8,
      averageOrderValue: 10000,
    },
    growth: {
      salesGrowth: 25,
      orderCountGrowth: 25,
      aovGrowth: 0,
    },
  });
});

// ============================================================================
// Authorization Tests
// ============================================================================

describe('GET /api/analytics - Authorization', () => {
  it('should return 401 when no session is provided', async () => {
    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(auth).toHaveBeenCalled();
    expect(getSalesByHour).not.toHaveBeenCalled();
  });

  it('should return 403 when user is not an admin', async () => {
    vi.mocked(auth).mockResolvedValueOnce(createMockCashierSession() as any);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
    expect(auth).toHaveBeenCalled();
    expect(getSalesByHour).not.toHaveBeenCalled();
  });

  it('should allow access for admin users', async () => {
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);

    const mockSalesByHour = [
      { hour: 10, total: 50000, orderCount: 5 },
      { hour: 11, total: 75000, orderCount: 7 },
    ];

    vi.mocked(getSalesByHour).mockResolvedValueOnce(mockSalesByHour);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.salesByHour).toEqual(mockSalesByHour);
    expect(auth).toHaveBeenCalled();
    expect(getSalesByHour).toHaveBeenCalled();
  });
});

// ============================================================================
// Parameter Validation Tests
// ============================================================================

describe('GET /api/analytics - Parameter Validation', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);
  });

  it('should return 400 when startDate is missing', async () => {
    const request = createMockGetRequest({
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('startDate and endDate are required');
    expect(getSalesByHour).not.toHaveBeenCalled();
  });

  it('should return 400 when endDate is missing', async () => {
    const request = createMockGetRequest({
      startDate: '2024-01-01',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('startDate and endDate are required');
    expect(getSalesByHour).not.toHaveBeenCalled();
  });

  it('should return 400 when startDate is invalid', async () => {
    const request = createMockGetRequest({
      startDate: 'invalid-date',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid startDate format');
    expect(getSalesByHour).not.toHaveBeenCalled();
  });

  it('should return 400 when endDate is invalid', async () => {
    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: 'not-a-date',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid endDate format');
    expect(getSalesByHour).not.toHaveBeenCalled();
  });

  it('should return 400 when startDate is after endDate', async () => {
    const request = createMockGetRequest({
      startDate: '2024-12-31',
      endDate: '2024-01-01',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('startDate must be before or equal to endDate');
    expect(getSalesByHour).not.toHaveBeenCalled();
  });

  it('should accept equal startDate and endDate', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-15',
      endDate: '2024-01-15',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(getSalesByHour).toHaveBeenCalled();
  });

  it('should validate previousStartDate and previousEndDate when both are provided', async () => {
    // Test invalid previousStartDate
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);
    const request1 = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousStartDate: 'invalid',
      previousEndDate: '2023-12-31',
    });

    const response1 = await GET(request1);
    const data1 = await response1.json();

    expect(response1.status).toBe(400);
    expect(data1.error).toBe('Invalid previousStartDate format');

    // Test invalid previousEndDate
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);
    const request2 = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousStartDate: '2023-12-01',
      previousEndDate: 'not-a-date',
    });

    const response2 = await GET(request2);
    const data2 = await response2.json();

    expect(response2.status).toBe(400);
    expect(data2.error).toBe('Invalid previousEndDate format');

    // Test previousStartDate after previousEndDate
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);
    const request3 = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousStartDate: '2023-12-31',
      previousEndDate: '2023-12-01',
    });

    const response3 = await GET(request3);
    const data3 = await response3.json();

    expect(response3.status).toBe(400);
    expect(data3.error).toBe('previousStartDate must be before or equal to previousEndDate');
  });

  it('should not require previous period dates', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.salesByHour).toBeDefined();
    expect(data.periodComparison).toBeUndefined();
    expect(getPeriodComparison).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Successful Response Tests
// ============================================================================

describe('GET /api/analytics - Successful Responses', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);
  });

  it('should return all analytics data without period comparison', async () => {
    const mockSalesByHour = [
      { hour: 9, total: 25000, orderCount: 2 },
      { hour: 10, total: 50000, orderCount: 5 },
      { hour: 11, total: 75000, orderCount: 7 },
    ];

    const mockTopItems = [
      {
        menuId: 'menu1',
        menuName: 'Nasi Goreng',
        quantity: 20,
        revenue: 500000,
      },
      {
        menuId: 'menu2',
        menuName: 'Mie Goreng',
        quantity: 15,
        revenue: 330000,
      },
    ];

    const mockBottomItems = [
      {
        menuId: 'menu3',
        menuName: 'Es Teh',
        quantity: 2,
        revenue: 10000,
      },
    ];

    const mockPaymentDistribution = [
      {
        paymentMethod: 'CASH',
        total: 75000,
        percentage: 37.5,
        orderCount: 8,
      },
      {
        paymentMethod: 'CARD',
        total: 125000,
        percentage: 62.5,
        orderCount: 6,
      },
    ];

    const mockSalesTrend = [
      {
        date: '2024-01-01',
        total: 100000,
        orderCount: 10,
        averageOrderValue: 10000,
      },
      {
        date: '2024-01-02',
        total: 150000,
        orderCount: 12,
        averageOrderValue: 12500,
      },
    ];

    vi.mocked(getSalesByHour).mockResolvedValueOnce(mockSalesByHour);
    // getTopSellingItems is called twice - once for "top" and once for "bottom"
    vi.mocked(getTopSellingItems)
      .mockResolvedValueOnce(mockTopItems) // First call for "top"
      .mockResolvedValueOnce(mockBottomItems); // Second call for "bottom"
    vi.mocked(getPaymentDistribution).mockResolvedValueOnce(mockPaymentDistribution);
    vi.mocked(getSalesTrend).mockResolvedValueOnce(mockSalesTrend);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.salesByHour).toEqual(mockSalesByHour);
    expect(data.topItems).toEqual(mockTopItems);
    expect(data.bottomItems).toEqual(mockBottomItems);
    expect(data.paymentDistribution).toEqual(mockPaymentDistribution);
    expect(data.salesTrend).toEqual(mockSalesTrend);
    expect(data.periodComparison).toBeUndefined();
  });

  it('should return all analytics data with period comparison', async () => {
    const mockSalesByHour = [
      { hour: 10, total: 50000, orderCount: 5 },
    ];

    const mockTopItems = [
      {
        menuId: 'menu1',
        menuName: 'Nasi Goreng',
        quantity: 20,
        revenue: 500000,
      },
    ];

    const mockPaymentDistribution = [
      {
        paymentMethod: 'CASH',
        total: 75000,
        percentage: 37.5,
        orderCount: 8,
      },
    ];

    const mockSalesTrend = [
      {
        date: '2024-01-01',
        total: 100000,
        orderCount: 10,
        averageOrderValue: 10000,
      },
    ];

    const mockPeriodComparison = {
      currentPeriod: {
        totalSales: 100000,
        orderCount: 10,
        averageOrderValue: 10000,
      },
      previousPeriod: {
        totalSales: 80000,
        orderCount: 8,
        averageOrderValue: 10000,
      },
      growth: {
        salesGrowth: 25,
        orderCountGrowth: 25,
        aovGrowth: 0,
      },
    };

    vi.mocked(getSalesByHour).mockResolvedValueOnce(mockSalesByHour);
    vi.mocked(getTopSellingItems).mockResolvedValueOnce(mockTopItems);
    vi.mocked(getPaymentDistribution).mockResolvedValueOnce(mockPaymentDistribution);
    vi.mocked(getSalesTrend).mockResolvedValueOnce(mockSalesTrend);
    vi.mocked(getPeriodComparison).mockResolvedValueOnce(mockPeriodComparison);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousStartDate: '2023-12-01',
      previousEndDate: '2023-12-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.salesByHour).toEqual(mockSalesByHour);
    expect(data.topItems).toEqual(mockTopItems);
    expect(data.paymentDistribution).toEqual(mockPaymentDistribution);
    expect(data.salesTrend).toEqual(mockSalesTrend);
    expect(data.periodComparison).toEqual(mockPeriodComparison);
  });

  it('should call analytics functions with correct date range', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const startDate = '2024-01-01';
    const endDate = '2024-01-15';

    const request = createMockGetRequest({
      startDate,
      endDate,
    });

    await GET(request);

    expect(getSalesByHour).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date)
    );

    const salesByHourCall = vi.mocked(getSalesByHour).mock.calls[0];
    expect(salesByHourCall[0].toISOString().slice(0, 10)).toBe(startDate);
    expect(salesByHourCall[1].toISOString().slice(0, 10)).toBe(endDate);

    expect(getTopSellingItems).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      10,
      'top'
    );

    expect(getTopSellingItems).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      10,
      'bottom'
    );

    expect(getPaymentDistribution).toHaveBeenCalled();
    expect(getSalesTrend).toHaveBeenCalled();
  });

  it('should call period comparison with correct dates when provided', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousStartDate: '2023-12-01',
      previousEndDate: '2023-12-31',
    });

    await GET(request);

    expect(getPeriodComparison).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      expect.any(Date),
      expect.any(Date)
    );

    const periodComparisonCall = vi.mocked(getPeriodComparison).mock.calls[0];
    expect(periodComparisonCall[0].toISOString().slice(0, 10)).toBe('2024-01-01');
    expect(periodComparisonCall[1].toISOString().slice(0, 10)).toBe('2024-01-31');
    expect(periodComparisonCall[2].toISOString().slice(0, 10)).toBe('2023-12-01');
    expect(periodComparisonCall[3].toISOString().slice(0, 10)).toBe('2023-12-31');
  });

  it('should include all hours in salesByHour response', async () => {
    const mockSalesByHour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      total: i * 1000,
      orderCount: i,
    }));

    vi.mocked(getSalesByHour).mockResolvedValueOnce(mockSalesByHour);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-01',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.salesByHour).toHaveLength(24);
    expect(data.salesByHour[0].hour).toBe(0);
    expect(data.salesByHour[23].hour).toBe(23);
  });

  it('should return empty arrays when no data exists', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);
    vi.mocked(getTopSellingItems).mockResolvedValueOnce([]);
    vi.mocked(getPaymentDistribution).mockResolvedValueOnce([]);
    vi.mocked(getSalesTrend).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.salesByHour).toEqual([]);
    expect(data.topItems).toEqual([]);
    expect(data.bottomItems).toEqual([]);
    expect(data.paymentDistribution).toEqual([]);
    expect(data.salesTrend).toEqual([]);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('GET /api/analytics - Error Handling', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);
  });

  it('should return 500 when getSalesByHour throws an error', async () => {
    vi.mocked(getSalesByHour).mockRejectedValueOnce(
      new Error('Database connection failed')
    );

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch analytics data');
  });

  it('should return 500 when getTopSellingItems throws an error', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);
    vi.mocked(getTopSellingItems).mockRejectedValueOnce(
      new Error('Query failed')
    );

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch analytics data');
  });

  it('should return 500 when getPaymentDistribution throws an error', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);
    vi.mocked(getTopSellingItems).mockResolvedValue([]);
    vi.mocked(getPaymentDistribution).mockRejectedValueOnce(
      new Error('Aggregation failed')
    );

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch analytics data');
  });

  it('should return 500 when getSalesTrend throws an error', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);
    vi.mocked(getTopSellingItems).mockResolvedValue([]);
    vi.mocked(getPaymentDistribution).mockResolvedValue([]);
    vi.mocked(getSalesTrend).mockRejectedValueOnce(
      new Error('Trend calculation failed')
    );

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch analytics data');
  });

  it('should return 500 when getPeriodComparison throws an error', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);
    vi.mocked(getTopSellingItems).mockResolvedValue([]);
    vi.mocked(getPaymentDistribution).mockResolvedValue([]);
    vi.mocked(getSalesTrend).mockResolvedValue([]);
    vi.mocked(getPeriodComparison).mockRejectedValueOnce(
      new Error('Comparison calculation failed')
    );

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousStartDate: '2023-12-01',
      previousEndDate: '2023-12-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch analytics data');
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('GET /api/analytics - Edge Cases', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);
  });

  it('should handle date range spanning multiple months', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2023-12-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getSalesByHour).toHaveBeenCalled();
  });

  it('should handle single day date range', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-15',
      endDate: '2024-01-15',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getSalesByHour).toHaveBeenCalled();

    const salesByHourCall = vi.mocked(getSalesByHour).mock.calls[0];
    expect(salesByHourCall[0].toISOString().slice(0, 10)).toBe('2024-01-15');
    expect(salesByHourCall[1].toISOString().slice(0, 10)).toBe('2024-01-15');
  });

  it('should handle leap year dates', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-02-28',
      endDate: '2024-03-01',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getSalesByHour).toHaveBeenCalled();
  });

  it('should handle timezone differences in date parsing', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getSalesByHour).toHaveBeenCalled();

    const salesByHourCall = vi.mocked(getSalesByHour).mock.calls[0];
    expect(salesByHourCall[0]).toBeInstanceOf(Date);
    expect(salesByHourCall[1]).toBeInstanceOf(Date);
  });

  it('should handle very long date ranges', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2020-01-01',
      endDate: '2024-12-31',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getSalesByHour).toHaveBeenCalled();
  });

  it('should handle when only previousStartDate is provided without previousEndDate', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousStartDate: '2023-12-01',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.periodComparison).toBeUndefined();
    expect(getPeriodComparison).not.toHaveBeenCalled();
  });

  it('should handle when only previousEndDate is provided without previousStartDate', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousEndDate: '2023-12-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.periodComparison).toBeUndefined();
    expect(getPeriodComparison).not.toHaveBeenCalled();
  });

  it('should set end date to end of day', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-15',
    });

    await GET(request);

    const salesByHourCall = vi.mocked(getSalesByHour).mock.calls[0];
    expect(salesByHourCall[1].getHours()).toBe(23);
    expect(salesByHourCall[1].getMinutes()).toBe(59);
    expect(salesByHourCall[1].getSeconds()).toBe(59);
  });

  it('should set previous end date to end of day', async () => {
    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousStartDate: '2023-12-01',
      previousEndDate: '2023-12-15',
    });

    await GET(request);

    const periodComparisonCall = vi.mocked(getPeriodComparison).mock.calls[0];
    expect(periodComparisonCall[3].getHours()).toBe(23);
    expect(periodComparisonCall[3].getMinutes()).toBe(59);
    expect(periodComparisonCall[3].getSeconds()).toBe(59);
  });
});

// ============================================================================
// Data Structure Tests
// ============================================================================

describe('GET /api/analytics - Data Structure', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);
  });

  it('should return salesByHour with correct structure', async () => {
    const mockSalesByHour = [
      { hour: 10, total: 50000, orderCount: 5 },
    ];

    vi.mocked(getSalesByHour).mockResolvedValueOnce(mockSalesByHour);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.salesByHour)).toBe(true);
    expect(data.salesByHour[0]).toHaveProperty('hour');
    expect(data.salesByHour[0]).toHaveProperty('total');
    expect(data.salesByHour[0]).toHaveProperty('orderCount');
    expect(typeof data.salesByHour[0].hour).toBe('number');
    expect(typeof data.salesByHour[0].total).toBe('number');
    expect(typeof data.salesByHour[0].orderCount).toBe('number');
  });

  it('should return topItems with correct structure', async () => {
    const mockTopItems = [
      {
        menuId: 'menu1',
        menuName: 'Nasi Goreng',
        quantity: 20,
        revenue: 500000,
      },
    ];

    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);
    vi.mocked(getTopSellingItems).mockResolvedValueOnce(mockTopItems);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.topItems)).toBe(true);
    expect(data.topItems[0]).toHaveProperty('menuId');
    expect(data.topItems[0]).toHaveProperty('menuName');
    expect(data.topItems[0]).toHaveProperty('quantity');
    expect(data.topItems[0]).toHaveProperty('revenue');
    expect(typeof data.topItems[0].menuId).toBe('string');
    expect(typeof data.topItems[0].menuName).toBe('string');
    expect(typeof data.topItems[0].quantity).toBe('number');
    expect(typeof data.topItems[0].revenue).toBe('number');
  });

  it('should return paymentDistribution with correct structure', async () => {
    const mockPaymentDistribution = [
      {
        paymentMethod: 'CASH',
        total: 75000,
        percentage: 37.5,
        orderCount: 8,
      },
    ];

    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);
    vi.mocked(getPaymentDistribution).mockResolvedValueOnce(mockPaymentDistribution);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.paymentDistribution)).toBe(true);
    expect(data.paymentDistribution[0]).toHaveProperty('paymentMethod');
    expect(data.paymentDistribution[0]).toHaveProperty('total');
    expect(data.paymentDistribution[0]).toHaveProperty('percentage');
    expect(data.paymentDistribution[0]).toHaveProperty('orderCount');
    expect(typeof data.paymentDistribution[0].paymentMethod).toBe('string');
    expect(typeof data.paymentDistribution[0].total).toBe('number');
    expect(typeof data.paymentDistribution[0].percentage).toBe('number');
    expect(typeof data.paymentDistribution[0].orderCount).toBe('number');
  });

  it('should return salesTrend with correct structure', async () => {
    const mockSalesTrend = [
      {
        date: '2024-01-01',
        total: 100000,
        orderCount: 10,
        averageOrderValue: 10000,
      },
    ];

    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);
    vi.mocked(getSalesTrend).mockResolvedValueOnce(mockSalesTrend);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.salesTrend)).toBe(true);
    expect(data.salesTrend[0]).toHaveProperty('date');
    expect(data.salesTrend[0]).toHaveProperty('total');
    expect(data.salesTrend[0]).toHaveProperty('orderCount');
    expect(data.salesTrend[0]).toHaveProperty('averageOrderValue');
    expect(typeof data.salesTrend[0].date).toBe('string');
    expect(typeof data.salesTrend[0].total).toBe('number');
    expect(typeof data.salesTrend[0].orderCount).toBe('number');
    expect(typeof data.salesTrend[0].averageOrderValue).toBe('number');
  });

  it('should return periodComparison with correct structure', async () => {
    const mockPeriodComparison = {
      currentPeriod: {
        totalSales: 100000,
        orderCount: 10,
        averageOrderValue: 10000,
      },
      previousPeriod: {
        totalSales: 80000,
        orderCount: 8,
        averageOrderValue: 10000,
      },
      growth: {
        salesGrowth: 25,
        orderCountGrowth: 25,
        aovGrowth: 0,
      },
    };

    vi.mocked(getSalesByHour).mockResolvedValueOnce([]);
    vi.mocked(getPeriodComparison).mockResolvedValueOnce(mockPeriodComparison);

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      previousStartDate: '2023-12-01',
      previousEndDate: '2023-12-31',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.periodComparison).toBeDefined();
    expect(data.periodComparison).toHaveProperty('currentPeriod');
    expect(data.periodComparison).toHaveProperty('previousPeriod');
    expect(data.periodComparison).toHaveProperty('growth');

    expect(data.periodComparison.currentPeriod).toHaveProperty('totalSales');
    expect(data.periodComparison.currentPeriod).toHaveProperty('orderCount');
    expect(data.periodComparison.currentPeriod).toHaveProperty('averageOrderValue');

    expect(data.periodComparison.growth).toHaveProperty('salesGrowth');
    expect(data.periodComparison.growth).toHaveProperty('orderCountGrowth');
    expect(data.periodComparison.growth).toHaveProperty('aovGrowth');
  });
});

// ============================================================================
// Parallel Execution Tests
// ============================================================================

describe('GET /api/analytics - Parallel Execution', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValueOnce(createMockAdminSession() as any);
  });

  it('should fetch all analytics data in parallel', async () => {
    vi.mocked(getSalesByHour).mockImplementation(
      async () => new Promise((resolve) => setTimeout(() => resolve([]), 10))
    );
    vi.mocked(getTopSellingItems).mockImplementation(
      async () => new Promise((resolve) => setTimeout(() => resolve([]), 15))
    );
    vi.mocked(getPaymentDistribution).mockImplementation(
      async () => new Promise((resolve) => setTimeout(() => resolve([]), 10))
    );
    vi.mocked(getSalesTrend).mockImplementation(
      async () => new Promise((resolve) => setTimeout(() => resolve([]), 10))
    );

    const request = createMockGetRequest({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    const startTime = Date.now();
    const response = await GET(request);
    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);

    // The slowest function takes 15ms, so parallel execution should complete
    // in less than 40ms (10 + 15 + 10 + 10). If sequential, it would take 45ms.
    expect(duration).toBeLessThan(40);
  });
});
