import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createOrderSchema, patchOrderSchema } from "@/lib/validation";
import { handleApiError, createValidationError } from "@/lib/error-handler";

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

// GET - Get all orders or filter by date/status (with pagination)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

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

    const [orders, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          shift: {
            select: {
              id: true,
              status: true,
              openedAt: true,
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
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
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
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;
    const { session } = authResult;

    const body = await request.json();

    // Validate input with Zod schema
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return handleApiError(createValidationError(parsed.error), "Create order");
    }

    const { items, subtotal, tax, discount, total, paymentMethod, notes } = parsed.data;

    // Check if all menu items exist and are available
    const menuIds = items.map((item) => item.menuId);
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

    // Find active shift for the current user
    let shiftId: string | undefined;
    const activeShift = await prisma.shift.findFirst({
      where: {
        userId: session.user.id,
        status: "OPEN",
      },
      select: {
        id: true,
      },
    });

    if (activeShift) {
      shiftId = activeShift.id;
    }

    const orderNumber = generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        subtotal,
        tax: tax ?? 0,
        discount: discount ?? 0,
        total,
        paymentMethod: paymentMethod ?? "CASH",
        status: "PENDING",
        notes: notes?.trim() || null,
        shiftId: shiftId,
        items: {
          create: items.map((item) => ({
            menuId: item.menuId,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes?.trim() || null,
          })),
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
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const { id, ...updateFields } = body;

    // Validate required id
    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Validate update fields with Zod
    const parsed = patchOrderSchema.safeParse(updateFields);
    if (!parsed.success) {
      return handleApiError(createValidationError(parsed.error), "Update order");
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
      data: {
        ...parsed.data,
        notes: parsed.data.notes?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shift: {
          select: {
            id: true,
            status: true,
            openedAt: true,
          },
        },
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
