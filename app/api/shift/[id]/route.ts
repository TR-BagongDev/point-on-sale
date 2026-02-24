import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get a single shift by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Validate id parameter
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Valid shift ID is required" },
        { status: 400 },
      );
    }

    const shift = await prisma.shift.findUnique({
      where: { id },
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

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Error fetching shift:", error);
    return NextResponse.json(
      { error: "Failed to fetch shift" },
      { status: 500 },
    );
  }
}

// PUT - Update shift (status, endingCash, expectedCash, discrepancy, notes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Validate id parameter
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Valid shift ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { status, endingCash, expectedCash, discrepancy, notes } = body;

    // Validate that at least one field is provided
    if (
      status === undefined &&
      endingCash === undefined &&
      expectedCash === undefined &&
      discrepancy === undefined &&
      notes === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "At least one field (status, endingCash, expectedCash, discrepancy, or notes) must be provided",
        },
        { status: 400 },
      );
    }

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      // Validate status is a string and is a valid status value
      if (typeof status !== "string") {
        return NextResponse.json(
          { error: "Status must be a string" },
          { status: 400 },
        );
      }

      const validStatuses = ["OPEN", "CLOSED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          },
          { status: 400 },
        );
      }

      updateData.status = status;

      // Automatically set closedAt when closing a shift
      if (status === "CLOSED") {
        updateData.closedAt = new Date();
      }
    }

    if (endingCash !== undefined) {
      // Validate endingCash is a number and non-negative
      if (
        typeof endingCash !== "number" ||
        isNaN(endingCash) ||
        endingCash < 0
      ) {
        return NextResponse.json(
          { error: "Ending cash must be a valid non-negative number" },
          { status: 400 },
        );
      }

      updateData.endingCash = endingCash;
    }

    if (expectedCash !== undefined) {
      // Validate expectedCash is a number and non-negative
      if (
        typeof expectedCash !== "number" ||
        isNaN(expectedCash) ||
        expectedCash < 0
      ) {
        return NextResponse.json(
          { error: "Expected cash must be a valid non-negative number" },
          { status: 400 },
        );
      }

      updateData.expectedCash = expectedCash;
    }

    if (discrepancy !== undefined) {
      // Validate discrepancy is a number (can be negative)
      if (typeof discrepancy !== "number" || isNaN(discrepancy)) {
        return NextResponse.json(
          { error: "Discrepancy must be a valid number" },
          { status: 400 },
        );
      }

      updateData.discrepancy = discrepancy;
    }

    if (notes !== undefined) {
      // Validate notes type
      if (typeof notes !== "string") {
        return NextResponse.json(
          { error: "Notes must be a string" },
          { status: 400 },
        );
      }

      updateData.notes = notes;
    }

    // Check if shift exists
    const existingShift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!existingShift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

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
    console.error("Error updating shift:", error);
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 },
    );
  }
}
