import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSalesByHour,
  getTopSellingItems,
  getPaymentDistribution,
  getSalesTrend,
  getPeriodComparison,
  type SalesByHourData,
  type ItemSalesData,
  type PaymentDistributionData,
  type SalesTrendData,
  type PeriodComparisonData,
} from '../analytics';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  default: {
    order: {
      findMany: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

describe('getSalesByHour', () => {
  const mockStartDate = new Date('2026-01-01T00:00:00.000Z');
  const mockEndDate = new Date('2026-01-01T23:59:59.999Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate sales by hour correctly', async () => {
    // Using UTC times that will convert to specific local hours (UTC+7)
    const mockOrders = [
      {
        total: 15000,
        createdAt: new Date('2026-01-01T02:30:00.000Z'), // 09:30 local
      },
      {
        total: 25000,
        createdAt: new Date('2026-01-01T02:45:00.000Z'), // 09:45 local
      },
      {
        total: 30000,
        createdAt: new Date('2026-01-01T07:00:00.000Z'), // 14:00 local
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getSalesByHour(mockStartDate, mockEndDate);

    expect(result).toHaveLength(24);

    // Find the hour data for 9 AM and 2 PM (local time)
    const hour9 = result.find((h) => h.hour === 9);
    const hour14 = result.find((h) => h.hour === 14);
    const hour0 = result.find((h) => h.hour === 0);

    expect(hour9?.total).toBe(40000); // 9 AM: 15000 + 25000
    expect(hour9?.orderCount).toBe(2);
    expect(hour14?.total).toBe(30000); // 2 PM
    expect(hour14?.orderCount).toBe(1);
    expect(hour0?.total).toBe(0); // Midnight - no orders
    expect(hour0?.orderCount).toBe(0);
  });

  it('should return all 24 hours with zeros for empty ranges', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const result = await getSalesByHour(mockStartDate, mockEndDate);

    expect(result).toHaveLength(24);
    result.forEach((hourData: SalesByHourData) => {
      expect(hourData.total).toBe(0);
      expect(hourData.orderCount).toBe(0);
      expect(hourData.hour).toBeGreaterThanOrEqual(0);
      expect(hourData.hour).toBeLessThanOrEqual(23);
    });
  });

  it('should handle single order at midnight', async () => {
    const mockOrders = [
      {
        total: 50000,
        createdAt: new Date('2026-01-01T17:00:00.000Z'), // 00:00 local (midnight)
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getSalesByHour(mockStartDate, mockEndDate);

    const hour0 = result.find((h) => h.hour === 0);
    expect(hour0?.total).toBe(50000);
    expect(hour0?.orderCount).toBe(1);
  });

  it('should handle single order at 11 PM', async () => {
    const mockOrders = [
      {
        total: 75000,
        createdAt: new Date('2026-01-01T16:30:00.000Z'), // 23:30 local (11 PM)
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getSalesByHour(mockStartDate, mockEndDate);

    const hour23 = result.find((h) => h.hour === 23);
    expect(hour23?.total).toBe(75000);
    expect(hour23?.orderCount).toBe(1);
  });

  it('should filter only COMPLETED orders', async () => {
    await getSalesByHour(mockStartDate, mockEndDate);

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: mockStartDate,
          lte: mockEndDate,
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });
  });

  it('should throw error on database error', async () => {
    vi.mocked(prisma.order.findMany).mockRejectedValue(new Error('Database error'));

    await expect(getSalesByHour(mockStartDate, mockEndDate)).rejects.toThrow(
      'Failed to fetch sales by hour'
    );
  });

  it('should aggregate multiple orders in same hour correctly', async () => {
    const mockOrders = [
      { total: 10000, createdAt: new Date('2026-01-01T03:05:00.000Z') }, // 10:05 local
      { total: 20000, createdAt: new Date('2026-01-01T03:15:00.000Z') }, // 10:15 local
      { total: 15000, createdAt: new Date('2026-01-01T03:30:00.000Z') }, // 10:30 local
      { total: 25000, createdAt: new Date('2026-01-01T03:45:00.000Z') }, // 10:45 local
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getSalesByHour(mockStartDate, mockEndDate);

    const hour10 = result.find((h) => h.hour === 10);
    expect(hour10?.total).toBe(70000); // Sum of all
    expect(hour10?.orderCount).toBe(4);
  });
});

describe('getTopSellingItems', () => {
  const mockStartDate = new Date('2026-01-01T00:00:00.000Z');
  const mockEndDate = new Date('2026-01-31T23:59:59.999Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return top selling items sorted by revenue', async () => {
    const mockOrderItems = [
      {
        menuId: 'menu1',
        quantity: 10,
        price: 15000,
        menu: { id: 'menu1', name: 'Cappuccino' },
      },
      {
        menuId: 'menu2',
        quantity: 5,
        price: 25000,
        menu: { id: 'menu2', name: 'Latte' },
      },
      {
        menuId: 'menu3',
        quantity: 20,
        price: 10000,
        menu: { id: 'menu3', name: 'Espresso' },
      },
    ];

    vi.mocked(prisma.orderItem.findMany).mockResolvedValue(mockOrderItems);

    const result = await getTopSellingItems(mockStartDate, mockEndDate, 10, 'top');

    expect(result).toHaveLength(3);
    // menu3: 20 * 10000 = 200000 (highest)
    expect(result[0].menuId).toBe('menu3');
    expect(result[0].revenue).toBe(200000);
    expect(result[0].quantity).toBe(20);
    // menu1: 10 * 15000 = 150000 (second)
    expect(result[1].menuId).toBe('menu1');
    expect(result[1].revenue).toBe(150000);
    expect(result[1].quantity).toBe(10);
    // menu2: 5 * 25000 = 125000 (lowest)
    expect(result[2].menuId).toBe('menu2');
    expect(result[2].revenue).toBe(125000);
    expect(result[2].quantity).toBe(5);
  });

  it('should aggregate quantities and revenues for same menu item', async () => {
    const mockOrderItems = [
      {
        menuId: 'menu1',
        quantity: 5,
        price: 15000,
        menu: { id: 'menu1', name: 'Cappuccino' },
      },
      {
        menuId: 'menu1',
        quantity: 3,
        price: 15000,
        menu: { id: 'menu1', name: 'Cappuccino' },
      },
      {
        menuId: 'menu1',
        quantity: 2,
        price: 15000,
        menu: { id: 'menu1', name: 'Cappuccino' },
      },
    ];

    vi.mocked(prisma.orderItem.findMany).mockResolvedValue(mockOrderItems);

    const result = await getTopSellingItems(mockStartDate, mockEndDate, 10, 'top');

    expect(result).toHaveLength(1);
    expect(result[0].menuId).toBe('menu1');
    expect(result[0].quantity).toBe(10); // 5 + 3 + 2
    expect(result[0].revenue).toBe(150000); // 10 * 15000
  });

  it('should respect limit parameter', async () => {
    const mockOrderItems = Array.from({ length: 15 }, (_, i) => ({
      menuId: `menu${i}`,
      quantity: 1,
      price: 10000 * (i + 1),
      menu: { id: `menu${i}`, name: `Item ${i}` },
    }));

    vi.mocked(prisma.orderItem.findMany).mockResolvedValue(mockOrderItems);

    const result = await getTopSellingItems(mockStartDate, mockEndDate, 5, 'top');

    expect(result).toHaveLength(5);
  });

  it('should return bottom selling items when order is "bottom"', async () => {
    const mockOrderItems = [
      {
        menuId: 'menu1',
        quantity: 10,
        price: 15000,
        menu: { id: 'menu1', name: 'Cappuccino' },
      },
      {
        menuId: 'menu2',
        quantity: 5,
        price: 25000,
        menu: { id: 'menu2', name: 'Latte' },
      },
      {
        menuId: 'menu3',
        quantity: 20,
        price: 10000,
        menu: { id: 'menu3', name: 'Espresso' },
      },
    ];

    vi.mocked(prisma.orderItem.findMany).mockResolvedValue(mockOrderItems);

    const result = await getTopSellingItems(mockStartDate, mockEndDate, 10, 'bottom');

    expect(result).toHaveLength(3);
    expect(result[0].menuId).toBe('menu2'); // Lowest revenue
    expect(result[2].menuId).toBe('menu3'); // Highest revenue
  });

  it('should return empty array when no items found', async () => {
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([]);

    const result = await getTopSellingItems(mockStartDate, mockEndDate, 10, 'top');

    expect(result).toEqual([]);
  });

  it('should filter only COMPLETED orders', async () => {
    await getTopSellingItems(mockStartDate, mockEndDate, 10, 'top');

    expect(prisma.orderItem.findMany).toHaveBeenCalledWith({
      where: {
        order: {
          status: 'COMPLETED',
          createdAt: {
            gte: mockStartDate,
            lte: mockEndDate,
          },
        },
      },
      include: {
        menu: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  it('should throw error on database error', async () => {
    vi.mocked(prisma.orderItem.findMany).mockRejectedValue(
      new Error('Database error')
    );

    await expect(
      getTopSellingItems(mockStartDate, mockEndDate, 10, 'top')
    ).rejects.toThrow('Failed to fetch top selling items');
  });

  it('should use default limit of 10 when not specified', async () => {
    const mockOrderItems = Array.from({ length: 20 }, (_, i) => ({
      menuId: `menu${i}`,
      quantity: 1,
      price: 10000,
      menu: { id: `menu${i}`, name: `Item ${i}` },
    }));

    vi.mocked(prisma.orderItem.findMany).mockResolvedValue(mockOrderItems);

    const result = await getTopSellingItems(mockStartDate, mockEndDate);

    expect(result).toHaveLength(10);
  });
});

describe('getPaymentDistribution', () => {
  const mockStartDate = new Date('2026-01-01T00:00:00.000Z');
  const mockEndDate = new Date('2026-01-31T23:59:59.999Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate payment distribution correctly', async () => {
    const mockOrders = [
      { paymentMethod: 'CASH', total: 50000 },
      { paymentMethod: 'CASH', total: 30000 },
      { paymentMethod: 'CARD', total: 75000 },
      { paymentMethod: 'QRIS', total: 45000 },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getPaymentDistribution(mockStartDate, mockEndDate);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({
      paymentMethod: 'CASH',
      total: 80000,
      percentage: (80000 / 200000) * 100,
      orderCount: 2,
    });
    expect(result).toContainEqual({
      paymentMethod: 'CARD',
      total: 75000,
      percentage: (75000 / 200000) * 100,
      orderCount: 1,
    });
    expect(result).toContainEqual({
      paymentMethod: 'QRIS',
      total: 45000,
      percentage: (45000 / 200000) * 100,
      orderCount: 1,
    });
  });

  it('should handle single payment method', async () => {
    const mockOrders = [
      { paymentMethod: 'CASH', total: 100000 },
      { paymentMethod: 'CASH', total: 50000 },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getPaymentDistribution(mockStartDate, mockEndDate);

    expect(result).toHaveLength(1);
    expect(result[0].paymentMethod).toBe('CASH');
    expect(result[0].total).toBe(150000);
    expect(result[0].percentage).toBe(100);
    expect(result[0].orderCount).toBe(2);
  });

  it('should return empty array when no orders', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const result = await getPaymentDistribution(mockStartDate, mockEndDate);

    expect(result).toEqual([]);
  });

  it('should filter only COMPLETED orders', async () => {
    await getPaymentDistribution(mockStartDate, mockEndDate);

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: mockStartDate,
          lte: mockEndDate,
        },
      },
      select: {
        paymentMethod: true,
        total: true,
      },
    });
  });

  it('should throw error on database error', async () => {
    vi.mocked(prisma.order.findMany).mockRejectedValue(new Error('Database error'));

    await expect(getPaymentDistribution(mockStartDate, mockEndDate)).rejects.toThrow(
      'Failed to fetch payment distribution'
    );
  });

  it('should calculate percentage with zero decimal precision', async () => {
    const mockOrders = [
      { paymentMethod: 'CASH', total: 33333 },
      { paymentMethod: 'CARD', total: 33333 },
      { paymentMethod: 'QRIS', total: 33334 },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getPaymentDistribution(mockStartDate, mockEndDate);

    // Check that percentages sum to approximately 100
    const totalPercentage = result.reduce((sum, item) => sum + item.percentage, 0);
    expect(totalPercentage).toBeCloseTo(100, 5);
  });

  it('should handle TRANSFER payment method', async () => {
    const mockOrders = [{ paymentMethod: 'TRANSFER', total: 100000 }];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getPaymentDistribution(mockStartDate, mockEndDate);

    expect(result).toHaveLength(1);
    expect(result[0].paymentMethod).toBe('TRANSFER');
    expect(result[0].percentage).toBe(100);
  });
});

describe('getSalesTrend', () => {
  const mockStartDate = new Date('2026-01-01T00:00:00.000Z');
  const mockEndDate = new Date('2026-01-05T23:59:59.999Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate sales by date correctly', async () => {
    const mockOrders = [
      {
        total: 50000,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      },
      {
        total: 30000,
        createdAt: new Date('2026-01-01T14:00:00.000Z'),
      },
      {
        total: 75000,
        createdAt: new Date('2026-01-03T11:00:00.000Z'),
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getSalesTrend(mockStartDate, mockEndDate);

    // The function fills all dates in range, so we should get 6 days (Jan 1-6 inclusive)
    expect(result.length).toBeGreaterThanOrEqual(5);

    const jan1 = result.find((d) => d.date === '2026-01-01');
    const jan3 = result.find((d) => d.date === '2026-01-03');

    expect(jan1?.total).toBe(80000); // 50000 + 30000
    expect(jan1?.orderCount).toBe(2);
    expect(jan1?.averageOrderValue).toBe(40000); // 80000 / 2
    expect(jan3?.total).toBe(75000);
    expect(jan3?.orderCount).toBe(1);
  });

  it('should fill missing dates with zeros', async () => {
    const mockOrders = [
      {
        total: 50000,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getSalesTrend(mockStartDate, mockEndDate);

    // Should have at least 5 days
    expect(result.length).toBeGreaterThanOrEqual(5);

    const jan1 = result.find((d) => d.date === '2026-01-01');
    const jan2 = result.find((d) => d.date === '2026-01-02');

    expect(jan1?.total).toBe(50000);
    expect(jan2?.total).toBe(0);
    expect(jan2?.orderCount).toBe(0);
    expect(jan2?.averageOrderValue).toBe(0);
  });

  it('should return empty result for date range with no orders', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const result = await getSalesTrend(mockStartDate, mockEndDate);

    // Should have at least 5 days
    expect(result.length).toBeGreaterThanOrEqual(5);

    result.forEach((day: SalesTrendData) => {
      expect(day.total).toBe(0);
      expect(day.orderCount).toBe(0);
      expect(day.averageOrderValue).toBe(0);
    });
  });

  it('should calculate AOV correctly', async () => {
    const mockOrders = [
      { total: 30000, createdAt: new Date('2026-01-01T10:00:00.000Z') },
      { total: 60000, createdAt: new Date('2026-01-01T12:00:00.000Z') },
      { total: 90000, createdAt: new Date('2026-01-01T14:00:00.000Z') },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getSalesTrend(mockStartDate, mockEndDate);

    const jan1 = result.find((d) => d.date === '2026-01-01');
    expect(jan1?.averageOrderValue).toBe(60000); // (30000 + 60000 + 90000) / 3
  });

  it('should filter only COMPLETED orders', async () => {
    await getSalesTrend(mockStartDate, mockEndDate);

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: mockStartDate,
          lte: mockEndDate,
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  });

  it('should throw error on database error', async () => {
    vi.mocked(prisma.order.findMany).mockRejectedValue(new Error('Database error'));

    await expect(getSalesTrend(mockStartDate, mockEndDate)).rejects.toThrow(
      'Failed to fetch sales trend'
    );
  });

  it('should return results sorted by date', async () => {
    const mockOrders = [
      { total: 30000, createdAt: new Date('2026-01-05T10:00:00.000Z') },
      { total: 20000, createdAt: new Date('2026-01-01T10:00:00.000Z') },
      { total: 40000, createdAt: new Date('2026-01-03T10:00:00.000Z') },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getSalesTrend(mockStartDate, mockEndDate);

    // Check that dates are sorted
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date >= result[i - 1].date).toBe(true);
    }

    // Verify specific dates exist and are in correct order
    const dates = result.map((r) => r.date);
    const jan1Index = dates.indexOf('2026-01-01');
    const jan3Index = dates.indexOf('2026-01-03');
    const jan5Index = dates.indexOf('2026-01-05');

    expect(jan1Index).toBeLessThan(jan3Index);
    expect(jan3Index).toBeLessThan(jan5Index);
  });

  it('should handle single day range', async () => {
    const singleDayStart = new Date('2026-01-01T00:00:00.000Z');
    const singleDayEnd = new Date('2026-01-01T23:59:59.999Z');

    const mockOrders = [
      { total: 50000, createdAt: new Date('2026-01-01T10:00:00.000Z') },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await getSalesTrend(singleDayStart, singleDayEnd);

    // The function includes the end date, so we should get 2 days (Jan 1-2)
    expect(result.length).toBeGreaterThanOrEqual(1);

    const jan1 = result.find((d) => d.date === '2026-01-01');
    expect(jan1?.date).toBe('2026-01-01');
    expect(jan1?.total).toBe(50000);
  });
});

describe('getPeriodComparison', () => {
  const currentStartDate = new Date('2026-01-01T00:00:00.000Z');
  const currentEndDate = new Date('2026-01-31T23:59:59.999Z');
  const previousStartDate = new Date('2025-12-01T00:00:00.000Z');
  const previousEndDate = new Date('2025-12-31T23:59:59.999Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate period comparison metrics correctly', async () => {
    // Current period: 2 orders, total 150000
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([
        { total: 75000 },
        { total: 75000 },
      ])
      // Previous period: 1 order, total 50000
      .mockResolvedValueOnce([{ total: 50000 }]);

    const result = await getPeriodComparison(
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    expect(result.currentPeriod.totalSales).toBe(150000);
    expect(result.currentPeriod.orderCount).toBe(2);
    expect(result.currentPeriod.averageOrderValue).toBe(75000);

    expect(result.previousPeriod.totalSales).toBe(50000);
    expect(result.previousPeriod.orderCount).toBe(1);
    expect(result.previousPeriod.averageOrderValue).toBe(50000);

    // Growth calculations
    expect(result.growth.salesGrowth).toBe(200); // ((150000 - 50000) / 50000) * 100
    expect(result.growth.orderCountGrowth).toBe(100); // ((2 - 1) / 1) * 100
    expect(result.growth.aovGrowth).toBe(50); // ((75000 - 50000) / 50000) * 100
  });

  it('should handle zero previous period sales', async () => {
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([{ total: 100000 }])
      .mockResolvedValueOnce([]);

    const result = await getPeriodComparison(
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    expect(result.currentPeriod.totalSales).toBe(100000);
    expect(result.previousPeriod.totalSales).toBe(0);
    expect(result.growth.salesGrowth).toBe(100); // Growth from 0 is 100%
  });

  it('should handle zero current period sales', async () => {
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 100000 }]);

    const result = await getPeriodComparison(
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    expect(result.currentPeriod.totalSales).toBe(0);
    expect(result.previousPeriod.totalSales).toBe(100000);
    expect(result.growth.salesGrowth).toBe(-100); // -100% growth
  });

  it('should handle both periods with no orders', async () => {
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getPeriodComparison(
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    expect(result.currentPeriod.totalSales).toBe(0);
    expect(result.currentPeriod.orderCount).toBe(0);
    expect(result.currentPeriod.averageOrderValue).toBe(0);

    expect(result.previousPeriod.totalSales).toBe(0);
    expect(result.previousPeriod.orderCount).toBe(0);
    expect(result.previousPeriod.averageOrderValue).toBe(0);

    expect(result.growth.salesGrowth).toBe(0);
    expect(result.growth.orderCountGrowth).toBe(0);
    expect(result.growth.aovGrowth).toBe(0);
  });

  it('should calculate AOV correctly for both periods', async () => {
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([
        { total: 20000 },
        { total: 40000 },
        { total: 60000 },
      ])
      .mockResolvedValueOnce([
        { total: 15000 },
        { total: 25000 },
      ]);

    const result = await getPeriodComparison(
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    expect(result.currentPeriod.averageOrderValue).toBe(40000); // 120000 / 3
    expect(result.previousPeriod.averageOrderValue).toBe(20000); // 40000 / 2
    expect(result.growth.aovGrowth).toBe(100); // ((40000 - 20000) / 20000) * 100
  });

  it('should filter only COMPLETED orders', async () => {
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await getPeriodComparison(
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    expect(prisma.order.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.order.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: currentStartDate,
          lte: currentEndDate,
        },
      },
      select: {
        total: true,
      },
    });
    expect(prisma.order.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
      select: {
        total: true,
      },
    });
  });

  it('should throw error on database error', async () => {
    vi.mocked(prisma.order.findMany).mockRejectedValue(new Error('Database error'));

    await expect(
      getPeriodComparison(
        currentStartDate,
        currentEndDate,
        previousStartDate,
        previousEndDate
      )
    ).rejects.toThrow('Failed to fetch period comparison');
  });

  it('should handle negative growth correctly', async () => {
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([{ total: 50000 }])
      .mockResolvedValueOnce([{ total: 100000 }]);

    const result = await getPeriodComparison(
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    expect(result.growth.salesGrowth).toBe(-50); // ((50000 - 100000) / 100000) * 100
  });

  it('should handle AOV growth with zero previous AOV', async () => {
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([{ total: 50000 }])
      .mockResolvedValueOnce([]);

    const result = await getPeriodComparison(
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    expect(result.currentPeriod.averageOrderValue).toBe(50000);
    expect(result.previousPeriod.averageOrderValue).toBe(0);
    expect(result.growth.aovGrowth).toBe(100); // Growth from 0
  });
});
