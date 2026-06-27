'use client'

import { useState } from 'react'
import { Grid3X3, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { MOBILE_NAV_ITEMS, MORE_NAV_ITEMS, type ModuleId } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const user = useAuthStore((s) => s.user)
  const [moreOpen, setMoreOpen] = useState(false)

  const userRole = user?.role

  const filterByRole = (items: typeof MOBILE_NAV_ITEMS) =>
    items.filter(
      (item) => item.roles.includes('ALL') || item.roles.includes(userRole ?? 'STUDENT')
    )

  const visibleItems = filterByRole(MOBILE_NAV_ITEMS)
  const moreItems = filterByRole(MORE_NAV_ITEMS)

  const handleNav = (id: ModuleId) => {
    setActiveModule(id)
    setMoreOpen(false)
  }

  return (
    <>
      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="flex h-[60px] items-center justify-around px-1">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = activeModule === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 py-1 min-w-0 flex-1 transition-colors duration-150',
                  isActive ? 'text-emerald-600' : 'text-slate-400 active:text-slate-600'
                )}
              >
                {isActive && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-emerald-600" />
                )}
                <Icon className={cn('size-[22px]', isActive && 'drop-shadow-sm')} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </button>
            )
          })}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 py-1 min-w-0 flex-1 transition-colors duration-150',
              moreItems.some((i) => activeModule === i.id)
                ? 'text-emerald-600'
                : 'text-slate-400 active:text-slate-600'
            )}
          >
            {moreItems.some((i) => activeModule === i.id) && (
              <span className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-emerald-600" />
            )}
            <Grid3X3 className="size-[22px]" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] p-0">
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle className="text-left text-base font-semibold text-slate-800">
              All Modules
            </SheetTitle>
          </SheetHeader>
          <nav className="px-3 pb-6">
            <ul className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon
                const isActive = activeModule === item.id
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNav(item.id)}
                      className={cn(
                        'flex items-center gap-3 w-full rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-150 border',
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]'
                      )}
                    >
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        isActive ? 'bg-emerald-100' : 'bg-slate-100'
                      )}>
                        <Icon className="size-[18px]" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
