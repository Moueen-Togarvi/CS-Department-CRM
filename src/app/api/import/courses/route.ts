import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { parseCsv, getDefaultDepartmentId } from '@/lib/csv-parser'

interface ImportError {
  row: number
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const csvText: string = body.csvText

    if (!csvText || typeof csvText !== 'string') {
      return Response.json(
        { success: false, error: 'CSV text is required' },
        { status: 400 }
      )
    }

    const { rows } = parseCsv(csvText)

    if (rows.length === 0) {
      return Response.json(
        { success: false, error: 'No data rows found in CSV' },
        { status: 400 }
      )
    }

    const departmentId = await getDefaultDepartmentId(db)
    const validCourseTypes = ['THEORY', 'LAB', 'PROJECT', 'SEMINAR']
    const errors: ImportError[] = []
    let imported = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      try {
        const code = row.code || row.coursecode || row.course_code || ''
        const name = row.name || row.coursename || row.course_name || ''
        const creditHours = parseInt(row.credithours || row.credit_hours || row.credits || '3', 10)
        const labCreditHours = parseInt(row.labcredithours || row.lab_credit_hours || row.labcredits || '0', 10)
        const courseType = mapCourseType(row.coursetype || row.course_type || row.type || '', validCourseTypes)
        const semesterOffered = row.semesteroffered || row.semester_offered || row.semester || ''
        const description = row.description || ''

        if (!code) {
          errors.push({ row: rowNum, message: 'Course code is required' })
          continue
        }
        if (!name || name.length < 3) {
          errors.push({ row: rowNum, message: 'Course name must be at least 3 characters' })
          continue
        }
        if (isNaN(creditHours) || creditHours < 1 || creditHours > 6) {
          errors.push({ row: rowNum, message: 'Credit hours must be 1-6' })
          continue
        }

        const existingCourse = await db.course.findUnique({ where: { code } })
        if (existingCourse) {
          errors.push({ row: rowNum, message: `Course code "${code}" already exists` })
          continue
        }

        await db.course.create({
          data: {
            code,
            name,
            departmentId,
            creditHours,
            labCreditHours: isNaN(labCreditHours) ? 0 : labCreditHours,
            courseType: courseType || 'THEORY',
            semesterOffered: semesterOffered ? parseInt(semesterOffered, 10) : null,
            description,
          },
        })

        imported++
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message || 'Unknown error' })
      }
    }

    return Response.json({ success: true, imported, errors })
  } catch (error) {
    console.error('POST /api/import/courses error:', error)
    return Response.json(
      { success: false, error: 'Import failed' },
      { status: 500 }
    )
  }
}

function mapCourseType(value: string, valid: string[]): string {
  const v = (value || '').trim().toUpperCase()
  if (valid.includes(v)) return v
  const mapping: Record<string, string> = {
    'THEORY': 'THEORY',
    'LAB': 'LAB',
    'LABORATORY': 'LAB',
    'PROJECT': 'PROJECT',
    'SEMINAR': 'SEMINAR',
  }
  const mapped = mapping[v]
  if (mapped) return mapped
  return 'THEORY'
}