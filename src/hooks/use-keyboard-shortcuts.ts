'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NAV_ITEMS, type ModuleId } from '@/lib/constants'

const KEY_MAP: Record<string, ModuleId> = {
  '1': 'dashboard',
  '2': 'students',
  '3': 'faculty',
  '4': 'courses',
  '5': 'timetable',
  '6': 'attendance',
  '7': 'results',
  '8': 'announcements',
//   '9': 'fyp',
  '0': 'documents',
}

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only trigger when no input/textarea is focused
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) {
        return
      }

      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return

      const key = e.key
      if (key in KEY_MAP) {
        e.preventDefault()
        const targetId = KEY_MAP[key]
        const target = NAV_ITEMS.find((item) => item.id === targetId)
        if (target) {
          router.push(target.url)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])
}