import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  BarChart3,
  Megaphone,
  FolderKanban,
  FileText,
  School,
  type LucideIcon,
} from 'lucide-react'

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

export type RoleAccess = 'ALL' | 'ADMIN' | 'FACULTY' | 'STUDENT'

export interface NavItem {
  id: ModuleId
  label: string
  icon: LucideIcon
  roles: RoleAccess[]
}

// All navigation items for the sidebar
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ALL'],
  },
  {
    id: 'students',
    label: 'Students',
    icon: GraduationCap,
    roles: ['ADMIN', 'FACULTY'],
  },
  {
    id: 'faculty',
    label: 'Faculty',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: BookOpen,
    roles: ['ALL'],
  },
  {
    id: 'timetable',
    label: 'Timetable',
    icon: CalendarDays,
    roles: ['ALL'],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: ClipboardCheck,
    roles: ['ADMIN', 'FACULTY'],
  },
  {
    id: 'results',
    label: 'Results',
    icon: BarChart3,
    roles: ['ALL'],
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: Megaphone,
    roles: ['ALL'],
  },
  {
    id: 'fyp',
    label: 'FYP Projects',
    icon: FolderKanban,
    roles: ['ALL'],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    roles: ['ALL'],
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: School,
    roles: ['ADMIN'],
  },
]

// First 4 items for mobile bottom nav (visible tabs)
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.slice(0, 4)

// Remaining items (shown in "More" sheet)
export const MORE_NAV_ITEMS: NavItem[] = NAV_ITEMS.slice(4)