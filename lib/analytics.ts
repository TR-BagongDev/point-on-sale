import prisma from "@/lib/prisma";

export interface SalesByHourData {
  hour: number;
  total: number;
  orderCount: number;
}

export interface ItemSalesData {
  menuId: string;
  menuName: string;
  quantity: number;
  revenue: number;
}

export interface PaymentDistributionData {
  paymentMethod: string;
  total: number;
  percentage: number;
  orderCount: number;
}

export interface SalesTrendData {
  date: string;
  total: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface PeriodComparisonData {
  currentPeriod: {
    totalSales: number;
    orderCount: number;
    averageOrderValue: number;
  };
  previousPeriod: {
    totalSales: number;
    orderCount: number;
    averageOrderValue: number;
  };
  growth: {
    salesGrowth: number;
    orderCountGrowth: number;
    aovGrowth: number;
  };
}

/**
 * Get sales aggregated by hour of day (0-23)
 */
export async function getSalesByHour(
  startDate: Date,
  endDate: Date
): Promise<SalesByHourData[]> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    const hourlyData: Record<number, { total: number; orderCount: number }> = {};

    // Initialize all hours with 0
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { total: 0, orderCount: 0 };
    }

    // Aggregate by hour
    orders.forEach((order) => {
      const hour = order.createdAt.getHours();
      hourlyData[hour].total += order.total;
      hourlyData[hour].orderCount += 1;
    });

    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      ...data,
    }));
  } catch (error) {
    console.error("Error fetching sales by hour:", error);
    throw new Error("Failed to fetch sales by hour");
  }
}

/**
 * Get top or worst selling items
 */
export async function getTopSellingItems(
  startDate: Date,
  endDate: Date,
  limit: number = 10,
  order: "top" | "bottom" = "top"
): Promise<ItemSalesData[]> {
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
            lte: endDate,
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

    const itemMap = new Map<string, ItemSalesData>();

    orderItems.forEach((item) => {
      const existing = itemMap.get(item.menuId);
      const quantity = item.quantity;
      const revenue = quantity * item.price;

      if (existing) {
        existing.quantity += quantity;
        existing.revenue += revenue;
      } else {
        itemMap.set(item.menuId, {
          menuId: item.menuId,
          menuName: item.menu.name,
          quantity,
          revenue,
        });
      }
    });

    let items = Array.from(itemMap.values());

    // Sort by revenue descending
    items.sort((a, b) => b.revenue - a.revenue);

    if (order === "bottom") {
      items = items.reverse();
    }

    return items.slice(0, limit);
  } catch (error) {
    console.error("Error fetching top selling items:", error);
    throw new Error("Failed to fetch top selling items");
  }
}

/**
 * Get payment method distribution
 */
export async function getPaymentDistribution(
  startDate: Date,
  endDate: Date
): Promise<PaymentDistributionData[]> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        paymentMethod: true,
        total: true,
      },
    });

    const paymentMap = new Map<string, { total: number; orderCount: number }>();
    let grandTotal = 0;

    orders.forEach((order) => {
      const existing = paymentMap.get(order.paymentMethod);
      if (existing) {
        existing.total += order.total;
        existing.orderCount += 1;
      } else {
        paymentMap.set(order.paymentMethod, {
          total: order.total,
          orderCount: 1,
        });
      }
      grandTotal += order.total;
    });

    return Array.from(paymentMap.entries()).map(([paymentMethod, data]) => ({
      paymentMethod,
      total: data.total,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      orderCount: data.orderCount,
    }));
  } catch (error) {
    console.error("Error fetching payment distribution:", error);
    throw new Error("Failed to fetch payment distribution");
  }
}

/**
 * Get sales trend over time
 */
export async function getSalesTrend(
  startDate: Date,
  endDate: Date
): Promise<SalesTrendData[]> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const trendMap = new Map<string, { total: number; orderCount: number }>();

    orders.forEach((order) => {
      const dateStr = order.createdAt.toISOString().slice(0, 10);
      const existing = trendMap.get(dateStr);

      if (existing) {
        existing.total += order.total;
        existing.orderCount += 1;
      } else {
        trendMap.set(dateStr, {
          total: order.total,
          orderCount: 1,
        });
      }
    });

    // Fill in missing dates with 0
    const currentDate = new Date(startDate);
    const endDateOnly = new Date(endDate);
    endDateOnly.setHours(23, 59, 59, 999);

    while (currentDate <= endDateOnly) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      if (!trendMap.has(dateStr)) {
        trendMap.set(dateStr, { total: 0, orderCount: 0 });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        total: data.total,
        orderCount: data.orderCount,
        averageOrderValue: data.orderCount > 0 ? data.total / data.orderCount : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error fetching sales trend:", error);
    throw new Error("Failed to fetch sales trend");
  }
}

/**
 * Get period comparison data
 */
export async function getPeriodComparison(
  startDate: Date,
  endDate: Date,
  previousStartDate: Date,
  previousEndDate: Date
): Promise<PeriodComparisonData> {
  try {
    const getCurrentMetrics = async (start: Date, end: Date) => {
      const orders = await prisma.order.findMany({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          total: true,
        },
      });

      const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
      const orderCount = orders.length;
      const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

      return { totalSales, orderCount, averageOrderValue };
    };

    const currentPeriod = await getCurrentMetrics(startDate, endDate);
    const previousPeriod = await getCurrentMetrics(
      previousStartDate,
      previousEndDate
    );

    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const growth = {
      salesGrowth: calculateGrowth(
        currentPeriod.totalSales,
        previousPeriod.totalSales
      ),
      orderCountGrowth: calculateGrowth(
        currentPeriod.orderCount,
        previousPeriod.orderCount
      ),
      aovGrowth: calculateGrowth(
        currentPeriod.averageOrderValue,
        previousPeriod.averageOrderValue
      ),
    };

    return {
      currentPeriod,
      previousPeriod,
      growth,
    };
  } catch (error) {
    console.error("Error fetching period comparison:", error);
    throw new Error("Failed to fetch period comparison");
  }
}
