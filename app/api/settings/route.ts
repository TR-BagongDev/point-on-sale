import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get store settings
export async function GET() {
  try {
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
    const body = await request.json();
    const { storeName, address, phone, taxRate } = body;

    // Find existing settings or create default
    let settings = await prisma.setting.findFirst();

    if (settings) {
      settings = await prisma.setting.update({
        where: { id: settings.id },
        data: {
          storeName,
          address,
          phone,
          taxRate: parseFloat(taxRate) || 0,
        },
      });
    } else {
      settings = await prisma.setting.create({
        data: {
          storeName,
          address,
          phone,
          taxRate: parseFloat(taxRate) || 0,
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
