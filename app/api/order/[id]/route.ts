import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get a single order by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate id parameter
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Valid order ID is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            menu: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// PATCH - Update order status and/or notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate id parameter
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Valid order ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, notes } = body;

    // Validate that at least one field is provided
    if (status === undefined && notes === undefined) {
      return NextResponse.json(
        { error: "At least one field (status or notes) must be provided" },
        { status: 400 }
      );
    }

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      // Validate status is a string and is a valid status value
      if (typeof status !== "string") {
        return NextResponse.json(
          { error: "Status must be a string" },
          { status: 400 }
        );
      }

      const validStatuses = ["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }

      updateData.status = status;
    }

    if (notes !== undefined) {
      // Validate notes type
      if (typeof notes !== "string") {
        return NextResponse.json(
          { error: "Notes must be a string" },
          { status: 400 }
        );
      }

      updateData.notes = notes;
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            menu: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
