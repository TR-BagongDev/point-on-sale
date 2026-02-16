"use client"

import * as React from "react"

interface AccessibilityState {
  highContrastMode: boolean
  simpleMode: boolean
}

interface AccessibilityContextValue extends AccessibilityState {
  toggleHighContrastMode: () => void
  toggleSimpleMode: () => void
  setHighContrastMode: (enabled: boolean) => void
  setSimpleMode: (enabled: boolean) => void
}

const AccessibilityContext = React.createContext<AccessibilityContextValue | undefined>(
  undefined
)

interface AccessibilityProviderProps {
  children: React.ReactNode
  defaultHighContrastMode?: boolean
  defaultSimpleMode?: boolean
}

export function AccessibilityProvider({
  children,
  defaultHighContrastMode = false,
  defaultSimpleMode = false,
}: AccessibilityProviderProps) {
  const [state, setState] = React.useState<AccessibilityState>(() => {
    if (typeof window !== "undefined") {
      const savedHighContrast = localStorage.getItem("pos-high-contrast-mode")
      const savedSimpleMode = localStorage.getItem("pos-simple-mode")
      return {
        highContrastMode: savedHighContrast ? JSON.parse(savedHighContrast) : defaultHighContrastMode,
        simpleMode: savedSimpleMode ? JSON.parse(savedSimpleMode) : defaultSimpleMode,
      }
    }
    return {
      highContrastMode: defaultHighContrastMode,
      simpleMode: defaultSimpleMode,
    }
  })

  const toggleHighContrastMode = React.useCallback(() => {
    setState((prevState) => {
      const newState = !prevState.highContrastMode
      if (typeof window !== "undefined") {
        localStorage.setItem("pos-high-contrast-mode", JSON.stringify(newState))
      }
      return { ...prevState, highContrastMode: newState }
    })
  }, [])

  const toggleSimpleMode = React.useCallback(() => {
    setState((prevState) => {
      const newState = !prevState.simpleMode
      if (typeof window !== "undefined") {
        localStorage.setItem("pos-simple-mode", JSON.stringify(newState))
      }
      return { ...prevState, simpleMode: newState }
    })
  }, [])

  const setHighContrastMode = React.useCallback((enabled: boolean) => {
    setState((prevState) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("pos-high-contrast-mode", JSON.stringify(enabled))
      }
      return { ...prevState, highContrastMode: enabled }
    })
  }, [])

  const setSimpleMode = React.useCallback((enabled: boolean) => {
    setState((prevState) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("pos-simple-mode", JSON.stringify(enabled))
      }
      return { ...prevState, simpleMode: enabled }
    })
  }, [])

  const value = React.useMemo(
    () => ({
      ...state,
      toggleHighContrastMode,
      toggleSimpleMode,
      setHighContrastMode,
      setSimpleMode,
    }),
    [state, toggleHighContrastMode, toggleSimpleMode, setHighContrastMode, setSimpleMode]
  )

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement
      if (state.highContrastMode) {
        root.classList.add("high-contrast")
      } else {
        root.classList.remove("high-contrast")
      }
    }
  }, [state.highContrastMode])

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = React.useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider")
  }
  return context
}
