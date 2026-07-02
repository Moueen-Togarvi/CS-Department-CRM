'use client'

import * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NAV_ITEMS } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const userRole = user?.role

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.id === 'profile') return false
    const roleMatch = item.roles.includes('ALL') || item.roles.includes(userRole ?? 'STUDENT')
    if (!roleMatch) return false
    
    // FYP is only for all faculty/admins, but for students, only semester 7 and 8
    if (item.id === 'fyp' && userRole === 'STUDENT') {
      const sem = user?.semester
      if (sem !== 7 && sem !== 8) {
        return false
      }
    }
    
    return true
  })

  const sections = ['CORE', 'PEOPLE', 'ACADEMICS', 'RECORDS', 'ACCOUNT'] as const

  const groupedItems = sections.reduce((acc, section) => {
    const items = filteredItems.filter((item) => item.section === section)
    if (items.length > 0) {
      acc.push({ name: section, items })
    }
    return acc
  }, [] as Array<{ name: string; items: typeof filteredItems }>)

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="p-1">
        <div className="flex items-center h-10 shrink-0 px-2 gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-sm">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
            </svg>
          </div>
          <span className="text-sm font-bold text-zinc-800 truncate">CS Dept</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="overflow-hidden py-1 gap-1">
        {groupedItems.map((group) => (
          <SidebarGroup key={group.name} className="py-0.5 px-2 gap-0">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider h-5 text-zinc-400 font-semibold px-2">{group.name}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url))
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        size="sm"
                        className={cn(
                          isActive 
                            ? "bg-emerald-50 text-emerald-700 font-medium" 
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 font-medium"
                        )}
                      >
                        <Link href={item.url}>
                          <Icon className={cn("size-3.5", isActive ? "text-emerald-600" : "text-zinc-500")} />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
