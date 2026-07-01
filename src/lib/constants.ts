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
  | 'course-offerings'
  | 'timetable'
  | 'attendance'
  | 'results'
  | 'announcements'
  | 'fyp'
  | 'documents'
  | 'rooms'
  | 'profile'
  | 'my-attendance'

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
    id: 'course-offerings',
    label: 'Course Assign',
    icon: CalendarClock,
    roles: ['ADMIN'],
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
    id: 'my-attendance',
    label: 'My Attendance',
    icon: ClipboardCheck,
    roles: ['STUDENT'],
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
  {
    id: 'profile',
    label: 'My Profile',
    icon: UserCircle,
    roles: ['ALL'],
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