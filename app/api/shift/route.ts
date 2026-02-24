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

// GET - Get all shifts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuth();
    if (guard) return guard;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    // Support date range query
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // Include the entire end date
      where.openedAt = {
        gte: start,
        lt: end,
      };
    }

    const shifts = await prisma.shift.findMany({
      where,
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

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
      { status: 500 }
    );
  }
}

// POST - Open a new shift
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuth();
    if (guard) return guard;

    const session = await auth();
    const body = await request.json();
    const { startingCash } = body;

    // Validate startingCash
    if (startingCash === undefined || startingCash === null || startingCash === "") {
      return NextResponse.json(
        { error: "Starting cash is required" },
        { status: 400 }
      );
    }

    const parsedStartingCash = parseFloat(startingCash);
    if (isNaN(parsedStartingCash) || parsedStartingCash < 0) {
      return NextResponse.json(
        { error: "Starting cash must be a valid positive number" },
        { status: 400 }
      );
    }

    // Check if user has an open shift
    const existingOpenShift = await prisma.shift.findFirst({
      where: {
        userId: session!.user.id,
        status: "OPEN",
      },
    });

    if (existingOpenShift) {
      return NextResponse.json(
        { error: "You already have an open shift. Please close it before opening a new one." },
        { status: 400 }
      );
    }

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        userId: session!.user.id,
        startingCash: parsedStartingCash,
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
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json(
      { error: "Failed to create shift" },
      { status: 500 }
    );
  }
}
