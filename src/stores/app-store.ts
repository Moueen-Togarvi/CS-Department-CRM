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

interface AppState {
  activeModule: ModuleId
  setActiveModule: (module: ModuleId) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),
}))
