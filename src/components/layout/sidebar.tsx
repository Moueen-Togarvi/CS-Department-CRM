'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function Sidebar() {
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const user = useAuthStore((s) => s.user)
  const userRole = user?.role

  const filteredItems = NAV_ITEMS.filter(
    (item) => item.roles.includes('ALL') || item.roles.includes(userRole ?? 'STUDENT')
  )

  const mainItems = filteredItems.slice(0, 5)
  const secondaryItems = filteredItems.slice(5)

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'hidden lg:flex flex-col h-full border-r bg-white shrink-0 transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-[60px]' : 'w-[220px]'
        )}
      >
        {/* Logo + Collapse toggle */}
        <div className="flex items-center h-14 shrink-0 px-2">
          <button
            onClick={toggleSidebar}
            className="flex items-center gap-2 w-full px-1.5 h-10 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-sm">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
            </div>
            {!collapsed && (
              <span className="text-sm font-bold text-slate-800 truncate">CS Dept</span>
            )}
            <span className="ml-auto text-slate-300 hover:text-slate-500 transition-colors">
              {collapsed
                ? <PanelLeftOpen className="size-4" />
                : <PanelLeftClose className="size-4" />}
            </span>
          </button>
        </div>

        <Separator className="opacity-60" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-3 pb-2">
          <ul className="space-y-0.5">
            {mainItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
                isActive={activeModule === item.id}
                onClick={() => setActiveModule(item.id)}
              />
            ))}
          </ul>

          {secondaryItems.length > 0 && (
            <>
              <Separator className="my-2.5 opacity-40" />
              <ul className="space-y-0.5">
                {secondaryItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    collapsed={collapsed}
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
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
            CS
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  collapsed,
  isActive,
  onClick,
}: {
  icon: LucideIcon
  label: string
  collapsed: boolean
  isActive: boolean
  onClick: () => void
}) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex h-9 w-full items-center rounded-lg text-sm transition-all duration-150',
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
        isActive
          ? 'bg-emerald-50 text-emerald-700 font-medium'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-normal'
      )}
      aria-label={label}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-emerald-600" />
      )}
      <Icon
        className={cn(
          'size-[18px] shrink-0',
          isActive ? 'text-emerald-600' : 'group-hover:scale-110 transition-transform duration-150'
        )}
      />
      {!collapsed && <span className="truncate text-[13px]">{label}</span>}
    </button>
  )

  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="font-medium text-xs shadow-lg border-slate-200/80 rounded-lg px-3 py-1.5">
            {label}
          </TooltipContent>
        </Tooltip>
      </li>
    )
  }

  return <li>{content}</li>
}
