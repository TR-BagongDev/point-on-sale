import { getUserMessage, logError } from "@/lib/error-handler"
import { error as toastError, success as toastSuccess } from "@/lib/toast"

// Import offline store (lazy import to avoid SSR issues)
let offlineStore: any = null

/**
 * Queued request interface for offline storage
 */
interface QueuedRequest {
  id: string
  url: string
  method: string
  body?: string
  headers?: Record<string, string>
  timestamp: number
  retryCount: number
}

/**
 * Offline request queue using IndexedDB for persistence
 */
class OfflineRequestQueue {
  private static DB_NAME = "pos-offline-queue"
  private static STORE_NAME = "requests"
  private static MAX_RETRIES = 3
  private static RETRY_DELAY = 1000 // 1 second

  private db: IDBDatabase | null = null
  private isProcessing = false

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OfflineRequestQueue.DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(OfflineRequestQueue.STORE_NAME)) {
          const store = db.createObjectStore(OfflineRequestQueue.STORE_NAME, {
            keyPath: "id",
          })
          store.createIndex("timestamp", "timestamp", { unique: false })
        }
      }
    })
  }

  /**
   * Add a request to the queue
   */
  async add(request: QueuedRequest): Promise<void> {
    if (typeof window === "undefined") {
      return // SSR: skip queueing
    }

    try {
      const db = await this.initDB()
      const transaction = db.transaction([OfflineRequestQueue.STORE_NAME], "readwrite")
      const store = transaction.objectStore(OfflineRequestQueue.STORE_NAME)
      store.add(request)

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      logError(error, "Failed to queue offline request")
    }
  }

  /**
   * Get all queued requests
   */
  async getAll(): Promise<QueuedRequest[]> {
    if (typeof window === "undefined") {
      return []
    }

    try {
      const db = await this.initDB()
      const transaction = db.transaction([OfflineRequestQueue.STORE_NAME], "readonly")
      const store = transaction.objectStore(OfflineRequestQueue.STORE_NAME)
      const request = store.getAll()

      return new Promise<QueuedRequest[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as QueuedRequest[])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      logError(error, "Failed to get queued requests")
      return []
    }
  }

  /**
   * Remove a request from the queue
   */
  async remove(id: string): Promise<void> {
    if (typeof window === "undefined") {
      return
    }

    try {
      const db = await this.initDB()
      const transaction = db.transaction([OfflineRequestQueue.STORE_NAME], "readwrite")
      const store = transaction.objectStore(OfflineRequestQueue.STORE_NAME)
      store.delete(id)

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      logError(error, "Failed to remove queued request")
    }
  }

  /**
   * Update retry count for a request
   */
  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    if (typeof window === "undefined") {
      return
    }

    try {
      const db = await this.initDB()
      const transaction = db.transaction([OfflineRequestQueue.STORE_NAME], "readwrite")
      const store = transaction.objectStore(OfflineRequestQueue.STORE_NAME)

      const getRequest = store.get(id)
      getRequest.onsuccess = () => {
        const data = getRequest.result
        if (data) {
          data.retryCount = retryCount
          store.put(data)
        }
      }

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      logError(error, "Failed to update retry count")
    }
  }

  /**
   * Process all queued requests when coming back online
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !isOnline()) {
      return
    }

    this.isProcessing = true

    try {
      const requests = await this.getAll()

      // Sort by timestamp (oldest first)
      requests.sort((a, b) => a.timestamp - b.timestamp)

      for (const queuedRequest of requests) {
        // Skip requests that have exceeded max retries
        if (queuedRequest.retryCount >= OfflineRequestQueue.MAX_RETRIES) {
          await this.remove(queuedRequest.id)
          logError(
            new Error(`Request failed after ${OfflineRequestQueue.MAX_RETRIES} retries`),
            `Offline queue: ${queuedRequest.method} ${queuedRequest.url}`
          )
          continue
        }

        try {
          // Retry the request
          const response = await fetch(queuedRequest.url, {
            method: queuedRequest.method,
            headers: queuedRequest.headers,
            body: queuedRequest.body,
          })

          if (response.ok) {
            // Success - remove from queue
            await this.remove(queuedRequest.id)
          } else {
            // Failed - increment retry count and continue
            await this.updateRetryCount(queuedRequest.id, queuedRequest.retryCount + 1)
            // Wait before next retry
            await new Promise((resolve) =>
              setTimeout(resolve, OfflineRequestQueue.RETRY_DELAY)
            )
          }
        } catch (error) {
          // Network error - increment retry count and continue
          await this.updateRetryCount(queuedRequest.id, queuedRequest.retryCount + 1)
          logError(error, `Offline queue retry: ${queuedRequest.method} ${queuedRequest.url}`)
          // Wait before next retry
          await new Promise((resolve) =>
            setTimeout(resolve, OfflineRequestQueue.RETRY_DELAY)
          )
        }
      }

      // Show success notification if queue was processed
      if (requests.length > 0) {
        toastSuccess("Offline changes synced successfully")
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Get the number of queued requests
   */
  async getQueueSize(): Promise<number> {
    const requests = await this.getAll()
    return requests.length
  }
}

