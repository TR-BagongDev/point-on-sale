import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateShiftSales,
  calculateExpectedCash,
  calculateDiscrepancy,
  calculateShiftClosing,
  checkUnresolvedOrders,
  calculateShiftDuration,
  type ShiftOrderSummary,
} from "../shift-utils";

// Mock Prisma client
vi.mock("@/lib/prisma", () => ({
  default: {
    order: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";

describe("calculateShiftSales", () => {
  const mockShiftId = "shift-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate total sales from completed orders", async () => {
    const mockOrders = [
      { total: 50000, paymentMethod: "CASH" },
      { total: 75000, paymentMethod: "CASH" },
      { total: 100000, paymentMethod: "CARD" },
      { total: 25000, paymentMethod: "QRIS" },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await calculateShiftSales(mockShiftId);

    expect(result.totalSales).toBe(250000); // Sum of all
    expect(result.orderCount).toBe(4);
    expect(result.cashSales).toBe(125000); // CASH payments only
    expect(result.nonCashSales).toBe(125000); // CARD + QRIS
  });

  it("should return zero values for shift with no orders", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const result = await calculateShiftSales(mockShiftId);

    expect(result.totalSales).toBe(0);
    expect(result.orderCount).toBe(0);
    expect(result.cashSales).toBe(0);
    expect(result.nonCashSales).toBe(0);
  });

  it("should handle shift with only cash sales", async () => {
    const mockOrders = [
      { total: 50000, paymentMethod: "CASH" },
      { total: 30000, paymentMethod: "CASH" },
      { total: 20000, paymentMethod: "CASH" },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await calculateShiftSales(mockShiftId);

    expect(result.totalSales).toBe(100000);
    expect(result.cashSales).toBe(100000);
    expect(result.nonCashSales).toBe(0);
  });

  it("should handle shift with only non-cash sales", async () => {
    const mockOrders = [
      { total: 50000, paymentMethod: "CARD" },
      { total: 30000, paymentMethod: "QRIS" },
      { total: 20000, paymentMethod: "TRANSFER" },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await calculateShiftSales(mockShiftId);

    expect(result.totalSales).toBe(100000);
    expect(result.cashSales).toBe(0);
    expect(result.nonCashSales).toBe(100000);
  });

  it("should filter only COMPLETED orders", async () => {
    await calculateShiftSales(mockShiftId);

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        shiftId: mockShiftId,
        status: "COMPLETED",
      },
      select: {
        total: true,
        paymentMethod: true,
      },
    });
  });

  it("should throw error on database error", async () => {
    vi.mocked(prisma.order.findMany).mockRejectedValue(
      new Error("Database error")
    );

    await expect(calculateShiftSales(mockShiftId)).rejects.toThrow(
      "Failed to calculate shift sales"
    );
  });

  it("should handle TRANSFER payment method correctly", async () => {
    const mockOrders = [
      { total: 50000, paymentMethod: "TRANSFER" },
      { total: 30000, paymentMethod: "CASH" },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await calculateShiftSales(mockShiftId);

    expect(result.totalSales).toBe(80000);
    expect(result.cashSales).toBe(30000);
    expect(result.nonCashSales).toBe(50000);
  });
});

describe("calculateExpectedCash", () => {
  it("should calculate expected cash correctly", () => {
    const result = calculateExpectedCash(500000, 750000);
    expect(result).toBe(1250000);
  });

  it("should handle zero starting cash", () => {
    const result = calculateExpectedCash(0, 500000);
    expect(result).toBe(500000);
  });

  it("should handle zero cash sales", () => {
    const result = calculateExpectedCash(500000, 0);
    expect(result).toBe(500000);
  });

  it("should handle both zero values", () => {
    const result = calculateExpectedCash(0, 0);
    expect(result).toBe(0);
  });

  it("should handle large amounts", () => {
    const result = calculateExpectedCash(10000000, 25000000);
    expect(result).toBe(35000000);
  });

  it("should handle decimal amounts", () => {
    const result = calculateExpectedCash(500000.5, 750000.25);
    expect(result).toBe(1250000.75);
  });
});

describe("calculateDiscrepancy", () => {
  it("should calculate positive discrepancy (excess cash)", () => {
    const result = calculateDiscrepancy(1300000, 1250000);
    expect(result).toBe(50000);
  });

  it("should calculate negative discrepancy (shortage)", () => {
    const result = calculateDiscrepancy(1200000, 1250000);
    expect(result).toBe(-50000);
  });

  it("should return zero when cash matches expected", () => {
    const result = calculateDiscrepancy(1250000, 1250000);
    expect(result).toBe(0);
  });

  it("should handle zero actual cash", () => {
    const result = calculateDiscrepancy(0, 500000);
    expect(result).toBe(-500000);
  });

  it("should handle zero expected cash", () => {
    const result = calculateDiscrepancy(500000, 0);
    expect(result).toBe(500000);
  });

  it("should handle both zero values", () => {
    const result = calculateDiscrepancy(0, 0);
    expect(result).toBe(0);
  });
});

describe("calculateShiftClosing", () => {
  const mockShiftId = "shift-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate complete shift closing summary", async () => {
    const mockOrders = [
      { total: 50000, paymentMethod: "CASH" },
      { total: 75000, paymentMethod: "CASH" },
      { total: 100000, paymentMethod: "CARD" },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await calculateShiftClosing(mockShiftId, 500000, 1325000);

    expect(result.sales.totalSales).toBe(225000);
    expect(result.sales.orderCount).toBe(3);
    expect(result.sales.cashSales).toBe(125000);
    expect(result.sales.nonCashSales).toBe(100000);
    expect(result.expectedCash).toBe(625000); // 500000 + 125000
    expect(result.discrepancy).toBe(700000); // 1325000 - 625000
  });

  it("should handle shift with no sales", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const result = await calculateShiftClosing(mockShiftId, 500000, 500000);

    expect(result.sales.totalSales).toBe(0);
    expect(result.sales.orderCount).toBe(0);
    expect(result.expectedCash).toBe(500000);
    expect(result.discrepancy).toBe(0);
  });

  it("should calculate shortage correctly", async () => {
    const mockOrders = [
      { total: 100000, paymentMethod: "CASH" },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await calculateShiftClosing(mockShiftId, 500000, 580000);

    expect(result.expectedCash).toBe(600000); // 500000 + 100000
    expect(result.discrepancy).toBe(-20000); // 580000 - 600000
  });

  it("should only include cash sales in expected cash calculation", async () => {
    const mockOrders = [
      { total: 100000, paymentMethod: "CASH" },
      { total: 200000, paymentMethod: "CARD" },
      { total: 150000, paymentMethod: "QRIS" },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await calculateShiftClosing(mockShiftId, 500000, 610000);

    expect(result.sales.cashSales).toBe(100000);
    expect(result.sales.nonCashSales).toBe(350000); // 200000 + 150000
    expect(result.expectedCash).toBe(600000); // 500000 + 100000 (only cash)
    expect(result.discrepancy).toBe(10000);
  });
});

describe("checkUnresolvedOrders", () => {
  const mockShiftId = "shift-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return array of unresolved orders", async () => {
    const mockUnresolvedOrders = [
      {
        id: "order-1",
        orderNumber: "ORD-001",
        status: "PENDING",
      },
      {
        id: "order-2",
        orderNumber: "ORD-002",
        status: "PROCESSING",
      },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockUnresolvedOrders);

    const result = await checkUnresolvedOrders(mockShiftId);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("order-1");
    expect(result[0].orderNumber).toBe("ORD-001");
    expect(result[0].status).toBe("PENDING");
  });

  it("should return empty array when all orders are completed", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const result = await checkUnresolvedOrders(mockShiftId);

    expect(result).toEqual([]);
  });

  it("should filter out COMPLETED orders", async () => {
    await checkUnresolvedOrders(mockShiftId);

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        shiftId: mockShiftId,
        status: {
          not: "COMPLETED",
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
      },
    });
  });

  it("should throw error on database error", async () => {
    vi.mocked(prisma.order.findMany).mockRejectedValue(
      new Error("Database error")
    );

    await expect(checkUnresolvedOrders(mockShiftId)).rejects.toThrow(
      "Failed to check unresolved orders"
    );
  });

  it("should handle various non-completed statuses", async () => {
    const mockOrders = [
      { id: "order-1", orderNumber: "ORD-001", status: "PENDING" },
      { id: "order-2", orderNumber: "ORD-002", status: "PROCESSING" },
      { id: "order-3", orderNumber: "ORD-003", status: "CANCELLED" },
    ];

    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders);

    const result = await checkUnresolvedOrders(mockShiftId);

    expect(result).toHaveLength(3);
    expect(result.some((o) => o.status === "PENDING")).toBe(true);
    expect(result.some((o) => o.status === "PROCESSING")).toBe(true);
    expect(result.some((o) => o.status === "CANCELLED")).toBe(true);
  });
});

