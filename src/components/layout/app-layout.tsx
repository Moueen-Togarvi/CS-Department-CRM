'use client'

import { type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { LoginDialog } from '@/components/auth/login-dialog'

export function AppLayout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuthStore()

  // Full-screen loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl border-[3px] border-slate-200 border-t-emerald-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {isAuthenticated && <Header />}
      <div className="flex flex-1">
        {isAuthenticated && <Sidebar />}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      {isAuthenticated && <MobileBottomNav />}

      {/* Login dialog — show when not authenticated */}
      <LoginDialog open={!isAuthenticated} onOpenChange={() => {}} />
    </div>
  )
}
