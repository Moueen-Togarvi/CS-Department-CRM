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
    (item) => (item.roles.includes('ALL') || item.roles.includes(userRole ?? 'STUDENT')) && item.id !== 'profile'
  )

  // Define section order
  const sections = ['CORE', 'PEOPLE', 'ACADEMICS', 'RECORDS', 'ACCOUNT'] as const

  // Group items by section
  const groupedItems = sections.reduce((acc, section) => {
    const items = filteredItems.filter((item) => item.section === section)
    if (items.length > 0) {
      acc.push({ name: section, items })
    }
    return acc
  }, [] as Array<{ name: string; items: typeof filteredItems }>)

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'hidden lg:flex flex-col h-full border-r bg-white shrink-0 transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-[56px]' : 'w-[215px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-12 shrink-0 px-4.5",
          collapsed && "justify-center px-0"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-sm">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
            </div>
            {!collapsed && (
              <span className="text-sm font-bold text-slate-800 truncate">CS Dept</span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-2">
          {groupedItems.map((group, groupIdx) => (
            <div key={group.name} className={cn("mb-3", groupIdx === 0 && "mt-1")}>
              {!collapsed && (
                <div className="px-4.5 py-0.5 text-[10px] font-bold text-slate-400 tracking-wider select-none opacity-85">
                  {group.name}
                </div>
              )}
              {collapsed && groupIdx > 0 && (
                <Separator className="my-1.5 opacity-25 mx-3 w-auto" />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
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
            </div>
          ))}
        </nav>

        <Separator className="opacity-40" />
        <div className="flex items-center justify-center px-2 py-2">
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
        'group relative flex h-[31px] w-full items-center text-[13px] transition-all duration-150',
        collapsed ? 'justify-center px-0 mx-1.5 w-[calc(100%-12px)] rounded-lg' : 'gap-2.5 pl-[18px] pr-3 rounded-r-full mr-3',
        isActive
          ? 'bg-emerald-50 text-emerald-800 font-semibold'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold'
      )}
      aria-label={label}
    >
      {isActive && (
        <span className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-emerald-600",
          collapsed ? "h-4 w-[3px]" : "h-5 w-[3px]"
        )} />
      )}
      <Icon
        className={cn(
          'size-[15px] shrink-0 transition-all duration-150',
          isActive ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-800'
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
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
