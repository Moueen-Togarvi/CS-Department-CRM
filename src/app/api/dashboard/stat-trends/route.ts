import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { handleApiError, requireAdmin } from '@/lib/auth-utils'

type Point = { date: string; value: number }
type Series = { total: number; series: Point[] }

const WEEK_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const

/** Local-midnight timestamp so the chart's `new Date()` lands on the right day. */
function stamp(year: number, month = 1, day = 1): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`
}

function runningTotal(counts: Map<number, number>): Point[] {
  let cumulative = 0
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => {
      cumulative += count
      return { date: stamp(year), value: cumulative }
    })
}

function finalise(series: Point[], total: number): Series {
  return { total, series }
}

export async function GET() {
  try {
    await requireAdmin()

    const [students, faculty, totalRooms, announcements, timetable] = await Promise.all([
      db.student.findMany({ select: { enrollmentYear: true } }),
      db.faculty.findMany({ select: { joiningDate: true } }),
      db.room.count(),
      db.announcement.findMany({
        where: { isPublished: true },
        select: { publishedAt: true, createdAt: true },
      }),
      db.timetable.findMany({ select: { day: true, roomId: true } }),
    ])

    // Students — intake per enrollment year, accumulated into the running total.
    const studentYears = new Map<number, number>()
    for (const s of students) {
      studentYears.set(s.enrollmentYear, (studentYears.get(s.enrollmentYear) ?? 0) + 1)
    }

    // Faculty — same idea, keyed on when each member joined.
    const facultyYears = new Map<number, number>()
    for (const f of faculty) {
      if (!f.joiningDate) continue
      const year = f.joiningDate.getUTCFullYear()
      facultyYears.set(year, (facultyYears.get(year) ?? 0) + 1)
    }

    // Rooms have no history, so the sparkline shows how many are actually in
    // use on each weekday of the timetable instead of a fake growth curve.
    const roomsPerDay = new Map<string, Set<string>>()
    for (const slot of timetable) {
      const set = roomsPerDay.get(slot.day) ?? new Set<string>()
      set.add(slot.roomId)
      roomsPerDay.set(slot.day, set)
    }
    // Anchor to the Monday of the current week so the x values are real dates.
    const now = new Date()
    const monday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
    const roomSeries: Point[] = WEEK_ORDER.map((day, index) => {
      const date = new Date(monday)
      date.setUTCDate(date.getUTCDate() + index)
      return {
        date: stamp(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
        value: roomsPerDay.get(day)?.size ?? 0,
      }
    })

    // Announcements — how many were published each month.
    const perMonth = new Map<string, { year: number; month: number; count: number }>()
    for (const a of announcements) {
      const at = a.publishedAt ?? a.createdAt
      const key = `${at.getUTCFullYear()}-${at.getUTCMonth()}`
      const entry = perMonth.get(key) ?? {
        year: at.getUTCFullYear(),
        month: at.getUTCMonth() + 1,
        count: 0,
      }
      entry.count++
      perMonth.set(key, entry)
    }
    const announcementSeries: Point[] = [...perMonth.values()]
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map((entry) => ({ date: stamp(entry.year, entry.month), value: entry.count }))

    return successResponse({
      students: finalise(runningTotal(studentYears), students.length),
      faculty: finalise(runningTotal(facultyYears), faculty.length),
      rooms: finalise(roomSeries, totalRooms),
      announcements: finalise(announcementSeries, announcements.length),
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch stat trends')
  }
}
