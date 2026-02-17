/**
 * Check if high contrast mode is enabled
 * Checks both localStorage and DOM class list for comprehensive detection
 */
export function isHighContrastMode(): boolean {
  if (typeof window === "undefined") return false

  // Check localStorage first
  const stored = localStorage.getItem("pos-high-contrast-mode")
  if (stored !== null) {
    return JSON.parse(stored)
  }

  // Fallback to checking DOM class
  return document.documentElement.classList.contains("high-contrast")
}

/**
 * Check if simple mode is enabled
 * Checks localStorage for the simple mode preference
 */
export function isSimpleMode(): boolean {
  if (typeof window === "undefined") return false

  const stored = localStorage.getItem("pos-simple-mode")
  if (stored !== null) {
    return JSON.parse(stored)
  }

  return false
}

/**
 * Get accessible text size based on accessibility settings
 * Returns 'lg' for large text when high contrast or simple mode is enabled
 * Returns 'base' for normal text otherwise
 */
export function getAccessibleTextSize(): "base" | "lg" {
  if (isHighContrastMode() || isSimpleMode()) {
    return "lg"
  }
  return "base"
}

/**
 * Get appropriate touch target size for accessibility
 * Returns '48px' (minimum WCAG AAA size) when accessibility mode is enabled
 * Returns '44px' (WCAG AA minimum) otherwise
 */
export function getAccessibleTouchTarget(): string {
  if (isHighContrastMode() || isSimpleMode()) {
    return "48px"
  }
  return "44px"
}
