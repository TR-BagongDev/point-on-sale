import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { updateReceiptTemplateSchema } from "@/lib/validation";
import { handleApiError, createValidationError } from "@/lib/error-handler";

// GET - Get receipt template
export async function GET() {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

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
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

    const body = await request.json();

    // Validate with Zod schema
    const parsed = updateReceiptTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return handleApiError(createValidationError(parsed.error), "Update receipt template");
    }

    const { header, footer, showDate, showTime, showCashier, showTax, paperWidth } = parsed.data;

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
          ...(paperWidth !== undefined && { paperWidth }),
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
          paperWidth: paperWidth ?? 80,
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
