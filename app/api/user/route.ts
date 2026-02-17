import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
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

// GET - Get all users with role, status, and last login info
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const body = await request.json();
    const { name, email, password, role } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: "Name is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate email
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: "Email is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.trim() === '') {
      return NextResponse.json(
        { error: "Password is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate role
    if (!role || typeof role !== 'string' || role.trim() === '') {
      return NextResponse.json(
        { error: "Role is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate role values
    const trimmedRole = role.trim();
    if (!["ADMIN", "KASIR"].includes(trimmedRole)) {
      return NextResponse.json(
        { error: "Role must be either ADMIN or KASIR" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashedPassword,
        role: trimmedRole,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard) return guard;

    const body = await request.json();
    const { id, name, email, role, isActive } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim() === '') {
        return NextResponse.json(
          { error: "Email cannot be empty" },
          { status: 400 }
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    // Validate role values if provided
    if (role !== undefined) {
      if (typeof role !== 'string' || role.trim() === '') {
        return NextResponse.json(
          { error: "Role cannot be empty" },
          { status: 400 }
        );
      }
      if (!["ADMIN", "KASIR"].includes(role.trim())) {
        return NextResponse.json(
          { error: "Role must be either ADMIN or KASIR" },
          { status: 400 }
        );
      }
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email already exists for another user
    if (email !== undefined && email.trim() !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.trim() },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.trim() }),
        ...(role !== undefined && { role: role.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
