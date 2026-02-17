import { ZodError } from "zod"

/**
 * Custom application error class for typed error handling
 * Extends Error with additional properties for better error tracking
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = "AppError"
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error types for categorizing different kinds of errors
 */
export enum ErrorType {
  VALIDATION = "VALIDATION_ERROR",
  AUTHENTICATION = "AUTHENTICATION_ERROR",
  AUTHORIZATION = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  DATABASE = "DATABASE_ERROR",
  NETWORK = "NETWORK_ERROR",
  INTERNAL = "INTERNAL_ERROR",
}

/**
 * User-friendly error messages mapping
 * Converts technical error codes to messages users can understand
 */
const userFriendlyMessages: Record<string, string> = {
  [ErrorType.VALIDATION]: "Please check your input and try again",
  [ErrorType.AUTHENTICATION]: "Please log in to continue",
  [ErrorType.AUTHORIZATION]: "You don't have permission to perform this action",
  [ErrorType.NOT_FOUND]: "The requested resource was not found",
  [ErrorType.DATABASE]: "Unable to save changes. Please try again",
  [ErrorType.NETWORK]: "Connection problem. Please check your internet",
  [ErrorType.INTERNAL]: "Something went wrong. Please try again",
}

/**
 * Get a user-friendly error message from an error object
 * Handles Zod validation errors, AppErrors, and generic errors
 */
export function getUserMessage(error: unknown): string {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const firstError = error.issues[0]
    if (firstError) {
      const field = firstError.path.join(".") || "Field"
      const message = firstError.message
      return `${field}: ${message}`
    }
    return "Validation failed. Please check your input"
  }

  // Handle AppError with custom message
  if (error instanceof AppError) {
    return error.message
  }

  // Handle standard Error types
  if (error instanceof Error) {
    // Check for common error patterns
    const errorMessage = error.message.toLowerCase()

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return userFriendlyMessages[ErrorType.NETWORK]
    }

    if (errorMessage.includes("unauthorized") || errorMessage.includes("unauthenticated")) {
      return userFriendlyMessages[ErrorType.AUTHENTICATION]
    }

    if (errorMessage.includes("forbidden")) {
      return userFriendlyMessages[ErrorType.AUTHORIZATION]
    }

    if (errorMessage.includes("not found")) {
      return userFriendlyMessages[ErrorType.NOT_FOUND]
    }

    // Return the actual error message if it's user-friendly
    if (error.message.length < 100 && !error.message.includes("PRISMA")) {
      return error.message
    }
  }

  // Default fallback message
  return userFriendlyMessages[ErrorType.INTERNAL]
}

/**
 * Get HTTP status code from an error
 */
export function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode
  }

  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase()

    if (errorMessage.includes("unauthorized") || errorMessage.includes("unauthenticated")) {
      return 401
    }

    if (errorMessage.includes("forbidden")) {
      return 403
    }

    if (errorMessage.includes("not found")) {
      return 404
    }

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return 503
    }
  }

  return 500
}

/**
 * Log error for debugging (in production, send to error tracking service)
 */
export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString()
  const contextPrefix = context ? `[${context}]` : ""

  if (error instanceof Error) {
    console.error(`${contextPrefix} Error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
  } else {
    console.error(`${contextPrefix} Unknown error:`, error)
  }
}

/**
 * Create a validation error from Zod error
 */
export function createValidationError(zodError: ZodError): AppError {
  const firstError = zodError.issues[0]
  const message = firstError
    ? `${firstError.path.join(".") || "Field"}: ${firstError.message}`
    : "Validation failed"

  return new AppError(message, 400, ErrorType.VALIDATION, zodError.issues)
}

/**
 * Create a not found error
 */
export function createNotFoundError(resource: string): AppError {
  return new AppError(
    `${resource} not found`,
    404,
    ErrorType.NOT_FOUND
  )
}

/**
 * Create an unauthorized error
 */
export function createUnauthorizedError(message?: string): AppError {
  return new AppError(
    message || "Please log in to continue",
    401,
    ErrorType.AUTHENTICATION
  )
}

/**
 * Create a forbidden error
 */
export function createForbiddenError(message?: string): AppError {
  return new AppError(
    message || "You don't have permission to perform this action",
    403,
    ErrorType.AUTHORIZATION
  )
}

/**
 * Handle API route error consistently
 * Returns appropriate NextResponse with error details
 */
export async function handleApiError(
  error: unknown,
  context?: string
): Promise<Response> {
  logError(error, context)

  const statusCode = getStatusCode(error)
  const message = getUserMessage(error)

  return new Response(
    JSON.stringify({
      error: message,
      code: error instanceof AppError ? error.code : undefined,
      details: error instanceof AppError ? error.details : undefined,
    }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    }
  )
}

/**
 * Wrap an async function with error handling
 * Useful for API route handlers
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<Response>>(
  fn: T,
  context?: string
): T {
  return (async function(this: unknown, ...args: Parameters<T>) {
    try {
      return await fn.apply(this, args)
    } catch (error) {
      return handleApiError(error, context)
    }
  }) as T
}
