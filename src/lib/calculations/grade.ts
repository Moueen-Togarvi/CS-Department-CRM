import type { GradeScale, AttendanceStatus } from '@/types/enums'

export interface GradeInfo {
  grade: GradeScale
  gradePoint: number
  label: string
}

export const GRADE_SCALE: { min: number; max: number; grade: GradeScale; gradePoint: number; label: string }[] = [
  { min: 90, max: 100, grade: 'A', gradePoint: 4.0, label: 'Excellent' },
  { min: 85, max: 89, grade: 'A_MINUS', gradePoint: 3.7, label: 'Very Good' },
  { min: 80, max: 84, grade: 'B_PLUS', gradePoint: 3.3, label: 'Good' },
  { min: 75, max: 79, grade: 'B', gradePoint: 3.0, label: 'Good' },
  { min: 70, max: 74, grade: 'B_MINUS', gradePoint: 2.7, label: 'Above Average' },
  { min: 65, max: 69, grade: 'C_PLUS', gradePoint: 2.3, label: 'Average' },
  { min: 60, max: 64, grade: 'C', gradePoint: 2.0, label: 'Average' },
  { min: 55, max: 59, grade: 'C_MINUS', gradePoint: 1.7, label: 'Below Average' },
  { min: 50, max: 54, grade: 'D_PLUS', gradePoint: 1.3, label: 'Poor' },
  { min: 45, max: 49, grade: 'D', gradePoint: 1.0, label: 'Poor' },
  { min: 0, max: 44, grade: 'F', gradePoint: 0.0, label: 'Fail' },
]

export function calculateGrade(percentage: number): GradeInfo {
  const entry = GRADE_SCALE.find(g => percentage >= g.min && percentage <= g.max)
  if (!entry) return { grade: 'F', gradePoint: 0.0, label: 'Fail' }
  return { grade: entry.grade, gradePoint: entry.gradePoint, label: entry.label }
}

export function calculateGPA(
  results: { gradePoint: number | null; creditHours: number; labCreditHours?: number }[]
): number {
  let totalPoints = 0
  let totalCredits = 0

  for (const r of results) {
    const gp = r.gradePoint
    if (gp !== null && gp !== undefined && gp > 0) {
      const credits = (r.creditHours || 0) + (r.labCreditHours || 0)
      totalPoints += gp * credits
      totalCredits += credits
    }
  }

  return totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0
}

export function calculateTotalMarks(
  assignmentMarks?: number | null,
  quizMarks?: number | null,
  midtermMarks?: number | null,
  finalMarks?: number | null,
  labMarks?: number | null,
  projectMarks?: number | null
): number {
  let total = 0
  if (assignmentMarks != null) total += assignmentMarks
  if (quizMarks != null) total += quizMarks
  if (midtermMarks != null) total += midtermMarks
  if (finalMarks != null) total += finalMarks
  if (labMarks != null) total += labMarks
  if (projectMarks != null) total += projectMarks
  return total
}

export function getGradeLabel(grade: GradeScale): string {
  const entry = GRADE_SCALE.find(g => g.grade === grade)
  return entry?.label || grade
}