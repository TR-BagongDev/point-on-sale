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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    // Support both single date and date range
    if (startDate && endDate) {
      // Date range query
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // Include the entire end date
      where.createdAt = {
        gte: start,
        lt: end,
      };
    } else if (date) {
      // Single date query (legacy support)
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.createdAt = {
        gte: start,
        lt: end,
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

    // Validate items array
    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items must be an array" },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Validate each item and parse prices
    for (const item of items) {
      if (!item.menuId || typeof item.menuId !== "string") {
        return NextResponse.json(
          { error: "Each item must have a valid menuId" },
          { status: 400 }
        );
      }

      if (!item.quantity || typeof item.quantity !== "number" || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Each item must have a valid positive quantity" },
          { status: 400 }
        );
      }

      if (item.price === undefined || item.price === null || item.price === "") {
        return NextResponse.json(
          { error: "Each item must have a price" },
          { status: 400 }
        );
      }

      const parsedPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { error: "Item price must be a valid positive number" },
          { status: 400 }
        );
      }

      // Store the parsed price back to the item
      (item as { price: number }).price = parsedPrice;
    }

    // Check if all menu items exist and are available
    const menuIds = items.map((item: { menuId: string }) => item.menuId);
    const menuItems = await prisma.menu.findMany({
      where: { id: { in: menuIds } },
    });

    if (menuItems.length !== menuIds.length) {
      const foundIds = new Set(menuItems.map((m) => m.id));
      const missingIds = menuIds.filter((id: string) => !foundIds.has(id));
      return NextResponse.json(
        { error: `Menu items not found: ${missingIds.join(", ")}` },
        { status: 404 }
      );
    }

    // Check if all menu items are available
    const unavailableItems = menuItems.filter((m) => !m.isAvailable);
    if (unavailableItems.length > 0) {
      return NextResponse.json(
        { error: `Some menu items are not available: ${unavailableItems.map((m) => m.name).join(", ")}` },
        { status: 400 }
      );
    }

    // Validate subtotal
    if (subtotal === undefined || subtotal === null || subtotal === "") {
      return NextResponse.json(
        { error: "Subtotal is required" },
        { status: 400 }
      );
    }

    const parsedSubtotal = parseFloat(subtotal);
    if (isNaN(parsedSubtotal) || parsedSubtotal < 0) {
      return NextResponse.json(
        { error: "Subtotal must be a valid positive number" },
        { status: 400 }
      );
    }

    // Validate tax if provided
    let parsedTax = 0;
    if (tax !== undefined && tax !== null && tax !== "") {
      parsedTax = parseFloat(tax);
      if (isNaN(parsedTax) || parsedTax < 0) {
        return NextResponse.json(
          { error: "Tax must be a valid positive number" },
          { status: 400 }
        );
      }
    }

    // Validate discount if provided
    let parsedDiscount = 0;
    if (discount !== undefined && discount !== null && discount !== "") {
      parsedDiscount = parseFloat(discount);
      if (isNaN(parsedDiscount) || parsedDiscount < 0) {
        return NextResponse.json(
          { error: "Discount must be a valid positive number" },
          { status: 400 }
        );
      }
    }

    // Validate total
    if (total === undefined || total === null || total === "") {
      return NextResponse.json(
        { error: "Total is required" },
        { status: 400 }
      );
    }

    const parsedTotal = parseFloat(total);
    if (isNaN(parsedTotal) || parsedTotal < 0) {
      return NextResponse.json(
        { error: "Total must be a valid positive number" },
        { status: 400 }
      );
    }

    // Validate payment method if provided
    const validPaymentMethods = ["CASH", "CARD", "QRIS", "TRANSFER"];
    if (paymentMethod !== undefined && paymentMethod !== null) {
      if (typeof paymentMethod !== "string" || !validPaymentMethods.includes(paymentMethod)) {
        return NextResponse.json(
          { error: `Payment method must be one of: ${validPaymentMethods.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate notes if provided
    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return NextResponse.json(
        { error: "Notes must be a string" },
        { status: 400 }
      );
    }

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
        subtotal: parsedSubtotal,
        tax: parsedTax,
        discount: parsedDiscount,
        total: parsedTotal,
        paymentMethod: paymentMethod ?? "CASH",
        status: "PENDING",
        notes: notes?.trim() || null,
        items: {
          create: items.map(
            (item: { menuId: string; quantity: number; price: number; notes?: string }) => ({
              menuId: item.menuId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes?.trim() || null,
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

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
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

    // Validate status if provided
    const validStatuses = ["PENDING", "PROCESSING", "READY", "COMPLETED", "CANCELLED"];
    if (status !== undefined && status !== null && status !== "") {
      if (typeof status !== "string" || !validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate notes if provided
    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return NextResponse.json(
        { error: "Notes must be a string" },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        notes: notes?.trim() || null,
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
