"use client"

import { useEffect } from "react"
import { menusDB, categoriesDB } from "@/lib/offline-db"
import { useOfflineStore } from "@/store/offline-store"
import type { OfflineMenu, OfflineCategory } from "@/types/offline"
import type { MenuWithCategory, Category } from "@/types/api"

/**
 * Data Preloader Component
 *
 * Preloads menu and category data into IndexedDB on app initialization.
 * This ensures that essential data is available for offline use.
 *
 * - Fetches menus and categories from the API when online
 * - Caches data in IndexedDB for offline access
 * - Runs silently in the background without blocking the UI
 */
export function DataPreloader() {
  const isOnline = useOfflineStore((state) => state.isOnline)

  useEffect(() => {
    // Skip preloading if offline (will use existing cache)
    if (!isOnline) {
      return
    }

    /**
     * Preload menu and category data
     */
    async function preloadData() {
      try {
        // Fetch categories
        const categoriesRes = await fetch("/api/category")
        if (categoriesRes.ok) {
          const categories: Category[] = await categoriesRes.json()

          // Transform to offline format with cache metadata
          const offlineCategories: OfflineCategory[] = categories.map((cat) => ({
            ...cat,
            cachedAt: new Date(),
            version: 1,
          }))

          // Cache in IndexedDB
          await categoriesDB.addMany(offlineCategories)
        }

        // Fetch menus
        const menusRes = await fetch("/api/menu")
        if (menusRes.ok) {
          const menus: MenuWithCategory[] = await menusRes.json()

          // Transform to offline format with cache metadata
          const offlineMenus: OfflineMenu[] = menus.map((menu) => ({
            ...menu,
            cachedAt: new Date(),
            version: 1,
            category: {
              ...menu.category,
              cachedAt: new Date(),
              version: 1,
            },
          }))

          // Cache in IndexedDB
          await menusDB.cacheMenus(offlineMenus)
        }
      } catch (error) {
        // Silently fail - don't show errors to user during preloading
        // Components will handle their own loading states
        console.warn("[DataPreloader] Failed to preload data:", error)
      }
    }

    // Run preloading
    preloadData()
  }, [isOnline])

  // This component doesn't render anything
  return null
}
