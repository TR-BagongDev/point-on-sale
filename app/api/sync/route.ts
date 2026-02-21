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

// POST - Sync multiple orders (batch synchronization for offline orders)
export async function POST(request: NextRequest) {
  try {
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

    const syncedOrders: unknown[] = [];
    const failedOrders: { order: unknown; error: string }[] = [];

    // Process each order
    for (const orderData of orders) {
      try {
        const {
          items,
          subtotal,
          tax,
          discount,
          total,
          paymentMethod,
          notes,
          createdAt,
        } = orderData;

        // Validate items array
        if (!items || !Array.isArray(items)) {
          failedOrders.push({
            order: orderData,
            error: "Items must be an array"
          });
          continue;
        }

        if (items.length === 0) {
          failedOrders.push({
            order: orderData,
            error: "At least one item is required"
          });
          continue;
        }

        // Validate each item and parse prices
        const parsedItems: Array<{
          menuId: string;
          quantity: number;
          price: number;
          notes?: string;
        }> = [];

        for (const item of items) {
          if (!item.menuId || typeof item.menuId !== "string") {
            failedOrders.push({
              order: orderData,
              error: "Each item must have a valid menuId"
            });
            continue;
          }

          if (!item.quantity || typeof item.quantity !== "number" || item.quantity <= 0) {
            failedOrders.push({
              order: orderData,
              error: "Each item must have a valid positive quantity"
            });
            continue;
          }

          if (item.price === undefined || item.price === null || item.price === "") {
            failedOrders.push({
              order: orderData,
              error: "Each item must have a price"
            });
            continue;
          }

          const parsedPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
          if (isNaN(parsedPrice) || parsedPrice < 0) {
            failedOrders.push({
              order: orderData,
              error: "Item price must be a valid positive number"
            });
            continue;
          }

          parsedItems.push({
            menuId: item.menuId,
            quantity: item.quantity,
            price: parsedPrice,
            notes: item.notes?.trim() || null,
          });
        }

        // Skip if any item validation failed
        if (parsedItems.length !== items.length) {
          continue;
        }

        // Check if all menu items exist and are available
        const menuIds = parsedItems.map((item) => item.menuId);
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

        // Validate subtotal
        if (subtotal === undefined || subtotal === null || subtotal === "") {
          failedOrders.push({
            order: orderData,
            error: "Subtotal is required"
          });
          continue;
        }

        const parsedSubtotal = parseFloat(subtotal);
        if (isNaN(parsedSubtotal) || parsedSubtotal < 0) {
          failedOrders.push({
            order: orderData,
            error: "Subtotal must be a valid positive number"
          });
          continue;
        }

        // Validate tax if provided
        let parsedTax = 0;
        if (tax !== undefined && tax !== null && tax !== "") {
          parsedTax = parseFloat(tax);
          if (isNaN(parsedTax) || parsedTax < 0) {
            failedOrders.push({
              order: orderData,
              error: "Tax must be a valid positive number"
            });
            continue;
          }
        }

        // Validate discount if provided
        let parsedDiscount = 0;
        if (discount !== undefined && discount !== null && discount !== "") {
          parsedDiscount = parseFloat(discount);
          if (isNaN(parsedDiscount) || parsedDiscount < 0) {
            failedOrders.push({
              order: orderData,
              error: "Discount must be a valid positive number"
            });
            continue;
          }
        }

        // Validate total
        if (total === undefined || total === null || total === "") {
          failedOrders.push({
            order: orderData,
            error: "Total is required"
          });
          continue;
        }

        const parsedTotal = parseFloat(total);
        if (isNaN(parsedTotal) || parsedTotal < 0) {
          failedOrders.push({
            order: orderData,
            error: "Total must be a valid positive number"
          });
          continue;
        }

        // Validate payment method if provided
        const validPaymentMethods = ["CASH", "CARD", "QRIS", "TRANSFER"];
        if (paymentMethod !== undefined && paymentMethod !== null) {
          if (typeof paymentMethod !== "string" || !validPaymentMethods.includes(paymentMethod)) {
            failedOrders.push({
              order: orderData,
              error: `Payment method must be one of: ${validPaymentMethods.join(", ")}`
            });
            continue;
          }
        }

        // Validate notes if provided
        if (notes !== undefined && notes !== null && typeof notes !== "string") {
          failedOrders.push({
            order: orderData,
            error: "Notes must be a string"
          });
          continue;
        }

        // Create order with items
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
            // Preserve original createdAt if provided (for offline orders)
            createdAt: createdAt ? new Date(createdAt) : undefined,
            items: {
              create: parsedItems.map((item) => ({
                menuId: item.menuId,
                quantity: item.quantity,
                price: item.price,
                notes: item.notes,
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
      total: orders.length,
      syncedCount: syncedOrders.length,
      failedCount: failedOrders.length,
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
