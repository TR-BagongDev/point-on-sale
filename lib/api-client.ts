import { getUserMessage, logError } from "@/lib/error-handler"
import { error as toastError, success as toastSuccess } from "@/lib/toast"

// Import offline store (lazy import to avoid SSR issues)
let offlineStore: any = null

/**
 * API response wrapper with error details
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  code?: string
  details?: unknown
}

/**
 * API client options
 */
export interface ApiClientOptions {
  /** Show toast notifications for errors */
  showErrorToast?: boolean
  /** Show toast notifications for success (only for non-GET requests) */
  showSuccessToast?: boolean
  /** Custom success message */
  successMessage?: string
  /** Context for error logging */
  context?: string
}

/**
 * Request options with loading state support
 */
export interface RequestOptions extends RequestInit {
  /** Skip error toast notification */
  skipErrorToast?: boolean
  /** Skip success toast notification */
  skipSuccessToast?: boolean
  /** Custom success message */
  successMessage?: string
  /** Context for error logging */
  context?: string
}

/**
 * API client error class
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = "ApiClientError"
  }
}

/**
 * Parse API response and handle errors
 */
async function parseResponse<T>(
  response: Response,
  options: ApiClientOptions = {}
): Promise<T> {
  const { showErrorToast = true, context } = options

  // Try to parse JSON response
  let jsonData: unknown
  try {
    jsonData = await response.json()
  } catch {
    // If not JSON, return text or empty object
    const text = await response.text()
    jsonData = text || {}
  }

  // Handle error responses
  if (!response.ok) {
    const errorMessage =
      typeof jsonData === "object" && jsonData !== null && "error" in jsonData
        ? String(jsonData.error)
        : response.statusText

    // Log error for debugging
    logError(
      new ApiClientError(
        errorMessage,
        response.status,
        typeof jsonData === "object" && jsonData !== null && "code" in jsonData
          ? String(jsonData.code)
          : undefined,
        typeof jsonData === "object" && jsonData !== null && "details" in jsonData
          ? jsonData.details
          : undefined
      ),
      context
    )

    // Show error toast if enabled
    if (showErrorToast) {
      toastError(getUserMessage(errorMessage))
    }

    throw new ApiClientError(
      errorMessage,
      response.status,
      typeof jsonData === "object" && jsonData !== null && "code" in jsonData
        ? String(jsonData.code)
        : undefined,
      typeof jsonData === "object" && jsonData !== null && "details" in jsonData
        ? jsonData.details
        : undefined
    )
  }

  return jsonData as T
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

/**
 * Check if the app is currently online
 * Uses navigator.onLine as the source of truth
 */
function isOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true // SSR: assume online
  }
  return navigator.onLine
}

/**
 * Get offline state from store
 * Returns null if store is not available (SSR)
 */
function getOfflineState(): { isOnline: boolean } | null {
  if (typeof window === "undefined" || !offlineStore) {
    return null
  }
  try {
    return offlineStore.getState()
  } catch {
    return null
  }
}

/**
 * Core API request function
 */
async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    skipErrorToast = false,
    skipSuccessToast = false,
    successMessage,
    context,
    ...fetchOptions
  } = options

  // Check if offline before making request
  if (!isOnline()) {
    const offlineError = new Error("You are currently offline. Please check your internet connection.")
    logError(offlineError, context || "API request (offline)")

    if (!skipErrorToast) {
      toastError(getUserMessage(offlineError))
    }

    throw offlineError
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    })

    const data = await parseResponse<T>(response, {
      showErrorToast: !skipErrorToast,
      context,
    })

    // Show success toast for mutations (POST, PUT, PATCH, DELETE)
    const method = fetchOptions.method?.toUpperCase()
    if (
      !skipSuccessToast &&
      method &&
      method !== "GET" &&
      method !== "HEAD"
    ) {
      toastSuccess(successMessage || "Success")
    }

    return data
  } catch (error) {
    // Re-throw ApiClientError (already handled)
    if (error instanceof ApiClientError) {
      throw error
    }

    // Handle network/fetch errors
    // Check if we went offline during the request
    if (!isOnline()) {
      const offlineError = new Error("Connection lost. Please check your internet connection.")
      logError(error, context || "API request (connection lost)")

      if (!skipErrorToast) {
        toastError(getUserMessage(offlineError))
      }

      throw offlineError
    }

    const networkError = new Error("Network error. Please check your connection.")
    logError(error, context)

    if (!skipErrorToast) {
      toastError(getUserMessage(networkError))
    }

    throw networkError
  }
}

/**
 * API client object with convenient methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(
    url: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: RequestOptions
  ): Promise<T> {
    const queryString = params ? buildQueryString(params) : ""
    return request<T>(`${url}${queryString}`, {
      ...options,
      method: "GET",
    })
  },

  /**
   * POST request
   */
  async post<T>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return request<T>(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return request<T>(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return request<T>(url, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return request<T>(url, {
      ...options,
      method: "DELETE",
    })
  },

  /**
   * Check if currently online
   * Uses navigator.onLine as source of truth
   */
  isOnline(): boolean {
    return isOnline()
  },
}

/**
 * React hook for loading state management
 * Can be used with API client for automatic loading state
 */
export interface LoadingState {
  isLoading: boolean
  error: string | null
  setError: (error: string | null) => void
  clearError: () => void
  setLoading: (loading: boolean) => void
}

export function useLoadingState(initialLoading = false): LoadingState {
  // This is a simple state manager - in React components, use useState instead
  // This is provided for non-hook contexts or custom hook implementations
  let isLoading = initialLoading
  let error: string | null = null

  return {
    get isLoading() {
      return isLoading
    },
    get error() {
      return error
    },
    setError(err: string | null) {
      error = err
    },
    clearError() {
      error = null
    },
    setLoading(loading: boolean) {
      isLoading = loading
    },
  }
}
