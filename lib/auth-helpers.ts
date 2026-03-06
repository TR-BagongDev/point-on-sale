import { auth } from "@/auth";
import { NextResponse } from "next/server";

type AuthSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
};

type AuthSuccess = { session: AuthSession };
type AuthError = { error: NextResponse };
type AuthResult = AuthSuccess | AuthError;

/**
 * Require authenticated user for API route access.
 * Returns the session if authenticated, or an error response if not.
 *
 * Usage:
 * ```typescript
 * const authResult = await requireAuth();
 * if ("error" in authResult) return authResult.error;
 * const { session } = authResult;
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { session: session as AuthSession };
}

/**
 * Require authenticated ADMIN user for API route access.
 * Returns the session if authenticated and is admin, or an error response if not.
 *
 * Usage:
 * ```typescript
 * const authResult = await requireAdmin();
 * if ("error" in authResult) return authResult.error;
 * const { session } = authResult;
 * ```
 */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireAuth();

  if ("error" in result) {
    return result;
  }

  if (result.session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return result;
}
