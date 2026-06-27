import type { AttendanceStatus } from '@/types/enums'

export function calculateAttendancePercentage(present: number, total: number): number {
  if (total === 0) return 0
  return Math.round((present / total) * 10000) / 100
}

export function getAttendanceStatusColor(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT': return 'text-emerald-600 bg-emerald-50'
    case 'ABSENT': return 'text-red-600 bg-red-50'
    case 'LATE': return 'text-amber-600 bg-amber-50'
    case 'EXCUSED': return 'text-blue-600 bg-blue-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function getAttendanceStatusDotColor(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT': return 'bg-emerald-500'
    case 'ABSENT': return 'bg-red-500'
    case 'LATE': return 'bg-amber-500'
    case 'EXCUSED': return 'bg-blue-500'
    default: return 'bg-gray-500'
  }
}