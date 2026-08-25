import type { DayOfWeek } from '@prisma/client'

/** Two slots clash when each starts before the other ends. Times are "HH:MM". */
export function timeOverlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const aStart = toMin(startA)
  const aEnd = toMin(endA)
  const bStart = toMin(startB)
  const bEnd = toMin(endB)
  return aStart < bEnd && bStart < aEnd
}

/**
 * Section strings are inconsistent across the data ("A", "Morning A",
 * "Morning"), so a student's section is expanded into every spelling that
 * should match it when filtering a timetable.
 */
export function getCompatibleSections(studentSection: string | null, studentSession: string | null): string[] {
  if (!studentSection) return []
  
  const sections = [studentSection]
  const sectionLower = studentSection.toLowerCase().trim()
  
  // If section is "Morning A" or "Morning B", also include "Morning" and the letter ("A"/"B")
  if (sectionLower.startsWith('morning ')) {
    sections.push('Morning')
    const letter = studentSection.substring(8).trim() // e.g. "A" or "B"
    if (letter) {
      sections.push(letter)
      sections.push(letter.toUpperCase())
      sections.push(letter.toLowerCase())
    }
  }
  // If section is "Evening A" or "Evening B", also include "Evening" and the letter ("A"/"B")
  else if (sectionLower.startsWith('evening ')) {
    sections.push('Evening')
    const letter = studentSection.substring(8).trim()
    if (letter) {
      sections.push(letter)
      sections.push(letter.toUpperCase())
      sections.push(letter.toLowerCase())
    }
  }
  // If section is just "A" or "B"
  else if (sectionLower === 'a' || sectionLower === 'b') {
    sections.push(studentSection)
    sections.push(studentSection.toUpperCase())
    sections.push(studentSection.toLowerCase())
    // If we have shift information
    if (studentSession) {
      const shiftName = studentSession.charAt(0).toUpperCase() + studentSession.slice(1).toLowerCase() // e.g. "Morning"
      sections.push(shiftName)
      sections.push(shiftName.toLowerCase())
      sections.push(`${shiftName} ${studentSection.toUpperCase()}`) // e.g. "Morning A"
      sections.push(`${shiftName} ${studentSection.toLowerCase()}`) // e.g. "Morning a"
    }
  }
  // If section is "Morning" or "Evening"
  else if (sectionLower === 'morning') {
    sections.push('Morning')
    sections.push('morning')
    sections.push('Morning A')
    sections.push('Morning B')
    sections.push('A')
    sections.push('B')
  }
  else if (sectionLower === 'evening') {
    sections.push('Evening')
    sections.push('evening')
    sections.push('Evening A')
    sections.push('Evening B')
    sections.push('A')
    sections.push('B')
  }

  // Deduplicate and filter out empty strings
  return Array.from(new Set(sections.filter(Boolean)))
}

export type { DayOfWeek }
