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

    // Validate header if provided
    if (header !== undefined && header !== null && typeof header !== "string") {
      return NextResponse.json(
        { error: "Header must be a string" },
        { status: 400 }
      );
    }

    // Validate footer if provided
    if (footer !== undefined && footer !== null && typeof footer !== "string") {
      return NextResponse.json(
        { error: "Footer must be a string" },
        { status: 400 }
      );
    }

    // Validate boolean fields
    if (showDate !== undefined && typeof showDate !== "boolean") {
      return NextResponse.json(
        { error: "showDate must be a boolean" },
        { status: 400 }
      );
    }

    if (showTime !== undefined && typeof showTime !== "boolean") {
      return NextResponse.json(
        { error: "showTime must be a boolean" },
        { status: 400 }
      );
    }

    if (showCashier !== undefined && typeof showCashier !== "boolean") {
      return NextResponse.json(
        { error: "showCashier must be a boolean" },
        { status: 400 }
      );
    }

    if (showTax !== undefined && typeof showTax !== "boolean") {
      return NextResponse.json(
        { error: "showTax must be a boolean" },
        { status: 400 }
      );
    }

    // Validate paperWidth if provided
    if (paperWidth !== undefined && paperWidth !== null) {
      const parsedWidth = Number(paperWidth);
      if (isNaN(parsedWidth) || parsedWidth <= 0) {
        return NextResponse.json(
          { error: "Paper width must be a valid positive number" },
          { status: 400 }
        );
      }
    }

    // Find existing template or create default
    let template = await prisma.receiptTemplate.findFirst({
      where: { isActive: true },
    });

    if (template) {
      template = await prisma.receiptTemplate.update({
        where: { id: template.id },
        data: {
          ...(header !== undefined && { header: header || null }),
          ...(footer !== undefined && { footer: footer || null }),
          ...(showDate !== undefined && { showDate }),
          ...(showTime !== undefined && { showTime }),
          ...(showCashier !== undefined && { showCashier }),
          ...(showTax !== undefined && { showTax }),
          ...(paperWidth !== undefined && paperWidth !== null && { paperWidth: Number(paperWidth) }),
        },
      });
    } else {
      template = await prisma.receiptTemplate.create({
        data: {
          name: "Default Template",
          header: header || null,
          footer: footer || null,
          showDate: showDate ?? true,
          showTime: showTime ?? true,
          showCashier: showCashier ?? true,
          showTax: showTax ?? true,
          paperWidth: paperWidth !== undefined && paperWidth !== null ? Number(paperWidth) : 80,
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
