'use client'

import { Search, Bell, User, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { NAV_ITEMS, type ModuleId } from '@/lib/constants'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const activeModule = useAppStore((s) => s.activeModule)

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  const activeLabel = NAV_ITEMS.find((i) => i.id === activeModule)?.label ?? 'Dashboard'
  const ActiveIcon = NAV_ITEMS.find((i) => i.id === activeModule)?.icon

  const roleBadgeColor =
    user?.role === 'ADMIN'
      ? 'bg-rose-50 text-rose-600 border-rose-200'
      : user?.role === 'FACULTY'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-sky-50 text-sky-600 border-sky-200'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
        {/* Left: Page title with icon */}
        <div className="flex items-center gap-2.5 min-w-0">
          {ActiveIcon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <ActiveIcon className="size-4 text-slate-600" />
            </div>
          )}
          <h1 className="text-sm font-semibold text-slate-800 truncate hidden sm:block">
            {activeLabel}
          </h1>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Search — desktop */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex items-center gap-2 text-slate-400 hover:text-slate-600 h-9 px-3 rounded-lg hover:bg-slate-100"
          >
            <Search className="size-4" />
            <span className="text-xs font-medium">Search</span>
            <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-400">
              Ctrl+K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Search"
          >
            <Search className="size-[18px]" />
          </Button>

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-slate-200 mx-1" />

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell className="size-[18px]" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar ?? undefined} alt={user?.name} />
                  <AvatarFallback className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs font-medium text-slate-700 leading-none">
                    {user?.name ?? 'Guest'}
                  </span>
                  <span className={cn(
                    'text-[10px] font-medium mt-0.5 px-1.5 py-0 rounded border leading-none',
                    roleBadgeColor
                  )}>
                    {user?.role ?? 'STUDENT'}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-lg border-slate-200/80">
              <DropdownMenuLabel className="px-2 py-1.5">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium text-slate-800 leading-none">{user?.name ?? 'Guest'}</p>
                  <p className="text-xs text-slate-400 leading-none mt-1">{user?.email ?? 'Not signed in'}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem className="rounded-lg px-2 py-1.5 text-slate-600 focus:bg-slate-100 focus:text-slate-800 cursor-pointer">
                <User className="mr-2 size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg px-2 py-1.5 text-slate-600 focus:bg-slate-100 focus:text-slate-800 cursor-pointer">
                <Settings className="mr-2 size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                className="rounded-lg px-2 py-1.5 text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer"
                onClick={() => {
                  logout()
                  toast.success('Logged out successfully')
                }}
              >
                <LogOut className="mr-2 size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
