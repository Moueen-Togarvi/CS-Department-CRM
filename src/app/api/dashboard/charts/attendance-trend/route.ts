import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'

export type Granularity = 'daily' | 'weekly' | 'monthly'

const GRANULARITIES: Granularity[] = ['daily', 'weekly', 'monthly']
const UNASSIGNED_SEMESTER = 0

// All bucketing is done in UTC so the result never shifts with the server timezone.
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function bucketStart(date: Date, granularity: Granularity): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  if (granularity === 'monthly') {
    d.setUTCDate(1)
    return d
  }
  if (granularity === 'weekly') {
    const day = d.getUTCDay() // 0 = Sunday
    d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1)) // back to Monday
  }
  return d
}

function bucketLabel(start: Date, granularity: Granularity): string {
  if (granularity === 'monthly') return monthFmt.format(start)
  if (granularity === 'daily') return weekdayFmt.format(start)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  return `${dayFmt.format(start)} – ${dayFmt.format(end)}`
}

type Counts = { present: number; total: number }

function percentage({ present, total }: Counts): number {
  return total > 0 ? Math.round((present / total) * 100) : 0
}

function semesterName(semester: number): string {
  return semester === UNASSIGNED_SEMESTER ? 'Unassigned' : `Semester ${semester}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const requested = searchParams.get('granularity') as Granularity | null
    const granularity: Granularity =
      requested && GRANULARITIES.includes(requested) ? requested : 'weekly'

    const semesterParam = searchParams.get('semester')
    const semesterFilter =
      semesterParam && semesterParam !== 'all' ? Number(semesterParam) : null

    const currentSemester = await db.semester.findFirst({ where: { isCurrent: true } })

    // Faculty attendance rows carry no student, so they can't belong to a class.
    const baseWhere = { studentId: { not: null } }
    const select = {
      date: true,
      status: true,
      // The course's own semester, not the student's current one — a student's
      // `currentSemester` moves on promotion and would re-bucket old records.
      course: { select: { semesterOffered: true } },
    } as const

    let records = await db.attendance.findMany({
      where: currentSemester ? { ...baseWhere, semesterId: currentSemester.id } : baseWhere,
      select,
      orderBy: { date: 'asc' },
    })

    // If the current term has nothing recorded yet, fall back to all history.
    if (records.length === 0 && currentSemester) {
      records = await db.attendance.findMany({ where: baseWhere, select, orderBy: { date: 'asc' } })
    }

    const empty = {
      granularity,
      semesters: [] as number[],
      period: null,
      previousPeriod: null,
      data: [] as unknown[],
    }

    if (records.length === 0) {
      return successResponse(empty)
    }

    // Bucket by period, then by semester within each period.
    const buckets = new Map<number, { start: Date; bySemester: Map<number, Counts> }>()
    const semesters = new Set<number>()

    for (const record of records) {
      const semester = record.course?.semesterOffered ?? UNASSIGNED_SEMESTER
      semesters.add(semester)

      const start = bucketStart(new Date(record.date), granularity)
      const key = start.getTime()

      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = { start, bySemester: new Map() }
        buckets.set(key, bucket)
      }

      const counts = bucket.bySemester.get(semester) ?? { present: 0, total: 0 }
      counts.total++
      if (record.status === 'PRESENT' || record.status === 'LATE') counts.present++
      bucket.bySemester.set(semester, counts)
    }

    const ordered = Array.from(buckets.values()).sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    )

    // One bar per semester, for the most recent period at this granularity.
    const latest = ordered[ordered.length - 1]
    const previous = ordered.length > 1 ? ordered[ordered.length - 2] : null

    const semesterList = Array.from(semesters)
      .sort((a, b) => a - b)
      .filter((semester) => semesterFilter === null || semester === semesterFilter)

    const data = semesterList.map((semester) => {
      const counts = latest.bySemester.get(semester) ?? null
      const previousCounts = previous?.bySemester.get(semester) ?? null
      return {
        semester,
        name: semesterName(semester),
        percentage: counts ? percentage(counts) : 0,
        present: counts?.present ?? 0,
        total: counts?.total ?? 0,
        // null means "no classes held", which the tooltip shows instead of 0%.
        hasClasses: counts !== null && counts.total > 0,
        previous: previousCounts ? percentage(previousCounts) : null,
      }
    })

    return successResponse({
      granularity,
      semesters: Array.from(semesters).sort((a, b) => a - b),
      period: { label: bucketLabel(latest.start, granularity) },
      previousPeriod: previous ? { label: bucketLabel(previous.start, granularity) } : null,
      data,
    })
  } catch (error) {
    console.error('Attendance trend error:', error)
    return successResponse(
      {
        granularity: 'weekly' as Granularity,
        semesters: [] as number[],
        period: null,
        previousPeriod: null,
        data: [] as unknown[],
      },
      'Error loading attendance trend',
      500
    )
  }
}
