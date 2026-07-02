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
  semester?: number | null
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: any) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => {
    if (!user) {
      set({ user: null, isAuthenticated: false, isLoading: false })
      return
    }
    const flatUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      studentId: user.studentId ?? user.student?.id ?? null,
      facultyId: user.facultyId ?? user.faculty?.id ?? null,
      semester: user.semester ?? user.student?.currentSemester ?? null,
    }
    set({ user: flatUser, isAuthenticated: true, isLoading: false })
  },
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => {
    signOut({ redirect: false })
    set({ user: null, isAuthenticated: false, isLoading: false })
  },
}))