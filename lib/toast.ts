import { toast as sonnerToast, type ExternalToast } from "sonner"

// Re-export toast types from sonner for TypeScript support
export type { ExternalToast, ToastT } from "sonner"

/**
 * Toast notification utility wrapper using sonner
 * Provides typed methods for success, error, warning, and info notifications
 */

// Main toast function
export const toast = sonnerToast

// Success toast - green with checkmark icon
export const success = (message: string, options?: ExternalToast) => {
  return sonnerToast.success(message, options)
}

// Error toast - red with error icon
export const error = (message: string, options?: ExternalToast) => {
  return sonnerToast.error(message, options)
}

// Warning toast - yellow/orange with warning icon
export const warning = (message: string, options?: ExternalToast) => {
  return sonnerToast.warning(message, options)
}

// Info toast - blue with info icon
export const info = (message: string, options?: ExternalToast) => {
  return sonnerToast.info(message, options)
}
