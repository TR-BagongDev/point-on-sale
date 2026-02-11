import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Generate order number
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${dateStr}-${timeStr}-${random}`;
}

// GET - Get all orders or filter by date/status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.createdAt = {
        gte: startDate,
        lt: endDate,
      };
    }

    if (userId) {
      where.userId = userId;
    }

    const orders = await prisma.order.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      notes,
    } = body;

    // Get or create default user for orders
    let user = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!user) {
      // Create a default cashier if no user exists
      user = await prisma.user.create({
        data: {
          name: "Kasir Default",
          email: "kasir@warung.com",
          password: "$2a$10$dummy", // Not used for login
          role: "KASIR",
        },
      });
    }

    const orderNumber = generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        subtotal: parseFloat(subtotal),
        tax: parseFloat(tax ?? 0),
        discount: parseFloat(discount ?? 0),
        total: parseFloat(total),
        paymentMethod: paymentMethod ?? "CASH",
        status: "COMPLETED",
        notes,
        items: {
          create: items.map(
            (item: { menuId: string; quantity: number; price: number; notes?: string }) => ({
              menuId: item.menuId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
            })
          ),
        },
      },
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

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

// PUT - Update order status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes } = body;

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        notes,
      },
      include: {
        items: {
          include: {
            menu: true,
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
