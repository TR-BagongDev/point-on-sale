/**
 * Service Worker for Point on Sale PWA
 * Implements cache-first strategy for static assets and stale-while-revalidate for API calls
 */

// Cache names for different resource types
const CACHE_VERSION = "v1"
const CACHE_PREFIX = "pos-pwa-"

const CACHE_NAMES = {
  static: `${CACHE_PREFIX}static-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}images-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}api-${CACHE_VERSION}`,
}

// URLs to cache on install (app shell)
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  // Icons will be cached when requested
]

/**
 * Install event - cache static assets
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.static)
      await cache.addAll(PRECACHE_URLS)
      // Force the waiting service worker to become the active service worker
      await self.skipWaiting()
    })()
  )
})

/**
 * Activate event - clean up old caches
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete all caches that don't match the current versions
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName.startsWith(CACHE_PREFIX) &&
              !Object.values(CACHE_NAMES).includes(cacheName)
            )
          })
          .map((cacheName) => caches.delete(cacheName))
      )
      // Take control of all pages immediately
      await self.clients.claim()
    })()
  )
})

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Strategy for static assets (JS, CSS, fonts) - Cache First
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font"
  ) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static))
    return
  }

  // Strategy for images - Cache First with longer cache
  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, CACHE_NAMES.images))
    return
  }

  // Strategy for API routes - Network First with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, CACHE_NAMES.api))
    return
  }

  // Strategy for HTML pages - Network First for navigation, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, CACHE_NAMES.static))
    return
  }

  // Default strategy - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.static))
})

/**
 * Cache First strategy
 * Tries cache first, if not found, fetches from network
 * Best for: Static assets that don't change often (JS, CSS, images, fonts)
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    // Cache the new response for future use
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    // If both cache and network fail, return offline fallback
    return new Response("Offline - No cached data available", {
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({
        "Content-Type": "text/plain",
      }),
    })
  }
}

/**
 * Network First strategy
 * Tries network first, if fails, falls back to cache
 * Best for: API calls and HTML pages where fresh content is preferred
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const networkResponse = await fetch(request)
    // Update cache with fresh response
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    // Both failed, return offline fallback
    return new Response("Offline - No cached data available", {
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({
        "Content-Type": "text/plain",
      }),
    })
  }
}

/**
 * Stale While Revalidate strategy
 * Returns cache immediately (if available), then updates cache in background
 * Best for: Resources where speed is important but freshness is also desired
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  // Fetch in background to update cache
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  })

  // Return cached response immediately, or wait for network if no cache
  return cachedResponse || fetchPromise
}

/**
 * Message event - handle messages from clients
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
