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

// GET - Get receipt template
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const template = await prisma.receiptTemplate.findFirst({
      where: { isActive: true },
    });
    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching receipt template:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt template" },
      { status: 500 }
    );
  }
}

// PUT - Update receipt template
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const body = await request.json();
    const {
      header,
      footer,
      showDate,
      showTime,
      showCashier,
      showTax,
      paperWidth,
    } = body;

    // Find existing template or create default
    let template = await prisma.receiptTemplate.findFirst({
      where: { isActive: true },
    });

    if (template) {
      template = await prisma.receiptTemplate.update({
        where: { id: template.id },
        data: {
          header,
          footer,
          showDate,
          showTime,
          showCashier,
          showTax,
          paperWidth,
        },
      });
    } else {
      template = await prisma.receiptTemplate.create({
        data: {
          name: "Default Template",
          header,
          footer,
          showDate,
          showTime,
          showCashier,
          showTax,
          paperWidth,
          isActive: true,
        },
      });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating receipt template:", error);
    return NextResponse.json(
      { error: "Failed to update receipt template" },
      { status: 500 }
    );
  }
}
