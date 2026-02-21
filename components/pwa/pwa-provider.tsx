'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/service-worker-registration'

/**
 * PWA Provider Component
 * Registers service worker on client-side mount
 */
export function PWAProvider() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker({
      swPath: '/service-worker.js',
    })
  }, [])

  return null
}
