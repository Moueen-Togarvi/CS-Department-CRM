import { create } from 'zustand'

export type ModuleId =
  | 'dashboard'
  | 'students'
  | 'faculty'
  | 'courses'
  | 'timetable'
  | 'attendance'
  | 'results'
  | 'announcements'
  | 'fyp'
  | 'documents'
  | 'rooms'
  | 'profile'
  | 'my-attendance'

interface AppState {
  activeModule: ModuleId
  setActiveModule: (module: ModuleId) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  sidebarCollapsed: true,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
