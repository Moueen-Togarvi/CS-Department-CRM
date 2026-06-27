import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get current semester
    const currentSemester = await db.semester.findFirst({
      where: { isCurrent: true },
    })

    if (!currentSemester) {
      return successResponse([])
    }

    // Get all attendance records for the current semester
    const attendanceRecords = await db.attendance.findMany({
      where: { semesterId: currentSemester.id },
      select: { date: true, status: true },
      orderBy: { date: 'asc' },
    })

    if (attendanceRecords.length === 0) {
      return successResponse([])
    }

    // Group by week
    const weekMap = new Map<string, { present: number; total: number }>()

    for (const record of attendanceRecords) {
      const date = new Date(record.date)
      // Calculate ISO week number
      const weekStart = getWeekStart(date)
      const weekKey = `Week ${getWeekNumber(date)}`

      const existing = weekMap.get(weekKey) || { present: 0, total: 0 }
      existing.total++
      if (record.status === 'PRESENT' || record.status === 'LATE') {
        existing.present++
      }
      weekMap.set(weekKey, existing)
    }

    // Convert to array sorted by week
    const entries = Array.from(weekMap.entries()).sort((a, b) => {
      const numA = parseInt(a[0].replace('Week ', ''))
      const numB = parseInt(b[0].replace('Week ', ''))
      return numA - numB
    })

    const data = entries.map(([week, counts]) => ({
      week,
      percentage: Math.round((counts.present / counts.total) * 100),
    }))

    return successResponse(data)
  } catch (error) {
    console.error('Attendance trend error:', error)
    return successResponse(
      [],
      'Error loading attendance trend',
      500
    )
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // Monday as first day of week
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(d.setDate(diff))
  const oneJan = new Date(d.getFullYear(), 0, 1)
  const days = Math.floor((weekStart.getTime() - oneJan.getTime()) / 86400000)
  return Math.ceil((days + oneJan.getDay() + 1) / 7)
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
