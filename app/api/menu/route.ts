import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

// GET - Get all menu items with category
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const menus = await prisma.menu.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    return NextResponse.json(menus);
  } catch (error) {
    console.error("Error fetching menus:", error);
    return NextResponse.json(
      { error: "Failed to fetch menus" },
      { status: 500 }
    );
  }
}

// POST - Create new menu item
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const body = await request.json();
    const { name, description, price, image, categoryId, isAvailable } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (price === undefined || price === null || price === "") {
      return NextResponse.json(
        { error: "Price is required" },
        { status: 400 }
      );
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Price must be a valid positive number" },
        { status: 400 }
      );
    }

    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if menu item with same name already exists
    const existingMenu = await prisma.menu.findFirst({
      where: { name: name.trim() },
    });

    if (existingMenu) {
      return NextResponse.json(
        { error: "Menu item with this name already exists" },
        { status: 400 }
      );
    }

    // Create menu
    const menu = await prisma.menu.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: parsedPrice,
        image: image || null,
        categoryId,
        isAvailable: isAvailable ?? true,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(menu, { status: 201 });
  } catch (error) {
    console.error("Error creating menu:", error);
    return NextResponse.json(
      { error: "Failed to create menu" },
      { status: 500 }
    );
  }
}

// PUT - Update menu item
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const body = await request.json();
    const { id, name, description, price, image, categoryId, isAvailable } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Menu ID is required" },
        { status: 400 }
      );
    }

    // Check if menu exists
    const existingMenu = await prisma.menu.findUnique({
      where: { id },
    });

    if (!existingMenu) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return NextResponse.json(
        { error: "Name must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate price if provided
    if (price !== undefined && price !== null && price !== "") {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { error: "Price must be a valid positive number" },
          { status: 400 }
        );
      }
    }

    // Validate categoryId if provided
    if (categoryId !== undefined && categoryId !== null) {
      if (typeof categoryId !== "string") {
        return NextResponse.json(
          { error: "Category ID must be a string" },
          { status: 400 }
        );
      }

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
    }

    // Check if another menu item with the same name already exists
    if (name && name.trim() !== existingMenu.name) {
      const duplicateMenu = await prisma.menu.findFirst({
        where: { name: name.trim() },
      });

      if (duplicateMenu) {
        return NextResponse.json(
          { error: "Menu item with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Update menu
    const menu = await prisma.menu.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(price !== undefined && price !== null && price !== "" && { price: parseFloat(price) }),
        ...(image !== undefined && { image: image || null }),
        ...(categoryId !== undefined && categoryId !== null && { categoryId }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(menu);
  } catch (error) {
    console.error("Error updating menu:", error);
    return NextResponse.json(
      { error: "Failed to update menu" },
      { status: 500 }
    );
  }
}

// DELETE - Delete menu item
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Menu ID is required" },
        { status: 400 }
      );
    }

    // Check if menu exists
    const existingMenu = await prisma.menu.findUnique({
      where: { id },
    });

    if (!existingMenu) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    await prisma.menu.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu:", error);
    return NextResponse.json(
      { error: "Failed to delete menu" },
      { status: 500 }
    );
  }
}
