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

// GET - Get store settings
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const settings = await prisma.setting.findFirst();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT - Update store settings
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const body = await request.json();
    const { storeName, address, phone, taxRate } = body;

    // Validate store name if provided
    if (storeName !== undefined && (typeof storeName !== "string" || storeName.trim() === "")) {
      return NextResponse.json(
        { error: "Store name must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate address if provided
    if (address !== undefined && address !== null && typeof address !== "string") {
      return NextResponse.json(
        { error: "Address must be a string" },
        { status: 400 }
      );
    }

    // Validate phone if provided
    if (phone !== undefined && phone !== null && typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone must be a string" },
        { status: 400 }
      );
    }

    // Validate tax rate if provided
    if (taxRate !== undefined && taxRate !== null && taxRate !== "") {
      const parsedTaxRate = parseFloat(taxRate);
      if (isNaN(parsedTaxRate) || parsedTaxRate < 0 || parsedTaxRate > 100) {
        return NextResponse.json(
          { error: "Tax rate must be a valid number between 0 and 100" },
          { status: 400 }
        );
      }
    }

    // Find existing settings or create default
    let settings = await prisma.setting.findFirst();

    if (settings) {
      settings = await prisma.setting.update({
        where: { id: settings.id },
        data: {
          ...(storeName !== undefined && { storeName: storeName.trim() }),
          ...(address !== undefined && { address: address?.trim() || null }),
          ...(phone !== undefined && { phone: phone?.trim() || null }),
          ...(taxRate !== undefined && taxRate !== null && taxRate !== "" && { taxRate: parseFloat(taxRate) }),
        },
      });
    } else {
      settings = await prisma.setting.create({
        data: {
          storeName: storeName?.trim() || "",
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          taxRate: (taxRate !== undefined && taxRate !== null && taxRate !== "") ? parseFloat(taxRate) : 0,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