describe("calculateShiftDuration", () => {
  it("should calculate duration in hours and minutes", () => {
    const openedAt = new Date("2026-01-01T08:00:00");
    const closedAt = new Date("2026-01-01T16:30:00");

    const result = calculateShiftDuration(openedAt, closedAt);

    expect(result.hours).toBe(8);
    expect(result.minutes).toBe(30);
    expect(result.totalMinutes).toBe(510);
  });

  it("should calculate duration for less than an hour", () => {
    const openedAt = new Date("2026-01-01T08:00:00");
    const closedAt = new Date("2026-01-01T08:45:00");

    const result = calculateShiftDuration(openedAt, closedAt);

    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(45);
    expect(result.totalMinutes).toBe(45);
  });

  it("should handle exact hours", () => {
    const openedAt = new Date("2026-01-01T08:00:00");
    const closedAt = new Date("2026-01-01T16:00:00");

    const result = calculateShiftDuration(openedAt, closedAt);

    expect(result.hours).toBe(8);
    expect(result.minutes).toBe(0);
    expect(result.totalMinutes).toBe(480);
  });

  it("should calculate duration for active shift (closedAt is null)", () => {
    const openedAt = new Date("2026-01-01T08:00:00");
    const closedAt = null;

    const result = calculateShiftDuration(openedAt, closedAt);

    // Should calculate from opening to now
    expect(result.totalMinutes).toBeGreaterThanOrEqual(0);
    expect(result.hours).toBeGreaterThanOrEqual(0);
  });

  it("should handle duration across multiple days", () => {
    const openedAt = new Date("2026-01-01T20:00:00");
    const closedAt = new Date("2026-01-02T04:30:00");

    const result = calculateShiftDuration(openedAt, closedAt);

    expect(result.hours).toBe(8);
    expect(result.minutes).toBe(30);
    expect(result.totalMinutes).toBe(510);
  });

  it("should handle zero duration", () => {
    const openedAt = new Date("2026-01-01T08:00:00");
    const closedAt = new Date("2026-01-01T08:00:00");

    const result = calculateShiftDuration(openedAt, closedAt);

    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.totalMinutes).toBe(0);
  });

  it("should handle very long shifts", () => {
    const openedAt = new Date("2026-01-01T08:00:00");
    const closedAt = new Date("2026-01-03T08:00:00");

    const result = calculateShiftDuration(openedAt, closedAt);

    expect(result.hours).toBe(48);
    expect(result.minutes).toBe(0);
    expect(result.totalMinutes).toBe(2880);
  });
});
