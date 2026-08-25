import { db } from '@/lib/db'
import type { Semester, SemesterType } from '@prisma/client'

interface TermInfo {
  type: SemesterType
  year: number
  name: string
  startDate: Date
  endDate: Date
}

/** Fall/Spring/Summer + year is derivable from today's date with no real ambiguity. */
export function resolveTermForDate(date: Date): TermInfo {
  const year = date.getFullYear()
  const month = date.getMonth() // 0 = January

  if (month <= 4) {
    // Jan – May
    return {
      type: 'SPRING',
      year,
      name: `Spring ${year}`,
      startDate: new Date(Date.UTC(year, 0, 15)),
      endDate: new Date(Date.UTC(year, 4, 31)),
    }
  }
  if (month <= 6) {
    // Jun – Jul
    return {
      type: 'SUMMER',
      year,
      name: `Summer ${year}`,
      startDate: new Date(Date.UTC(year, 5, 1)),
      endDate: new Date(Date.UTC(year, 6, 31)),
    }
  }
  // Aug – Dec
  return {
    type: 'FALL',
    year,
    name: `Fall ${year}`,
    startDate: new Date(Date.UTC(year, 7, 15)),
    endDate: new Date(Date.UTC(year, 11, 20)),
  }
}

/**
 * Return the current academic term, creating it if none exists.
 *
 * Timetable, course assignment, attendance, FYP, results and documents all
 * hang off a `Semester` row marked `isCurrent` — and there is no UI anywhere
 * in the app to create one; it previously only ever came from the seed
 * script. A fresh install, or any admin action that clears the table, left
 * every one of those features permanently dead-ended with no way to recover.
 *
 * This is safe to auto-provision because the term itself (Fall/Spring/Summer
 * + year) is unambiguous from today's date. Contrast with a Room: its name,
 * building and capacity are physical facts nobody can invent, so those are
 * never auto-created — only a person entering the real room can do that.
 */
export async function getOrCreateCurrentSemester(): Promise<Semester> {
  const current = await db.semester.findFirst({ where: { isCurrent: true } })
  if (current) return current

  const term = resolveTermForDate(new Date())

  return db.$transaction(async (tx) => {
    // Only one semester is ever "current" at a time.
    await tx.semester.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } })

    const existing = await tx.semester.findUnique({
      where: { type_year: { type: term.type, year: term.year } },
    })
    if (existing) {
      return tx.semester.update({
        where: { id: existing.id },
        data: { isCurrent: true, status: 'ACTIVE' },
      })
    }

    return tx.semester.create({
      data: {
        name: term.name,
        type: term.type,
        year: term.year,
        startDate: term.startDate,
        endDate: term.endDate,
        status: 'ACTIVE',
        isCurrent: true,
      },
    })
  })
}
