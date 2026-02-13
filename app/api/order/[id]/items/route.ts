import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper function to track modifications
async function trackModification(
  orderId: string,
  userId: string,
  action: string,
  description: string,
  changes?: Record<string, unknown>
) {
  await prisma.orderModification.create({
    data: {
      orderId,
      userId,
      action,
      description,
      changes: changes ? JSON.stringify(changes) : null,
    },
  });
}

// Helper function to recalculate order totals
async function recalculateOrderTotals(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { menu: true },
  });

  const subtotal = items.reduce(
    (sum: number, item: (typeof items)[number]) => sum + item.price * item.quantity,
    0
  );

  // Get order to apply tax and discount rates
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const tax = subtotal * 0.11; // 11% tax rate
  const total = subtotal + tax - order.discount;

  await prisma.order.update({
    where: { id: orderId },
    data: { subtotal, tax, total },
  });
}

// POST - Add item to order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { menuId, quantity, notes } = body;

    // Validate input
    if (!menuId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid menu ID or quantity" },
        { status: 400 }
      );
    }

    // Check if order exists and can be modified
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING" && order.status !== "PREPARING") {
      return NextResponse.json(
        { error: "Cannot modify items for orders with status: " + order.status },
        { status: 400 }
      );
    }

    // Get menu item
    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
    });

    if (!menu) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    if (!menu.isAvailable) {
      return NextResponse.json(
        { error: "Menu item is not available" },
        { status: 400 }
      );
    }

    // Check if item already exists in order
    const existingItem = order.items.find(
      (item: any) => item.menuId === menuId && item.notes === notes
    );

    let updatedItem: any;

    if (existingItem) {
      // Update quantity of existing item
      updatedItem = await prisma.orderItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: { menu: true },
      });

      // Track modification
      await trackModification(
        id,
        order.userId,
        "QUANTITY_CHANGED",
        `Updated quantity for ${menu.name} from ${existingItem.quantity} to ${existingItem.quantity + quantity}`,
        {
          fieldName: "quantity",
          oldValue: existingItem.quantity,
          newValue: existingItem.quantity + quantity,
          itemId: existingItem.id,
          menuName: menu.name,
        }
      );
    } else {
      // Add new item to order
      updatedItem = await prisma.orderItem.create({
        data: {
          orderId: id,
          menuId,
          quantity,
          price: menu.price,
          notes,
        },
        include: { menu: true },
      });

      // Track modification
      await trackModification(
        id,
        order.userId,
        "ITEM_ADDED",
        `Added ${quantity}x ${menu.name} to order`,
        {
          itemId: updatedItem.id,
          menuName: menu.name,
          quantity,
          price: menu.price,
        }
      );
    }

    // Recalculate order totals
    await recalculateOrderTotals(id);

    // Return updated item
    return NextResponse.json(updatedItem, { status: 201 });
  } catch (error) {
    console.error("Error adding item to order:", error);
    return NextResponse.json(
      { error: "Failed to add item to order" },
      { status: 500 }
    );
  }
}

// PATCH - Update item quantity or notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { itemId, quantity, notes } = body;

    // Validate input
    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Check if order exists and can be modified
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { menu: true } } },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING" && order.status !== "PREPARING") {
      return NextResponse.json(
        { error: "Cannot modify items for orders with status: " + order.status },
        { status: 400 }
      );
    }

    // Find the item
    const item = order.items.find((i: any) => i.id === itemId);

    if (!item) {
      return NextResponse.json(
        { error: "Item not found in this order" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (quantity !== undefined) {
      if (quantity <= 0) {
        return NextResponse.json(
          { error: "Quantity must be greater than 0" },
          { status: 400 }
        );
      }
      updateData.quantity = quantity;

      // Track quantity change
      await trackModification(
        id,
        order.userId,
        "QUANTITY_CHANGED",
        `Updated quantity for ${item.menu.name} from ${item.quantity} to ${quantity}`,
        {
          fieldName: "quantity",
          oldValue: item.quantity,
          newValue: quantity,
          itemId: item.id,
          menuName: item.menu.name,
        }
      );
    }

    if (notes !== undefined) {
      updateData.notes = notes;

      // Track notes change
      await trackModification(
        id,
        order.userId,
        "NOTES_UPDATED",
        `Updated notes for ${item.menu.name}`,
        {
          fieldName: "notes",
          oldValue: item.notes,
          newValue: notes,
          itemId: item.id,
          menuName: item.menu.name,
        }
      );
    }

    // Update the item
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
      include: { menu: true },
    });

    // Recalculate order totals if quantity changed
    if (quantity !== undefined) {
      await recalculateOrderTotals(id);
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating order item:", error);
    return NextResponse.json(
      { error: "Failed to update order item" },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Check if order exists and can be modified
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { menu: true } } },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING" && order.status !== "PREPARING") {
      return NextResponse.json(
        { error: "Cannot modify items for orders with status: " + order.status },
        { status: 400 }
      );
    }

    // Find the item
    const item = order.items.find((i: any) => i.id === itemId);

    if (!item) {
      return NextResponse.json(
        { error: "Item not found in this order" },
        { status: 404 }
      );
    }

    // Delete the item
    await prisma.orderItem.delete({
      where: { id: itemId },
    });

    // Track modification
    await trackModification(
      id,
      order.userId,
      "ITEM_REMOVED",
      `Removed ${item.quantity}x ${item.menu.name} from order`,
      {
        itemId: item.id,
        menuName: item.menu.name,
        quantity: item.quantity,
        price: item.price,
      }
    );

    // Recalculate order totals
    await recalculateOrderTotals(id);

    return NextResponse.json({ success: true, message: "Item removed" });
  } catch (error) {
    console.error("Error removing item from order:", error);
    return NextResponse.json(
      { error: "Failed to remove item from order" },
      { status: 500 }
    );
  }
}
