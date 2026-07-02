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
  url: string
}

// All navigation items for the sidebar
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ALL'],
    section: 'CORE',
    url: '/',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: Megaphone,
    roles: ['ALL'],
    section: 'CORE',
    url: '/announcements',
  },
  {
    id: 'students',
    label: 'Students',
    icon: GraduationCap,
    roles: ['ADMIN', 'FACULTY'],
    section: 'PEOPLE',
    url: '/students',
  },
  {
    id: 'faculty',
    label: 'Faculty',
    icon: Users,
    roles: ['ADMIN'],
    section: 'PEOPLE',
    url: '/faculty',
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: BookOpen,
    roles: ['ALL'],
    section: 'ACADEMICS',
    url: '/courses',
  },
  {
    id: 'timetable',
    label: 'Timetable',
    icon: CalendarDays,
    roles: ['ALL'],
    section: 'ACADEMICS',
    url: '/timetable',
  },
  {
    id: 'classrooms',
    label: 'Classrooms',
    icon: School,
    roles: ['ADMIN', 'FACULTY'],
    section: 'ACADEMICS',
    url: '/classrooms',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: ClipboardCheck,
    roles: ['ADMIN', 'FACULTY'],
    section: 'RECORDS',
    url: '/attendance',
  },
  {
    id: 'my-attendance',
    label: 'My Attendance',
    icon: ClipboardCheck,
    roles: ['STUDENT'],
    section: 'RECORDS',
    url: '/my-attendance',
  },
  {
    id: 'results',
    label: 'Results',
    icon: BarChart3,
    roles: ['ALL'],
    section: 'RECORDS',
    url: '/results',
  },
//   {
//     id: 'fyp',
//     label: 'FYP Projects',
//     icon: FolderKanban,
//     roles: ['ALL'],
//     section: 'RECORDS',
//     url: '/fyp',
//   },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    roles: ['ALL'],
    section: 'RECORDS',
    url: '/documents',
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: UserCircle,
    roles: ['ALL'],
    section: 'ACCOUNT',
    url: '/profile',
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