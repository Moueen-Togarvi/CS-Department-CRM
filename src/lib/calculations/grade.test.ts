import { describe, expect, it } from 'vitest'
import {
  calculateGPA,
  calculateGrade,
  calculateTotalMarks,
  formatGrade,
  getGradeLabel,
} from './grade'

describe('calculateGrade', () => {
  it('maps each band to its grade point', () => {
    expect(calculateGrade(95)).toMatchObject({ grade: 'A', gradePoint: 4.0 })
    expect(calculateGrade(87)).toMatchObject({ grade: 'A_MINUS', gradePoint: 3.7 })
    expect(calculateGrade(60)).toMatchObject({ grade: 'C', gradePoint: 2.0 })
    expect(calculateGrade(10)).toMatchObject({ grade: 'F', gradePoint: 0 })
  })

  it('handles the boundaries of each band', () => {
    expect(calculateGrade(90).grade).toBe('A')
    expect(calculateGrade(89).grade).toBe('A_MINUS')
    expect(calculateGrade(45).grade).toBe('D')
    expect(calculateGrade(44).grade).toBe('F')
  })

  // The bands are integers but percentages are stored as floats.
  it('does not drop decimals between bands', () => {
    expect(calculateGrade(89.5).grade).toBe('A_MINUS')
    expect(calculateGrade(44.9).grade).toBe('F')
  })

  it('clamps a perfect and an impossible score', () => {
    expect(calculateGrade(100).grade).toBe('A')
    expect(calculateGrade(0).grade).toBe('F')
  })
})

describe('calculateGPA', () => {
  it('weights each course by its total credit hours', () => {
    // (4.0*3 + 3.0*3) / 6 = 3.5
    expect(
      calculateGPA([
        { gradePoint: 4.0, creditHours: 3 },
        { gradePoint: 3.0, creditHours: 3 },
      ])
    ).toBe(3.5)
  })

  it('counts lab credits toward the weighting', () => {
    // (4.0*4 + 2.0*3) / 7 = 3.14
    expect(
      calculateGPA([
        { gradePoint: 4.0, creditHours: 3, labCreditHours: 1 },
        { gradePoint: 2.0, creditHours: 3, labCreditHours: 0 },
      ])
    ).toBe(3.14)
  })

  it('returns 0 rather than dividing by zero', () => {
    expect(calculateGPA([])).toBe(0)
    expect(calculateGPA([{ gradePoint: null, creditHours: 3 }])).toBe(0)
  })

  // Documents a real quirk: an F (gradePoint 0) is skipped by the `gp > 0`
  // guard, so failed courses do not drag the GPA down.
  it('excludes zero-point results from the average entirely', () => {
    expect(
      calculateGPA([
        { gradePoint: 4.0, creditHours: 3 },
        { gradePoint: 0, creditHours: 3 },
      ])
    ).toBe(4.0)
  })
})

describe('calculateTotalMarks', () => {
  it('sums only the components that were entered', () => {
    expect(calculateTotalMarks(10, 5, 20, 40)).toBe(75)
    expect(calculateTotalMarks(10, null, undefined, 40)).toBe(50)
    expect(calculateTotalMarks()).toBe(0)
  })
})

describe('getGradeLabel', () => {
  it('resolves a label, falling back to the raw grade', () => {
    expect(getGradeLabel('A')).toBe('Excellent')
    expect(getGradeLabel('ZZ' as never)).toBe('ZZ')
  })
})

describe('formatGrade', () => {
  // Four copies of this used to disagree: two rendered B_PLUS as the literal
  // "B-PLUS" and a third as "B +". Only this mapping is correct.
  it('renders enum values as real grade symbols', () => {
    expect(formatGrade('B_PLUS')).toBe('B+')
    expect(formatGrade('A_MINUS')).toBe('A-')
    expect(formatGrade('C_MINUS')).toBe('C-')
    expect(formatGrade('D_PLUS')).toBe('D+')
  })

  it('passes plain grades through', () => {
    expect(formatGrade('A')).toBe('A')
    expect(formatGrade('F')).toBe('F')
  })

  it('never leaks the PLUS/MINUS suffix', () => {
    for (const g of ['A_MINUS', 'B_PLUS', 'B_MINUS', 'C_PLUS', 'C_MINUS', 'D_PLUS']) {
      expect(formatGrade(g)).not.toMatch(/PLUS|MINUS|_/)
    }
  })

  it('handles empty input', () => {
    expect(formatGrade(null)).toBe('—')
    expect(formatGrade(undefined)).toBe('—')
    expect(formatGrade('')).toBe('—')
  })

  it('returns an unknown grade unchanged rather than blank', () => {
    expect(formatGrade('X_UNKNOWN')).toBe('X_UNKNOWN')
  })
})
