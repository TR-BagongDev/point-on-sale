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

// GET - Get all categories
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const categories = await prisma.category.findMany({
      include: {
        menus: true,
      },
      orderBy: {
        order: "asc",
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const body = await request.json();
    const { name, icon, color, order } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate order if provided
    if (order !== undefined && order !== null) {
      const parsedOrder = Number(order);
      if (isNaN(parsedOrder) || parsedOrder < 0) {
        return NextResponse.json(
          { error: "Order must be a valid non-negative number" },
          { status: 400 }
        );
      }
    }

    // Check if category with same name already exists
    const existingCategory = await prisma.category.findFirst({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        icon: icon || null,
        color: color || null,
        order: order !== undefined && order !== null ? Number(order) : 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const body = await request.json();
    const { id, name, icon, color, order } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
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

    // Validate order if provided
    if (order !== undefined && order !== null) {
      const parsedOrder = Number(order);
      if (isNaN(parsedOrder) || parsedOrder < 0) {
        return NextResponse.json(
          { error: "Order must be a valid non-negative number" },
          { status: 400 }
        );
      }
    }

    // Check if another category with the same name already exists
    if (name && name.trim() !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: { name: name.trim() },
      });

      if (duplicateCategory) {
        return NextResponse.json(
          { error: "Category with this name already exists" },
          { status: 400 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(color !== undefined && { color: color || null }),
        ...(order !== undefined && order !== null && { order: Number(order) }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE - Delete category
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
