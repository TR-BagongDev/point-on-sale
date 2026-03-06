import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createOrderSchema } from "@/lib/validation";
import { createValidationError, handleApiError } from "@/lib/error-handler";

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

// POST - Sync multiple orders (batch synchronization for offline orders)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;
    const { session } = authResult;

    const body = await request.json();
    const { orders } = body;

    // Validate orders array
    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: "Orders must be an array" },
        { status: 400 }
      );
    }

    // Handle empty orders array (valid but nothing to sync)
    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        synced: [],
        failed: [],
        message: "No orders to sync"
      });
    }

    const syncedOrders: unknown[] = [];
    const failedOrders: { order: unknown; error: string }[] = [];
    const skippedOrders: { order: unknown; reason: string }[] = [];

    // Process each order
    for (const orderData of orders) {
      try {
        const {
          orderNumber,
          createdAt,
          updatedAt,
          ...orderFields
        } = orderData;

        // Validate with Zod schema
        const parsed = createOrderSchema.safeParse(orderFields);
        if (!parsed.success) {
          failedOrders.push({
            order: orderData,
            error: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")
          });
          continue;
        }

        const { items, subtotal, tax, discount, total, paymentMethod, notes } = parsed.data;

        // Check if all menu items exist and are available
        const menuIds = items.map((item) => item.menuId);
        const menuItems = await prisma.menu.findMany({
          where: { id: { in: menuIds } },
        });

        if (menuItems.length !== menuIds.length) {
          const foundIds = new Set(menuItems.map((m) => m.id));
          const missingIds = menuIds.filter((id) => !foundIds.has(id));
          failedOrders.push({
            order: orderData,
            error: `Menu items not found: ${missingIds.join(", ")}`
          });
          continue;
        }

        // Check if all menu items are available
        const unavailableItems = menuItems.filter((m) => !m.isAvailable);
        if (unavailableItems.length > 0) {
          failedOrders.push({
            order: orderData,
            error: `Some menu items are not available: ${unavailableItems.map((m) => m.name).join(", ")}`
          });
          continue;
        }

        // Generate order number if not provided
        const finalOrderNumber = orderNumber || generateOrderNumber();

        // Check for existing order (conflict detection)
        const existingOrder = await prisma.order.findUnique({
          where: { orderNumber: finalOrderNumber },
        });

        // Conflict resolution: if order exists, use last-write-wins based on updatedAt
        if (existingOrder) {
          const existingTimestamp = existingOrder.updatedAt.getTime();
          const incomingTimestamp = updatedAt ? new Date(updatedAt).getTime() : (createdAt ? new Date(createdAt).getTime() : Date.now());

          // Skip if existing order is newer or same age (keep existing)
          if (existingTimestamp >= incomingTimestamp) {
            skippedOrders.push({
              order: orderData,
              reason: `Existing order is newer or same version (existing: ${existingOrder.updatedAt.toISOString()}, incoming: ${new Date(incomingTimestamp).toISOString()})`
            });
            continue;
          }

          // Update existing order if incoming is newer
          // Delete existing items and recreate them
          await prisma.orderItem.deleteMany({
            where: { orderId: existingOrder.id },
          });

          const updatedOrder = await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              subtotal,
              tax: tax ?? 0,
              discount: discount ?? 0,
              total,
              paymentMethod: paymentMethod ?? existingOrder.paymentMethod,
              status: existingOrder.status, // Preserve status
              notes: notes?.trim() || existingOrder.notes,
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

          syncedOrders.push({
            ...updatedOrder,
            conflictResolved: true,
            resolution: "updated",
            previousVersion: {
              updatedAt: existingOrder.updatedAt,
            },
          });
          continue;
        }

        // Create new order if no conflict
        const order = await prisma.order.create({
          data: {
            orderNumber: finalOrderNumber,
            userId: session.user.id,
            subtotal,
            tax: tax ?? 0,
            discount: discount ?? 0,
            total,
            paymentMethod: paymentMethod ?? "CASH",
            status: "PENDING",
            notes: notes?.trim() || null,
            // Preserve original createdAt if provided (for offline orders)
            createdAt: createdAt ? new Date(createdAt) : undefined,
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

        syncedOrders.push(order);
      } catch (error) {
        // Log error for this specific order and continue with next order
        console.error("Error syncing order:", error);
        failedOrders.push({
          order: orderData,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Return sync results
    return NextResponse.json({
      success: true,
      synced: syncedOrders,
      failed: failedOrders,
      skipped: skippedOrders,
      total: orders.length,
      syncedCount: syncedOrders.length,
      failedCount: failedOrders.length,
      skippedCount: skippedOrders.length,
    });
  } catch (error) {
    console.error("Error in sync endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to sync orders",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
