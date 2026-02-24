import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { checkUnresolvedOrders } from "@/lib/shift-utils";

async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// POST - Close a shift (calculate expected cash and discrepancy)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAuth();
    if (guard) return guard;

    const { id } = await params;

    // Validate id parameter
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Valid shift ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { endingCash, notes } = body;

    // Validate endingCash
    if (endingCash === undefined) {
      return NextResponse.json(
        { error: "Ending cash is required" },
        { status: 400 },
      );
    }

    if (typeof endingCash !== "number" || isNaN(endingCash) || endingCash < 0) {
      return NextResponse.json(
        { error: "Ending cash must be a valid non-negative number" },
        { status: 400 },
      );
    }

    // Validate notes if provided
    if (notes !== undefined && typeof notes !== "string") {
      return NextResponse.json(
        { error: "Notes must be a string" },
        { status: 400 },
      );
    }

    // Check if shift exists
    const existingShift = await prisma.shift.findUnique({
      where: { id },
      include: {
        orders: {
          select: {
            total: true,
            status: true,
          },
        },
      },
    });

    if (!existingShift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    // Check if shift is already closed
    if (existingShift.status === "CLOSED") {
      return NextResponse.json(
        { error: "Shift is already closed" },
        { status: 400 },
      );
    }

    // Check for unresolved orders (not COMPLETED status)
    const unresolvedOrders = await checkUnresolvedOrders(id);
    if (unresolvedOrders.length > 0) {
      const orderList = unresolvedOrders
        .map((o) => `${o.orderNumber} (${o.status})`)
        .join(", ");
      return NextResponse.json(
        {
          error: "Cannot close shift with unresolved orders",
          details: `Orders: ${orderList}`,
        },
        { status: 400 },
      );
    }

    // Calculate total sales from completed orders
    const totalSales = existingShift.orders
      .filter((order) => order.status === "COMPLETED")
      .reduce((sum, order) => sum + order.total, 0);

    // Calculate expected cash
    const expectedCash = existingShift.startingCash + totalSales;

    // Calculate discrepancy
    const discrepancy = endingCash - expectedCash;

    // Build update data object
    const updateData: Record<string, unknown> = {
      status: "CLOSED",
      endingCash,
      expectedCash,
      discrepancy,
      closedAt: new Date(),
    };

    // Only include notes if provided
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update shift with closing information
    const shift = await prisma.shift.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Error closing shift:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to close shift", details: errorMessage },
      { status: 500 },
    );
  }
}
