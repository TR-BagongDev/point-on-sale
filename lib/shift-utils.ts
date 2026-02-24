import prisma from "@/lib/prisma";

export interface ShiftOrderSummary {
  totalSales: number;
  orderCount: number;
  cashSales: number;
  nonCashSales: number;
}

export interface ShiftCalculation {
  expectedCash: number;
  discrepancy: number;
}

/**
 * Calculate total sales from shift's completed orders
 * @param shiftId - The ID of the shift
 * @returns Summary of sales including total, count, cash and non-cash sales
 * @example
 * const summary = await calculateShiftSales('shift-123');
 * // { totalSales: 500000, orderCount: 5, cashSales: 300000, nonCashSales: 200000 }
 */
export async function calculateShiftSales(
  shiftId: string
): Promise<ShiftOrderSummary> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        shiftId,
        status: "COMPLETED",
      },
      select: {
        total: true,
        paymentMethod: true,
      },
    });

    const summary: ShiftOrderSummary = {
      totalSales: 0,
      orderCount: orders.length,
      cashSales: 0,
      nonCashSales: 0,
    };

    orders.forEach((order) => {
      summary.totalSales += order.total;

      if (order.paymentMethod === "CASH") {
        summary.cashSales += order.total;
      } else {
        summary.nonCashSales += order.total;
      }
    });

    return summary;
  } catch (error) {
    console.error("Error calculating shift sales:", error);
    throw new Error("Failed to calculate shift sales");
  }
}

/**
 * Calculate expected cash for shift closing
 * Expected cash = starting cash + cash sales
 * @param startingCash - The starting cash amount when shift opened
 * @param cashSales - Total cash sales during the shift
 * @returns Expected cash amount
 * @example
 * const expected = calculateExpectedCash(500000, 750000);
 * // Returns: 1250000
 */
export function calculateExpectedCash(
  startingCash: number,
  cashSales: number
): number {
  return startingCash + cashSales;
}

/**
 * Calculate cash discrepancy for shift closing
 * Discrepancy = actual cash - expected cash
 * Positive values mean excess cash, negative values mean shortage
 * @param actualCash - The actual cash counted at closing
 * @param expectedCash - The expected cash amount
 * @returns Discrepancy amount (can be negative for shortage)
 * @example
 * const discrepancy = calculateDiscrepancy(1300000, 1250000);
 * // Returns: 50000 (excess)
 *
 * const shortage = calculateDiscrepancy(1200000, 1250000);
 * // Returns: -50000 (shortage)
 */
export function calculateDiscrepancy(
  actualCash: number,
  expectedCash: number
): number {
  return actualCash - expectedCash;
}

/**
 * Calculate complete shift summary for closing
 * Combines sales calculation with expected cash and discrepancy
 * @param shiftId - The ID of the shift
 * @param startingCash - The starting cash amount
 * @param endingCash - The ending cash amount counted
 * @returns Complete calculation including expected cash and discrepancy
 * @example
 * const result = await calculateShiftClosing('shift-123', 500000, 1300000);
 * // {
 * //   sales: { totalSales: 800000, orderCount: 8, cashSales: 750000, nonCashSales: 50000 },
 * //   expectedCash: 1250000,
 * //   discrepancy: 50000
 * // }
 */
export async function calculateShiftClosing(
  shiftId: string,
  startingCash: number,
  endingCash: number
): Promise<{
  sales: ShiftOrderSummary;
  expectedCash: number;
  discrepancy: number;
}> {
  const sales = await calculateShiftSales(shiftId);
  const expectedCash = calculateExpectedCash(startingCash, sales.cashSales);
  const discrepancy = calculateDiscrepancy(endingCash, expectedCash);

  return {
    sales,
    expectedCash,
    discrepancy,
  };
}

/**
 * Check if shift has unresolved orders (not COMPLETED)
 * @param shiftId - The ID of the shift
 * @returns Array of unresolved orders with basic info
 * @example
 * const unresolved = await checkUnresolvedOrders('shift-123');
 * // Returns [] if no unresolved orders
 * // Returns [{ id: 'order-1', orderNumber: 'ORD-001', status: 'PENDING' }] if found
 */
export async function checkUnresolvedOrders(
  shiftId: string
): Promise<Array<{ id: string; orderNumber: string; status: string }>> {
  try {
    const unresolvedOrders = await prisma.order.findMany({
      where: {
        shiftId,
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

    return unresolvedOrders;
  } catch (error) {
    console.error("Error checking unresolved orders:", error);
    throw new Error("Failed to check unresolved orders");
  }
}

/**
 * Calculate shift duration in hours and minutes
 * @param openedAt - Shift opening timestamp
 * @param closedAt - Shift closing timestamp (null for active shifts)
 * @returns Duration object with hours and minutes
 * @example
 * const duration = calculateShiftDuration(
 *   new Date('2026-01-01T08:00:00'),
 *   new Date('2026-01-01T16:30:00')
 * );
 * // { hours: 8, minutes: 30, totalMinutes: 510 }
 */
export function calculateShiftDuration(
  openedAt: Date,
  closedAt: Date | null
): { hours: number; minutes: number; totalMinutes: number } {
  const end = closedAt ? new Date(closedAt) : new Date();
  const start = new Date(openedAt);

  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
  };
}
