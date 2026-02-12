import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get modification history for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Verify the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Fetch modification history
    const modifications = await prisma.orderModification.findMany({
      where: {
        orderId: orderId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(modifications);
  } catch (error) {
    console.error("Error fetching modification history:", error);
    return NextResponse.json(
      { error: "Failed to fetch modification history" },
      { status: 500 }
    );
  }
}
