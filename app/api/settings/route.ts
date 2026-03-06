import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { updateSettingsSchema } from "@/lib/validation";
import { handleApiError, createValidationError } from "@/lib/error-handler";

// GET - Get store settings
export async function GET() {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

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
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

    const body = await request.json();

    // Validate with Zod schema (only storeName, address, phone, taxRate)
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return handleApiError(createValidationError(parsed.error), "Update settings");
    }

    const { storeName, address, phone, taxRate } = parsed.data;

    // Handle npwp separately (not in schema but part of the model)
    const { npwp } = body;

    // Validate NPWP format if provided and not empty
    if (npwp !== undefined && npwp !== null && typeof npwp === "string" && npwp.trim() !== "") {
      const npwpPattern = /^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/;
      if (!npwpPattern.test(npwp.trim())) {
        return NextResponse.json(
          { error: "NPWP format is invalid. Expected format: XX.XXX.XXX.X-XXX.XXX" },
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
          storeName: storeName.trim(),
          ...(address !== undefined && { address: address?.trim() || null }),
          ...(phone !== undefined && { phone: phone?.trim() || null }),
          ...(npwp !== undefined && { npwp: typeof npwp === "string" ? npwp?.trim() || null : null }),
          taxRate,
        },
      });
    } else {
      settings = await prisma.setting.create({
        data: {
          storeName: storeName.trim(),
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          npwp: typeof npwp === "string" ? npwp?.trim() || null : null,
          taxRate,
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
