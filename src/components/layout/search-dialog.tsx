'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { useAppStore } from '@/stores/app-store'
import { GraduationCap, BookOpen, Megaphone, FileText, Users, Presentation, DoorOpen } from 'lucide-react'
import type { ModuleId } from '@/lib/constants'

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string
  extra?: string
  moduleId: string
}

const TYPE_META: Record<string, { icon: any; label: string; group: string }> = {
  student: { icon: GraduationCap, label: 'Students', group: 'People' },
  faculty: { icon: Users, label: 'Faculty', group: 'People' },
  course: { icon: BookOpen, label: 'Courses', group: 'Academics' },
  announcement: { icon: Megaphone, label: 'Announcements', group: 'General' },
  document: { icon: FileText, label: 'Documents', group: 'General' },
  room: { icon: DoorOpen, label: 'Rooms', group: 'Facilities' },
}

export function SearchDialog() {
  const searchOpen = useAppStore((s) => s.searchOpen)
  const setSearchOpen = useAppStore((s) => s.setSearchOpen)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  const handleSelect = (r: SearchResult) => {
    setActiveModule(r.moduleId as ModuleId)
    setSearchOpen(false)
    setQuery('')
    setResults([])
  }

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(!searchOpen)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen, setSearchOpen])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`)
      const json = await res.json()
      setResults(json.data?.results || [])
    } catch {
      setResults([])
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 250)
    return () => clearTimeout(t)
  }, [query, doSearch])

  // Reset on close
  useEffect(() => {
    if (!searchOpen) {
      setQuery('')
      setResults([])
    }
  }, [searchOpen])

  // Group results
  const groups = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const g = TYPE_META[r.type]?.group || 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(r)
    return acc
  }, {})

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      title="Search"
      description="Search across students, courses, announcements, and more."
    >
      <CommandInput
        placeholder="Search students, courses, announcements..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query.length < 2 ? 'Type at least 2 characters...' : 'No results found.'}
        </CommandEmpty>

        {query.length < 2 && (
          <CommandGroup heading="Quick Navigation">
            <CommandItem onSelect={() => handleSelect({ type: 'nav', id: '', title: '', subtitle: '', moduleId: 'dashboard' })}>
              <Presentation className="size-4 text-slate-400" /> Dashboard
            </CommandItem>
            <CommandItem onSelect={() => handleSelect({ type: 'nav', id: '', title: '', subtitle: '', moduleId: 'courses' })}>
              <BookOpen className="size-4 text-slate-400" /> Courses
            </CommandItem>
            <CommandItem onSelect={() => handleSelect({ type: 'nav', id: '', title: '', subtitle: '', moduleId: 'announcements' })}>
              <Megaphone className="size-4 text-slate-400" /> Announcements
            </CommandItem>
            <CommandItem onSelect={() => handleSelect({ type: 'nav', id: '', title: '', subtitle: '', moduleId: 'profile' })}>
              <Users className="size-4 text-slate-400" /> My Profile
            </CommandItem>
          </CommandGroup>
        )}

        {Object.entries(groups).map(([groupName, items]) => (
          <CommandGroup key={groupName} heading={groupName}>
            {items.map((r) => {
              const meta = TYPE_META[r.type]
              const Icon = meta?.icon || FileText
              return (
                <CommandItem key={`${r.type}-${r.id}`} value={`${r.title} ${r.subtitle} ${r.extra || ''}`} onSelect={() => handleSelect(r)}>
                  <Icon className="size-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-800">{r.title}</span>
                    <span className="text-xs text-slate-400">{r.subtitle}{r.extra ? ` · ${r.extra}` : ''}</span>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
