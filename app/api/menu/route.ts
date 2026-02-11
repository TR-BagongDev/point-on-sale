import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get all menu items with category
export async function GET() {
  try {
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
    const body = await request.json();
    const { name, description, price, image, categoryId, isAvailable } = body;

    const menu = await prisma.menu.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        image,
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
    const body = await request.json();
    const { id, name, description, price, image, categoryId, isAvailable } = body;

    const menu = await prisma.menu.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        image,
        categoryId,
        isAvailable,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Menu ID is required" },
        { status: 400 }
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
