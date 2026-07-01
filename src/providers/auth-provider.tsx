'use client'

import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/auth/session', {
          method: 'GET',
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              avatar: data.user.avatar,
              studentId: data.user.student?.id ?? null,
              facultyId: data.user.faculty?.id ?? null,
            })
            setLoading(false)
            return
          }
        }
      } catch {
        // Not authenticated
      }
      setUser(null)
      setLoading(false)
    }

    checkSession()
  }, [setUser, setLoading])

  return <>{children}</>
}