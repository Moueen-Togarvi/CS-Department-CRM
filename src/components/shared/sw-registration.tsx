'use client'

import { useEffect, useState } from 'react'

export function ServiceWorkerRegistration() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine)
    }
    // Unregister service worker to prevent caching issues
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) {
              console.log('Service Worker unregistered successfully')
            }
          })
        }
      })
    }

    // Online/offline detection
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-16 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-slide-up">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg dark:border-amber-800 dark:bg-amber-950/80">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <svg
              className="size-4 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              You are offline
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Some features may be unavailable
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}