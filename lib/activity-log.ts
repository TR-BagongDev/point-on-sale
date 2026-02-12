import { prisma } from "./prisma";

export interface LogActivityParams {
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  targetUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Records user activity in the activity log
 * @param params - Activity log parameters
 * @returns The created activity log entry
 */
export async function logActivity(params: LogActivityParams) {
  const { userId, action, details, targetUserId, ipAddress, userAgent } = params;

  try {
    const activityLog = await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : undefined,
        targetUserId,
        ipAddress,
        userAgent,
      },
    });

    return activityLog;
  } catch (error) {
    // Log error but don't throw - activity logging should not break the flow
    console.error("Failed to log activity:", error);
    return null;
  }
}

/**
 * Records user login activity
 */
export async function logUserLogin(params: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "LOGIN",
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Records user logout activity
 */
export async function logUserLogout(params: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "LOGOUT",
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Records user creation activity
 */
export async function logUserCreated(params: {
  userId: string;
  targetUserId: string;
  targetUserName?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "USER_CREATED",
    targetUserId: params.targetUserId,
    details: {
      targetUserName: params.targetUserName,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Records user update activity
 */
export async function logUserUpdated(params: {
  userId: string;
  targetUserId: string;
  changes: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "USER_UPDATED",
    targetUserId: params.targetUserId,
    details: {
      changes: params.changes,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Records user deactivation activity
 */
export async function logUserDeactivated(params: {
  userId: string;
  targetUserId: string;
  targetUserName?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "USER_DEACTIVATED",
    targetUserId: params.targetUserId,
    details: {
      targetUserName: params.targetUserName,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Records user activation activity
 */
export async function logUserActivated(params: {
  userId: string;
  targetUserId: string;
  targetUserName?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "USER_ACTIVATED",
    targetUserId: params.targetUserId,
    details: {
      targetUserName: params.targetUserName,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Records password reset activity
 */
export async function logPasswordReset(params: {
  userId: string;
  targetUserId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return logActivity({
    userId: params.userId,
    action: "PASSWORD_RESET",
    targetUserId: params.targetUserId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

export default logActivity;
