'use client'

import { Search, Bell, LogOut, User, CheckCheck, PanelLeftClose, PanelLeftOpen, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { NAV_ITEMS } from '@/lib/constants'
import { useNotifications } from '@/hooks/use-notifications'
import { SearchDialog } from '@/components/layout/search-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const setSearchOpen = useAppStore((s) => s.setSearchOpen)
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const { unreadCount, notifications, markRead, markAllRead, deleteNotification } = useNotifications()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
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
    <>
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-xl shadow-sm">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">

        {/* Left: Sidebar Toggle + Page title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors hidden lg:flex"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>

          {ActiveIcon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200/60">
              <ActiveIcon className="size-4 text-zinc-600" />
            </div>
          )}
          <h1 className="text-sm font-semibold text-zinc-800 truncate hidden sm:block">
            {activeLabel}
          </h1>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Search — desktop */}
          <button
            className="hidden md:flex items-center justify-between w-64 h-9 px-3 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/80 hover:border-zinc-300 transition-all outline-none cursor-pointer"
            onClick={() => setSearchOpen(true)}
          >
            <div className="flex items-center gap-2">
              <Search className="size-4 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500">Search anything...</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none select-none h-5 items-center justify-center rounded border border-zinc-200 bg-white px-1.5 font-mono text-[9px] font-medium text-zinc-400 inline-flex shadow-sm">
                Ctrl
              </kbd>
              <kbd className="pointer-events-none select-none h-5 items-center justify-center rounded border border-zinc-200 bg-white px-1.5 font-mono text-[9px] font-medium text-zinc-400 inline-flex shadow-sm">
                K
              </kbd>
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-[18px]" />
          </Button>

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-zinc-200 mx-1" />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="size-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-xl p-0 shadow-lg border border-zinc-200 bg-white text-zinc-800">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100">
                <span className="text-sm font-semibold text-zinc-850">Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="size-3" /> Mark all read
                    </button>
                  )}
                  <button
                    className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
              <ScrollArea className="h-80">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                    <Bell className="size-7 mb-2 opacity-40" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-50">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.isRead) markRead(n.id)
                          if (n.linkUrl) {
                            const moduleId = n.linkUrl.replace('/', '')
                            setActiveModule(moduleId as any)
                          }
                        }}
                        className={cn(
                          'group/item flex items-start gap-2 px-3 py-2.5 hover:bg-zinc-50 transition-colors cursor-pointer text-left',
                          !n.isRead && 'bg-emerald-50/50'
                        )}
                      >
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className={cn('text-xs truncate', n.isRead ? 'font-medium text-zinc-700' : 'font-semibold text-zinc-800')}>
                              {n.title}
                            </span>
                            {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                          </div>
                          <p className="text-[11px] text-zinc-500 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-zinc-400 mt-0.5">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(n.id)
                            toast.success('Notification deleted')
                          }}
                          className="opacity-0 group-hover/item:opacity-100 p-1.5 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-all shrink-0 self-center cursor-pointer"
                          aria-label="Delete notification"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-zinc-200 mx-1" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 bg-zinc-50/40 border border-zinc-200 hover:bg-zinc-100/90 hover:border-zinc-300 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-pointer"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8 ring-2 ring-zinc-100 shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <AvatarImage src={user?.avatar ?? undefined} alt={user?.name} />
                  <AvatarFallback className="bg-orange-600 text-white text-[11px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start gap-1">
                  <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-900 leading-none transition-colors duration-200">
                    {user?.name ?? 'Guest'}
                  </span>
                  <span className={cn(
                    'text-[8px] font-bold px-1.5 py-0.5 rounded border leading-none tracking-wider uppercase transition-colors duration-200',
                    roleBadgeColor
                  )}>
                    {user?.role ?? 'STUDENT'}
                  </span>
                </div>
                <ChevronDown className="hidden sm:block size-3.5 text-zinc-400 group-hover:text-zinc-600 ml-0.5 shrink-0 transition-colors duration-200" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-lg border border-zinc-200 bg-white text-zinc-800">
              <DropdownMenuLabel className="px-2 py-1.5">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-zinc-800 leading-none">{user?.name ?? 'Guest'}</p>
                  <p className="text-xs text-zinc-400 leading-none">{user?.email ?? 'Not signed in'}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-100" />
              <DropdownMenuItem
                className="rounded-lg px-2 py-1.5 text-zinc-600 focus:bg-zinc-50 focus:text-zinc-900 cursor-pointer gap-2"
                onClick={() => setActiveModule('profile')}
              >
                <User className="size-4 text-zinc-400" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-100" />
              <DropdownMenuItem
                className="rounded-lg px-2 py-1.5 text-red-650 focus:bg-red-50 focus:text-red-750 cursor-pointer gap-2"
                onClick={() => {
                  logout()
                  toast.success('Logged out successfully')
                }}
              >
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
       </div>
     </header>
     <SearchDialog />
    </>
   )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return new Date(dateStr).toLocaleDateString()
}
