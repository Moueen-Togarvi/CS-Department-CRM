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
  CalendarClock,
  UserCircle,
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
  | 'classrooms'
  | 'profile'
  | 'my-attendance'

export type RoleAccess = 'ALL' | 'ADMIN' | 'FACULTY' | 'STUDENT'

export interface NavItem {
  id: ModuleId
  label: string
  icon: LucideIcon
  roles: RoleAccess[]
  section: 'CORE' | 'PEOPLE' | 'ACADEMICS' | 'RECORDS' | 'ACCOUNT'
}

// All navigation items for the sidebar
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ALL'],
    section: 'CORE',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: Megaphone,
    roles: ['ALL'],
    section: 'CORE',
  },
  {
    id: 'students',
    label: 'Students',
    icon: GraduationCap,
    roles: ['ADMIN', 'FACULTY'],
    section: 'PEOPLE',
  },
  {
    id: 'faculty',
    label: 'Faculty',
    icon: Users,
    roles: ['ADMIN'],
    section: 'PEOPLE',
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: BookOpen,
    roles: ['ALL'],
    section: 'ACADEMICS',
  },
  {
    id: 'timetable',
    label: 'Timetable',
    icon: CalendarDays,
    roles: ['ALL'],
    section: 'ACADEMICS',
  },
  {
    id: 'classrooms',
    label: 'Classrooms',
    icon: School,
    roles: ['ADMIN', 'FACULTY'],
    section: 'ACADEMICS',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: ClipboardCheck,
    roles: ['ADMIN', 'FACULTY'],
    section: 'RECORDS',
  },
  {
    id: 'my-attendance',
    label: 'My Attendance',
    icon: ClipboardCheck,
    roles: ['STUDENT'],
    section: 'RECORDS',
  },
  {
    id: 'results',
    label: 'Results',
    icon: BarChart3,
    roles: ['ALL'],
    section: 'RECORDS',
  },
  {
    id: 'fyp',
    label: 'FYP Projects',
    icon: FolderKanban,
    roles: ['ALL'],
    section: 'RECORDS',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    roles: ['ALL'],
    section: 'RECORDS',
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: UserCircle,
    roles: ['ALL'],
    section: 'ACCOUNT',
  },
]

// Role-aware mobile bottom nav: first few visible tabs per role
export function getMobileNavItems(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) =>
    item.roles.includes('ALL') || item.roles.includes(role as RoleAccess)
  ).slice(0, 4)
}

export function getMoreNavItems(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) =>
    item.roles.includes('ALL') || item.roles.includes(role as RoleAccess)
  ).slice(4)
}