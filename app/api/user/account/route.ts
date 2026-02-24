import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { logUserUpdated } from "@/lib/activity-log";

// PATCH - Update current user's account (name, email, password)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, currentPassword, newPassword } = body;

    // Get current user from database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Track what fields are being updated
    const changes: Record<string, unknown> = {};
    const updateData: Record<string, string> = {};

    // Validate and update name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      const trimmedName = name.trim();
      if (trimmedName !== currentUser.name) {
        updateData.name = trimmedName;
        changes.name = { from: currentUser.name, to: trimmedName };
      }
    }

    // Validate and update email if provided
    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim() === '') {
        return NextResponse.json(
          { error: "Email cannot be empty" },
          { status: 400 }
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const trimmedEmail = email.trim();
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
      if (trimmedEmail !== currentUser.email) {
        // Check if email already exists for another user
        const emailExists = await prisma.user.findUnique({
          where: { email: trimmedEmail },
        });

        if (emailExists) {
          return NextResponse.json(
            { error: "Email already exists" },
            { status: 400 }
          );
        }
        updateData.email = trimmedEmail;
        changes.email = { from: currentUser.email, to: trimmedEmail };
      }
    }

    // Handle password update
    if (newPassword !== undefined) {
      if (typeof newPassword !== 'string' || newPassword.trim() === '') {
        return NextResponse.json(
          { error: "New password cannot be empty" },
          { status: 400 }
        );
      }

      // Current password is required to change password
      if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.trim() === '') {
        return NextResponse.json(
          { error: "Current password is required to change password" },
          { status: 400 }
        );
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword.trim(),
        currentUser.password
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }

      // Validate new password length
      const trimmedNewPassword = newPassword.trim();
      if (trimmedNewPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long" },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(trimmedNewPassword, 10);
      updateData.password = hashedPassword;
      changes.password = "updated";
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
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

    // Log account update activity
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    await logUserUpdated({
      userId: session.user.id,
      targetUserId: session.user.id,
      changes,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}
