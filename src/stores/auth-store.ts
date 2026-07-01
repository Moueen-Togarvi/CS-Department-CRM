import { create } from 'zustand'
import { signOut } from 'next-auth/react'

type UserRole = 'ADMIN' | 'FACULTY' | 'STUDENT'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string | null
  studentId?: string | null
  facultyId?: string | null
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => {
    signOut({ redirect: false })
    set({ user: null, isAuthenticated: false, isLoading: false })
  },
}))