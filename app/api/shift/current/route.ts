import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// GET - Get current active shift for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuth();
    if (guard) return guard;

    const session = await auth();

    // Find the user's currently open shift
    const shift = await prisma.shift.findFirst({
      where: {
        userId: session!.user.id,
        status: "OPEN",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        openedAt: "desc",
      },
    });

    // If no open shift found, return 404
    if (!shift) {
      return NextResponse.json(
        { error: "No active shift found" },
        { status: 404 }
      );
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Error fetching current shift:", error);
    return NextResponse.json(
      { error: "Failed to fetch current shift" },
      { status: 500 }
    );
  }
}
