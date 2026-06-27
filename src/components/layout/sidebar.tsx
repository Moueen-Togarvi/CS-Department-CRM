'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export function Sidebar() {
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const user = useAuthStore((s) => s.user)
  const userRole = user?.role

  const filteredItems = NAV_ITEMS.filter(
    (item) => item.roles.includes('ALL') || item.roles.includes(userRole ?? 'STUDENT')
  )

  const mainItems = filteredItems.slice(0, 5)
  const secondaryItems = filteredItems.slice(5)

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="hidden lg:flex flex-col h-full w-[68px] border-r bg-white shrink-0">
        <div className="flex items-center justify-center h-14 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-sm shadow-emerald-600/20">
            <svg className="h-[18px] w-[18px] text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
            </svg>
          </div>
        </div>

        <Separator className="opacity-60" />

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-3 pb-2">
          <ul className="space-y-1">
            {mainItems.map((item) => (
              <SidebarIcon
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={activeModule === item.id}
                onClick={() => setActiveModule(item.id)}
              />
            ))}
          </ul>

          {secondaryItems.length > 0 && (
            <>
              <Separator className="my-3 opacity-40" />
              <ul className="space-y-1">
                {secondaryItems.map((item) => (
                  <SidebarIcon
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    isActive={activeModule === item.id}
                    onClick={() => setActiveModule(item.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </nav>

        <Separator className="opacity-60" />
        <div className="flex items-center justify-center px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
            CS
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}

function SidebarIcon({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: LucideIcon
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'group relative flex h-10 w-full items-center justify-center rounded-xl text-sm transition-all duration-150',
              isActive
                ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-600/10'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            )}
            aria-label={label}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-600" />
            )}
            <Icon
              className={cn(
                'size-[20px]',
                isActive
                  ? 'text-emerald-600'
                  : 'group-hover:scale-110 transition-transform duration-150'
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="font-medium text-xs shadow-lg border-slate-200/80 rounded-lg px-3 py-1.5"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </li>
  )
}
