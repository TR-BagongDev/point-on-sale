import { logError } from "@/lib/error-handler"

/**
 * Service worker registration state
 */
export interface ServiceWorkerState {
  /** Whether a service worker is registered */
  isRegistered: boolean
  /** Whether there's an update waiting */
  updateWaiting: boolean
  /** Whether an update is in progress */
  updateInProgress: boolean
  /** Current registration (if any) */
  registration: ServiceWorkerRegistration | null
}

/**
 * Service worker registration options
 */
export interface ServiceWorkerRegistrationOptions {
  /** Path to service worker file (relative to public) */
  swPath?: string
  /** Callback called when service worker is successfully registered */
  onRegistered?: (registration: ServiceWorkerRegistration) => void
  /** Callback called when service worker update is found */
  onUpdateFound?: (registration: ServiceWorkerRegistration) => void
  /** Callback called when new service worker is waiting to activate */
  onWaiting?: (registration: ServiceWorkerRegistration) => void
  /** Callback called when service worker is activated */
  onActivated?: (registration: ServiceWorkerRegistration) => void
  /** Callback called when registration fails */
  onError?: (error: Error) => void
  /** Whether to automatically skip waiting for new service worker */
  autoSkipWaiting?: boolean
}

/**
 * Service worker registration error class
 */
export class ServiceWorkerError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = "ServiceWorkerError"
  }
}

/**
 * Service worker registration manager
 * Handles service worker registration lifecycle and updates
 */
class ServiceWorkerManager {
  private state: ServiceWorkerState = {
    isRegistered: false,
    updateWaiting: false,
    updateInProgress: false,
    registration: null,
  }

  private options: Required<Omit<ServiceWorkerRegistrationOptions, "onRegistered" | "onUpdateFound" | "onWaiting" | "onActivated" | "onError">> & {
    onRegistered?: (registration: ServiceWorkerRegistration) => void
    onUpdateFound?: (registration: ServiceWorkerRegistration) => void
    onWaiting?: (registration: ServiceWorkerRegistration) => void
    onActivated?: (registration: ServiceWorkerRegistration) => void
    onError?: (error: Error) => void
  }

  constructor(options: ServiceWorkerRegistrationOptions = {}) {
    this.options = {
      swPath: options.swPath || "/service-worker.js",
      autoSkipWaiting: options.autoSkipWaiting ?? false,
      onRegistered: options.onRegistered,
      onUpdateFound: options.onUpdateFound,
      onWaiting: options.onWaiting,
      onActivated: options.onActivated,
      onError: options.onError,
    }
  }

  /**
   * Get current service worker state
   */
  getState(): ServiceWorkerState {
    return { ...this.state }
  }

  /**
   * Check if service workers are supported
   */
  isSupported(): boolean {
    return "serviceWorker" in navigator
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration> {
    if (!this.isSupported()) {
      const error = new ServiceWorkerError(
        "Service workers are not supported in this browser",
        "NOT_SUPPORTED"
      )
      this.options.onError?.(error)
      throw error
    }

    if (this.state.isRegistered && this.state.registration) {
      return this.state.registration
    }

    try {
      this.state.updateInProgress = true

      const registration = await navigator.serviceWorker.register(this.options.swPath, {
        type: "classic",
      })

      this.state.registration = registration
      this.state.isRegistered = true
      this.state.updateInProgress = false

      // Setup update listeners
      this.setupUpdateListeners(registration)

      logError(
        new Error("Service worker registered successfully"),
        "ServiceWorkerRegistration"
      )

      this.options.onRegistered?.(registration)

      return registration
    } catch (error) {
      this.state.updateInProgress = false

      const swError =
        error instanceof Error
          ? new ServiceWorkerError(error.message, "REGISTRATION_FAILED")
          : new ServiceWorkerError("Failed to register service worker", "REGISTRATION_FAILED")

      logError(swError, "ServiceWorkerRegistration")
      this.options.onError?.(swError)
      throw swError
    }
  }

  /**
   * Setup listeners for service worker updates
   */
  private setupUpdateListeners(registration: ServiceWorkerRegistration): void {
    // Listen for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing

      if (!newWorker) {
        return
      }

      this.options.onUpdateFound?.(registration)

      // Track the new worker's installation
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New service worker is waiting to activate
          this.state.updateWaiting = true
          this.options.onWaiting?.(registration)

          // Auto skip waiting if option is enabled
          if (this.options.autoSkipWaiting) {
            this.skipWaiting()
          }
        }

        if (newWorker.state === "activated") {
          this.state.updateWaiting = false
          this.options.onActivated?.(registration)
        }
      })
    })
  }

  /**
   * Check for service worker updates manually
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.state.registration) {
      return false
    }

    try {
      await this.state.registration.update()
      return true
    } catch (error) {
      logError(error, "ServiceWorkerUpdate")
      return false
    }
  }

  /**
   * Skip waiting and activate new service worker immediately
   */
  skipWaiting(): void {
    if (!this.state.registration || !this.state.registration.waiting) {
      return
    }

    // Send message to service worker to skip waiting
    this.state.registration.waiting.postMessage({ type: "SKIP_WAITING" })
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.state.registration) {
      return false
    }

    try {
      const unregistered = await this.state.registration.unregister()

      if (unregistered) {
        this.state = {
          isRegistered: false,
          updateWaiting: false,
          updateInProgress: false,
          registration: null,
        }
      }

      return unregistered
    } catch (error) {
      logError(error, "ServiceWorkerUnregister")
      return false
    }
  }

  /**
   * Get all service worker registrations
   */
  static async getAllRegistrations(): Promise<ServiceWorkerRegistration[]> {
    if (!("serviceWorker" in navigator)) {
      return []
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      return registrations
    } catch (error) {
      logError(error, "ServiceWorkerGetRegistrations")
      return []
    }
  }

  /**
   * Unregister all service workers
   */
  static async unregisterAll(): Promise<boolean> {
    const registrations = await ServiceWorkerManager.getAllRegistrations()

    try {
      await Promise.all(registrations.map((reg) => reg.unregister()))
      return true
    } catch (error) {
      logError(error, "ServiceWorkerUnregisterAll")
      return false
    }
  }
}

/**
 * Register service worker with default options
 * Convenience function for simple registration
 */
export async function registerServiceWorker(
  options?: ServiceWorkerRegistrationOptions
): Promise<ServiceWorkerRegistration | null> {
  // Only register in production or if explicitly enabled
  if (process.env.NODE_ENV === "development" && !options?.swPath) {
    return null
  }

  const manager = new ServiceWorkerManager(options)

  try {
    return await manager.register()
  } catch {
    return null
  }
}

/**
 * Create a new service worker manager instance
 * Use this for advanced control over service worker lifecycle
 */
export function createServiceWorkerManager(
  options?: ServiceWorkerRegistrationOptions
): ServiceWorkerManager {
  return new ServiceWorkerManager(options)
}

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return "serviceWorker" in navigator
}

/**
 * Wait for service worker to be ready
 */
export async function waitForServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isServiceWorkerSupported()) {
    throw new ServiceWorkerError("Service workers are not supported", "NOT_SUPPORTED")
  }

  return navigator.serviceWorker.ready
}
