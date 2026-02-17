import { NextRequest, NextResponse } from "next/server";
import {
  getSalesByHour,
  getTopSellingItems,
  getPaymentDistribution,
  getSalesTrend,
  getPeriodComparison,
} from "@/lib/analytics";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

// GET - Get analytics data for a date range
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

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

    // Validate dates
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate format" },
        { status: 400 }
      );
    }

    if (isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid endDate format" },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: "startDate must be before or equal to endDate" },
        { status: 400 }
      );
    }

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

      // Validate previous period dates
      if (isNaN(prevStart.getTime())) {
        return NextResponse.json(
          { error: "Invalid previousStartDate format" },
          { status: 400 }
        );
      }

      if (isNaN(prevEnd.getTime())) {
        return NextResponse.json(
          { error: "Invalid previousEndDate format" },
          { status: 400 }
        );
      }

      if (prevStart > prevEnd) {
        return NextResponse.json(
          { error: "previousStartDate must be before or equal to previousEndDate" },
          { status: 400 }
        );
      }

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
