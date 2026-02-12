import { NextRequest, NextResponse } from "next/server";
import {
  getSalesByHour,
  getTopSellingItems,
  getPaymentDistribution,
  getSalesTrend,
  getPeriodComparison,
} from "@/lib/analytics";

// GET - Get analytics data for a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const previousStartDate = searchParams.get("previousStartDate");
    const previousEndDate = searchParams.get("previousEndDate");

    // Validate required date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end day

    // Fetch all analytics data in parallel for better performance
    const [
      salesByHour,
      topItems,
      bottomItems,
      paymentDistribution,
      salesTrend,
    ] = await Promise.all([
      getSalesByHour(start, end),
      getTopSellingItems(start, end, 10, "top"),
      getTopSellingItems(start, end, 10, "bottom"),
      getPaymentDistribution(start, end),
      getSalesTrend(start, end),
    ]);

    // Build response object
    const response: Record<string, unknown> = {
      salesByHour,
      topItems,
      bottomItems,
      paymentDistribution,
      salesTrend,
    };

    // Add period comparison if previous period dates are provided
    if (previousStartDate && previousEndDate) {
      const prevStart = new Date(previousStartDate);
      const prevEnd = new Date(previousEndDate);
      prevEnd.setHours(23, 59, 59, 999);

      const periodComparison = await getPeriodComparison(
        start,
        end,
        prevStart,
        prevEnd
      );

      response.periodComparison = periodComparison;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