/**
 * Cached menu data interface
 */
interface CachedMenuData {
  data: unknown[]
  timestamp: number
  version: number
}

/**
 * Menu cache using IndexedDB for offline storage
 */
class MenuCache {
  private static DB_NAME = "pos-menu-cache"
  private static STORE_NAME = "menus"
  private static CACHE_KEY = "current"
  private static CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private static CACHE_VERSION = 1

  private db: IDBDatabase | null = null
  private isRefreshing = false
  private refreshInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(MenuCache.DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(MenuCache.STORE_NAME)) {
          const store = db.createObjectStore(MenuCache.STORE_NAME, {
            keyPath: "key",
          })
          store.createIndex("timestamp", "timestamp", { unique: false })
        }
      }
    })
  }

  /**
   * Set menu data in cache
   */
  async set(data: unknown[]): Promise<void> {
    if (typeof window === "undefined") {
      return // SSR: skip caching
    }

    try {
      const db = await this.initDB()
      const transaction = db.transaction([MenuCache.STORE_NAME], "readwrite")
      const store = transaction.objectStore(MenuCache.STORE_NAME)

      const cachedData: CachedMenuData = {
        data,
        timestamp: Date.now(),
        version: MenuCache.CACHE_VERSION,
      }

      store.put({ key: MenuCache.CACHE_KEY, ...cachedData })

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      logError(error, "Failed to cache menu data")
    }
  }

  /**
   * Get menu data from cache
   */
  async get(): Promise<CachedMenuData | null> {
    if (typeof window === "undefined") {
      return null // SSR: no cache
    }

    try {
      const db = await this.initDB()
      const transaction = db.transaction([MenuCache.STORE_NAME], "readonly")
      const store = transaction.objectStore(MenuCache.STORE_NAME)
      const request = store.get(MenuCache.CACHE_KEY)

      return new Promise<CachedMenuData | null>((resolve, reject) => {
        request.onsuccess = () => {
          const cachedData = request.result as CachedMenuData | undefined
          resolve(cachedData || null)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      logError(error, "Failed to get cached menu data")
      return null
    }
  }

  /**
   * Check if cache is valid (not expired)
   */
  async isValid(): Promise<boolean> {
    const cachedData = await this.get()

    if (!cachedData) {
      return false
    }

    // Check version compatibility
    if (cachedData.version !== MenuCache.CACHE_VERSION) {
      return false
    }

    // Check expiry
    const now = Date.now()
    const age = now - cachedData.timestamp

    return age < MenuCache.CACHE_DURATION
  }

  /**
   * Clear the cache
   */
  async clear(): Promise<void> {
    if (typeof window === "undefined") {
      return
    }

    try {
      const db = await this.initDB()
      const transaction = db.transaction([MenuCache.STORE_NAME], "readwrite")
      const store = transaction.objectStore(MenuCache.STORE_NAME)
      store.delete(MenuCache.CACHE_KEY)

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      logError(error, "Failed to clear menu cache")
    }
  }

  /**
   * Refresh menu data in background
   * @param fetchFn Function to fetch fresh menu data
   */
  async refreshInBackground(fetchFn: () => Promise<unknown[]>): Promise<void> {
    if (this.isRefreshing || !isOnline()) {
      return
    }

    this.isRefreshing = true

    try {
      const freshData = await fetchFn()
      await this.set(freshData)
    } catch (error) {
      // Silently fail - don't show errors for background refresh
      logError(error, "Background menu refresh failed")
    } finally {
      this.isRefreshing = false
    }
  }

  /**
   * Start periodic background refresh
   * @param fetchFn Function to fetch fresh menu data
   * @param intervalMs Refresh interval in milliseconds (default: 5 minutes)
   */
  startPeriodicRefresh(fetchFn: () => Promise<unknown[]>, intervalMs: number = MenuCache.CACHE_DURATION): void {
    if (typeof window === "undefined") {
      return // SSR: skip
    }

    // Clear existing interval if any
    this.stopPeriodicRefresh()

    // Set up new interval
    this.refreshInterval = setInterval(() => {
      if (isOnline()) {
        this.refreshInBackground(fetchFn).catch((error) => {
          logError(error, "Periodic menu refresh failed")
        })
      }
    }, intervalMs)
  }

  /**
   * Stop periodic background refresh
   */
  stopPeriodicRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }

  /**
   * Check if currently refreshing
   */
  getIsRefreshing(): boolean {
    return this.isRefreshing
  }
}

// Create singleton instances
const offlineQueue = new OfflineRequestQueue()
const menuCache = new MenuCache()

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
 * Generate unique ID for queued requests
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Check if a request method is a mutation (should be queued offline)
 */
function isMutationMethod(method?: string): boolean {
  if (!method) return false
  const upperMethod = method.toUpperCase()
  return ["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod)
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

  const method = fetchOptions.method?.toUpperCase()

  // Check if offline and this is a mutation request
  if (!isOnline() && isMutationMethod(method)) {
    // Queue the request for later
    const queuedRequest: QueuedRequest = {
      id: generateRequestId(),
      url,
      method: method || "POST",
      body: fetchOptions.body as string | undefined,
      headers: fetchOptions.headers as Record<string, string> | undefined,
      timestamp: Date.now(),
      retryCount: 0,
    }

    await offlineQueue.add(queuedRequest)

    // Show info toast to user
    toastSuccess(
      successMessage || "Request saved. Will sync when you're back online."
    )

    // Return empty response for compatibility
    // The actual result will be processed when queue is processed
    return {} as T
  }

  // For GET requests or when online, proceed normally
  if (!isOnline()) {
    const offlineError = new Error(
      "You are currently offline. Please check your internet connection."
    )
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
      const offlineError = new Error(
        "Connection lost. Please check your internet connection."
      )
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
 * Setup online event listener to process queued requests and refresh menu cache
 */
function setupOnlineListener(): void {
  if (typeof window === "undefined") {
    return // SSR: skip
  }

  window.addEventListener("online", () => {
    // Process the queue when coming back online
    offlineQueue.processQueue().catch((error) => {
      logError(error, "Failed to process offline queue")
    })

    // Refresh menu cache in background when coming back online
    menuCache.refreshInBackground(async () => {
      // Fetch fresh menu data from API
      const response = await fetch("/api/menu")
      if (!response.ok) {
        throw new Error("Failed to fetch menu data")
      }
      return await response.json()
    }).catch((error) => {
      logError(error, "Failed to refresh menu cache after coming online")
    })
  })
}

// Initialize the online listener when module loads
setupOnlineListener()

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

  /**
   * Get the number of pending offline requests
   */
  async getPendingRequestsCount(): Promise<number> {
    return offlineQueue.getQueueSize()
  },

  /**
   * Manually trigger processing of offline queue
   */
  async processOfflineQueue(): Promise<void> {
    return offlineQueue.processQueue()
  },

  /**
   * Get menu data with caching support
   * Returns cached data if offline, otherwise fetches fresh data and updates cache
   */
  async getMenu(options?: RequestOptions): Promise<unknown[]> {
    const menuUrl = "/api/menu"

    // If offline, try to return cached data
    if (!isOnline()) {
      const cachedData = await menuCache.get()
      if (cachedData) {
        return cachedData.data as unknown[]
      }

      // No cached data available - throw offline error
      const offlineError = new Error(
        "You are currently offline and no menu data is cached."
      )
      logError(offlineError, "Get menu (offline, no cache)")

      if (!options?.skipErrorToast) {
        toastError(getUserMessage(offlineError.message))
      }

      throw offlineError
    }

    // Online - fetch fresh data
    try {
      const data = await this.get<unknown[]>(menuUrl, undefined, options)

      // Update cache with fresh data
      await menuCache.set(data)

      return data
    } catch (error) {
      // If fetch fails, try to fall back to cache
      const cachedData = await menuCache.get()

      if (cachedData && cachedData.data.length > 0) {
        // Return stale cache as fallback
        logError(
          error,
          "Get menu failed, returning stale cache"
        )
        return cachedData.data as unknown[]
      }

      // Re-throw the original error if no cache available
      throw error
    }
  },

  /**
   * Manually trigger menu cache refresh
   */
  async refreshMenuCache(): Promise<void> {
    if (!isOnline()) {
      throw new Error("Cannot refresh menu cache while offline")
    }

    return menuCache.refreshInBackground(async () => {
      const response = await fetch("/api/menu")
      if (!response.ok) {
        throw new Error("Failed to fetch menu data")
      }
      return await response.json()
    })
  },

  /**
   * Clear the menu cache
   */
  async clearMenuCache(): Promise<void> {
    return menuCache.clear()
  },

  /**
   * Check if menu cache is valid
   */
  async isMenuCacheValid(): Promise<boolean> {
    return menuCache.isValid()
  },

  /**
   * Start periodic menu cache refresh
   * @param intervalMs Refresh interval in milliseconds (default: 5 minutes)
   */
  startMenuCacheRefresh(intervalMs?: number): void {
    menuCache.startPeriodicRefresh(async () => {
      const response = await fetch("/api/menu")
      if (!response.ok) {
        throw new Error("Failed to fetch menu data")
      }
      return await response.json()
    }, intervalMs)
  },

  /**
   * Stop periodic menu cache refresh
   */
  stopMenuCacheRefresh(): void {
    menuCache.stopPeriodicRefresh()
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
